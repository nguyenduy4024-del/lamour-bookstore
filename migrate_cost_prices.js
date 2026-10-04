const mongoose = require('mongoose');
require('dotenv').config();
const Book = require('./models/Book');
const Invoice = require('./models/Invoice');

async function runMigration() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lamour_bookstore';
  console.log('Connecting to MongoDB:', uri);
  await mongoose.connect(uri);

  console.log('\n--- 1. MIGRATING BOOKS COST PRICES ---');
  const books = await Book.find({});
  let booksUpdated = 0;
  for (const b of books) {
    const origCost = b.costPrice;
    if (!b.costPrice || b.costPrice <= 0 || b.costPrice >= b.price) {
      b.costPrice = Math.round(b.price * 0.65);
      await b.save();
      booksUpdated++;
      console.log(`Updated Book "${b.title}": price=${b.price}, oldCost=${origCost} -> newCost=${b.costPrice}`);
    }
  }
  console.log(`Total books updated: ${booksUpdated} / ${books.length}`);

  console.log('\n--- 2. MIGRATING INVOICE ITEMS COST PRICES ---');
  const invoices = await Invoice.find({});
  let invoicesUpdated = 0;
  let itemsUpdated = 0;

  for (const inv of invoices) {
    let changed = false;
    if (inv.items && inv.items.length > 0) {
      for (const it of inv.items) {
        const itPrice = Number(it.price) || 0;
        if (!it.costPrice || it.costPrice <= 0 || it.costPrice >= itPrice) {
          it.costPrice = Math.round(itPrice * 0.65);
          changed = true;
          itemsUpdated++;
        }
      }
    }
    if (changed) {
      await inv.save();
      invoicesUpdated++;
    }
  }
  console.log(`Total invoices updated: ${invoicesUpdated} / ${invoices.length} (total items updated: ${itemsUpdated})`);

  console.log('\n--- 3. VERIFYING RỪNG NA-UY & MẮT BIẾC ---');
  const checkBooks = await Book.find({ title: { $regex: 'Rừng Na-uy|Mắt Biếc', $options: 'i' } });
  checkBooks.forEach(b => {
    console.log(`Book: "${b.title}" | Price: ${b.price} | CostPrice: ${b.costPrice} | Stock: ${b.stock}`);
  });

  const checkInvs = await Invoice.find({ 'items.book': { $in: checkBooks.map(b => b._id) } });
  console.log(`Found ${checkInvs.length} invoices with Rừng Na-uy / Mắt Biếc:`);
  checkInvs.forEach(inv => {
    console.log(`Invoice ${inv.invoiceCode} (${inv.status}):`);
    inv.items.forEach(it => {
      const isTarget = checkBooks.some(b => b._id.toString() === it.book.toString());
      if (isTarget) {
        const profit = (it.price - it.costPrice) * it.quantity;
        console.log(`  - Item Book: ${it.book} | Qty: ${it.quantity} | Price: ${it.price} | CostPrice: ${it.costPrice} | Profit: ${profit}`);
      }
    });
  });

  console.log('\nMigration completed successfully!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
