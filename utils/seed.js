const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const ImportReceipt = require('../models/ImportReceipt');
const Transaction = require('../models/Transaction');

dotenv.config({ path: path.join(__dirname, '../.env') });

const vietnameseArtists = [
  'Nguyễn Thanh Tùng', 'Trần Minh Hiếu', 'Đăng Thành An', 'Bùi Anh Tuấn',
  'Trịnh Trần Phương Tuấn', 'Phạm Lưu Tuấn Tài', 'Lê Nguyễn Trung Dan', 'Hà Anh Tuấn',
  'Nguyễn Khoa Tóc Tiên', 'Hồ Ngọc Hà', 'Nguyễn Thúc Thùy Tiên', 'Vũ Cát Tường',
  'Lê Cát Trọng Lý', 'Phan Mạnh Quỳnh', 'Đen Vâu', 'Nguyễn Hòa Kim Ninh',
  'Hoàng Thùy Linh', 'Bích Phương', 'Trần Thiện Thanh', 'Vũ Hoàng Yên',
  'Nguyễn Trần Trung Quân', 'Đỗ Hiếu', 'Hứa Kim Tuyền', 'Trần Tiến',
  'Phạm Hồng Phước', 'Bùi Công Nam', 'Trịnh Công Sơn', 'Phạm Hoàng Dũng',
  'Nguyễn Văn Chung', 'Lê Hiếu', 'Ngô Kiến Huy', 'Trần Thành',
  'Trường Giang', 'Việt Hương', 'Hoài Linh', 'Thu Trang',
  'Tiến Luật', 'Đại Nghĩa', 'Khả Như', 'Huỳnh Lập',
  'Nam Thư', 'Puka', 'Gin Tuấn Kiệt', 'Anh Tú',
  'LyLy', 'Văn Mai Hương', 'Bảo Anh', 'Hương Tràm',
  'Hòa Minzy', 'Đức Phúc', 'Erik', 'Quân A.P',
  'Thiều Bảo Trâm', 'Suni Hạ Linh', 'Amee', 'GREY D',
  'Kai Đinh', 'Tăng Duy Tân', 'Phương Mỹ Chi', 'Soobin Hoàng Sơn'
];

function generatePhone(num) {
  const padded = String(num).padStart(8, '0');
  return `09${padded}`;
}

