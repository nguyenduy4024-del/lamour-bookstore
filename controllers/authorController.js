const Author = require('../models/Author');
const Book = require('../models/Book');
const { logActivity } = require('../utils/auditLogger');

// @desc    Lấy danh sách tất cả tác giả (kèm tính số tác phẩm thực tế từ kho sách)
// @route   GET /api/authors
// @access  Public
const getAllAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ name: 1 }).lean();

    const authorsWithCount = await Promise.all(
      authors.map(async (a) => {
        // Đếm số sách của tác giả trong DB Book
        const realCount = await Book.countDocuments({ 
          author: { $regex: new RegExp(a.name.trim(), 'i') } 
        });
        return {
          ...a,
          bookCount: realCount > 0 ? realCount : (a.bookCount || 0)
        };
      })
    );

    res.status(200).json({
      success: true,
      count: authorsWithCount.length,
      data: authorsWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi lấy danh sách tác giả'
    });
  }
};

// @desc    Lấy thông tin chi tiết 1 tác giả theo ID
// @route   GET /api/authors/:id
// @access  Public
const getAuthorById = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tác giả với ID này'
      });
    }

    res.status(200).json({
      success: true,
      data: author
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi lấy thông tin tác giả'
    });
  }
};

// @desc    Thêm tác giả mới (Có tích hợp Multer Upload Avatar)
// @route   POST /api/authors
// @access  Private (Admin, Staff)
const createAuthor = async (req, res) => {
  try {
    const { name, genre, quote, bookCount } = req.body;

    const authorExists = await Author.findOne({ name: name.trim() });
    if (authorExists) {
      return res.status(400).json({
        success: false,
        message: 'Tên tác giả này đã tồn tại trong hệ thống'
      });
    }

    let avatar = '';
    if (req.file) {
      avatar = `/uploads/products/${req.file.filename}`;
    } else if (req.body.avatar) {
      avatar = req.body.avatar;
    }

    const author = await Author.create({
      name: name.trim(),
      genre: genre ? genre.trim() : '',
      quote: quote ? quote.trim() : '',
      avatar,
      bookCount: Number(bookCount) || 0
    });

    logActivity(req, {
      module: 'BOOKS',
      action: 'AUTHOR_CREATE',
      severity: 'INFO',
      targetId: String(author._id),
      targetModel: 'Author',
      targetLabel: `Tác giả: ${author.name}`,
      description: `Thêm tác giả mới: "${author.name}" (Thể loại: ${author.genre || 'Chưa phân loại'})`
    });

    res.status(201).json({
      success: true,
      message: 'Thêm tác giả mới thành công',
      data: author
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Dữ liệu nhập vào không hợp lệ'
    });
  }
};

// @desc    Cập nhật thông tin tác giả theo ID (Có tích hợp Multer Upload Avatar)
// @route   PUT /api/authors/:id
// @access  Private (Admin, Staff)
const updateAuthor = async (req, res) => {
  try {
    const { name, genre, quote, bookCount } = req.body;

    let author = await Author.findById(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tác giả để cập nhật'
      });
    }

    const oldName = author.name;

    // Nếu cập nhật tên mới, kiểm tra trùng lặp
    if (name && name.trim() !== author.name) {
      const nameExists = await Author.findOne({ name: name.trim() });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Tên tác giả mới đã tồn tại trên hệ thống'
        });
      }
    }

    let avatar = author.avatar;
    if (req.file) {
      avatar = `/uploads/products/${req.file.filename}`;
    } else if (req.body.avatar !== undefined) {
      avatar = req.body.avatar;
    }

    author = await Author.findByIdAndUpdate(
      req.params.id,
      {
        name: name ? name.trim() : author.name,
        genre: genre !== undefined ? genre.trim() : author.genre,
        quote: quote !== undefined ? quote.trim() : author.quote,
        bio: req.body.bio !== undefined ? req.body.bio.trim() : author.bio,
        bookCount: bookCount !== undefined ? Number(bookCount) : author.bookCount,
        avatar
      },
      { new: true, runValidators: true }
    );

    logActivity(req, {
      module: 'BOOKS',
      action: 'AUTHOR_UPDATE',
      severity: 'INFO',
      targetId: String(author._id),
      targetModel: 'Author',
      targetLabel: `Tác giả: ${author.name}`,
      description: `Cập nhật thông tin tác giả: "${oldName}"`
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin tác giả thành công',
      data: author
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật tác giả'
    });
  }
};

// @desc    Tải ảnh chân dung tác giả từ máy tính
// @route   POST /api/authors/upload-avatar
// @access  Private (Admin, Staff)
const uploadAuthorAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn tệp ảnh từ máy tính' });
    }
    const fileUrl = `/uploads/products/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: 'Tải ảnh đại diện tác giả thành công!',
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi tải ảnh tác giả' });
  }
};

// @desc    Xóa một tác giả theo ID
// @route   DELETE /api/authors/:id
// @access  Private (Admin, Staff)
const deleteAuthor = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tác giả để xóa'
      });
    }

    await author.deleteOne();

    logActivity(req, {
      module: 'BOOKS',
      action: 'AUTHOR_DELETE',
      severity: 'WARNING',
      targetId: String(author._id),
      targetModel: 'Author',
      targetLabel: `Tác giả: ${author.name}`,
      description: `Xóa tác giả: "${author.name}" khỏi hệ thống`
    });

    res.status(200).json({
      success: true,
      message: 'Xóa tác giả thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi xóa tác giả'
    });
  }
};

module.exports = {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  uploadAuthorAvatar,
  deleteAuthor
};
