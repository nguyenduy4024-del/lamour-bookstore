const mongoose = require('mongoose');
require('dotenv').config();

const ImportReceipt = require('../models/ImportReceipt');
const ExportReceipt = require('../models/ExportReceipt');

async function migrate() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lamour_bookstore';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const updateImport = await ImportReceipt.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'completed' } }
    );
    console.log('Updated legacy Import Receipts:', updateImport.modifiedCount);

    const updateExport = await ExportReceipt.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'completed' } }
    );
    console.log('Updated legacy Export Receipts:', updateExport.modifiedCount);

    await mongoose.disconnect();
    console.log('Migration finished');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
