const Invoice = require('../models/Invoice');
const momoService = require('../services/momoService');
const { logActivity } = require('../utils/auditLogger');
const { sendInvoiceEmailAsync } = require('../utils/emailService');

/**
 * 1. Khởi tạo thanh toán MoMo cho đơn hàng
 * POST /api/payments/momo/create
 */
async function initiateMomoPayment(req, res) {
  try {
    const { invoiceCode, invoiceId } = req.body;

    let query = {};
    if (invoiceId) query._id = invoiceId;
    else if (invoiceCode) query.invoiceCode = invoiceCode;
    else {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã hóa đơn (invoiceCode) hoặc ID' });
    }

    const invoice = await Invoice.findOne(query);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn cần thanh toán' });
    }

    // Nếu đã thanh toán rồi thì báo thành công luôn
    if (invoice.paymentStatus === 'paid') {
      return res.json({
        success: true,
        alreadyPaid: true,
        message: 'Đơn hàng này đã được thanh toán trước đó',
        invoiceCode: invoice.invoiceCode
      });
    }

    const orderInfo = `Thanh toan don hang ${invoice.invoiceCode} - Lamour Bookstore`;
    const paymentResult = await momoService.createMomoPayment({
      orderId: invoice.invoiceCode,
      amount: invoice.finalAmount,
      orderInfo,
      extraData: JSON.stringify({ customerPhone: invoice.customerPhone || '' })
    });

    const momoData = paymentResult.data || {};

    // Cập nhật thông tin ban đầu vào invoice
    invoice.paymentMethod = 'momo';
    invoice.momoTransaction = {
      partnerCode: momoData.partnerCode || process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529',
      orderId: invoice.invoiceCode,
      requestId: paymentResult.requestId,
      amount: invoice.finalAmount,
      transId: '',
      resultCode: momoData.resultCode ?? -1,
      message: momoData.message || 'Khởi tạo thanh toán MoMo',
      payType: 'qr',
      responseTime: Date.now(),
      orderInfo,
      payUrl: momoData.payUrl || momoData.shortLink || '',
      qrCodeUrl: momoData.qrCodeUrl || '',
      deeplink: momoData.deeplink || '',
      paidAt: null,
      autoVerified: false
    };

    await invoice.save();

    return res.json({
      success: true,
      message: 'Khởi tạo cổng thanh toán MoMo thành công',
      data: {
        invoiceCode: invoice.invoiceCode,
        amount: invoice.finalAmount,
        payUrl: momoData.payUrl || momoData.shortLink || '',
        qrCodeUrl: momoData.qrCodeUrl || '',
        deeplink: momoData.deeplink || '',
        isFallback: Boolean(paymentResult.isFallback)
      }
    });
  } catch (error) {
    console.error('Lỗi khởi tạo MoMo:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi khởi tạo thanh toán MoMo: ' + error.message
    });
  }
}

/**
 * 2. Webhook IPN từ máy chủ MoMo gọi về
 * POST /api/payments/momo/ipn
 */
async function handleMomoIpn(req, res) {
  try {
    const ipnBody = req.body || {};
    console.log('[MoMo IPN Webhook Nhận được]:', JSON.stringify(ipnBody));

    const {
      orderId,
      transId,
      amount,
      resultCode,
      message,
      payType,
      responseTime,
      signature
    } = ipnBody;

    if (!orderId) {
      return res.status(400).json({ message: 'Thiếu orderId' });
    }

    // Xác thực chữ ký số HMAC-SHA256
    const isValidSignature = momoService.verifyMomoIpnSignature(ipnBody);
    if (!isValidSignature) {
      console.warn('[MoMo IPN] Chữ ký không hợp lệ!', { orderId, signature });
      return res.status(400).json({ message: 'Chữ ký MoMo không hợp lệ' });
    }

    // Tìm hóa đơn tương ứng
    const invoice = await Invoice.findOne({ invoiceCode: orderId });
    if (!invoice) {
      console.warn(`[MoMo IPN] Không tìm thấy hóa đơn: ${orderId}`);
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    }

    // Nếu mã kết quả là 0 (Giao dịch thành công)
    if (Number(resultCode) === 0) {
      const transIdStr = String(transId || `MM_${Date.now()}`);
      
      invoice.paymentStatus = 'paid';
      invoice.isPaidByCustomer = true;
      invoice.paymentMethod = 'momo';
      invoice.paymentNote = `Đã thanh toán tự động qua MoMo (Mã GD: ${transIdStr}) lúc ${new Date().toLocaleString('vi-VN')}`;

      invoice.momoTransaction = {
        partnerCode: ipnBody.partnerCode || '',
        orderId: invoice.invoiceCode,
        requestId: ipnBody.requestId || '',
        amount: Number(amount) || invoice.finalAmount,
        transId: transIdStr,
        resultCode: 0,
        message: message || 'Giao dịch thành công',
        payType: payType || 'qr',
        responseTime: Number(responseTime) || Date.now(),
        orderInfo: ipnBody.orderInfo || '',
        payUrl: invoice.momoTransaction?.payUrl || '',
        qrCodeUrl: invoice.momoTransaction?.qrCodeUrl || '',
        deeplink: invoice.momoTransaction?.deeplink || '',
        signature: signature || '',
        paidAt: new Date(),
        autoVerified: true
      };

      await invoice.save();

      // Gửi email hóa đơn tự động nếu có email
      if (invoice.customerEmail) {
        sendInvoiceEmailAsync(invoice._id);
      }

      logActivity(req, {
        module: 'ORDERS',
        action: 'MOMO_IPN_PAID',
        targetId: invoice._id,
        targetCode: invoice.invoiceCode,
        description: `MoMo IPN tự động xác nhận đã chuyển tiền thành công đơn ${invoice.invoiceCode}. Mã GD: ${transIdStr}, Số tiền: ${amount}đ`
      });

      console.log(`[MoMo IPN] TỰ ĐỘNG XÁC NHẬN THÀNH CÔNG ĐƠN: ${invoice.invoiceCode}`);
    } else {
      console.log(`[MoMo IPN] Giao dịch không thành công hoặc khách đã hủy. Code: ${resultCode}, Lời nhắn: ${message}`);
    }

    // Phản hồi 204 No Content hoặc 200 OK cho MoMo
    return res.status(200).json({
      partnerCode: ipnBody.partnerCode,
      orderId,
      resultCode: 0,
      message: 'Xử lý IPN thành công'
    });
  } catch (error) {
    console.error('[MoMo IPN Lỗi]:', error);
    return res.status(500).json({ message: 'Lỗi xử lý IPN: ' + error.message });
  }
}

