const mongoose = require('mongoose');

const exportReceiptSchema = new mongoose.Schema(
  {
    receiptCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã phiếu xuất'],
      unique: true,
      trim: true,
      index: true
    },
    invoiceNo: {
      type: String,
      default: '',
      trim: true
    },
    exportDate: {
      type: Date,
      default: Date.now
    },
    lien: {
      type: String,
      default: '01 - Lưu',
      trim: true
    },
    warehouseName: {
      type: String,
      default: 'Kho bán hàng trung tâm',
      trim: true
    },
    warehouseAddress: {
      type: String,
      default: '123 Đường Sách, P. Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh',
      trim: true
    },
    reason: {
      type: String,
      default: 'Bán sỉ / Đối tác',
      trim: true
    },
    customerName: {
      type: String,
      default: '',
      trim: true
    },
    customerAddress: {
      type: String,
      default: '',
      trim: true
    },
    receiverName: {
      type: String,
      default: '',
      trim: true
    },
    receiverAddress: {
      type: String,
      default: '',
      trim: true
    },
    staffName: {
      type: String,
      default: '',
      trim: true
    },
    // Người lập phiếu (Thủ kho)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    createdUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Số lượng xuất phải lớn hơn 0']
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Đơn giá xuất không thể âm']
        },
        totalPrice: {
          type: Number,
          default: 0
        },
        shelfPosition: {
          type: String,
          default: '',
          trim: true
        },
        note: {
          type: String,
          default: '',
          trim: true
        },
        itemNote: {
          type: String,
          default: '',
          trim: true
        }
      }
    ],
    totalQuantity: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    // Luồng phê duyệt 4 trạng thái
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending_approval',
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: {
      type: Date
    },
    signatures: {
      creator: { type: String, default: '' },
      storekeeper: { type: String, default: 'Lê Văn Nam' },
      receiver: { type: String, default: '' },
      accountant: { type: String, default: 'Phạm Thị Mai' }
    }
  },
  {
    timestamps: true
  }
);

// Indexes tối ưu hóa truy vấn phiếu xuất kho
exportReceiptSchema.index({ status: 1, createdAt: -1 });
exportReceiptSchema.index({ createdAt: -1 });

// Đồng bộ createdBy và createdUser trước khi lưu
exportReceiptSchema.pre('save', function (next) {
  if (this.createdBy && !this.createdUser) this.createdUser = this.createdBy;
  if (this.createdUser && !this.createdBy) this.createdBy = this.createdUser;
  next();
});

module.exports = mongoose.model('ExportReceipt', exportReceiptSchema);
