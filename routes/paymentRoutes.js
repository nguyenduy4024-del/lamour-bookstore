const express = require('express');
const router = express.Router();
const {
  initiateMomoPayment,
  handleMomoIpn,
  checkPaymentStatus,
  simulateMomoPayment
} = require('../controllers/paymentController');

// 1. Khởi tạo thanh toán MoMo (Tạo giao dịch, sinh mã QR / Link MoMo)
router.post('/momo/create', initiateMomoPayment);

// 2. Webhook IPN nhận kết quả thanh toán tự động từ máy chủ MoMo
router.post('/momo/ipn', handleMomoIpn);

// 3. Kiểm tra trạng thái thanh toán real-time cho web (Polling)
router.get('/momo/check-status/:invoiceCode', checkPaymentStatus);

// 4. API Giả lập thanh toán MoMo thành công (dành cho thử nghiệm ngay)
router.post('/momo/simulate-payment', simulateMomoPayment);

module.exports = router;
