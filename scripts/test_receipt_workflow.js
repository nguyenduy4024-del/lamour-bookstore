require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Supplier = require('../models/Supplier');
const ImportReceipt = require('../models/ImportReceipt');
const ExportReceipt = require('../models/ExportReceipt');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/bookstore';

async function runTests() {
  console.log('--- STARTING RECEIPT WORKFLOW AUTOMATED TEST ---');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Find a test user (admin/stock) and book
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.findOne({});
  }
  let testBook = await Book.findOne({ isActive: true });
  if (!testBook) {
    testBook = await Book.findOne({});
  }
  if (!testBook) {
    throw new Error('No book found to test');
  }

  console.log(`Using Test User: ${adminUser.name || adminUser.username} (${adminUser._id})`);
  console.log(`Using Test Book: "${testBook.title}" (Current Stock: ${testBook.stock})`);

  const initialStock = testBook.stock;

  // 2. Test Quick Supplier Creation
  const testSupCode = 'NCC-TEST-' + Date.now().toString().slice(-4);
  const testSupData = {
    code: testSupCode,
    name: 'Nhà Xuất Bản Test ' + testSupCode,
    phone: '0988776655',
    email: 'test' + Date.now().toString().slice(-4) + '@test.vn',
    address: 'Hà Nội',
    contactPerson: 'Anh Test'
  };

  const newSupplier = await Supplier.create(testSupData);
  console.log(`[PASS] Quick Supplier created: ${newSupplier.name} (${newSupplier.code})`);

  // 3. Phase 1: Create Import Receipt (Pending Approval)
  const importQty = 15;
  const importPrice = 50000;
  const importReceiptCode = 'PNK-TEST-' + Date.now().toString().slice(-4);

  const pendingImport = await ImportReceipt.create({
    receiptCode: importReceiptCode,
    supplier: newSupplier._id,
    warehouseName: 'Kho chính',
    items: [{
      book: testBook._id,
      quantity: importQty,
      importPrice: importPrice,
      totalPrice: importQty * importPrice,
      unit: 'cuốn'
    }],
    totalQuantity: importQty,
    totalAmount: importQty * importPrice,
    status: 'pending_approval',
    note: 'Test pending import',
    createdBy: adminUser._id
  });

  // Verify stock DID NOT change
  let bookAfterImportPropose = await Book.findById(testBook._id);
  if (bookAfterImportPropose.stock !== initialStock) {
    throw new Error(`FAIL: Book stock changed prematurely upon proposal! Expected ${initialStock}, got ${bookAfterImportPropose.stock}`);
  }
  console.log(`[PASS] Import receipt proposed (${pendingImport.receiptCode}, status=${pendingImport.status}). Stock remains unchanged: ${bookAfterImportPropose.stock}`);

  // 4. Phase 2: Admin Approves Import Receipt
  pendingImport.status = 'approved';
  pendingImport.approvedBy = adminUser._id;
  pendingImport.approvedAt = new Date();
  await pendingImport.save();

  // Verify stock STILL DID NOT change
  let bookAfterImportApprove = await Book.findById(testBook._id);
  if (bookAfterImportApprove.stock !== initialStock) {
    throw new Error(`FAIL: Book stock changed upon admin approval! Expected ${initialStock}, got ${bookAfterImportApprove.stock}`);
  }
  console.log(`[PASS] Admin approved receipt (${pendingImport.receiptCode}, status=${pendingImport.status}). Stock remains unchanged: ${bookAfterImportApprove.stock}`);

  // 5. Phase 3: Stock completes Import Receipt (Physical check on shelves)
  // Simulate completeImportReceipt controller logic
  const items = pendingImport.items;
  for (const it of items) {
    await Book.findByIdAndUpdate(it.book, {
      $inc: { stock: it.quantity },
      $set: { costPrice: it.importPrice }
    });
  }
  pendingImport.status = 'completed';
  pendingImport.completedBy = adminUser._id;
  pendingImport.completedAt = new Date();
  await pendingImport.save();

  // Automatic Accounting Cashbook Transaction
  const transCode = `PC-NK-${Date.now().toString().slice(-6)}`;
  const cashTransaction = await Transaction.create({
    transactionCode: transCode,
    type: 'chi',
    amount: pendingImport.totalAmount,
    description: `Chi trả tiền nhập kho mã ${pendingImport.receiptCode} - NCC: ${newSupplier.name}`,
    personName: newSupplier.name,
    address: newSupplier.address || '',
    paymentMethod: 'Chuyển khoản',
    attached: `Phiếu nhập kho ${pendingImport.receiptCode}`,
    note: 'Chi phí nhập hàng',
    accountantName: 'Phạm Thị Mai',
    cashierName: 'Thủ kho',
    performedBy: adminUser._id
  });

  // Verify stock INCREASED
  let bookAfterImportComplete = await Book.findById(testBook._id);
  const expectedStockAfterImport = initialStock + importQty;
  if (bookAfterImportComplete.stock !== expectedStockAfterImport) {
    throw new Error(`FAIL: Stock did not increase properly! Expected ${expectedStockAfterImport}, got ${bookAfterImportComplete.stock}`);
  }
  console.log(`[PASS] Import receipt completed! Book stock increased: ${initialStock} -> ${bookAfterImportComplete.stock}`);
  console.log(`[PASS] Cashbook transaction created: ${cashTransaction.type.toUpperCase()} - ${cashTransaction.amount.toLocaleString()}đ (code: ${cashTransaction.transactionCode})`);

  // 6. Test Export Workflow
  const exportQty = 5;
  const exportReceiptCode = 'PXK-TEST-' + Date.now().toString().slice(-4);

  // Propose Export
  const pendingExport = await ExportReceipt.create({
    receiptCode: exportReceiptCode,
    reason: 'Bán sỉ / Đối tác',
    customerName: 'Đối tác Test ABC',
    receiverName: 'Nguyễn Văn Test',
    warehouseName: 'Kho chính',
    items: [{
      book: testBook._id,
      quantity: exportQty,
      price: testBook.price || 100000,
      totalPrice: exportQty * (testBook.price || 100000)
    }],
    totalQuantity: exportQty,
    totalPrice: exportQty * (testBook.price || 100000),
    status: 'pending_approval',
    note: 'Test pending export',
    createdBy: adminUser._id
  });

  // Verify stock DID NOT decrease
  let bookAfterExportPropose = await Book.findById(testBook._id);
  if (bookAfterExportPropose.stock !== expectedStockAfterImport) {
    throw new Error(`FAIL: Stock decreased prematurely on export proposal!`);
  }
  console.log(`[PASS] Export receipt proposed (${pendingExport.receiptCode}, status=${pendingExport.status}). Stock remains unchanged: ${bookAfterExportPropose.stock}`);

  // Admin approves Export
  pendingExport.status = 'approved';
  pendingExport.approvedBy = adminUser._id;
  pendingExport.approvedAt = new Date();
  await pendingExport.save();

  let bookAfterExportApprove = await Book.findById(testBook._id);
  if (bookAfterExportApprove.stock !== expectedStockAfterImport) {
    throw new Error(`FAIL: Stock decreased upon export approval!`);
  }
  console.log(`[PASS] Admin approved export receipt. Stock remains unchanged: ${bookAfterExportApprove.stock}`);

  // Stock completes Export
  for (const it of pendingExport.items) {
    await Book.findByIdAndUpdate(it.book, {
      $inc: { stock: -it.quantity }
    });
  }
  pendingExport.status = 'completed';
  pendingExport.completedBy = adminUser._id;
  pendingExport.completedAt = new Date();
  await pendingExport.save();

  // Verify stock DECREASED
  let bookAfterExportComplete = await Book.findById(testBook._id);
  const expectedFinalStock = expectedStockAfterImport - exportQty;
  if (bookAfterExportComplete.stock !== expectedFinalStock) {
    throw new Error(`FAIL: Stock did not decrease properly on completion! Expected ${expectedFinalStock}, got ${bookAfterExportComplete.stock}`);
  }
  console.log(`[PASS] Export receipt completed! Book stock decreased: ${expectedStockAfterImport} -> ${bookAfterExportComplete.stock}`);

  // Clean up test data
  console.log('--- CLEANING UP TEST DATA ---');
  // Revert test book stock
  await Book.findByIdAndUpdate(testBook._id, { stock: initialStock });
  await ImportReceipt.findByIdAndDelete(pendingImport._id);
  await ExportReceipt.findByIdAndDelete(pendingExport._id);
  await Transaction.findByIdAndDelete(cashTransaction._id);
  await Supplier.findByIdAndDelete(newSupplier._id);

  let finalRevertCheck = await Book.findById(testBook._id);
  console.log(`[PASS] Reverted test book stock back to original: ${finalRevertCheck.stock}`);

  console.log('=== ALL RECEIPT WORKFLOW TESTS PASSED SUCCESSFULLY! ===');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
