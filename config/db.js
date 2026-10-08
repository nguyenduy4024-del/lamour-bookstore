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

    // Tự động khởi tạo và chuẩn hóa các tài khoản nhân viên / admin / kho / kế toán
    try {
      const User = require('../models/User');
      const defaultAccounts = [
        { name: 'Nhân viên Bán hàng (Sales)', email: 'sales@lamour.vn', phone: '0902999001', password: 'password123', role: 'staff', isActive: true, status: 'active' },
        { name: 'Thủ kho (Kho)', email: 'kho@lamour.vn', phone: '0902999002', password: 'password123', role: 'stock', isActive: true, status: 'active' },
        { name: 'Kế toán trưởng (Kế toán)', email: 'ketoan@lamour.vn', phone: '0902999003', password: 'password123', role: 'accountant', isActive: true, status: 'active' },
        { name: 'Quản trị viên (Admin)', email: 'admin@lamour.vn', phone: '0902999004', password: 'password123', role: 'admin', isActive: true, status: 'active' },
        { name: 'Khách hàng Thử nghiệm', email: 'customer@gmail.com', phone: '0902999005', password: 'password123', role: 'user', isActive: true, status: 'active' }
      ];
      for (const acc of defaultAccounts) {
        const exist = await User.findOne({ email: acc.email });
        if (!exist) {
          await User.create(acc);
        }
      }
    } catch (accErr) {
      console.warn('[DB Init] Lỗi đồng bộ tài khoản mặc định:', accErr.message);
    }
  } catch (error) {
    console.error(`Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;