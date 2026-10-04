const Coupon = require('../models/Coupon');
const { logActivity } = require('../utils/auditLogger');

// @desc    Kiểm tra & áp dụng mã giảm giá cho đơn hàng (Public/Staff/User)
// @route   POST /api/coupons/validate
// @access  Public
const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã giảm giá'
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: `Mã giảm giá "${cleanCode}" không tồn tại trên hệ thống.`
      });
    }

    const validation = coupon.checkValidity(orderTotal);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    res.status(200).json({
      success: true,
      message: validation.message,
      data: {
        couponId: coupon._id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minOrderValue: coupon.minOrderValue,
        discountAmount: validation.discountAmount,
        finalAmount: validation.finalAmount,
        remainingUses: Math.max(0, (coupon.usageLimit || 0) - (coupon.usedCount || 0))
      }
    });
  } catch (error) {
    console.error('Lỗi validateCoupon:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi kiểm tra mã giảm giá'
    });
  }
};

// @desc    Lấy danh sách mã giảm giá (kèm KPI) cho Admin/Staff
// @route   GET /api/coupons
// @access  Private (Admin, Staff, Accountant)
const getCoupons = async (req, res) => {
  try {
    const { search, status, discountType } = req.query;
    const query = {};

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { code: { $regex: s, $options: 'i' } },
        { name: { $regex: s, $options: 'i' } }
      ];
    }

    const now = new Date();

    if (status === 'active') {
      query.isActive = true;
      query.endDate = { $gte: now };
      query.$expr = { $lt: ['$usedCount', '$usageLimit'] };
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.endDate = { $lt: now };
    } else if (status === 'out_of_uses') {
      query.$expr = { $gte: ['$usedCount', '$usageLimit'] };
    }

    if (discountType && ['percent', 'fixed'].includes(discountType)) {
      query.discountType = discountType;
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 });

    // Tính toán KPI tổng quan
    const allCoupons = await Coupon.find();
    let totalCoupons = allCoupons.length;
    let activeCoupons = 0;
    let totalUsedCount = 0;
    let expiredOrExhaustedCoupons = 0;

    allCoupons.forEach(c => {
      totalUsedCount += (c.usedCount || 0);
      const isExpired = c.endDate && new Date(c.endDate) < now;
      const isExhausted = c.usageLimit && c.usedCount >= c.usageLimit;
      if (isExpired || isExhausted) {
        expiredOrExhaustedCoupons++;
      }
      if (c.isActive && !isExpired && !isExhausted) {
        activeCoupons++;
      }
    });

    res.status(200).json({
      success: true,
      kpi: {
        totalCoupons,
        activeCoupons,
        totalUsedCount,
        expiredOrExhaustedCoupons
      },
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    console.error('Lỗi getCoupons:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tải danh sách mã giảm giá'
    });
  }
};

// @desc    Lấy chi tiết 1 mã giảm giá
// @route   GET /api/coupons/:id
// @access  Private (Admin, Staff, Accountant)
const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá'
      });
    }
    res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết mã giảm giá'
    });
  }
};

// @desc    Tạo mã giảm giá mới (Admin)
// @route   POST /api/coupons
// @access  Private (Admin)
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      name,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderValue,
      usageLimit,
      startDate,
      endDate,
      isActive,
      description
    } = req.body;

    if (!code || !name || discountValue === undefined || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Mã giảm giá, Tên chương trình, Giá trị giảm và Ngày hết hạn'
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã giảm giá "${cleanCode}" đã tồn tại trên hệ thống!`
      });
    }

    const numDiscountValue = Number(discountValue) || 0;
    if (discountType === 'percent' && (numDiscountValue <= 0 || numDiscountValue > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Giá trị giảm theo phần trăm (%) phải từ 1% đến 100%'
      });
    }

    if (discountType === 'fixed' && numDiscountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền giảm cố định phải lớn hơn 0₫'
      });
    }

    const newCoupon = await Coupon.create({
      code: cleanCode,
      name: name.trim(),
      discountType: discountType || 'percent',
      discountValue: numDiscountValue,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      minOrderValue: Number(minOrderValue) || 0,
      usageLimit: Number(usageLimit) || 100,
      usedCount: 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      description: (description || '').trim()
    });

    logActivity(req, {
      module: 'SETTINGS',
      action: 'COUPON_CREATE',
      severity: 'INFO',
      targetId: String(newCoupon._id),
      targetModel: 'Coupon',
      targetLabel: `Mã giảm giá #${cleanCode}`,
      description: `Tạo mã giảm giá mới "${cleanCode}" (${newCoupon.name}): Giảm ${newCoupon.discountType === 'percent' ? newCoupon.discountValue + '%' : Number(newCoupon.discountValue).toLocaleString('vi-VN') + ' đ'}`,
      diff: [
        { field: 'code', fieldLabel: 'Mã voucher', oldValue: null, newValue: cleanCode },
        { field: 'discountValue', fieldLabel: 'Mức giảm', oldValue: null, newValue: newCoupon.discountValue }
      ]
    });

    res.status(201).json({
      success: true,
      message: `Tạo mã giảm giá "${cleanCode}" thành công!`,
      data: newCoupon
    });
  } catch (error) {
    console.error('Lỗi createCoupon:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo mã giảm giá'
    });
  }
};

