const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}
const mongoose = require('mongoose');

const ATLAS_URI = 'mongodb+srv://nguyenduy4024_db_user:GJyUD87yMg11Sk7B@lamour-bookstore.7ewktff.mongodb.net/lamour_bookstore?retryWrites=true&w=majority&appName=lamour-bookstore';

async function run() {
  const conn = await mongoose.createConnection(ATLAS_URI).asPromise();
  const db = conn.db;

  const books = await db.collection('products').find({}).toArray();
  console.log('Tổng số sách trong products:', books.length);

  let totalStock = 0;
  let totalStockCost = 0;
  let totalStockRetail = 0;

  const catStockMap = {};

  books.forEach(b => {
    const stock = Number(b.stock) || 0;
    const price = Number(b.price) || 0;
    const costPrice = Number(b.costPrice) || Math.round(price * 0.65);
    const cat = b.category || 'Khác';

    totalStock += stock;
    totalStockCost += (stock * costPrice);
    totalStockRetail += (stock * price);

    if (!catStockMap[cat]) catStockMap[cat] = { category: cat, count: 0, stock: 0, costValue: 0, retailValue: 0 };
    catStockMap[cat].count += 1;
    catStockMap[cat].stock += stock;
    catStockMap[cat].costValue += (stock * costPrice);
    catStockMap[cat].retailValue += (stock * price);
  });

  console.log(`Tổng số lượng sách tồn kho: ${totalStock.toLocaleString('vi-VN')} cuốn`);
  console.log(`Tổng giá trị vốn tồn kho: ${totalStockCost.toLocaleString('vi-VN')} đ`);
  console.log(`Tổng giá trị bán niêm yết: ${totalStockRetail.toLocaleString('vi-VN')} đ`);

  console.log('\nTồn kho theo từng thể loại:');
  const catList = Object.values(catStockMap).sort((a, b) => b.stock - a.stock);
  catList.forEach(c => {
    console.log(`  - ${c.category}: ${c.stock} cuốn (${c.count} đầu sách) | Vốn tồn: ${c.costValue.toLocaleString('vi-VN')} đ`);
  });

  console.log('\nTop 8 sách có tồn kho lớn nhất:');
  const topStock = [...books].sort((a, b) => (b.stock || 0) - (a.stock || 0)).slice(0, 8);
  topStock.forEach((b, i) => {
    console.log(`  ${i+1}. ${b.title} (${b.category}): ${b.stock} cuốn | Giá bìa: ${(b.price||0).toLocaleString('vi-VN')} đ`);
  });

  await conn.close();
  process.exit(0);
}

run().catch(console.error);
