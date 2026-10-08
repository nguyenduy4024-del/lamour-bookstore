const mongoose = require('mongoose');

const importReceiptSchema = new mongoose.Schema(
  {
    receiptCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã phiếu nhập'],
      unique: true,
      trim: true,
      index: true
    },
    invoiceNo: {
      type: String,
      default: '',
      trim: true
    },
    invoiceNumber: {
      type: String,
      default: '',
      trim: true
    },
    receiptDate: {
      type: Date,
      default: Date.now
    },
    lien: {
      type: String,
      default: '01 - Lưu',
      trim: true
    },
    warehouseName: {
      type: String,
      default: 'Kho bán hàng trung tâm',
      trim: true
    },
    importWarehouse: {
      type: String,
      default: 'Kho bán hàng trung tâm',
      trim: true
    },
    warehouseAddress: {
      type: String,
      default: '123 Đường Sách, P. Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh',
      trim: true
    },
    reason: {
      type: String,
      default: '',
      trim: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Vui lòng chọn nhà cung cấp'],
      index: true
    },
    supplierAddress: {
      type: String,
      default: '',
      trim: true
    },
    delivererName: {
      type: String,
      default: '',
      trim: true
    },
    deliveryPerson: {
      type: String,
      default: '',
      trim: true
    },
    delivererAddress: {
      type: String,
      default: '',
      trim: true
    },
    receiverStaff: {
      type: String,
      default: '',
      trim: true
    },
    // Người lập phiếu (Thủ kho)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    createdUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    items: [
      {
        book: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Book',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Số lượng nhập phải lớn hơn 0']
        },
        importPrice: {
          type: Number,
          required: true,
          min: [0, 'Giá nhập không thể âm']
        },
        totalPrice: {
          type: Number,
          default: 0
        },
        shelfPosition: {
          type: String,
          default: '',
          trim: true
        },
        unit: {
          type: String,
          default: 'Quyển',
          trim: true
        },
        note: {
          type: String,
          default: '',
          trim: true
        },
        itemNote: {
          type: String,
          default: '',
          trim: true
        }
      }
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    totalQuantity: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Số tiền thanh toán không thể âm']
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid'
    },
    // Luồng phê duyệt 4 trạng thái
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending_approval',
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: {
      type: Date
    },
    signatures: {
      creator: { type: String, default: '' },
      storekeeper: { type: String, default: 'Lê Văn Nam' },
      deliverer: { type: String, default: '' },
      accountant: { type: String, default: 'Phạm Thị Mai' }
    }
  },
  {
    timestamps: true
  }
);

// Indexes tối ưu hóa truy vấn phiếu nhập kho
importReceiptSchema.index({ status: 1, createdAt: -1 });
importReceiptSchema.index({ supplier: 1, createdAt: -1 });
importReceiptSchema.index({ createdAt: -1 });

// Đồng bộ createdBy và createdUser trước khi lưu
importReceiptSchema.pre('save', function (next) {
  if (this.createdBy && !this.createdUser) this.createdUser = this.createdBy;
  if (this.createdUser && !this.createdBy) this.createdBy = this.createdUser;
  if (this.invoiceNo && !this.invoiceNumber) this.invoiceNumber = this.invoiceNo;
  if (this.invoiceNumber && !this.invoiceNo) this.invoiceNo = this.invoiceNumber;
  if (this.delivererName && !this.deliveryPerson) this.deliveryPerson = this.delivererName;
  if (this.deliveryPerson && !this.delivererName) this.delivererName = this.deliveryPerson;
  if (this.warehouseName && !this.importWarehouse) this.importWarehouse = this.warehouseName;
  if (this.importWarehouse && !this.warehouseName) this.warehouseName = this.importWarehouse;

  // Tự động tính tổng số lượng sách và tổng tiền nếu có danh sách mặt hàng
  if (Array.isArray(this.items) && this.items.length > 0) {
    const calcQty = this.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    if (!this.totalQuantity || this.totalQuantity <= 0) {
      this.totalQuantity = calcQty;
    }
    const calcAmount = this.items.reduce((sum, it) => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.importPrice || it.costPrice || it.price) || 0;
      return sum + (it.totalPrice || (q * p));
    }, 0);
    if (!this.totalAmount || this.totalAmount <= 0) {
      this.totalAmount = calcAmount;
    }
  }
  next();
});

// Tự động đồng bộ các mặt hàng nhập vào bảng PurchaseOrderDetails khi phiếu nhập được lưu
importReceiptSchema.post('save', async function (doc) {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    if (Array.isArray(doc.items) && doc.items.length > 0) {
      await db.collection('purchaseorderdetails').deleteMany({ purchaseOrderId: doc._id });
      const details = doc.items.map(item => ({
        _id: item._id || new mongoose.Types.ObjectId(),
        purchaseOrderId: doc._id,
        orderCode: doc.receiptCode,
        productId: item.book || null,
        quantity: item.quantity || 1,
        unitPrice: item.importPrice || item.price || 0,
        totalPrice: (item.quantity || 1) * (item.importPrice || item.price || 0),
        unit: item.unit || 'Quyển',
        note: item.itemNote || '',
        createdAt: doc.receiptDate || doc.createdAt || new Date()
      }));
      await db.collection('purchaseorderdetails').insertMany(details);
    }
  } catch (err) {
    console.error('Lỗi sync purchaseorderdetails từ ImportReceipt:', err.message);
  }
});

module.exports = mongoose.models.ImportReceipt || mongoose.model('ImportReceipt', importReceiptSchema, 'purchaseorders');

