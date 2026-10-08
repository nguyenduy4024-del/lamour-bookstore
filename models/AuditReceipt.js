const mongoose = require('mongoose');

const auditReceiptSchema = new mongoose.Schema(
  {
    auditCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã phiếu kiểm kê'],
      unique: true,
      trim: true
    },
    auditDate: {
      type: Date,
      default: Date.now
    },
    auditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    auditorStaff: {
      type: String,
      default: '',
      trim: true
    },
    warehouseName: {
      type: String,
      default: 'Kho bán hàng',
      trim: true
    },
    shelfArea: {
      type: String,
      default: 'Toàn kho',
      trim: true
    },
    items: [
      {
        book: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Book',
          required: true
        },
        bookCode: {
          type: String,
          default: '',
          trim: true
        },
        title: {
          type: String,
          default: '',
          trim: true
        },
        unit: {
          type: String,
          default: 'Quyển',
          trim: true
        },
        systemStock: {
          type: Number,
          required: true
        },
        actualStock: {
          type: Number,
          required: true
        },
        damagedStock: {
          type: Number,
          default: 0
        },
        difference: {
          type: Number,
          required: true
        },
        discrepancy: {
          type: Number,
          default: 0
        },
        itemStatus: {
          type: String,
          enum: ['matched', 'surplus', 'deficit', 'damaged'],
          default: 'matched'
        },
        reason: {
          type: String,
          default: '',
          trim: true
        },
        resolutionPlan: {
          type: String,
          default: '',
          trim: true
        },
        note: {
          type: String,
          default: '',
          trim: true
        }
      }
    ],
    totalSystemStock: {
      type: Number,
      default: 0
    },
    totalActualStock: {
      type: Number,
      default: 0
    },
    totalDamaged: {
      type: Number,
      default: 0
    },
    totalDifference: {
      type: Number,
      default: 0
    },
    totalDiscrepancy: {
      type: Number,
      default: 0
    },
    hasDiscrepancy: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['in_progress', 'pending_approval', 'approved', 'rejected', 'completed'],
      default: 'in_progress'
    },
    adminReview: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: {
        type: Date
      },
      adminNote: {
        type: String,
        default: '',
        trim: true
      },
      decision: {
        type: String,
        enum: ['approved_adjust', 're_audit', ''],
        default: ''
      }
    },
    conclusion: {
      type: String,
      default: '',
      trim: true
    },
    signatures: {
      auditor: { type: String, default: '' },
      storekeeper: { type: String, default: 'Lê Văn Nam' },
      accountant: { type: String, default: 'Phạm Thị Mai' },
      manager: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Indexes tối ưu hóa truy vấn biên bản kiểm kê kho
auditReceiptSchema.index({ status: 1, createdAt: -1 });
auditReceiptSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditReceipt', auditReceiptSchema);
