const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const BookHideRequest = require('../models/BookHideRequest');
const {
  checkShelfCapacity,
  updateShelfStatus,
  resolveShelf
} = require('../utils/shelfHelper');
const { logShelfActivity } = require('../utils/shelfActivityLogger');
const { logActivity } = require('../utils/auditLogger');

// @desc    Lấy danh sách tất cả các sách (hỗ trợ filter ?featured=true)
// @route   GET /api/books
// @access  Public
const getAllBooks = async (req, res) => {
  try {
    const filter = {};
    const { status, includeDeleted, all, featured } = req.query;

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // Bộ lọc trạng thái sách (Soft Delete):
    // - status='all' hoặc includeDeleted='true' hoặc all='true': Lấy toàn bộ sách (cả active và hidden) cho Admin
    // - status='hidden' hoặc isDeleted='true': Chỉ lấy sách đã bị ẩn
    // - Mặc định (Khách hàng & Thu ngân POS): BẮT BUỘC chỉ lấy sách đang kinh doanh (isDeleted != true & status != hidden)
    if (status === 'all' || includeDeleted === 'true' || all === 'true') {
      // Không áp dụng lọc isDeleted để Admin có thể xem tất cả
    } else if (status === 'hidden' || req.query.isDeleted === 'true') {
      filter.$or = [{ isDeleted: true }, { status: 'hidden' }];
    } else {
      filter.isDeleted = { $ne: true };
      filter.status = { $ne: 'hidden' };
    }

    const books = await Book.find(filter).sort({ bookCode: 1 }).populate('supplier', 'name code');
    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi lấy danh sách sách'
    });
  }
};

// @desc    Thống kê cơ cấu sách theo thể loại (Aggregation $group)
// @route   GET /api/books/stats/categories
// @access  Public
const getCategoryStats = async (req, res) => {
  try {
    const stats = await Book.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          status: { $ne: 'hidden' }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$category', 'Khác'] },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi thống kê thể loại sách'
    });
  }
};

// @desc    Lấy chi tiết một cuốn sách theo ID
// @route   GET /api/books/:id
// @access  Public
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('supplier', 'code name contactPerson phone email address');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sách với ID này'
      });
    }

    res.status(200).json({
      success: true,
      data: book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi lấy thông tin sách'
    });
  }
};

