const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Vui lòng nhập mã nhà cung cấp'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên nhà cung cấp'],
      trim: true
    },
    contactPerson: {
      type: String,
      default: '',
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại nhà cung cấp'],
      trim: true,
      match: [
        /^0[0-9]{8,10}$/,
        'Số điện thoại phải bắt đầu bằng số 0 và có từ 9 đến 11 chữ số'
      ]
    },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email nhà cung cấp'],
      trim: true,
      match: [
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Vui lòng nhập đúng định dạng email (vd: contact@domain.com)'
      ]
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    categories: {
      type: [String],
      default: []
    },
    bankAccount: {
      bankName: { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      accountHolder: { type: String, default: '', trim: true }
    },
    debt: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Supplier', supplierSchema);
