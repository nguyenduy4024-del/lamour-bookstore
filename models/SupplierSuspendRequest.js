const mongoose = require('mongoose');

const supplierSuspendRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      unique: true,
      index: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Vui lòng chỉ định nhà cung cấp']
    },
    supplierCode: {
      type: String,
      default: ''
    },
    supplierName: {
      type: String,
      required: [true, 'Tên nhà cung cấp là bắt buộc']
    },
    contactPerson: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    titlesCount: {
      type: Number,
      default: 0
    },
    totalImportAmount: {
      type: Number,
      default: 0
    },
    debt: {
      type: Number,
      default: 0
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người yêu cầu là bắt buộc']
    },
    requestedByName: {
      type: String,
      default: ''
    },
    requestedByRole: {
      type: String,
      default: 'stock'
    },
    reason: {
      type: String,
      required: [true, 'Vui lòng chọn hoặc nhập lý do tạm ngưng']
    },
    note: {
      type: String,
      default: ''
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
      default: ''
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    adminNote: {
      type: String,
      default: ''
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
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Tự động tạo mã yêu cầu YCTN-YYMMDD-XXXX trước khi lưu
supplierSuspendRequestSchema.pre('save', async function () {
  if (!this.requestCode) {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.requestCode = `YCTN-${yy}${mm}${dd}-${random}`;
  }
});

module.exports = mongoose.model('SupplierSuspendRequest', supplierSuspendRequestSchema);
