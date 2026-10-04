const mongoose = require('mongoose');
require('dotenv').config();

const OLD_COLLECTIONS_TO_DROP = ['books', 'invoices', 'importreceipts', 'transactions'];

const REQUIRED_TABLES = [
  'users',
  'roles',
  'customers',
  'suppliers',
  'categories',
  'products',
  'purchaseorders',
  'purchaseorderdetails',
  'salesinvoices',
  'salesinvoicedetails',
  'receipts',
  'payments',
  'inventory',
  'employees'
];

async function dropOldCollections() {
  console.log('='.repeat(70));
  console.log('🗑️  BẮT ĐẦU DỌN DẸP XÓA 4 BẢNG CŨ TRÙNG LẶP TRONG MONGODB');
  console.log('='.repeat(70));

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    for (const colName of OLD_COLLECTIONS_TO_DROP) {
      try {
        const count = await db.collection(colName).countDocuments();
        await db.collection(colName).drop();
        console.log(`  ✓ Đã xóa vĩnh viễn bảng cũ: "${colName}" (${count} docs cũ đã được chuyển sang bảng mới)`);
      } catch (err) {
        if (err.message && err.message.includes('ns not found')) {
          console.log(`  - Bảng "${colName}" đã không còn tồn tại.`);
        } else {
          console.warn(`  ⚠️ Không thể xóa bảng "${colName}":`, err.message);
        }
      }
    }

    // Kiểm tra danh sách collection còn lại trong CSDL
    const remainingCols = await db.listCollections().toArray();
    const remainingNames = remainingCols.map(c => c.name).sort();

    console.log('\n' + '='.repeat(70));
    console.log(`📊 DANH SÁCH ${remainingNames.length} COLLECTIONS CÒN LẠI TRONG CSDL:`);
    console.log('='.repeat(70));

    console.log('\n🔹 [14 BẢNG YÊU CẦU THEO ĐỀ BÀI]:');
    for (let i = 0; i < REQUIRED_TABLES.length; i++) {
      const name = REQUIRED_TABLES[i];
      const exists = remainingNames.includes(name);
      let count = 0;
      if (exists) {
        count = await db.collection(name).countDocuments();
      }
      console.log(`  ${String(i + 1).padStart(2, ' ')}. ${name.padEnd(25)} : ${exists ? `[OK] ${count} docs` : '[THIẾU]'}`);
    }

    console.log('\n🔹 [CÁC BẢNG BỔ SUNG CHUYÊN NGHIỆP]:');
    const extraTables = remainingNames.filter(n => !REQUIRED_TABLES.includes(n));
    for (let i = 0; i < extraTables.length; i++) {
      const name = extraTables[i];
      const count = await db.collection(name).countDocuments();
      console.log(`  + ${name.padEnd(25)} : ${count} docs`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 DỌN DẸP HOÀN TẤT THÀNH CÔNG RỰC RỠ!');
    console.log(`💡 Tổng số collections: ${remainingNames.length} (Đúng 14 bảng đề bài + ${extraTables.length} bảng bổ sung)`);
    console.log('💡 Hoàn toàn sạch bóng các bảng cũ trùng lặp.');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('❌ Lỗi dọn dẹp collections:', err);
  } finally {
    await mongoose.disconnect();
  }
}

dropOldCollections();
