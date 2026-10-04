const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

dotenv.config();

const seedAuditLogs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    const admin = await User.findOne({ role: 'admin' }) || await User.findOne({});
    const adminId = admin ? admin._id : new mongoose.Types.ObjectId();
    const adminName = admin ? admin.name : 'Lê Thị Quỳnh';
    const adminEmail = admin ? admin.email : 'admin@lamourbookstore.vn';

    const now = new Date();
    const sampleLogs = [
      {
        performedBy: adminId,
        performerName: adminName,
        performerEmail: adminEmail,
        performerRole: 'admin',
        module: 'SETTINGS',
        action: 'SETTINGS_UPDATE_PAYMENT',
        severity: 'CRITICAL',
        status: 'SUCCESS',
        targetLabel: 'Cấu hình hệ thống & Cổng thanh toán',
        targetModel: 'Setting',
        description: 'Cập nhật tài khoản thụ hưởng ngân hàng VietQR & Ví MoMo của cửa hàng',
        diff: [
          {
            field: 'bankAccountNumber',
            fieldLabel: 'Số tài khoản VietQR',
            oldValue: '0912345678',
            newValue: '1903678999888'
          },
          {
            field: 'bankName',
            fieldLabel: 'Ngân hàng thụ hưởng',
            oldValue: 'MBBank',
            newValue: 'Techcombank'
          }
        ],
        ipAddress: '113.161.45.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        createdAt: new Date(now.getTime() - 1000 * 60 * 15) // 15 phút trước
      },
      {
        performedBy: adminId,
        performerName: adminName,
        performerEmail: adminEmail,
        performerRole: 'admin',
        module: 'USERS',
        action: 'USER_UPDATE_ROLE',
        severity: 'CRITICAL',
        status: 'SUCCESS',
        targetLabel: 'Nguyễn Văn Tuấn (tuan.nv@lamour.vn)',
        targetModel: 'User',
        description: 'Nâng quyền tài khoản "Nguyễn Văn Tuấn" từ nhân viên bán hàng (staff) lên quản trị viên (admin)',
        diff: [
          {
            field: 'role',
            fieldLabel: 'Vai trò (Role)',
            oldValue: 'staff',
            newValue: 'admin'
          }
        ],
        ipAddress: '113.161.45.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 1000 * 60 * 45) // 45 phút trước
      },
      {
        performedBy: adminId,
        performerName: adminName,
        performerEmail: adminEmail,
        performerRole: 'admin',
        module: 'BOOKS',
        action: 'BOOK_PRICE_UPDATE',
        severity: 'WARNING',
        status: 'SUCCESS',
        targetLabel: 'Đắc Nhân Tâm (BK-DNT-01)',
        targetModel: 'Book',
        description: 'Cập nhật giá bán sách "Đắc Nhân Tâm" từ 85.000 đ thành 95.000 đ',
        diff: [
          {
            field: 'price',
            fieldLabel: 'Giá bán',
            oldValue: 85000,
            newValue: 95000
          },
          {
            field: 'stock',
            fieldLabel: 'Tồn kho',
            oldValue: 40,
            newValue: 50
          }
        ],
        ipAddress: '113.161.45.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date(now.getTime() - 1000 * 60 * 120) // 2 giờ trước
      },
      {
        performedBy: adminId,
        performerName: adminName,
        performerEmail: adminEmail,
        performerRole: 'admin',
        module: 'INVENTORY',
        action: 'STOCK_AUDIT_APPROVE',
        severity: 'CRITICAL',
        status: 'SUCCESS',
        targetLabel: 'Phiếu kiểm kê #KK-2026-004',
        targetModel: 'AuditReceipt',
        description: 'Phê duyệt biên bản điều chỉnh tồn kho #KK-2026-004. Hạch toán tổn thất 420.000 đ sang Kế toán',
        diff: [
          {
            field: 'status',
            fieldLabel: 'Trạng thái kiểm kê',
            oldValue: 'pending_approval',
            newValue: 'approved'
          },
          {
            field: 'lossAmount',
            fieldLabel: 'Giá trị tổn thất ghi nhận',
            oldValue: 0,
            newValue: 420000
          }
        ],
        ipAddress: '14.232.180.5',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date(now.getTime() - 1000 * 60 * 240) // 4 giờ trước
      },
      {
        performedBy: adminId,
        performerName: adminName,
        performerEmail: adminEmail,
        performerRole: 'admin',
        module: 'AUTH',
        action: 'AUTH_LOGIN_SUCCESS',
        severity: 'INFO',
        status: 'SUCCESS',
        targetLabel: 'Lê Thị Quỳnh',
        targetModel: 'User',
        description: 'Đăng nhập thành công vào Hệ thống Quản trị Enterprise Admin với vai trò admin',
        ipAddress: '113.161.45.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
        createdAt: new Date(now.getTime() - 1000 * 60 * 300)
      },
      {
        performedBy: null,
        performerName: 'hacker_unknown@gmail.com',
        performerEmail: '',
        performerRole: 'guest',
        module: 'AUTH',
        action: 'AUTH_LOGIN_FAILED',
        severity: 'WARNING',
        status: 'FAILURE',
        targetLabel: 'hacker_unknown@gmail.com',
        targetModel: 'User',
        description: 'Cố gắng đăng nhập thất bại liên tiếp với tài khoản "hacker_unknown@gmail.com" (Mật khẩu không chính xác)',
        ipAddress: '171.244.32.88',
        userAgent: 'python-requests/2.31.0',
        createdAt: new Date(now.getTime() - 1000 * 60 * 360)
      },
      {
        performedBy: adminId,
        performerName: adminName,
        performerEmail: adminEmail,
        performerRole: 'admin',
        module: 'ACCOUNTING',
        action: 'TRANSACTION_CREATE',
        severity: 'WARNING',
        status: 'SUCCESS',
        targetLabel: 'Phiếu Chi #PC-2026-088',
        targetModel: 'Transaction',
        description: 'Lập Phiếu Chi #PC-2026-088: Chi tiền thanh toán tiền thuê mặt bằng quý 4/2026 - Số tiền: 45.000.000 đ',
        diff: [
          {
            field: 'amount',
            fieldLabel: 'Số tiền chi',
            oldValue: null,
            newValue: 45000000
          }
        ],
        ipAddress: '113.161.45.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24) // 1 ngày trước
      },
      {
        performedBy: adminId,
        performerName: adminName,
        performerEmail: adminEmail,
        performerRole: 'admin',
        module: 'USERS',
        action: 'USER_BLOCK',
        severity: 'WARNING',
        status: 'SUCCESS',
        targetLabel: 'Trần Văn Vi Phạm (pham.tv@gmail.com)',
        targetModel: 'User',
        description: 'Khóa tài khoản người dùng "Trần Văn Vi Phạm" do có dấu hiệu đặt đơn ảo spam hệ thống',
        diff: [
          {
            field: 'status',
            fieldLabel: 'Trạng thái',
            oldValue: 'active',
            newValue: 'blocked'
          }
        ],
        ipAddress: '113.161.45.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 36) // 1.5 ngày trước
      },
      {
        performedBy: adminId,
        performerName: adminName,
        performerEmail: adminEmail,
        performerRole: 'admin',
        module: 'ORDERS',
        action: 'INVOICE_CANCEL',
        severity: 'WARNING',
        status: 'SUCCESS',
        targetLabel: 'Đơn #DH-2026-042',
        targetModel: 'Invoice',
        description: 'Hủy đơn hàng #DH-2026-042 theo yêu cầu đổi địa chỉ của khách hàng (Giá trị: 320.000 đ, Hoàn lại 3 quyển vào kệ KHO-A1)',
        diff: [
          {
            field: 'status',
            fieldLabel: 'Trạng thái đơn hàng',
            oldValue: 'pending_confirmation',
            newValue: 'cancelled'
          }
        ],
        ipAddress: '113.161.45.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48) // 2 ngày trước
      }
    ];

    await AuditLog.insertMany(sampleLogs);
    console.log(`Đã khởi tạo thành công ${sampleLogs.length} bản ghi nhật ký hoạt động mẫu!`);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi seed audit logs:', err);
    process.exit(1);
  }
};

seedAuditLogs();
