const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}
const Book = require('../models/Book');
const Shelf = require('../models/Shelf');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const shelves = await Shelf.find().lean();
  for (const s of shelves) {
    const books = await Book.find({ shelf: s._id, isDeleted: { $ne: true } });
    const stockSum = books.reduce((a, b) => a + (b.stock || 0), 0);
    console.log(s.shelfCode, `"${s.shelfName}"`, 'Cap:', s.capacity, 'Book titles:', books.length, 'Total stock:', stockSum);
  }
  const unassigned = await Book.find({ shelf: null, isDeleted: { $ne: true } });
  console.log('Unassigned books:', unassigned.length);
  process.exit(0);
}
check();
