const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

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