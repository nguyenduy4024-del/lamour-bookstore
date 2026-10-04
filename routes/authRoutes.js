const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  changePassword,
  quickResetPassword
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/quick-reset', quickResetPassword);

router.get('/me', protect, getUserProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;