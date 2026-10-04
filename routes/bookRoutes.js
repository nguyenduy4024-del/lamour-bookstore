const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getAllBooks,
  getCategoryStats,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  restoreBook,
  getCoversGallery,
  uploadCoverImage
} = require('../controllers/bookController');

router
  .route('/')
  .get(getAllBooks)
  .post(protect, authorizeRoles('admin', 'staff', 'stock'), upload.array('images', 5), createBook);

// Thư viện ảnh bìa có sẵn trong public/images/covers
router.get('/covers-gallery', getCoversGallery);

// Tải ảnh bìa mới từ máy tính
router.post('/upload-cover', protect, authorizeRoles('admin', 'staff', 'stock'), (req, res, next) => {
  upload.uploadCover.single('coverImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, uploadCoverImage);

// Thống kê thể loại sách
router.get('/stats/categories', getCategoryStats);

// Khôi phục sách đã ẩn (Restore)
router.put('/:id/restore', protect, authorizeRoles('admin', 'staff'), restoreBook);

router
  .route('/:id')
  .get(getBookById)
  .put(protect, authorizeRoles('admin', 'staff', 'stock'), upload.array('images', 5), updateBook)
  .delete(protect, authorizeRoles('admin', 'staff', 'stock'), deleteBook);

module.exports = router;
