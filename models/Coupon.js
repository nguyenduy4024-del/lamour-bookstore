const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Vui lòng nhập mã giảm giá'],
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên chương trình ưu đãi'],
      trim: true
    },
    discountType: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent'
    },
    discountValue: {
      type: Number,
      required: [true, 'Vui lòng nhập giá trị giảm'],
      min: [0, 'Giá trị giảm không được âm']
    },
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Mức giảm tối đa không được âm']
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Đơn tối thiểu không được âm']
    },
    usageLimit: {
      type: Number,
      default: 100,
      min: [1, 'Giới hạn sử dụng tối thiểu là 1 lượt']
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Số lượt sử dụng không thể âm']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: [true, 'Vui lòng chọn ngày kết thúc']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Phương thức kiểm tra tính hợp lệ của mã cho đơn hàng
couponSchema.methods.checkValidity = function (orderTotal) {
  const now = new Date();

  if (!this.isActive) {
    return { valid: false, message: 'Mã giảm giá hiện đang tạm khóa hoặc đã ngừng hoạt động.' };
  }

  if (this.startDate && new Date(this.startDate) > now) {
    return { valid: false, message: 'Mã giảm giá chưa đến thời gian áp dụng.' };
  }

  if (this.endDate && new Date(this.endDate) < now) {
    return { valid: false, message: 'Mã giảm giá đã hết hạn sử dụng.' };
  }

  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng khả dụng.' };
  }

  const subtotal = Number(orderTotal) || 0;
  if (this.minOrderValue && subtotal < this.minOrderValue) {
    return {
      valid: false,
      message: `Đơn hàng chưa đạt giá trị tối thiểu ${this.minOrderValue.toLocaleString('vi-VN')}₫ để áp dụng mã này.`
    };
  }

  // Tính số tiền giảm
  let discountAmount = 0;
  if (this.discountType === 'percent') {
    discountAmount = Math.round((subtotal * this.discountValue) / 100);
    if (this.maxDiscountAmount && this.maxDiscountAmount > 0 && discountAmount > this.maxDiscountAmount) {
      discountAmount = this.maxDiscountAmount;
    }
  } else {
    discountAmount = this.discountValue;
  }

  // Không giảm vượt quá tổng tiền đơn
  if (discountAmount > subtotal) {
    discountAmount = subtotal;
  }

  return {
    valid: true,
    discountAmount,
    finalAmount: Math.max(0, subtotal - discountAmount),
    message: 'Áp dụng mã giảm giá thành công!'
  };
};

module.exports = mongoose.model('Coupon', couponSchema);
