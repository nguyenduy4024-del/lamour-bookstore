const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/lamour_bookstore';
const ATLAS_URI = 'mongodb+srv://nguyenduy4024_db_user:GJyUD87yMg11Sk7B@lamour-bookstore.7ewktff.mongodb.net/lamour_bookstore?retryWrites=true&w=majority&appName=lamour-bookstore';

const defaultAddresses = [
  '456 Lê Duẩn, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  '123 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  '45 Võ Thị Sáu, P. Đa Kao, Quận 1, TP. Hồ Chí Minh',
  '86 Nguyễn Thị Minh Khai, P.6, Quận 3, TP. Hồ Chí Minh',
  '156 Cách Mạng Tháng 8, P.10, Quận 3, TP. Hồ Chí Minh',
  '289 Nam Kỳ Khởi Nghĩa, P.7, Quận 3, TP. Hồ Chí Minh',
  '34 Phan Xích Long, P.2, Phú Nhuận, TP. Hồ Chí Minh',
  '89 Nguyễn Văn Trỗi, P.12, Phú Nhuận, TP. Hồ Chí Minh',
  '12 Quang Trung, P.10, Gò Vấp, TP. Hồ Chí Minh',
  '68 Cầu Giấy, P. Quan Hoa, Cầu Giấy, Hà Nội',
  '112 Trần Duy Hưng, Trung Hòa, Cầu Giấy, Hà Nội',
  '25 Phố Huế, Hàng Bài, Hoàn Kiếm, Hà Nội',
  '48 Tràng Thi, Hàng Bông, Hoàn Kiếm, Hà Nội',
  '205 Nguyễn Tri Phương, P.9, Quận 5, TP. Hồ Chí Minh',
  '142 Hai Bà Trưng, P. Đa Kao, Quận 1, TP. Hồ Chí Minh',
  '73 Nguyễn Trãi, P. Bến Thành, Quận 1, TP. Hồ Chí Minh',
  '350 Hoàng Văn Thụ, P.4, Tân Bình, TP. Hồ Chí Minh',
  '91 Cộng Hòa, P.4, Tân Bình, TP. Hồ Chí Minh',
  '55 Bạch Đằng, P. Thạch Thang, Hải Châu, Đà Nẵng',
  '102 Lê Duẩn, Hải Châu, Đà Nẵng',
  '38 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng',
  '15 Đinh Tiên Hoàng, Hàng Bạc, Hoàn Kiếm, Hà Nội',
  '88 Xã Đàn, Phương Liên, Đống Đa, Hà Nội',
  '134 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội',
  '62 Thái Hà, Trung Liệt, Đống Đa, Hà Nội',
  '220 Đường 3/2, P.12, Quận 10, TP. Hồ Chí Minh',
  '180 Sư Vạn Hạnh, P.9, Quận 10, TP. Hồ Chí Minh',
  '79 Lý Thường Kiệt, P.7, Tân Bình, TP. Hồ Chí Minh',
  '154 Phan Đăng Lưu, P.3, Phú Nhuận, TP. Hồ Chí Minh',
  '93 Hoàng Diệu, P.12, Quận 4, TP. Hồ Chí Minh',
  '47 Nguyễn Hữu Thọ, Tân Hưng, Quận 7, TP. Hồ Chí Minh',
  '105 Huỳnh Tấn Phát, Tân Thuận Đông, Quận 7, TP. Hồ Chí Minh',
  '320 Võ Văn Ngân, Bình Thọ, TP. Thủ Đức, TP.HCM',
  '84 Đặng Văn Bi, Bình Thọ, TP. Thủ Đức, TP.HCM',
  '215 Kha Vạn Cân, Linh Trung, TP. Thủ Đức, TP.HCM',
  '50 Kim Mã, Ngọc Khánh, Ba Đình, Hà Nội',
  '76 Giảng Võ, Cát Linh, Đống Đa, Hà Nội',
  '19 Liễu Giai, Cống Vị, Ba Đình, Hà Nội',
  '82 Đội Cấn, Ba Đình, Hà Nội',
  '120 Nguyễn Lương Bằng, Nam Đồng, Đống Đa, Hà Nội',
  '41 Phố Vọng, Đồng Tâm, Hai Bà Trưng, Hà Nội',
  '98 Bạch Mai, Cầu Dền, Hai Bà Trưng, Hà Nội',
  '165 Bà Triệu, Lê Đại Hành, Hai Bà Trưng, Hà Nội',
  '29 Tràng Tiền, Hoàn Kiếm, Hà Nội',
  '64 Hàng Bông, Hàng Gai, Hoàn Kiếm, Hà Nội',
  '85 Nguyễn Chí Thanh, Láng Thượng, Đống Đa, Hà Nội',
  '172 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
  '53 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội',
  '110 Nguyễn Phong Sắc, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
  '31 Nguyễn Trãi, Thanh Xuân Bắc, Thanh Xuân, Hà Nội'
];

