require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Book = require('../models/Book');
const Supplier = require('../models/Supplier');
const ImportReceipt = require('../models/ImportReceipt');
const ExportReceipt = require('../models/ExportReceipt');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/bookstore';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}`;

async function runApiTests() {
  console.log('--- STARTING END-TO-END HTTP API WORKFLOW TEST ---');
  await mongoose.connect(MONGO_URI);

  // 1. Get or create admin user and generate auth token
  let admin = await User.findOne({ role: 'admin', isActive: true });
  if (!admin) {
    admin = await User.findOne({ isActive: true }) || await User.findOne({});
  }
  const token = jwt.sign({ userId: admin._id }, JWT_SECRET, { expiresIn: '1d' });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  let testBook = await Book.findOne({ isDeleted: { $ne: true } });
  if (!testBook) testBook = await Book.findOne({});
  if (!testBook) throw new Error('No test book found');
  const initialStock = testBook.stock;
  console.log(`Initial stock of "${testBook.title}": ${initialStock}`);

  // 2. Test Quick Supplier API
  const quickSupRes = await fetch(`${BASE_URL}/api/inventory/quick-supplier`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'NXB Kim Đồng Express ' + Date.now().toString().slice(-4),
      phone: '0912' + Math.floor(100000 + Math.random() * 900000),
      address: '55 Quang Trung, Hai Bà Trưng, Hà Nội',
      contactPerson: 'Chị Lan'
    })
  });
  const quickSupData = await quickSupRes.json();
  if (!quickSupRes.ok || !quickSupData.success) {
    throw new Error(`Quick supplier API failed: ${JSON.stringify(quickSupData)}`);
  }
  const createdSupplier = quickSupData.data;
  console.log(`[PASS] Quick Supplier API created: ${createdSupplier.name} (${createdSupplier.code})`);

  // 3. Test Propose Import Receipt API
  const importQty = 20;
  const importPrice = 65000;
  const proposeImportRes = await fetch(`${BASE_URL}/api/inventory/import-receipts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      supplier: createdSupplier._id,
      warehouseName: 'Kho tổng L\'Amour',
      items: [{
        bookId: testBook._id,
        quantity: importQty,
        importPrice: importPrice,
        unit: 'cuốn'
      }],
      note: 'Lô sách nhập thử nghiệm quy trình duyệt'
    })
  });
  const proposeImportData = await proposeImportRes.json();
  if (!proposeImportRes.ok || !proposeImportData.success) {
    throw new Error(`Propose Import API failed: ${JSON.stringify(proposeImportData)}`);
  }
  const importReceipt = proposeImportData.data;
  console.log(`[PASS] Propose Import Receipt API succeeded: ${importReceipt.receiptCode}, status=${importReceipt.status}`);

  // Check stock unchanged
  let bCheck1 = await Book.findById(testBook._id);
  if (bCheck1.stock !== initialStock) {
    throw new Error(`FAIL: Stock changed after propose! ${bCheck1.stock} vs ${initialStock}`);
  }
  console.log(`[PASS] Verified Book stock unchanged: ${bCheck1.stock}`);

  // 4. Test Get Pending Receipts API (Admin view)
  const pendingRes = await fetch(`${BASE_URL}/api/admin/receipts/pending`, { headers });
  const pendingData = await pendingRes.json();
  if (!pendingRes.ok || !pendingData.success) {
    throw new Error(`Get pending receipts API failed: ${JSON.stringify(pendingData)}`);
  }
  const foundPending = (pendingData.data.importReceipts || []).find(r => r._id === importReceipt._id);
  if (!foundPending) {
    throw new Error('Newly created import receipt not found in admin pending list!');
  }
  console.log(`[PASS] Pending receipts API returned receipt in pending list (Total pending: ${pendingData.totalPending})`);

  // 5. Test Admin Approve Import Receipt API
  const approveRes = await fetch(`${BASE_URL}/api/admin/import-receipts/${importReceipt._id}/approve`, {
    method: 'PUT',
    headers
  });
  const approveData = await approveRes.json();
  if (!approveRes.ok || !approveData.success) {
    throw new Error(`Approve Import API failed: ${JSON.stringify(approveData)}`);
  }
  console.log(`[PASS] Admin approved receipt API: status=${approveData.data.status}`);

  // Check stock still unchanged
  let bCheck2 = await Book.findById(testBook._id);
  if (bCheck2.stock !== initialStock) {
    throw new Error(`FAIL: Stock changed after admin approval!`);
  }
  console.log(`[PASS] Verified Book stock still unchanged after approval: ${bCheck2.stock}`);

  // 6. Test Complete Import Receipt API (Stock actor physically checks & enters shelves)
  const completeImportRes = await fetch(`${BASE_URL}/api/inventory/import-receipts/${importReceipt._id}/complete`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ paymentMethod: 'Chuyển khoản' })
  });
  const completeImportData = await completeImportRes.json();
  if (!completeImportRes.ok || !completeImportData.success) {
    throw new Error(`Complete Import API failed: ${JSON.stringify(completeImportData)}`);
  }
  console.log(`[PASS] Complete Import Receipt API succeeded!`);

  // Check stock increased
  let bCheck3 = await Book.findById(testBook._id);
  if (bCheck3.stock !== initialStock + importQty) {
    throw new Error(`FAIL: Stock did not increase! Expected ${initialStock + importQty}, got ${bCheck3.stock}`);
  }
  console.log(`[PASS] Verified Book stock officially updated: ${initialStock} -> ${bCheck3.stock}`);

  // Check Cashbook Transaction created
  const trans = completeImportData.data.transaction;
  if (!trans || trans.type !== 'chi') {
    throw new Error('Transaction was not returned or type is not "chi"');
  }
  console.log(`[PASS] Automatic cashbook expense slip created: ${trans.transactionCode} (${trans.amount.toLocaleString()}đ)`);

  // 7. Test Export Receipt Workflow
  const exportQty = 4;
  const proposeExportRes = await fetch(`${BASE_URL}/api/inventory/export-receipts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reason: 'Bán sỉ / Đối tác',
      customerName: 'Thư viện tư nhân Tuệ Đức',
      items: [{
        bookId: testBook._id,
        quantity: exportQty,
        price: testBook.price || 100000
      }],
      note: 'Xuất hợp đồng cung cấp sách mẫu'
    })
  });
  const proposeExportData = await proposeExportRes.json();
  if (!proposeExportRes.ok || !proposeExportData.success) {
    throw new Error(`Propose Export API failed: ${JSON.stringify(proposeExportData)}`);
  }
  const exportReceipt = proposeExportData.data;
  console.log(`[PASS] Propose Export API succeeded: ${exportReceipt.receiptCode}, status=${exportReceipt.status}`);

  // Check stock unchanged
  let bCheck4 = await Book.findById(testBook._id);
  if (bCheck4.stock !== initialStock + importQty) {
    throw new Error('FAIL: Stock decreased prematurely upon export proposal!');
  }

  // Admin approves Export
  const approveExportRes = await fetch(`${BASE_URL}/api/admin/export-receipts/${exportReceipt._id}/approve`, {
    method: 'PUT',
    headers
  });
  const approveExportData = await approveExportRes.json();
  if (!approveExportRes.ok || !approveExportData.success) {
    throw new Error(`Approve Export API failed: ${JSON.stringify(approveExportData)}`);
  }
  console.log(`[PASS] Admin approved export receipt API: status=${approveExportData.data.status}`);

  // Stock completes Export
  const completeExportRes = await fetch(`${BASE_URL}/api/inventory/export-receipts/${exportReceipt._id}/complete`, {
    method: 'PUT',
    headers
  });
  const completeExportData = await completeExportRes.json();
  if (!completeExportRes.ok || !completeExportData.success) {
    throw new Error(`Complete Export API failed: ${JSON.stringify(completeExportData)}`);
  }
  console.log(`[PASS] Complete Export Receipt API succeeded!`);

  // Check stock decreased
  let bCheck5 = await Book.findById(testBook._id);
  const expectedStock = initialStock + importQty - exportQty;
  if (bCheck5.stock !== expectedStock) {
    throw new Error(`FAIL: Stock did not decrease! Expected ${expectedStock}, got ${bCheck5.stock}`);
  }
  console.log(`[PASS] Verified Book stock decreased after physical export: ${bCheck5.stock}`);

  // 8. Test Rejection Workflow
  const proposeRejectRes = await fetch(`${BASE_URL}/api/inventory/import-receipts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      supplier: createdSupplier._id,
      warehouseName: 'Kho phụ',
      items: [{
        bookId: testBook._id,
        quantity: 10,
        importPrice: 50000
      }],
      note: 'Phiếu test từ chối'
    })
  });
  const rejectDoc = (await proposeRejectRes.json()).data;
  const rejectRes = await fetch(`${BASE_URL}/api/admin/import-receipts/${rejectDoc._id}/reject`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ reason: 'Đơn giá nhập chưa khớp với báo giá chiết khấu của NXB' })
  });
  const rejectData = await rejectRes.json();
  if (!rejectRes.ok || !rejectData.success) {
    throw new Error(`Reject API failed: ${JSON.stringify(rejectData)}`);
  }
  if (rejectData.data.status !== 'rejected' || !rejectData.data.rejectionReason) {
    throw new Error('Rejection fields not properly set');
  }
  console.log(`[PASS] Admin rejection API succeeded: status=${rejectData.data.status}, reason="${rejectData.data.rejectionReason}"`);

  // Try to complete rejected receipt -> should fail
  const tryCompleteRes = await fetch(`${BASE_URL}/api/inventory/import-receipts/${rejectDoc._id}/complete`, {
    method: 'PUT',
    headers
  });
  if (tryCompleteRes.ok) {
    throw new Error('Expected completing a rejected receipt to fail, but it succeeded!');
  }
  console.log(`[PASS] Verified completing a rejected receipt was properly blocked by API (HTTP ${tryCompleteRes.status})`);

  // 9. Clean up test artifacts
  console.log('--- CLEANING UP TEST ARTIFACTS ---');
  await Book.findByIdAndUpdate(testBook._id, { stock: initialStock });
  await ImportReceipt.findByIdAndDelete(importReceipt._id);
  await ImportReceipt.findByIdAndDelete(rejectDoc._id);
  await ExportReceipt.findByIdAndDelete(exportReceipt._id);
  if (trans && trans._id) {
    await Transaction.findByIdAndDelete(trans._id);
  }
  await Supplier.findByIdAndDelete(createdSupplier._id);

  let finalCheck = await Book.findById(testBook._id);
  console.log(`[PASS] Reverted test book stock back to original: ${finalCheck.stock}`);
  console.log('=== ALL HTTP API ENDPOINT TESTS PASSED COMPLETELY! ===');
  await mongoose.disconnect();
  process.exit(0);
}

runApiTests().catch(err => {
  console.error('API Test Failed:', err);
  process.exit(1);
});
