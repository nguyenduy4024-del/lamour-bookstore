const express = require('express');
const router = express.Router();
const { getSettings, getPaymentInfo, updateSettings } = require('../controllers/settingController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', getSettings);
router.get('/payment-info', getPaymentInfo);
router.put('/', protect, authorizeRoles('admin'), (upload.uploadSettings || upload).any(), updateSettings);

module.exports = router;
