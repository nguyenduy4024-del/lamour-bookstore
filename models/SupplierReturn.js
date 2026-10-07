const mongoose = require('mongoose');
require('./Transaction');

const supplierReturnItemSchema = new mongoose.Schema({
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
    min: [1, 'Số lượng trả phải lớn hơn 0']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Đơn giá hoàn tiền không thể âm']
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  reason: {
    type: String,
    default: 'Sách lỗi in ấn / thiếu trang',
    trim: true
  },
  note: {
    type: String,
    default: '',
    trim: true
  }
});

const supplierReturnSchema = new mongoose.Schema(
  {
    returnCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã phiếu trả hàng'],
      unique: true,
      trim: true,
      index: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Vui lòng chọn Nhà cung cấp'],
      index: true
    },
    supplierName: {
      type: String,
      default: '',
      trim: true
    },
    supplierCode: {
      type: String,
      default: '',
      trim: true
    },
    supplierAddress: {
      type: String,
      default: '',
      trim: true
    },
    supplierPhone: {
      type: String,
      default: '',
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
    returnDate: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      default: 'Trả hàng sách lỗi / thừa số lượng',
      trim: true
    },
    items: [supplierReturnItemSchema],
    totalQuantity: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    // Quy trình 4 bước chuẩn doanh nghiệp:
    // 1. pending_admin: Kho lập phiếu -> Chờ Admin phê duyệt
    // 2. admin_approved: Admin đã duyệt -> Chuyển về Kho chờ xuất hàng thực tế
    // 3. pending_accountant: Kho đã xuất hàng (OK) -> Tự động sinh Phiếu Thu chờ Kế toán duyệt
    // 4. completed: Kế toán duyệt Phiếu Thu -> Hoàn tất toàn bộ quy trình
    status: {
      type: String,
      enum: ['pending_admin', 'admin_approved', 'pending_accountant', 'completed', 'rejected', 'cancelled', 'pending'],
      default: 'pending_admin',
      index: true
    },
    // Phê duyệt từ Admin
    adminApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    adminApprovedAt: {
      type: Date,
      default: null
    },
    adminRejectReason: {
      type: String,
      default: '',
      trim: true
    },
    // Xuất kho gửi hàng cho NCC từ Thủ kho
    warehouseDispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    warehouseDispatchedAt: {
      type: Date,
      default: null
    },
    warehouseDispatchNote: {
      type: String,
      default: '',
      trim: true
    },
    // Phê duyệt tiền từ Kế toán
    accountantApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    accountantApprovedAt: {
      type: Date,
      default: null
    },
    accountantRejectReason: {
      type: String,
      default: '',
      trim: true
    },
    // Trạng thái hoàn tiền từ Nhà cung cấp cho Kế toán
    refundStatus: {
      type: String,
      enum: ['received', 'pending', 'deducted_debt'],
      default: 'pending'
    },
    // Giao dịch kế toán phiếu thu tương ứng
    refundTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    refundTransactionCode: {
      type: String,
      default: ''
    },
    // Nếu phiếu trả xuất phát từ đơn hàng hoàn của khách
    sourceInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    sourceInvoiceCode: {
      type: String,
      default: ''
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    staffName: {
      type: String,
      default: '',
      trim: true
    },
    signatures: {
      creator: { type: String, default: '' },
      storekeeper: { type: String, default: 'Lê Văn Nam' },
      supplierRep: { type: String, default: '' },
      accountant: { type: String, default: 'Phạm Thị Mai' }
    }
  },
  {
    timestamps: true
  }
);

// Tự động tính lại tổng số lượng và tổng tiền trước khi lưu
supplierReturnSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.totalQuantity = this.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    this.totalAmount = this.items.reduce((sum, it) => {
      const itemTotal = Number(it.totalPrice) || ((Number(it.quantity) || 0) * (Number(it.price) || 0));
      it.totalPrice = itemTotal;
      return sum + itemTotal;
    }, 0);
  }
  next();
});

module.exports = mongoose.model('SupplierReturn', supplierReturnSchema);
