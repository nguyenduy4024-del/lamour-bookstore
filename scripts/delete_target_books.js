const mongoose = require('mongoose');
require('dotenv').config();

const Book = require('../models/Book');
const Shelf = require('../models/Shelf');
const ShelfActivityLog = require('../models/ShelfActivityLog');
const Invoice = require('../models/Invoice');
const { updateShelfStatus } = require('../utils/shelfHelper');

async function execute() {
  console.log('=== BẮT ĐẦU QUY TRÌNH XÓA SÁCH THEO YÊU CẦU ===\n');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lamour_bookstore');
  console.log('✓ Đã kết nối cơ sở dữ liệu MongoDB');

  // 1. Xác định 4 cuốn sách mục tiêu
  const targetQueries = [
    { title: /The Great Gatsby Test Edition/i },
    { title: /^conan$/i },
    { title: /^siêu nhân$/i },
    { title: /Sách Nằm Trên Kệ Bảo Trì/i }
  ];

  const booksToDelete = [];
  const affectedShelfIds = new Set();

  for (const q of targetQueries) {
    const found = await Book.find(q);
    for (const b of found) {
      booksToDelete.push(b);
      if (b.shelf) {
        affectedShelfIds.add(b.shelf.toString());
      }
    }
  }

  console.log(`\n1. Đã tìm thấy ${booksToDelete.length} cuốn sách cần xóa:`);
  booksToDelete.forEach(b => {
    console.log(`  - [ID: ${b._id}] [Mã: ${b.bookCode}] "${b.title}" (Kệ: ${b.shelfLocation || b.shelf})`);
  });

  if (booksToDelete.length === 0) {
    console.log('Không tìm thấy cuốn sách nào khớp với điều kiện!');
    process.exit(0);
  }

  // 2. Chuyển sách "Cho Tôi Xin Một Vé Đi Tuổi Thơ" (MS-015) về lại Kệ A1
  console.log('\n2. Xử lý kệ test bảo trì và sách "Cho Tôi Xin Một Vé Đi Tuổi Thơ" (MS-015):');
  const shelfA1 = await Shelf.findOne({ shelfCode: 'KE-A1' });
  const bookMS015 = await Book.findOne({ bookCode: 'MS-015' });

  if (bookMS015 && shelfA1) {
    const prevShelf = bookMS015.shelf;
    bookMS015.shelf = shelfA1._id;
    bookMS015.shelfPosition = shelfA1.shelfName;
    bookMS015.shelfLocation = shelfA1.shelfName;
    await bookMS015.save();
    affectedShelfIds.add(shelfA1._id.toString());
    console.log(`  ✓ Đã chuyển cuốn "Cho Tôi Xin Một Vé Đi Tuổi Thơ" về lại kệ gốc [${shelfA1.shelfCode}] "${shelfA1.shelfName}"`);

    // Ghi log điều chuyển
    await ShelfActivityLog.create({
      action: 'SHELF_TRANSFER',
      actionLabel: 'Điều chuyển sách hoàn trả kệ gốc',
      description: `Hoàn trả sách "${bookMS015.title}" (MS-015) từ kệ test bảo trì về lại kệ gốc ${shelfA1.shelfCode} (${shelfA1.shelfName}).`,
      book: bookMS015._id,
      bookTitle: bookMS015.title,
      bookCode: bookMS015.bookCode,
      fromShelf: prevShelf,
      fromShelfCode: 'KE-TEST-2440',
      fromShelfName: 'Kệ Test Bảo Trì',
      toShelf: shelfA1._id,
      toShelfCode: shelfA1.shelfCode,
      toShelfName: shelfA1.shelfName,
      quantity: bookMS015.stock,
      performerName: 'Hệ thống Quản trị',
      performerRole: 'admin'
    });
  }

  // 3. Xóa kệ test bảo trì (KE-TEST-2440) nếu tồn tại
  const testShelf = await Shelf.findOne({ shelfCode: 'KE-TEST-2440' });
  if (testShelf) {
    await Shelf.findByIdAndDelete(testShelf._id);
    console.log(`  ✓ Đã xóa kệ test [${testShelf.shelfCode}] "${testShelf.shelfName}" khỏi hệ thống.`);
  }

  // 4. Xóa vĩnh viễn (Hard Delete) 4 cuốn sách mục tiêu khỏi MongoDB
  console.log('\n3. Thực hiện Xóa vĩnh viễn (Hard Delete) các cuốn sách:');
  const deleteIds = booksToDelete.map(b => b._id);
  const deleteResult = await Book.deleteMany({ _id: { $in: deleteIds } });
  console.log(`  ✓ Đã xóa thành công ${deleteResult.deletedCount} cuốn sách khỏi collection books.`);

  // 5. Cập nhật lại dung lượng và trạng thái của tất cả các kệ bị ảnh hưởng
  console.log('\n4. Cập nhật lại dung lượng và trạng thái các kệ sách liên quan:');
  for (const shelfId of affectedShelfIds) {
    const updated = await updateShelfStatus(shelfId);
    if (updated && updated.shelf) {
      console.log(`  ✓ Kệ [${updated.shelf.shelfCode}] "${updated.shelf.shelfName}": Số lượng sách hiện tại = ${updated.currentStock}, Trạng thái = ${updated.status} (${updated.occupancyPercent}%)`);
    }
  }

  // 6. Kiểm tra lại toàn vẹn hóa đơn có sách liên quan (HD-84442560)
  console.log('\n5. Kiểm tra tính toàn vẹn của hóa đơn HD-84442560:');
  const invoice = await Invoice.findOne({ invoiceCode: 'HD-84442560' }).populate('items.book');
  if (invoice) {
    console.log(`  ✓ Hóa đơn HD-84442560 tải thành công: Trạng thái = ${invoice.status}, Tổng tiền = ${invoice.totalAmount}đ, Số mặt hàng = ${invoice.items.length}`);
  }

  console.log('\n=== HOÀN TẤT QUY TRÌNH XÓA SÁCH THÀNH CÔNG! ===');
  process.exit(0);
}

execute().catch(err => {
  console.error('Lỗi khi thực thi xóa sách:', err);
  process.exit(1);
});
