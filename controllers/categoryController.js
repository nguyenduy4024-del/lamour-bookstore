const Category = require('../models/Category');
const Book = require('../models/Book');
const { logActivity } = require('../utils/auditLogger');

// @desc    Lấy danh sách tất cả các thể loại kèm số lượng sách
// @route   GET /api/categories
// @access  Public
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();

    // Đếm số sách cho mỗi thể loại
    const categoriesWithCount = await Promise.all(
      categories.map(async (c) => {
        const bookCount = await Book.countDocuments({ category: c.name });
        return {
          ...c,
          bookCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách thể loại'
    });
  }
};

// @desc    Thêm thể loại mới
// @route   POST /api/categories
// @access  Private (Admin, Staff)
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên thể loại' });
    }

    const exists = await Category.findOne({ name: name.trim() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Tên thể loại này đã tồn tại trong hệ thống' });
    }

    const category = await Category.create({
      name: name.trim(),
      description: (description || '').trim()
    });

    logActivity(req, {
      module: 'BOOKS',
      action: 'CATEGORY_CREATE',
      severity: 'INFO',
      targetId: String(category._id),
      targetModel: 'Category',
      targetLabel: `Thể loại: ${category.name}`,
      description: `Tạo thể loại sách mới: "${category.name}"`
    });

    res.status(201).json({
      success: true,
      message: 'Thêm thể loại thành công',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo thể loại'
    });
  }
};

// @desc    Cập nhật thể loại
// @route   PUT /api/categories/:id
// @access  Private (Admin, Staff)
const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thể loại' });
    }

    const oldName = category.name;

    if (name && name.trim() !== category.name) {
      const dup = await Category.findOne({ name: name.trim(), _id: { $ne: category._id } });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Tên thể loại này đã được sử dụng' });
      }

      // Cập nhật tên thể loại cho các sách đang sử dụng tên cũ
      await Book.updateMany({ category: category.name }, { category: name.trim() });
      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    await category.save();

    logActivity(req, {
      module: 'BOOKS',
      action: 'CATEGORY_UPDATE',
      severity: 'INFO',
      targetId: String(category._id),
      targetModel: 'Category',
      targetLabel: `Thể loại: ${category.name}`,
      description: `Cập nhật thể loại sách: "${oldName}" ➔ "${category.name}"`,
      diff: [
        ...(name && name !== oldName ? [{ field: 'name', fieldLabel: 'Tên thể loại', oldValue: oldName, newValue: category.name }] : [])
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật thể loại thành công',
      data: category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật thể loại'
    });
  }
};

// @desc    Xóa thể loại
// @route   DELETE /api/categories/:id
// @access  Private (Admin, Staff)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thể loại' });
    }

    const bookCount = await Book.countDocuments({ category: category.name });
    if (bookCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa thể loại "${category.name}" vì đang có ${bookCount} cuốn sách thuộc thể loại này.`
      });
    }

    await category.deleteOne();

    logActivity(req, {
      module: 'BOOKS',
      action: 'CATEGORY_DELETE',
      severity: 'WARNING',
      targetId: String(category._id),
      targetModel: 'Category',
      targetLabel: `Thể loại: ${category.name}`,
      description: `Xóa thể loại sách: "${category.name}"`
    });

    res.status(200).json({
      success: true,
      message: `Đã xóa thể loại "${category.name}" thành công`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa thể loại'
    });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
