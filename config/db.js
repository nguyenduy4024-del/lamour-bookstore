const mongoose = require('mongoose');
const dns = require('dns');

// Thiết lập DNS dự phòng để đảm bảo kết nối SRV tới MongoDB Atlas không bị chặn trên Windows/Router
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 30,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    // Tự động kiểm tra và ánh xạ sách cũ vào kệ thực tế (Auto Migration)
    try {
      const { autoMigrateShelvesAndBooks } = require('../utils/shelfHelper');
      await autoMigrateShelvesAndBooks();
    } catch (migErr) {
      console.warn('[DB Init] Lỗi khởi tạo/đồng bộ kệ sách:', migErr.message);
    }
  } catch (error) {
    console.error(`Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;