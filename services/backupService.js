const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
const BackupHistory = require('../models/BackupHistory');
const { logActivity } = require('../utils/auditLogger');

// Danh sách các model quản trị nghiệp vụ cần sao lưu
const BACKUP_MODELS = {
  User: require('../models/User'),
  Book: require('../models/Book'),
  Author: require('../models/Author'),
  Category: require('../models/Category'),
  Supplier: require('../models/Supplier'),
  Invoice: require('../models/Invoice'),
  Transaction: require('../models/Transaction'),
  Coupon: require('../models/Coupon'),
  Shelf: require('../models/Shelf'),
  ShelfActivityLog: require('../models/ShelfActivityLog'),
  ImportReceipt: require('../models/ImportReceipt'),
  ExportReceipt: require('../models/ExportReceipt'),
  StockAdjustment: require('../models/StockAdjustment'),
  SupplierReturn: require('../models/SupplierReturn'),
  AuditReceipt: require('../models/AuditReceipt'),
  AuditLog: require('../models/AuditLog'),
  Setting: require('../models/Setting')
};

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Đảm bảo thư mục lưu trữ tồn tại
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Tính mã SHA256 của file
 */
function calculateFileChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

/**
 * Thêm một thư mục vào ZIP đệ quy
 */
function addFolderToZipRecursively(zip, localFolderPath, zipTargetPath) {
  if (!fs.existsSync(localFolderPath)) return;
  const items = fs.readdirSync(localFolderPath);
  for (const item of items) {
    const fullPath = path.join(localFolderPath, item);
    const stat = fs.statSync(fullPath);
    const targetInZip = zipTargetPath ? `${zipTargetPath}/${item}` : item;
    if (stat.isDirectory()) {
      addFolderToZipRecursively(zip, fullPath, targetInZip);
    } else {
      zip.addLocalFile(fullPath, zipTargetPath);
    }
  }
}

/**
 * Tạo bản sao lưu mới (Manual, Scheduled hoặc Pre-restore Snapshot)
 */
