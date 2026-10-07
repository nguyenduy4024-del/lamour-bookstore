const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getAllSuppliers,
  getSupplierDetail,
  getSupplierBooks,
  getSupplierHistory,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  quickCreateSupplier,
  getAllImportReceipts,
  getImportReceiptById,
  createImportReceipt,
  approveImportReceipt,
  rejectImportReceipt,
  completeImportReceipt,
  getAllExportReceipts,
  getExportReceiptById,
  createExportReceipt,
  approveExportReceipt,
  rejectExportReceipt,
  completeExportReceipt,
  cancelExportReceipt,
  getAllAuditReceipts,
  getAuditReceiptById,
  createAuditReceipt,
  approveAuditReceipt,
  rejectAuditReceipt,
  adjustBookStock,
  getAdjustmentHistory,
  getInventoryLookup,
  updateBookShelfLocation,
  createSupplierReturn,
  getAllSupplierReturns,
  getSupplierReturnById,
  getCustomerReturnsPendingWarehouse,
  processCustomerReturnDisposition,
  getAllShelves,
  createShelf,
  updateShelf,
  deleteShelf,
  transferBooksBetweenShelves,
  toggleShelfMaintenance,
  getShelfActivityLogs,
  createBookHideRequest,
  getAllBookHideRequests,
  getBookHideRequestById,
  approveBookHideRequest,
  rejectBookHideRequest,
  cancelBookHideRequest,
  executeBookHideRequest,
  createSupplierSuspendRequest,
  getAllSupplierSuspendRequests,
  getSupplierSuspendRequestById,
  approveSupplierSuspendRequest,
  rejectSupplierSuspendRequest,
  cancelSupplierSuspendRequest,
  executeSupplierSuspendRequest,
  createShelfCreateRequest,
  getAllShelfCreateRequests,
  getShelfCreateRequestById,
  approveShelfCreateRequest,
  rejectShelfCreateRequest,
  cancelShelfCreateRequest,
  createShelfMaintenanceRequest,
  getAllShelfMaintenanceRequests,
  getShelfMaintenanceRequestById,
  approveShelfMaintenanceRequest,
  rejectShelfMaintenanceRequest,
  cancelShelfMaintenanceRequest,
  createShelfTransferRequest,
  getAllShelfTransferRequests,
  getShelfTransferRequestById,
  approveShelfTransferRequest,
  rejectShelfTransferRequest,
  cancelShelfTransferRequest
} = require('../controllers/inventoryController');

// Routes Yêu cầu Điều chuyển Sách từ Kho & Phê duyệt của Quản trị viên
router
  .route('/shelf-transfer-requests')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllShelfTransferRequests)
  .post(protect, authorizeRoles('stock', 'admin', 'staff'), createShelfTransferRequest);

router.get('/shelf-transfer-requests/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getShelfTransferRequestById);
router.put('/shelf-transfer-requests/:id/approve', protect, authorizeRoles('admin'), approveShelfTransferRequest);
router.put('/shelf-transfer-requests/:id/reject', protect, authorizeRoles('admin'), rejectShelfTransferRequest);
router.put('/shelf-transfer-requests/:id/cancel', protect, authorizeRoles('stock', 'admin'), cancelShelfTransferRequest);

// Routes Yêu cầu Bảo trì Kệ Sách từ Kho & Phê duyệt của Quản trị viên
router
  .route('/shelf-maintenance-requests')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllShelfMaintenanceRequests)
  .post(protect, authorizeRoles('stock', 'admin', 'staff'), createShelfMaintenanceRequest);

router.get('/shelf-maintenance-requests/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getShelfMaintenanceRequestById);
router.put('/shelf-maintenance-requests/:id/approve', protect, authorizeRoles('admin'), approveShelfMaintenanceRequest);
router.put('/shelf-maintenance-requests/:id/reject', protect, authorizeRoles('admin'), rejectShelfMaintenanceRequest);
router.put('/shelf-maintenance-requests/:id/cancel', protect, authorizeRoles('stock', 'admin'), cancelShelfMaintenanceRequest);

// Routes Yêu cầu Thêm Kệ Sách từ Kho & Phê duyệt của Quản trị viên
router
  .route('/shelf-create-requests')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllShelfCreateRequests)
  .post(protect, authorizeRoles('stock', 'admin', 'staff'), createShelfCreateRequest);

router.get('/shelf-create-requests/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getShelfCreateRequestById);
router.put('/shelf-create-requests/:id/approve', protect, authorizeRoles('admin'), approveShelfCreateRequest);
router.put('/shelf-create-requests/:id/reject', protect, authorizeRoles('admin'), rejectShelfCreateRequest);
router.put('/shelf-create-requests/:id/cancel', protect, authorizeRoles('stock', 'admin'), cancelShelfCreateRequest);

// Routes Yêu cầu ẩn sách từ Kho & Phê duyệt của Quản trị viên
router
  .route('/hide-requests')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllBookHideRequests)
  .post(protect, authorizeRoles('stock', 'admin', 'staff'), createBookHideRequest);

router.get('/hide-requests/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getBookHideRequestById);
router.put('/hide-requests/:id/approve', protect, authorizeRoles('admin'), approveBookHideRequest);
router.put('/hide-requests/:id/reject', protect, authorizeRoles('admin'), rejectBookHideRequest);
router.put('/hide-requests/:id/cancel', protect, authorizeRoles('stock', 'admin'), cancelBookHideRequest);
router.post('/hide-requests/:id/execute', protect, authorizeRoles('stock', 'admin'), executeBookHideRequest);

// Routes Yêu cầu tạm ngưng Nhà cung cấp từ Kho & Phê duyệt của Quản trị viên
router
  .route('/supplier-suspend-requests')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllSupplierSuspendRequests)
  .post(protect, authorizeRoles('stock', 'admin', 'staff'), createSupplierSuspendRequest);

