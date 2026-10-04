const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/lamour_bookstore';
const ATLAS_URI = 'mongodb+srv://nguyenduy4024_db_user:GJyUD87yMg11Sk7B@lamour-bookstore.7ewktff.mongodb.net/lamour_bookstore?retryWrites=true&w=majority&appName=lamour-bookstore';

async function applyIndexes(uri, label) {
  console.log(`\n📡 Đang tạo Index trên ${label}...`);
  try {
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const invoices = conn.collection('salesinvoices');
    const products = conn.collection('products');
    const auditLogs = conn.collection('auditlogs');

    // 1. Invoices indexes
    await invoices.createIndex({ status: 1, createdAt: -1 }, { background: true });
    await invoices.createIndex({ createdAt: -1 }, { background: true });
    await invoices.createIndex({ 'returnRequest.status': 1 }, { background: true });
    await invoices.createIndex({ user: 1 }, { background: true });
    await invoices.createIndex({ paymentMethod: 1 }, { background: true });
    await invoices.createIndex({ 'items.book': 1 }, { background: true });

    // 2. Products indexes
    await products.createIndex({ stock: 1 }, { background: true });
    await products.createIndex({ category: 1 }, { background: true });
    await products.createIndex({ author: 1 }, { background: true });

    // 3. Audit logs
    if (auditLogs) {
      await auditLogs.createIndex({ createdAt: -1 }, { background: true });
    }

    console.log(`✅ Đã tạo Index thành công trên ${label}!`);
    console.log('Indexes trên salesinvoices:', await invoices.indexes());
    await conn.close();
  } catch (err) {
    console.warn(`⚠️ Không thể tạo index trên ${label}:`, err.message);
  }
}

async function run() {
  await applyIndexes(ATLAS_URI, 'MongoDB Atlas');
  await applyIndexes(LOCAL_URI, 'Local MongoDB');
  process.exit(0);
}

run();
