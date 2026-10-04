const mongoose = require('mongoose');

const shelfCreateRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      unique: true,
      index: true
    },
    shelfCode: {
      type: String,
      required: [true, 'Vui lòng cung cấp mã kệ'],
      uppercase: true,
      trim: true,
      index: true
    },
    shelfName: {
      type: String,
      required: [true, 'Vui lòng cung cấp tên kệ'],
      trim: true
    },
    zone: {
      type: String,
      enum: ['Khu A', 'Khu B', 'Khu C', 'Khu D', 'Khu Dự Phòng'],
      default: 'Khu A'
    },
    capacity: {
      type: Number,
      required: [true, 'Vui lòng cung cấp sức chứa tối đa'],
      min: [1, 'Sức chứa phải tối thiểu 1 cuốn'],
      default: 100
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    reason: {
      type: String,
      required: [true, 'Vui lòng chọn hoặc nhập lý do đề xuất thêm kệ'],
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
      default: 'Nhân viên kho',
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
    createdShelf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Tự động tạo mã yêu cầu YCTK-YYMMDD-XXXX trước khi lưu
shelfCreateRequestSchema.pre('save', async function () {
  if (!this.requestCode) {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.requestCode = `YCTK-${yy}${mm}${dd}-${random}`;
  }
});

module.exports = mongoose.models.ShelfCreateRequest || mongoose.model('ShelfCreateRequest', shelfCreateRequestSchema);
