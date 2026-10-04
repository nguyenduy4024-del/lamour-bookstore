const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { uploadPaymentProof } = require('../middleware/uploadMiddleware');
const {
  createInvoice,
  createOnlineInvoice,
  uploadPaymentProofFile,
  updateOrderPaymentProof,
  getAllInvoices,
  getMyInvoices,
  updateInvoiceStatus,
  verifyPaymentOrder,
  returnUserOrder,
  receiveReturnOrder,
  inspectApproveReturnOrder,
  inspectReturnOrder,
  rejectReturnOrder,
  getCustomerOrders,
  getCustomerOrderDetail,
  updateCustomerOrderStatus,
  searchInvoiceForCounterReturn,
  processCounterReturn,
  resendInvoiceEmailHandler
} = require('../controllers/invoiceController');

// Route tải ảnh bill chuyển khoản (Upload payment proof)
router.post('/upload-proof', (req, res, next) => {
  uploadPaymentProof.single('paymentProof')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Lỗi khi tải file ảnh' });
    }
    next();
  });
}, uploadPaymentProofFile);

// Route cập nhật ảnh bill chuyển khoản cho đơn hàng cụ thể
router.put('/:id/payment-proof', protect, (req, res, next) => {
  uploadPaymentProof.single('paymentProof')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Lỗi khi tải file ảnh' });
    }
    next();
  });
}, updateOrderPaymentProof);

// Route đổi trả trực tiếp tại quầy thu ngân (POS)
router.get('/counter-search', protect, authorizeRoles('admin', 'staff'), searchInvoiceForCounterReturn);
router.post('/counter-return', protect, authorizeRoles('admin', 'staff'), processCounterReturn);

// Route thanh toán online dành cho khách hàng (Yêu cầu phải đăng nhập)
router.post('/online-checkout', protect, createOnlineInvoice);

// Route xử lý yêu cầu trả hàng / hoàn tiền (Hỗ trợ cả cú pháp gạch nối và slash)
router.post('/:id/return-request', protect, returnUserOrder);
router.put('/:id/return-receive', protect, authorizeRoles('admin', 'accountant', 'staff'), receiveReturnOrder);
router.put('/:id/return/receive', protect, authorizeRoles('admin', 'accountant', 'staff'), receiveReturnOrder);
router.put('/:id/return-inspect-approve', protect, authorizeRoles('admin', 'accountant', 'staff'), inspectApproveReturnOrder);
router.put('/:id/return/inspect', protect, authorizeRoles('admin', 'accountant', 'staff'), inspectReturnOrder);
router.put('/:id/return-reject', protect, authorizeRoles('admin', 'accountant', 'staff'), rejectReturnOrder);
router.put('/:id/return/reject', protect, authorizeRoles('admin', 'accountant', 'staff'), rejectReturnOrder);

// Alias routes cho customer-orders
router.put('/customer-orders/:id/return-receive', protect, authorizeRoles('admin', 'accountant', 'staff'), receiveReturnOrder);
router.put('/customer-orders/:id/return/receive', protect, authorizeRoles('admin', 'accountant', 'staff'), receiveReturnOrder);
router.put('/customer-orders/:id/return-inspect-approve', protect, authorizeRoles('admin', 'accountant', 'staff'), inspectApproveReturnOrder);
router.put('/customer-orders/:id/return/inspect', protect, authorizeRoles('admin', 'accountant', 'staff'), inspectReturnOrder);
router.put('/customer-orders/:id/return-reject', protect, authorizeRoles('admin', 'accountant', 'staff'), rejectReturnOrder);
router.put('/customer-orders/:id/return/reject', protect, authorizeRoles('admin', 'accountant', 'staff'), rejectReturnOrder);

// Route nhân viên duyệt thanh toán đơn hàng chuyển khoản / online
router.put('/:id/verify-payment', protect, authorizeRoles('admin', 'accountant', 'staff'), verifyPaymentOrder);

// Quản lý đơn mua khách hàng (Dành cho Admin, Staff, Accountant, Stock)
router.get('/customer-orders', protect, authorizeRoles('admin', 'staff', 'accountant', 'stock'), getCustomerOrders);
router.get('/customer-orders/:id', protect, authorizeRoles('admin', 'staff', 'accountant', 'stock'), getCustomerOrderDetail);
router.put('/customer-orders/:id/status', protect, authorizeRoles('admin', 'staff', 'accountant'), updateCustomerOrderStatus);

// Route cập nhật trạng thái hóa đơn (Admin, Accountant & Staff)
router.put('/:id/status', protect, authorizeRoles('admin', 'accountant', 'staff'), updateInvoiceStatus);

router
  .route('/')
  .post(protect, authorizeRoles('admin', 'staff', 'accountant'), createInvoice)
  .get(protect, authorizeRoles('admin', 'staff', 'accountant'), getAllInvoices);

// Route gửi lại email hóa đơn cho khách hàng
router.post('/:id/resend-email', protect, resendInvoiceEmailHandler);

router.get('/my-invoices', protect, getMyInvoices);

module.exports = router;


