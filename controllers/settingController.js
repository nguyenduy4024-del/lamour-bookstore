const Setting = require('../models/Setting');
const { logActivity } = require('../utils/auditLogger');

// @desc    Lấy cấu hình trang chủ (CMS)
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }
    res.status(200).json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình hệ thống:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy cấu hình hệ thống'
    });
  }
};

// @desc    Lấy cấu hình thanh toán công khai (Public API cho Khách hàng & Quầy POS)
// @route   GET /api/settings/payment-info
// @access  Public
const getPaymentInfo = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }

    const bankQrImage = setting.bankQrImage || setting.bankAccount?.qrImage || '/images/qr-bank.jpg';
    const momoQrImage = setting.momoQrImage || setting.momo?.qrImage || '/images/qr-momo.jpg';

    const paymentInfo = {
      bankQrImage,
      momoQrImage,
      bankAccount: {
        bankName: setting.bankAccount?.bankName || 'MBBank (Ngân hàng Quân Đội)',
        accountNumber: setting.bankAccount?.accountNumber || '0912345678',
        accountHolder: setting.bankAccount?.accountHolder || 'CONG TY CP SACH L AMOUR',
        qrImage: bankQrImage
      },
      momo: {
        phone: setting.momo?.phone || '0912345678',
        holder: setting.momo?.holder || 'L AMOUR BOOKSTORE',
        qrImage: momoQrImage
      },
      storeInfo: setting.storeInfo || {}
    };

    res.status(200).json({
      success: true,
      data: paymentInfo,
      paymentInfo: paymentInfo
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin thanh toán:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy thông tin thanh toán'
    });
  }
};

const parseIfString = (val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return val;
    }
  }
  return val;
};

