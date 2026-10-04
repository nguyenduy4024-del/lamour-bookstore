const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/lamour_bookstore';
const ATLAS_URI = 'mongodb+srv://nguyenduy4024_db_user:GJyUD87yMg11Sk7B@lamour-bookstore.7ewktff.mongodb.net/lamour_bookstore?retryWrites=true&w=majority&appName=lamour-bookstore';

const customerNames = [
  'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Nam', 'Phạm Minh Đức', 'Vũ Thảo Nguyên',
  'Đặng Quốc Bảo', 'Hoàng Kim Ngân', 'Bùi Anh Tuấn', 'Đỗ Mai Linh', 'Hồ Tấn Phát',
  'Ngô Phương Thảo', 'Dương Gia Huy', 'Lý Hải Đăng', 'Võ Thùy Dương', 'Trương Vĩnh Kỳ',
  'Phan Thanh Hằng', 'Đinh Trọng Nghĩa', 'Chu Ngọc Hân', 'Lương Minh Khang', 'Mai Tuyết Nhung',
  'Tạ Quang Dũng', 'Cao Thị Mỹ Duyên', 'Thái Hoàng Long', 'Hà Thục Quyên', 'Trịnh Bá Phong',
  'Đoàn Khánh Linh', 'Lâm Chấn Huy', 'Tô Thanh Sơn', 'Vương Đình Huệ', 'Diệp Bảo Ngọc',
  'Nguyễn Hữu Thắng', 'Trần Ngọc Trâm', 'Lê Bích Thủy', 'Phạm Công Danh', 'Vũ Quốc Toàn',
  'Bùi Thảo My', 'Đinh Hoàng Yến', 'Hồ Nhật Minh', 'Phan Gia Khiêm', 'Trịnh Cẩm Tú',
  'Nguyễn Mai Trang', 'Trần Đình Trọng', 'Phạm Quỳnh Anh', 'Lê Tuấn Khang', 'Võ Hoàng Yến',
  'Đỗ Minh Quân', 'Hoàng Thùy Linh', 'Nguyễn Gia Bảo', 'Vũ Hải Yến', 'Trần Quốc Toản'
];

const cancelReasons = [
  'Khách hàng thay đổi ý định',
  'Thời gian giao hàng dự kiến không phù hợp',
  'Nhập sai địa chỉ nhận hàng',
  'Đặt trùng đơn hàng',
  'Thẻ ngân hàng bị từ chối / lỗi xác thực OTP',
  'Muốn đổi sang phương thức thanh toán khác'
];

const cities = [
  'Quận 1, TP. Hồ Chí Minh', 'Quận 3, TP. Hồ Chí Minh', 'Quận 7, TP. Hồ Chí Minh', 'TP. Thủ Đức, TP.HCM',
  'Quận Cầu Giấy, Hà Nội', 'Quận Ba Đình, Hà Nội', 'Quận Đống Đa, Hà Nội', 'Quận Hai Bà Trưng, Hà Nội',
  'Quận Hải Châu, Đà Nẵng', 'Quận Ninh Kiều, Cần Thơ', 'Quận Hồng Bàng, Hải Phòng', 'TP. Nha Trang, Khánh Hòa',
  'TP. Đà Lạt, Lâm Đồng', 'TP. Biên Hòa, Đồng Nai', 'TP. Vũng Tàu, Bà Rịa - Vũng Tàu'
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const date = new Date(start + Math.random() * (end - start));
  date.setHours(randomInt(8, 21), randomInt(0, 59), randomInt(0, 59));
  return date;
}

