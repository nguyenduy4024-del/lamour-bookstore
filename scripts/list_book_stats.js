const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}
const Book = require('../models/Book');

async function list() {
  await mongoose.connect(process.env.MONGO_URI);
  const books = await Book.find({ isDeleted: { $ne: true } }).select('bookCode title category stock shelf').lean();
  console.log('Book count:', books.length);
  const catCounts = {};
  books.forEach(b => {
    catCounts[b.category] = (catCounts[b.category] || 0) + 1;
  });
  console.log('Categories:', catCounts);
  process.exit(0);
}
list();