const seedData = async () => {
  try {
    console.log('📡 Đang kết nối Cơ sở dữ liệu...');
    await connectDB();

    console.log('🧹 Đang dọn dẹp và chuẩn hóa dữ liệu...');
    await User.deleteMany();
    
    // Giữ an toàn cho kho sách nếu người dùng đã thêm/chỉnh sửa sách hoặc ảnh bìa
    const existingBooksCount = await Book.countDocuments();
    if (existingBooksCount > 0 && process.env.FORCE_SEED !== 'true') {
      console.log(`🛡️ Bảo vệ dữ liệu: Đã tìm thấy ${existingBooksCount} cuốn sách trong kho (bao gồm ảnh đã lưu). Bỏ qua xóa sách để không làm mất dữ liệu của bạn.`);
    } else {
      await Book.deleteMany();
    }

    await Invoice.deleteMany();
    await Supplier.deleteMany();
    await ImportReceipt.deleteMany();
    await Transaction.deleteMany();

    console.log('👤 Đang khởi tạo danh sách tài khoản (TẤT CẢ EMAIL DÙNG DUY NHẤT DUÔI @gmail.com)...');

    // 1. Tạo 2 Admin
    const adminAccounts = [
      {
        name: 'Nguyễn Thanh Tùng (Admin)',
        email: 'admin1@gmail.com',
        phone: '0901000001',
        password: 'password123',
        role: 'admin'
      },
      {
        name: 'Trần Minh Hiếu (Admin)',
        email: 'admin2@gmail.com',
        phone: '0901000002',
        password: 'password123',
        role: 'admin'
      }
    ];

    // 2. Tạo 10 Staff
    const staffAccounts = [];
    for (let i = 1; i <= 10; i++) {
      const artistName = vietnameseArtists[(i - 1) % vietnameseArtists.length];
      staffAccounts.push({
        name: `${artistName} (Staff)`,
        email: `staff${i}@gmail.com`,
        phone: generatePhone(20000000 + i),
        password: 'password123',
        role: 'staff'
      });
    }

    // 3. Tạo 2 Stock
    const stockAccounts = [
      {
        name: 'Đặng Thành An (Thủ Kho)',
        email: 'stock1@gmail.com',
        phone: '0903000001',
        password: 'password123',
        role: 'stock'
      },
      {
        name: 'Phan Mạnh Quỳnh (Nhân viên Kho)',
        email: 'stock2@gmail.com',
        phone: '0903000002',
        password: 'password123',
        role: 'stock'
      }
    ];

    // 4. Tạo 2 Accountant
    const accountantAccounts = [
      {
        name: 'Nguyễn Thúc Thùy Tiên (Kế Toán Trưởng)',
        email: 'accountant1@gmail.com',
        phone: '0904000001',
        password: 'password123',
        role: 'accountant'
      },
      {
        name: 'Bích Phương (Kế Toán Viên)',
        email: 'accountant2@gmail.com',
        phone: '0904000002',
        password: 'password123',
        role: 'accountant'
      }
    ];

    // 5. Tạo 50 User
    const userAccounts = [];
    for (let i = 1; i <= 50; i++) {
      const artistName = vietnameseArtists[(i + 9) % vietnameseArtists.length];
      userAccounts.push({
        name: artistName,
        email: `user${i}@gmail.com`,
        phone: generatePhone(30000000 + i),
        password: 'password123',
        role: 'user'
      });
    }

    // Tạo bằng User.create để hash password qua pre('save')
    await User.create([
      ...adminAccounts,
      ...staffAccounts,
      ...stockAccounts,
      ...accountantAccounts,
      ...userAccounts
    ]);
    console.log('✅ Đã tạo thành công 66 tài khoản với 100% email đuôi @gmail.com!');

    // 6. Tạo 20 quyển sách mẫu thực tế
    console.log('📚 Đang khởi tạo 20 cuốn sách mẫu...');

    const sampleBooksData = [
      { title: 'Dế Mèn Phiêu Lưu Ký', author: 'Tô Hoài', category: 'Văn học thiếu nhi', price: 65000, shelfLocation: 'Kệ A1' },
      { title: 'Tắt Đèn', author: 'Ngô Tất Tố', category: 'Văn học hiện thực', price: 72000, shelfLocation: 'Kệ A2' },
      { title: 'Số Đỏ', author: 'Vũ Trọng Phụng', category: 'Văn học trào phúng', price: 85000, shelfLocation: 'Kệ A3' },
      { title: 'Truyện Kiều', author: 'Nguyễn Du', category: 'Thơ Nôm cổ điển', price: 120000, shelfLocation: 'Kệ A4' },
      { title: 'Nhà Giả Kim', author: 'Paulo Coelho', category: 'Tiểu thuyết nước ngoài', price: 79000, shelfLocation: 'Kệ B1' },
      { title: 'Rừng Na-uy', author: 'Haruki Murakami', category: 'Tiểu thuyết nước ngoài', price: 115000, shelfLocation: 'Kệ B2' },
      { title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', category: 'Kỹ năng sống', price: 98000, shelfLocation: 'Kệ C1' },
      { title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', author: 'Rosie Nguyễn', category: 'Kỹ năng sống', price: 89000, shelfLocation: 'Kệ C2' },
      { title: 'Hoàng Tử Bé', author: 'Antoine de Saint-Exupéry', category: 'Văn học kinh điển', price: 68000, shelfLocation: 'Kệ B3' },
      { title: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', author: 'Nguyễn Nhật Ánh', category: 'Văn học Việt Nam', price: 92000, shelfLocation: 'Kệ A5' },
      { title: 'Cánh Đồng Bất Tận', author: 'Nguyễn Ngọc Tư', category: 'Truyện ngắn', price: 75000, shelfLocation: 'Kệ A6' },
      { title: 'Mắt Biếc', author: 'Nguyễn Nhật Ánh', category: 'Văn học Việt Nam', price: 95000, shelfLocation: 'Kệ A7' },
      { title: 'Chiếc Thuyền Ngoài Xa', author: 'Nguyễn Minh Châu', category: 'Truyện ngắn', price: 62000, shelfLocation: 'Kệ A8' },
      { title: 'Vợ Nhặt', author: 'Kim Lân', category: 'Văn học hiện thực', price: 58000, shelfLocation: 'Kệ A9' },
      { title: 'Lão Hạc', author: 'Nam Cao', category: 'Văn học hiện thực', price: 55000, shelfLocation: 'Kệ A10' },
      { title: 'Chí Phèo', author: 'Nam Cao', category: 'Văn học hiện thực', price: 60000, shelfLocation: 'Kệ A11' },
      { title: 'Sống Mòn', author: 'Nam Cao', category: 'Tiểu thuyết', price: 82000, shelfLocation: 'Kệ A12' },
      { title: 'Hạt Giống Tâm Hồn', author: 'First News', category: 'Kỹ năng sống', price: 78000, shelfLocation: 'Kệ C3' },
      { title: 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ', author: 'Trác Nhã', category: 'Kỹ năng giao tiếp', price: 105000, shelfLocation: 'Kệ C4' },
      { title: 'Đọc Vị Bất Kỳ Ai', author: 'David J. Lieberman', category: 'Tâm lý học', price: 99000, shelfLocation: 'Kệ C5' }
    ];

    const booksToInsert = sampleBooksData.map((b, index) => {
      const codeNum = String(index + 1).padStart(3, '0');
      return {
        bookCode: `MS-${codeNum}`,
        title: b.title,
        author: b.author,
        category: b.category,
        price: b.price,
        stock: Math.floor(Math.random() * 41) + 10,
        shelfLocation: b.shelfLocation,
        coverImage: '',
        images: []
      };
    });

    if (existingBooksCount === 0 || process.env.FORCE_SEED === 'true') {
      await Book.create(booksToInsert);
      console.log('✅ Đã tạo thành công 20 cuốn sách mẫu!');
    } else {
      console.log(`✅ Giữ nguyên ${existingBooksCount} cuốn sách hiện có của bạn.`);
    }

    // 7. Tạo một số Nhà cung cấp mẫu
    console.log('🏭 Đang khởi tạo Nhà cung cấp mẫu...');
    await Supplier.create([
      { code: 'NCC-KD', name: 'NXB Kim Đồng', phone: '02838222732', email: 'nxbkimdong@gmail.com', address: '247 Vũ Hữu, Hà Nội' },
      { code: 'NCC-TRE', name: 'NXB Trẻ', phone: '02839316289', email: 'nxbtre@gmail.com', address: '161 Lý Chính Thắng, Q3, TP.HCM' },
      { code: 'NCC-NN', name: 'Nhã Nam Books', phone: '02435146869', email: 'nhanam@gmail.com', address: '59 Đỗ Quang, Cầu Giấy, Hà Nội' }
    ]);
    console.log('✅ Đã tạo thành công 3 Nhà cung cấp mẫu!');

    // 8. Tạo 100 đơn hàng đã bán với đủ mọi trạng thái
    console.log('📦 Đang khởi tạo 100 đơn hàng mẫu với đủ mọi trạng thái...');

    const createdBooks = await Book.find();
    const createdUsers = await User.find({ role: 'user' });

    const addresses = [
      '12 Lê Lợi, Q.1, TP. Hồ Chí Minh',
      '88 Nguyễn Huệ, Q.1, TP. Hồ Chí Minh',
      '45 Cầu Giấy, Q. Cầu Giấy, Hà Nội',
      '123 Trần Phú, Q. Hải Châu, Đà Nẵng',
      '15 Nguyễn Văn Linh, Q. Ninh Kiều, Cần Thơ',
      '27 Đinh Tiên Hoàng, TP. Đà Lạt',
      '99 Lý Thường Kiệt, Q.10, TP. Hồ Chí Minh',
      '54 Hoàng Diệu, Q. Ba Đình, Hà Nội',
      '302 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh',
      '18 Phan Chu Trinh, TP. Nha Trang'
    ];

    const paymentMethods = ['cash', 'transfer', 'card'];

    // Phân bổ đủ mọi trạng thái cho 100 đơn:
    // 35 completed, 20 pending_confirmation, 15 delivering, 15 processing, 10 shipping, 5 cancelled = 100
    const statusesPool = [
      ...Array(35).fill('completed'),
      ...Array(20).fill('pending_confirmation'),
      ...Array(15).fill('delivering'),
      ...Array(15).fill('processing'),
      ...Array(10).fill('shipping'),
      ...Array(5).fill('cancelled')
    ];

    // Trộn ngẫu nhiên trạng thái
    for (let i = statusesPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statusesPool[i], statusesPool[j]] = [statusesPool[j], statusesPool[i]];
    }

    const invoicesToInsert = [];
    const now = new Date('2026-08-18T12:00:00.000Z');

    for (let i = 1; i <= 100; i++) {
      const isRegisteredUser = Math.random() > 0.2 && createdUsers.length > 0;
      let cName = 'Khách lẻ';
      let cPhone = generatePhone(30000000 + Math.floor(Math.random() * 50) + 1);
      let cAddr = addresses[i % addresses.length];

      if (isRegisteredUser) {
        const u = createdUsers[i % createdUsers.length];
        cName = u.name;
        cPhone = u.phone || cPhone;
      } else if (i % 5 === 0) {
        cName = `Khách hàng POS ${i}`;
      }

      // Chọn 1-3 cuốn sách ngẫu nhiên
      const itemNum = Math.floor(Math.random() * 3) + 1;
      const shuffledBooks = [...createdBooks].sort(() => 0.5 - Math.random());

      let totalAmount = 0;
      const orderItems = [];

      for (let k = 0; k < itemNum; k++) {
        const b = shuffledBooks[k];
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = b.price;
        totalAmount += price * qty;
        orderItems.push({
          book: b._id,
          quantity: qty,
          price: price
        });
      }

      const discountOptions = [0, 0, 0, 10000, 20000, 30000, 50000];
      let discount = discountOptions[Math.floor(Math.random() * discountOptions.length)];
      if (discount >= totalAmount) discount = 0;

      const finalAmount = totalAmount - discount;
      const pMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const orderStatus = statusesPool[i - 1];

      // Phân bổ thời gian rải đều từ T1/2026 đến T8/2026 với giờ, phút, giây khác nhau cho từng đơn
      const randomDaysAgo = Math.floor(Math.random() * 220);
      const randomHour = 8 + Math.floor(Math.random() * 14); // Khung giờ từ 08:00 đến 21:00 thực tế
      const randomMinute = Math.floor(Math.random() * 60);
      const randomSecond = Math.floor(Math.random() * 60);

      const createdAtDate = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
      createdAtDate.setHours(randomHour, randomMinute, randomSecond, Math.floor(Math.random() * 1000));

      const codeStr = String(i).padStart(4, '0');
      const invoiceCode = i % 2 === 0 ? `HD-POS-${codeStr}` : `HD-OL-${codeStr}`;

      invoicesToInsert.push({
        invoiceCode,
        customerName: cName,
        customerPhone: cPhone,
        customerAddress: cAddr,
        paymentMethod: pMethod,
        totalAmount,
        discount,
        finalAmount,
        items: orderItems,
        status: orderStatus,
        createdAt: createdAtDate,
        updatedAt: createdAtDate
      });
    }

    await Invoice.insertMany(invoicesToInsert);
    console.log('✅ Đã tạo thành công 100 đơn hàng đã bán với đủ mọi trạng thái!');

    // 9. Tạo danh sách các Phiếu Thu / Chi kế toán mẫu
    console.log('💰 Đang khởi tạo danh sách giao dịch Thu / Chi cho Bộ phận Kế toán...');
    const accountantUser = await User.findOne({ role: 'accountant' }) || await User.findOne({ role: 'admin' });

    const sampleTransactions = [
      // Các phiếu THU
      {
        transactionCode: 'PT-2026-001',
        type: 'thu',
        amount: 450000,
        description: 'Thu tiền thanh lý bao bì carton và giấy thừa',
        personName: 'Cơ sở ve chai Hoàng Phát',
        address: 'Quận 5, TP.HCM',
        paymentMethod: 'Tiền mặt',
        attached: 'Phiếu cân hàng',
        note: 'Đã nhập quỹ tiền mặt',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-01-15T09:30:00.000Z'),
        updatedAt: new Date('2026-01-15T09:30:00.000Z')
      },
      {
        transactionCode: 'PT-2026-002',
        type: 'thu',
        amount: 1250000,
        description: 'Thu phí dịch vụ gói quà nghệ thuật và bọc bìa cao cấp',
        personName: 'Khách hàng sự kiện Ngày Sách',
        address: 'Quận 1, TP.HCM',
        paymentMethod: 'Tiền mặt',
        attached: 'Sổ kê dịch vụ quầy',
        note: 'Dịch vụ phụ trợ',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-02-14T15:20:00.000Z'),
        updatedAt: new Date('2026-02-14T15:20:00.000Z')
      },
      {
        transactionCode: 'PT-2026-003',
        type: 'thu',
        amount: 3500000,
        description: 'Thu chiết khấu thương mại & thưởng doanh số Q1 từ NXB Kim Đồng',
        personName: 'NXB Kim Đồng',
        address: '247 Vũ Hữu, Hà Nội',
        paymentMethod: 'Chuyển khoản',
        attached: 'Ủy nhiệm chi số 8921',
        note: 'Chuyển khoản Techcombank',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-03-31T11:00:00.000Z'),
        updatedAt: new Date('2026-03-31T11:00:00.000Z')
      },
      {
        transactionCode: 'PT-2026-004',
        type: 'thu',
        amount: 5000000,
        description: 'Thu phí tài trợ & tổ chức Workshop giới thiệu sách mới',
        personName: 'CLB Văn Học & Sách Trẻ',
        address: 'Quận 3, TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: 'Hợp đồng tài trợ',
        note: 'Sự kiện giao lưu tác giả',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-05-18T14:45:00.000Z'),
        updatedAt: new Date('2026-05-18T14:45:00.000Z')
      },
      {
        transactionCode: 'PT-2026-005',
        type: 'thu',
        amount: 2800000,
        description: 'Thu tiền cho thuê không gian chụp ảnh & triển lãm tranh minh họa',
        personName: 'Studio Nghệ Thuật Ánh Dương',
        address: 'Quận Bình Thạnh, TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: 'Biên bản bàn giao mặt bằng',
        note: 'Thu tiền trước sự kiện',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-06-25T16:10:00.000Z'),
        updatedAt: new Date('2026-06-25T16:10:00.000Z')
      },
      {
        transactionCode: 'PT-2026-006',
        type: 'thu',
        amount: 1600000,
        description: 'Thu tiền bán thẻ hội viên VIP & bookmark kim loại phiên bản giới hạn',
        personName: 'Khách hàng thân thiết VIP',
        address: 'Quầy POS',
        paymentMethod: 'Tiền mặt',
        attached: 'Bảng kê bán thẻ',
        note: 'Chương trình tri ân độc giả',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-07-20T10:15:00.000Z'),
        updatedAt: new Date('2026-07-20T10:15:00.000Z')
      },

      // Các phiếu CHI
      {
        transactionCode: 'PC-2026-001',
        type: 'chi',
        amount: 4500000,
        description: 'Chi thanh toán tiền nhập sách Lô 1 từ NXB Kim Đồng',
        personName: 'NXB Kim Đồng',
        address: '247 Vũ Hữu, Hà Nội',
        paymentMethod: 'Chuyển khoản',
        attached: 'Hóa đơn GTGT & Phiếu nhập kho',
        note: 'Thanh toán tiền sách đợt 1',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-01-20T10:00:00.000Z'),
        updatedAt: new Date('2026-01-20T10:00:00.000Z')
      },
      {
        transactionCode: 'PC-2026-002',
        type: 'chi',
        amount: 3800000,
        description: 'Chi thanh toán tiền nhập sách Lô 2 từ NXB Trẻ',
        personName: 'NXB Trẻ',
        address: '161 Lý Chính Thắng, Q3, TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: 'Hóa đơn GTGT số 00412',
        note: 'Thanh toán tiền sách đợt 2',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-02-22T14:30:00.000Z'),
        updatedAt: new Date('2026-02-22T14:30:00.000Z')
      },
      {
        transactionCode: 'PC-2026-003',
        type: 'chi',
        amount: 1850000,
        description: 'Chi tiền điện, nước và internet cáp quang nhà sách Tháng 02/2026',
        personName: 'Điện lực EVN & VNPT Telecom',
        address: 'Quận 1, TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: 'Biên lai điện tử EVN/VNPT',
        note: 'Chi phí vận hành định kỳ',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-03-05T09:00:00.000Z'),
        updatedAt: new Date('2026-03-05T09:00:00.000Z')
      },
      {
        transactionCode: 'PC-2026-004',
        type: 'chi',
        amount: 950000,
        description: 'Chi mua văn phòng phẩm, bao bì túi giấy thân thiện môi trường',
        personName: 'Công ty Bao Bì Xanh',
        address: 'Quận Tân Bình, TP.HCM',
        paymentMethod: 'Tiền mặt',
        attached: 'Hóa đơn bán lẻ',
        note: 'Túi đựng sách in logo nhà sách',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-04-12T16:00:00.000Z'),
        updatedAt: new Date('2026-04-12T16:00:00.000Z')
      },
      {
        transactionCode: 'PC-2026-005',
        type: 'chi',
        amount: 650000,
        description: 'Chi bảo dưỡng định kỳ hệ thống máy in hóa đơn, máy quét mã vạch và kệ sách',
        personName: 'Dịch vụ Kỹ thuật Nam Phong',
        address: 'Quận 10, TP.HCM',
        paymentMethod: 'Tiền mặt',
        attached: 'Biên bản nghiệm thu bảo trì',
        note: 'Bảo trì trang thiết bị',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-05-20T11:30:00.000Z'),
        updatedAt: new Date('2026-05-20T11:30:00.000Z')
      },
      {
        transactionCode: 'PC-2026-006',
        type: 'chi',
        amount: 2200000,
        description: 'Chi phí tiếp thị số & chạy quảng cáo tuần lễ sách hè trên Facebook/TikTok',
        personName: 'Agency Truyền Thông Việt',
        address: 'Quận 3, TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: 'Hợp đồng dịch vụ quảng cáo',
        note: 'Chiến dịch hè 2026',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-06-15T15:00:00.000Z'),
        updatedAt: new Date('2026-06-15T15:00:00.000Z')
      },
      {
        transactionCode: 'PC-2026-007',
        type: 'chi',
        amount: 1150000,
        description: 'Chi phí vận chuyển & cước bưu điện giao hàng online đợt 1',
        personName: 'Giao Hàng Nhanh (GHN Express)',
        address: 'TP. Thủ Đức, TP.HCM',
        paymentMethod: 'Chuyển khoản',
        attached: 'Bảng đối soát cước vận chuyển',
        note: 'Phí ship đơn hàng online',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-07-10T17:20:00.000Z'),
        updatedAt: new Date('2026-07-10T17:20:00.000Z')
      },
      {
        transactionCode: 'PC-2026-008',
        type: 'chi',
        amount: 420000,
        description: 'Chi tiền mua trà, cà phê & nước uống phục vụ góc đọc sách',
        personName: 'Cửa hàng Bách Hóa Xanh',
        address: 'Quận 1, TP.HCM',
        paymentMethod: 'Tiền mặt',
        attached: 'Hóa đơn tính tiền siêu thị',
        note: 'Phục vụ bạn đọc',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-08-05T08:45:00.000Z'),
        updatedAt: new Date('2026-08-05T08:45:00.000Z')
      }
    ];

    await Transaction.insertMany(sampleTransactions);
    console.log('✅ Đã tạo thành công danh sách Phiếu Thu / Chi cho Bộ phận Kế toán!');

    console.log('🎉 Nạp dữ liệu mẫu thành công 100%! All ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi xảy ra khi nạp dữ liệu mẫu:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
} else {
  module.exports = seedData;
}