async function createBackup(options = {}) {
  ensureBackupDir();
  const {
    scope = 'FULL', // 'FULL' hoặc 'DATABASE_ONLY'
    backupType = 'MANUAL', // 'MANUAL', 'SCHEDULED', 'PRE_RESTORE_SNAPSHOT'
    startDate = null,
    endDate = null,
    includeMasterData = true,
    note = '',
    adminUser = null,
    req = null
  } = options;

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHmmss
  const prefix = backupType === 'PRE_RESTORE_SNAPSHOT' ? 'snapshot' : (backupType === 'SCHEDULED' ? 'auto' : 'backup');
  const backupCode = `BKP-${prefix.toUpperCase()}-${timestampStr}`;

  const isDateRange = Boolean(startDate || endDate);
  let parsedStartDate = null;
  let parsedEndDate = null;
  if (startDate) parsedStartDate = new Date(startDate + 'T00:00:00.000Z');
  if (endDate) parsedEndDate = new Date(endDate + 'T23:59:59.999Z');

  const rangeSuffix = isDateRange ? `_range_${startDate || 'start'}_to_${endDate || 'now'}` : '';
  const fileName = `${prefix}_lamour_${timestampStr}${rangeSuffix}_${scope.toLowerCase()}.zip`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const EJSON = mongoose.mongo.BSON.EJSON;
  const zip = new AdmZip();

  const collectionsIncluded = [];
  const documentCount = {};
  let totalDocuments = 0;

  // Danh mục nền tảng (Master data)
  const MASTER_MODELS = ['User', 'Book', 'Author', 'Category', 'Supplier', 'Shelf', 'Setting', 'Coupon'];

  // 1. Export từng Collection MongoDB sang BSON/EJSON
  for (const [modelName, Model] of Object.entries(BACKUP_MODELS)) {
    try {
      let query = {};
      if (isDateRange) {
        const isMaster = MASTER_MODELS.includes(modelName);
        if (!isMaster || !includeMasterData) {
          query.createdAt = {};
          if (parsedStartDate) query.createdAt.$gte = parsedStartDate;
          if (parsedEndDate) query.createdAt.$lte = parsedEndDate;
        }
      }

      const docs = await Model.find(query).lean();
      const count = docs.length;
      collectionsIncluded.push(modelName);
      documentCount[modelName] = count;
      totalDocuments += count;

      const ejsonStr = EJSON.stringify(docs, null, 2);
      zip.addFile(`data/${modelName}.json`, Buffer.from(ejsonStr, 'utf8'));
    } catch (err) {
      console.error(`[Backup Service] Lỗi khi export collection ${modelName}:`, err.message);
    }
  }

  // 2. Export Media Uploads (nếu scope là FULL)
  if (scope === 'FULL') {
    const publicPath = path.join(__dirname, '..', 'public');
    const uploadsPath = path.join(publicPath, 'uploads');
    const coversPath = path.join(publicPath, 'images', 'covers');

    if (fs.existsSync(uploadsPath)) {
      addFolderToZipRecursively(zip, uploadsPath, 'media/uploads');
    }
    if (fs.existsSync(coversPath)) {
      addFolderToZipRecursively(zip, coversPath, 'media/images/covers');
    }

    // Các ảnh cấu hình như qr-bank, qr-momo
    const qrBank = path.join(publicPath, 'images', 'qr-bank.jpg');
    if (fs.existsSync(qrBank)) {
      zip.addLocalFile(qrBank, 'media/images');
    }
    const qrMomo = path.join(publicPath, 'images', 'qr-momo.jpg');
    if (fs.existsSync(qrMomo)) {
      zip.addLocalFile(qrMomo, 'media/images');
    }
  }

  // 3. Tạo file manifest.json
  const manifest = {
    backupCode,
    fileName,
    scope,
    backupType,
    dateRange: {
      isRange: isDateRange,
      startDate: startDate || null,
      endDate: endDate || null,
      includeMasterData
    },
    createdAt: now.toISOString(),
    version: '1.0',
    app: "L'Amour Bookstore Enterprise",
    totalDocuments,
    documentCount,
    collectionsIncluded,
    note
  };
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

  // 4. Ghi file ZIP ra đĩa
  zip.writeZip(filePath);

  // 5. Kiểm tra dung lượng & Tính SHA256 Checksum
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const checksum = await calculateFileChecksum(filePath);

  // 6. Lưu bản ghi lịch sử vào CSDL
  const backupRecord = await BackupHistory.create({
    backupCode,
    fileName,
    filePath,
    fileSize,
    backupType,
    scope,
    dateRange: {
      isRange: isDateRange,
      startDate: parsedStartDate,
      endDate: parsedEndDate
    },
    checksum,
    collectionsIncluded,
    documentCount,
    totalDocuments,
    status: 'SUCCESS',
    note,
    createdBy: adminUser?._id || null,
    creatorName: adminUser?.name || (backupType === 'SCHEDULED' ? 'Hệ thống tự động' : 'Quản trị viên')
  });

  // 7. Ghi Audit Log
  const severity = backupType === 'PRE_RESTORE_SNAPSHOT' ? 'WARNING' : 'INFO';
  const rangeInfo = isDateRange ? ` (Khoảng ngày: ${startDate || 'Ban đầu'} -> ${endDate || 'Hiện tại'})` : '';
  await logActivity(req, {
    performedBy: adminUser?._id || null,
    performerName: adminUser?.name || 'Hệ thống',
    performerEmail: adminUser?.email || '',
    performerRole: adminUser?.role || 'system',
    module: 'SYSTEM',
    action: 'BACKUP_CREATED',
    description: `Tạo bản sao lưu dữ liệu [${backupCode}]${rangeInfo} (${(fileSize / 1024 / 1024).toFixed(2)} MB, ${totalDocuments} bản ghi)`,
    severity,
    targetId: backupRecord._id.toString(),
    targetModel: 'BackupHistory',
    targetLabel: fileName,
    metadata: {
      backupCode,
      fileName,
      fileSize,
      scope,
      backupType,
      dateRange: {
        isRange: isDateRange,
        startDate,
        endDate
      },
      totalDocuments
    }
  });

  return backupRecord;
}

/**
 * Phục hồi dữ liệu từ file backup (ZIP)
 */
