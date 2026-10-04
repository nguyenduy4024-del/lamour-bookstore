const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getDashboardOverview,
  getAnalyticsReport
} = require('../controllers/adminController');
const {
  restoreBook,
  deleteBook
} = require('../controllers/bookController');
const {
  getAllSuppliers,
  getSupplierDetail,
  getSupplierBooks,
  getSupplierHistory,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPendingReceipts,
  approveImportReceipt,
  rejectImportReceipt,
  approveExportReceipt,
  rejectExportReceipt,
  approveAuditReceipt,
  rejectAuditReceipt
} = require('../controllers/inventoryController');
const {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogDetail,
  exportAuditLogsCsv,
  markAuditLogAsRead,
  markAllAuditLogsAsRead
} = require('../controllers/auditLogController');

// Routes Nhật ký hoạt động (Audit Log / Activity Trail) - Dành riêng cho Admin
router.get('/audit-logs/stats', protect, authorizeRoles('admin'), getAuditLogStats);
router.get('/audit-logs/export', protect, authorizeRoles('admin'), exportAuditLogsCsv);
router.put('/audit-logs/mark-all-read', protect, authorizeRoles('admin'), markAllAuditLogsAsRead);
router.put('/audit-logs/:id/read', protect, authorizeRoles('admin'), markAuditLogAsRead);
router.get('/audit-logs/:id', protect, authorizeRoles('admin'), getAuditLogDetail);
router.get('/audit-logs', protect, authorizeRoles('admin'), getAuditLogs);

// Routes Phê duyệt Phiếu Nhập / Xuất Kho & Kiểm Kê đa tầng (Multi-tier Approval)
router.get('/receipts/pending', protect, authorizeRoles('admin', 'staff'), getPendingReceipts);
router.put('/import-receipts/:id/approve', protect, authorizeRoles('admin'), approveImportReceipt);
router.put('/import-receipts/:id/reject', protect, authorizeRoles('admin'), rejectImportReceipt);
router.put('/export-receipts/:id/approve', protect, authorizeRoles('admin'), approveExportReceipt);
router.put('/export-receipts/:id/reject', protect, authorizeRoles('admin'), rejectExportReceipt);
router.put('/audit-receipts/:id/approve', protect, authorizeRoles('admin'), approveAuditReceipt);
router.put('/audit-receipts/:id/reject', protect, authorizeRoles('admin'), rejectAuditReceipt);

// Route thống kê tổng quan Bàn làm việc (Dashboard Overview)
router.get(
  '/dashboard-overview',
  protect,
  authorizeRoles('admin', 'staff', 'stock', 'accountant'),
  getDashboardOverview
);

// Route phân tích doanh thu chuyên sâu (Analytics & BI)
router.get(
  '/analytics',
  protect,
  authorizeRoles('admin', 'staff', 'accountant'),
  getAnalyticsReport
);

// Routes Nhà cung cấp dành cho Admin & Kế toán & Quản trị viên
router
  .route('/suppliers')
  .get(protect, authorizeRoles('admin', 'staff', 'stock', 'accountant'), getAllSuppliers)
  .post(protect, authorizeRoles('admin', 'stock'), createSupplier);

router.get('/suppliers/:id/books', protect, authorizeRoles('admin', 'staff', 'stock', 'accountant'), getSupplierBooks);
router.get('/suppliers/:id/history', protect, authorizeRoles('admin', 'staff', 'stock', 'accountant'), getSupplierHistory);

router
  .route('/suppliers/:id')
  .get(protect, authorizeRoles('admin', 'staff', 'stock', 'accountant'), getSupplierDetail)
  .put(protect, authorizeRoles('admin', 'stock'), updateSupplier)
  .delete(protect, authorizeRoles('admin', 'stock'), deleteSupplier);

// Route khôi phục / hiện lại sách (Restore Soft Delete)
router.put(
  '/books/:id/restore',
  protect,
  authorizeRoles('admin', 'staff'),
  restoreBook
);

// Route ẩn sách (Soft Delete)
router.delete(
  '/books/:id',
  protect,
  authorizeRoles('admin', 'staff'),
  deleteBook
);

module.exports = router;
