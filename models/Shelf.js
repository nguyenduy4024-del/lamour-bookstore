const mongoose = require('mongoose');

const shelfSchema = new mongoose.Schema({
  shelfCode: {
    type: String,
    required: [true, 'Vui lòng nhập mã kệ'],
    unique: true,
    uppercase: true,
    trim: true
  }, // VD: KE-A1, KE-A2, KE-B1
  shelfName: {
    type: String,
    required: [true, 'Vui lòng nhập tên kệ'],
    trim: true
  }, // VD: Kệ A1 - Văn học Việt Nam
  zone: {
    type: String,
    enum: ['Khu A', 'Khu B', 'Khu C', 'Khu D', 'Khu Dự Phòng'],
    default: 'Khu A'
  },
  capacity: {
    type: Number,
    required: [true, 'Vui lòng nhập sức chứa tối đa'],
    min: [1, 'Sức chứa phải tối thiểu 1 cuốn'],
    default: 100
  }, // Sức chứa tối đa (cuốn)
  description: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'nearly_full', 'full', 'maintenance'],
    default: 'available'
  }, // available: Còn chỗ (>20%), nearly_full: Sắp đầy (80-99%), full: Đã đầy (100%), maintenance: Đang bảo trì
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.Shelf || mongoose.model('Shelf', shelfSchema);
