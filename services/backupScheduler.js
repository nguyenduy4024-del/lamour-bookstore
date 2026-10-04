const Setting = require('../models/Setting');
const { createBackup, cleanOldBackups } = require('./backupService');

let schedulerInterval = null;
let lastRanDateStr = '';

/**
 * Khởi động tiến trình lập lịch sao lưu tự động định kỳ
 */
function initBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  // Kiểm tra mỗi 60 giây
  schedulerInterval = setInterval(async () => {
    try {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = now.toISOString().slice(0, 10);

      // Đọc cấu hình từ Database
      const setting = await Setting.findOne().lean();
      const config = setting?.backupConfig || {
        autoBackup: true,
        scheduleTime: '02:00',
        retentionDays: 30,
        scope: 'FULL'
      };

      if (!config.autoBackup) {
        return; // Đang tắt chế độ tự động
      }

      const targetTime = config.scheduleTime || '02:00';

      // Nếu đến giờ mục tiêu và hôm nay chưa chạy
      if (currentTimeStr === targetTime && lastRanDateStr !== todayStr) {
        lastRanDateStr = todayStr;
        console.log(`🚀 [Backup Scheduler] Đang thực thi sao lưu tự động định kỳ (${currentTimeStr})...`);

        try {
          const result = await createBackup({
            scope: config.scope || 'FULL',
            backupType: 'SCHEDULED',
            note: `Tự động sao lưu định kỳ hàng ngày lúc ${currentTimeStr}`
          });
          console.log(`✅ [Backup Scheduler] Sao lưu thành công: ${result.fileName} (${(result.fileSize / 1024 / 1024).toFixed(2)} MB)`);

          // Dọn dẹp các bản sao lưu cũ quá hạn
          const retentionDays = config.retentionDays || 30;
          await cleanOldBackups(retentionDays);
        } catch (execErr) {
          console.error('❌ [Backup Scheduler] Lỗi khi thực thi sao lưu tự động:', execErr.message);
        }
      }
    } catch (err) {
      // Bỏ qua lỗi kết nối tạm thời
    }
  }, 60000); // 1 phút kiểm tra 1 lần
}

module.exports = {
  initBackupScheduler
};
