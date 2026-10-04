const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db');
const Invoice = require('../models/Invoice');

dotenv.config({ path: path.join(__dirname, '../.env') });

const updateInvoiceTimes = async () => {
  try {
    console.log('📡 Đang kết nối Cơ sở dữ liệu...');
    await connectDB();

    console.log('🔄 Đang cập nhật lại thời gian ngẫu nhiên cho tất cả hóa đơn...');
    const invoices = await Invoice.find({});

    for (const inv of invoices) {
      const currentDate = inv.createdAt ? new Date(inv.createdAt) : new Date();
      const randomHour = 8 + Math.floor(Math.random() * 14); // 08:00 - 21:00
      const randomMinute = Math.floor(Math.random() * 60);
      const randomSecond = Math.floor(Math.random() * 60);

      currentDate.setHours(randomHour, randomMinute, randomSecond, Math.floor(Math.random() * 1000));

      await Invoice.updateOne(
        { _id: inv._id },
        { 
          $set: { 
            createdAt: currentDate,
            updatedAt: currentDate
          } 
        }
      );
    }

    console.log(`✅ Đã cập nhật thành công thời gian cho ${invoices.length} đơn hàng!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi cập nhật thời gian hóa đơn:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  updateInvoiceTimes();
} else {
  module.exports = updateInvoiceTimes;
}
