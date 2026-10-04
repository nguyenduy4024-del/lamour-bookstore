const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Người thực hiện hành động
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    performerName: {
      type: String,
      default: 'Hệ thống',
      trim: true
    },
    performerEmail: {
      type: String,
      default: '',
      trim: true
    },
    performerRole: {
      type: String,
      default: 'system',
      trim: true
    },

    // Phân hệ & Hành động
    module: {
      type: String,
      required: true,
      enum: ['AUTH', 'USERS', 'BOOKS', 'ORDERS', 'INVENTORY', 'ACCOUNTING', 'SETTINGS', 'SYSTEM'],
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },

    // Mức độ quan trọng & Kết quả
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'INFO',
      index: true
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS'
    },

    // Đối tượng bị tác động (Ví dụ: Sách, Hóa đơn, User, v.v.)
    targetId: {
      type: String,
      default: '',
      trim: true
    },
    targetModel: {
      type: String,
      default: '',
      trim: true
    },
    targetLabel: {
      type: String,
      default: '',
      trim: true
    },

    // Chi tiết thay đổi (Diff: Giá trị cũ vs Giá trị mới)
    diff: [
      {
        field: { type: String, default: '' },
        fieldLabel: { type: String, default: '' },
        oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
        newValue: { type: mongoose.Schema.Types.Mixed, default: null }
      }
    ],

    // Môi trường mạng & Thiết bị
    ipAddress: {
      type: String,
      default: '127.0.0.1',
      trim: true
    },
    userAgent: {
      type: String,
      default: '',
      trim: true
    },

    // Dữ liệu mở rộng tùy chọn
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Trạng thái đã xem / đã đọc của Quản trị viên
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    readBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Tối ưu hóa Index cho truy vấn & bộ lọc
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, isRead: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
