const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  validateCoupon,
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon
} = require('../controllers/couponController');

// 1. Kiểm tra tính hợp lệ & xem trước giảm giá (Public / User / Staff POS)
router.post('/validate', validateCoupon);

// 2. Quản trị mã giảm giá (Admin, Staff, Kế toán)
router
  .route('/')
  .get(protect, authorizeRoles('admin', 'staff', 'accountant'), getCoupons)
  .post(protect, authorizeRoles('admin'), createCoupon);

router
  .route('/:id')
  .get(protect, authorizeRoles('admin', 'staff', 'accountant'), getCouponById)
  .put(protect, authorizeRoles('admin'), updateCoupon)
  .delete(protect, authorizeRoles('admin'), deleteCoupon);

router.patch('/:id/toggle', protect, authorizeRoles('admin'), toggleCouponStatus);

module.exports = router;
