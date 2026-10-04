const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function restoreSnapshot() {
  console.log('🔄 Đang tiến hành khôi phục 4 bảng cũ từ snapshot...');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    const backupDir = path.join(__dirname, '../backups/pre_cleanup_snapshot');
    const tables = ['books', 'invoices', 'importreceipts', 'transactions'];

    for (const tbl of tables) {
      const filePath = path.join(backupDir, `${tbl}.json`);
      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️ Không tìm thấy file sao lưu: ${filePath}`);
        continue;
      }
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const docs = JSON.parse(rawData);

      // Re-hydrate ObjectIds and Dates
      const cleanDocs = docs.map(doc => {
        const copy = { ...doc };
        if (copy._id && typeof copy._id === 'string' && copy._id.length === 24) {
          copy._id = new mongoose.Types.ObjectId(copy._id);
        }
        return copy;
      });

      await db.collection(tbl).drop().catch(() => {});
      if (cleanDocs.length > 0) {
        await db.collection(tbl).insertMany(cleanDocs);
      }
      console.log(`  ✓ Đã phục hồi bảng ${tbl}: ${cleanDocs.length} docs`);
    }

    console.log('✅ KHÔI PHỤC 4 BẢNG HOÀN TẤT THÀNH CÔNG!');
  } catch (err) {
    console.error('❌ Lỗi khi khôi phục snapshot:', err);
  } finally {
    await mongoose.disconnect();
  }
}

restoreSnapshot();
