const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function runMigration() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const oldId = new mongoose.Types.ObjectId('6a8434d9205b138762cf1a00');
  const newId = new mongoose.Types.ObjectId('6a8434d9205b138762cf1a04');

  // 1. Update Invoices
  const Invoice = require('../models/Invoice');
  const invoicesWithOldBook = await Invoice.find({ 'items.book': oldId });
  console.log(`Found ${invoicesWithOldBook.length} invoices referencing old book ID ${oldId}`);

  let updatedInvoicesCount = 0;
  for (const inv of invoicesWithOldBook) {
    let modified = false;
    inv.items.forEach(it => {
      if (String(it.book) === String(oldId)) {
        it.book = newId;
        modified = true;
      }
    });
    if (modified) {
      await inv.save();
      updatedInvoicesCount++;
    }
  }
  console.log(`Successfully updated ${updatedInvoicesCount} invoices.`);

  // 2. Update Audit Receipts
  const auditResult = await mongoose.connection.db.collection('auditreceipts').updateMany(
    { 'items.book': oldId },
    { $set: { 'items.$[elem].book': newId } },
    { arrayFilters: [{ 'elem.book': oldId }] }
  );
  console.log(`Audit receipts updated: ${auditResult.modifiedCount}`);

  // 3. Update Import Receipts
  const importResult = await mongoose.connection.db.collection('importreceipts').updateMany(
    { 'items.book': oldId },
    { $set: { 'items.$[elem].book': newId } },
    { arrayFilters: [{ 'elem.book': oldId }] }
  );
  console.log(`Import receipts updated: ${importResult.modifiedCount}`);

  console.log('Migration completed successfully!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
