const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  uploadAuthorAvatar,
  deleteAuthor
} = require('../controllers/authorController');

router
  .route('/')
  .get(getAllAuthors)
  .post(protect, authorizeRoles('admin', 'staff'), upload.single('avatar'), createAuthor);

// Upload avatar từ máy tính
router.post('/upload-avatar', protect, authorizeRoles('admin', 'staff'), (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, uploadAuthorAvatar);

router
  .route('/:id')
  .get(getAuthorById)
  .put(protect, authorizeRoles('admin', 'staff'), upload.single('avatar'), updateAuthor)
  .delete(protect, authorizeRoles('admin', 'staff'), deleteAuthor);

module.exports = router;