async function restoreBackup(backupIdOrFilePath, options = {}) {
  const {
    adminUser = null,
    req = null,
    autoSnapshot = true,
    isUploadedFile = false
  } = options;

  let filePath = '';
  let backupRecord = null;

  if (isUploadedFile) {
    filePath = backupIdOrFilePath;
    if (!fs.existsSync(filePath)) {
      throw new Error('Tệp sao lưu được tải lên không tồn tại trên máy chủ');
    }
  } else {
    backupRecord = await BackupHistory.findById(backupIdOrFilePath);
    if (!backupRecord) {
      throw new Error('Không tìm thấy bản ghi sao lưu trong hệ thống');
    }
    filePath = backupRecord.filePath;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Tệp sao lưu vật lý [${backupRecord.fileName}] không còn tồn tại trên máy chủ`);
    }
  }

  // 1. Tự động tạo Snapshot cứu hộ (Pre-restore Snapshot) trước khi ghi đè CSDL
  let snapshotRecord = null;
  if (autoSnapshot) {
    try {
      snapshotRecord = await createBackup({
        scope: 'FULL',
        backupType: 'PRE_RESTORE_SNAPSHOT',
        note: `Snapshot cứu hộ tự động trước khi phục hồi từ ${backupRecord ? backupRecord.fileName : path.basename(filePath)}`,
        adminUser,
        req
      });
    } catch (snapErr) {
      console.warn('[Backup Service] Không thể tạo Snapshot cứu hộ:', snapErr.message);
    }
  }

  // 2. Mở file ZIP và kiểm tra tính toàn vẹn
  const zip = new AdmZip(filePath);
  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) {
    throw new Error('Tệp sao lưu không hợp lệ: Không tìm thấy tệp manifest.json định danh cấu trúc');
  }

  let manifest = {};
  try {
    manifest = JSON.parse(zip.readAsText(manifestEntry));
  } catch (parseErr) {
    throw new Error('Tệp manifest.json bị lỗi định dạng không thể đọc: ' + parseErr.message);
  }

  const EJSON = mongoose.mongo.BSON.EJSON;
  const restoredCollections = [];
  let totalRestoredRecords = 0;

  // 3. Phục hồi từng Collection MongoDB
  const collectionsToRestore = manifest.collectionsIncluded || Object.keys(BACKUP_MODELS);

  for (const modelName of collectionsToRestore) {
    const Model = BACKUP_MODELS[modelName];
    if (!Model) continue;

    const dataEntry = zip.getEntry(`data/${modelName}.json`);
    if (!dataEntry) continue;

    try {
      const jsonContent = zip.readAsText(dataEntry);
      const docs = EJSON.parse(jsonContent);

      // Xóa dữ liệu cũ của collection
      await Model.collection.deleteMany({});

      // Nạp dữ liệu nguyên bản từ backup nếu có bản ghi
      if (Array.isArray(docs) && docs.length > 0) {
        await Model.collection.insertMany(docs, { ordered: false });
      }

      restoredCollections.push({
        modelName,
        count: docs ? docs.length : 0
      });
      totalRestoredRecords += (docs ? docs.length : 0);
    } catch (restoreColErr) {
      console.error(`[Backup Service] Lỗi khi phục hồi collection ${modelName}:`, restoreColErr.message);
    }
  }

  // 4. Phục hồi Media Files (nếu có các file trong thư mục media/)
  const zipEntries = zip.getEntries();
  const publicDir = path.join(__dirname, '..', 'public');
  let restoredMediaCount = 0;

  for (const entry of zipEntries) {
    if (entry.entryName.startsWith('media/') && !entry.isDirectory) {
      const relPath = entry.entryName.replace(/^media\//, '');
      const destPath = path.join(publicDir, relPath);
      const destFolder = path.dirname(destPath);
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }
      fs.writeFileSync(destPath, entry.getData());
      restoredMediaCount++;
    }
  }

  // 5. Cập nhật thống kê bản ghi backup (nếu có trong CSDL)
  if (backupRecord) {
    backupRecord.restoredCount = (backupRecord.restoredCount || 0) + 1;
    backupRecord.lastRestoredAt = new Date();
    await backupRecord.save();
  }

  // 6. Ghi Audit Log mức độ CRITICAL
  await logActivity(req, {
    performedBy: adminUser?._id || null,
    performerName: adminUser?.name || 'Hệ thống',
    performerEmail: adminUser?.email || '',
    performerRole: adminUser?.role || 'admin',
    module: 'SYSTEM',
    action: 'BACKUP_RESTORED',
    description: `[NGUY HIỂM/QUAN TRỌNG] Đã thực hiện phục hồi toàn bộ CSDL từ bản sao lưu [${manifest.backupCode || path.basename(filePath)}]. Đã nạp lại ${totalRestoredRecords} bản ghi từ ${restoredCollections.length} collections và ${restoredMediaCount} tệp media.`,
    severity: 'CRITICAL',
    status: 'SUCCESS',
    targetId: backupRecord ? backupRecord._id.toString() : 'UPLOADED_FILE',
    targetModel: 'BackupHistory',
    targetLabel: manifest.fileName || path.basename(filePath),
    metadata: {
      backupCode: manifest.backupCode,
      totalRestoredRecords,
      restoredMediaCount,
      snapshotCode: snapshotRecord ? snapshotRecord.backupCode : null
    }
  });

  return {
    success: true,
    message: 'Phục hồi dữ liệu hệ thống thành công!',
    backupCode: manifest.backupCode,
    fileName: manifest.fileName || path.basename(filePath),
    totalRestoredRecords,
    restoredCollections,
    restoredMediaCount,
    snapshotCode: snapshotRecord ? snapshotRecord.backupCode : null
  };
}

/**
 * Xóa một bản sao lưu (Xóa file vật lý và bản ghi CSDL)
 */
async function deleteBackup(backupId, options = {}) {
  const { adminUser = null, req = null } = options;
  const backupRecord = await BackupHistory.findById(backupId);
  if (!backupRecord) {
    throw new Error('Không tìm thấy bản sao lưu cần xóa');
  }

  // Xóa file vật lý nếu còn
  if (fs.existsSync(backupRecord.filePath)) {
    try {
      fs.unlinkSync(backupRecord.filePath);
    } catch (unlinkErr) {
      console.warn(`[Backup Service] Không thể xóa file vật lý ${backupRecord.filePath}:`, unlinkErr.message);
    }
  }

  const fileName = backupRecord.fileName;
  const backupCode = backupRecord.backupCode;

  await BackupHistory.findByIdAndDelete(backupId);

  // Ghi Audit Log
  await logActivity(req, {
    performedBy: adminUser?._id || null,
    performerName: adminUser?.name || 'Hệ thống',
    performerEmail: adminUser?.email || '',
    performerRole: adminUser?.role || 'admin',
    module: 'SYSTEM',
    action: 'BACKUP_DELETED',
    description: `Xóa bản sao lưu dữ liệu [${backupCode}] (${fileName})`,
    severity: 'WARNING',
    targetId: backupId.toString(),
    targetModel: 'BackupHistory',
    targetLabel: fileName
  });

  return { success: true, message: `Đã xóa bản sao lưu ${fileName}` };
}

/**
 * Lấy số liệu thống kê tổng quan về sao lưu
 */
async function getBackupOverview() {
  ensureBackupDir();
  const totalBackups = await BackupHistory.countDocuments();
  const lastBackup = await BackupHistory.findOne().sort({ createdAt: -1 });

  // Tính tổng dung lượng thực tế các file zip trong thư mục backups/
  let diskTotalSizeBytes = 0;
  if (fs.existsSync(BACKUP_DIR)) {
    const files = fs.readdirSync(BACKUP_DIR);
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        diskTotalSizeBytes += stat.size;
      } catch (e) {}
    }
  }

  const manualCount = await BackupHistory.countDocuments({ backupType: 'MANUAL' });
  const scheduledCount = await BackupHistory.countDocuments({ backupType: 'SCHEDULED' });
  const snapshotCount = await BackupHistory.countDocuments({ backupType: 'PRE_RESTORE_SNAPSHOT' });

  return {
    totalBackups,
    totalSizeBytes: diskTotalSizeBytes,
    totalSizeMB: (diskTotalSizeBytes / 1024 / 1024).toFixed(2),
    lastBackup: lastBackup ? {
      backupCode: lastBackup.backupCode,
      fileName: lastBackup.fileName,
      createdAt: lastBackup.createdAt,
      fileSize: lastBackup.fileSize,
      fileSizeMB: (lastBackup.fileSize / 1024 / 1024).toFixed(2),
      backupType: lastBackup.backupType,
      totalDocuments: lastBackup.totalDocuments
    } : null,
    breakdown: {
      manual: manualCount,
      scheduled: scheduledCount,
      snapshot: snapshotCount
    }
  };
}

/**
 * Dọn dẹp các bản sao lưu cũ quá hạn (VD: > 30 ngày)
 */
async function cleanOldBackups(retentionDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const oldBackups = await BackupHistory.find({
    createdAt: { $lt: cutoffDate },
    backupType: { $ne: 'PRE_RESTORE_SNAPSHOT' } // Giữ lại snapshot cứu hộ nếu cần
  });

  let deletedCount = 0;
  for (const b of oldBackups) {
    try {
      if (fs.existsSync(b.filePath)) {
        fs.unlinkSync(b.filePath);
      }
      await BackupHistory.findByIdAndDelete(b._id);
      deletedCount++;
    } catch (err) {
      console.warn(`[Auto-Clean] Không thể xóa backup ${b.fileName}:`, err.message);
    }
  }

  if (deletedCount > 0) {
    console.log(`[Auto-Clean Backups] Đã tự động dọn dẹp ${deletedCount} bản sao lưu cũ hơn ${retentionDays} ngày.`);
  }
  return deletedCount;
}

module.exports = {
  createBackup,
  restoreBackup,
  deleteBackup,
  getBackupOverview,
  cleanOldBackups,
  BACKUP_DIR
};
