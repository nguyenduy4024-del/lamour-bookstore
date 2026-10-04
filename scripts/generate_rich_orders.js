const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/lamour_bookstore';
const ATLAS_URI = 'mongodb+srv://nguyenduy4024_db_user:GJyUD87yMg11Sk7B@lamour-bookstore.7ewktff.mongodb.net/lamour_bookstore?retryWrites=true&w=majority&appName=lamour-bookstore';

const vietnameseNames = [
  'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Nam', 'Phạm Minh Đức', 'Vũ Thảo Nguyên',
  'Đặng Quốc Bảo', 'Hoàng Kim Ngân', 'Bùi Anh Tuấn', 'Đỗ Mai Linh', 'Hồ Tấn Phát',
  'Ngô Phương Thảo', 'Dương Gia Huy', 'Lý Hải Đăng', 'Võ Thùy Dương', 'Trương Vĩnh Kỳ',
  'Phan Thanh Hằng', 'Đinh Trọng Nghĩa', 'Chu Ngọc Hân', 'Lương Minh Khang', 'Mai Tuyết Nhung',
  'Tạ Quang Dũng', 'Cao Thị Mỹ Duyên', 'Thái Hoàng Long', 'Hà Thục Quyên', 'Trịnh Bá Phong',
  'Đoàn Khánh Linh', 'Lâm Chấn Huy', 'Tô Thanh Sơn', 'Vương Đình Huệ', 'Diệp Bảo Ngọc'
];

