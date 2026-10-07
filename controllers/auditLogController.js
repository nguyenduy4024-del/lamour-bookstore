const ExcelJS = require('exceljs');
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
 * Helper định dạng ngày giờ chuẩn Việt Nam (HH:mm:ss DD/MM/YYYY)
 */
function formatDateTimeVN(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

function formatDateVN(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const getRoleLabel = (role) => {
  if (!role) return 'Khách';
  const r = String(role).toLowerCase();
  if (r === 'admin') return 'Quản trị viên';
  if (r === 'staff') return 'Nhân viên';
  if (r === 'user') return 'Khách hàng';
  if (r === 'system') return 'Hệ thống';
  return role;
};

const getModuleLabel = (mod) => {
  const m = String(mod || '').toUpperCase();
  const map = {
    AUTH: 'Xác thực (AUTH)',
    USERS: 'Người dùng (USERS)',
    BOOKS: 'Sản phẩm (BOOKS)',
    ORDERS: 'Đơn hàng (ORDERS)',
    INVENTORY: 'Kho hàng (INVENTORY)',
    ACCOUNTING: 'Tài chính (ACCOUNTING)',
    SETTINGS: 'Cấu hình (SETTINGS)',
    SYSTEM: 'Hệ thống (SYSTEM)'
  };
  return map[m] || m;
};

/**
 * @desc    Xuất danh sách nhật ký hoạt động hệ thống (Mặc định: Excel .xlsx chuyên nghiệp, hỗ trợ tùy chọn .csv)
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
      endDate = '',
      format = 'xlsx'
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

    // Giới hạn xuất tối đa 2500 dòng gần nhất để bảo vệ hiệu năng
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(2500)
      .lean();

    const isCsvExport = String(format).toLowerCase() === 'csv';

    // 1. NẾU YÊU CẦU FILE CSV THÔ (HỖ TRỢ THÊM SEP=, ĐỂ EXCEL KHÔNG BỊ GỘP CỘT)
    if (isCsvExport) {
      const headers = [
        'STT',
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

      const rows = logs.map((l, index) => {
        const timeStr = formatDateTimeVN(l.createdAt);
        return [
          index + 1,
          escapeCsv(timeStr),
          escapeCsv(l.performerName || 'Hệ thống'),
          escapeCsv(l.performerEmail || ''),
          escapeCsv(getRoleLabel(l.performerRole)),
          escapeCsv(l.module || ''),
          escapeCsv(l.action || ''),
          escapeCsv(l.description || ''),
          escapeCsv(l.severity || ''),
          escapeCsv(l.targetLabel || l.targetId || ''),
          escapeCsv(l.ipAddress || ''),
          escapeCsv(l.status === 'SUCCESS' ? 'Thành công' : 'Thất bại')
        ].join(',');
      });

      // sep=, chỉ thị cho Excel tự động chia cột đúng mà không bị dồn tất cả vào cột A
      const csvContent = '\uFEFFsep=,\r\n' + [headers.join(','), ...rows].join('\r\n');

      logActivity(req, {
        module: 'SYSTEM',
        action: 'AUDIT_LOG_EXPORT_CSV',
        severity: 'WARNING',
        description: `Xuất danh sách nhật ký hoạt động hệ thống ra file CSV (${logs.length} bản ghi)`,
        metadata: { rowCount: logs.length, format: 'csv' }
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="nhat-ky-hoat-dong-${Date.now()}.csv"`);
      return res.status(200).send(csvContent);
    }

    // 2. MẶC ĐỊNH: XUẤT FILE EXCEL (.XLSX) CAO CẤP, CÓ ĐỊNH DẠNG & MÀU SẮC ĐẸP MẮT
    const wb = new ExcelJS.Workbook();
    wb.creator = "L'Amour Bookstore";
    wb.lastModifiedBy = req.user ? (req.user.name || 'Admin') : "L'Amour Admin";
    wb.created = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet('Nhật Ký Hoạt Động', {
      views: [{ state: 'frozen', ySplit: 8, activeCell: 'A9', showGridLines: true }]
    });

    // Cấu hình độ rộng các cột
    ws.columns = [
      { key: 'stt', width: 7 },
      { key: 'time', width: 22 },
      { key: 'performer', width: 24 },
      { key: 'email', width: 26 },
      { key: 'role', width: 16 },
      { key: 'module', width: 20 },
      { key: 'action', width: 26 },
      { key: 'description', width: 65 },
      { key: 'severity', width: 16 },
      { key: 'target', width: 28 },
      { key: 'ip', width: 16 },
      { key: 'status', width: 15 }
    ];

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    // Dòng 1: Khoảng đệm
    ws.getRow(1).height = 10;

    // Dòng 2: Tiêu đề Báo Cáo Banner
    ws.mergeCells('A2:L2');
    const titleCell = ws.getCell('A2');
    titleCell.value = "NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG - L'AMOUR BOOKSTORE";
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2744' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 36;

    // Dòng 3: Phụ đề
    ws.mergeCells('A3:L3');
    const subCell = ws.getCell('A3');
    subCell.value = 'Báo cáo truy vết kiểm toán bảo mật, hoạt động nhân viên & lịch sử thay đổi hệ thống';
    subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(3).height = 22;

    // Dòng 4: Khoảng đệm
    ws.getRow(4).height = 8;

    // Helper tạo dòng thông tin bộ lọc và người xuất
    const setMetaRow = (rowNum, c1, v1, c2Start, c2End, v2, c3, v3, c4Start, c4End, v4, c5, v5, c6Start, c6End, v6, isHighlight = false) => {
      const row = ws.getRow(rowNum);
      row.height = 22;

      const styleLabel = (cell, text) => {
        cell.value = text;
        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF475569' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.border = thinBorder;
      };

      const styleValue = (startCol, endCol, text, hl = false, hlColor = 'FF0F2744') => {
        if (startCol !== endCol) {
          ws.mergeCells(`${startCol}${rowNum}:${endCol}${rowNum}`);
        }
        const cell = ws.getCell(`${startCol}${rowNum}`);
        cell.value = text;
        cell.font = { name: 'Segoe UI', size: 9.5, bold: hl, color: { argb: hlColor } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        
        const startIdx = ws.getColumn(startCol).number;
        const endIdx = ws.getColumn(endCol).number;
        for (let i = startIdx; i <= endIdx; i++) {
          row.getCell(i).border = thinBorder;
        }
      };

      styleLabel(ws.getCell(`${c1}${rowNum}`), v1);
      styleValue(c2Start, c2End, v2);
      styleLabel(ws.getCell(`${c3}${rowNum}`), v3);
      styleValue(c4Start, c4End, v4);
      styleLabel(ws.getCell(`${c5}${rowNum}`), v5);
      styleValue(c6Start, c6End, v6, isHighlight, 'FF059669');
    };

    // Chuẩn bị thông tin metadata
    const exportTimeStr = formatDateTimeVN(new Date());
    const exporterName = req.user ? `${req.user.name || 'Admin'} (${req.user.email || ''})` : 'Quản trị viên hệ thống';
    const totalRecordsStr = `${logs.length} bản ghi`;

    const moduleText = moduleFilter && moduleFilter !== 'ALL' ? getModuleLabel(moduleFilter) : 'Tất cả phân hệ';
    const severityText = severity && severity !== 'ALL' ? severity : 'Tất cả mức độ';
    let dateRangeText = 'Toàn bộ thời gian';
    if (startDate && endDate) {
      dateRangeText = `${formatDateVN(startDate)} - ${formatDateVN(endDate)}`;
    } else if (startDate) {
      dateRangeText = `Từ ngày ${formatDateVN(startDate)}`;
    } else if (endDate) {
      dateRangeText = `Đến ngày ${formatDateVN(endDate)}`;
    }

    setMetaRow(5, 'A', 'Thời gian xuất:', 'B', 'C', exportTimeStr, 'E', 'Người xuất:', 'F', 'G', exporterName, 'I', 'Tổng bản ghi:', 'J', 'L', totalRecordsStr, true);
    setMetaRow(6, 'A', 'Phân hệ lọc:', 'B', 'C', moduleText, 'E', 'Mức cảnh báo:', 'F', 'G', severityText, 'I', 'Khoảng thời gian:', 'J', 'L', dateRangeText);

    // Dòng 7: Khoảng đệm trước bảng
    ws.getRow(7).height = 10;

    // Dòng 8: Tiêu đề các cột dữ liệu
    const headerRow = ws.getRow(8);
    headerRow.height = 30;
    const tableHeaders = [
      'STT',
      'Thời gian',
      'Người thực hiện',
      'Email',
      'Vai trò',
      'Phân hệ',
      'Hành động',
      'Mô tả chi tiết hoạt động',
      'Mức độ',
      'Đối tượng tác động',
      'Địa chỉ IP',
      'Trạng thái'
    ];

    tableHeaders.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F2744' } },
        bottom: { style: 'medium', color: { argb: 'FF0F2744' } },
        left: { style: 'thin', color: { argb: 'FF3B82F6' } },
        right: { style: 'thin', color: { argb: 'FF3B82F6' } }
      };
    });

    // Kích hoạt bộ lọc tự động của Excel trên dòng tiêu đề
    ws.autoFilter = 'A8:L8';

    // Dòng 9+: Đổ dữ liệu các bản ghi với định dạng chuẩn mực
    logs.forEach((log, index) => {
      const rowIdx = 9 + index;
      const row = ws.getRow(rowIdx);
      row.height = 26;

      const isEven = index % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      row.getCell(1).value = index + 1;
      row.getCell(2).value = formatDateTimeVN(log.createdAt);
      row.getCell(3).value = log.performerName || 'Hệ thống';
      row.getCell(4).value = log.performerEmail || '';
      row.getCell(5).value = getRoleLabel(log.performerRole);
      row.getCell(6).value = log.module || '';
      row.getCell(7).value = log.action || '';
      row.getCell(8).value = log.description || '';
      row.getCell(9).value = log.severity || 'INFO';
      row.getCell(10).value = log.targetLabel || log.targetId || log.targetModel || '—';
      row.getCell(11).value = log.ipAddress || '127.0.0.1';
      row.getCell(12).value = log.status === 'SUCCESS' ? 'Thành công' : 'Thất bại';

      // Thiết lập style cơ bản cho toàn bộ 12 ô của dòng
      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Tùy chỉnh căn lề và định dạng theo từng cột
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      row.getCell(4).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } };
      row.getCell(7).font = { name: 'Consolas', size: 9, color: { argb: 'FF334155' } };
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      row.getCell(10).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF334155' } };
      row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(11).font = { name: 'Consolas', size: 9, color: { argb: 'FF64748B' } };

      // Định dạng Huy hiệu mức độ cảnh báo (Severity Badge)
      const sevCell = row.getCell(9);
      sevCell.alignment = { vertical: 'middle', horizontal: 'center' };
      const sev = String(log.severity || '').toUpperCase();
      if (sev === 'CRITICAL') {
        sevCell.value = 'NGHIÊM TRỌNG';
        sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        sevCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
      } else if (sev === 'WARNING') {
        sevCell.value = 'CẢNH BÁO';
        sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        sevCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
      } else {
        sevCell.value = 'THÔNG TIN';
        sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        sevCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };
      }

      // Định dạng Huy hiệu trạng thái thực thi (Status Badge)
      const statCell = row.getCell(12);
      statCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (log.status === 'SUCCESS') {
        statCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        statCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF166534' } };
      } else {
        statCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        statCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
      }
    });

    // Dòng tổng kết ở chân bảng
    const lastRowIdx = 9 + logs.length;
    ws.mergeCells(`A${lastRowIdx}:L${lastRowIdx}`);
    const footerCell = ws.getCell(`A${lastRowIdx}`);
    footerCell.value = `✓ Báo cáo được trích xuất tự động từ Hệ thống Quản trị L'Amour Bookstore • Tổng cộng: ${logs.length} sự kiện kiểm toán`;
    footerCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
    footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    footerCell.border = {
      top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
    ws.getRow(lastRowIdx).height = 26;

    logActivity(req, {
      module: 'SYSTEM',
      action: 'AUDIT_LOG_EXPORT_EXCEL',
      severity: 'WARNING',
      description: `Xuất danh sách nhật ký hoạt động hệ thống ra file Excel .xlsx (${logs.length} bản ghi)`,
      metadata: {
        rowCount: logs.length,
        format: 'xlsx',
        filter: {
          search,
          module: moduleFilter,
          severity,
          startDate,
          endDate
        }
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `nhat-ky-hoat-dong-${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
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
  exportAuditLogsExcel: exportAuditLogsCsv,
  markAuditLogAsRead,
  markAllAuditLogsAsRead
};
