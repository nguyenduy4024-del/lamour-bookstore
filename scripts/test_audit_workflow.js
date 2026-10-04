require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const User = require('../models/User');
const AuditReceipt = require('../models/AuditReceipt');
const StockAdjustment = require('../models/StockAdjustment');
const Transaction = require('../models/Transaction');
const inventoryController = require('../controllers/inventoryController');

async function runAuditTests() {
  console.log('=== BẮT ĐẦU KIỂM TRA QUY TRÌNH KIỂM KÊ KHO HÀNG (STOCK AUDIT WORKFLOW) ===');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookstore';
  await mongoose.connect(mongoUri);
  console.log('✓ Kết nối MongoDB thành công');

  // Tìm hoặc tạo admin & staff
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      username: 'admin_audit',
      email: 'admin_audit@gmail.com',
      password: 'password123',
      role: 'admin',
      name: 'Admin Thẩm Định Test',
      phone: '0901234567'
    });
  }

  let staff = await User.findOne({ role: { $in: ['staff', 'inventory', 'warehouse'] } });
  if (!staff) {
    staff = await User.create({
      username: 'staff_audit',
      email: 'staff_audit@gmail.com',
      password: 'password123',
      role: 'staff',
      name: 'Thủ Kho Test',
      phone: '0907654321'
    });
  }

  // Tìm hoặc tạo sách để test
  let book = await Book.findOne();
  if (!book) {
    book = await Book.create({
      bookCode: 'BKTEST01',
      title: 'Sách Kiểm Kê Mẫu',
      author: 'Tác Giả Mẫu',
      category: 'Văn học',
      price: 150000,
      costPrice: 100000,
      stock: 50,
      shelfLocation: 'Kệ Test A1'
    });
  }

  const initialStock = book.stock;
  console.log(`✓ Sách thử nghiệm: "${book.title}", Tồn ban đầu: ${initialStock}`);

  // Helper giả lập req/res
  function mockReqRes(body = {}, params = {}, query = {}, user = staff) {
    const req = { body, params, query, user };
    let responseData = null;
    let statusCode = 200;
    const res = {
      status(c) {
        statusCode = c;
        return this;
      },
      json(d) {
        responseData = d;
        return this;
      }
    };
    return { req, res, getResult: () => ({ statusCode, responseData }) };
  }

  // TEST 1: Kiểm kê khớp 100% (No discrepancy) -> status = 'completed', stock không đổi
  console.log('\n--- TEST 1: Kiểm kê khớp 100% ---');
  {
    const { req, res, getResult } = mockReqRes({
      warehouseName: 'Kho Tổng L\'Amour',
      shelfArea: 'Kệ A1',
      items: [
        {
          book: book._id,
          systemStock: initialStock,
          actualStock: initialStock,
          damagedStock: 0
        }
      ],
      note: 'Kiểm kê định kỳ tháng'
    }, {}, {}, staff);

    await inventoryController.createAuditReceipt(req, res);
    const { statusCode, responseData } = getResult();

    if (statusCode !== 201 || !responseData.success) {
      throw new Error(`Test 1 Thất bại: ${JSON.stringify(responseData)}`);
    }

    const audit = responseData.data;
    console.log(`✓ Tạo phiếu khớp thành công: ${audit.auditCode}, Status: ${audit.status}`);
    if (audit.hasDiscrepancy !== false) throw new Error('Test 1: hasDiscrepancy phải là false');
    if (audit.status !== 'completed') throw new Error(`Test 1: status phải là 'completed', nhưng nhận được '${audit.status}'`);

    const refreshedBook = await Book.findById(book._id);
    if (refreshedBook.stock !== initialStock) throw new Error(`Test 1: stock sách bị thay đổi! (${refreshedBook.stock} !== ${initialStock})`);
    console.log('✓ TEST 1 PASS: Trạng thái hoàn thành trực tiếp và tồn kho không đổi');
  }

  // TEST 2: Kiểm kê có chênh lệch -> status = 'pending_approval', TỒN KHO TUYỆT ĐỐI CHƯA ĐỔI
  console.log('\n--- TEST 2: Đề xuất kiểm kê có chênh lệch (Thừa/Thiếu/Hỏng) ---');
  let pendingAuditId = null;
  {
    const { req, res, getResult } = mockReqRes({
      warehouseName: 'Kho Tổng L\'Amour',
      shelfArea: 'Kệ A2',
      items: [
        {
          book: book._id,
          systemStock: initialStock,
          actualStock: initialStock - 5, // Thiếu 5
          damagedStock: 2, // Hỏng 2
          reason: 'Bị rách bìa và thất lạc do vận chuyển',
          resolutionPlan: 'Đề xuất xuất hủy và ghi nhận chi phí'
        }
      ],
      note: 'Phát hiện hao hụt sau đợt hội sách'
    }, {}, {}, staff);

    await inventoryController.createAuditReceipt(req, res);
    const { statusCode, responseData } = getResult();

    if (statusCode !== 201 || !responseData.success) {
      throw new Error(`Test 2 Thất bại: ${JSON.stringify(responseData)}`);
    }

    const audit = responseData.data;
    pendingAuditId = audit._id;
    console.log(`✓ Tạo phiếu chênh lệch thành công: ${audit.auditCode}, Status: ${audit.status}`);
    if (audit.hasDiscrepancy !== true) throw new Error('Test 2: hasDiscrepancy phải là true');
    if (audit.status !== 'pending_approval') throw new Error(`Test 2: status phải là 'pending_approval', nhưng nhận được '${audit.status}'`);
    if (audit.items[0].difference !== -5) throw new Error(`Test 2: difference phải là -5, nhận được ${audit.items[0].difference}`);
    if (audit.items[0].damagedStock !== 2) throw new Error(`Test 2: damagedStock phải là 2, nhận được ${audit.items[0].damagedStock}`);

    // KIỂM TRA QUAN TRỌNG NHẤT: TỒN KHO KHÔNG ĐƯỢC PHÉP THAY ĐỔI
    const refreshedBook = await Book.findById(book._id);
    if (refreshedBook.stock !== initialStock) {
      throw new Error(`Test 2 VI PHẠM: Tồn kho đã tự ý thay đổi khi chưa có Admin duyệt! (${refreshedBook.stock} !== ${initialStock})`);
    }
    console.log(`✓ TEST 2 PASS: Tồn kho vẫn giữ nguyên ${refreshedBook.stock} cuốn (chờ Admin phê duyệt)`);
  }

  // TEST 3: Admin từ chối phiếu kiểm kê (Yêu cầu kiểm lại) -> status = 'rejected'
  console.log('\n--- TEST 3: Admin từ chối phê duyệt (Yêu cầu kiểm lại) ---');
  {
    const { req, res, getResult } = mockReqRes({
      reason: 'Lệch 5 cuốn là quá nhiều tại kệ A2, yêu cầu Thủ kho kiểm đếm lại góc kệ',
      adminNote: 'Kiểm lại trong hôm nay'
    }, { id: pendingAuditId }, {}, admin);

    await inventoryController.rejectAuditReceipt(req, res);
    const { statusCode, responseData } = getResult();

    if (statusCode !== 200 || !responseData.success) {
      throw new Error(`Test 3 Thất bại: ${JSON.stringify(responseData)}`);
    }

    const rejectedAudit = await AuditReceipt.findById(pendingAuditId);
    if (rejectedAudit.status !== 'rejected') throw new Error(`Test 3: status phải là 'rejected', nhận được '${rejectedAudit.status}'`);
    if (rejectedAudit.adminReview.decision !== 're_audit') throw new Error(`Test 3: decision phải là 're_audit'`);
    
    // Tồn kho vẫn phải giữ nguyên
    const refreshedBook = await Book.findById(book._id);
    if (refreshedBook.stock !== initialStock) throw new Error('Test 3: Tồn kho bị thay đổi khi từ chối!');
    console.log(`✓ TEST 3 PASS: Phiếu chuyển sang 'rejected' với lý do: "${rejectedAudit.adminReview.adminNote}", tồn kho không đổi`);
  }

  // TEST 4: Admin phê duyệt điều chỉnh tồn kho -> status = 'approved', CẬP NHẬT TỒN KHO, TẠO STOCK ADJUSTMENT & TRANSACTION
  console.log('\n--- TEST 4: Admin phê duyệt điều chỉnh tồn kho ---');
  {
    // Tạo 1 phiếu chênh lệch mới để duyệt
    const targetActualStock = initialStock - 4; // Lệch -4
    const damagedQty = 1;

    const createRes = mockReqRes({
      warehouseName: 'Kho Tổng L\'Amour',
      shelfArea: 'Kệ A3',
      items: [
        {
          book: book._id,
          systemStock: initialStock,
          actualStock: targetActualStock,
          damagedStock: damagedQty,
          reason: 'Ẩm ướt và hao hụt tự nhiên',
          resolutionPlan: 'Cân bằng tồn kho và xuất sổ chi phí'
        }
      ],
      note: 'Biên bản chốt quý'
    }, {}, {}, staff);

    await inventoryController.createAuditReceipt(createRes.req, createRes.res);
    const newAudit = createRes.getResult().responseData.data;
    console.log(`✓ Tạo phiếu cần duyệt: ${newAudit.auditCode}`);

    // Admin phê duyệt
    const apprRes = mockReqRes({
      adminNote: 'Đồng ý cân đối tồn kho theo số thực tế và trích quỹ chi hao hụt.'
    }, { id: newAudit._id }, {}, admin);

    await inventoryController.approveAuditReceipt(apprRes.req, apprRes.res);
    const apprResult = apprRes.getResult();

    if (apprResult.statusCode !== 200 || !apprResult.responseData.success) {
      throw new Error(`Test 4 Thất bại: ${JSON.stringify(apprResult.responseData)}`);
    }

    // 1. Kiểm tra trạng thái phiếu
    const approvedAudit = await AuditReceipt.findById(newAudit._id);
    if (approvedAudit.status !== 'approved') throw new Error(`Test 4: status phải là 'approved', nhận được '${approvedAudit.status}'`);
    console.log(`✓ Phiếu đã chuyển sang 'approved' bởi: ${approvedAudit.adminReview.approvedBy}`);

    // 2. Kiểm tra tồn kho sách đã cập nhật về targetActualStock
    const updatedBook = await Book.findById(book._id);
    if (updatedBook.stock !== targetActualStock) {
      throw new Error(`Test 4: Tồn kho chưa được cập nhật chính xác! (${updatedBook.stock} !== ${targetActualStock})`);
    }
    console.log(`✓ Tồn kho sách "${updatedBook.title}" đã được cập nhật thành công: ${initialStock} -> ${updatedBook.stock}`);

    // 3. Kiểm tra bản ghi StockAdjustment
    const adjustment = await StockAdjustment.findOne({ auditReceipt: newAudit._id });
    if (!adjustment) throw new Error('Test 4: Chưa tạo bản ghi StockAdjustment');
    console.log(`✓ Bản ghi StockAdjustment đã tạo: Mã kiểm ${adjustment.auditCode}, Điều chỉnh: ${adjustment.adjustmentQty} cuốn (Cũ: ${adjustment.previousStock} -> Mới: ${adjustment.newStock})`);

    // 4. Kiểm tra giao dịch tài chính (Transaction) nếu có hao hụt
    const trans = await Transaction.findOne({ description: new RegExp(newAudit.auditCode) });
    if (!trans) throw new Error('Test 4: Chưa tạo Transaction chi phí hao hụt kiểm kê');
    console.log(`✓ Giao dịch chi phí đã hạch toán: ${trans.transactionCode}, Loại: ${trans.type}, Số tiền: ${trans.amount.toLocaleString('vi-VN')}₫`);
    console.log('✓ TEST 4 PASS: Toàn bộ chu trình thẩm định, điều chỉnh kho và hạch toán hoàn hảo!');

    // Khôi phục lại tồn kho ban đầu cho sách thử nghiệm
    await Book.findByIdAndUpdate(book._id, { stock: initialStock });
    console.log(`✓ Đã hoàn trả tồn kho sách về mức ban đầu: ${initialStock}`);
  }

  console.log('\n======================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI TEST QUY TRÌNH KIỂM KÊ ĐỀU THÀNH CÔNG!');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

runAuditTests().catch(err => {
  console.error('❌ LỖI TRONG QUÁ TRÌNH TEST:', err);
  process.exit(1);
});
