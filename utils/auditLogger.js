const AuditLog = require('../models/AuditLog');

/**
 * Trích xuất địa chỉ IP thực từ request
 */
function extractClientIp(req) {
  if (!req) return '127.0.0.1';
  let ip = (req.headers && req.headers['x-forwarded-for']) || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  if (typeof ip === 'string') {
    ip = ip.split(',')[0].trim();
    if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  }
  return ip;
}

/**
 * Tạo danh sách diff thay đổi giữa object cũ và mới
 * @param {Object} oldObj 
 * @param {Object} newObj 
 * @param {Object} fieldsMap Key: tên trường, Value: nhãn tiếng Việt
 */
function calculateDiff(oldObj = {}, newObj = {}, fieldsMap = {}) {
  const diffs = [];
  if (!oldObj || !newObj) return diffs;

  for (const [key, label] of Object.entries(fieldsMap)) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    // So sánh chuỗi/giá trị cơ bản hoặc JSON
    const oldStr = typeof oldVal === 'object' && oldVal !== null ? JSON.stringify(oldVal) : String(oldVal ?? '');
    const newStr = typeof newVal === 'object' && newVal !== null ? JSON.stringify(newVal) : String(newVal ?? '');

    if (oldStr !== newStr) {
      diffs.push({
        field: key,
        fieldLabel: label || key,
        oldValue: oldVal ?? null,
        newValue: newVal ?? null
      });
    }
  }
  return diffs;
}

/**
 * Ghi nhật ký hoạt động hệ thống (Non-blocking & Safe)
 * @param {Object} req Express request object
 * @param {Object} options Thông tin log
 */
async function logActivity(req, options = {}) {
  try {
    const user = req?.user || null;
    const ipAddress = extractClientIp(req);
    const userAgent = req?.headers?.['user-agent'] || 'System/Internal';

    const logEntry = new AuditLog({
      performedBy: user?._id || options.performedBy || null,
      performerName: user?.name || options.performerName || 'Hệ thống',
      performerEmail: user?.email || options.performerEmail || '',
      performerRole: user?.role || options.performerRole || 'system',
      module: options.module || 'SYSTEM',
      action: options.action || 'UNKNOWN_ACTION',
      description: options.description || 'Thực hiện tác vụ hệ thống',
      severity: options.severity || 'INFO',
      status: options.status || 'SUCCESS',
      targetId: String(options.targetId || ''),
      targetModel: options.targetModel || '',
      targetLabel: options.targetLabel || '',
      diff: options.diff || [],
      ipAddress,
      userAgent,
      metadata: options.metadata || {}
    });

    // Lưu bất đồng bộ, không chờ đợi block request
    await logEntry.save();
    return logEntry;
  } catch (err) {
    // Chỉ ghi console log, không ném lỗi làm gián đoạn luồng chính
    console.error('⚠️ [AuditLog Error]:', err.message);
    return null;
  }
}

module.exports = {
  logActivity,
  calculateDiff,
  extractClientIp
};
