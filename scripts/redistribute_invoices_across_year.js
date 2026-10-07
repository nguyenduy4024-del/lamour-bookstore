const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/lamour_bookstore';
const ATLAS_URI = 'mongodb+srv://nguyenduy4024_db_user:GJyUD87yMg11Sk7B@lamour-bookstore.7ewktff.mongodb.net/lamour_bookstore?retryWrites=true&w=majority&appName=lamour-bookstore';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDateInMonth(year, month, maxDay) {
  const day = randomInt(1, maxDay);
  const hour = randomInt(8, 21);
  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);
  const d = new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second)); // GMT+7
  return d;
}

async function processDb(conn, label) {
  console.log(`\n==================================================`);
  console.log(`🔄 Đang phân bổ doanh thu 10 tháng năm 2026 trên ${label}...`);
  console.log(`==================================================`);

  const db = conn.db;

  const completed = await db.collection('salesinvoices')
    .find({ status: 'completed' })
    .sort({ _id: 1 })
    .toArray();

  console.log(`📊 Tổng số hóa đơn hoàn thành tìm thấy: ${completed.length}`);

  // Phân biệt đơn test thật của người dùng (ngày 06-07/10/2026) vs đơn hệ thống
  const manualOrders = completed.filter(inv => {
    const isManualCode = !/^HD-(POS|OL)-2026(09|10)/.test(inv.invoiceCode);
    const isRecentDate = new Date(inv.createdAt) >= new Date('2026-10-06T00:00:00Z');
    return isManualCode || isRecentDate;
  });

  const generatedOrders = completed.filter(inv => !manualOrders.includes(inv));

  console.log(`   + Đơn test thật của người dùng (giữ nguyên): ${manualOrders.length}`);
  console.log(`   + Đơn hệ thống sẽ chia đều khắp 10 tháng:    ${generatedOrders.length}`);

  // Cấu hình phân bổ 10 tháng năm 2026 với biểu đồ tăng trưởng thực tế, đẹp mắt
  const monthDistribution = [
    { month: 1,  days: 31, count: 88,  label: 'Tháng 01/2026' },
    { month: 2,  days: 28, count: 95,  label: 'Tháng 02/2026' },
    { month: 3,  days: 31, count: 102, label: 'Tháng 03/2026' },
    { month: 4,  days: 30, count: 108, label: 'Tháng 04/2026' },
    { month: 5,  days: 31, count: 115, label: 'Tháng 05/2026' },
    { month: 6,  days: 30, count: 122, label: 'Tháng 06/2026' },
    { month: 7,  days: 31, count: 128, label: 'Tháng 07/2026' },
    { month: 8,  days: 31, count: 135, label: 'Tháng 08/2026' },
    { month: 9,  days: 30, count: 142, label: 'Tháng 09/2026' },
    { month: 10, days: 5,  count: 134, label: 'Tháng 10/2026' }
  ];

  const totalDist = monthDistribution.reduce((acc, m) => acc + m.count, 0);
  if (totalDist !== generatedOrders.length) {
    throw new Error(`Số lượng đơn không khớp! Phân bổ: ${totalDist}, Thực tế: ${generatedOrders.length}`);
  }

  const invoiceBulkOps = [];
  const detailBulkOps = [];
  const receiptBulkOps = [];

  let orderIdx = 0;
  for (const m of monthDistribution) {
    const monthStr = String(m.month).padStart(2, '0');

    for (let i = 0; i < m.count; i++) {
      const inv = generatedOrders[orderIdx++];
      const newDate = getRandomDateInMonth(2026, m.month, m.days);
      const oldCode = inv.invoiceCode;

      // Đổi mã hóa đơn khớp với tháng mới (ví dụ HD-POS-202609-12345 -> HD-POS-202601-12345)
      let newCode = oldCode;
      if (/^HD-(POS|OL)-2026\d{2}-/.test(oldCode)) {
        newCode = oldCode.replace(/^HD-(POS|OL)-2026\d{2}-/, `HD-$1-2026${monthStr}-`);
      }

      // 1. Cập nhật hóa đơn
      invoiceBulkOps.push({
        updateOne: {
          filter: { _id: inv._id },
          update: {
            $set: {
              createdAt: newDate,
              updatedAt: newDate,
              invoiceCode: newCode
            }
          }
        }
      });

      // 2. Cập nhật chi tiết hóa đơn
      detailBulkOps.push({
        updateMany: {
          filter: { salesInvoiceId: inv._id },
          update: {
            $set: {
              createdAt: newDate,
              invoiceCode: newCode
            }
          }
        }
      });

      // 3. Cập nhật phiếu thu tương ứng
      receiptBulkOps.push({
        updateOne: {
          filter: {
            $or: [
              { attached: `Hóa đơn bán hàng ${oldCode}` },
              { description: `Thu tiền bán sách đơn hàng ${oldCode}` },
              { attached: `Hóa đơn bán hàng ${newCode}` },
              { description: `Thu tiền bán sách đơn hàng ${newCode}` }
            ]
          },
          update: {
            $set: {
              createdAt: newDate,
              updatedAt: newDate,
              attached: `Hóa đơn bán hàng ${newCode}`,
              description: `Thu tiền bán sách đơn hàng ${newCode}`
            }
          }
        }
      });
    }
  }

  console.log(`📦 Đang lưu ${invoiceBulkOps.length} hóa đơn, chi tiết & phiếu thu vào CSDL...`);

  // Thực thi theo lô 500 ops
  const chunkSize = 500;
  for (let i = 0; i < invoiceBulkOps.length; i += chunkSize) {
    await db.collection('salesinvoices').bulkWrite(invoiceBulkOps.slice(i, i + chunkSize));
  }
  for (let i = 0; i < detailBulkOps.length; i += chunkSize) {
    await db.collection('salesinvoicedetails').bulkWrite(detailBulkOps.slice(i, i + chunkSize));
  }
  for (let i = 0; i < receiptBulkOps.length; i += chunkSize) {
    await db.collection('receipts').bulkWrite(receiptBulkOps.slice(i, i + chunkSize));
  }

  console.log(`✅ Đã phân bổ thành công trên ${label}!`);

  // Kiểm tra lại kết quả
  const timelineResult = await db.collection('salesinvoices').aggregate([
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

  console.log(`\n📈 BIỂU ĐỒ DOANH THU 10 THÁNG MỚI TRÊN ${label}:`);
  timelineResult.forEach(t => {
    console.log(`   ${t._id}: ${t.revenue.toLocaleString('vi-VN')} đ (${t.count} đơn)`);
  });

  const totalRev = timelineResult.reduce((sum, t) => sum + t.revenue, 0);
  const totalOrders = timelineResult.reduce((sum, t) => sum + t.count, 0);
  console.log(`💰 TỔNG CỘNG: ${totalRev.toLocaleString('vi-VN')} đ | ${totalOrders} đơn hoàn thành.`);
}

async function run() {
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  await processDb(atlasConn, 'MongoDB Atlas');
  await atlasConn.close();

  try {
    const localConn = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 3000 }).asPromise();
    await processDb(localConn, 'Local MongoDB');
    await localConn.close();
  } catch (_) {
    console.log('ℹ️ Local MongoDB không khả dụng, bỏ qua.');
  }

  console.log('\n🎉 TOÀN BỘ DOANH THU ĐÃ ĐƯỢC CHIA THÀNH 10 THÁNG NĂM 2026 THÀNH CÔNG RỰC RỠ!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