// @desc    Thêm một cuốn sách mới (Có tích hợp Multer Upload & isFeatured / slogan)
// @route   POST /api/books
// @access  Private (Admin, Staff)
const createBook = async (req, res) => {
  try {
    const {
      bookCode,
      isbn,
      title,
      author,
      category,
      price,
      costPrice,
      stock,
      shelfLocation,
      supplier,
      coverIndex,
      isFeatured,
      slogan
    } = req.body;

    const finalBookCode = (bookCode || isbn || ('BK' + Date.now().toString().slice(-6))).trim();

    const bookExists = await Book.findOne({ bookCode: finalBookCode });
    if (bookExists) {
      return res.status(400).json({
        success: false,
        message: 'Mã sách đã tồn tại trong hệ thống'
      });
    }

    const targetShelfParam = req.body.shelf || req.body.shelfPosition || shelfLocation;
    let assignedShelf = null;
    if (targetShelfParam) {
      assignedShelf = await resolveShelf(targetShelfParam);
    }

    const requestedStock = Number(stock) || 0;
    if (assignedShelf) {
      if (assignedShelf.status === 'maintenance') {
        return res.status(400).json({
          success: false,
          message: `Kệ "${assignedShelf.shelfName}" (${assignedShelf.shelfCode}) đang trong quá trình BẢO TRÌ! Không thể xếp thêm sách mới vào kệ này.`
        });
      }

      const existingBooks = await Book.find({
        shelf: assignedShelf._id,
        isDeleted: { $ne: true }
      });
      const currentOccupancy = existingBooks.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
      if (currentOccupancy + requestedStock > assignedShelf.capacity) {
        const availableSpace = Math.max(0, assignedShelf.capacity - currentOccupancy);
        return res.status(400).json({
          success: false,
          message: `Kệ ${assignedShelf.shelfName} không đủ chỗ! Hiện tại còn trống ${availableSpace} chỗ, không thể chứa ${requestedStock} cuốn.`
        });
      }
    }

    let coverImage = req.body.coverImage || req.body.imageUrl || '';
    let images = [];

    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map(file => `/uploads/products/${file.filename}`);
      const selectedCoverIdx = parseInt(coverIndex, 10) || 0;
      
      // Ảnh chọn làm bìa (mặc định là ảnh đầu tiên)
      coverImage = filePaths[selectedCoverIdx] || filePaths[0];

      // Các ảnh còn lại lưu vào mảng images (tối đa 4 ảnh)
      images = filePaths.filter((_, idx) => idx !== selectedCoverIdx).slice(0, 4);
    }

    const book = await Book.create({
      bookCode: finalBookCode,
      title,
      author,
      category,
      price: Number(price),
      costPrice: costPrice ? Number(costPrice) : undefined,
      stock: requestedStock,
      shelf: assignedShelf ? assignedShelf._id : null,
      shelfPosition: assignedShelf ? assignedShelf.shelfName : (req.body.shelfPosition || shelfLocation || ''),
      shelfLocation: assignedShelf ? assignedShelf.shelfName : (shelfLocation || req.body.shelfPosition || ''),
      supplier: (supplier && supplier !== '') ? supplier : null,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      slogan: slogan || '',
      coverImage,
      images
    });

    if (assignedShelf) {
      await updateShelfStatus(assignedShelf._id);
      // Ghi nhật ký: thêm sách vào kệ
      await logShelfActivity({
        action: 'BOOK_CREATE',
        description: `Thêm sách mới "${book.title}" (${book.bookCode}) vào kệ ${assignedShelf.shelfCode} với số lượng ${requestedStock} cuốn.`,
        book: { _id: book._id, title: book.title, bookCode: book.bookCode },
        toShelf: { _id: assignedShelf._id, shelfCode: assignedShelf.shelfCode, shelfName: assignedShelf.shelfName },
        quantity: requestedStock,
        performer: req.user,
        details: { category: book.category }
      });
    }

    logActivity(req, {
      module: 'BOOKS',
      action: 'BOOK_CREATE',
      severity: 'INFO',
      targetId: String(book._id),
      targetModel: 'Book',
      targetLabel: `${book.title} (${book.bookCode})`,
      description: `Thêm sách mới vào hệ thống: "${book.title}" (Mã: ${book.bookCode}, Giá: ${Number(book.price || 0).toLocaleString('vi-VN')} đ, Tồn: ${book.stock || 0})`,
      diff: [
        { field: 'price', fieldLabel: 'Giá bán', oldValue: null, newValue: book.price },
        { field: 'stock', fieldLabel: 'Tồn ban đầu', oldValue: null, newValue: book.stock }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Thêm sách mới thành công',
      data: book
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Dữ liệu nhập vào không hợp lệ'
    });
  }
};

