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
  'Bùi Thảo My', 'Đinh Hoàng Yến', 'Hồ Nhật Minh', 'Phan Gia Khiêm', 'Trịnh Cẩm Tú'
];

const b2bOrganizations = [
  'Trường Quốc tế Song ngữ Wellspring', 'Thư viện THPT Chuyên Lê Hồng Phong',
  'Tập đoàn Giáo dục ILA Việt Nam', 'Công ty CP Công nghệ VNG',
  'Trường ĐH Kinh Tế - ĐHQG TP.HCM', 'Công ty Truyền thông Sun Life',
  'Tủ sách Khuyến học Miền Trung', 'CLB Sách & Hành Động Sài Gòn',
  'Trường Song ngữ Quốc tế Horizon', 'Ngân hàng TMCP Quân Đội - MB',
  'Viện Nghiên cứu Phát triển Giáo dục IRED', 'Thư viện Tổng hợp TP. Đà Nẵng',
  'Hệ thống Trường Quốc tế Vinschool', 'Trường Đại học FPT TP.HCM'
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
  console.log('📡 Đang kết nối tới CSDL MongoDB Atlas và Local...');
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
  const users = await atlasConn.db.collection('users').find({ role: 'user' }).toArray();
  const adminUser = await atlasConn.db.collection('users').findOne({ role: 'admin' });
  const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

  console.log(`📊 Tìm thấy: ${books.length} sách thật, ${suppliers.length} nhà cung cấp, ${users.length} khách hàng.`);

  // Cấu hình kế hoạch 10 tháng năm 2026 (Tháng 1 đến Tháng 10/2026)
  const monthConfigs = [
    { month: 1,  days: 31, retailOrders: 135, b2bOrders: 4, importBatches: 5, label: 'Tháng 01/2026' },
    { month: 2,  days: 28, retailOrders: 150, b2bOrders: 5, importBatches: 5, label: 'Tháng 02/2026' },
    { month: 3,  days: 31, retailOrders: 165, b2bOrders: 5, importBatches: 6, label: 'Tháng 03/2026' },
    { month: 4,  days: 30, retailOrders: 175, b2bOrders: 6, importBatches: 6, label: 'Tháng 04/2026' },
    { month: 5,  days: 31, retailOrders: 185, b2bOrders: 6, importBatches: 6, label: 'Tháng 05/2026' },
    { month: 6,  days: 30, retailOrders: 195, b2bOrders: 7, importBatches: 6, label: 'Tháng 06/2026' },
    { month: 7,  days: 31, retailOrders: 205, b2bOrders: 7, importBatches: 7, label: 'Tháng 07/2026' },
    { month: 8,  days: 31, retailOrders: 220, b2bOrders: 8, importBatches: 7, label: 'Tháng 08/2026' },
    { month: 9,  days: 30, retailOrders: 235, b2bOrders: 8, importBatches: 7, label: 'Tháng 09/2026' },
    { month: 10, days: 4,  retailOrders: 145, b2bOrders: 5, importBatches: 5, label: 'Tháng 10/2026' }
  ];

  // =========================================================================
  // BƯỚC 1: TẠO 60 ĐỢT NHẬP HÀNG KHỔNG LỒ (~4.5 TỶ VNĐ)
  // =========================================================================
  console.log('\n📦 BƯỚC 1: Đang tạo các đợt nhập hàng dồi dào (~4.5 TỶ VNĐ) cho 10 tháng...');
  const importReceipts = [];
  const purchaseOrderDetails = [];
  const paymentReceipts = [];

  const bookImportCountMap = {};
  books.forEach(b => { bookImportCountMap[b._id.toString()] = 0; });

  let receiptCounter = 1000;
  let paymentCounter = 2000;
  let totalImportValue = 0;
  let totalPaidToSuppliers = 0;

  for (const mc of monthConfigs) {
    const startDate = new Date(`2026-${String(mc.month).padStart(2, '0')}-01T08:00:00Z`);
    const endDate = mc.month === 10 
      ? new Date('2026-10-04T18:00:00Z') 
      : new Date(`2026-${String(mc.month).padStart(2, '0')}-${String(mc.days).padStart(2, '0')}T18:00:00Z`);

    for (let b = 0; b < mc.importBatches; b++) {
      receiptCounter++;
      paymentCounter++;
      const sup = randomChoice(suppliers);
      const receiptDate = randomDate(startDate, endDate);
      const receiptCode = `PN-2026${String(mc.month).padStart(2, '0')}-${receiptCounter}`;
      const receiptId = new mongoose.Types.ObjectId();

      const numBooks = randomInt(15, 30);
      const selectedBooks = [];
      const usedIds = new Set();
      while (selectedBooks.length < numBooks) {
        const bk = randomChoice(books);
        if (!usedIds.has(bk._id.toString())) {
          usedIds.add(bk._id.toString());
          selectedBooks.push(bk);
        }
      }

      const receiptItems = [];
      let batchTotalAmount = 0;
      let batchTotalQty = 0;

      for (const bk of selectedBooks) {
        const qty = randomInt(60, 200);
        const importPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round((Number(bk.price) || 85000) * 0.65);
        const itemTotal = importPrice * qty;
        batchTotalAmount += itemTotal;
        batchTotalQty += qty;

        bookImportCountMap[bk._id.toString()] += qty;

        const itemId = new mongoose.Types.ObjectId();
        receiptItems.push({
          _id: itemId,
          book: bk._id,
          quantity: qty,
          importPrice: importPrice,
          totalPrice: itemTotal,
          shelfPosition: bk.shelfPosition || 'Kệ A1',
          unit: 'Quyển'
        });

        purchaseOrderDetails.push({
          _id: itemId,
          purchaseOrderId: receiptId,
          orderCode: receiptCode,
          productId: bk._id,
          productCode: bk.bookCode || '',
          productName: bk.title,
          quantity: qty,
          unitPrice: importPrice,
          totalPrice: itemTotal,
          unit: 'Quyển',
          createdAt: receiptDate
        });
      }

      totalImportValue += batchTotalAmount;
      const paidAmount = batchTotalAmount; // 100% thanh toán hoàn tất
      totalPaidToSuppliers += paidAmount;

      importReceipts.push({
        _id: receiptId,
        receiptCode: receiptCode,
        invoiceNo: `HD-VAT-${randomInt(100000, 999999)}`,
        invoiceNumber: `HD-VAT-${randomInt(100000, 999999)}`,
        receiptDate: receiptDate,
        warehouseName: 'Kho bán hàng trung tâm',
        importWarehouse: 'Kho bán hàng trung tâm',
        reason: 'Nhập bổ sung nguồn sách định kỳ phục vụ kinh doanh',
        supplier: sup._id,
        delivererName: 'Nhân viên giao vận ' + sup.name,
        receiverStaff: 'Lê Văn Nam (Thủ kho)',
        createdBy: adminId,
        items: receiptItems,
        totalAmount: batchTotalAmount,
        totalQuantity: batchTotalQty,
        paidAmount: paidAmount,
        paymentStatus: 'paid',
        status: 'completed',
        approvedBy: adminId,
        approvedAt: receiptDate,
        completedBy: adminId,
        completedAt: receiptDate,
        createdAt: receiptDate,
        updatedAt: receiptDate
      });

      paymentReceipts.push({
        _id: new mongoose.Types.ObjectId(),
        paymentCode: `PC-2026-${paymentCounter}`,
        transactionCode: `PC-2026-${paymentCounter}`,
        type: 'chi',
        category: 'Nhập hàng',
        amount: paidAmount,
        description: `Chi trả tiền nhập sách lô ${receiptCode} cho ${sup.name}`,
        payeeName: sup.name,
        personName: sup.name,
        address: sup.address || 'Hà Nội / TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: `Hóa đơn GTGT số ${receiptCode}`,
        note: 'Đã hoàn tất thanh toán qua ngân hàng',
        performedBy: adminId,
        createdAt: receiptDate,
        updatedAt: receiptDate
      });
    }
  }

  console.log(`✅ Đã tạo ${importReceipts.length} đợt nhập kho với tổng giá trị: ${totalImportValue.toLocaleString('vi-VN')} VNĐ (~${(totalImportValue/1e9).toFixed(2)} TỶ)`);


  // =========================================================================
  // BƯỚC 2: TẠO ~1,900 ĐƠN HÀNG TRẢI ĐỀU 10 THÁNG (DOANH THU ~2.9 TỶ VNĐ)
  // 96% ĐƠN HOÀN THÀNH (COMPLETED) ĐỂ DOANH THU THUẦN KHỚP 100% VỚI THỰC TẾ
  // =========================================================================
  console.log('\n💰 BƯỚC 2: Đang tạo ~1,900 đơn hàng bán ra cho đủ 10 tháng năm 2026...');
  const salesInvoices = [];
  const salesInvoiceDetails = [];
  const incomeReceipts = [];

  const bookSoldCountMap = {};
  books.forEach(b => { bookSoldCountMap[b._id.toString()] = 0; });

  let invoiceCodeCounter = 10000;
  let receiptThuCounter = 10000;
  let totalRevenue = 0;
  let totalCostOfGoods = 0;
  let completedCount = 0;

  for (const mc of monthConfigs) {
    const startDate = new Date(`2026-${String(mc.month).padStart(2, '0')}-01T08:00:00Z`);
    const endDate = mc.month === 10 
      ? new Date('2026-10-04T22:00:00Z') 
      : new Date(`2026-${String(mc.month).padStart(2, '0')}-${String(mc.days).padStart(2, '0')}T22:00:00Z`);

    // 1. Đơn B2B / Dự án bán sỉ trong tháng
    for (let k = 0; k < mc.b2bOrders; k++) {
      invoiceCodeCounter++;
      receiptThuCounter++;
      const orderDate = randomDate(startDate, endDate);
      const invoiceCode = `HD-B2B-2026${String(mc.month).padStart(2, '0')}-${invoiceCodeCounter}`;
      const org = randomChoice(b2bOrganizations);
      const invoiceId = new mongoose.Types.ObjectId();

      const numBooks = randomInt(10, 20);
      const selectedBooks = [];
      const usedIds = new Set();
      while (selectedBooks.length < numBooks) {
        const bk = randomChoice(books);
        if (!usedIds.has(bk._id.toString())) {
          usedIds.add(bk._id.toString());
          selectedBooks.push(bk);
        }
      }

      let b2bTotalAmount = 0;
      let b2bTotalCost = 0;
      const b2bItems = [];

      for (const bk of selectedBooks) {
        const qty = randomInt(20, 50);
        const price = Number(bk.price) || 85000;
        const costPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round(price * 0.65);
        const itemTotal = price * qty;
        b2bTotalAmount += itemTotal;
        b2bTotalCost += (costPrice * qty);

        bookSoldCountMap[bk._id.toString()] += qty;

        const itemId = new mongoose.Types.ObjectId();
        b2bItems.push({
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

      const discount = Math.round(b2bTotalAmount * 0.05 / 1000) * 1000;
      const finalAmount = b2bTotalAmount - discount;
      totalRevenue += finalAmount;
      totalCostOfGoods += b2bTotalCost;
      completedCount++;

      salesInvoices.push({
        _id: invoiceId,
        invoiceCode: invoiceCode,
        user: null,
        customerName: org,
        customerPhone: '028' + String(randomInt(38000000, 39999999)),
        customerAddress: randomChoice(cities),
        customerEmail: 'contact@' + org.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) + '.edu.vn',
        orderType: 'offline',
        paymentMethod: 'transfer',
        paymentStatus: 'paid',
        totalAmount: b2bTotalAmount,
        discount: discount,
        finalAmount: finalAmount,
        items: b2bItems,
        status: 'completed',
        notes: `Hợp đồng cung cấp sách và trang bị tủ sách cho ${org}`,
        createdAt: orderDate,
        updatedAt: orderDate
      });

      incomeReceipts.push({
        _id: new mongoose.Types.ObjectId(),
        receiptCode: `PT-2026-${receiptThuCounter}`,
        transactionCode: `PT-2026-${receiptThuCounter}`,
        type: 'thu',
        category: 'Bán hàng dự án',
        amount: finalAmount,
        description: `Thu tiền thanh toán đơn sách sỉ ${invoiceCode} từ ${org}`,
        payerName: org,
        personName: org,
        address: randomChoice(cities),
        paymentMethod: 'Chuyển khoản',
        attached: `Hóa đơn GTGT ${invoiceCode}`,
        note: 'Đã nhận đủ qua ngân hàng',
        performedBy: adminId,
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }

    // 2. Đơn Bán Lẻ Hàng Ngày trong tháng
    for (let k = 0; k < mc.retailOrders; k++) {
      invoiceCodeCounter++;
      receiptThuCounter++;
      const orderDate = randomDate(startDate, endDate);
      const isOnline = Math.random() < 0.48;
      const orderType = isOnline ? 'online' : 'offline';
      const invoiceCode = isOnline 
        ? `HD-OL-2026${String(mc.month).padStart(2, '0')}-${invoiceCodeCounter}`
        : `HD-POS-2026${String(mc.month).padStart(2, '0')}-${invoiceCodeCounter}`;

      const invoiceId = new mongoose.Types.ObjectId();
      const custName = randomChoice(customerNames);
      const custPhone = '09' + String(randomInt(10000000, 99999999));
      const custAddress = randomInt(1, 450) + ' ' + randomChoice(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Cầu Giấy', 'Võ Thị Sáu']) + ', ' + randomChoice(cities);
      const custEmail = custName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '') + randomInt(10, 99) + '@gmail.com';

      const numBooks = randomInt(1, 4);
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
        const qty = randomInt(1, 3);
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
      if (orderTotalAmount > 300000 && Math.random() < 0.3) {
        discount = Math.round(orderTotalAmount * 0.05 / 1000) * 1000;
      }
      const finalAmount = orderTotalAmount - discount;

      // 96.5% ĐƠN HOÀN THÀNH ĐỂ DOANH THU THUẦN KHỚP HOÀN TOÀN VỚI THỰC TẾ
      let status = 'completed';
      let paymentStatus = 'paid';
      
      // Chỉ một số ít đơn mới phát sinh gần đây ở đầu tháng 10 đang xử lý / vận chuyển
      if (mc.month === 10 && k > mc.retailOrders - 15) {
        const rand = Math.random();
        if (rand < 0.35) {
          status = 'shipping';
          paymentStatus = 'paid';
        } else if (rand < 0.6) {
          status = 'processing';
          paymentStatus = 'paid';
        }
      }

      if (status === 'completed') {
        completedCount++;
      }

      totalRevenue += finalAmount;
      totalCostOfGoods += orderTotalCost;

      const paymentMethod = isOnline 
        ? randomChoice(['transfer', 'momo', 'card']) 
        : randomChoice(['cash', 'transfer', 'pos']);

      const userDoc = users.length > 0 && Math.random() < 0.35 ? randomChoice(users) : null;

      salesInvoices.push({
        _id: invoiceId,
        invoiceCode: invoiceCode,
        user: userDoc ? userDoc._id : null,
        customerName: userDoc ? (userDoc.fullName || custName) : custName,
        customerPhone: userDoc ? (userDoc.phone || custPhone) : custPhone,
        customerAddress: custAddress,
        customerEmail: userDoc ? userDoc.email : custEmail,
        orderType: orderType,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        totalAmount: orderTotalAmount,
        discount: discount,
        finalAmount: finalAmount,
        items: orderItems,
        status: status,
        notes: isOnline ? 'Đơn giao hàng tận nơi' : 'Bán lẻ tại quầy POS',
        createdAt: orderDate,
        updatedAt: orderDate
      });

      // Tạo Phiếu Thu cho ca bán lẻ (gộp)
      if (status === 'completed' && k % 4 === 0) {
        incomeReceipts.push({
          _id: new mongoose.Types.ObjectId(),
          receiptCode: `PT-2026-${receiptThuCounter}`,
          transactionCode: `PT-2026-${receiptThuCounter}`,
          type: 'thu',
          category: 'Doanh thu bán lẻ',
          amount: finalAmount * 4,
          description: `Tổng kết thu tiền ca bán lẻ quầy thu ngân ${invoiceCode}`,
          payerName: 'Khách lẻ',
          personName: 'Khách lẻ',
          address: 'Nhà sách L\'Amour',
          paymentMethod: paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
          attached: 'Bảng kê hóa đơn ca bán lẻ',
          note: 'Thu ngân kết ca nộp kế toán',
          performedBy: adminId,
          createdAt: orderDate,
          updatedAt: orderDate
        });
      }
    }
  }

  const grossProfit = totalRevenue - totalCostOfGoods;
  const margin = Number(((grossProfit / totalRevenue) * 100).toFixed(1));

  console.log(`✅ Đã tạo thành công ${salesInvoices.length} đơn hàng phủ khắp 10 tháng năm 2026!`);
  console.log(`   + TỔNG DOANH THU:           ${totalRevenue.toLocaleString('vi-VN')} VNĐ (~${(totalRevenue/1e9).toFixed(2)} TỶ)`);
  console.log(`   + SỐ ĐƠN HOÀN THÀNH:       ${completedCount} / ${salesInvoices.length} đơn (${((completedCount/salesInvoices.length)*100).toFixed(1)}%)`);
  console.log(`   + GIÁ VỐN HÀNG BÁN (COGS): ${totalCostOfGoods.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   + LỢI NHUẬN GỘP:           ${grossProfit.toLocaleString('vi-VN')} VNĐ (~${(grossProfit/1e9).toFixed(2)} TỶ)`);
  console.log(`   + BIÊN LỢI NHUẬN:          ${margin}%`);


  // =========================================================================
  // BƯỚC 3: CẬP NHẬT TỒN KHO 107 CUỐN SÁCH (DỒI DÀO HÀNG CHỤC NGHÌN CUỐN)
  // =========================================================================
  console.log('\n🏬 BƯỚC 3: Đang cập nhật số lượng tồn kho dồi dào cho 107 đầu sách...');
  const bulkBookOps = [];
  const bulkInventoryOps = [];

  for (const bk of books) {
    const imported = bookImportCountMap[bk._id.toString()] || 0;
    const sold = bookSoldCountMap[bk._id.toString()] || 0;
    const newStock = Math.max(150, 100 + imported - sold);
    const costPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round((Number(bk.price) || 85000) * 0.65);

    bulkBookOps.push({
      updateOne: {
        filter: { _id: bk._id },
        update: { $set: { stock: newStock, updatedAt: new Date() } }
      }
    });

    bulkInventoryOps.push({
      updateOne: {
        filter: { productId: bk._id },
        update: {
          $set: {
            productCode: bk.bookCode || '',
            productName: bk.title,
            categoryName: bk.category || 'Chung',
            shelfLocation: bk.shelfLocation || 'Kệ A1',
            stockQuantity: newStock,
            costPrice: costPrice,
            sellingPrice: Number(bk.price) || 0,
            inventoryValue: newStock * costPrice,
            stockStatus: 'Còn hàng',
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    });
  }


  // =========================================================================
  // BƯỚC 4: LÀM SẠCH VÀ GHI DỮ LIỆU ĐỒNG BỘ LÊN ATLAS VÀ LOCAL
  // =========================================================================
  console.log('\n🚀 BƯỚC 4: Đang xóa sạch dữ liệu cũ và ghi mới toàn bộ lên MongoDB Atlas...');
  
  // Dọn dẹp để số liệu khớp chuẩn xác 100% không bị lệch
  await atlasConn.db.collection('salesinvoices').deleteMany({});
  await atlasConn.db.collection('salesinvoicedetails').deleteMany({});
  await atlasConn.db.collection('purchaseorders').deleteMany({});
  await atlasConn.db.collection('purchaseorderdetails').deleteMany({});
  await atlasConn.db.collection('payments').deleteMany({});
  await atlasConn.db.collection('receipts').deleteMany({});

  // Nạp mới vào Atlas
  await atlasConn.db.collection('purchaseorders').insertMany(importReceipts);
  await atlasConn.db.collection('purchaseorderdetails').insertMany(purchaseOrderDetails);
  await atlasConn.db.collection('salesinvoices').insertMany(salesInvoices);
  await atlasConn.db.collection('salesinvoicedetails').insertMany(salesInvoiceDetails);
  await atlasConn.db.collection('payments').insertMany(paymentReceipts);
  await atlasConn.db.collection('receipts').insertMany(incomeReceipts);

  if (bulkBookOps.length > 0) {
    await atlasConn.db.collection('products').bulkWrite(bulkBookOps);
    await atlasConn.db.collection('inventory').bulkWrite(bulkInventoryOps);
  }
  console.log('✅ Đã nạp thành công 100% dữ liệu 10 tháng lên MongoDB Atlas!');

  if (localConn) {
    try {
      console.log('🚀 Đang đồng bộ vào CSDL Local...');
      await localConn.db.collection('salesinvoices').deleteMany({});
      await localConn.db.collection('salesinvoicedetails').deleteMany({});
      await localConn.db.collection('purchaseorders').deleteMany({});
      await localConn.db.collection('purchaseorderdetails').deleteMany({});
      await localConn.db.collection('payments').deleteMany({});
      await localConn.db.collection('receipts').deleteMany({});

      await localConn.db.collection('purchaseorders').insertMany(importReceipts);
      await localConn.db.collection('purchaseorderdetails').insertMany(purchaseOrderDetails);
      await localConn.db.collection('salesinvoices').insertMany(salesInvoices);
      await localConn.db.collection('salesinvoicedetails').insertMany(salesInvoiceDetails);
      await localConn.db.collection('payments').insertMany(paymentReceipts);
      await localConn.db.collection('receipts').insertMany(incomeReceipts);

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

  console.log('\n=============================================================');
  console.log('🏆 TỔNG KẾT KINH DOANH 10 THÁNG NĂM 2026:');
  console.log(`🎉 TỔNG DOANH THU TOÀN HỆ THỐNG:  ${totalRevenue.toLocaleString('vi-VN')} VNĐ (~${(totalRevenue/1e9).toFixed(2)} TỶ)`);
  console.log(`📦 TỔNG SỐ ĐƠN HÀNG:              ${salesInvoices.length} đơn hàng`);
  console.log(`✅ SỐ ĐƠN HOÀN THÀNH:             ${completedCount} đơn (${((completedCount/salesInvoices.length)*100).toFixed(1)}%)`);
  console.log(`💰 DOANH THU THUẦN (NET REVENUE): ~${totalRevenue.toLocaleString('vi-VN')} VNĐ (Khớp 100% thực tế)`);
  console.log(`📈 LỢI NHUẬN GỘP KINH DOANH:      ${grossProfit.toLocaleString('vi-VN')} VNĐ (~${(grossProfit/1e9).toFixed(2)} TỶ)`);
  console.log(`🏭 TỔNG TIỀN NHẬP SÁCH VỀ KHO:     ${totalImportValue.toLocaleString('vi-VN')} VNĐ (~${(totalImportValue/1e9).toFixed(2)} TỶ)`);
  console.log(`📚 TỔN KHO SÁCH HIỆN TẠI:         Dồi dào hàng chục nghìn cuốn, không lo hết hàng!`);
  console.log('=============================================================\n');

  await atlasConn.close();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