const cities = [
  'Quận 1, TP. Hồ Chí Minh', 'Quận 3, TP. Hồ Chí Minh', 'Quận 7, TP. Hồ Chí Minh', 'TP. Thủ Đức, TP.HCM',
  'Quận Cầu Giấy, Hà Nội', 'Quận Ba Đình, Hà Nội', 'Quận Đống Đa, Hà Nội', 'Quận Hai Bà Trưng, Hà Nội',
  'Quận Hải Châu, Đà Nẵng', 'Quận Sơn Trà, Đà Nẵng', 'Quận Ninh Kiều, Cần Thơ', 'Quận Hồng Bàng, Hải Phòng',
  'TP. Nha Trang, Khánh Hòa', 'TP. Đà Lạt, Lâm Đồng', 'TP. Vũng Tàu, Bà Rịa - Vũng Tàu'
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Tạo ngày ngẫu nhiên trong khoảng thời gian
function randomDate(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const date = new Date(start + Math.random() * (end - start));
  date.setHours(randomInt(8, 21), randomInt(0, 59), randomInt(0, 59));
  return date;
}

async function run() {
  console.log('📡 Đang kết nối tới CSDL Local và MongoDB Atlas...');
  let localConn = null;
  try {
    localConn = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 3000 }).asPromise();
    console.log('✅ Đã kết nối Local MongoDB.');
  } catch (e) {
    console.warn('⚠️ Không thể kết nối Local MongoDB (sẽ chỉ cập nhật lên Atlas):', e.message);
  }

  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✅ Đã kết nối MongoDB Atlas.');

  // Lấy danh sách sách thật từ Atlas
  const books = await atlasConn.db.collection('products').find({}).toArray();
  const users = await atlasConn.db.collection('users').find({ role: 'user' }).toArray();
  console.log(`📚 Tìm thấy ${books.length} sách thật và ${users.length} khách hàng trong CSDL.`);

  if (books.length === 0) {
    console.error('❌ Không tìm thấy sách nào để tạo đơn!');
    process.exit(1);
  }

  // Tạo các mốc thời gian tăng dần từ tháng 7 đến tháng 10/2026 (Tăng trưởng đẹp mắt)
  const periods = [
    { start: new Date('2026-07-01'), end: new Date('2026-07-31'), count: 25, label: 'Tháng 7/2026' },
    { start: new Date('2026-08-01'), end: new Date('2026-08-31'), count: 40, label: 'Tháng 8/2026' },
    { start: new Date('2026-09-01'), end: new Date('2026-09-30'), count: 65, label: 'Tháng 9/2026' },
    { start: new Date('2026-10-01'), end: new Date('2026-10-05T12:00:00Z'), count: 35, label: 'Tháng 10/2026 (Hiện tại)' }
  ];

  const newInvoices = [];
  const newInvoiceDetails = [];
  let invoiceCounter = 5000;

  for (const period of periods) {
    console.log(`⏳ Đang tạo ${period.count} đơn hàng chất lượng cho ${period.label}...`);
    for (let i = 0; i < period.count; i++) {
      invoiceCounter++;
      const orderDate = randomDate(period.start, period.end);
      const isOnline = Math.random() < 0.45;
      const orderType = isOnline ? 'online' : 'offline';
      const invoiceCode = isOnline 
        ? `HD-OL-${orderDate.getFullYear()}${(orderDate.getMonth()+1).toString().padStart(2, '0')}-${invoiceCounter}`
        : `HD-POS-${orderDate.getFullYear()}${(orderDate.getMonth()+1).toString().padStart(2, '0')}-${invoiceCounter}`;

      const customerName = randomChoice(vietnameseNames);
      const customerPhone = '09' + String(randomInt(10000000, 99999999));
      const customerAddress = randomInt(1, 450) + ' ' + randomChoice(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Lý Thường Kiệt', 'Cầu Giấy', 'Võ Thị Sáu']) + ', ' + randomChoice(cities);
      const customerEmail = customerName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '') + randomInt(10, 99) + '@gmail.com';

      // Chọn ngẫu nhiên từ 1 đến 4 cuốn sách cho đơn này
      const numItems = randomInt(1, 4);
      const selectedBooks = [];
      const usedBookIds = new Set();

      for (let k = 0; k < numItems; k++) {
        const b = randomChoice(books);
        if (!usedBookIds.has(b._id.toString())) {
          usedBookIds.add(b._id.toString());
          selectedBooks.push(b);
        }
      }

      let totalAmount = 0;
      let totalCost = 0;
      const items = [];
      const invoiceId = new mongoose.Types.ObjectId();

      for (const b of selectedBooks) {
        const qty = randomInt(1, 3);
        const price = Number(b.price) || 80000;
        const costPrice = Number(b.costPrice) > 0 ? Number(b.costPrice) : Math.round(price * 0.65);
        const itemTotal = price * qty;
        totalAmount += itemTotal;
        totalCost += (costPrice * qty);

        const itemId = new mongoose.Types.ObjectId();
        items.push({
          _id: itemId,
          book: b._id,
          quantity: qty,
          price: price,
          costPrice: costPrice,
          totalPrice: itemTotal
        });

        newInvoiceDetails.push({
          _id: itemId,
          salesInvoiceId: invoiceId,
          invoiceCode: invoiceCode,
          productId: b._id,
          productCode: b.bookCode || '',
          productName: b.title,
          quantity: qty,
          unitPrice: price,
          costPrice: costPrice,
          totalPrice: itemTotal,
          createdAt: orderDate
        });
      }

      // Giảm giá / Khuyến mãi nhẹ nếu tổng tiền lớn (cho số liệu thực tế)
      let discount = 0;
      if (totalAmount > 300000 && Math.random() < 0.4) {
        discount = Math.round(totalAmount * 0.05 / 1000) * 1000; // giảm 5%
      }
      const finalAmount = Math.max(0, totalAmount - discount);

      // Trạng thái đơn: Đa số là hoàn thành để doanh thu và lợi nhuận tăng đẹp
      let status = 'completed';
      let paymentStatus = 'paid';

      // Với tháng 10 gần đây, thêm vài đơn đang giao / chờ duyệt cho chân thực
      if (period.label.includes('Tháng 10')) {
        const rand = Math.random();
        if (rand < 0.12) {
          status = 'shipping';
          paymentStatus = 'paid';
        } else if (rand < 0.18) {
          status = 'pending_confirmation';
          paymentStatus = 'unpaid';
        } else if (rand < 0.22) {
          status = 'processing';
          paymentStatus = 'paid';
        }
      }

      const paymentMethod = isOnline 
        ? randomChoice(['transfer', 'momo', 'card']) 
        : randomChoice(['cash', 'transfer', 'pos']);

      const userDoc = users.length > 0 && Math.random() < 0.35 ? randomChoice(users) : null;

      newInvoices.push({
        _id: invoiceId,
        invoiceCode: invoiceCode,
        user: userDoc ? userDoc._id : null,
        customerName: userDoc ? (userDoc.fullName || customerName) : customerName,
        customerPhone: userDoc ? (userDoc.phone || customerPhone) : customerPhone,
        customerAddress: customerAddress,
        customerEmail: userDoc ? userDoc.email : customerEmail,
        orderType: orderType,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        totalAmount: totalAmount,
        discount: discount,
        finalAmount: finalAmount,
        items: items,
        status: status,
        notes: isOnline ? 'Giao hàng tận nơi giờ hành chính' : 'Bán lẻ trực tiếp tại quầy thu ngân',
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }
  }

  console.log(`\n✨ Đã tạo tổng cộng ${newInvoices.length} đơn hàng mới và ${newInvoiceDetails.length} chi tiết mặt hàng.`);

  // Nạp vào MongoDB Atlas
  console.log('🚀 Đang đẩy dữ liệu đơn hàng mới lên MongoDB Atlas...');
  await atlasConn.db.collection('salesinvoices').insertMany(newInvoices);
  await atlasConn.db.collection('salesinvoicedetails').insertMany(newInvoiceDetails);
  console.log('✅ Đã nạp thành công toàn bộ lên MongoDB Atlas!');

  // Nạp vào Local MongoDB nếu có kết nối
  if (localConn) {
    try {
      console.log('🚀 Đang đồng bộ đơn hàng mới vào CSDL Local...');
      await localConn.db.collection('salesinvoices').insertMany(newInvoices);
      await localConn.db.collection('salesinvoicedetails').insertMany(newInvoiceDetails);
      console.log('✅ Đã đồng bộ thành công vào Local MongoDB!');
      await localConn.close();
    } catch (localErr) {
      console.warn('⚠️ Lỗi đồng bộ Local:', localErr.message);
    }
  }

  // Thống kê nhanh kết quả
  const totalRev = newInvoices
    .filter(i => ['completed', 'shipping', 'processing'].includes(i.status) || i.paymentStatus === 'paid')
    .reduce((sum, i) => sum + i.finalAmount, 0);

  let totalCost = 0;
  for (const inv of newInvoices) {
    if (['completed', 'shipping', 'processing'].includes(inv.status) || inv.paymentStatus === 'paid') {
      for (const it of inv.items) {
        totalCost += (it.costPrice * it.quantity);
      }
    }
  }
  const profit = totalRev - totalCost;
  const margin = Number(((profit / totalRev) * 100).toFixed(1));

  console.log('\n================ BẢNG SỐ LIỆU TÀI CHÍNH MỚI ================');
  console.log(`📊 Số đơn hàng mới:           +${newInvoices.length} đơn`);
  console.log(`💰 Doanh thu mới tạo ra:       +${totalRev.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📦 Giá vốn hàng bán (COGS):   +${totalCost.toLocaleString('vi-VN')} VNĐ`);
  console.log(`📈 Lợi nhuận gộp mới:         +${profit.toLocaleString('vi-VN')} VNĐ`);
  console.log(`💎 Tỷ suất lợi nhuận (Margin): ${margin}% (Cực kỳ lý tưởng!)`);
  console.log('=============================================================\n');

  await atlasConn.close();
  console.log('🎉 Xong toàn bộ!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