async function processDb(conn, label) {
  console.log(`\n======================================================`);
  console.log(`🚀 Đang liên kết đơn hàng vào Khách Hàng & CRM trên ${label}...`);
  console.log(`======================================================`);

  const db = conn.db;

  // 1. Sửa 2 hóa đơn có ngày 1970
  await db.collection('salesinvoices').updateOne(
    { invoiceCode: 'HD-OL-202610-18607' },
    { $set: { createdAt: new Date('2026-10-02T09:15:00.000Z'), updatedAt: new Date('2026-10-02T09:15:00.000Z') } }
  );
  await db.collection('salesinvoices').updateOne(
    { invoiceCode: 'HD-OL-202610-18609' },
    { $set: { createdAt: new Date('2026-10-04T14:30:00.000Z'), updatedAt: new Date('2026-10-04T14:30:00.000Z') } }
  );

  // 2. Lấy danh sách 64 khách hàng
  const users = await db.collection('users').find({
    $or: [
      { role: 'user' },
      { role: { $exists: false } },
      { role: { $nin: ['admin', 'staff', 'stock', 'accountant'] } }
    ]
  }).toArray();

  console.log(`👥 Tìm thấy ${users.length} tài khoản khách hàng.`);

  // Cập nhật địa chỉ hợp lệ cho các khách hàng chưa có địa chỉ
  const userBulkUpdates = [];
  users.forEach((u, idx) => {
    let existingAddr = (u.addresses && u.addresses[0]?.detailAddress) || u.address || '';
    if (!existingAddr || existingAddr.trim() === 'N/A' || existingAddr.trim() === '') {
      existingAddr = defaultAddresses[idx % defaultAddresses.length];
      u.address = existingAddr;
      u.addresses = [{ detailAddress: existingAddr, isDefault: true }];
      userBulkUpdates.push({
        updateOne: {
          filter: { _id: u._id },
          update: {
            $set: {
              address: existingAddr,
              addresses: [{ detailAddress: existingAddr, isDefault: true }]
            }
          }
        }
      });
    } else {
      u.address = existingAddr;
    }
  });

  if (userBulkUpdates.length > 0) {
    await db.collection('users').bulkWrite(userBulkUpdates);
    console.log(`📍 Đã cập nhật địa chỉ chuẩn xác cho ${userBulkUpdates.length} khách hàng.`);
  }

  // 3. Lấy toàn bộ đơn hàng
  const allInvoices = await db.collection('salesinvoices').find({}).sort({ createdAt: 1 }).toArray();

  // Đơn online (bỏ qua đơn test của nguyễn anh tiến vừa tạo hôm nay)
  const onlineInvoices = allInvoices.filter(i => i.orderType === 'online' && i.invoiceCode !== 'HD-OL-146119');
  // Đơn offline (bỏ qua 3 đơn test POS của khách lẻ hôm nay)
  const posInvoices = allInvoices.filter(i => i.orderType !== 'online' && !['HD-76676144', 'HD-60942231', 'HD-65881181'].includes(i.invoiceCode));

  console.log(`📦 Đơn Online cần gán: ${onlineInvoices.length} | Đơn POS có sẵn: ${posInvoices.length}`);

  // Phân loại đơn online theo 10 tháng năm 2026 (GMT+7)
  const monthlyOnline = {};
  for (let m = 1; m <= 10; m++) monthlyOnline[m] = [];

  onlineInvoices.forEach(inv => {
    const d = new Date(inv.createdAt);
    const m = new Date(d.getTime() + 7 * 3600000).getUTCMonth() + 1;
    if (monthlyOnline[m]) monthlyOnline[m].push(inv);
    else monthlyOnline[10].push(inv);
  });

  // Phân bổ đơn hàng cho từng khách hàng
  const userInvoicesMap = new Map();
  users.forEach(u => userInvoicesMap.set(u._id.toString(), []));

  // Tỷ lệ xuất hiện của khách theo cấp bậc:
  // VIP (0..7): mua hàng tháng nào cũng mua (1-3 đơn/tháng)
  // Thân thiết Vàng (8..21): mua 8-9 trên 10 tháng
  // Thân thiết Bạc (22..43): mua 6-8 trên 10 tháng
  // Tiêu chuẩn (44..63): mua 3-6 trên 10 tháng
  for (let m = 1; m <= 10; m++) {
    const monthOrders = monthlyOnline[m];
    if (!monthOrders || monthOrders.length === 0) continue;

    const candidateIndices = [];
    users.forEach((u, i) => {
      let prob = 0.45;
      if (i < 8) prob = 1.0;
      else if (i < 22) prob = 0.85;
      else if (i < 44) prob = 0.65;
      else prob = 0.45;

      if (Math.random() < prob) {
        candidateIndices.push(i);
        if (i < 8) {
          candidateIndices.push(i); // VIP tăng gấp đôi cơ hội nhận đơn
          candidateIndices.push(i);
        } else if (i < 22) {
          candidateIndices.push(i);
        }
      }
    });

    // Shuffle candidateIndices
    for (let s = candidateIndices.length - 1; s > 0; s--) {
      const r = Math.floor(Math.random() * (s + 1));
      [candidateIndices[s], candidateIndices[r]] = [candidateIndices[r], candidateIndices[s]];
    }

    monthOrders.forEach((inv, idx) => {
      const uIdx = candidateIndices[idx % candidateIndices.length];
      const u = users[uIdx];
      userInvoicesMap.get(u._id.toString()).push(inv);
    });
  }

  // Thêm khoảng 130 đơn POS thành viên cho các khách hàng VIP & Thân thiết (mua tại quầy tích điểm)
  const memberPosInvoices = posInvoices.slice(0, 130);
  memberPosInvoices.forEach((inv, idx) => {
    const uIdx = idx % 35; // 35 khách hàng đầu tiên
    const u = users[uIdx];
    userInvoicesMap.get(u._id.toString()).push(inv);
  });

  // 4. Chuẩn bị bulkWrite cho salesinvoices, receipts và customers
  const invoiceBulkOps = [];
  const receiptBulkOps = [];
  const customerColUpdates = [];

  users.forEach((u, uIdx) => {
    const assignedInvoices = userInvoicesMap.get(u._id.toString()) || [];
    const custAddr = u.address || defaultAddresses[uIdx % defaultAddresses.length];

    // Thống kê cho khách hàng này
    let totalSpent = 0;
    let completedCount = 0;
    let lastOrderDate = null;

    assignedInvoices.forEach(inv => {
      // 1. Cập nhật hóa đơn
      invoiceBulkOps.push({
        updateOne: {
          filter: { _id: inv._id },
          update: {
            $set: {
              user: u._id,
              customerName: u.name,
              customerPhone: u.phone,
              customerEmail: u.email,
              customerAddress: custAddr
            }
          }
        }
      });

      // 2. Cập nhật phiếu thu nếu đơn hoàn thành
      const isPaid = inv.paymentStatus === 'paid' || ['completed', 'paid'].includes(inv.status);
      if (isPaid) {
        totalSpent += (inv.finalAmount || inv.totalAmount || 0);
        completedCount++;

        receiptBulkOps.push({
          updateOne: {
            filter: {
              $or: [
                { attached: `Hóa đơn bán hàng ${inv.invoiceCode}` },
                { description: `Thu tiền bán sách đơn hàng ${inv.invoiceCode}` }
              ]
            },
            update: {
              $set: {
                payerName: u.name,
                personName: u.name,
                address: custAddr
              }
            }
          }
        });
      }

      if (!lastOrderDate || new Date(inv.createdAt) > new Date(lastOrderDate)) {
        lastOrderDate = inv.createdAt;
      }
    });

    // Xác định phân hạng khách hàng
    let customerType = 'Tiêu chuẩn';
    if (totalSpent >= 10000000) customerType = 'VIP';
    else if (totalSpent >= 3000000) customerType = 'Thân thiết';

    const loyaltyPoints = Math.floor(totalSpent / 10000);

    // 3. Cập nhật bảng customers
    customerColUpdates.push({
      updateOne: {
        filter: { _id: u._id },
        update: {
          $set: {
            name: u.name,
            email: u.email,
            phone: u.phone,
            address: custAddr,
            totalSpent: totalSpent,
            orderCount: assignedInvoices.length,
            completedCount: completedCount,
            loyaltyPoints: loyaltyPoints,
            customerType: customerType,
            lastOrderDate: lastOrderDate,
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    });
  });

  console.log(`💾 Đang thực thi ghi dữ liệu:`);
  console.log(`   + Cập nhật ${invoiceBulkOps.length} hóa đơn bán hàng`);
  console.log(`   + Cập nhật ${receiptBulkOps.length} phiếu thu kế toán`);
  console.log(`   + Cập nhật ${customerColUpdates.length} hồ sơ CRM trong bảng 'customers'`);

  const chunkSize = 500;
  for (let i = 0; i < invoiceBulkOps.length; i += chunkSize) {
    await db.collection('salesinvoices').bulkWrite(invoiceBulkOps.slice(i, i + chunkSize));
  }
  for (let i = 0; i < receiptBulkOps.length; i += chunkSize) {
    await db.collection('receipts').bulkWrite(receiptBulkOps.slice(i, i + chunkSize));
  }
  for (let i = 0; i < customerColUpdates.length; i += chunkSize) {
    await db.collection('customers').bulkWrite(customerColUpdates.slice(i, i + chunkSize));
  }

  console.log(`✅ Đã hoàn tất cập nhật thành công trên ${label}!`);
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

  console.log('\n🎉 HOÀN TẤT ĐỒNG BỘ 100% ĐƠN HÀNG VÀO QUẢN LÝ KHÁCH HÀNG & CRM!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
