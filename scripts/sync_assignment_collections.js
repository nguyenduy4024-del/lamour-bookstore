/**
 * SCRIPT ĐỒNG BỘ CSDL CHUẨN ĐỀ BÀI (14 BẢNG TỐI THIỂU)
 * 
 * Đề bài yêu cầu:
 * 1. Users
 * 2. Roles
 * 3. Customers
 * 4. Suppliers
 * 5. Categories
 * 6. Products
 * 7. PurchaseOrders
 * 8. PurchaseOrderDetails
 * 9. SalesInvoices
 * 10. SalesInvoiceDetails
 * 11. Receipts
 * 12. Payments
 * 13. Inventory
 * 14. Employees
 * 
 * Hướng dẫn chạy:
 *   node scripts/sync_assignment_collections.js
 * Hoặc muốn tạo chính xác tên PascalCase (chữ hoa đầu từ):
 *   node scripts/sync_assignment_collections.js --case=pascal
 * Hoặc tạo cả 2 dạng (vừa lowercase vừa PascalCase):
 *   node scripts/sync_assignment_collections.js --case=both
 */

const mongoose = require('mongoose');
require('dotenv').config();

const args = process.argv.slice(2);
let caseOption = 'lower'; // 'lower' (mặc định), 'pascal', hoặc 'both'
for (const arg of args) {
  if (arg.startsWith('--case=')) {
    caseOption = arg.split('=')[1].toLowerCase();
  } else if (arg === '--pascal') {
    caseOption = 'pascal';
  } else if (arg === '--both') {
    caseOption = 'both';
  }
}

// Bảng ánh xạ 14 bảng theo đề bài
const TABLE_NAMES = {
  1: { pascal: 'Users', lower: 'users' },
  2: { pascal: 'Roles', lower: 'roles' },
  3: { pascal: 'Customers', lower: 'customers' },
  4: { pascal: 'Suppliers', lower: 'suppliers' },
  5: { pascal: 'Categories', lower: 'categories' },
  6: { pascal: 'Products', lower: 'products' },
  7: { pascal: 'PurchaseOrders', lower: 'purchaseorders' },
  8: { pascal: 'PurchaseOrderDetails', lower: 'purchaseorderdetails' },
  9: { pascal: 'SalesInvoices', lower: 'salesinvoices' },
  10: { pascal: 'SalesInvoiceDetails', lower: 'salesinvoicedetails' },
  11: { pascal: 'Receipts', lower: 'receipts' },
  12: { pascal: 'Payments', lower: 'payments' },
  13: { pascal: 'Inventory', lower: 'inventory' },
  14: { pascal: 'Employees', lower: 'employees' }
};

