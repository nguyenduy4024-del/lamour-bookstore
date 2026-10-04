const ShelfActivityLog = require('../models/ShelfActivityLog');

const ACTION_LABELS = {
  BOOK_CREATE: 'Thêm sách vào kệ',
  BOOK_UPDATE_SHELF: 'Chuyển kệ (sửa sách)',
  SHELF_TRANSFER: 'Điều chuyển sách',
  SHELF_MAINTENANCE_START: 'Bảo trì kệ sách',
  SHELF_MAINTENANCE_END: 'Mở lại kệ sách',
  SHELF_CREATE: 'Tạo kệ mới',
  SHELF_UPDATE: 'Cập nhật thông tin kệ',
  STOCK_IMPORT: 'Nhập sách vào kệ'
};

/**
 * Ghi nhận nhật ký hoạt động kệ sách & luân chuyển sách
 * @param {Object} opts
 * @param {string} opts.action          - Mã hành động (ACTION_LABELS keys)
 * @param {string} [opts.description]   - Mô tả chi tiết hoạt động
 * @param {Object} [opts.book]          - { _id, title, bookCode } (nếu liên quan đến sách)
 * @param {Object} [opts.fromShelf]     - { _id, shelfCode, shelfName } (kệ nguồn)
 * @param {Object} [opts.toShelf]       - { _id, shelfCode, shelfName } (kệ đích)
 * @param {number} [opts.quantity]      - Số lượng sách liên quan
 * @param {Object} [opts.performer]     - { _id, fullName, username, role } (người thực hiện)
 * @param {Object} [opts.details]       - Thông tin bổ sung tùy chỉnh
 */
const logShelfActivity = async (opts) => {
  try {
    const {
      action,
      description = '',
      book = null,
      fromShelf = null,
      toShelf = null,
      quantity = 0,
      performer = opts.performer || opts.user || null,
      details = {}
    } = opts;

    const bookObj = (book && typeof book === 'object') ? book : {};
    const bookTitle = opts.bookTitle || bookObj.title || '';
    const bookCode = opts.bookCode || bookObj.bookCode || bookObj.isbn || '';
    const bookId = bookObj._id || (book && typeof book !== 'object' ? book : null) || opts.bookId || null;

    const fromObj = (fromShelf && typeof fromShelf === 'object') ? fromShelf : {};
    const fromShelfCode = opts.fromShelfCode || fromObj.shelfCode || '';
    const fromShelfName = opts.fromShelfName || fromObj.shelfName || '';
    const fromShelfId = fromObj._id || (fromShelf && typeof fromShelf !== 'object' ? fromShelf : null) || opts.fromShelfId || null;

    const toObj = (toShelf && typeof toShelf === 'object') ? toShelf : {};
    const toShelfCode = opts.toShelfCode || toObj.shelfCode || '';
    const toShelfName = opts.toShelfName || toObj.shelfName || '';
    const toShelfId = toObj._id || (toShelf && typeof toShelf !== 'object' ? toShelf : null) || opts.toShelfId || null;

    const perfObj = (performer && typeof performer === 'object') ? performer : {};
    const performerName = opts.performerName || perfObj.fullName || perfObj.username || perfObj.name || 'Hệ thống';
    const performerRole = opts.performerRole || perfObj.role || '';
    const performedById = perfObj._id || (performer && typeof performer !== 'object' ? performer : null) || opts.performedBy || null;

    await ShelfActivityLog.create({
      action,
      actionLabel: ACTION_LABELS[action] || action,
      description,
      book: bookId,
      bookTitle,
      bookCode,
      fromShelf: fromShelfId,
      fromShelfCode,
      fromShelfName,
      toShelf: toShelfId,
      toShelfCode,
      toShelfName,
      quantity: Number(quantity) || 0,
      performedBy: performedById,
      performerName,
      performerRole,
      details
    });
  } catch (err) {
    // Không để lỗi ghi log làm gián đoạn luồng nghiệp vụ chính
    console.warn('[ShelfActivityLogger] Lỗi ghi nhật ký hoạt động:', err.message);
  }
};

module.exports = { logShelfActivity, ACTION_LABELS };