// @desc    Cập nhật thông tin cuốn sách theo ID (Có tích hợp Multer Upload & isFeatured / slogan)
// @route   PUT /api/books/:id
// @access  Private (Admin, Staff)
const updateBook = async (req, res) => {
  try {
    const {
      bookCode,
      isbn,
      title,
      author,
      category,
      price,
      stock,
      shelfLocation,
      coverIndex,
      isFeatured,
      slogan
    } = req.body;

    let book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sách để cập nhật'
      });
    }

    const newBookCode = (bookCode || isbn || '').trim();
    // Nếu cập nhật mã sách mới, kiểm tra trùng lặp
    if (newBookCode && newBookCode !== book.bookCode) {
      const codeExists = await Book.findOne({ bookCode: newBookCode });
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Mã sách mới đã tồn tại trên hệ thống'
        });
      }
    }

    // Xác định kệ và kiểm tra sức chứa khi thay đổi kệ hoặc thay đổi stock
    const targetStock = stock !== undefined ? Number(stock) : book.stock;
    const targetShelfParam = req.body.shelf !== undefined 
      ? req.body.shelf 
      : (req.body.shelfPosition !== undefined ? req.body.shelfPosition : shelfLocation);

    let targetShelf = null;
    if (targetShelfParam !== undefined) {
      if (targetShelfParam && targetShelfParam !== '') {
        targetShelf = await resolveShelf(targetShelfParam);
        if (!targetShelf) {
          return res.status(400).json({
            success: false,
            message: 'Kệ sách được chọn không tồn tại trong hệ thống.'
          });
        }
      } else {
        targetShelf = null;
      }
    } else if (book.shelf) {
      targetShelf = await resolveShelf(book.shelf);
    }

    if (targetShelf) {
      if (targetShelf.status === 'maintenance') {
        return res.status(400).json({
          success: false,
          message: `Kệ "${targetShelf.shelfName}" (${targetShelf.shelfCode}) đang trong quá trình BẢO TRÌ! Không thể xếp hoặc điều chuyển sách vào kệ này.`
        });
      }

      const existingBooks = await Book.find({
        shelf: targetShelf._id,
        _id: { $ne: book._id },
        isDeleted: { $ne: true }
      });
      const currentOccupancy = existingBooks.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
      const newStock = Number(targetStock) || 0;
      if (currentOccupancy + newStock > targetShelf.capacity) {
        const availableSpace = Math.max(0, targetShelf.capacity - currentOccupancy);
        return res.status(400).json({
          success: false,
          message: `Kệ ${targetShelf.shelfName} không đủ chỗ! Hiện tại còn trống ${availableSpace} chỗ, không thể chứa ${newStock} cuốn.`
        });
      }
    }

    const previousShelfId = book.shelf ? book.shelf.toString() : null;
    const previousShelfDoc = (previousShelfId || book.shelfLocation || book.shelfPosition)
      ? await resolveShelf(previousShelfId || book.shelfLocation || book.shelfPosition)
      : null;

    let coverImage = req.body.coverImage !== undefined 
      ? req.body.coverImage 
      : (req.body.imageUrl !== undefined ? req.body.imageUrl : book.coverImage);
    let images = book.images;

    // Nếu người dùng tải lên danh sách ảnh mới
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map(file => `/uploads/products/${file.filename}`);
      const selectedCoverIdx = parseInt(coverIndex, 10) || 0;
      
      coverImage = filePaths[selectedCoverIdx] || filePaths[0];
      images = filePaths.filter((_, idx) => idx !== selectedCoverIdx).slice(0, 4);
    }

    let updateFields = {
      bookCode: newBookCode || book.bookCode,
      title: title || book.title,
      author: author || book.author,
      category: category || book.category,
      price: price !== undefined ? Number(price) : book.price,
      stock: targetStock,
      shelf: targetShelf ? targetShelf._id : null,
      shelfPosition: targetShelf ? targetShelf.shelfName : (req.body.shelfPosition !== undefined ? req.body.shelfPosition : (shelfLocation !== undefined ? shelfLocation : book.shelfPosition)),
      shelfLocation: targetShelf ? targetShelf.shelfName : (shelfLocation !== undefined ? shelfLocation : (req.body.shelfPosition !== undefined ? req.body.shelfPosition : book.shelfLocation)),
      isFeatured: isFeatured !== undefined ? (isFeatured === 'true' || isFeatured === true) : book.isFeatured,
      slogan: slogan !== undefined ? slogan : book.slogan,
      coverImage,
      images
    };

    if (req.body.supplier !== undefined) {
      updateFields.supplier = (req.body.supplier && req.body.supplier !== '') ? req.body.supplier : null;
    }

    if (req.body.status) {
      updateFields.status = req.body.status;
      if (req.body.status === 'hidden') {
        updateFields.isDeleted = true;
        updateFields.deletedAt = book.deletedAt || new Date();
      } else if (req.body.status === 'active') {
        updateFields.isDeleted = false;
        updateFields.deletedAt = null;
      }
    } else if (req.body.isDeleted !== undefined) {
      const isDel = req.body.isDeleted === true || req.body.isDeleted === 'true';
      updateFields.isDeleted = isDel;
      updateFields.status = isDel ? 'hidden' : 'active';
      updateFields.deletedAt = isDel ? (book.deletedAt || new Date()) : null;
    }

    book = await Book.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    // Đồng bộ trạng thái kệ sau khi cập nhật
    if (targetShelf) {
      await updateShelfStatus(targetShelf._id);
    }
    const newShelfId = targetShelf ? targetShelf._id.toString() : null;
    const oldShelfId = previousShelfDoc ? previousShelfDoc._id.toString() : previousShelfId;

    if (oldShelfId && newShelfId && oldShelfId !== newShelfId) {
      await updateShelfStatus(oldShelfId);
      // Ghi nhật ký: đổi kệ khi sửa sách
      await logShelfActivity({
        action: 'BOOK_UPDATE_SHELF',
        description: `Chuyển sách "${book.title}" (${book.bookCode || ''}) từ kệ ${previousShelfDoc ? previousShelfDoc.shelfCode : oldShelfId} sang kệ ${targetShelf.shelfCode}.`,
        book: { _id: book._id, title: book.title, bookCode: book.bookCode || '', author: book.author, price: book.price },
        fromShelf: previousShelfDoc ? { _id: previousShelfDoc._id, shelfCode: previousShelfDoc.shelfCode, shelfName: previousShelfDoc.shelfName } : null,
        fromShelfCode: previousShelfDoc ? previousShelfDoc.shelfCode : '',
        fromShelfName: previousShelfDoc ? previousShelfDoc.shelfName : '',
        toShelf: { _id: targetShelf._id, shelfCode: targetShelf.shelfCode, shelfName: targetShelf.shelfName },
        toShelfCode: targetShelf.shelfCode,
        toShelfName: targetShelf.shelfName,
        quantity: book.stock || 0,
        performer: req.user,
        details: {
          books: [
            {
              _id: book._id,
              bookCode: book.bookCode || book.isbn || '—',
              title: book.title,
              author: book.author || '—',
              price: book.price || 0,
              quantity: book.stock || 0,
              fromShelfCode: previousShelfDoc ? previousShelfDoc.shelfCode : 'Chưa xếp kệ',
              toShelfCode: targetShelf ? targetShelf.shelfCode : 'Chưa xếp kệ'
            }
          ]
        }
      });
    } else if (!oldShelfId && newShelfId) {
      // Ghi nhật ký: lần đầu xếp sách vào kệ
      await logShelfActivity({
        action: 'BOOK_CREATE',
        description: `Xếp sách "${book.title}" (${book.bookCode || ''}) vào kệ ${targetShelf.shelfCode}.`,
        book: { _id: book._id, title: book.title, bookCode: book.bookCode || '', author: book.author, price: book.price },
        fromShelf: null,
        toShelf: { _id: targetShelf._id, shelfCode: targetShelf.shelfCode, shelfName: targetShelf.shelfName },
        toShelfCode: targetShelf.shelfCode,
        toShelfName: targetShelf.shelfName,
        quantity: book.stock || 0,
        performer: req.user,
        details: {
          books: [
            {
              _id: book._id,
              bookCode: book.bookCode || book.isbn || '—',
              title: book.title,
              author: book.author || '—',
              price: book.price || 0,
              quantity: book.stock || 0,
              fromShelfCode: 'Chưa xếp kệ',
              toShelfCode: targetShelf ? targetShelf.shelfCode : 'Chưa xếp kệ'
            }
          ]
        }
      });
    } else if (oldShelfId && !newShelfId) {
      await updateShelfStatus(oldShelfId);
    }

    const priceChanged = updateFields.price !== undefined && Number(updateFields.price) !== Number(book.price);
    const stockChanged = updateFields.stock !== undefined && Number(updateFields.stock) !== Number(book.stock);

    logActivity(req, {
      module: 'BOOKS',
      action: priceChanged ? 'BOOK_PRICE_UPDATE' : 'BOOK_UPDATE',
      severity: priceChanged ? 'WARNING' : 'INFO',
      targetId: String(book._id),
      targetModel: 'Book',
      targetLabel: `${book.title} (${book.bookCode || ''})`,
      description: priceChanged
        ? `Cập nhật giá bán sách "${book.title}" thành ${Number(updateFields.price).toLocaleString('vi-VN')} đ`
        : `Cập nhật thông tin sách "${book.title}" (${book.bookCode || ''})`,
      diff: [
        ...(priceChanged ? [{ field: 'price', fieldLabel: 'Giá bán', oldValue: book.price, newValue: updateFields.price }] : []),
        ...(stockChanged ? [{ field: 'stock', fieldLabel: 'Tồn kho', oldValue: book.stock, newValue: updateFields.stock }] : [])
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin sách thành công',
      data: book
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật sách'
    });
  }
};

