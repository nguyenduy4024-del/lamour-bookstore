const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Coupon = require('../models/Coupon');

async function seedCoupons() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const now = new Date();
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const sampleCoupons = [
    {
      code: 'CHAOMUNG',
      name: 'Ưu đãi chào mừng độc giả mới',
      discountType: 'percent',
      discountValue: 10,
      maxDiscountAmount: 50000,
      minOrderValue: 100000,
      usageLimit: 100,
      usedCount: 0,
      startDate: now,
      endDate: nextYear,
      isActive: true,
      description: 'Giảm 10% (tối đa 50k) cho đơn hàng sách từ 100k'
    },
    {
      code: 'LAMOUR50K',
      name: 'Voucher tri ân 50.000₫',
      discountType: 'fixed',
      discountValue: 50000,
      maxDiscountAmount: 0,
      minOrderValue: 250000,
      usageLimit: 50,
      usedCount: 0,
      startDate: now,
      endDate: nextYear,
      isActive: true,
      description: 'Giảm trực tiếp 50.000₫ cho hóa đơn từ 250.000₫'
    },
    {
      code: 'TRIANVIP',
      name: 'Tri ân độc giả thân thiết',
      discountType: 'percent',
      discountValue: 15,
      maxDiscountAmount: 80000,
      minOrderValue: 150000,
      usageLimit: 200,
      usedCount: 0,
      startDate: now,
      endDate: nextYear,
      isActive: true,
      description: 'Giảm 15% (tối đa 80k) cho mọi đơn từ 150k'
    },
    {
      code: 'TEST1LUOT',
      name: 'Mã thử nghiệm trừ & hoàn lượt sử dụng',
      discountType: 'fixed',
      discountValue: 20000,
      maxDiscountAmount: 0,
      minOrderValue: 50000,
      usageLimit: 2,
      usedCount: 0,
      startDate: now,
      endDate: nextYear,
      isActive: true,
      description: 'Mã thử nghiệm số lượt dùng (2 lượt)'
    }
  ];

  for (const c of sampleCoupons) {
    const existing = await Coupon.findOne({ code: c.code });
    if (!existing) {
      await Coupon.create(c);
      console.log(`Created coupon: ${c.code}`);
    } else {
      console.log(`Coupon already exists: ${c.code}`);
    }
  }

  console.log('Seeding coupons completed successfully!');
  process.exit(0);
}

seedCoupons().catch(err => {
  console.error('Lỗi seed coupons:', err);
  process.exit(1);
});
