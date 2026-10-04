const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/lamour_bookstore';
const ATLAS_URI = 'mongodb+srv://nguyenduy4024_db_user:GJyUD87yMg11Sk7B@lamour-bookstore.7ewktff.mongodb.net/lamour_bookstore?retryWrites=true&w=majority&appName=lamour-bookstore';

async function migrate() {
  console.log('📡 Đang kết nối tới CSDL Local và MongoDB Atlas...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();

  const collections = await localConn.db.listCollections().toArray();
  console.log(`📦 Tìm thấy ${collections.length} collections trong máy tính của bạn.\n`);

  for (const col of collections) {
    const colName = col.name;
    if (colName.startsWith('system.')) continue;

    const localCol = localConn.db.collection(colName);
    const atlasCol = atlasConn.db.collection(colName);

    const docs = await localCol.find({}).toArray();
    if (docs.length === 0) continue;

    console.log(`⏳ Đang chuyển collection [${colName}]: ${docs.length} bản ghi...`);

    // Xóa sạch dữ liệu mẫu cũ trên Atlas trước khi nạp dữ liệu thật từ máy tính
    await atlasCol.deleteMany({});
    await atlasCol.insertMany(docs);
    console.log(`   ✅ Đã đồng bộ [${colName}] (${docs.length} bản ghi) lên Atlas!`);
  }

  console.log('\n🎉 ĐỒNG BỘ 100% TOÀN BỘ SÁCH VÀ DỮ LIỆU THẬT TỪ MÁY LÊN ATLAS THÀNH CÔNG!');
  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Lỗi đồng bộ:', err);
  process.exit(1);
});
