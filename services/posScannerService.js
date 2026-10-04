const os = require('os');
const QRCode = require('qrcode');
const Book = require('../models/Book');
const Coupon = require('../models/Coupon');
const User = require('../models/User');

// Quản lý các phiên kết nối giữa Màn hình POS và Điện thoại di động
// Map<sessionId, SessionObject>
const sessions = new Map();

/**
 * Tự động tìm IP mạng nội bộ (LAN IPv4) của máy chủ
 */
function getLanIp() {
  const nets = os.networkInterfaces();
  let candidate = null;
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        // Ưu tiên dải mạng Wi-Fi/Ethernet thông dụng 192.168.x.x
        if (net.address.startsWith('192.168.')) {
          return net.address;
        }
        if (!candidate && (net.address.startsWith('10.') || net.address.startsWith('172.'))) {
          candidate = net.address;
        }
      }
    }
  }
  return candidate || 'localhost';
}

/**
 * Dọn dẹp định kỳ các phiên hết hạn (> 24 giờ không hoạt động)
 */
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActive > 24 * 60 * 60 * 1000) {
      // Đóng các kết nối SSE nếu còn
      if (s.posClients) {
        for (const res of s.posClients) {
          try { res.end(); } catch (e) {}
        }
      }
      sessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

class PosScannerService {
  /**
   * Lấy hoặc tạo mới phiên làm việc với sessionId được yêu cầu
   */
  getOrCreateSession(sessionId) {
    if (!sessionId) return null;
    const sId = String(sessionId).trim().toUpperCase();
    let session = sessions.get(sId);
    if (!session) {
      session = {
        id: sId,
        createdAt: Date.now(),
        lastActive: Date.now(),
        posClients: new Set(),
        phoneConnected: false,
        phoneInfo: null,
        history: [],
        posOrders: [],
        posActiveIdx: 0,
        posActiveInvoiceCode: ''
      };
      sessions.set(sId, session);
    }
    return session;
  }

  /**
   * Tạo phiên làm việc mới hoặc cập nhật phiên hiện tại
   */
  async createOrGetSession(req, requestedId = null, customHost = null) {
    let sessionId = requestedId ? String(requestedId).trim().toUpperCase() : null;
    if (!sessionId) {
      sessionId = 'POS_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const session = this.getOrCreateSession(sessionId);
    session.lastActive = Date.now();

    const tunnelService = require('./tunnelService');
    const tunnelUrl = await tunnelService.getOrWaitForTunnelUrl(3000);

    const lanIp = getLanIp();
    const port = process.env.PORT || 4000;
    const httpsPort = process.env.HTTPS_PORT || 4443;
    const reqHost = req.headers.host || '';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';

    // Xác định base host cho điện thoại truy cập:
    // ƯU TIÊN 1: Cloudflare Tunnel HTTPS (Chứng chỉ SSL quốc tế, khóa xanh 100%, không cảnh báo bảo mật)
    let baseHost = customHost;
    let mobileUrl;
    let isCloudflareSecure = false;

    if (!baseHost) {
      if (tunnelUrl) {
        baseHost = tunnelUrl;
        mobileUrl = `${baseHost}/pos-scanner?session=${sessionId}`;
        isCloudflareSecure = true;
      } else if (reqHost && !reqHost.includes('localhost') && !reqHost.includes('127.0.0.1')) {
        // Môi trường production (domain thực)
        baseHost = `${protocol}://${reqHost}`;
        mobileUrl = `${baseHost.replace(/\/$/, '')}/pos-scanner?session=${sessionId}`;
      } else {
        // Fallback: Môi trường nội bộ LAN → dùng HTTPS port 4443
        mobileUrl = `https://${lanIp}:${httpsPort}/pos-scanner?session=${sessionId}`;
        baseHost = `https://${lanIp}:${httpsPort}`;
      }
    } else {
      mobileUrl = `${baseHost.replace(/\/$/, '')}/pos-scanner?session=${sessionId}`;
    }

    // Tạo mã QR DataURL (ảnh PNG base64) với style L'Amour Bookstore
    const qrCodeDataUrl = await QRCode.toDataURL(mobileUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0A1930',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    return {
      sessionId,
      mobileUrl,
      qrCodeDataUrl,
      lanIp,
      port,
      httpsPort,
      tunnelUrl,
      isCloudflareSecure,
      phoneConnected: session.phoneConnected,
      phoneInfo: session.phoneInfo,
      posOrders: session.posOrders,
      posActiveIdx: session.posActiveIdx,
      posActiveInvoiceCode: session.posActiveInvoiceCode
    };
  }

  /**
   * Lấy thông tin phiên
   */
  getSession(sessionId) {
    if (!sessionId) return null;
    return this.getOrCreateSession(sessionId);
  }

  /**
   * Đăng ký kết nối SSE (Server-Sent Events) từ màn hình POS hoặc Điện thoại
   */
  registerPosClient(sessionId, res) {
    const session = this.getOrCreateSession(sessionId);
    session.lastActive = Date.now();
    session.posClients.add(res);

    // Gửi sự kiện khởi tạo
    const initData = {
      type: 'INIT',
      sessionId: session.id,
      phoneConnected: session.phoneConnected,
      phoneInfo: session.phoneInfo,
      historyCount: session.history.length,
      orders: session.posOrders || [],
      activeIdx: session.posActiveIdx ?? 0,
      activeInvoiceCode: session.posActiveInvoiceCode || ''
    };
    res.write('data: ' + JSON.stringify(initData) + '\n\n');
    if (typeof res.flush === 'function') res.flush();

    // Gửi ping định kỳ 15s để giữ kết nối SSE không bị timeout
    const keepAliveTimer = setInterval(() => {
      try {
        res.write(': ping\n\n');
        if (typeof res.flush === 'function') res.flush();
      } catch (err) {
        clearInterval(keepAliveTimer);
      }
    }, 15000);

    return () => {
      clearInterval(keepAliveTimer);
      session.posClients.delete(res);
    };
  }

  /**
   * Phát sự kiện tới tất cả màn hình POS đang ghép đôi với sessionId này
   */
  broadcastToPos(sessionId, eventData) {
    const session = sessions.get(sessionId);
    if (!session || !session.posClients) return 0;

    session.lastActive = Date.now();
    const payload = `data: ${JSON.stringify(eventData)}\n\n`;
    let count = 0;

    for (const res of session.posClients) {
      try {
        res.write(payload);
        if (typeof res.flush === 'function') res.flush();
        count++;
      } catch (e) {
        session.posClients.delete(res);
      }
    }
    return count;
  }

  /**
   * Ghi nhận điện thoại kết nối vào phiên
   */
  handlePhoneConnect(sessionId, phoneInfo = {}) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    session.phoneConnected = true;
    session.phoneInfo = {
      userAgent: phoneInfo.userAgent || 'Thiết bị di động',
      deviceType: phoneInfo.deviceType || 'Smartphone',
      connectedAt: new Date().toISOString()
    };
    session.lastActive = Date.now();

    this.broadcastToPos(sessionId, {
      type: 'PHONE_CONNECTED',
      phoneInfo: session.phoneInfo,
      sessionId
    });

    return session;
  }

  /**
   * Ghi nhận điện thoại ngắt kết nối
   */
  handlePhoneDisconnect(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.phoneConnected = false;
    session.lastActive = Date.now();

    this.broadcastToPos(sessionId, {
      type: 'PHONE_DISCONNECTED',
      sessionId
    });
  }

  /**
   * Xử lý mã Barcode / QR gửi từ điện thoại
   */
  async processScannedCode(sessionId, rawCode, scanType = 'barcode', clientMeta = {}) {
    const session = this.getOrCreateSession(sessionId);
    session.lastActive = Date.now();
    const code = String(rawCode || '').trim();
    if (!code) {
      throw new Error('Mã quét không hợp lệ.');
    }

    const targetOrderCode = clientMeta.targetOrderCode || session.posActiveInvoiceCode || null;
    const targetOrderIdx = clientMeta.targetOrderIdx !== undefined && clientMeta.targetOrderIdx !== null 
      ? clientMeta.targetOrderIdx 
      : session.posActiveIdx ?? 0;

    // Chặn quét lặp liên tiếp nếu gửi cùng 1 mã trong vòng 2.5 giây (khi người dùng để im camera)
    const now = Date.now();
    if (session.lastScannedCode === code && (now - (session.lastScannedAt || 0)) < 2500) {
      return {
        scanId: 'ignored_' + now,
        type: 'DUPLICATE_IGNORED',
        status: 'ignored',
        message: 'Mã vừa được nhận, vui lòng chờ giây lát.',
        code
      };
    }
    session.lastScannedCode = code;
    session.lastScannedAt = now;

    const scanId = 'scn_' + now + '_' + Math.random().toString(36).substring(2, 7);
    let matchResult = null;

    // 1. Tra cứu Sách (Book): Tìm theo bookCode, isbn, _id hoặc mã tem giá
    let parsedCode = code;
    // Hỗ trợ nếu mã quét là chuỗi JSON
    if (parsedCode.startsWith('{') && parsedCode.endsWith('}')) {
      try {
        const json = JSON.parse(parsedCode);
        parsedCode = json.bookCode || json.code || json.id || json._id || parsedCode;
      } catch (_) {}
    }

    // Bóc tách tiền tố tem giá (ví dụ BOOK:..., BOOK-..., SKU:..., TEM:..., PRD:...)
    const strippedCode = parsedCode.replace(/^(BOOK[:\-_]|SKU[:\-_]|PRD[:\-_]|TEM[:\-_]|TAG[:\-_])/i, '').trim();
    const candidateCodes = Array.from(new Set([code, parsedCode, strippedCode].filter(Boolean)));

    const bookQuery = [];
    for (const cand of candidateCodes) {
      const cleanDigits = cand.replace(/[-\s]/g, '');
      const flexiblePattern = cleanDigits.length >= 4 
        ? cleanDigits.split('').join('[- ]?')
        : cand.replace(/[-\s]/g, '');
      const safeEscaped = cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      bookQuery.push(
        { bookCode: { $regex: new RegExp(`^${safeEscaped}$`, 'i') } },
        { bookCode: { $regex: new RegExp(`^${flexiblePattern}$`, 'i') } },
        { bookCode: cand },
        { isbn: { $regex: new RegExp(`^${flexiblePattern}$`, 'i') } },
        { isbn: cand }
      );

      // Nếu chứa ObjectId hợp lệ (24 hex)
      const hexMatch = cand.match(/[0-9a-fA-F]{24}/);
      if (hexMatch) {
        bookQuery.push({ _id: hexMatch[0] });
      }
    }

    const book = await Book.findOne({ $or: bookQuery, isDeleted: { $ne: true } }).lean();

    if (book) {
      matchResult = {
        scanId,
        type: 'SCAN_BOOK',
        matchType: 'book',
        status: 'success',
        book: {
          _id: String(book._id),
          bookCode: book.bookCode || '',
          isbn: book.isbn || '',
          title: book.title,
          author: book.author || 'Tác giả khác',
          price: book.price || 0,
          costPrice: book.costPrice || 0,
          stock: book.stock || 0,
          coverImage: book.coverImage || '/images/default-book.jpg',
          category: book.category || 'Chung',
          shelfLocation: book.shelfLocation || ''
        },
        rawCode,
        scanType,
        targetOrderCode,
        targetOrderIdx,
        timestamp: Date.now()
      };

      // Tự động cập nhật trực tiếp vào session.posOrders trên Server
      // Giúp điện thoại hiển thị sách ngay tức thì khi bấm Xem đơn hoặc tải lại
      session.posOrders = session.posOrders || [];
      let ord = null;
      if (targetOrderCode) {
        ord = session.posOrders.find(o => o.invoiceCode === targetOrderCode);
      }
      if (!ord && targetOrderIdx !== null && targetOrderIdx !== undefined && session.posOrders[targetOrderIdx]) {
        ord = session.posOrders[targetOrderIdx];
      }
      if (!ord && session.posOrders.length > 0) {
        ord = session.posOrders[session.posActiveIdx ?? 0];
      }
      if (!ord) {
        ord = {
          idx: (targetOrderIdx !== null && targetOrderIdx !== undefined) ? targetOrderIdx : 0,
          invoiceCode: targetOrderCode || ('HD-' + Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90)),
          customerName: 'Khách lẻ',
          itemCount: 0,
          total: 0,
          items: []
        };
        session.posOrders.push(ord);
        session.posActiveIdx = ord.idx;
        session.posActiveInvoiceCode = ord.invoiceCode;
      }

      ord.items = ord.items || [];
      const it = ord.items.find(i => String(i.id) === String(book._id));
      if (it) {
        it.qty = (it.qty || 1) + 1;
      } else {
        ord.items.unshift({
          id: String(book._id),
          title: book.title,
          qty: 1,
          price: book.price || 0,
          cover: book.coverImage || '/images/default-book.jpg'
        });
      }
      ord.itemCount = ord.items.reduce((s, i) => s + (i.qty || 0), 0);
      ord.total = ord.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
    }

    // 2. Tra cứu Mã khuyến mãi (Coupon): Nếu chưa tìm thấy sách
    if (!matchResult) {
      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true
      }).lean();

      if (coupon) {
        matchResult = {
          scanId,
          type: 'SCAN_COUPON',
          matchType: 'coupon',
          status: 'success',
          coupon: {
            _id: coupon._id,
            code: coupon.code,
            name: coupon.name,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            maxDiscountAmount: coupon.maxDiscountAmount || 0,
            minOrderValue: coupon.minOrderValue || 0
          },
          rawCode,
          scanType,
          targetOrderCode,
          targetOrderIdx,
          timestamp: Date.now()
        };
      }
    }

    // 3. Tra cứu Khách hàng / Hội viên (User): Tìm theo số điện thoại hoặc ID
    if (!matchResult) {
      const user = await User.findOne({
        $or: [
          { phone: code },
          ...(code.length === 24 ? [{ _id: code }] : [])
        ],
        isActive: { $ne: false }
      }).select('_id name email phone loyaltyPoints').lean();

      if (user) {
        matchResult = {
          scanId,
          type: 'SCAN_CUSTOMER',
          matchType: 'customer',
          status: 'success',
          customer: {
            _id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            loyaltyPoints: user.loyaltyPoints || 0
          },
          rawCode,
          scanType,
          targetOrderCode,
          targetOrderIdx,
          timestamp: Date.now()
        };
      }
    }

    // 4. Nếu không khớp sản phẩm, khuyến mãi hay khách hàng nào
    if (!matchResult) {
      matchResult = {
        scanId,
        type: 'SCAN_NOT_FOUND',
        matchType: 'unknown',
        status: 'not_found',
        rawCode,
        scanType,
        targetOrderCode,
        targetOrderIdx,
        message: `Không tìm thấy sách, mã ưu đãi hoặc hội viên khớp với mã: ${code}`,
        timestamp: Date.now()
      };
    }

    // Thêm vào lịch sử phiên (tối đa 50 lượt)
    session.history.unshift(matchResult);
    if (session.history.length > 50) {
      session.history.pop();
    }

    // Bắn sự kiện tức thì tới màn hình POS
    this.broadcastToPos(sessionId, matchResult);

    return matchResult;
  }

  /**
   * Lấy các lượt quét mới nhất từ lượt quét sinceId (dùng cho cơ chế polling bù trừ khi SSE gặp sự cố)
   */
  getPendingScans(sessionId, sinceId = null) {
    const session = sessions.get(sessionId);
    if (!session || !session.history) return [];
    if (!sinceId) return session.history.slice(0, 10);
    const idx = session.history.findIndex(s => s.scanId === sinceId);
    if (idx === -1) return session.history.slice(0, 10);
    return session.history.slice(0, idx);
  }
}

module.exports = new PosScannerService();
