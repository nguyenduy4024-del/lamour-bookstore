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
  'Nguyễn Hữu Thắng', 'Trần Ngọc Trâm', 'Lê Bích Thủy', 'Phạm Công Danh', 'Vũ Quốc Toàn'
];

const b2bOrganizations = [
  'Trường Quốc tế Song ngữ Wellspring', 'Thư viện THPT Chuyên Lê Hồng Phong',
  'Tập đoàn Giáo dục ILA Việt Nam', 'Công ty CP Công nghệ VNG',
  'Trường ĐH Kinh Tế - ĐHQG TP.HCM', 'Công ty Truyền thông Sun Life',
  'Tủ sách Khuyến học Miền Trung', 'CLB Sách & Hành Động Sài Gòn',
  'Trường Song ngữ Quốc tế Horizon', 'Ngân hàng TMCP Quân Đội - MB'
];

const cities = [
  'Quận 1, TP. Hồ Chí Minh', 'Quận 3, TP. Hồ Chí Minh', 'Quận 7, TP. Hồ Chí Minh', 'TP. Thủ Đức, TP.HCM',
  'Quận Cầu Giấy, Hà Nội', 'Quận Ba Đình, Hà Nội', 'Quận Đống Đa, Hà Nội', 'Quận Hai Bà Trưng, Hà Nội',
  'Quận Hải Châu, Đà Nẵng', 'Quận Ninh Kiều, Cần Thơ', 'Quận Hồng Bàng, Hải Phòng', 'TP. Nha Trang, Khánh Hòa'
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
  date.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));
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
    console.warn('⚠️ Local MongoDB không phản hồi, sẽ tiếp tục nạp thẳng vào Atlas.');
  }

  const books = await atlasConn.db.collection('products').find({}).toArray();
  const suppliers = await atlasConn.db.collection('suppliers').find({}).toArray();
  const users = await atlasConn.db.collection('users').find({ role: 'user' }).toArray();
  const adminUser = await atlasConn.db.collection('users').findOne({ role: 'admin' });
  const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

  console.log(`📊 Tìm thấy: ${books.length} sách thật, ${suppliers.length} nhà cung cấp, ${users.length} khách hàng.`);

  if (books.length === 0 || suppliers.length === 0) {
    console.error('❌ Thiếu dữ liệu sách hoặc nhà cung cấp!');
    process.exit(1);
  }

  // =========================================================================
  // BƯỚC 1: NHẬP HÀNG KHỦNG (TỔNG GIÁ TRỊ NHẬP ~ 1.95 TỶ VNĐ)
  // Đảm bảo kho sách dồi dào hàng vạn cuốn, không bao giờ hết hàng
  // =========================================================================
  console.log('\n📦 BƯỚC 1: Đang tạo các lô nhập hàng lớn từ các Nhà Xuất Bản (~2 TỶ VNĐ)...');
  
  const importReceipts = [];
  const purchaseOrderDetails = [];
  const paymentReceipts = []; // Phiếu chi tiền nhập hàng

  const bookImportCountMap = {}; // Theo dõi số lượng từng cuốn được nhập
  books.forEach(b => { bookImportCountMap[b._id.toString()] = 0; });

  let receiptCounter = 100;
  let paymentCounter = 500;
  let totalImportValue = 0;
  let totalPaidToSuppliers = 0;

  // 40 Đợt nhập hàng từ tháng 5/2026 đến tháng 10/2026
  for (let m = 5; m <= 10; m++) {
    const batchesInMonth = m === 10 ? 4 : 7;
    const startDate = new Date(`2026-${String(m).padStart(2, '0')}-01T08:00:00Z`);
    const endDate = m === 10 
      ? new Date('2026-10-04T18:00:00Z') 
      : new Date(`2026-${String(m).padStart(2, '0')}-28T18:00:00Z`);

    for (let b = 0; b < batchesInMonth; b++) {
      receiptCounter++;
      paymentCounter++;
      const sup = randomChoice(suppliers);
      const receiptDate = randomDate(startDate, endDate);
      const receiptCode = `PN-2026${String(m).padStart(2, '0')}-${String(receiptCounter).padStart(3, '0')}`;
      const receiptId = new mongoose.Types.ObjectId();

      // Mỗi phiếu nhập từ 10 đến 25 đầu sách, mỗi đầu sách 50 đến 150 cuốn
      const numBooks = randomInt(12, 25);
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
        const qty = randomInt(50, 180);
        const importPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round((Number(bk.price) || 80000) * 0.65);
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

      // Thanh toán 85% - 100% tiền nhập hàng cho NXB
      const isFullPaid = Math.random() < 0.75;
      const paidAmount = isFullPaid ? batchTotalAmount : Math.round(batchTotalAmount * 0.75 / 10000) * 10000;
      const paymentStatus = isFullPaid ? 'paid' : 'partial';
      totalPaidToSuppliers += paidAmount;

      importReceipts.push({
        _id: receiptId,
        receiptCode: receiptCode,
        invoiceNo: `HD-VAT-${randomInt(100000, 999999)}`,
        invoiceNumber: `HD-VAT-${randomInt(100000, 999999)}`,
        receiptDate: receiptDate,
        warehouseName: 'Kho bán hàng trung tâm',
        importWarehouse: 'Kho bán hàng trung tâm',
        reason: 'Nhập bổ sung nguồn sách phục vụ kế hoạch kinh doanh',
        supplier: sup._id,
        delivererName: 'Nhân viên giao nhận ' + sup.name,
        receiverStaff: 'Lê Văn Nam (Thủ kho)',
        createdBy: adminId,
        items: receiptItems,
        totalAmount: batchTotalAmount,
        totalQuantity: batchTotalQty,
        paidAmount: paidAmount,
        paymentStatus: paymentStatus,
        status: 'completed',
        approvedBy: adminId,
        approvedAt: receiptDate,
        completedBy: adminId,
        completedAt: receiptDate,
        createdAt: receiptDate,
        updatedAt: receiptDate
      });

      // Tạo Phiếu Chi tương ứng vào Payments
      paymentReceipts.push({
        _id: new mongoose.Types.ObjectId(),
        paymentCode: `PC-2026-${String(paymentCounter).padStart(4, '0')}`,
        transactionCode: `PC-2026-${String(paymentCounter).padStart(4, '0')}`,
        type: 'chi',
        category: 'Nhập hàng',
        amount: paidAmount,
        description: `Chi thanh toán tiền nhập sách theo ${receiptCode} cho ${sup.name}`,
        payeeName: sup.name,
        personName: sup.name,
        address: sup.address || 'Hà Nội / TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: `Hóa đơn GTGT & Biên bản giao nhận ${receiptCode}`,
        note: `Thanh toán ${paymentStatus === 'paid' ? 'hoàn tất 100%' : 'đợt 1 (75%)'} lô sách`,
        performedBy: adminId,
        createdAt: receiptDate,
        updatedAt: receiptDate
      });
    }
  }

  console.log(`✅ Đã tạo xong ${importReceipts.length} đợt nhập hàng lớn!`);
  console.log(`   + Tổng giá trị hàng nhập: ${totalImportValue.toLocaleString('vi-VN')} VNĐ (~${(totalImportValue/1e9).toFixed(2)} TỶ)`);
  console.log(`   + Đã chi thanh toán cho NXB: ${totalPaidToSuppliers.toLocaleString('vi-VN')} VNĐ`);


  // =========================================================================
  // BƯỚC 2: TẠO ĐƠN HÀNG BÁN RA (TỔNG DOANH THU ĐẠT ~ 1.15 TỶ VNĐ)
  // Kết hợp bán lẻ hàng ngày + các đơn bán sỉ dự án trường học, thư viện
  // =========================================================================
  console.log('\n💰 BƯỚC 2: Đang tạo các đơn hàng để doanh số cán mốc > 1.1 TỶ VNĐ...');

  const salesInvoices = [];
  const salesInvoiceDetails = [];
  const incomeReceipts = []; // Phiếu thu tiền bán hàng

  const bookSoldCountMap = {};
  books.forEach(b => { bookSoldCountMap[b._id.toString()] = 0; });

  let invoiceCodeCounter = 1000;
  let receiptThuCounter = 100;
  let totalRevenue = 0;
  let totalCostOfGoods = 0;

  // 1. Tạo 28 Đơn Bán Sỉ Dự Án / Doanh nghiệp / Trường học (15 - 45 triệu / đơn)
  for (let m = 5; m <= 10; m++) {
    const b2bInMonth = m === 10 ? 3 : 5;
    const startDate = new Date(`2026-${String(m).padStart(2, '0')}-02T09:00:00Z`);
    const endDate = m === 10 
      ? new Date('2026-10-04T17:00:00Z') 
      : new Date(`2026-${String(m).padStart(2, '0')}-27T17:00:00Z`);

    for (let k = 0; k < b2bInMonth; k++) {
      invoiceCodeCounter++;
      receiptThuCounter++;
      const orderDate = randomDate(startDate, endDate);
      const invoiceCode = `HD-B2B-2026${String(m).padStart(2, '0')}-${invoiceCodeCounter}`;
      const org = randomChoice(b2bOrganizations);
      const invoiceId = new mongoose.Types.ObjectId();

      const numBooks = randomInt(8, 16);
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
        const qty = randomInt(15, 45); // mua sỉ số lượng nhiều
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

      // Chiết khấu bán sỉ 8%
      const discount = Math.round(b2bTotalAmount * 0.08 / 1000) * 1000;
      const finalAmount = b2bTotalAmount - discount;
      totalRevenue += finalAmount;
      totalCostOfGoods += b2bTotalCost;

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

      // Tạo Phiếu Thu tiền sỉ
      incomeReceipts.push({
        _id: new mongoose.Types.ObjectId(),
        receiptCode: `PT-2026-${String(receiptThuCounter).padStart(4, '0')}`,
        transactionCode: `PT-2026-${String(receiptThuCounter).padStart(4, '0')}`,
        type: 'thu',
        category: 'Bán hàng dự án',
        amount: finalAmount,
        description: `Thu tiền thanh toán đơn sách sỉ ${invoiceCode} từ ${org}`,
        payerName: org,
        personName: org,
        address: randomChoice(cities),
        paymentMethod: 'Chuyển khoản',
        attached: `Hợp đồng kinh tế & Hóa đơn GTGT ${invoiceCode}`,
        note: 'Đã nhận đủ 100% qua tài khoản ngân hàng nhà sách',
        performedBy: adminId,
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }
  }

  // 2. Tạo thêm 450 Đơn Bán Lẻ Hàng Ngày (POS & Online) phủ kín biểu đồ
  for (let m = 5; m <= 10; m++) {
    // Tăng trưởng số lượng đơn theo từng tháng
    const ordersInMonth = m === 5 ? 50 : (m === 6 ? 65 : (m === 7 ? 80 : (m === 8 ? 95 : (m === 9 ? 120 : 50))));
    const startDate = new Date(`2026-${String(m).padStart(2, '0')}-01T08:30:00Z`);
    const endDate = m === 10 
      ? new Date('2026-10-04T22:00:00Z') 
      : new Date(`2026-${String(m).padStart(2, '0')}-28T22:00:00Z`);

    for (let k = 0; k < ordersInMonth; k++) {
      invoiceCodeCounter++;
      receiptThuCounter++;
      const orderDate = randomDate(startDate, endDate);
      const isOnline = Math.random() < 0.48;
      const orderType = isOnline ? 'online' : 'offline';
      const invoiceCode = isOnline 
        ? `HD-OL-2026${String(m).padStart(2, '0')}-${invoiceCodeCounter}`
        : `HD-POS-2026${String(m).padStart(2, '0')}-${invoiceCodeCounter}`;
      
      const invoiceId = new mongoose.Types.ObjectId();
      const custName = randomChoice(customerNames);
      const custPhone = '09' + String(randomInt(10000000, 99999999));
      const custAddress = randomInt(1, 500) + ' ' + randomChoice(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Võ Văn Kiệt', 'Cầu Giấy']) + ', ' + randomChoice(cities);
      const custEmail = custName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '') + randomInt(10, 99) + '@gmail.com';

      const numBooks = randomInt(1, 5);
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
        const qty = randomInt(1, 4);
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
      if (orderTotalAmount > 350000 && Math.random() < 0.35) {
        discount = Math.round(orderTotalAmount * 0.05 / 1000) * 1000;
      }
      const finalAmount = orderTotalAmount - discount;

      let status = 'completed';
      let paymentStatus = 'paid';
      if (m === 10 && k > ordersInMonth - 12) {
        const r = Math.random();
        if (r < 0.3) { status = 'shipping'; paymentStatus = 'paid'; }
        else if (r < 0.5) { status = 'pending_confirmation'; paymentStatus = 'unpaid'; }
        else if (r < 0.7) { status = 'processing'; paymentStatus = 'paid'; }
      }

      if (['completed', 'shipping', 'processing'].includes(status) || paymentStatus === 'paid') {
        totalRevenue += finalAmount;
        totalCostOfGoods += orderTotalCost;
      }

      const paymentMethod = isOnline 
        ? randomChoice(['transfer', 'momo', 'card']) 
        : randomChoice(['cash', 'transfer', 'pos']);

      const userDoc = users.length > 0 && Math.random() < 0.4 ? randomChoice(users) : null;

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
        notes: isOnline ? 'Đơn đặt trực tuyến giao qua bưu tá' : 'Khách mua trực tiếp tại quầy thu ngân',
        createdAt: orderDate,
        updatedAt: orderDate
      });

      // Nếu hoàn thành, tạo phiếu thu tiền bán lẻ (gộp theo đợt)
      if (status === 'completed' && k % 3 === 0) {
        incomeReceipts.push({
          _id: new mongoose.Types.ObjectId(),
          receiptCode: `PT-2026-${String(receiptThuCounter).padStart(4, '0')}`,
          transactionCode: `PT-2026-${String(receiptThuCounter).padStart(4, '0')}`,
          type: 'thu',
          category: 'Doanh thu bán lẻ',
          amount: finalAmount * 3,
          description: `Tổng kết thu tiền ca bán lẻ quầy thu ngân & đơn online ${invoiceCode}`,
          payerName: isOnline ? 'Khách đặt online' : 'Khách lẻ tại quầy',
          personName: 'Khách lẻ',
          address: 'Nhà sách L\'Amour',
          paymentMethod: paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
          attached: `Bảng kê hóa đơn ca bán`,
          note: 'Thu ngân kết ca nộp tiền kế toán',
          performedBy: adminId,
          createdAt: orderDate,
          updatedAt: orderDate
        });
      }
    }
  }

  const grossProfit = totalRevenue - totalCostOfGoods;
  const margin = Number(((grossProfit / totalRevenue) * 100).toFixed(1));

  console.log(`✅ Đã tạo xong ${salesInvoices.length} đơn hàng mới!`);
  console.log(`   + TỔNG DOANH THU MỚI TẠO: ${totalRevenue.toLocaleString('vi-VN')} VNĐ (~${(totalRevenue/1e9).toFixed(2)} TỶ)`);
  console.log(`   + GIÁ VỐN HÀNG BÁN (COGS): ${totalCostOfGoods.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   + LỢI NHUẬN GỘP:           ${grossProfit.toLocaleString('vi-VN')} VNĐ`);
  console.log(`   + TỶ SUẤT LỢI NHUẬN:       ${margin}%`);


  // =========================================================================
  // BƯỚC 3: CẬP NHẬT TỒN KHO THỰC TẾ TRONG KHO (PRODUCTS & INVENTORY)
  // Tính chính xác: Stock mới = Tồn cũ + Nhập mới - Bán mới (> 0 dồi dào)
  // =========================================================================
  console.log('\n🏬 BƯỚC 3: Đang cập nhật số lượng tồn kho dồi dào cho 107 đầu sách...');
  const bulkBookOps = [];
  const bulkInventoryOps = [];

  for (const bk of books) {
    const imported = bookImportCountMap[bk._id.toString()] || 0;
    const sold = bookSoldCountMap[bk._id.toString()] || 0;
    const currentStock = Math.max(15, Number(bk.stock) || 50);
    const newStock = Math.max(80, currentStock + imported - sold);
    const costPrice = Number(bk.costPrice) > 0 ? Number(bk.costPrice) : Math.round((Number(bk.price) || 80000) * 0.65);

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
  // BƯỚC 4: NẠP VÀO CSDL ATLAS & LOCAL
  // =========================================================================
  console.log('\n🚀 BƯỚC 4: Đang ghi toàn bộ dữ liệu lên MongoDB Atlas...');
  
  // 1. Nhập hàng
  await atlasConn.db.collection('purchaseorders').insertMany(importReceipts);
  await atlasConn.db.collection('purchaseorderdetails').insertMany(purchaseOrderDetails);
  
  // 2. Bán hàng
  await atlasConn.db.collection('salesinvoices').insertMany(salesInvoices);
  await atlasConn.db.collection('salesinvoicedetails').insertMany(salesInvoiceDetails);

  // 3. Giao dịch Thu & Chi
  await atlasConn.db.collection('payments').insertMany(paymentReceipts);
  await atlasConn.db.collection('receipts').insertMany(incomeReceipts);

  // 4. Cập nhật tồn kho sách
  if (bulkBookOps.length > 0) {
    await atlasConn.db.collection('products').bulkWrite(bulkBookOps);
    await atlasConn.db.collection('inventory').bulkWrite(bulkInventoryOps);
  }

  console.log('✅ Đã ghi thành công toàn bộ lên MongoDB Atlas!');

  // Nếu local đang chạy, ghi luôn vào Local
  if (localConn) {
    try {
      console.log('🚀 Đang ghi dữ liệu vào CSDL Local...');
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
      console.log('✅ Đã đồng bộ vào Local MongoDB!');
      await localConn.close();
    } catch (localErr) {
      console.warn('⚠️ Lỗi đồng bộ Local:', localErr.message);
    }
  }

  // Tổng hợp con số sau khi hoàn thành
  const finalTotalRevenue = await atlasConn.db.collection('salesinvoices').aggregate([
    { $match: { $or: [{ status: 'completed' }, { paymentStatus: 'paid' }] } },
    { $group: { _id: null, total: { $sum: '$finalAmount' }, count: { $sum: 1 } } }
  ]).toArray();

  const finalRevVal = finalTotalRevenue[0] ? finalTotalRevenue[0].total : 0;
  const finalOrdersCount = finalTotalRevenue[0] ? finalTotalRevenue[0].count : 0;

  console.log('\n=============================================================');
  console.log('🏆 TỔNG KẾT KINH DOANH SAU KHI CÁN MỐC:');
  console.log(`🎉 TỔNG DOANH THU TOÀN HỆ THỐNG:  ${finalRevVal.toLocaleString('vi-VN')} VNĐ (~${(finalRevVal/1e9).toFixed(2)} TỶ)`);
  console.log(`📦 TỔNG SỐ ĐƠN HÀNG:              ${finalOrdersCount} đơn hàng`);
  console.log(`🏭 TỔNG TIỀN NHẬP SÁCH VỀ KHO:     ${totalImportValue.toLocaleString('vi-VN')} VNĐ (~${(totalImportValue/1e9).toFixed(2)} TỶ)`);
  console.log(`📈 LỢI NHUẬN GỘP KINH DOANH:      ~${grossProfit.toLocaleString('vi-VN')} VNĐ (~${(grossProfit/1e6).toFixed(1)} TRIỆU)`);
  console.log(`📚 TỔN KHO SÁCH HIỆN TẠI:         Dồi dào, tất cả 107 đầu sách đều còn hàng!`);
  console.log('=============================================================\n');

  await atlasConn.close();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
