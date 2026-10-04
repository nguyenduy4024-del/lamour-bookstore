const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getBackups,
  getBackupStats,
  createNewBackup,
  downloadBackupFile,
  restoreFromExistingBackup,
  uploadAndRestoreBackup,
  deleteBackupItem,
  updateBackupConfig
} = require('../controllers/backupController');

// Tất cả các route Sao lưu & Phục hồi bắt buộc phải có quyền Admin
router.use(protect, authorizeRoles('admin'));

router.get('/stats', getBackupStats);
router.put('/config', updateBackupConfig);
router.post('/upload-restore', upload.uploadBackupZip.single('backupFile'), uploadAndRestoreBackup);
router.get('/:id/download', downloadBackupFile);
router.post('/:id/restore', restoreFromExistingBackup);
router.delete('/:id', deleteBackupItem);
router.get('/', getBackups);
router.post('/', createNewBackup);

module.exports = router;
