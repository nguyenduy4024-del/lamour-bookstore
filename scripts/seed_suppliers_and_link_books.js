const mongoose = require('mongoose');
require('dotenv').config();

const Supplier = require('../models/Supplier');
const Book = require('../models/Book');

const supplierDefinitions = [
  {
    code: 'NCC-NN01',
    name: 'Công ty CP Văn hóa & Truyền thông Nhã Nam',
    contactPerson: 'Nguyễn Nhật Anh',
    phone: '02435146888',
    email: 'contact@nhanam.vn',
    address: '59 Đỗ Quang, Trung Hòa, Cầu Giấy, Hà Nội',
    categories: ['Văn học nước ngoài', 'Tiểu thuyết kinh điển', 'Trinh thám & Bí ẩn'],
    bankAccount: {
      bankName: 'Vietcombank - CN Ba Đình',
      accountNumber: '0011004289888',
      accountHolder: 'CTY CP VH VA TT NHA NAM'
    },
    status: 'active',
    isDeleted: false,
    legacyNameKeywords: ['nhã nam', 'nha nam']
  },
  {
    code: 'NCC-TRE02',
    name: 'Nhà Xuất Bản Trẻ',
    contactPerson: 'Phan Thị Thu Hà',
    phone: '02839316289',
    email: 'hopthu@nxbtre.com.vn',
    address: '161B Lý Chính Thắng, P. Võ Thị Sáu, Quận 3, TP.HCM',
    categories: ['Văn học Việt Nam đương đại', 'Truyện dài', 'Tản văn'],
    bankAccount: {
      bankName: 'Agribank - CN TP.HCM',
      accountNumber: '1600201048899',
      accountHolder: 'NHA XUAT BAN TRE'
    },
    status: 'active',
    isDeleted: false,
    legacyNameKeywords: ['nxb trẻ', 'nxb tre']
  },
  {
    code: 'NCC-KD03',
    name: 'Nhà Xuất Bản Kim Đồng',
    contactPerson: 'Bùi Tuấn Nghĩa',
    phone: '02439434730',
    email: 'cskh@nxbkimdong.com.vn',
    address: '55 Quang Trung, Hai Bà Trưng, Hà Nội',
    categories: ['Văn học thiếu nhi', 'Truyện tranh', 'Giáo dục tuổi thơ'],
    bankAccount: {
      bankName: 'BIDV - CN Quang Trung',
      accountNumber: '12010000388999',
      accountHolder: 'NHA XUAT BAN KIM DONG'
    },
    status: 'active',
    isDeleted: false,
    legacyNameKeywords: ['kim đồng', 'kim dong']
  },
  {
    code: 'NCC-FN04',
    name: 'First News - Trí Việt / Alphabooks',
    contactPerson: 'Nguyễn Văn Phước',
    phone: '02838227979',
    email: 'triviet@firstnews.com.vn',
    address: '11H Nguyễn Thị Minh Khai, Bến Nghé, Quận 1, TP.HCM',
    categories: ['Kỹ năng sống', 'Phát triển bản thân', 'Kinh doanh & Khởi nghiệp', 'Tâm lý học'],
    bankAccount: {
      bankName: 'Techcombank - CN Sài Gòn',
      accountNumber: '19028889996666',
      accountHolder: 'CONG TY FIRST NEWS TRI VIET'
    },
    status: 'active',
    isDeleted: false,
    legacyNameKeywords: ['first news', 'alphabooks', 'trí việt']
  },
  {
    code: 'NCC-VH05',
    name: 'Nhà Xuất Bản Văn Học',
    contactPerson: 'Nguyễn Anh Vũ',
    phone: '02438252873',
    email: 'nxbvanhoc@gmail.com',
    address: '18 Nguyễn Trường Tộ, Ba Đình, Hà Nội',
    categories: ['Văn học hiện thực phê phán', 'Thơ cổ điển', 'Văn học dân gian'],
    bankAccount: {
      bankName: 'VietinBank - CN Ba Đình',
      accountNumber: '113000045678',
      accountHolder: 'NHA XUAT BAN VAN HOC'
    },
    status: 'active',
    isDeleted: false,
    legacyNameKeywords: ['nxb văn học', 'nxb van hoc']
  },
  {
    code: 'NCC-GD06',
    name: 'Nhà Xuất Bản Giáo Dục Việt Nam',
    contactPerson: 'Nguyễn Đức Thái',
    phone: '02438220801',
    email: 'giaoduc@nxbgd.vn',
    address: '81 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    categories: ['Sách giáo khoa', 'Sách bài tập', 'Tài liệu ôn thi', 'Khoa học & Tri thức'],
    bankAccount: {
      bankName: 'Vietcombank - CN Hoàn Kiếm',
      accountNumber: '0011001234567',
      accountHolder: 'NHA XUAT BAN GIAO DUC VN'
    },
    status: 'active',
    isDeleted: false,
    legacyNameKeywords: ['giáo dục', 'giao duc']
  }
];

