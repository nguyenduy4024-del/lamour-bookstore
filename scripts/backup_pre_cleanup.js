const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function backupSnapshot() {
  console.log('🔄 Đang tiến hành sao lưu snapshot 4 bảng cũ trước khi dọn dẹp...');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    const backupDir = path.join(__dirname, '../backups/pre_cleanup_snapshot');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const tables = ['books', 'invoices', 'importreceipts', 'transactions'];
    const summary = {};

    for (const tbl of tables) {
      const docs = await db.collection(tbl).find().toArray();
      const filePath = path.join(backupDir, `${tbl}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      summary[tbl] = docs.length;
      console.log(`  ✓ Đã sao lưu bảng ${tbl}: ${docs.length} docs -> ${filePath}`);
    }

    fs.writeFileSync(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify({ timestamp: new Date(), summary }, null, 2),
      'utf-8'
    );

    console.log('✅ SAO LƯU DỰ PHÒNG HOÀN TẤT AN TOÀN 100%!');
  } catch (err) {
    console.error('❌ Lỗi khi sao lưu snapshot:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

backupSnapshot();
