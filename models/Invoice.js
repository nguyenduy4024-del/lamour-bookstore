const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã hóa đơn'],
      unique: true,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    customerName: {
      type: String,
      default: 'Khách lẻ',
      trim: true
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true
    },
    customerAddress: {
      type: String,
      default: '',
      trim: true
    },
    customerEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: {
      type: Date,
      default: null
    },
    orderType: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer', 'pos', 'card', 'momo'],
      default: 'cash'
    },
    totalAmount: {
      type: Number,
      required: [true, 'Vui lòng nhập tổng tiền hàng'],
      min: [0, 'Tổng tiền không thể âm']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Giảm giá không thể âm']
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null
    },
    couponCode: {
      type: String,
      default: '',
      trim: true
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Tiền giảm từ voucher không thể âm']
    },
    finalAmount: {
      type: Number,
      required: [true, 'Vui lòng nhập số tiền phải thanh toán'],
      min: [0, 'Số tiền thanh toán không thể âm']
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
          min: [1, 'Số lượng mua tối thiểu là 1']
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Giá không thể âm']
        },
        costPrice: {
          type: Number,
          default: 0,
          min: [0, 'Giá vốn không thể âm']
        }
      }
    ],
    status: {
      type: String,
      enum: [
        'pending_confirmation', // Chờ xác nhận (khách đã thanh toán QR / đặt đơn)
        'pending_payment',      // Chờ xác nhận / Chờ duyệt thanh toán
        'delivering',           // Đang chuẩn bị hàng
        'processing',           // Đang chuẩn bị hàng (tương thích)
        'shipping',             // Đang giao hàng
        'completed',            // Hoàn thành
        'cancelled',            // Đã hủy
        'returned'              // Trả hàng / Hoàn tiền
      ],
      default: 'pending_confirmation'
    },
    isPaidByCustomer: {
      type: Boolean,
      default: false
    },
    paymentNote: {
      type: String,
      default: ''
    },
    paymentProof: {
      type: String,
      default: ''
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending_verification', 'paid'],
      default: 'unpaid'
    },
    momoTransaction: {
      type: {
        partnerCode: { type: String, default: '' },
        orderId: { type: String, default: '' },
        requestId: { type: String, default: '' },
        amount: { type: Number, default: 0 },
        transId: { type: String, default: '' },
        resultCode: { type: Number, default: -1 },
        message: { type: String, default: '' },
        payType: { type: String, default: '' },
        responseTime: { type: Number, default: 0 },
        orderInfo: { type: String, default: '' },
        payUrl: { type: String, default: '' },
        qrCodeUrl: { type: String, default: '' },
        deeplink: { type: String, default: '' },
        signature: { type: String, default: '' },
        paidAt: { type: Date, default: null },
        autoVerified: { type: Boolean, default: false }
      },
      default: null
    },
    returnReason: {
      type: String,
      default: ''
    },
    returnRefundInfo: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolder: { type: String, default: '' }
    },
    returnRequestedAt: {
      type: Date
    },
    returnRequest: {
      type: {
        reason: {
          type: String,
          default: ''
        },
        refundMethod: {
          type: String,
          enum: ['cash', 'transfer'],
          default: 'transfer'
        },
        bankInfo: {
          bankName: { type: String, default: '' },
          accountNumber: { type: String, default: '' },
          accountHolder: { type: String, default: '' }
        },
        requestedAt: {
          type: Date
        },
        receivedAt: {
          type: Date
        },
        inspectedAt: {
          type: Date
        },
        inspectionNote: {
          type: String,
          default: ''
        },
        status: {
          type: String,
          enum: [
            'requested',
            'shipping_back',
            'approved_transferred_to_warehouse',
            'warehouse_restocked',
            'warehouse_returned_supplier',
            'warehouse_discarded',
            'inspected_ok',
            'rejected'
          ],
          default: 'requested'
        },
        transferredToWarehouseAt: {
          type: Date
        },
        warehouseProcessedAt: {
          type: Date
        },
        warehouseAction: {
          type: String,
          enum: ['restock', 'return_supplier', 'discard', ''],
          default: ''
        },
        warehouseNote: {
          type: String,
          default: ''
        },
        warehouseProcessedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        supplierReturnCode: {
          type: String,
          default: ''
        }
      },
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes tối ưu hóa truy vấn trên 8.600+ hóa đơn
invoiceSchema.index({ status: 1, createdAt: -1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ customerPhone: 1, createdAt: -1 });
invoiceSchema.index({ 'returnRequest.status': 1, createdAt: -1 });
invoiceSchema.index({ paymentStatus: 1, createdAt: -1 });
invoiceSchema.index({ orderType: 1, createdAt: -1 });

// Ràng buộc nghiệp vụ:
// 1. Khi đơn hàng ở trạng thái 'completed' hoặc 'paid', bắt buộc paymentStatus phải là 'paid'
// 2. Nếu paymentStatus chưa thanh toán ('unpaid', 'pending_verification'), trạng thái đơn không thể hoàn thành
invoiceSchema.pre('save', function (next) {
  if (!this.orderType) {
    if (this.invoiceCode && this.invoiceCode.startsWith('HD-OL')) {
      this.orderType = 'online';
    } else {
      this.orderType = 'offline';
    }
  }
  if (['completed', 'paid'].includes(this.status)) {
    this.paymentStatus = 'paid';
  } else if (this.paymentStatus === 'unpaid' && ['completed', 'paid'].includes(this.status)) {
    this.paymentStatus = 'paid';
  }
  next();
});

// Tự động đồng bộ các dòng sản phẩm vào bảng SalesInvoiceDetails khi hóa đơn được lưu
invoiceSchema.post('save', async function (doc) {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    if (Array.isArray(doc.items) && doc.items.length > 0) {
      await db.collection('salesinvoicedetails').deleteMany({ salesInvoiceId: doc._id });
      const details = doc.items.map(item => ({
        _id: item._id || new mongoose.Types.ObjectId(),
        salesInvoiceId: doc._id,
        invoiceCode: doc.invoiceCode,
        productId: item.book || null,
        quantity: item.quantity || 1,
        unitPrice: item.price || 0,
        costPrice: item.costPrice || 0,
        discount: item.discount || 0,
        totalPrice: (item.quantity || 1) * (item.price || 0),
        createdAt: doc.createdAt || new Date()
      }));
      await db.collection('salesinvoicedetails').insertMany(details);
    }
  } catch (err) {
    console.error('Lỗi sync salesinvoicedetails từ Invoice:', err.message);
  }
});

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema, 'salesinvoices');


