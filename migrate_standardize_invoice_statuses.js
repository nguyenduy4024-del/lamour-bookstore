const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');

async function migrateStatuses() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lamour_bookstore');
    console.log('✅ Đã kết nối MongoDB thành công.');

    // 1. Chuyển unpaid, overdue, pending -> pending_payment
    const r1 = await Invoice.updateMany(
      { status: { $in: ['unpaid', 'overdue', 'pending'] } },
      { $set: { status: 'pending_payment' } }
    );
    console.log(`✅ [Chờ xác nhận] Đã chuẩn hóa ${r1.modifiedCount} đơn (unpaid/overdue/pending) sang 'pending_payment'`);

    // 2. Chuyển processing -> delivering (Đang chuẩn bị hàng)
    const r2 = await Invoice.updateMany(
      { status: 'processing' },
      { $set: { status: 'delivering' } }
    );
    console.log(`✅ [Đang chuẩn bị] Đã chuẩn hóa ${r2.modifiedCount} đơn (processing) sang 'delivering'`);

    // 3. Chuyển paid, delivered -> completed (Hoàn thành)
    const r3 = await Invoice.updateMany(
      { status: { $in: ['paid', 'delivered'] } },
      { $set: { status: 'completed', paymentStatus: 'paid' } }
    );
    console.log(`✅ [Hoàn thành] Đã chuẩn hóa ${r3.modifiedCount} đơn (paid/delivered) sang 'completed'`);

    // 4. Chuyển shipped -> shipping (Đang giao hàng)
    const r4 = await Invoice.updateMany(
      { status: 'shipped' },
      { $set: { status: 'shipping' } }
    );
    console.log(`✅ [Đang giao hàng] Đã chuẩn hóa ${r4.modifiedCount} đơn (shipped) sang 'shipping'`);

    // 5. Thống kê lại toàn bộ số lượng theo trạng thái chuẩn
    const stats = await Invoice.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('\n📊 THỐNG KÊ SAU KHI CHUẨN HÓA:');
    let total = 0;
    stats.forEach(s => {
      console.log(`- Trạng thái '${s._id}': ${s.count} đơn`);
      total += s.count;
    });
    console.log(`=> TỔNG CỘNG: ${total} đơn`);

    await mongoose.disconnect();
    console.log('🎉 Hoàn tất chuẩn hóa dữ liệu trạng thái đơn hàng!');
  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    process.exit(1);
  }
}

migrateStatuses();
