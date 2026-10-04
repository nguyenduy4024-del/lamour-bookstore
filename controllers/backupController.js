const fs = require('fs');
const path = require('path');
const BackupHistory = require('../models/BackupHistory');
const User = require('../models/User');
const Setting = require('../models/Setting');
const {
  createBackup,
  restoreBackup,
  deleteBackup,
  getBackupOverview
} = require('../services/backupService');
const { logActivity } = require('../utils/auditLogger');

/**
 * Lấy danh sách lịch sử sao lưu (Có phân trang & lọc)
 * GET /api/admin/backups
 */
async function getBackups(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type && req.query.type !== 'ALL') {
      filter.backupType = req.query.type;
    }
    if (req.query.search) {
      const q = req.query.search.trim();
      filter.$or = [
        { backupCode: { $regex: q, $options: 'i' } },
        { fileName: { $regex: q, $options: 'i' } },
        { note: { $regex: q, $options: 'i' } }
      ];
    }
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = filter.createdAt || {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate + 'T00:00:00.000Z');
      if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate + 'T23:59:59.999Z');
    }

    const total = await BackupHistory.countDocuments(filter);
    const backups = await BackupHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: backups,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('[Backup Controller] Lỗi getBackups:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách bản sao lưu: ' + err.message
    });
  }
}

/**
 * Lấy số liệu thống kê tổng quan sao lưu
 * GET /api/admin/backups/stats
 */
async function getBackupStats(req, res) {
  try {
    const overview = await getBackupOverview();
    const setting = await Setting.findOne().lean();
    const backupConfig = setting?.backupConfig || {
      autoBackup: true,
      scheduleTime: '02:00',
      retentionDays: 30,
      scope: 'FULL'
    };

    return res.status(200).json({
      success: true,
      overview,
      backupConfig
    });
  } catch (err) {
    console.error('[Backup Controller] Lỗi getBackupStats:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông số thống kê sao lưu: ' + err.message
    });
  }
}

/**
 * Tạo một bản sao lưu thủ công mới
 * POST /api/admin/backups
 */
async function createNewBackup(req, res) {
  try {
    const {
      scope = 'FULL',
      backupType = 'MANUAL',
      startDate = null,
      endDate = null,
      includeMasterData = true,
      note = ''
    } = req.body;

    const backupRecord = await createBackup({
      scope,
      backupType,
      startDate: startDate || null,
      endDate: endDate || null,
      includeMasterData: includeMasterData !== false,
      note,
      adminUser: req.user,
      req
    });

    await logActivity(req, {
      performedBy: req.user?._id,
      performerName: req.user?.name,
      performerEmail: req.user?.email,
      performerRole: req.user?.role,
      module: 'SYSTEM',
      action: 'BACKUP_CREATED',
      description: `Tạo bản sao lưu dữ liệu mới [${backupRecord.backupCode}] (${backupRecord.fileName}) - Phạm vi: ${backupRecord.scope}`,
      severity: 'INFO',
      targetId: backupRecord._id.toString(),
      targetModel: 'BackupHistory',
      targetLabel: backupRecord.fileName,
      metadata: {
        fileSize: backupRecord.fileSize,
        scope: backupRecord.scope,
        totalDocuments: backupRecord.totalDocuments
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo bản sao lưu thành công!',
      data: backupRecord
    });
  } catch (err) {
    console.error('[Backup Controller] Lỗi createNewBackup:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo bản sao lưu: ' + err.message
    });
  }
}

/**
 * Tải tệp ZIP sao lưu về máy tính
 * GET /api/admin/backups/:id/download
 */
async function downloadBackupFile(req, res) {
  try {
    const backup = await BackupHistory.findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản sao lưu' });
    }

    if (!fs.existsSync(backup.filePath)) {
      return res.status(404).json({ success: false, message: 'Tệp sao lưu vật lý không tồn tại trên máy chủ' });
    }

    // Ghi Audit Log hành động tải file
    await logActivity(req, {
      performedBy: req.user?._id,
      performerName: req.user?.name,
      performerEmail: req.user?.email,
      performerRole: req.user?.role,
      module: 'SYSTEM',
      action: 'BACKUP_DOWNLOADED',
      description: `Tải bản sao lưu [${backup.backupCode}] (${backup.fileName}) về máy tính`,
      severity: 'INFO',
      targetId: backup._id.toString(),
      targetModel: 'BackupHistory',
      targetLabel: backup.fileName
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
    return res.download(backup.filePath, backup.fileName);
  } catch (err) {
    console.error('[Backup Controller] Lỗi downloadBackupFile:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải tệp sao lưu: ' + err.message
    });
  }
}

/**
 * Phục hồi CSDL từ một bản sao lưu sẵn có trên máy chủ
 * POST /api/admin/backups/:id/restore
 */
