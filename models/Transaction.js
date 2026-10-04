const mongoose = require('mongoose');

// Schema giao dịch chuẩn
const transactionSchema = new mongoose.Schema(
  {
    transactionCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã giao dịch'],
      unique: true,
      trim: true,
      index: true
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'thu', 'chi'],
      required: [true, 'Vui lòng chọn loại giao dịch (income/expense hoặc thu/chi)'],
      index: true
    },
    category: {
      type: String,
      default: 'Khác',
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Vui lòng nhập số tiền giao dịch'],
      min: [0, 'Số tiền giao dịch không thể âm']
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    recipient: {
      type: String,
      default: 'Khách hàng / Đối tác',
      trim: true
    },
    personName: {
      type: String,
      default: 'Khách hàng / Đối tác',
      trim: true
    },
    payerName: {
      type: String,
      default: ''
    },
    payeeName: {
      type: String,
      default: ''
    },
    receiptCode: {
      type: String,
      default: ''
    },
    paymentCode: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    payerAddress: {
      type: String,
      default: ''
    },
    payeeAddress: {
      type: String,
      default: ''
    },
    paymentMethod: {
      type: String,
      default: 'cash',
      trim: true
    },
    attached: {
      type: String,
      default: '',
      trim: true
    },
    attachedImage: {
      type: String,
      default: '',
      trim: true
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    accountantName: {
      type: String,
      default: '',
      trim: true
    },
    cashierName: {
      type: String,
      default: '',
      trim: true
    },
    signatureMode: {
      type: String,
      enum: ['blank', 'sign'],
      default: 'blank'
    },
    referenceOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
      index: true
    },
    referenceReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportReceipt',
      default: null,
      index: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Đồng bộ tên người nộp/nhận và mã phiếu trước khi lưu
transactionSchema.pre('save', function (next) {
  if (this.recipient && (!this.personName || this.personName === 'Khách hàng / Đối tác')) {
    this.personName = this.recipient;
  } else if (this.personName && (!this.recipient || this.recipient === 'Khách hàng / Đối tác')) {
    this.recipient = this.personName;
  }
  if (['income', 'thu'].includes(this.type)) {
    if (!this.receiptCode) this.receiptCode = this.transactionCode;
    if (!this.payerName) this.payerName = this.personName;
  } else {
    if (!this.paymentCode) this.paymentCode = this.transactionCode;
    if (!this.payeeName) this.payeeName = this.recipient;
  }
  next();
});

// Hàm ảo (virtual) chuẩn hóa type
transactionSchema.virtual('isIncome').get(function () {
  return ['income', 'thu'].includes(this.type);
});

transactionSchema.virtual('normalizedType').get(function () {
  return ['income', 'thu'].includes(this.type) ? 'income' : 'expense';
});

transactionSchema.virtual('typeDisplay').get(function () {
  return ['income', 'thu'].includes(this.type) ? 'Phiếu Thu' : 'Phiếu Chi';
});

transactionSchema.virtual('statusDisplay').get(function () {
  if (this.status === 'pending') return 'Chờ duyệt';
  if (this.status === 'rejected') return 'Từ chối';
  return 'Đã duyệt';
});

// Model cho 2 collection chuẩn theo đề bài: receipts và payments
const ReceiptModel = mongoose.models.Receipt || mongoose.model('Receipt', transactionSchema, 'receipts');
const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', transactionSchema, 'payments');

// Lớp hỗ trợ truy vấn chuỗi (Chainable Query) cho Transaction
class UnifiedTransactionQuery {
  constructor(query = {}) {
    this._query = { ...query };
    this._populates = [];
    this._sort = { createdAt: -1, _id: -1 };
    this._limit = null;
    this._skip = null;
    this._isLean = false;
  }

  populate(...args) {
    this._populates.push(args);
    return this;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  skip(n) {
    this._skip = n;
    return this;
  }

  lean() {
    this._isLean = true;
    return this;
  }

  async exec() {
    const q = this._query || {};
    let searchReceipts = true;
    let searchPayments = true;

    if (q.type) {
      if (['income', 'thu'].includes(q.type)) {
        searchPayments = false;
      } else if (['expense', 'chi'].includes(q.type)) {
        searchReceipts = false;
      }
    }

    const promises = [];
    if (searchReceipts) {
      let rq = ReceiptModel.find(q);
      for (const p of this._populates) rq = rq.populate(...p);
      if (this._sort) rq = rq.sort(this._sort);
      if (this._isLean) rq = rq.lean();
      promises.push(rq.exec());
    } else {
      promises.push(Promise.resolve([]));
    }

    if (searchPayments) {
      let pq = PaymentModel.find(q);
      for (const p of this._populates) pq = pq.populate(...p);
      if (this._sort) pq = pq.sort(this._sort);
      if (this._isLean) pq = pq.lean();
      promises.push(pq.exec());
    } else {
      promises.push(Promise.resolve([]));
    }

    const [recs, pays] = await Promise.all(promises);
    let all = [...recs, ...pays];

    all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (this._skip) all = all.slice(this._skip);
    if (this._limit) all = all.slice(0, this._limit);

    return all;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

// Module Transaction tương thích hoàn toàn nhưng lưu trữ thực tế trên receipts & payments
const Transaction = {
  schema: transactionSchema,
  Receipt: ReceiptModel,
  Payment: PaymentModel,

  find(query) {
    return new UnifiedTransactionQuery(query);
  },

  findOne(query) {
    const q = query || {};
    if (q.type && ['expense', 'chi'].includes(q.type)) {
      return PaymentModel.findOne(q);
    }
    if (q.type && ['income', 'thu'].includes(q.type)) {
      return ReceiptModel.findOne(q);
    }
    return {
      _populates: [],
      _isLean: false,
      populate(...args) { this._populates.push(args); return this; },
      lean() { this._isLean = true; return this; },
      async exec() {
        let rq = ReceiptModel.findOne(q);
        for (const p of this._populates) rq = rq.populate(...p);
        if (this._isLean) rq = rq.lean();
        const r = await rq.exec();
        if (r) return r;

        let pq = PaymentModel.findOne(q);
        for (const p of this._populates) pq = pq.populate(...p);
        if (this._isLean) pq = pq.lean();
        return await pq.exec();
      },
      then(res, rej) { return this.exec().then(res, rej); },
      catch(rej) { return this.exec().catch(rej); }
    };
  },

  findById(id) {
    return this.findOne({ _id: id });
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    const inReceipt = await ReceiptModel.findById(id);
    if (inReceipt) {
      return await ReceiptModel.findByIdAndUpdate(id, update, options);
    }
    return await PaymentModel.findByIdAndUpdate(id, update, options);
  },

  async findByIdAndDelete(id) {
    const inReceipt = await ReceiptModel.findById(id);
    if (inReceipt) {
      return await ReceiptModel.findByIdAndDelete(id);
    }
    return await PaymentModel.findByIdAndDelete(id);
  },

  async deleteOne(query) {
    const rRes = await ReceiptModel.deleteOne(query);
    if (rRes.deletedCount > 0) return rRes;
    return await PaymentModel.deleteOne(query);
  },

  async deleteMany(query = {}) {
    const [r1, r2] = await Promise.all([
      ReceiptModel.deleteMany(query),
      PaymentModel.deleteMany(query)
    ]);
    return { deletedCount: (r1.deletedCount || 0) + (r2.deletedCount || 0) };
  },

  async countDocuments(query = {}) {
    const q = query || {};
    if (q.type && ['expense', 'chi'].includes(q.type)) {
      return await PaymentModel.countDocuments(q);
    }
    if (q.type && ['income', 'thu'].includes(q.type)) {
      return await ReceiptModel.countDocuments(q);
    }
    const [c1, c2] = await Promise.all([
      ReceiptModel.countDocuments(q),
      PaymentModel.countDocuments(q)
    ]);
    return c1 + c2;
  },

  async create(data) {
    if (Array.isArray(data)) {
      return await this.insertMany(data);
    }
    if (['income', 'thu'].includes(data.type)) {
      if (!data.receiptCode) data.receiptCode = data.transactionCode;
      if (!data.payerName) data.payerName = data.personName || data.recipient;
      return await ReceiptModel.create(data);
    } else {
      if (!data.paymentCode) data.paymentCode = data.transactionCode;
      if (!data.payeeName) data.payeeName = data.recipient || data.personName;
      return await PaymentModel.create(data);
    }
  },

  async insertMany(docs) {
    const receipts = [];
    const payments = [];
    for (const d of docs) {
      if (['income', 'thu'].includes(d.type)) {
        if (!d.receiptCode) d.receiptCode = d.transactionCode;
        if (!d.payerName) d.payerName = d.personName || d.recipient;
        receipts.push(d);
      } else {
        if (!d.paymentCode) d.paymentCode = d.transactionCode;
        if (!d.payeeName) d.payeeName = d.recipient || d.personName;
        payments.push(d);
      }
    }
    const results = [];
    if (receipts.length > 0) {
      const res = await ReceiptModel.insertMany(receipts);
      results.push(...res);
    }
    if (payments.length > 0) {
      const res = await PaymentModel.insertMany(payments);
      results.push(...res);
    }
    return results;
  }
};

module.exports = Transaction;
