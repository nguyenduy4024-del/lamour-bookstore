const mongoose = require('mongoose');

const heroBannerSchema = new mongoose.Schema({
  image: { type: String, default: '' },
  badge: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  linkUrl: { type: String, default: '/products' }
}, { _id: false });

const settingSchema = new mongoose.Schema(
  {
    heroBanners: {
      type: [heroBannerSchema],
      default: [
        {
          image: 'https://images.unsplash.com/photo-1507842229451-7f01dd8610ce?auto=format&fit=crop&w=1920&q=85',
          badge: 'TÁC PHẨM KINH ĐIỂN',
          title: 'Trăm Năm Cô Đơn',
          description: 'Kiệt tác hiện thực huyền ảo của Gabriel García Márquez — Bản dịch hoàn chỉnh.',
          linkUrl: '/products'
        },
        {
          image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1920&q=85',
          badge: 'NGHỆ THUẬT & TRIẾT HỌC',
          title: 'Nhà Giả Kim',
          description: 'Hành trình theo đuổi vận mệnh đời mình qua ngòi bút của Paulo Coelho.',
          linkUrl: '/products'
        },
        {
          image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1920&q=85',
          badge: 'TIỂU THUYẾT ĐOẠT GIẢI',
          title: 'Rừng Na Uy',
          description: 'Bản tình ca u buồn và sâu lắng của Haruki Murakami về tuổi trẻ và sự cô đơn.',
          linkUrl: '/products'
        },
        {
          image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1920&q=85',
          badge: 'VĂN HỌC THẾ GIỚI',
          title: 'Hoàng Tử Bé',
          description: 'Cuốn sách dành cho những người lớn từng là trẻ con của Antoine de Saint-Exupéry.',
          linkUrl: '/products'
        }
      ]
    },
    contact: {
      phone: { type: String, default: '1900 8888' },
      email: { type: String, default: 'contact@lamour.vn' },
      time: { type: String, default: '08:00 - 22:00 (Hàng ngày)' },
      address1: { type: String, default: '31 P. Dịch Vọng Hậu, Cầu Giấy, Hà Nội, Việt Nam' },
      address2: { type: String, default: '45 Đinh Tiên Hoàng, P. Đa Kao, Quận 1, TP. HCM' }
    },
    social: {
      zalo: { type: String, default: 'https://zalo.me' },
      messenger: { type: String, default: 'https://m.me' },
      facebook: { type: String, default: 'https://facebook.com' },
      instagram: { type: String, default: 'https://instagram.com' },
      tiktok: { type: String, default: 'https://tiktok.com' }
    },
    footer: {
      aboutText: { type: String, default: "Không gian lưu giữ và lan tỏa những giá trị tri thức nghệ thuật, đưa những trang sách kinh điển đến gần hơn với tâm hồn bạn." },
      copyright: { type: String, default: "© 2026 L'Amour Bookstore. Bản quyền thuộc về L'Amour." }
    },
    // Cấu hình thanh toán & ngân hàng nhận tiền
    bankQrImage: {
      type: String,
      default: '/images/qr-bank.jpg'
    },
    momoQrImage: {
      type: String,
      default: '/images/qr-momo.jpg'
    },
    bankAccount: {
      bankName: { type: String, default: 'MBBank (Ngân hàng Quân Đội)' },
      accountNumber: { type: String, default: '0912345678' },
      accountHolder: { type: String, default: 'CONG TY CP SACH L AMOUR' },
      qrImage: { type: String, default: '/images/qr-bank.jpg' }
    },
    momo: {
      phone: { type: String, default: '0912345678' },
      holder: { type: String, default: 'L AMOUR BOOKSTORE' },
      qrImage: { type: String, default: '/images/qr-momo.jpg' }
    },
    // Thông tin doanh nghiệp
    storeInfo: {
      storeName: { type: String, default: "L'Amour Bookstore" },
      hotline: { type: String, default: '1900 8888' },
      email: { type: String, default: 'contact@lamour.vn' },
      address: { type: String, default: '31 P. Dịch Vọng Hậu, Cầu Giấy, Hà Nội' },
      openHours: { type: String, default: '08:00 - 22:00 (Hàng ngày)' }
    },
    // Cấu hình sao lưu & phục hồi tự động
    backupConfig: {
      autoBackup: { type: Boolean, default: true },
      scheduleTime: { type: String, default: '02:00' },
      retentionDays: { type: Number, default: 30 },
      scope: { type: String, default: 'FULL' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Setting', settingSchema);