router.get('/supplier-suspend-requests/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getSupplierSuspendRequestById);
router.put('/supplier-suspend-requests/:id/approve', protect, authorizeRoles('admin'), approveSupplierSuspendRequest);
router.put('/supplier-suspend-requests/:id/reject', protect, authorizeRoles('admin'), rejectSupplierSuspendRequest);
router.put('/supplier-suspend-requests/:id/cancel', protect, authorizeRoles('stock', 'admin'), cancelSupplierSuspendRequest);
router.post('/supplier-suspend-requests/:id/execute', protect, authorizeRoles('stock', 'admin'), executeSupplierSuspendRequest);

// Routes Quản lý Kệ sách vật lý thực tế & Dung lượng
router
  .route('/shelves')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllShelves)
  .post(protect, authorizeRoles('stock', 'admin'), createShelf);

router.post('/shelves/transfer', protect, authorizeRoles('stock', 'admin'), transferBooksBetweenShelves);
router.put('/shelves/:id/maintenance', protect, authorizeRoles('stock', 'admin'), toggleShelfMaintenance);

router
  .route('/shelves/:id')
  .put(protect, authorizeRoles('stock', 'admin'), updateShelf)
  .delete(protect, authorizeRoles('admin'), deleteShelf);

// Route lịch sử hoạt động kệ sách & luân chuyển sách
router.get('/shelf-activities', protect, authorizeRoles('stock', 'admin'), getShelfActivityLogs);

// Routes Tra cứu tồn kho sách tổng hợp đa năng & Sửa vị trí kệ
router.get('/lookup', protect, authorizeRoles('stock', 'admin', 'staff'), getInventoryLookup);
router.put('/books/:id/shelf', protect, authorizeRoles('stock', 'admin'), updateBookShelfLocation);

// Routes Điều chỉnh tồn kho nhanh & Lịch sử lưu vết (Chỉ Admin mới có quyền điều chỉnh trực tiếp)
router.put('/books/:id/adjust', protect, authorizeRoles('admin'), adjustBookStock);
router.get('/adjustments/history', protect, authorizeRoles('stock', 'admin', 'staff'), getAdjustmentHistory);

// Route Tạo nhanh Nhà Cung Cấp ngay trên modal phiếu nhập
router.post('/quick-supplier', protect, authorizeRoles('stock', 'admin'), quickCreateSupplier);

// Routes Nhà cung cấp
router
  .route('/suppliers')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllSuppliers)
  .post(protect, authorizeRoles('stock', 'admin'), createSupplier);

router.get('/suppliers/:id/books', protect, authorizeRoles('stock', 'admin', 'staff'), getSupplierBooks);
router.get('/suppliers/:id/history', protect, authorizeRoles('stock', 'admin', 'staff'), getSupplierHistory);

router
  .route('/suppliers/:id')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getSupplierDetail)
  .put(protect, authorizeRoles('stock', 'admin'), updateSupplier)
  .delete(protect, authorizeRoles('admin'), deleteSupplier);

// Routes Phiếu nhập kho
router
  .route('/import-receipts')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllImportReceipts)
  .post(protect, authorizeRoles('stock', 'admin'), createImportReceipt);

router.get('/import-receipts/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getImportReceiptById);
router.put('/import-receipts/:id/approve', protect, authorizeRoles('admin'), approveImportReceipt);
router.put('/import-receipts/:id/reject', protect, authorizeRoles('admin'), rejectImportReceipt);
router.put('/import-receipts/:id/complete', protect, authorizeRoles('stock', 'admin'), completeImportReceipt);

// Routes Phiếu xuất kho
router
  .route('/export-receipts')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllExportReceipts)
  .post(protect, authorizeRoles('stock', 'admin'), createExportReceipt);

router.get('/export-receipts/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getExportReceiptById);
router.put('/export-receipts/:id/approve', protect, authorizeRoles('admin'), approveExportReceipt);
router.put('/export-receipts/:id/reject', protect, authorizeRoles('admin'), rejectExportReceipt);
router.put('/export-receipts/:id/complete', protect, authorizeRoles('stock', 'admin'), completeExportReceipt);
router.put('/export-receipts/:id/cancel', protect, authorizeRoles('stock', 'admin'), cancelExportReceipt);

// Routes Kiểm kê kho
router
  .route('/audit-receipts')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllAuditReceipts)
  .post(protect, authorizeRoles('stock', 'admin'), createAuditReceipt);

// Alias route /audits
router
  .route('/audits')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllAuditReceipts)
  .post(protect, authorizeRoles('stock', 'admin'), createAuditReceipt);

router.get('/audit-receipts/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getAuditReceiptById);
router.put('/audit-receipts/:id/approve', protect, authorizeRoles('admin'), approveAuditReceipt);
router.put('/audit-receipts/:id/reject', protect, authorizeRoles('admin'), rejectAuditReceipt);

// Routes Trả hàng Nhà cung cấp
router
  .route('/supplier-returns')
  .get(protect, authorizeRoles('stock', 'admin', 'staff'), getAllSupplierReturns)
  .post(protect, authorizeRoles('stock', 'admin'), createSupplierReturn);

router.get('/supplier-returns/:id', protect, authorizeRoles('stock', 'admin', 'staff'), getSupplierReturnById);

// Routes Sách hoàn từ Khách hàng chờ Kho xử lý & Phân loại
router.get('/customer-returns', protect, authorizeRoles('stock', 'admin', 'staff'), getCustomerReturnsPendingWarehouse);
router.put('/customer-returns/:id/process', protect, authorizeRoles('stock', 'admin'), processCustomerReturnDisposition);

module.exports = router;