/**
 * 3. Kiểm tra trạng thái thanh toán real-time cho Frontend (Polling)
 * GET /api/payments/momo/check-status/:invoiceCode
 */
async function checkPaymentStatus(req, res) {
  try {
    const { invoiceCode } = req.params;
    if (!invoiceCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp invoiceCode' });
    }

    const invoice = await Invoice.findOne({ invoiceCode }).select(
      'invoiceCode paymentStatus isPaidByCustomer paymentMethod finalAmount momoTransaction status paymentProof paymentNote createdAt updatedAt'
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }

    const isPaid = invoice.paymentStatus === 'paid';

    return res.json({
      success: true,
      data: {
        invoiceCode: invoice.invoiceCode,
        paymentStatus: invoice.paymentStatus, // 'unpaid' | 'paid' | 'pending_verification'
        isPaid,
        statusText: isPaid ? 'Đã chuyển tiền' : 'Chưa chuyển tiền',
        paymentMethod: invoice.paymentMethod,
        finalAmount: invoice.finalAmount,
        status: invoice.status,
        momoTransaction: invoice.momoTransaction || null,
        paymentProof: invoice.paymentProof || '',
        paymentNote: invoice.paymentNote || ''
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra trạng thái: ' + error.message });
  }
}

/**
 * 4. Chức năng giả lập quét MoMo thành công (Dev & Test Simulator)
 * POST /api/payments/momo/simulate-payment
 * Cho phép người dùng / dev test ngay trên localhost mà không cần nộp giấy tờ MoMo thật
 */
async function simulateMomoPayment(req, res) {
  try {
    const { invoiceCode } = req.body;
    if (!invoiceCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã hóa đơn cần giả lập' });
    }

    const invoice = await Invoice.findOne({ invoiceCode });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }

    // Sinh mã giao dịch MoMo giả lập thực tế
    const mockTransId = `MM${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    invoice.paymentStatus = 'paid';
    invoice.isPaidByCustomer = true;
    invoice.paymentMethod = 'momo';
    invoice.paymentNote = `Đã thanh toán tự động qua MoMo Sandbox (Mã GD: ${mockTransId}) lúc ${new Date().toLocaleString('vi-VN')}`;

    invoice.momoTransaction = {
      partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529',
      orderId: invoice.invoiceCode,
      requestId: `${invoice.invoiceCode}_SIM`,
      amount: invoice.finalAmount,
      transId: mockTransId,
      resultCode: 0,
      message: 'Giao dịch thành công (Mô phỏng Test)',
      payType: 'momo_wallet',
      responseTime: Date.now(),
      orderInfo: `Thanh toan don hang ${invoice.invoiceCode} - Lamour Bookstore`,
      payUrl: invoice.momoTransaction?.payUrl || '',
      qrCodeUrl: invoice.momoTransaction?.qrCodeUrl || '',
      deeplink: invoice.momoTransaction?.deeplink || '',
      signature: 'SIMULATED_TEST_SIGNATURE',
      paidAt: new Date(),
      autoVerified: true
    };

    await invoice.save();

    // Gửi email hóa đơn tự động
    if (invoice.customerEmail) {
      sendInvoiceEmailAsync(invoice._id);
    }

    logActivity(req, {
      module: 'ORDERS',
      action: 'MOMO_SIMULATED_PAID',
      targetId: invoice._id,
      targetCode: invoice.invoiceCode,
      description: `Mô phỏng thanh toán MoMo thành công đơn ${invoice.invoiceCode}. Mã GD: ${mockTransId}`
    });

    return res.json({
      success: true,
      message: 'Giả lập chuyển khoản MoMo thành công! Đơn hàng đã tự động xác nhận Đã chuyển.',
      data: {
        invoiceCode: invoice.invoiceCode,
        transId: mockTransId,
        paymentStatus: invoice.paymentStatus,
        isPaid: true
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi giả lập: ' + error.message });
  }
}

module.exports = {
  initiateMomoPayment,
  handleMomoIpn,
  checkPaymentStatus,
  simulateMomoPayment
};
