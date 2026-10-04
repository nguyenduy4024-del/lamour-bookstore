const posScannerService = require('../services/posScannerService');

/**
 * Controller quản lý kết nối và phiên quét mã từ điện thoại cho quầy POS
 */
class PosScannerController {
  /**
   * Tạo phiên mới hoặc lấy thông tin phiên hiện tại kèm mã QR kết nối
   * GET /api/pos-scanner/session?sessionId=...&customHost=...
   */
  async getSession(req, res) {
    try {
      const requestedId = req.query.sessionId || null;
      const customHost = req.query.customHost || null;
      const sessionData = await posScannerService.createOrGetSession(req, requestedId, customHost);

      return res.status(200).json({
        success: true,
        data: sessionData
      });
    } catch (err) {
      console.error('[PosScannerController] Lỗi tạo phiên:', err);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khởi tạo phiên quét mã: ' + err.message
      });
    }
  }

  /**
   * Thiết lập kết nối SSE (Server-Sent Events) cho màn hình POS PC
   * GET /api/pos-scanner/stream/:sessionId
   */
  streamEvents(req, res) {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).send('Session ID is required.');
    }

    // Thiết lập Header SSE chuẩn, ngăn chặn hoàn toàn việc buffer/nén từ reverse proxy, nginx, compression
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Content-Encoding': 'identity',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    if (typeof res.flush === 'function') res.flush();

    const cleanup = posScannerService.registerPosClient(sessionId, res);

    req.on('close', () => {
      cleanup();
    });
  }

  /**
   * Lấy các lượt quét mới để POS PC bù trừ nếu SSE bị chậm/mất gói
   * GET /api/pos-scanner/pending-scans/:sessionId?sinceId=...
   */
  getPendingScans(req, res) {
    try {
      const { sessionId } = req.params;
      const { sinceId } = req.query;
      const scans = posScannerService.getPendingScans(sessionId, sinceId);
      return res.status(200).json({ success: true, scans });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Điện thoại báo đã kết nối thành công
   * POST /api/pos-scanner/connect/:sessionId
   */
  connectPhone(req, res) {
    try {
      const { sessionId } = req.params;
      const { userAgent, deviceType } = req.body || {};

      const session = posScannerService.handlePhoneConnect(sessionId, { userAgent, deviceType });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Phiên quét mã không tồn tại hoặc đã hết hạn.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đã kết nối thành công với màn hình POS.',
        sessionId
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  /**
   * Điện thoại gửi dữ liệu mã vừa quét
   * POST /api/pos-scanner/scan/:sessionId
   */
  async submitScan(req, res) {
    try {
      const { sessionId } = req.params;
      const { code, scanType, targetOrderCode, targetOrderIdx } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu mã không được để trống.'
        });
      }

      const result = await posScannerService.processScannedCode(
        sessionId,
        code,
        scanType || 'barcode',
        {
          userAgent: req.headers['user-agent'],
          targetOrderCode,
          targetOrderIdx
        }
      );

      const session = posScannerService.getSession(sessionId);

      return res.status(200).json({
        success: true,
        data: result,
        orders: (session && session.posOrders) || [],
        activeIdx: (session && session.posActiveIdx) ?? 0,
        activeInvoiceCode: (session && session.posActiveInvoiceCode) || ''
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }

  /**
   * Lấy lịch sử quét mã gần đây của phiên
   * GET /api/pos-scanner/history/:sessionId
   */
  getHistory(req, res) {
    const { sessionId } = req.params;
    const session = posScannerService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Phiên không tồn tại.'
      });
    }

    return res.status(200).json({
      success: true,
      history: session.history || []
    });
  }

  /**
   * Điện thoại gửi action (chọn đơn hàng, xóa món, thay đổi số lượng, tạo đơn mới)
   * POST /api/pos-scanner/action/:sessionId
   */
  async submitAction(req, res) {
    try {
      const { sessionId } = req.params;
      const { actionType, payload } = req.body;

      if (!actionType) {
        return res.status(400).json({ success: false, message: 'Thiếu actionType.' });
      }

      const session = posScannerService.getSession(sessionId);
      const actionEvent = {
        scanId: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: 'PHONE_ACTION',
        actionType,
        payload: payload || {},
        timestamp: Date.now()
      };

      if (session) {
        session.lastActive = Date.now();
        if (session.history) {
          session.history.unshift(actionEvent);
          if (session.history.length > 50) session.history.pop();
        }

        if (session.posOrders && session.posOrders.length > 0) {
          if (actionType === 'SELECT_ORDER' && payload) {
            if (payload.orderIdx !== undefined) session.posActiveIdx = payload.orderIdx;
            if (payload.invoiceCode) session.posActiveInvoiceCode = payload.invoiceCode;
          } else if (actionType === 'REMOVE_CART_ITEM' && payload) {
            const ord = (payload.invoiceCode ? session.posOrders.find(o => o.invoiceCode === payload.invoiceCode) : null) || session.posOrders[payload.orderIdx ?? session.posActiveIdx ?? 0];
            if (ord && ord.items) {
              ord.items = ord.items.filter(i => String(i.id) !== String(payload.bookId));
              ord.itemCount = ord.items.reduce((s, i) => s + (i.qty || 0), 0);
              ord.total = ord.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
            }
          } else if (actionType === 'CHANGE_ITEM_QTY' && payload) {
            const ord = (payload.invoiceCode ? session.posOrders.find(o => o.invoiceCode === payload.invoiceCode) : null) || session.posOrders[payload.orderIdx ?? session.posActiveIdx ?? 0];
            if (ord && ord.items) {
              const it = ord.items.find(i => String(i.id) === String(payload.bookId));
              if (it) {
                it.qty = (it.qty || 1) + (payload.delta || 0);
                if (it.qty <= 0) {
                  ord.items = ord.items.filter(i => String(i.id) !== String(payload.bookId));
                }
              }
              ord.itemCount = ord.items.reduce((s, i) => s + (i.qty || 0), 0);
              ord.total = ord.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
            }
          }
        }
      }

      // Forward action tới màn hình POS
      const count = posScannerService.broadcastToPos(sessionId, actionEvent);

      return res.status(200).json({
        success: true,
        delivered: count,
        orders: (session && session.posOrders) || [],
        activeIdx: (session && session.posActiveIdx) ?? 0,
        activeInvoiceCode: (session && session.posActiveInvoiceCode) || ''
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POS đẩy state đơn hàng hiện tại về cho điện thoại
   * POST /api/pos-scanner/push-state/:sessionId
   */
  pushState(req, res) {
    try {
      const { sessionId } = req.params;
      const { orders, activeIdx, activeInvoiceCode, completedInvoiceCode } = req.body;

      // Lưu state vào session
      const session = posScannerService.getOrCreateSession(sessionId);
      if (session) {
        session.posOrders = orders || [];
        session.posActiveIdx = activeIdx ?? 0;
        session.posActiveInvoiceCode = activeInvoiceCode || (orders && orders[activeIdx]?.invoiceCode) || '';
        session.lastActive = Date.now();

        if (completedInvoiceCode) {
          if (session.history && Array.isArray(session.history)) {
            session.history = session.history.filter(h => h.targetOrderCode !== completedInvoiceCode);
          }
          // Reset bộ nhớ mã quét cũ để nếu quét lại sản phẩm đó cho đơn mới thì nhận diện ngay
          session.lastScannedCode = '';
          session.lastScannedAt = 0;
        }

        // Broadcast sự kiện cập nhật tới tất cả client SSE (POS + Phone)
        posScannerService.broadcastToPos(sessionId, {
          type: 'ORDERS_UPDATED',
          orders: session.posOrders,
          activeIdx: session.posActiveIdx,
          activeInvoiceCode: session.posActiveInvoiceCode,
          completedInvoiceCode: completedInvoiceCode || null,
          timestamp: Date.now()
        });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Lấy state đơn hàng hiện tại (phone poll hoặc query)
   * GET /api/pos-scanner/orders/:sessionId
   */
  getOrders(req, res) {
    const { sessionId } = req.params;
    const session = posScannerService.getOrCreateSession(sessionId);
    return res.status(200).json({
      success: true,
      orders: session.posOrders || [],
      activeIdx: session.posActiveIdx ?? 0,
      activeInvoiceCode: session.posActiveInvoiceCode || ''
    });
  }

  /**
   * Điện thoại ngắt kết nối
   * POST /api/pos-scanner/disconnect/:sessionId
   */
  disconnectPhone(req, res) {
    const { sessionId } = req.params;
    posScannerService.handlePhoneDisconnect(sessionId);
    return res.status(200).json({ success: true });
  }

  /**
   * Tạo mã QR Code cho tem giá sản phẩm (dùng để quét trực tiếp từ điện thoại)
   * GET /api/pos-scanner/tag-qr?text=...
   */
  async getTagQr(req, res) {
    try {
      const text = String(req.query.text || '').trim();
      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung mã không được để trống.'
        });
      }
      const QRCode = require('qrcode');
      const qrDataUrl = await QRCode.toDataURL(text, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0A1930',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      return res.status(200).json({
        success: true,
        code: text,
        qrDataUrl
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
}

module.exports = new PosScannerController();
