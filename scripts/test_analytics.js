const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}
const mongoose = require('mongoose');

const ATLAS_URI = 'mongodb+srv://nguyenduy4024_db_user:GJyUD87yMg11Sk7B@lamour-bookstore.7ewktff.mongodb.net/lamour_bookstore?retryWrites=true&w=majority&appName=lamour-bookstore';

async function test() {
  const conn = await mongoose.createConnection(ATLAS_URI).asPromise();
  const Invoice = conn.collection('salesinvoices');

  const totalOrders = await Invoice.countDocuments({ status: { $ne: 'cancelled' } });
  const completedCount = await Invoice.countDocuments({ status: { $in: ['completed', 'paid'] } });

  const revAgg = await Invoice.aggregate([
    { $match: { status: { $in: ['completed', 'paid'] } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, finalRevenue: { $sum: '$finalAmount' } } }
  ]).toArray();

  console.log('Tổng đơn hàng (trừ hủy):', totalOrders);
  console.log('Số đơn hoàn thành:', completedCount);
  console.log('Tổng doanh thu thực tế:', revAgg[0]?.totalRevenue);
  console.log('Tổng doanh thu thuần:', revAgg[0]?.finalRevenue);

  const timelineAgg = await Invoice.aggregate([
    { $match: { status: { $in: ['completed', 'paid'] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+07:00' } },
        revenue: { $sum: '$finalAmount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray();

  console.log('\nBiến động Doanh thu theo 10 tháng năm 2026:');
  timelineAgg.forEach(t => {
    console.log(`  ${t._id}: ${t.revenue.toLocaleString('vi-VN')} đ (${t.count} đơn)`);
  });

  const timelineSum = timelineAgg.reduce((sum, t) => sum + t.revenue, 0);
  console.log('\nTổng doanh thu cộng dồn từ Timeline:', timelineSum.toLocaleString('vi-VN'), 'đ');
  console.log('Khớp 100% với Doanh thu thuần:', timelineSum === revAgg[0]?.finalRevenue ? 'CHÍNH XÁC 100%!' : 'LỆCH');

  await conn.close();
  process.exit(0);
}

test().catch(console.error);
