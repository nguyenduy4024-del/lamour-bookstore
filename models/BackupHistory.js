const mongoose = require('mongoose');

const backupHistorySchema = new mongoose.Schema(
  {
    backupCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    backupType: {
      type: String,
      enum: ['MANUAL', 'SCHEDULED', 'PRE_RESTORE_SNAPSHOT'],
      default: 'MANUAL',
      index: true
    },
    scope: {
      type: String,
      enum: ['FULL', 'DATABASE_ONLY'],
      default: 'FULL'
    },
    dateRange: {
      isRange: { type: Boolean, default: false },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null }
    },
    checksum: {
      type: String,
      default: ''
    },
    collectionsIncluded: [
      {
        type: String
      }
    ],
    documentCount: {
      type: Map,
      of: Number,
      default: {}
    },
    totalDocuments: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'RESTORING'],
      default: 'SUCCESS'
    },
    errorMessage: {
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
      default: null
    },
    creatorName: {
      type: String,
      default: 'Hệ thống'
    },
    restoredCount: {
      type: Number,
      default: 0
    },
    lastRestoredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

backupHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.models.BackupHistory || mongoose.model('BackupHistory', backupHistorySchema);
