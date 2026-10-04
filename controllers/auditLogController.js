const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { logActivity } = require('../utils/auditLogger');

// Helper escape regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @desc    Lấy danh sách nhật ký hoạt động (Audit Logs) có phân trang & bộ lọc đa tiêu chí
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin)
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      module: moduleFilter = '',
      severity = '',
      action = '',
      performerId = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const query = {};

    // 1. Lọc theo Phân hệ
    if (moduleFilter && moduleFilter !== 'ALL') {
      query.module = moduleFilter.toUpperCase();
    }

    // 2. Lọc theo Mức độ nghiêm trọng
    if (severity && severity !== 'ALL') {
      query.severity = severity.toUpperCase();
    }

    // 3. Lọc theo Hành động
    if (action) {
      query.action = action;
    }

    // 4. Lọc theo Người thực hiện
    if (performerId) {
      query.performedBy = performerId;
    }

    // 5. Lọc theo khoảng ngày (startDate - endDate)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // 6. Tìm kiếm từ khóa tự do
    if (search && search.trim()) {
      const reg = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { description: reg },
        { performerName: reg },
        { performerEmail: reg },
        { targetLabel: reg },
        { targetId: reg },
        { ipAddress: reg },
        { action: reg }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email role avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          totalPages,
          currentPage: pageNum,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Lỗi getAuditLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tải danh sách nhật ký hoạt động'
    });
  }
};

/**
 * @desc    Lấy thống kê nhanh KPI cho trang Nhật ký
 * @route   GET /api/admin/audit-logs/stats
 * @access  Private (Admin)
 */
const getAuditLogStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalLogs,
      todayLogs,
      criticalCount,
      unreadCriticalCount,
      warningCount,
      moduleAgg,
      recentCritical
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: todayStart } }),
      AuditLog.countDocuments({ severity: 'CRITICAL', createdAt: { $gte: sevenDaysAgo } }),
      AuditLog.countDocuments({ severity: 'CRITICAL', createdAt: { $gte: sevenDaysAgo }, isRead: { $ne: true } }),
      AuditLog.countDocuments({ severity: 'WARNING', createdAt: { $gte: sevenDaysAgo } }),
      AuditLog.aggregate([
        { $group: { _id: '$module', count: { $sum: 1 } } }
      ]),
      AuditLog.find({ severity: 'CRITICAL' })
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Format module breakdown
    const moduleBreakdown = {};
    moduleAgg.forEach((item) => {
      if (item._id) moduleBreakdown[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        totalLogs,
        todayLogs,
        criticalCount,
        unreadCriticalCount,
        warningCount,
        moduleBreakdown,
        recentCritical
      }
    });
  } catch (error) {
    console.error('Lỗi getAuditLogStats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tính toán thống kê nhật ký'
    });
  }
};

/**
 * @desc    Lấy chi tiết 1 bản ghi nhật ký (kèm diff) và tự động đánh dấu đã xem
 * @route   GET /api/admin/audit-logs/:id
 * @access  Private (Admin)
 */
const getAuditLogDetail = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('performedBy', 'name email role avatar')
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản ghi nhật ký'
      });
    }

    // Tự động đánh dấu đã xem nếu chưa xem
    if (!log.isRead) {
      await AuditLog.findByIdAndUpdate(req.params.id, {
        isRead: true,
        readAt: new Date(),
        readBy: req.user ? req.user._id : null
      });
      log.isRead = true;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const unreadCriticalCount = await AuditLog.countDocuments({
      severity: 'CRITICAL',
      createdAt: { $gte: sevenDaysAgo },
      isRead: { $ne: true }
    });

    res.json({
      success: true,
      data: log,
      unreadCriticalCount
    });
  } catch (error) {
    console.error('Lỗi getAuditLogDetail:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy chi tiết bản ghi nhật ký'
    });
  }
};

/**
 * @desc    Đánh dấu 1 bản ghi nhật ký là đã xem / đã đọc
 * @route   PUT /api/admin/audit-logs/:id/read
 * @access  Private (Admin)
 */
