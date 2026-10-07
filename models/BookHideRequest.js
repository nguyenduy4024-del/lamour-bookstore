const mongoose = require('mongoose');

const bookHideRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      required: [true, 'Vui lòng cung cấp mã yêu cầu'],
      unique: true,
      trim: true,
      index: true
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Vui lòng chọn sách cần yêu cầu ẩn'],
      index: true
    },
    bookCode: {
      type: String,
      default: '',
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      default: '',
      trim: true
    },
    coverImage: {
      type: String,
      default: ''
    },
    stock: {
      type: Number,
      default: 0
    },
    hideType: {
      type: String,
      enum: ['partial', 'all'],
      default: 'partial',
      index: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    remainingStock: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      default: 0
    },
    shelfLocation: {
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
      default: 'Nhân viên kho',
      trim: true
    },
    requestedByRole: {
      type: String,
      default: 'stock',
      trim: true
    },
    reason: {
      type: String,
      required: [true, 'Vui lòng nhập lý do yêu cầu ẩn sách'],
      trim: true
    },
    note: {
      type: String,
      default: '',
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
    executionStatus: {
      type: String,
      enum: ['pending_execution', 'executed'],
      default: 'pending_execution'
    },
    executedAt: {
      type: Date,
      default: null
    },
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    executedByName: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.BookHideRequest || mongoose.model('BookHideRequest', bookHideRequestSchema);