async function restoreFromExistingBackup(req, res) {
  try {
    const { adminPassword, autoSnapshot = true } = req.body;

    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Bắt buộc nhập mật khẩu Quản trị viên để ủy quyền phục hồi CSDL'
      });
    }

    // Kiểm tra mật khẩu Admin
    const adminUser = await User.findById(req.user._id);
    if (!adminUser) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    const isMatch = await adminUser.matchPassword(adminPassword);
    if (!isMatch) {
      await logActivity(req, {
        performedBy: req.user._id,
        performerName: req.user.name,
        performerEmail: req.user.email,
        performerRole: req.user.role,
        module: 'SYSTEM',
        action: 'RESTORE_PASSWORD_FAILED',
        description: `Cảnh báo: Nhập sai mật khẩu khi cố gắng phục hồi dữ liệu từ bản sao lưu ID: ${req.params.id}`,
        severity: 'CRITICAL',
        status: 'FAILURE'
      });
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu xác thực của Quản trị viên không chính xác!'
      });
    }

    // Tiến hành phục hồi
    const result = await restoreBackup(req.params.id, {
      adminUser: req.user,
      req,
      autoSnapshot
    });

    await logActivity(req, {
      performedBy: req.user?._id,
      performerName: req.user?.name,
      performerEmail: req.user?.email,
      performerRole: req.user?.role,
      module: 'SYSTEM',
      action: 'BACKUP_RESTORE_SUCCESS',
      description: `Khôi phục thành công toàn bộ cơ sở dữ liệu từ bản sao lưu [${result.backupCode || req.params.id}] (${result.fileName}) - Đã phục hồi ${result.totalRestoredRecords || 0} bản ghi`,
      severity: 'CRITICAL',
      targetId: req.params.id,
      targetModel: 'BackupHistory',
      targetLabel: result.fileName,
      metadata: {
        totalRestoredRecords: result.totalRestoredRecords,
        restoredCollections: result.restoredCollections
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Phục hồi toàn bộ cơ sở dữ liệu thành công!',
      data: result
    });
  } catch (err) {
    console.error('[Backup Controller] Lỗi restoreFromExistingBackup:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi trong quá trình phục hồi dữ liệu: ' + err.message
    });
  }
}

/**
 * Tải tệp ZIP từ máy lên và thực hiện phục hồi
 * POST /api/admin/backups/upload-restore
 */
async function uploadAndRestoreBackup(req, res) {
  let uploadedFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn tệp sao lưu (.zip) để tải lên'
      });
    }

    uploadedFilePath = req.file.path;
    const { adminPassword, autoSnapshot = true } = req.body;

    if (!adminPassword) {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: 'Bắt buộc nhập mật khẩu Quản trị viên để ủy quyền phục hồi CSDL'
      });
    }

    const adminUser = await User.findById(req.user._id);
    const isMatch = await adminUser.matchPassword(adminPassword);
    if (!isMatch) {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu xác thực của Quản trị viên không chính xác!'
      });
    }

    // Thực hiện phục hồi từ file tạm vừa upload
    const result = await restoreBackup(uploadedFilePath, {
      adminUser: req.user,
      req,
      autoSnapshot: autoSnapshot === 'true' || autoSnapshot === true,
      isUploadedFile: true
    });

    // Dọn dẹp file tạm sau khi phục hồi xong
    if (fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (e) {}
    }

    await logActivity(req, {
      performedBy: req.user?._id,
      performerName: req.user?.name,
      performerEmail: req.user?.email,
      performerRole: req.user?.role,
      module: 'SYSTEM',
      action: 'BACKUP_UPLOAD_RESTORE_SUCCESS',
      description: `Tải lên tệp sao lưu và khôi phục thành công cơ sở dữ liệu (${req.file.originalname}) - Đã phục hồi ${result.totalRestoredRecords || 0} bản ghi`,
      severity: 'CRITICAL',
      targetModel: 'BackupHistory',
      targetLabel: req.file.originalname,
      metadata: {
        totalRestoredRecords: result.totalRestoredRecords,
        restoredCollections: result.restoredCollections
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Phục hồi dữ liệu từ tệp tải lên thành công!',
      data: result
    });
  } catch (err) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (e) {}
    }
    console.error('[Backup Controller] Lỗi uploadAndRestoreBackup:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể phục hồi từ tệp tải lên: ' + err.message
    });
  }
}

/**
 * Xóa bản sao lưu
 * DELETE /api/admin/backups/:id
 */
async function deleteBackupItem(req, res) {
  try {
    const result = await deleteBackup(req.params.id, {
      adminUser: req.user,
      req
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[Backup Controller] Lỗi deleteBackupItem:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa bản sao lưu: ' + err.message
    });
  }
}

/**
 * Cập nhật cấu hình tự động sao lưu
 * PUT /api/admin/backups/config
 */
async function updateBackupConfig(req, res) {
  try {
    const { autoBackup, scheduleTime, retentionDays, scope } = req.body;

    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }

    setting.backupConfig = {
      autoBackup: autoBackup !== undefined ? Boolean(autoBackup) : setting.backupConfig?.autoBackup ?? true,
      scheduleTime: scheduleTime || setting.backupConfig?.scheduleTime || '02:00',
      retentionDays: parseInt(retentionDays) || setting.backupConfig?.retentionDays || 30,
      scope: scope || setting.backupConfig?.scope || 'FULL'
    };

    await setting.save();

    await logActivity(req, {
      performedBy: req.user._id,
      performerName: req.user.name,
      performerEmail: req.user.email,
      performerRole: req.user.role,
      module: 'SETTINGS',
      action: 'BACKUP_CONFIG_UPDATED',
      description: `Cập nhật cấu hình tự động sao lưu: ${setting.backupConfig.autoBackup ? 'BẬT' : 'TẮT'} lúc ${setting.backupConfig.scheduleTime}, lưu giữ ${setting.backupConfig.retentionDays} ngày.`,
      severity: 'INFO',
      metadata: setting.backupConfig
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật cấu hình tự động sao lưu thành công!',
      backupConfig: setting.backupConfig
    });
  } catch (err) {
    console.error('[Backup Controller] Lỗi updateBackupConfig:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật cấu hình sao lưu: ' + err.message
    });
  }
}

module.exports = {
  getBackups,
  getBackupStats,
  createNewBackup,
  downloadBackupFile,
  restoreFromExistingBackup,
  uploadAndRestoreBackup,
  deleteBackupItem,
  updateBackupConfig
};
