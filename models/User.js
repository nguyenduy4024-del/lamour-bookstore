const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Vui lòng nhập đúng định dạng email (vd: nguyenvana@gmail.com)'
      ]
    },
    phone: {
      type: String,
      required: true,
      match: [
        /^0[0-9]{8,9}$/,
        'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
      ]
    },
    password: {
      type: String,
      required: true,
      minlength: [6, 'Mật khẩu tối thiểu 6 ký tự']
    },
    role: {
      type: String,
      enum: ['user', 'staff', 'admin', 'stock', 'accountant'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active'
    },
    avatar: {
      type: String,
      default: '/images/default-avatar.png'
    },
    gender: {
      type: String,
      enum: ['Nam', 'Nữ', 'Khác'],
      default: 'Nam'
    },
    birthday: {
      type: String,
      default: ''
    },
    identityCard: {
      fullName: { type: String, default: '', trim: true },
      idNumber: { type: String, default: '', trim: true },
      permanentAddress: { type: String, default: '', trim: true }
    },
    addresses: [
      {
        fullName: { type: String, required: true, trim: true },
        phone: {
          type: String,
          required: true,
          trim: true,
          match: [
            /^0[0-9]{8,9}$/,
            'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
          ]
        },
        province: { type: String, default: '', trim: true },
        district: { type: String, default: '', trim: true },
        ward: { type: String, default: '', trim: true },
        detailAddress: { type: String, required: true, trim: true },
        isDefault: { type: Boolean, default: false }
      }
    ],
    bankAccounts: [
      {
        bankName: { type: String, required: true, trim: true },
        accountNumber: { type: String, required: true, trim: true },
        accountHolder: { type: String, required: true, trim: true },
        branch: { type: String, default: '', trim: true },
        isDefault: { type: Boolean, default: false },
        status: { type: String, default: 'Đã duyệt' }
      }
    ],
    // Hồ sơ nhân sự / Nhân viên
    employeeCode: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: String,
      enum: ['Bán hàng', 'Kho', 'Kế toán', 'Quản lý', 'Hành chính'],
      default: 'Bán hàng'
    },
    shift: {
      type: String,
      default: 'Ca sáng (08:00 - 16:00)'
    },
    startDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes tối ưu hóa tìm kiếm tài khoản & khách hàng
userSchema.index({ role: 1, status: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Tự động đồng bộ sang Customers (nếu là khách) hoặc Employees (nếu là nhân viên)
userSchema.post('save', async function (doc) {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    if (doc.role === 'user') {
      await db.collection('customers').updateOne(
        { userId: doc._id },
        {
          $set: {
            userId: doc._id,
            name: doc.name,
            email: doc.email,
            phone: doc.phone,
            gender: doc.gender || 'Khác',
            address: doc.address || 'TP. Hồ Chí Minh',
            isActive: doc.isActive !== false,
            updatedAt: new Date()
          },
          $setOnInsert: {
            customerCode: `KH-${doc.phone ? doc.phone.slice(-4) : '0000'}`,
            totalSpent: 0,
            orderCount: 0,
            loyaltyPoints: 0,
            customerType: 'Tiêu chuẩn',
            createdAt: doc.createdAt || new Date()
          }
        },
        { upsert: true }
      );
    } else {
      let position = 'Nhân viên bán hàng';
      let department = 'Kinh doanh & Bán lẻ';
      let baseSalary = 8000000;
      if (doc.role === 'admin') {
        position = 'Quản trị viên / Giám đốc';
        department = 'Ban Điều Hành';
        baseSalary = 25000000;
      } else if (doc.role === 'stock') {
        position = 'Thủ kho';
        department = 'Kho vận & Tiếp vận';
        baseSalary = 9000000;
      } else if (doc.role === 'accountant') {
        position = 'Kế toán viên';
        department = 'Tài chính - Kế toán';
        baseSalary = 12000000;
      }

      await db.collection('employees').updateOne(
        { userId: doc._id },
        {
          $set: {
            userId: doc._id,
            name: doc.name,
            email: doc.email,
            phone: doc.phone,
            gender: doc.gender || 'Nam',
            department: doc.department || department,
            position: position,
            roleCode: (doc.role || 'staff').toUpperCase(),
            baseSalary: baseSalary,
            status: doc.status || 'active',
            updatedAt: new Date()
          },
          $setOnInsert: {
            employeeCode: `NV-${doc.phone ? doc.phone.slice(-3) : '000'}`,
            hireDate: doc.createdAt || new Date(),
            createdAt: doc.createdAt || new Date()
          }
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('Lỗi sync customer/employee từ User:', err.message);
  }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);