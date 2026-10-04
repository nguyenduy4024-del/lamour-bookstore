const mongoose = require('mongoose');

const shelfActivityLogSchema = new mongoose.Schema(
  {
    // Loại hành động
    action: {
      type: String,
      required: true,
      enum: [
        'BOOK_CREATE',           // Thêm sách mới vào kệ
        'BOOK_UPDATE_SHELF',     // Đổi kệ khi sửa sách
        'SHELF_TRANSFER',        // Điều chuyển sách giữa các kệ
        'SHELF_MAINTENANCE_START', // Đưa kệ vào bảo trì (chuyển sách sang KE-DP)
        'SHELF_MAINTENANCE_END', // Mở lại kệ sau bảo trì
        'SHELF_CREATE',          // Tạo kệ sách mới
        'SHELF_UPDATE',          // Cập nhật thông tin kệ
        'STOCK_IMPORT'           // Nhập sách vào kệ từ phiếu nhập hàng
      ]
    },
    // Tên tiếng Việt hiển thị
    actionLabel: {
      type: String,
      default: ''
    },
    // Mô tả chi tiết
    description: {
      type: String,
      default: ''
    },
    // Sách liên quan (nếu có)
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null
    },
    bookTitle: {
      type: String,
      default: ''
    },
    bookCode: {
      type: String,
      default: ''
    },
    // Kệ nguồn (kệ sách cũ / kệ bị bảo trì)
    fromShelf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf',
      default: null
    },
    fromShelfCode: {
      type: String,
      default: ''
    },
    fromShelfName: {
      type: String,
      default: ''
    },
    // Kệ đích (kệ nhận sách / kệ dự phòng)
    toShelf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf',
      default: null
    },
    toShelfCode: {
      type: String,
      default: ''
    },
    toShelfName: {
      type: String,
      default: ''
    },
    // Số lượng sách liên quan
    quantity: {
      type: Number,
      default: 0
    },
    // Người thực hiện
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    performerName: {
      type: String,
      default: 'Hệ thống'
    },
    performerRole: {
      type: String,
      default: ''
    },
    // Dữ liệu bổ sung (linh hoạt)
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Index cho tìm kiếm nhanh theo thời gian và action
shelfActivityLogSchema.index({ createdAt: -1 });
shelfActivityLogSchema.index({ action: 1, createdAt: -1 });
shelfActivityLogSchema.index({ fromShelf: 1, createdAt: -1 });
shelfActivityLogSchema.index({ toShelf: 1, createdAt: -1 });

module.exports = mongoose.models.ShelfActivityLog || mongoose.model('ShelfActivityLog', shelfActivityLogSchema);