// @desc    Ẩn sách (Soft Delete) - Bảo toàn toàn vẹn dữ liệu đơn hàng, phiếu kho & kế toán
// @route   DELETE /api/books/:id
// @access  Private (Admin, Staff, Stock)
const deleteBook = async (req, res) => {
  try {
    // Nếu là nhân viên kho (stock), kiểm tra xem đã có yêu cầu ẩn sách được Admin phê duyệt hay chưa
    let matchedHideRequest = null;
    if (req.user && req.user.role === 'stock') {
      matchedHideRequest = await BookHideRequest.findOne({
        book: req.params.id,
        status: 'approved',
        executionStatus: { $ne: 'executed' }
      });
      if (!matchedHideRequest) {
        return res.status(403).json({
          success: false,
          message: 'Nhân viên kho không thể tự ý ẩn sách. Vui lòng gửi yêu cầu ẩn sách tới Quản trị viên và chờ Admin phê duyệt!'
        });
      }
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        status: 'hidden',
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sách để ẩn'
      });
    }

    if (matchedHideRequest) {
      matchedHideRequest.executionStatus = 'executed';
      matchedHideRequest.executedAt = new Date();
      matchedHideRequest.executedBy = req.user._id;
      matchedHideRequest.executedByName = req.user.name;
      await matchedHideRequest.save();
    } else {
      // Nếu Admin thực hiện trực tiếp, đồng bộ cập nhật tất cả yêu cầu pending thành executed
      await BookHideRequest.updateMany(
        { book: req.params.id, status: 'pending' },
        {
          status: 'approved',
          executionStatus: 'executed',
          reviewedBy: req.user?._id,
          reviewedByName: req.user?.name || 'Admin',
          reviewedAt: new Date(),
          executedAt: new Date(),
          executedBy: req.user?._id,
          executedByName: req.user?.name || 'Admin',
          adminNote: 'Đã ẩn trực tiếp bởi Quản trị viên'
        }
      );
    }

    if (book.shelf) {
      await updateShelfStatus(book.shelf);
    }

    logActivity(req, {
      module: 'BOOKS',
      action: 'BOOK_DELETE',
      severity: 'WARNING',
      targetId: String(book._id),
      targetModel: 'Book',
      targetLabel: `${book.title} (${book.bookCode || ''})`,
      description: `Ẩn sách khỏi cửa hàng: "${book.title}" (${book.bookCode || ''})`
    });

    res.status(200).json({
      success: true,
      message: 'Đã ẩn sách thành công! Dữ liệu sách và lịch sử đơn hàng vẫn được lưu trữ an toàn.',
      data: book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi ẩn sách'
    });
  }
};

