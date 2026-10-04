const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');
const {
  getUsersByRole,
  toggleUserLock,
  createUser,
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  addUserBank,
  setDefaultUserBank,
  deleteUserBank,
  updateUserIdentity,
  changeUserPassword,
  getAllAccounts,
  updateUserRole,
  adminResetPassword,
  getEmployees,
  createEmployee,
  updateEmployee,
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  getCustomerOrdersHistory
} = require('../controllers/userController');
const {
  getUserOrders,
  cancelUserOrder,
  payUserOrder,
  returnUserOrder
} = require('../controllers/invoiceController');

// ============ USER PROFILE & DASHBOARD ROUTES ============
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/avatar', protect, uploadAvatar.single('avatar'), uploadUserAvatar);

// Quản lý địa chỉ
router.post('/address', protect, addUserAddress);
router.put('/address/:id', protect, updateUserAddress);
router.delete('/address/:id', protect, deleteUserAddress);

// Quản lý ngân hàng
router.post('/bank', protect, addUserBank);
router.put('/bank/default/:id', protect, setDefaultUserBank);
router.delete('/bank/:id', protect, deleteUserBank);

// Quản lý định danh CCCD
router.put('/identity', protect, updateUserIdentity);

// Đổi mật khẩu
router.put('/change-password', protect, changeUserPassword);

// Đơn mua của người dùng (Shopee Order Flow)
router.get('/orders', protect, getUserOrders);
router.put('/orders/:id/cancel', protect, cancelUserOrder);
router.put('/orders/:id/pay', protect, payUserOrder);
router.post('/orders/:id/return-request', protect, returnUserOrder);

// ============ ENTERPRISE ADMIN PORTAL ROUTES ============
// Phân hệ Tài khoản
router.get('/accounts', protect, authorizeRoles('admin'), getAllAccounts);
router.put('/:id/role', protect, authorizeRoles('admin'), updateUserRole);
router.put('/:id/reset-password', protect, authorizeRoles('admin'), adminResetPassword);

// Phân hệ Nhân viên
router.get('/employees', protect, authorizeRoles('admin', 'staff', 'accountant'), getEmployees);
router.post('/employees', protect, authorizeRoles('admin'), createEmployee);
router.put('/employees/:id', protect, authorizeRoles('admin'), updateEmployee);

// Phân hệ Khách hàng
router.get('/customers', protect, authorizeRoles('admin', 'staff', 'accountant'), getCustomers);
router.post('/customers', protect, authorizeRoles('admin', 'staff'), createCustomer);
router.get('/customers/:id', protect, authorizeRoles('admin', 'staff', 'accountant'), getCustomerById);
router.put('/customers/:id', protect, authorizeRoles('admin', 'staff'), updateCustomer);
router.get('/customers/:id/orders', protect, authorizeRoles('admin', 'staff', 'accountant'), getCustomerOrdersHistory);

// ============ ADMIN / STAFF USER MANAGEMENT LEGACY ROUTES ============
// Cho phép admin, staff, accountant lấy danh sách người dùng/khách hàng
router.get('/', protect, authorizeRoles('admin', 'staff', 'accountant'), getUsersByRole);

// Đăng ký route POST tạo tài khoản bởi admin hoặc nhân viên (tạo khách hàng)
router.post('/', protect, authorizeRoles('admin', 'staff'), createUser);

// Chỉ admin mới có quyền khóa / mở khóa tài khoản
router.put('/:id/lock', protect, authorizeRoles('admin'), toggleUserLock);

module.exports = router;
