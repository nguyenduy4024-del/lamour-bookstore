const mongoose = require('mongoose');

const shelfMaintenanceRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      unique: true,
      index: true
    },
    shelf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf',
      required: [true, 'Vui lòng chỉ định kệ sách cần bảo trì'],
      index: true
    },
    shelfCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    shelfName: {
      type: String,
      required: true,
      trim: true
    },
    zone: {
      type: String,
      enum: ['Khu A', 'Khu B', 'Khu C', 'Khu D', 'Khu Dự Phòng'],
      default: 'Khu A'
    },
    capacity: {
      type: Number,
      default: 100
    },
    currentUnits: {
      type: Number,
      default: 0
    },
    booksCount: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      required: [true, 'Vui lòng chọn hoặc nhập lý do bảo trì kệ'],
      trim: true
    },
    expectedDuration: {
      type: String,
      default: '1 - 2 ngày',
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
    },
    movedToBackupUnits: {
      type: Number,
      default: 0
    },
    movedBookIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
      }
    ]
  },
  {
    timestamps: true
  }
);

// Tự động tạo mã yêu cầu YCBT-YYMMDD-XXXX trước khi lưu
shelfMaintenanceRequestSchema.pre('save', async function () {
  if (!this.requestCode) {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.requestCode = `YCBT-${yy}${mm}${dd}-${random}`;
  }
});

module.exports =
  mongoose.models.ShelfMaintenanceRequest ||
  mongoose.model('ShelfMaintenanceRequest', shelfMaintenanceRequestSchema);