// @desc    Khôi phục / Hiện lại sách đã ẩn (Restore Soft Delete)
// @route   PUT /api/admin/books/:id/restore (hoặc PUT /api/books/:id/restore)
// @access  Private (Admin, Staff, Stock)
const restoreBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: false,
        status: 'active',
        deletedAt: null
      },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sách để khôi phục'
      });
    }

    if (book.shelf) {
      await updateShelfStatus(book.shelf);
    }

    logActivity(req, {
      module: 'BOOKS',
      action: 'BOOK_RESTORE',
      severity: 'INFO',
      targetId: String(book._id),
      targetModel: 'Book',
      targetLabel: `${book.title} (${book.bookCode || ''})`,
      description: `Khôi phục/Mở bán lại sách: "${book.title}" (${book.bookCode || ''})`
    });

    res.status(200).json({
      success: true,
      message: 'Đã khôi phục và mở bán lại sách thành công!',
      data: book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi khôi phục sách'
    });
  }
};

// @desc    Lấy danh sách tất cả các ảnh bìa có sẵn trong public/images/covers
// @route   GET /api/books/covers-gallery
// @access  Private (Admin, Staff) / Public
const getCoversGallery = async (req, res) => {
  try {
    const coversDir = path.join(__dirname, '../public/images/covers');
    if (!fs.existsSync(coversDir)) {
      return res.status(200).json({ success: true, data: [] });
    }

    const files = fs.readdirSync(coversDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f));

    // Sắp xếp thứ tự tự nhiên (book_1.jpg, book_2.jpg, ... book_100.jpg)
    imageFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

    const data = imageFiles.map(f => ({
      filename: f,
      url: `/images/covers/${f}`
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách ảnh bìa'
    });
  }
};

// @desc    Tải file ảnh bìa mới từ máy tính lên public/images/covers
// @route   POST /api/books/upload-cover
// @access  Private (Admin, Staff, Stock)
const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn một tệp hình ảnh từ máy tính'
      });
    }

    const fileUrl = `/images/covers/${req.file.filename}`;

    logActivity(req, {
      module: 'BOOKS',
      action: 'BOOK_COVER_UPLOAD',
      severity: 'INFO',
      description: `Tải ảnh bìa sách mới lên hệ thống: ${req.file.originalname || req.file.filename} (${req.file.size ? (req.file.size / 1024).toFixed(1) + ' KB' : ''})`,
      metadata: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      }
    });

    res.status(200).json({
      success: true,
      message: 'Tải ảnh bìa lên thành công!',
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tải ảnh bìa lên'
    });
  }
};

module.exports = {
  getAllBooks,
  getCategoryStats,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  restoreBook,
  getCoversGallery,
  uploadCoverImage
};