// @desc    Cập nhật mã giảm giá (Admin)
// @route   PUT /api/coupons/:id
// @access  Private (Admin)
const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá cần cập nhật'
      });
    }

    const {
      code,
      name,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderValue,
      usageLimit,
      startDate,
      endDate,
      isActive,
      description
    } = req.body;

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      if (cleanCode !== coupon.code) {
        const existing = await Coupon.findOne({ code: cleanCode });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Mã "${cleanCode}" đã bị trùng với một voucher khác!`
          });
        }
        coupon.code = cleanCode;
      }
    }

    if (name) coupon.name = name.trim();
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) {
      const val = Number(discountValue) || 0;
      if (coupon.discountType === 'percent' && (val <= 0 || val > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Phần trăm giảm phải từ 1% đến 100%'
        });
      }
      coupon.discountValue = val;
    }
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = Number(maxDiscountAmount) || 0;
    if (minOrderValue !== undefined) coupon.minOrderValue = Number(minOrderValue) || 0;
    if (usageLimit !== undefined) coupon.usageLimit = Math.max(coupon.usedCount, Number(usageLimit) || 1);
    if (startDate) coupon.startDate = new Date(startDate);
    if (endDate) coupon.endDate = new Date(endDate);
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);
    if (description !== undefined) coupon.description = (description || '').trim();

    await coupon.save();

    logActivity(req, {
      module: 'SETTINGS',
      action: 'COUPON_UPDATE',
      severity: 'INFO',
      targetId: String(coupon._id),
      targetModel: 'Coupon',
      targetLabel: `Mã giảm giá #${coupon.code}`,
      description: `Cập nhật thông tin mã giảm giá "${coupon.code}" (${coupon.name})`
    });

    res.status(200).json({
      success: true,
      message: `Đã cập nhật mã giảm giá "${coupon.code}" thành công!`,
      data: coupon
    });
  } catch (error) {
    console.error('Lỗi updateCoupon:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật mã giảm giá'
    });
  }
};

// @desc    Bật / Tắt trạng thái mã giảm giá (Admin)
// @route   PATCH /api/coupons/:id/toggle
// @access  Private (Admin)
const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Đã ${coupon.isActive ? 'kích hoạt' : 'tạm dừng'} mã "${coupon.code}"`,
      data: coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi đổi trạng thái mã'
    });
  }
};

// @desc    Xóa mã giảm giá (Admin)
// @route   DELETE /api/coupons/:id
// @access  Private (Admin)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá'
      });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    logActivity(req, {
      module: 'SETTINGS',
      action: 'COUPON_DELETE',
      severity: 'WARNING',
      targetId: String(coupon._id),
      targetModel: 'Coupon',
      targetLabel: `Mã giảm giá #${coupon.code}`,
      description: `Xóa mã giảm giá "${coupon.code}" (${coupon.name}) khỏi hệ thống`
    });

    res.status(200).json({
      success: true,
      message: `Đã xóa mã giảm giá "${coupon.code}" thành công!`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa mã giảm giá'
    });
  }
};

module.exports = {
  validateCoupon,
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon
};
