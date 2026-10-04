const express = require('express');
const router = express.Router();
const posScannerController = require('../controllers/posScannerController');

// Khởi tạo phiên kết nối hoặc lấy mã QR ghép đôi
router.get('/session', posScannerController.getSession);

// Sinh mã QR cho tem giá sản phẩm (để điện thoại quét trực tiếp)
router.get('/tag-qr', posScannerController.getTagQr);

// Luồng Server-Sent Events (SSE) cho màn hình POS PC
router.get('/stream/:sessionId', posScannerController.streamEvents);

// Điện thoại gửi thông báo đã kết nối
router.post('/connect/:sessionId', posScannerController.connectPhone);

// Điện thoại gửi mã vừa quét
router.post('/scan/:sessionId', posScannerController.submitScan);

// Điện thoại gửi action (chọn đơn, xóa sách)
router.post('/action/:sessionId', posScannerController.submitAction);

// POS đẩy state đơn hàng về cho điện thoại (được gọi từ browser)
router.post('/push-state/:sessionId', posScannerController.pushState);

// Điện thoại lấy state đơn hàng hiện tại
router.get('/orders/:sessionId', posScannerController.getOrders);

// Lấy lịch sử quét của phiên
router.get('/history/:sessionId', posScannerController.getHistory);

// Lấy các lượt quét mới (dùng cho cơ chế polling bù trừ)
router.get('/pending-scans/:sessionId', posScannerController.getPendingScans);

// Điện thoại ngắt kết nối
router.post('/disconnect/:sessionId', posScannerController.disconnectPhone);

module.exports = router;