async function run() {
  console.log('📡 Đang kết nối tới MongoDB Atlas và Local...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✅ Đã kết nối MongoDB Atlas.');

  let localConn = null;
  try {
    localConn = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 3000 }).asPromise();
    console.log('✅ Đã kết nối Local MongoDB.');
  } catch (e) {
    console.warn('⚠️ Local MongoDB không phản hồi, sẽ nạp thẳng vào Atlas.');
  }

  const books = await atlasConn.db.collection('products').find({}).toArray();
  const suppliers = await atlasConn.db.collection('suppliers').find({}).toArray();
  const adminUser = await atlasConn.db.collection('users').findOne({ role: 'admin' });
  const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

  console.log(`📊 Tìm thấy: ${books.length} sách thật, ${suppliers.length} nhà cung cấp.`);

  // Cấu hình kế hoạch 10 tháng năm 2026 (Tháng 1 đến Tháng 10/2026)
  // Mục tiêu: Tổng đơn ~8,600 đơn, ~8,370 đơn hoàn thành, ~230 đơn hủy (tỷ lệ thành công ~97%),
  // Tổng doanh thu thực tế ~4.855 TỶ VNĐ, AOV ~580.000 VNĐ
  const monthConfigs = [
    { month: 1,  days: 31, completed: 760, cancelled: 21, pending: 0,  targetRev: 440000000, label: 'Tháng 01/2026' },
    { month: 2,  days: 28, completed: 785, cancelled: 22, pending: 0,  targetRev: 455000000, label: 'Tháng 02/2026' },
    { month: 3,  days: 31, completed: 825, cancelled: 23, pending: 0,  targetRev: 480000000, label: 'Tháng 03/2026' },
    { month: 4,  days: 30, completed: 815, cancelled: 22, pending: 0,  targetRev: 475000000, label: 'Tháng 04/2026' },
    { month: 5,  days: 31, completed: 855, cancelled: 24, pending: 0,  targetRev: 495000000, label: 'Tháng 05/2026' },
    { month: 6,  days: 30, completed: 865, cancelled: 24, pending: 0,  targetRev: 505000000, label: 'Tháng 06/2026' },
    { month: 7,  days: 31, completed: 885, cancelled: 25, pending: 0,  targetRev: 515000000, label: 'Tháng 07/2026' },
    { month: 8,  days: 31, completed: 905, cancelled: 25, pending: 0,  targetRev: 530000000, label: 'Tháng 08/2026' },
    { month: 9,  days: 30, completed: 935, cancelled: 26, pending: 0,  targetRev: 545000000, label: 'Tháng 09/2026' },
    { month: 10, days: 4,  completed: 740, cancelled: 20, pending: 28, targetRev: 415059000, label: 'Tháng 10/2026' }
  ];

  // BƯỚC 1: TẠO CÁC ĐỢT NHẬP HÀNG (~6.5 TỶ VNĐ) ĐỂ KHO SÁCH LUÔN DỒI DÀO
  console.log('\n📦 BƯỚC 1: Đang thiết lập các đợt nhập kho sách dồi dào...');
  const importReceipts = [];
  const purchaseOrderDetails = [];
  const paymentReceipts = [];
  const bookStockMap = {};
  books.forEach(b => { bookStockMap[b._id.toString()] = 0; });

  let receiptCounter = 1000;
  let paymentCounter = 1000;
  let totalImportValue = 0;

  for (const mc of monthConfigs) {
    const batchesInMonth = mc.month === 10 ? 4 : 6;
    for (let b = 0; b < batchesInMonth; b++) {
      receiptCounter++;
      paymentCounter++;
      const sup = randomChoice(suppliers);
      const receiptDate = new Date(`2026-${String(mc.month).padStart(2, '0')}-${String(Math.min(mc.days, (b + 1) * 4)).padStart(2, '0')}T09:00:00Z`);
      const receiptCode = `NK-2026${String(mc.month).padStart(2, '0')}-${receiptCounter}`;
      const receiptId = new mongoose.Types.ObjectId();

      const numTitles = randomInt(25, 45);
      const selectedBooks = [];
      const usedIds = new Set();
      while (selectedBooks.length < numTitles) {
        const bk = randomChoice(books);
        if (!usedIds.has(bk._id.toString())) {
          usedIds.add(bk._id.toString());
          selectedBooks.push(bk);
        }
      }

      let receiptTotal = 0;
      const items = [];

      for (const bk of selectedBooks) {
        const qty = randomInt(60, 150);
        const sellingPrice = Number(bk.price) || 85000;
        const costPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round(sellingPrice * 0.65);
        const itemTotal = costPrice * qty;
        receiptTotal += itemTotal;
        bookStockMap[bk._id.toString()] += qty;

        const detailId = new mongoose.Types.ObjectId();
        items.push({
          _id: detailId,
          book: bk._id,
          title: bk.title,
          costPrice: costPrice,
          quantity: qty,
          total: itemTotal
        });

        purchaseOrderDetails.push({
          _id: detailId,
          purchaseOrderId: receiptId,
          receiptCode: receiptCode,
          productId: bk._id,
          productCode: bk.bookCode || '',
          productName: bk.title,
          costPrice: costPrice,
          quantity: qty,
          totalPrice: itemTotal,
          createdAt: receiptDate
        });
      }

      totalImportValue += receiptTotal;

      importReceipts.push({
        _id: receiptId,
        receiptCode: receiptCode,
        orderCode: receiptCode,
        supplier: sup._id,
        supplierName: sup.name,
        supplierPhone: sup.phone,
        supplierAddress: sup.address,
        items: items,
        totalCost: receiptTotal,
        totalAmount: receiptTotal,
        finalAmount: receiptTotal,
        paymentStatus: 'paid',
        status: 'approved',
        approvalStatus: 'approved',
        approvedBy: adminId,
        approvedAt: receiptDate,
        warehouseStaff: adminId,
        warehouseName: 'Kho Tổng Trung Tâm L’Amour',
        notes: `Phiếu nhập sách chính thức định kỳ tháng ${mc.month}/2026 từ ${sup.name}`,
        createdAt: receiptDate,
        updatedAt: receiptDate
      });

      paymentReceipts.push({
        _id: new mongoose.Types.ObjectId(),
        paymentCode: `PC-2026-${paymentCounter}`,
        transactionCode: `PC-2026-${paymentCounter}`,
        type: 'chi',
        category: 'Nhập hàng',
        amount: receiptTotal,
        description: `Chi thanh toán lô sách ${receiptCode} cho ${sup.name}`,
        payeeName: sup.name,
        personName: sup.name,
        address: sup.address || 'Hà Nội / TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: `Hóa đơn GTGT ${receiptCode}`,
        note: 'Đã hoàn tất chuyển khoản ngân hàng',
        performedBy: adminId,
        createdAt: receiptDate,
        updatedAt: receiptDate
      });
    }
  }

  console.log(`✅ Đã tạo ${importReceipts.length} đợt nhập kho: ${totalImportValue.toLocaleString('vi-VN')} VNĐ (~${(totalImportValue/1e9).toFixed(2)} TỶ)`);

  // BƯỚC 2: TẠO ~8,600 ĐƠN HÀNG THỰC TẾ
  // ĐƠN HOÀN THÀNH: ~8,370 ĐƠN | ĐƠN HỦY: ~230 ĐƠN (~2.7%)
  // AOV: ~580.000 VNĐ | DOANH THU THỰC TẾ: ~4.855 TỶ VNĐ
  console.log('\n💰 BƯỚC 2: Đang tạo ~8,600 đơn hàng bán lẻ với AOV ~580.000 VNĐ và tỷ lệ hủy ~2.7%...');
  const salesInvoices = [];
  const salesInvoiceDetails = [];
  const incomeReceipts = [];

  const bookSoldCountMap = {};
  books.forEach(b => { bookSoldCountMap[b._id.toString()] = 0; });

  let invoiceCodeCounter = 10000;
  let receiptThuCounter = 10000;
  let runningTotalRevenue = 0;
  let totalCostOfGoods = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const mc of monthConfigs) {
    const startDate = new Date(`2026-${String(mc.month).padStart(2, '0')}-01T08:00:00Z`);
    const endDate = mc.month === 10 
      ? new Date('2026-10-04T22:00:00Z') 
      : new Date(`2026-${String(mc.month).padStart(2, '0')}-${String(mc.days).padStart(2, '0')}T22:00:00Z`);

    const monthTarget = mc.targetRev;
    let monthRunningRev = 0;

    // 1. Tạo các đơn HOÀN THÀNH trong tháng
    for (let k = 0; k < mc.completed; k++) {
      invoiceCodeCounter++;
      receiptThuCounter++;
      const orderDate = randomDate(startDate, endDate);
      const isOnline = Math.random() < 0.48;
      const invoiceCode = isOnline 
        ? `HD-OL-2026${String(mc.month).padStart(2, '0')}-${invoiceCodeCounter}`
        : `HD-POS-2026${String(mc.month).padStart(2, '0')}-${invoiceCodeCounter}`;

      const invoiceId = new mongoose.Types.ObjectId();
      const custName = randomChoice(customerNames);
      const custPhone = '09' + String(randomInt(10000000, 99999999));
      const custAddress = randomInt(1, 450) + ' ' + randomChoice(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Cầu Giấy', 'Võ Thị Sáu', 'Phan Châu Trinh']) + ', ' + randomChoice(cities);
      const custEmail = custName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '') + randomInt(10, 99) + '@gmail.com';

      // Số lượng sách trong 1 đơn bán lẻ thực tế: 1 đến 5 cuốn (trung bình ~3 cuốn)
      // Để đạt AOV ~580.000 VNĐ
      const numBooks = randomChoice([1, 2, 2, 3, 3, 3, 4, 4, 5]);
      const selectedBooks = [];
      const usedIds = new Set();
      while (selectedBooks.length < numBooks) {
        const bk = randomChoice(books);
        if (!usedIds.has(bk._id.toString())) {
          usedIds.add(bk._id.toString());
          selectedBooks.push(bk);
        }
      }

      let orderTotalAmount = 0;
      let orderTotalCost = 0;
      const orderItems = [];

      for (const bk of selectedBooks) {
        const qty = randomChoice([1, 1, 1, 2, 2, 3]);
        const price = Number(bk.price) || 85000;
        const costPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round(price * 0.65);
        const itemTotal = price * qty;
        orderTotalAmount += itemTotal;
        orderTotalCost += (costPrice * qty);

        bookSoldCountMap[bk._id.toString()] += qty;

        const itemId = new mongoose.Types.ObjectId();
        orderItems.push({
          _id: itemId,
          book: bk._id,
          quantity: qty,
          price: price,
          costPrice: costPrice,
          totalPrice: itemTotal
        });

        salesInvoiceDetails.push({
          _id: itemId,
          salesInvoiceId: invoiceId,
          invoiceCode: invoiceCode,
          productId: bk._id,
          productCode: bk.bookCode || '',
          productName: bk.title,
          quantity: qty,
          unitPrice: price,
          costPrice: costPrice,
          totalPrice: itemTotal,
          createdAt: orderDate
        });
      }

      let discount = 0;
      if (orderTotalAmount > 400000 && Math.random() < 0.25) {
        discount = Math.round(orderTotalAmount * 0.05 / 1000) * 1000;
      }
      const finalAmount = orderTotalAmount - discount;

      monthRunningRev += finalAmount;
      runningTotalRevenue += finalAmount;
      totalCostOfGoods += orderTotalCost;
      completedCount++;

      const paymentMethod = isOnline 
        ? randomChoice(['momo', 'transfer', 'cod', 'card']) 
        : randomChoice(['cash', 'pos', 'transfer']);

      salesInvoices.push({
        _id: invoiceId,
        invoiceCode: invoiceCode,
        user: null,
        customerName: custName,
        customerPhone: custPhone,
        customerAddress: custAddress,
        customerEmail: custEmail,
        orderType: isOnline ? 'online' : 'offline',
        paymentMethod: paymentMethod,
        paymentStatus: 'paid',
        totalAmount: orderTotalAmount,
        discount: discount,
        finalAmount: finalAmount,
        items: orderItems,
        status: 'completed',
        notes: isOnline ? 'Giao hàng tận nơi' : 'Khách mua trực tiếp tại quầy',
        createdAt: orderDate,
        updatedAt: orderDate
      });

      incomeReceipts.push({
        _id: new mongoose.Types.ObjectId(),
        receiptCode: `PT-2026-${receiptThuCounter}`,
        transactionCode: `PT-2026-${receiptThuCounter}`,
        type: 'thu',
        category: 'Bán lẻ sách',
        amount: finalAmount,
        description: `Thu tiền bán sách đơn hàng ${invoiceCode}`,
        payerName: custName,
        personName: custName,
        address: custAddress,
        paymentMethod: paymentMethod === 'cash' ? 'Tiền mặt' : (paymentMethod === 'pos' ? 'Thẻ POS' : 'Chuyển khoản'),
        attached: `Hóa đơn bán hàng ${invoiceCode}`,
        note: 'Đã hoàn tất thanh toán',
        performedBy: adminId,
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }

    // 2. Tạo các đơn HỦY (Cancelled) trong tháng (~2.5% - 2.8%)
    for (let c = 0; c < mc.cancelled; c++) {
      invoiceCodeCounter++;
      const orderDate = randomDate(startDate, endDate);
      const isOnline = Math.random() < 0.75; // Đơn online hay có tỷ lệ hủy hơn đơn tại quầy
      const invoiceCode = isOnline 
        ? `HD-OL-2026${String(mc.month).padStart(2, '0')}-${invoiceCodeCounter}`
        : `HD-POS-2026${String(mc.month).padStart(2, '0')}-${invoiceCodeCounter}`;

      const invoiceId = new mongoose.Types.ObjectId();
      const custName = randomChoice(customerNames);
      const custPhone = '09' + String(randomInt(10000000, 99999999));
      const custAddress = randomInt(1, 450) + ' ' + randomChoice(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Cầu Giấy']) + ', ' + randomChoice(cities);
      const custEmail = custName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '') + randomInt(10, 99) + '@gmail.com';

      const numBooks = randomChoice([1, 2, 3]);
      const selectedBooks = [];
      const usedIds = new Set();
      while (selectedBooks.length < numBooks) {
        const bk = randomChoice(books);
        if (!usedIds.has(bk._id.toString())) {
          usedIds.add(bk._id.toString());
          selectedBooks.push(bk);
        }
      }

      let orderTotalAmount = 0;
      const orderItems = [];

      for (const bk of selectedBooks) {
        const qty = randomChoice([1, 2]);
        const price = Number(bk.price) || 85000;
        const costPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round(price * 0.65);
        const itemTotal = price * qty;
        orderTotalAmount += itemTotal;

        const itemId = new mongoose.Types.ObjectId();
        orderItems.push({
          _id: itemId,
          book: bk._id,
          quantity: qty,
          price: price,
          costPrice: costPrice,
          totalPrice: itemTotal
        });
      }

      cancelledCount++;
      const reason = randomChoice(cancelReasons);

      salesInvoices.push({
        _id: invoiceId,
        invoiceCode: invoiceCode,
        user: null,
        customerName: custName,
        customerPhone: custPhone,
        customerAddress: custAddress,
        customerEmail: custEmail,
        orderType: isOnline ? 'online' : 'offline',
        paymentMethod: isOnline ? randomChoice(['cod', 'momo', 'transfer']) : 'cash',
        paymentStatus: 'failed',
        totalAmount: orderTotalAmount,
        discount: 0,
        finalAmount: orderTotalAmount,
        items: orderItems,
        status: 'cancelled',
        notes: `Đơn hủy: ${reason}`,
        cancellationReason: reason,
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }

    // 3. Tạo các đơn ĐANG XỬ LÝ / ĐANG GIAO (chỉ ở tháng 10 gần đây)
    if (mc.pending > 0) {
      for (let p = 0; p < mc.pending; p++) {
        invoiceCodeCounter++;
        const orderDate = new Date(`2026-10-0${randomInt(1, 4)}T${randomInt(9, 20)}:${randomInt(10, 50)}:00Z`);
        const invoiceCode = `HD-OL-202610-${invoiceCodeCounter}`;
        const invoiceId = new mongoose.Types.ObjectId();
        const custName = randomChoice(customerNames);
        const custPhone = '09' + String(randomInt(10000000, 99999999));
        const custAddress = randomInt(1, 450) + ' ' + randomChoice(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo']) + ', ' + randomChoice(cities);

        const numBooks = randomChoice([1, 2, 3]);
        const selectedBooks = [];
        const usedIds = new Set();
        while (selectedBooks.length < numBooks) {
          const bk = randomChoice(books);
          if (!usedIds.has(bk._id.toString())) {
            usedIds.add(bk._id.toString());
            selectedBooks.push(bk);
          }
        }

        let orderTotalAmount = 0;
        const orderItems = [];

        for (const bk of selectedBooks) {
          const qty = randomChoice([1, 2]);
          const price = Number(bk.price) || 85000;
          const costPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round(price * 0.65);
          const itemTotal = price * qty;
          orderTotalAmount += itemTotal;

          const itemId = new mongoose.Types.ObjectId();
          orderItems.push({
            _id: itemId,
            book: bk._id,
            quantity: qty,
            price: price,
            costPrice: costPrice,
            totalPrice: itemTotal
          });
        }

        const isShipping = Math.random() < 0.6;
        salesInvoices.push({
          _id: invoiceId,
          invoiceCode: invoiceCode,
          user: null,
          customerName: custName,
          customerPhone: custPhone,
          customerAddress: custAddress,
          customerEmail: 'customer' + randomInt(100, 999) + '@gmail.com',
          orderType: 'online',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          totalAmount: orderTotalAmount,
          discount: 0,
          finalAmount: orderTotalAmount,
          items: orderItems,
          status: isShipping ? 'shipping' : 'pending_confirmation',
          notes: isShipping ? 'Đang trên đường giao cho khách' : 'Chờ nhân viên gọi xác nhận',
          createdAt: orderDate,
          updatedAt: orderDate
        });
      }
    }
  }

  // Cập nhật tồn kho thực tế cho từng cuốn sách
  const bulkBookOps = [];
  const bulkInventoryOps = [];
  books.forEach(b => {
    const imported = bookStockMap[b._id.toString()] || 0;
    const sold = bookSoldCountMap[b._id.toString()] || 0;
    const finalStock = Math.max(15, imported - sold);

    bulkBookOps.push({
      updateOne: {
        filter: { _id: b._id },
        update: {
          $set: {
            stock: finalStock,
            soldCount: sold,
            isDeleted: false
          }
        }
      }
    });

    bulkInventoryOps.push({
      updateOne: {
        filter: { book: b._id },
        update: {
          $set: {
            quantity: finalStock,
            availableQuantity: finalStock,
            warehouse: 'Kho Tổng Trung Tâm L’Amour'
          }
        },
        upsert: true
      }
    });
  });

  const grossProfit = runningTotalRevenue - totalCostOfGoods;
  const aov = completedCount > 0 ? Math.round(runningTotalRevenue / completedCount) : 0;
  const successRate = ((completedCount / salesInvoices.length) * 100).toFixed(1);

  console.log('\n📊 KẾT QUẢ TÍNH TOÁN TRƯỚC KHI GHI:');
  console.log(`- Tổng số đơn tạo ra: ${salesInvoices.length} đơn`);
  console.log(`- Đơn hoàn thành: ${completedCount} đơn`);
  console.log(`- Đơn hủy: ${cancelledCount} đơn (Tỷ lệ hủy: ${(100 - successRate).toFixed(1)}%)`);
  console.log(`- Tỷ lệ thành công: ${successRate}%`);
  console.log(`- Tổng doanh thu thực tế: ${runningTotalRevenue.toLocaleString('vi-VN')} VNĐ (~${(runningTotalRevenue/1e9).toFixed(2)} TỶ)`);
  console.log(`- Giá trị đơn trung bình (AOV): ${aov.toLocaleString('vi-VN')} VNĐ (Đạt chuẩn bán lẻ sách!)`);
  console.log(`- Lợi nhuận gộp: ${grossProfit.toLocaleString('vi-VN')} VNĐ (~${(grossProfit/1e9).toFixed(2)} TỶ)`);

  // BƯỚC 4: GHI DỮ LIỆU ĐỒNG BỘ VÀO ATLAS VÀ LOCAL
  console.log('\n🚀 Đang dọn dẹp và nạp dữ liệu mới vào MongoDB Atlas...');
  await atlasConn.db.collection('salesinvoices').deleteMany({});
  await atlasConn.db.collection('salesinvoicedetails').deleteMany({});
  await atlasConn.db.collection('purchaseorders').deleteMany({});
  await atlasConn.db.collection('purchaseorderdetails').deleteMany({});
  await atlasConn.db.collection('payments').deleteMany({});
  await atlasConn.db.collection('receipts').deleteMany({});

  // Nạp theo lô (chunks) để đảm bảo tốc độ cực nhanh
  const chunkSize = 1000;
  for (let i = 0; i < salesInvoices.length; i += chunkSize) {
    await atlasConn.db.collection('salesinvoices').insertMany(salesInvoices.slice(i, i + chunkSize));
  }
  for (let i = 0; i < salesInvoiceDetails.length; i += chunkSize) {
    await atlasConn.db.collection('salesinvoicedetails').insertMany(salesInvoiceDetails.slice(i, i + chunkSize));
  }
  await atlasConn.db.collection('purchaseorders').insertMany(importReceipts);
  await atlasConn.db.collection('purchaseorderdetails').insertMany(purchaseOrderDetails);
  await atlasConn.db.collection('payments').insertMany(paymentReceipts);
  for (let i = 0; i < incomeReceipts.length; i += chunkSize) {
    await atlasConn.db.collection('receipts').insertMany(incomeReceipts.slice(i, i + chunkSize));
  }

  if (bulkBookOps.length > 0) {
    await atlasConn.db.collection('products').bulkWrite(bulkBookOps);
    await atlasConn.db.collection('inventory').bulkWrite(bulkInventoryOps);
  }
  console.log('✅ Đã nạp thành công 100% dữ liệu mới lên MongoDB Atlas!');

  if (localConn) {
    try {
      console.log('🚀 Đang đồng bộ vào CSDL Local...');
      await localConn.db.collection('salesinvoices').deleteMany({});
      await localConn.db.collection('salesinvoicedetails').deleteMany({});
      await localConn.db.collection('purchaseorders').deleteMany({});
      await localConn.db.collection('purchaseorderdetails').deleteMany({});
      await localConn.db.collection('payments').deleteMany({});
      await localConn.db.collection('receipts').deleteMany({});

      for (let i = 0; i < salesInvoices.length; i += chunkSize) {
        await localConn.db.collection('salesinvoices').insertMany(salesInvoices.slice(i, i + chunkSize));
      }
      for (let i = 0; i < salesInvoiceDetails.length; i += chunkSize) {
        await localConn.db.collection('salesinvoicedetails').insertMany(salesInvoiceDetails.slice(i, i + chunkSize));
      }
      await localConn.db.collection('purchaseorders').insertMany(importReceipts);
      await localConn.db.collection('purchaseorderdetails').insertMany(purchaseOrderDetails);
      await localConn.db.collection('payments').insertMany(paymentReceipts);
      for (let i = 0; i < incomeReceipts.length; i += chunkSize) {
        await localConn.db.collection('receipts').insertMany(incomeReceipts.slice(i, i + chunkSize));
      }

      if (bulkBookOps.length > 0) {
        await localConn.db.collection('products').bulkWrite(bulkBookOps);
        await localConn.db.collection('inventory').bulkWrite(bulkInventoryOps);
      }
      console.log('✅ Đã đồng bộ hoàn tất vào Local MongoDB!');
      await localConn.close();
    } catch (localErr) {
      console.warn('⚠️ Lỗi đồng bộ Local:', localErr.message);
    }
  }

  await atlasConn.close();
  console.log('\n🎉 TOÀN BỘ DỮ LIỆU ĐÃ SẴN SÀNG VỚI AOV HỢP LÝ VÀ TỶ LỆ HỦY CHUẨN THỰC TẾ!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