// @desc    Cập nhật cấu hình hệ thống & cổng thanh toán (CMS)
// @route   PUT /api/settings
// @access  Private (Admin)
const updateSettings = async (req, res) => {
  try {
    let { 
      heroBanners, 
      contact, 
      social, 
      footer, 
      bankAccount, 
      momo, 
      storeInfo,
      bankQrImage,
      momoQrImage
    } = req.body;

    heroBanners = parseIfString(heroBanners);
    contact = parseIfString(contact);
    social = parseIfString(social);
    footer = parseIfString(footer);
    bankAccount = parseIfString(bankAccount);
    momo = parseIfString(momo);
    storeInfo = parseIfString(storeInfo);

    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }

    // Xử lý các file ảnh tải lên (Multer)
    if (req.files && req.files.length > 0) {
      // 1. Ảnh QR Ngân hàng (VietQR)
      const bankQrFile = req.files.find(f => f.fieldname === 'bankQrImage' || f.fieldname === 'bankQr');
      if (bankQrFile) {
        setting.bankQrImage = '/uploads/settings/' + bankQrFile.filename;
        if (!setting.bankAccount) setting.bankAccount = {};
        setting.bankAccount.qrImage = setting.bankQrImage;
      }

      // 2. Ảnh QR Ví MoMo
      const momoQrFile = req.files.find(f => f.fieldname === 'momoQrImage' || f.fieldname === 'momoQr');
      if (momoQrFile) {
        setting.momoQrImage = '/uploads/settings/' + momoQrFile.filename;
        if (!setting.momo) setting.momo = {};
        setting.momo.qrImage = setting.momoQrImage;
      }

      // 3. Hero Banners
      if (heroBanners && Array.isArray(heroBanners)) {
        heroBanners.forEach((banner, index) => {
          const file = req.files.find(f => f.fieldname === 'bannerImage_' + index);
          if (file) {
            if (file.path) {
              const rel = path.relative(path.join(__dirname, '../public'), file.path).replace(/\\/g, '/');
              banner.image = rel.startsWith('/') ? rel : '/' + rel;
            } else {
              banner.image = '/uploads/settings/' + file.filename;
            }
          }
        });
      }
    }

    if (bankQrImage && typeof bankQrImage === 'string' && !setting.bankQrImage?.startsWith('/uploads/settings/')) {
      setting.bankQrImage = bankQrImage;
    }
    if (momoQrImage && typeof momoQrImage === 'string' && !setting.momoQrImage?.startsWith('/uploads/settings/')) {
      setting.momoQrImage = momoQrImage;
    }

    if (heroBanners && Array.isArray(heroBanners)) {
      setting.heroBanners = heroBanners;
    }
    if (contact && typeof contact === 'object') {
      setting.contact = { ...setting.contact, ...contact };
    }
    if (social && typeof social === 'object') {
      setting.social = { ...setting.social, ...social };
    }
    if (footer && typeof footer === 'object') {
      setting.footer = { ...setting.footer, ...footer };
    }
    if (bankAccount && typeof bankAccount === 'object') {
      setting.bankAccount = { 
        ...setting.bankAccount, 
        ...bankAccount,
        qrImage: setting.bankQrImage || bankAccount.qrImage || '/images/qr-bank.jpg'
      };
    }
    if (momo && typeof momo === 'object') {
      setting.momo = { 
        ...setting.momo, 
        ...momo,
        qrImage: setting.momoQrImage || momo.qrImage || '/images/qr-momo.jpg'
      };
    }
    if (storeInfo && typeof storeInfo === 'object') {
      setting.storeInfo = { ...setting.storeInfo, ...storeInfo };
    }

    await setting.save();

    const hasPaymentChange = Boolean(bankAccount || momo || req.files?.bankQrImage || req.files?.momoQrImage);
    const hasStoreInfoChange = Boolean(storeInfo || contact || social || footer || heroBanners);

    if (hasPaymentChange) {
      logActivity(req, {
        module: 'SETTINGS',
        action: 'SETTINGS_UPDATE_PAYMENT',
        severity: 'CRITICAL',
        targetId: String(setting._id),
        targetModel: 'Setting',
        targetLabel: 'Tài khoản thanh toán & Mã QR',
        description: `Cập nhật tài khoản thanh toán & mã QR: Ngân hàng [${setting.bankAccount?.bankName || ''} - ${setting.bankAccount?.accountNumber || ''}], MoMo [${setting.momo?.phone || ''}]`,
        diff: [
          { field: 'bankAccount', fieldLabel: 'Ngân hàng thụ hưởng', oldValue: null, newValue: `${setting.bankAccount?.bankName || ''} - ${setting.bankAccount?.accountNumber || ''} (${setting.bankAccount?.accountHolder || ''})` },
          { field: 'momo', fieldLabel: 'Ví MoMo', oldValue: null, newValue: `${setting.momo?.phone || ''} (${setting.momo?.holder || ''})` }
        ]
      });
    }

    if (hasStoreInfoChange || !hasPaymentChange) {
      logActivity(req, {
        module: 'SETTINGS',
        action: 'SETTINGS_STORE_INFO_UPDATE',
        severity: 'WARNING',
        targetId: String(setting._id),
        targetModel: 'Setting',
        targetLabel: 'Thông tin cửa hàng & Nhận diện thương hiệu',
        description: `Cập nhật thông tin nhận diện cửa hàng: ${setting.storeInfo?.name || "Hiệu sách L'amour"} - Hotline: ${setting.storeInfo?.hotline || setting.contact?.phone || 'Mặc định'}`,
        metadata: {
          storeName: setting.storeInfo?.name,
          address: setting.storeInfo?.address,
          hotline: setting.storeInfo?.hotline,
          email: setting.storeInfo?.email
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cấu hình hệ thống và mã QR thanh toán đã được lưu thành công!',
      data: setting
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật cấu hình hệ thống:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật cấu hình hệ thống'
    });
  }
};

module.exports = {
  getSettings,
  getPaymentInfo,
  updateSettings
};
