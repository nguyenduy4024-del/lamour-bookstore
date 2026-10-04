const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedTransactionsOnly = async () => {
  try {
    console.log('📡 Đang kết nối Cơ sở dữ liệu...');
    await connectDB();

    console.log('🧹 Đang xóa giao dịch cũ...');
    await Transaction.deleteMany();

    const accountantUser = await User.findOne({ role: 'accountant' }) || await User.findOne({ role: 'admin' });
    if (!accountantUser) {
      console.error('❌ Không tìm thấy tài khoản kế toán hoặc admin');
      process.exit(1);
    }

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
    console.log('✅ Đã nạp thành công 14 giao dịch Thu / Chi cho Bộ phận Kế toán!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedTransactionsOnly();
} else {
  module.exports = seedTransactionsOnly;
}