async function seedSuppliersAndLinkBooks() {
  console.log('=== KHỞI CHẠY MIGRATION: NHÀ CUNG CẤP & LIÊN KẾT SÁCH ===\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Kết nối CSDL MongoDB thành công.');

  const supplierMap = {}; // code -> Supplier document

  // 1. Khởi tạo / Cập nhật 6 Nhà Cung Cấp chuẩn
  console.log('\n1. Khởi tạo & Đồng bộ danh mục 6 Nhà Cung Cấp chuẩn...');
  for (const def of supplierDefinitions) {
    // Tìm NCC theo code hoặc theo tên cũ đã có
    let sup = await Supplier.findOne({
      $or: [
        { code: def.code },
        ...def.legacyNameKeywords.map(k => ({ name: new RegExp(k, 'i') }))
      ]
    });

    if (sup) {
      sup.code = def.code;
      sup.name = def.name;
      sup.contactPerson = def.contactPerson;
      sup.phone = def.phone;
      sup.email = def.email;
      sup.address = def.address;
      sup.categories = def.categories;
      sup.bankAccount = def.bankAccount;
      sup.status = def.status;
      sup.isDeleted = false;
      await sup.save();
      console.log(`  [UPDATE] Đã cập nhật NCC: ${sup.code} - ${sup.name} (_id: ${sup._id})`);
    } else {
      sup = await Supplier.create({
        code: def.code,
        name: def.name,
        contactPerson: def.contactPerson,
        phone: def.phone,
        email: def.email,
        address: def.address,
        categories: def.categories,
        bankAccount: def.bankAccount,
        status: def.status,
        isDeleted: false
      });
      console.log(`  [CREATE] Đã thêm mới NCC: ${sup.code} - ${sup.name} (_id: ${sup._id})`);
    }

    supplierMap[def.code] = sup;
  }

  // 2. Logic phân bổ từng cuốn sách vào đúng NCC
  console.log('\n2. Bắt đầu quét và phân bổ toàn bộ sách vào đúng Nhà Cung Cấp...');
  const books = await Book.find();
  console.log(`  Tìm thấy tổng cộng: ${books.length} cuốn sách.`);

  let updatedCount = 0;
  const countsBySupplier = {
    'NCC-NN01': 0,
    'NCC-TRE02': 0,
    'NCC-KD03': 0,
    'NCC-FN04': 0,
    'NCC-VH05': 0,
    'NCC-GD06': 0
  };

  for (const b of books) {
    const title = (b.title || '').toLowerCase();
    const author = (b.author || '').toLowerCase();
    const category = (b.category || '').toLowerCase();

    let targetCode = 'NCC-NN01'; // Mặc định nếu không phân loại rõ

    // QUY TẮC PHÂN BỔ:
    // 1. Sách Thiếu Nhi / Truyện Thiếu nhi -> NXB Kim Đồng
    if (
      category.includes('thiếu nhi') ||
      title.includes('dế mèn') ||
      title.includes('đất rừng phương nam') ||
      author.includes('tô hoài') ||
      author.includes('đoàn giỏi')
    ) {
      targetCode = 'NCC-KD03';
    }
    // 2. Sách Giáo khoa / Khoa học & Tri thức -> NXB Giáo Dục Việt Nam
    else if (
      category.includes('khoa học') ||
      title.includes('toán') ||
      title.includes('văn') && title.includes('bí quyết') ||
      title.includes('vật lý') ||
      title.includes('hóa học') ||
      title.includes('lịch sử việt nam') ||
      title.includes('địa lý')
    ) {
      targetCode = 'NCC-GD06';
    }
    // 3. Kỹ năng sống / Kinh doanh / Tâm lý / Phát triển bản thân -> First News - Trí Việt / Alphabooks
    else if (
      category.includes('kỹ năng') ||
      category.includes('kinh tế') ||
      category.includes('tâm lý') ||
      category.includes('tâm linh') ||
      category.includes('nghệ thuật sống') ||
      title.includes('đắc nhân tâm') ||
      title.includes('tuổi trẻ đáng giá') ||
      title.includes('nghĩ giàu') ||
      title.includes('thói quen') ||
      title.includes('quản trị') ||
      author.includes('dale carnegie') ||
      author.includes('rosie nguyễn') ||
      author.includes('stephen covey') ||
      author.includes('napoleon hill')
    ) {
      targetCode = 'NCC-FN04';
    }
    // 4. Văn học hiện thực phê phán / Thơ ca cổ điển -> NXB Văn Học
    else if (
      title.includes('tắt đèn') ||
      title.includes('số đỏ') ||
      title.includes('chí phèo') ||
      title.includes('lão hạc') ||
      title.includes('vợ nhặt') ||
      title.includes('sống mòn') ||
      title.includes('truyện kiều') ||
      title.includes('gió lạnh đầu mùa') ||
      title.includes('chiếc thuyền ngoài xa') ||
      author.includes('ngô tất tố') ||
      author.includes('vũ trọng phụng') ||
      author.includes('nam cao') ||
      author.includes('nguyễn du') ||
      author.includes('kim lân') ||
      author.includes('thạch lam') ||
      author.includes('nguyễn minh châu')
    ) {
      targetCode = 'NCC-VH05';
    }
    // 5. Văn học Việt Nam đương đại / Truyện dài / Tản văn -> NXB Trẻ
    else if (
      author.includes('nguyễn nhật ánh') ||
      author.includes('nguyễn ngọc tư') ||
      author.includes('bảo ninh') ||
      author.includes('anh đức') ||
      title.includes('mắt biếc') ||
      title.includes('cánh đồng bất tận') ||
      title.includes('tôi thấy hoa vàng') ||
      title.includes('cho tôi xin một vé') ||
      title.includes('nỗi buồn chiến tranh') ||
      (category.includes('việt nam') && !category.includes('hiện thực'))
    ) {
      targetCode = 'NCC-TRE02';
    }
    // 6. Văn học nước ngoài, Kinh điển & Thế giới, Trinh thám -> Nhã Nam
    else {
      targetCode = 'NCC-NN01';
    }

    const assignedSup = supplierMap[targetCode];
    if (assignedSup) {
      b.supplier = assignedSup._id;
      await b.save();
      countsBySupplier[targetCode]++;
      updatedCount++;
    }
  }

  console.log(`\n✓ Đã hoàn tất gán Nhà Cung Cấp cho ${updatedCount} cuốn sách!`);
  console.log('Thống kê phân bổ:');
  for (const [code, count] of Object.entries(countsBySupplier)) {
    const s = supplierMap[code];
    console.log(`  - [${code}] ${s.name}: ${count} đầu sách`);
  }

  console.log('\n======================================================');
  console.log('🎉 SEED DỮ LIỆU NHÀ CUNG CẤP & SÁCH THÀNH CÔNG 100%!');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  seedSuppliersAndLinkBooks().catch(err => {
    console.error('Lỗi khi chạy seeding:', err);
    process.exit(1);
  });
}

module.exports = seedSuppliersAndLinkBooks;
