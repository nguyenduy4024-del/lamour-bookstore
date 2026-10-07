const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const Book = require('../models/Book');
const Shelf = require('../models/Shelf');
const { DEFAULT_SHELVES, updateShelfStatus } = require('../utils/shelfHelper');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  // 1. Tạo hoặc cập nhật 21 kệ chuẩn theo DEFAULT_SHELVES
  console.log('1. Cập nhật / tạo 21 sơ đồ kệ sách chuẩn...');
  for (const s of DEFAULT_SHELVES) {
    await Shelf.findOneAndUpdate(
      { shelfCode: s.shelfCode },
      {
        $set: {
          shelfName: s.shelfName,
          zone: s.zone,
          capacity: s.capacity,
          description: s.description,
          status: s.shelfCode === 'KE-A1' ? 'available' : undefined // Reopen A1 if it was in maintenance
        }
      },
      { upsert: true, new: true }
    );
  }

  // Xóa kệ rác / test KEE99 nếu có
  const kee99 = await Shelf.findOne({ shelfCode: 'KEE99' });
  const shelfA2 = await Shelf.findOne({ shelfCode: 'KE-A2' });
  if (kee99) {
    if (shelfA2) {
      await Book.updateMany(
        { shelf: kee99._id },
        { $set: { shelf: shelfA2._id, shelfPosition: shelfA2.shelfName, shelfLocation: shelfA2.shelfName } }
      );
    }
    await Shelf.deleteOne({ _id: kee99._id });
    console.log('Đã chuyển sách từ KEE99 sang KE-A2 và xóa kệ test KEE99.');
  }

  const allShelves = await Shelf.find({});
  console.log(`Hiện có ${allShelves.length} kệ trong CSDL.`);

  // 2. Lấy danh sách 108 đầu sách
  const books = await Book.find({ isDeleted: { $ne: true } }).sort({ createdAt: 1 });
  console.log(`Tổng số đầu sách cần chuẩn hóa: ${books.length}`);

  // Phân bổ sách vào các kệ theo thể loại chi tiết
  const shelfMap = {};
  allShelves.forEach(sh => { shelfMap[sh.shelfCode] = sh; });

  // Map thể loại vào mã kệ tương ứng
  // A1: Văn học VN
  // A2: Văn học Nước ngoài
  // A3: Thơ ca & Tản văn
  // A4: Trinh thám & Bí ẩn
  // A5: Văn học Cổ điển & Sử thi
  // B1: Kinh tế & Quản trị
  // B2: Kỹ năng sống & Bản thân
  // B3: Tâm lý & Triết học
  // B4: Tài chính & Đầu tư
  // B5: Marketing & Bán hàng
  // C1: Lịch sử & Địa lý
  // C2: Khoa học & Công nghệ
  // C3: Ngoại ngữ & Từ điển
  // C4: Triết học & Xã hội học
  // C5: Y học & Sức khỏe
  // D1: Thiếu nhi & Tranh truyện
  // D2: Nghệ thuật & Đời sống
  // D3: Manga & Truyện tranh
  // D4: Comic & Artbook
  // D5: Nuôi dạy con & Gia đình

  // Bảng phân bổ mục tiêu: 108 cuốn chia đều vào ~20 kệ (mỗi kệ từ 4 - 8 đầu sách)
  // Tính toán tồn kho từng cuốn sao cho tổng đúng ~3,000 cuốn
  let targetTotal = 3000;
  const count = books.length; // 108
  
  // Tạo mảng số lượng cho 108 cuốn:
  // 10 cuốn top: 40-48
  // 15 cuốn hot: 32-38
  // 55 cuốn thường: 24-30
  // 28 cuốn đặc thù: 15-22
  const stockAllocations = [];
  let currentSum = 0;

  for (let i = 0; i < count; i++) {
    let qty;
    if (i < 10) {
      qty = 42 + (i % 7); // 42..48
    } else if (i < 25) {
      qty = 33 + (i % 6); // 33..38
    } else if (i < 80) {
      qty = 25 + (i % 6); // 25..30
    } else {
      qty = 16 + (i % 7); // 16..22
    }
    stockAllocations.push(qty);
    currentSum += qty;
  }

  // Điều chỉnh chênh lệch để tổng bằng 3000
  let diff = targetTotal - currentSum;
  for (let i = 0; i < Math.abs(diff); i++) {
    const idx = (i * 3) % count;
    stockAllocations[idx] += (diff > 0 ? 1 : -1);
  }

  const finalSum = stockAllocations.reduce((a, b) => a + b, 0);
  console.log(`Đã tính toán phân bổ tồn kho: Tổng cộng = ${finalSum} cuốn trên ${count} đầu sách.`);

  // Phân loại các cuốn sách theo category
  const categorized = {};
  for (const b of books) {
    const c = b.category || 'Khác';
    if (!categorized[c]) categorized[c] = [];
    categorized[c].push(b);
  }

  // Danh sách các cặp [đầu sách, mã kệ đích]
  const assignments = [];

  // 1. Văn học Việt Nam & Tác phẩm chọn lọc (14 cuốn)
  const vnBooks = categorized['Văn học Việt Nam & Tác phẩm chọn lọc'] || [];
  vnBooks.forEach((b, idx) => {
    if (idx < 7) assignments.push({ book: b, shelfCode: 'KE-A1' });
    else if (idx < 11) assignments.push({ book: b, shelfCode: 'KE-A3' });
    else assignments.push({ book: b, shelfCode: 'KE-A5' });
  });

  // 2. Văn học Kinh điển & Thế giới (16 cuốn)
  const worldBooks = categorized['Văn học Kinh điển & Thế giới'] || [];
  worldBooks.forEach((b, idx) => {
    if (idx < 8) assignments.push({ book: b, shelfCode: 'KE-A2' });
    else assignments.push({ book: b, shelfCode: 'KE-A5' });
  });

  // 3. Trinh thám & Bí ẩn (8 cuốn)
  const detBooks = categorized['Trinh thám & Bí ẩn'] || [];
  detBooks.forEach(b => assignments.push({ book: b, shelfCode: 'KE-A4' }));

  // 4. Văn học (6 cuốn)
  const litBooks = categorized['Văn học'] || [];
  litBooks.forEach((b, idx) => {
    if (idx < 3) assignments.push({ book: b, shelfCode: 'KE-A1' });
    else assignments.push({ book: b, shelfCode: 'KE-A3' });
  });

  // 5. Kinh tế & Quản trị (15 cuốn)
  const econBooks = categorized['Kinh tế & Quản trị'] || [];
  econBooks.forEach((b, idx) => {
    if (idx < 5) assignments.push({ book: b, shelfCode: 'KE-B1' });
    else if (idx < 10) assignments.push({ book: b, shelfCode: 'KE-B4' });
    else assignments.push({ book: b, shelfCode: 'KE-B5' });
  });

  // 6. Tâm lý & Kỹ năng sống (24 cuốn)
  const skillBooks = categorized['Tâm lý & Kỹ năng sống'] || [];
  skillBooks.forEach((b, idx) => {
    if (idx < 7) assignments.push({ book: b, shelfCode: 'KE-B2' });
    else if (idx < 14) assignments.push({ book: b, shelfCode: 'KE-B3' });
    else if (idx < 19) assignments.push({ book: b, shelfCode: 'KE-C4' });
    else assignments.push({ book: b, shelfCode: 'KE-D5' });
  });

  // 7. Tâm linh & Nghệ thuật sống (6 cuốn)
  const spiritBooks = categorized['Tâm linh & Nghệ thuật sống'] || [];
  spiritBooks.forEach((b, idx) => {
    if (idx < 3) assignments.push({ book: b, shelfCode: 'KE-B3' });
    else assignments.push({ book: b, shelfCode: 'KE-D2' });
  });

  // 8. Khoa học & Tri thức (11 cuốn)
  const scienceBooks = categorized['Khoa học & Tri thức'] || [];
  scienceBooks.forEach((b, idx) => {
    if (idx < 3) assignments.push({ book: b, shelfCode: 'KE-C1' });
    else if (idx < 7) assignments.push({ book: b, shelfCode: 'KE-C2' });
    else if (idx < 9) assignments.push({ book: b, shelfCode: 'KE-C3' });
    else assignments.push({ book: b, shelfCode: 'KE-C5' });
  });

  // 9. Văn học Thiếu nhi (8 cuốn)
  const kidsBooks = categorized['Văn học Thiếu nhi'] || [];
  kidsBooks.forEach((b, idx) => {
    if (idx < 4) assignments.push({ book: b, shelfCode: 'KE-D1' });
    else if (idx < 6) assignments.push({ book: b, shelfCode: 'KE-D3' });
    else assignments.push({ book: b, shelfCode: 'KE-D4' });
  });

  // Bất kỳ sách nào còn sót lại
  const assignedIds = new Set(assignments.map(a => a.book._id.toString()));
  books.forEach((b, idx) => {
    if (!assignedIds.has(b._id.toString())) {
      assignments.push({ book: b, shelfCode: 'KE-A1' });
    }
  });

  console.log(`Đã lập sơ đồ gán cho ${assignments.length} đầu sách.`);

  // Cập nhật từng cuốn sách theo sơ đồ
  for (let i = 0; i < assignments.length; i++) {
    const item = assignments[i];
    const assignedShelf = shelfMap[item.shelfCode] || shelfMap['KE-A1'] || allShelves[0];
    const newStatus = item.book.status === 'hidden' ? 'hidden' : 'active';

    await Book.updateOne(
      { _id: item.book._id },
      {
        $set: {
          stock: stockAllocations[i],
          shelf: assignedShelf._id,
          shelfPosition: assignedShelf.shelfName,
          shelfLocation: assignedShelf.shelfName,
          status: newStatus
        }
      }
    );
  }

  // 3. Cập nhật lại trạng thái cho toàn bộ kệ
  console.log('3. Cập nhật lại dung lượng và trạng thái tất cả các kệ...');
  for (const s of allShelves) {
    await updateShelfStatus(s._id);
  }

  // 4. Kiểm tra kết quả
  const finalBooks = await Book.find({ isDeleted: { $ne: true } });
  const totalStock = finalBooks.reduce((acc, b) => acc + (b.stock || 0), 0);
  console.log('====================================');
  console.log('KẾT QUẢ ĐỒNG BỘ:');
  console.log('Tổng số sách tồn kho:', totalStock);

  const updatedShelves = await Shelf.find().sort({ zone: 1, shelfCode: 1 });
  for (const sh of updatedShelves) {
    const booksOnShelf = await Book.find({ shelf: sh._id, isDeleted: { $ne: true } });
    const stockOnShelf = booksOnShelf.reduce((a, b) => a + (b.stock || 0), 0);
    const pct = sh.capacity > 0 ? Math.round((stockOnShelf / sh.capacity) * 100) : 0;
    console.log(`${sh.shelfCode} (${sh.zone}) - "${sh.shelfName}": Đã chứa ${stockOnShelf}/${sh.capacity} cuốn (${pct}%) [${sh.status}]`);
  }

  console.log('Hoàn tất thành công!');
  process.exit(0);
}

run().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
