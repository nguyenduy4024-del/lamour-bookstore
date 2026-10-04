const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    bookCode: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    previousStock: {
      type: Number,
      required: true
    },
    adjustmentQty: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      default: '',
      trim: true
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    auditReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuditReceipt'
    },
    auditCode: {
      type: String,
      trim: true
    },
    decision: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
