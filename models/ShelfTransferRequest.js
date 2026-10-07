const mongoose = require('mongoose');

const shelfTransferItemSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    bookCode: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      default: 0
    },
    fromShelf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf',
      default: null
    },
    fromShelfCode: {
      type: String,
      default: 'Chưa xếp kệ'
    },
    fromShelfName: {
      type: String,
      default: 'Chưa xếp kệ'
    }
  },
  { _id: false }
);

const shelfTransferRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      unique: true,
      index: true
    },
    items: [shelfTransferItemSchema],
    targetShelf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf',
      required: [true, 'Vui lòng chỉ định kệ đích tiếp nhận'],
      index: true
    },
    targetShelfCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    targetShelfName: {
      type: String,
      required: true,
      trim: true
    },
    targetZone: {
      type: String,
      default: 'Khu A'
    },
    targetCapacity: {
      type: Number,
      default: 100
    },
    totalBooksCount: {
      type: Number,
      default: 0
    },
    totalQuantity: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      required: [true, 'Vui lòng chọn hoặc nhập lý do điều chuyển sách'],
      trim: true
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    requestedByName: {
      type: String,
      default: 'Thủ kho',
      trim: true
    },
    requestedByRole: {
      type: String,
      default: 'stock',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedByName: {
      type: String,
      default: '',
      trim: true
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    adminNote: {
      type: String,
      default: '',
      trim: true
    },
    executedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Tự động tạo mã yêu cầu YCDC-YYMMDD-XXXX trước khi lưu
shelfTransferRequestSchema.pre('save', async function () {
  if (!this.requestCode) {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.requestCode = `YCDC-${yy}${mm}${dd}-${random}`;
  }
});

module.exports =
  mongoose.models.ShelfTransferRequest ||
  mongoose.model('ShelfTransferRequest', shelfTransferRequestSchema);
