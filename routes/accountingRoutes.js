const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { uploadPaymentProof } = require('../middleware/uploadMiddleware');
const {
  getCashbook,
  createCashbookEntry,
  getAllTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  rejectTransaction,
  getFinancialReport,
  getSupplierDebts,
  paySupplierDebt,
  payCustomerDebt,
  getAccountingBadgeCounts
} = require('../controllers/accountingController');

// Áp dụng middleware bảo mật chỉ cho accountant và admin
router.use(protect);
router.use(authorizeRoles('accountant', 'admin'));

// API siêu nhẹ đếm số phiếu chờ duyệt cho sidebar badges
router.get('/badge-counts', getAccountingBadgeCounts);

// Upload ảnh chứng từ đính kèm (hỗ trợ field name 'attachment' hoặc 'file')
router.post('/upload-attachment', uploadPaymentProof.single('attachment'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn tệp hình ảnh chứng từ hợp lệ!'
    });
  }
  const fileUrl = `/uploads/payments/${req.file.filename}`;
  res.status(200).json({
    success: true,
    message: 'Tải lên chứng từ ảnh thành công!',
    url: fileUrl
  });
});

router.get('/financial-report', getFinancialReport);

// Quản lý Sổ Quỹ Thu - Chi (Cashbook)
router
  .route('/cashbook')
  .get(getCashbook)
  .post(createCashbookEntry);

// Tương thích ngược với các endpoint cũ
router
  .route('/transactions')
  .get(getCashbook)
  .post(createCashbookEntry);

// Phê duyệt phiếu Thu / Chi (Kế toán & Quản trị viên Admin)
router.put('/transactions/:id/approve', authorizeRoles('accountant', 'admin'), approveTransaction);
router.put('/transactions/:id/reject', authorizeRoles('accountant', 'admin'), rejectTransaction);
router.put('/cashbook/:id/approve', authorizeRoles('accountant', 'admin'), approveTransaction);
router.put('/cashbook/:id/reject', authorizeRoles('accountant', 'admin'), rejectTransaction);

router
  .route('/transactions/:id')
  .put(updateTransaction)
  .delete(deleteTransaction);

router
  .route('/cashbook/:id')
  .put(updateTransaction)
  .delete(deleteTransaction);

// Quản lý công nợ Nhà cung cấp
router.get('/supplier-debts', getSupplierDebts);
router.post('/supplier-debts/:id/pay', paySupplierDebt);

// Quản lý công nợ Khách hàng
router.post('/customer-debts/:id/pay', payCustomerDebt);

module.exports = router;