async function syncAssignmentDatabase() {
  console.log('='.repeat(70));
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ CSDL THEO YÊU CẦU ĐỀ BÀI (14 BẢNG TỐI THIỂU)');
  console.log(`📌 Chế độ đặt tên collection: ${caseOption.toUpperCase()}`);
  console.log('='.repeat(70));

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Đọc dữ liệu nguồn hiện có
    console.log('\n📥 Đang đọc dữ liệu nguồn từ hệ thống...');
    const rawUsers = await db.collection('users').find().toArray();
    const rawBooks = await db.collection('books').find().toArray();
    const rawInvoices = await db.collection('invoices').find().toArray();
    const rawImports = await db.collection('importreceipts').find().toArray();
    const rawTransactions = await db.collection('transactions').find().toArray();
    const rawSuppliers = await db.collection('suppliers').find().toArray();
    const rawCategories = await db.collection('categories').find().toArray();
    const rawShelves = await db.collection('shelves').find().toArray();

    console.log(`  ✓ Đã nạp: ${rawUsers.length} Users, ${rawBooks.length} Books, ${rawInvoices.length} Invoices, ${rawImports.length} ImportReceipts, ${rawTransactions.length} Transactions`);

    // Tạo Map hỗ trợ tra cứu nhanh
    const bookMap = new Map();
    rawBooks.forEach(b => bookMap.set(b._id.toString(), b));

    const supplierMap = new Map();
    rawSuppliers.forEach(s => supplierMap.set(s._id.toString(), s));

    const userMap = new Map();
    rawUsers.forEach(u => userMap.set(u._id.toString(), u));

    // Thống kê doanh số theo khách hàng từ invoices
    const customerSpendingMap = new Map();
    rawInvoices.forEach(inv => {
      const key = (inv.user ? inv.user.toString() : null) || (inv.customerPhone ? inv.customerPhone.trim() : null) || inv.customerName;
      if (!customerSpendingMap.has(key)) {
        customerSpendingMap.set(key, { totalSpent: 0, orderCount: 0 });
      }
      const data = customerSpendingMap.get(key);
      data.totalSpent += (inv.finalAmount || inv.totalAmount || 0);
      data.orderCount += 1;
    });

    // ==========================================
    // CHUẨN BỊ DỮ LIỆU CHO 14 BẢNG
    // ==========================================

    // BẢNG 2: Roles (Vai trò / Phân quyền)
    const roleDefinitions = [
      {
        roleCode: 'ADMIN',
        roleName: 'Quản trị viên hệ thống',
        description: 'Toàn quyền cấu hình hệ thống, quản lý tài khoản, dữ liệu và phân quyền',
        permissions: ['ALL', 'SYSTEM_CONFIG', 'MANAGE_USERS', 'MANAGE_FINANCE', 'MANAGE_INVENTORY']
      },
      {
        roleCode: 'MANAGER',
        roleName: 'Quản lý cửa hàng',
        description: 'Quản lý hoạt động kinh doanh, nhân viên, phê duyệt phiếu nhập/xuất và xem báo cáo',
        permissions: ['VIEW_REPORTS', 'MANAGE_EMPLOYEES', 'APPROVE_ORDERS', 'MANAGE_PRODUCTS']
      },
      {
        roleCode: 'STAFF',
        roleName: 'Nhân viên bán hàng / Thu ngân',
        description: 'Tạo hóa đơn bán hàng tại quầy POS, tra cứu thông tin sản phẩm và khách hàng',
        permissions: ['POS_CHECKOUT', 'CREATE_INVOICE', 'VIEW_PRODUCTS', 'VIEW_CUSTOMERS']
      },
      {
        roleCode: 'STOCK',
        roleName: 'Thủ kho',
        description: 'Quản lý kho hàng, lập phiếu nhập hàng, xuất kho, sắp xếp kệ và kiểm kê tồn kho',
        permissions: ['MANAGE_STOCK', 'CREATE_IMPORT_RECEIPT', 'STOCK_AUDIT', 'MANAGE_SHELVES']
      },
      {
        roleCode: 'ACCOUNTANT',
        roleName: 'Kế toán',
        description: 'Quản lý sổ quỹ thu chi, phiếu thu, phiếu chi, theo dõi công nợ và báo cáo tài chính',
        permissions: ['MANAGE_FINANCE', 'CREATE_RECEIPT', 'CREATE_PAYMENT', 'FINANCIAL_REPORTS']
      },
      {
        roleCode: 'CUSTOMER',
        roleName: 'Khách hàng thành viên',
        description: 'Khách hàng mua sách, tra cứu đơn hàng, tích lũy điểm thưởng và hưởng ưu đãi',
        permissions: ['VIEW_PRODUCTS', 'ORDER_ONLINE', 'VIEW_ORDER_HISTORY']
      }
    ];

    const roleObjMap = new Map();
    roleDefinitions.forEach(r => {
      const objId = new mongoose.Types.ObjectId();
      r._id = objId;
      roleObjMap.set(r.roleCode.toLowerCase(), objId);
    });

    // BẢNG 1: Users (Tài khoản người dùng)
    const usersData = rawUsers.map(u => {
      const roleKey = (u.role || 'user').toLowerCase();
      let mappedRoleCode = 'CUSTOMER';
      if (roleKey === 'admin') mappedRoleCode = 'ADMIN';
      else if (roleKey === 'staff') mappedRoleCode = 'STAFF';
      else if (roleKey === 'stock') mappedRoleCode = 'STOCK';
      else if (roleKey === 'accountant') mappedRoleCode = 'ACCOUNTANT';
      else if (roleKey === 'manager') mappedRoleCode = 'MANAGER';

      return {
        _id: u._id,
        username: u.email ? u.email.split('@')[0] : u.phone,
        email: u.email,
        phone: u.phone,
        name: u.name,
        password: u.password,
        roleCode: mappedRoleCode,
        roleId: roleObjMap.get(mappedRoleCode.toLowerCase()) || null,
        role: u.role,
        avatar: u.avatar || '/images/default-avatar.png',
        gender: u.gender || 'Khác',
        isActive: u.isActive !== false,
        status: u.status || 'active',
        createdAt: u.createdAt || new Date()
      };
    });

    // BẢNG 3: Customers (Khách hàng)
    const customerUsers = rawUsers.filter(u => u.role === 'user');
    let customerCounter = 1;
    const customersData = customerUsers.map(u => {
      const code = `KH-${String(customerCounter++).padStart(4, '0')}`;
      const spendInfo = customerSpendingMap.get(u._id.toString()) || 
                        customerSpendingMap.get(u.phone) || 
                        customerSpendingMap.get(u.name) || 
                        { totalSpent: 0, orderCount: 0 };

      return {
        _id: u._id, // Giữ ID tương thích với User
        customerCode: code,
        userId: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        gender: u.gender || 'Khác',
        address: u.address || 'TP. Hồ Chí Minh',
        totalSpent: spendInfo.totalSpent,
        orderCount: spendInfo.orderCount,
        loyaltyPoints: Math.floor(spendInfo.totalSpent / 10000), // 10.000đ = 1 điểm
        customerType: spendInfo.totalSpent > 2000000 ? 'VIP' : (spendInfo.totalSpent > 500000 ? 'Thân thiết' : 'Tiêu chuẩn'),
        isActive: u.isActive !== false,
        createdAt: u.createdAt || new Date()
      };
    });

    // BẢNG 14: Employees (Nhân viên)
    const employeeUsers = rawUsers.filter(u => u.role !== 'user');
    let employeeCounter = 1;
    const employeesData = employeeUsers.map(u => {
      const code = `NV-${String(employeeCounter++).padStart(3, '0')}`;
      let position = 'Nhân viên bán hàng';
      let department = 'Kinh doanh & Bán lẻ';
      let baseSalary = 8000000;

      if (u.role === 'admin') {
        position = 'Quản trị viên / Giám đốc';
        department = 'Ban Điều Hành';
        baseSalary = 25000000;
      } else if (u.role === 'stock') {
        position = 'Thủ kho';
        department = 'Kho vận & Tiếp vận';
        baseSalary = 9000000;
      } else if (u.role === 'accountant') {
        position = 'Kế toán viên';
        department = 'Tài chính - Kế toán';
        baseSalary = 12000000;
      }

      return {
        _id: u._id,
        employeeCode: code,
        userId: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        gender: u.gender || 'Nam',
        department: department,
        position: position,
        roleCode: (u.role || 'staff').toUpperCase(),
        roleId: roleObjMap.get(u.role ? u.role.toLowerCase() : 'staff') || null,
        baseSalary: baseSalary,
        status: u.status || 'active',
        hireDate: u.createdAt || new Date(),
        createdAt: u.createdAt || new Date()
      };
    });

    // BẢNG 4: Suppliers (Nhà cung cấp)
    const suppliersData = rawSuppliers.map((s, idx) => ({
      _id: s._id,
      supplierCode: s.code || `NCC-${String(idx + 1).padStart(3, '0')}`,
      name: s.name,
      contactPerson: s.contactPerson || 'Bộ phận Kinh doanh',
      phone: s.phone || '028 3822 0000',
      email: s.email || `contact@${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.vn`,
      address: s.address || 'TP. Hồ Chí Minh',
      taxCode: s.taxCode || `03${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: s.status || 'active',
      notes: s.notes || 'Nhà cung cấp sách chính hãng',
      createdAt: s.createdAt || new Date()
    }));

    // BẢNG 5: Categories (Thể loại sản phẩm)
    const categoriesData = rawCategories.map((c, idx) => ({
      _id: c._id,
      categoryCode: c.code || `CAT-${String(idx + 1).padStart(3, '0')}`,
      name: c.name,
      slug: c.slug || `danh-muc-${idx + 1}`,
      description: c.description || `Các ấn phẩm thuộc thể loại ${c.name}`,
      status: 'active',
      createdAt: c.createdAt || new Date()
    }));

    // BẢNG 6: Products (Sản phẩm - Sách)
    const productsData = rawBooks.map((b, idx) => ({
      ...b,
      productCode: b.bookCode || `SP-${String(idx + 1).padStart(4, '0')}`,
      productName: b.title,
      title: b.title,
      author: b.author || 'Đang cập nhật',
      categoryId: b.categoryRef || null,
      categoryName: b.category || 'Chung',
      supplierId: b.supplier || null,
      supplierName: b.supplier ? (supplierMap.get(b.supplier.toString())?.name || '') : '',
      costPrice: b.costPrice || Math.round((b.price || 50000) * 0.7),
      price: b.price || 0,
      sellingPrice: b.price || 0,
      stockQuantity: b.stock || 0,
      unit: 'Quyển',
      shelfLocation: b.shelfLocation || 'Kệ A1',
      coverImage: b.coverImage || '/images/default-book.png',
      isbn: b.isbn || `978-604-${Math.floor(1000000 + Math.random() * 9000000)}`,
      publisher: b.publisher || 'NXB Trẻ',
      publishYear: b.publishYear || 2024,
      status: (b.stock > 0) ? 'in_stock' : 'out_of_stock',
      createdAt: b.createdAt || new Date()
    }));

    // BẢNG 7: PurchaseOrders (Đơn đặt hàng nhập)
    const purchaseOrdersData = rawImports.map((imp, idx) => {
      const sup = imp.supplier ? supplierMap.get(imp.supplier.toString()) : null;
      return {
        ...imp,
        orderCode: imp.receiptCode || `PO-${String(idx + 1).padStart(4, '0')}`,
        receiptCode: imp.receiptCode,
        supplierId: imp.supplier || null,
        supplierName: sup?.name || imp.supplierName || 'Nhà cung cấp',
        supplierAddress: sup?.address || imp.supplierAddress || '',
        orderDate: imp.receiptDate || imp.createdAt || new Date(),
        totalAmount: imp.totalAmount || 0,
        warehouseName: imp.warehouseName || imp.importWarehouse || 'Kho bán hàng trung tâm',
        warehouseAddress: imp.warehouseAddress || '123 Đường Sách, Q.1, TP.HCM',
        employeeName: imp.createdEmployee || imp.deliverer || 'Thủ kho',
        deliverer: imp.deliverer || '',
        status: imp.status || 'completed',
        reason: imp.reason || 'Nhập bổ sung tồn kho định kỳ',
        totalItemsCount: Array.isArray(imp.items) ? imp.items.length : 0,
        createdAt: imp.createdAt || new Date()
      };
    });

    // BẢNG 8: PurchaseOrderDetails (Chi tiết đơn mua hàng)
    const purchaseOrderDetailsData = [];
    rawImports.forEach(imp => {
      if (Array.isArray(imp.items)) {
        imp.items.forEach((item, itemIdx) => {
          const book = item.book ? bookMap.get(item.book.toString()) : null;
          const qty = item.quantity || 1;
          const unitPrice = item.importPrice || item.price || 0;
          purchaseOrderDetailsData.push({
            _id: item._id || new mongoose.Types.ObjectId(),
            purchaseOrderId: imp._id,
            orderCode: imp.receiptCode,
            productId: item.book || null,
            productCode: book?.bookCode || '',
            productName: book?.title || 'Sản phẩm nhập kho',
            quantity: qty,
            unitPrice: unitPrice,
            totalPrice: qty * unitPrice,
            unit: item.unit || 'Quyển',
            note: item.itemNote || '',
            createdAt: imp.receiptDate || imp.createdAt || new Date()
          });
        });
      }
    });

    // BẢNG 9: SalesInvoices (Hóa đơn bán hàng)
    const salesInvoicesData = rawInvoices.map((inv, idx) => ({
      ...inv,
      invoiceCode: inv.invoiceCode || `HD-${String(idx + 1).padStart(5, '0')}`,
      customerId: inv.user || null,
      customerName: inv.customerName || 'Khách lẻ',
      customerPhone: inv.customerPhone || '',
      customerAddress: inv.customerAddress || '',
      orderType: inv.orderType || 'offline',
      paymentMethod: inv.paymentMethod || 'cash',
      totalAmount: inv.totalAmount || 0,
      discount: inv.discount || 0,
      finalAmount: inv.finalAmount || inv.totalAmount || 0,
      paymentStatus: inv.paymentStatus || (inv.isPaidByCustomer ? 'paid' : 'paid'),
      status: inv.status || 'completed',
      itemCount: Array.isArray(inv.items) ? inv.items.length : 0,
      sellerName: inv.createdByName || 'Thu ngân tại quầy',
      createdAt: inv.createdAt || new Date()
    }));

    // BẢNG 10: SalesInvoiceDetails (Chi tiết hóa đơn bán hàng)
    const salesInvoiceDetailsData = [];
    rawInvoices.forEach(inv => {
      if (Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const book = item.book ? bookMap.get(item.book.toString()) : null;
          const qty = item.quantity || 1;
          const price = item.price || 0;
          salesInvoiceDetailsData.push({
            _id: item._id || new mongoose.Types.ObjectId(),
            salesInvoiceId: inv._id,
            invoiceCode: inv.invoiceCode,
            productId: item.book || null,
            productCode: book?.bookCode || '',
            productName: book?.title || 'Sản phẩm bán',
            quantity: qty,
            unitPrice: price,
            costPrice: item.costPrice || book?.costPrice || 0,
            discount: item.discount || 0,
            totalPrice: qty * price,
            createdAt: inv.createdAt || new Date()
          });
        });
      }
    });

    // BẢNG 11: Receipts (Phiếu thu tiền)
    const incomeTransactions = rawTransactions.filter(t => t.type === 'thu' || t.type === 'income');
    const receiptsData = incomeTransactions.map((t, idx) => ({
      ...t,
      type: t.type || 'thu',
      receiptCode: t.transactionCode || `PT-${String(idx + 1).padStart(5, '0')}`,
      transactionCode: t.transactionCode,
      amount: t.amount || 0,
      payerName: t.personName || t.recipient || 'Khách hàng',
      payerAddress: t.address || '',
      category: t.category || 'Thu tiền bán hàng',
      paymentMethod: t.paymentMethod || 'cash',
      description: t.description || 'Thu tiền bán hàng',
      employeeName: t.createdByName || 'Thủ quỹ',
      receiptDate: t.createdAt || new Date(),
      createdAt: t.createdAt || new Date()
    }));

    // BẢNG 12: Payments (Phiếu chi tiền)
    const expenseTransactions = rawTransactions.filter(t => t.type === 'chi' || t.type === 'expense');
    const paymentsData = expenseTransactions.map((t, idx) => ({
      ...t,
      type: t.type || 'chi',
      paymentCode: t.transactionCode || `PC-${String(idx + 1).padStart(5, '0')}`,
      transactionCode: t.transactionCode,
      amount: t.amount || 0,
      payeeName: t.recipient || t.personName || 'Nhà cung cấp / Đối tác',
      payeeAddress: t.address || '',
      category: t.category || 'Chi thanh toán đơn hàng',
      paymentMethod: t.paymentMethod || 'transfer',
      description: t.description || 'Chi thanh toán nhà cung cấp / chi phí hoạt động',
      employeeName: t.createdByName || 'Thủ quỹ',
      paymentDate: t.createdAt || new Date(),
      createdAt: t.createdAt || new Date()
    }));

    // BẢNG 13: Inventory (Sổ kho & Tồn kho sản phẩm)
    const inventoryData = rawBooks.map((b, idx) => {
      const stock = b.stock || 0;
      const costPrice = b.costPrice || Math.round((b.price || 50000) * 0.7);
      let stockStatus = 'Còn hàng';
      if (stock === 0) stockStatus = 'Hết hàng';
      else if (stock < 10) stockStatus = 'Sắp hết hàng (Cần nhập)';

      return {
        _id: new mongoose.Types.ObjectId(),
        productId: b._id,
        productCode: b.bookCode || `SP-${String(idx + 1).padStart(4, '0')}`,
        productName: b.title,
        categoryName: b.category || 'Chung',
        warehouseName: 'Kho trung tâm L\'Amour Bookstore',
        shelfLocation: b.shelfLocation || 'Kệ A1',
        stockQuantity: stock,
        minStockAlert: 10,
        maxStockCapacity: 500,
        costPrice: costPrice,
        sellingPrice: b.price || 0,
        inventoryValue: stock * costPrice, // Tổng giá trị vốn hàng tồn
        stockStatus: stockStatus,
        lastAuditedDate: new Date(),
        updatedAt: new Date()
      };
    });

    // Map 14 bộ dữ liệu tương ứng 14 bảng
    const tablesPayload = [
      { id: 1, ...TABLE_NAMES[1], data: usersData, isSource: true },
      { id: 2, ...TABLE_NAMES[2], data: roleDefinitions, isSource: false },
      { id: 3, ...TABLE_NAMES[3], data: customersData, isSource: false },
      { id: 4, ...TABLE_NAMES[4], data: suppliersData, isSource: true },
      { id: 5, ...TABLE_NAMES[5], data: categoriesData, isSource: true },
      { id: 6, ...TABLE_NAMES[6], data: productsData, isSource: false },
      { id: 7, ...TABLE_NAMES[7], data: purchaseOrdersData, isSource: false },
      { id: 8, ...TABLE_NAMES[8], data: purchaseOrderDetailsData, isSource: false },
      { id: 9, ...TABLE_NAMES[9], data: salesInvoicesData, isSource: false },
      { id: 10, ...TABLE_NAMES[10], data: salesInvoiceDetailsData, isSource: false },
      { id: 11, ...TABLE_NAMES[11], data: receiptsData, isSource: false },
      { id: 12, ...TABLE_NAMES[12], data: paymentsData, isSource: false },
      { id: 13, ...TABLE_NAMES[13], data: inventoryData, isSource: false },
      { id: 14, ...TABLE_NAMES[14], data: employeesData, isSource: false }
    ];

    // Xác định danh sách tên collection cần ghi vào CSDL
    let targets = [];
    if (caseOption === 'lower') {
      targets = ['lower'];
    } else if (caseOption === 'pascal') {
      targets = ['pascal'];
    } else if (caseOption === 'both') {
      targets = ['lower', 'pascal'];
    }

    console.log('\n🔄 Đang thực hiện đồng bộ vào MongoDB...');
    console.log('-'.repeat(70));
    console.log(
      'STT'.padEnd(5) + 
      'Tên Bảng (Đề bài)'.padEnd(25) + 
      'Tên Collection Tạo'.padEnd(25) + 
      'Số bản ghi'
    );
    console.log('-'.repeat(70));

    for (const table of tablesPayload) {
      for (const tgt of targets) {
        const colName = table[tgt];

        // Nếu là collection nguồn (như users, suppliers, categories) và ở chế độ lowercase:
        // Đã có sẵn dữ liệu nguồn từ trước, ta chỉ cập nhật các trường mới (roleCode, roleId...)
        if (tgt === 'lower' && table.isSource) {
          // Bổ sung cập nhật dữ liệu nếu cần
          if (colName === 'users') {
            for (const u of table.data) {
              await db.collection('users').updateOne(
                { _id: u._id },
                { $set: { roleCode: u.roleCode, roleId: u.roleId } }
              );
            }
          }
          console.log(
            String(table.id).padEnd(5) +
            table.pascal.padEnd(25) +
            colName.padEnd(25) +
            `${table.data.length} docs (nguồn chuẩn hóa)`
          );
          continue;
        }

        // Với các collection đích mới: Xóa cũ (nếu có) và nạp toàn bộ dữ liệu mới
        try {
          await db.collection(colName).drop().catch(() => {});
        } catch (_) {}

        if (table.data.length > 0) {
          await db.collection(colName).insertMany(table.data);
        }

        console.log(
          String(table.id).padEnd(5) +
          table.pascal.padEnd(25) +
          colName.padEnd(25) +
          `${table.data.length} docs ✓`
        );
      }
    }

    console.log('-'.repeat(70));
    console.log('✅ ĐỒNG BỘ HOÀN TẤT THÀNH CÔNG!');
    console.log('🎉 Toàn bộ 14 bảng tối thiểu theo đề bài đã có mặt đầy đủ trong MongoDB.');
    console.log('💡 Bạn có thể mở MongoDB Compass để kiểm tra ngay lập tức.');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('❌ Lỗi khi đồng bộ CSDL:', err);
  } finally {
    await mongoose.disconnect();
  }
}

syncAssignmentDatabase();
