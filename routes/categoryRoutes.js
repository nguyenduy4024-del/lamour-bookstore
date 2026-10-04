const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

router
  .route('/')
  .get(getAllCategories)
  .post(protect, authorizeRoles('admin', 'staff', 'stock'), createCategory);

router
  .route('/:id')
  .put(protect, authorizeRoles('admin', 'staff'), updateCategory)
  .delete(protect, authorizeRoles('admin', 'staff'), deleteCategory);

module.exports = router;