const markAuditLogAsRead = async (req, res) => {
  try {
    const log = await AuditLog.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
        readAt: new Date(),
        readBy: req.user ? req.user._id : null
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi nhật ký' });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const unreadCriticalCount = await AuditLog.countDocuments({
      severity: 'CRITICAL',
      createdAt: { $gte: sevenDaysAgo },
      isRead: { $ne: true }
    });

    res.json({
      success: true,
      message: 'Đã đánh dấu đã đọc bản ghi',
      data: {
        log,
        unreadCriticalCount
      }
    });
  } catch (error) {
    console.error('Lỗi markAuditLogAsRead:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật trạng thái đã đọc' });
  }
};

/**
 * @desc    Đánh dấu tất cả nhật ký là đã đọc
 * @route   PUT /api/admin/audit-logs/mark-all-read
 * @access  Private (Admin)
 */
const markAllAuditLogsAsRead = async (req, res) => {
  try {
    await AuditLog.updateMany(
      { isRead: { $ne: true } },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          readBy: req.user ? req.user._id : null
        }
      }
    );

    logActivity(req, {
      module: 'SYSTEM',
      action: 'AUDIT_LOG_MARK_ALL_READ',
      severity: 'INFO',
      description: `Quản trị viên đã đánh dấu đã đọc tất cả thông báo nhật ký hệ thống`,
      metadata: {
        readBy: req.user ? req.user.name : 'Admin'
      }
    });

    res.json({
      success: true,
      message: 'Đã đánh dấu tất cả nhật ký là đã đọc thành công',
      data: {
        unreadCriticalCount: 0
      }
    });
  } catch (error) {
    console.error('Lỗi markAllAuditLogsAsRead:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đánh dấu đã đọc' });
  }
};

/**
 * @desc    Xuất danh sách nhật ký ra file CSV có hỗ trợ tiếng Việt UTF-8
 * @route   GET /api/admin/audit-logs/export
 * @access  Private (Admin)
 */
const exportAuditLogsCsv = async (req, res) => {
  try {
    const {
      search = '',
      module: moduleFilter = '',
      severity = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const query = {};
    if (moduleFilter && moduleFilter !== 'ALL') query.module = moduleFilter.toUpperCase();
    if (severity && severity !== 'ALL') query.severity = severity.toUpperCase();

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const reg = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { description: reg },
        { performerName: reg },
        { performerEmail: reg },
        { targetLabel: reg },
        { ipAddress: reg }
      ];
    }

    // Giới hạn xuất tối đa 2000 dòng gần nhất để bảo vệ hiệu năng
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    // Tiêu đề cột CSV
    const headers = [
      'Thời gian',
      'Người thực hiện',
      'Email',
      'Vai trò',
      'Phân hệ',
      'Hành động',
      'Mô tả chi tiết',
      'Mức độ',
      'Đối tượng',
      'IP',
      'Trạng thái'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map((l) => {
      const timeStr = l.createdAt ? new Date(l.createdAt).toLocaleString('vi-VN') : '';
      return [
        escapeCsv(timeStr),
        escapeCsv(l.performerName || 'Hệ thống'),
        escapeCsv(l.performerEmail || ''),
        escapeCsv(l.performerRole || ''),
        escapeCsv(l.module || ''),
        escapeCsv(l.action || ''),
        escapeCsv(l.description || ''),
        escapeCsv(l.severity || ''),
        escapeCsv(l.targetLabel || l.targetId || ''),
        escapeCsv(l.ipAddress || ''),
        escapeCsv(l.status || '')
      ].join(',');
    });

    // Thêm BOM \uFEFF để Excel mở ra hiển thị đúng font tiếng Việt không bị lỗi font
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    logActivity(req, {
      module: 'SYSTEM',
      action: 'AUDIT_LOG_EXPORT_CSV',
      severity: 'WARNING',
      description: `Xuất danh sách nhật ký hoạt động hệ thống ra file CSV (${logs.length} bản ghi)`,
      metadata: {
        rowCount: logs.length,
        filter: {
          search,
          module: moduleFilter,
          severity,
          startDate,
          endDate
        }
      }
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nhat-ky-hoat-dong-${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Lỗi exportAuditLogsCsv:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất file nhật ký'
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogDetail,
  exportAuditLogsCsv,
  markAuditLogAsRead,
  markAllAuditLogsAsRead
};
