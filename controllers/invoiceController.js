const Invoice = require('../models/Invoice');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const Coupon = require('../models/Coupon');
const SupplierReturn = require('../models/SupplierReturn');
const StockAdjustment = require('../models/StockAdjustment');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const { updateMultipleShelves } = require('../utils/shelfHelper');
const { logActivity } = require('../utils/auditLogger');
const { sendInvoiceEmailAsync, sendInvoiceEmail } = require('../utils/emailService');
const momoService = require('../services/momoService');

// Helper chuẩn hóa phương thức thanh toán xuyên suốt hệ thống
function normalizePaymentMethod(pm) {
  if (!pm) return 'cash';
  const s = String(pm).trim().toLowerCase();
  if (s === 'momo' || s.includes('momo')) {
    return 'momo';
  }
  if (['transfer', 'banking', 'chuyển khoản', 'chuyen khoan', 'vietqr', 'ck'].includes(s)) {
    return 'transfer';
  }
  if (['pos', 'card', 'thẻ pos', 'the pos', 'atm', 'credit'].includes(s)) {
    return 'pos';
  }
  if (['cash', 'tiền mặt', 'tien mat', 'cod'].includes(s)) {
    return 'cash';
  }
  return 'cash';
}

// Helper chuẩn hóa phương thức hoàn tiền ('cash' hoặc 'transfer')
function normalizeRefundMethod(rm) {
  if (!rm) return 'transfer';
  const s = String(rm).trim().toLowerCase();
  if (['cash', 'tiền mặt', 'tien mat'].includes(s)) {
    return 'cash';
  }
  return 'transfer';
}

// Helper tự động ghi nhận Phiếu Thu (Transaction loại 'income') vào Sổ Quỹ
async function recordOrderIncomeTransaction(invoice, performer = null) {
  try {
    if (!invoice || !invoice._id) return null;

    // Kiểm tra nếu đơn hàng đó chưa có Phiếu Thu:
    const existing = await Transaction.findOne({
      referenceOrder: invoice._id,
      type: { $in: ['income', 'thu'] }
    });
    if (existing) {
      return existing;
    }

    const cleanCode = invoice.invoiceCode || invoice._id.toString().slice(-6).toUpperCase();
    const transCode = `PT-DH-${cleanCode}`;
    const amount = Number(invoice.finalAmount !== undefined ? invoice.finalAmount : invoice.totalAmount) || 0;
    if (amount <= 0) return null;

    const recipient = invoice.customerName || (invoice.shippingAddress && invoice.shippingAddress.fullName) || 'Khách lẻ';
    let pMethod = 'cash';
    if (invoice.paymentMethod === 'transfer' || invoice.paymentMethod === 'Banking') pMethod = 'transfer';
    else if (['momo', 'pos', 'card'].includes(invoice.paymentMethod)) pMethod = invoice.paymentMethod;

    const performerId = performer ? (performer._id || performer) : (invoice.user || null);

    const transaction = await Transaction.create({
      transactionCode: transCode,
      type: 'income',
      amount,
      category: 'Thu tiền bán sách',
      recipient,
      personName: recipient,
      address: invoice.customerAddress || (invoice.shippingAddress && invoice.shippingAddress.address) || 'Tại quầy / Giao hàng',
      paymentMethod: pMethod,
      description: `Thu tiền đơn hàng ${invoice.invoiceCode || invoice._id}`,
      attached: `Hóa đơn ${invoice.invoiceCode || invoice._id}`,
      note: 'Hệ thống tự động ghi nhận doanh thu khi hoàn tất đơn hàng',
      referenceOrder: invoice._id,
      accountantName: (performer && performer.name) ? performer.name : 'Hệ thống tự động',
      cashierName: (performer && performer.name) ? performer.name : 'Thu ngân',
      performedBy: performerId
    });

    return transaction;
  } catch (err) {
    console.error('Lỗi tự động tạo phiếu thu đơn hàng (không ảnh hưởng hóa đơn):', err.message);
    return null;
  }
}

// Helper tự động ghi nhận Phiếu Chi (Transaction loại 'expense') hoàn tiền khách trả hàng
async function recordOrderRefundTransaction(invoice, refundAmount = null, refundMethod = 'transfer', performer = null, note = '') {
  try {
    if (!invoice || !invoice._id) return null;

    const existing = await Transaction.findOne({
      referenceOrder: invoice._id,
      type: { $in: ['expense', 'chi'] },
      category: 'Hoàn tiền trả hàng'
    });
    if (existing) {
      return existing;
    }

    const cleanCode = invoice.invoiceCode || invoice._id.toString().slice(-6).toUpperCase();
    const transCode = `PC-HT-${cleanCode}`;
    const amount = Number(refundAmount !== null && refundAmount !== undefined ? refundAmount : (invoice.finalAmount || invoice.totalAmount)) || 0;
    if (amount <= 0) return null;

    const recipient = invoice.customerName || 'Khách hàng hoàn trả';
    const performerId = performer ? (performer._id || performer) : (invoice.user || null);
    const staffName = (performer && performer.name) ? performer.name : 'Nhân viên';

    const transaction = await Transaction.create({
      transactionCode: transCode,
      type: 'expense',
      amount,
      category: 'Hoàn tiền trả hàng',
      recipient,
      personName: recipient,
      address: invoice.customerAddress || '',
      paymentMethod: refundMethod === 'cash' ? 'cash' : 'transfer',
      description: `Hoàn tiền đơn hàng ${invoice.invoiceCode || invoice._id} do trả hàng`,
      attached: `Hóa đơn ${invoice.invoiceCode || invoice._id}`,
      note: note || `Chi hoàn tiền trả hàng. Nhân viên phụ trách: ${staffName}`,
      referenceOrder: invoice._id,
      accountantName: staffName,
      cashierName: staffName,
      performedBy: performerId
    });

    return transaction;
  } catch (err) {
    console.error('Lỗi tự động tạo phiếu chi hoàn tiền:', err.message);
    return null;
  }
}

// @desc    Tạo hóa đơn mới từ quầy POS và trừ tồn kho sách
// @route   POST /api/invoices
// @access  Private (Admin, Staff)
const createInvoice = async (req, res) => {
  try {
    const {
      invoiceCode,
      user,
      userId,
      customerName,
      customerPhone,
      customerAddress,
      customerEmail,
      paymentMethod,
      totalAmount,
      discount,
      couponCode,
      finalAmount,
      items,
      status,
      paymentStatus,
      paymentNote
    } = req.body;

    if (customerPhone && customerPhone.trim()) {
      const phoneRegex = /^0[0-9]{8,9}$/;
      if (!phoneRegex.test(customerPhone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
        });
      }
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hóa đơn phải chứa ít nhất 1 sản phẩm'
      });
    }

    // 1. Kiểm tra tồn kho và trạng thái của tất cả các cuốn sách trước khi thực hiện
    for (const item of items) {
      const book = await Book.findById(item.book);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy cuốn sách trong kho với ID: ${item.book}`
        });
      }
      if (book.isDeleted || book.status === 'hidden') {
        return res.status(400).json({
          success: false,
          message: `Sách "${book.title}" đã ngừng kinh doanh hoặc bị ẩn, không thể tạo đơn hàng mới.`
        });
      }
      if (book.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sách "${book.title}" chỉ còn ${book.stock} cuốn trong kho, không đủ bán ${item.quantity} cuốn.`
        });
      }
    }

    // 2. Trừ tồn kho từng cuốn sách bằng toán tử nguyên tử $inc & lưu giá vốn costPrice
    const processedItems = [];
    const affectedShelfIds = [];
    for (const item of items) {
      const updatedBook = await Book.findOneAndUpdate(
        { _id: item.book, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!updatedBook) {
        return res.status(400).json({
          success: false,
          message: `Không đủ tồn kho để trừ cho sách ID: ${item.book}`
        });
      }

      if (updatedBook.shelf) {
        affectedShelfIds.push(updatedBook.shelf);
      }

      const itemPrice = Number(item.price !== undefined ? item.price : updatedBook.price);
      let itemCostPrice = Number(item.costPrice);
      if (!itemCostPrice || itemCostPrice <= 0 || itemCostPrice >= itemPrice) {
        itemCostPrice = (updatedBook.costPrice && updatedBook.costPrice > 0 && updatedBook.costPrice < itemPrice)
          ? updatedBook.costPrice
          : Math.round(itemPrice * 0.65);
      }

      processedItems.push({
        book: updatedBook._id,
        quantity: item.quantity,
        price: itemPrice,
        costPrice: itemCostPrice
      });
    }

    // 3. Xử lý mã giảm giá (nếu có)
    let appliedCoupon = null;
    let computedDiscount = Number(discount) || 0;
    const calcSubtotal = Number(totalAmount) || processedItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const cp = await Coupon.findOne({ code: cleanCode });
      if (cp) {
        const val = cp.checkValidity(calcSubtotal);
        if (val.valid) {
          appliedCoupon = cp;
          computedDiscount = val.discountAmount;
          // Giảm 1 lượt sử dụng của mã
          await Coupon.findByIdAndUpdate(cp._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    const calculatedFinal = Math.max(0, calcSubtotal - computedDiscount);

    // 4. Tạo hóa đơn mới trong Database (Tại quầy POS đơn hàng hoàn thành và đã thanh toán đủ 100%)
    let linkedUserId = user || userId || null;
    if (!linkedUserId && customerPhone && customerPhone.trim()) {
      const foundUser = await User.findOne({ phone: customerPhone.trim() });
      if (foundUser) linkedUserId = foundUser._id;
    }

    const code = invoiceCode || `HD-POS-${Date.now().toString().slice(-6)}`;
    const invoiceStatus = (status === 'paid' || !status) ? 'completed' : status;
    const invoicePayStatus = paymentStatus || (['completed', 'paid'].includes(invoiceStatus) ? 'paid' : 'unpaid');

    const normPaymentMethod = normalizePaymentMethod(paymentMethod);
    const invoice = await Invoice.create({
      invoiceCode: code,
      user: linkedUserId,
      customerName: customerName || 'Khách lẻ',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerEmail: (customerEmail && typeof customerEmail === 'string') ? customerEmail.trim().toLowerCase() : '',
      orderType: 'offline',
      paymentMethod: normPaymentMethod,
      totalAmount: calcSubtotal,
      discount: computedDiscount,
      coupon: appliedCoupon ? appliedCoupon._id : null,
      couponCode: appliedCoupon ? appliedCoupon.code : (couponCode ? couponCode.trim().toUpperCase() : ''),
      couponDiscount: appliedCoupon ? computedDiscount : 0,
      finalAmount: calculatedFinal,
      items: processedItems,
      status: invoiceStatus,
      paymentStatus: invoicePayStatus,
      paymentNote: paymentNote || (normPaymentMethod === 'transfer' ? 'Thanh toán chuyển khoản VietQR tại quầy' : (normPaymentMethod === 'pos' ? 'Thanh toán thẻ POS tại quầy' : 'Thanh toán tiền mặt tại quầy'))
    });

    // Tự động ghi nhận Phiếu Thu (Transaction loại 'income') vào sổ quỹ kế toán khi bán hàng tại POS
    if (['completed', 'paid'].includes(invoiceStatus)) {
      await recordOrderIncomeTransaction(invoice, req.user);
    }

    // Cập nhật và giải phóng sức chứa cho các kệ sách tương ứng
    await updateMultipleShelves(affectedShelfIds);

    // Tự động gửi email hóa đơn cho khách nếu có cung cấp email
    if (invoice.customerEmail) {
      sendInvoiceEmailAsync(invoice._id);
    }

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_CREATE_POS',
      severity: 'INFO',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn POS #${invoice.invoiceCode}`,
      description: `Tạo đơn bán hàng tại quầy #${invoice.invoiceCode} (${invoice.items.length} đầu sách, ${invoice.items.reduce((s, it) => s + (it.quantity || 1), 0)} cuốn, ${Number(invoice.finalAmount || invoice.totalAmount || 0).toLocaleString('vi-VN')} đ qua ${invoice.paymentMethod === 'transfer' ? 'Chuyển khoản VietQR' : (invoice.paymentMethod === 'pos' ? 'Thẻ POS' : 'Tiền mặt')})`,
      metadata: {
        orderType: 'offline',
        totalAmount: invoice.totalAmount,
        discount: invoice.discount,
        finalAmount: invoice.finalAmount,
        paymentMethod: invoice.paymentMethod,
        customerName: invoice.customerName
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tạo hóa đơn và trừ tồn kho thành công',
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi tạo hóa đơn'
    });
  }
};

// @desc    Lấy tất cả hóa đơn (Admin & Staff)
// @route   GET /api/invoices
// @access  Private (Admin, Staff)
const getAllInvoices = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || (req.query.all === 'true' ? 1000 : 500);
    const invoices = await Invoice.find()
      .select('invoiceCode customerName customerPhone customerAddress orderType paymentMethod paymentStatus status returnRequest totalAmount finalAmount createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi lấy danh sách hóa đơn'
    });
  }
};

// @desc    Lấy hóa đơn của cá nhân User đang đăng nhập
// @route   GET /api/invoices/my-invoices
// @access  Private (User, Staff, Admin)
const getMyInvoices = async (req, res) => {
  try {
    // Tìm theo số điện thoại hoặc tên người dùng đang đăng nhập
    const userPhone = req.user.phone || '';
    const userName = req.user.name || '';

    const invoices = await Invoice.find({
      $or: [
        { user: req.user._id },
        ...(userPhone ? [{ customerPhone: userPhone }] : []),
        ...(userName ? [{ customerName: userName }] : [])
      ]
    })
      .populate('items.book', 'title bookCode price category author coverImage')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi lấy hóa đơn của tôi'
    });
  }
};

// @desc    Tạo hóa đơn mua hàng online từ khách hàng (User/Guest)
// @route   POST /api/invoices/online-checkout
// @access  Public
const createOnlineInvoice = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      customerEmail,
      orderNote,
      paymentMethod,
      paymentProof,
      couponCode,
      items,
      totalAmount,
      finalAmount
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng phải chứa ít nhất 1 sản phẩm'
      });
    }

    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin Họ tên, Số điện thoại và Địa chỉ nhận hàng'
      });
    }

    const phoneRegex = /^0[0-9]{8,9}$/;
    if (!phoneRegex.test(customerPhone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
      });
    }

    // 1. Kiểm tra tồn kho và trạng thái của tất cả các cuốn sách trước khi thực hiện
    for (const item of items) {
      const bookId = item.book || item.id || item._id;
      const quantity = Number(item.quantity || item.qty || 1);

      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy cuốn sách trong kho với ID: ${bookId}`
        });
      }
      if (book.isDeleted || book.status === 'hidden') {
        return res.status(400).json({
          success: false,
          message: `Sách "${book.title}" đã tạm ngừng kinh doanh hoặc bị ẩn, không thể đặt mua.`
        });
      }
      if (book.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Sách "${book.title}" chỉ còn ${book.stock} cuốn trong kho, không đủ bán ${quantity} cuốn.`
        });
      }
    }

    // 2. Trừ tồn kho từng cuốn sách bằng toán tử nguyên tử $inc
    const processedItems = [];
    const onlineAffectedShelves = [];
    for (const item of items) {
      const bookId = item.book || item.id || item._id;
      const quantity = Number(item.quantity || item.qty || 1);

      const updatedBook = await Book.findOneAndUpdate(
        { _id: bookId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updatedBook) {
        return res.status(400).json({
          success: false,
          message: `Không đủ số lượng tồn kho cho sách ID: ${bookId}`
        });
      }

      if (updatedBook.shelf) {
        onlineAffectedShelves.push(updatedBook.shelf);
      }

      const itemPrice = Number(item.price || updatedBook.price);
      let itemCostPrice = Number(item.costPrice);
      if (!itemCostPrice || itemCostPrice <= 0 || itemCostPrice >= itemPrice) {
        itemCostPrice = (updatedBook.costPrice && updatedBook.costPrice > 0 && updatedBook.costPrice < itemPrice)
          ? updatedBook.costPrice
          : Math.round(itemPrice * 0.65);
      }

      processedItems.push({
        book: updatedBook._id,
        quantity: quantity,
        price: itemPrice,
        costPrice: itemCostPrice
      });
    }

    // 3. Chuẩn hóa phương thức thanh toán & tính toán giảm giá voucher
    const calculatedTotal = totalAmount || processedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    let appliedCoupon = null;
    let computedDiscount = 0;
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const cp = await Coupon.findOne({ code: cleanCode });
      if (cp) {
        const val = cp.checkValidity(calculatedTotal);
        if (val.valid) {
          appliedCoupon = cp;
          computedDiscount = val.discountAmount;
          // Giảm 1 lượt sử dụng của mã
          await Coupon.findByIdAndUpdate(cp._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    const calculatedFinal = Math.max(0, calculatedTotal - computedDiscount);

    const payMethod = normalizePaymentMethod(paymentMethod);
    const isMomo = (paymentMethod === 'MoMo' || paymentMethod === 'momo' || payMethod === 'momo');
    const isBanking = (paymentMethod === 'Banking' || paymentMethod === 'transfer' || payMethod === 'transfer');
    
    let finalPayMethod = 'cash';
    let isPaidCustomer = false;
    let payStatus = 'unpaid';
    let paymentNoteText = orderNote || '';

    if (isMomo) {
      finalPayMethod = 'momo';
      // Ban đầu luôn là "Chưa chuyển" (unpaid), web tự động chuyển sang "Đã chuyển" (paid) ngay khi nhận Webhook/IPN
      payStatus = 'unpaid';
      isPaidCustomer = false;
      paymentNoteText = 'Đang chờ khách thanh toán qua cổng MoMo...';
    } else if (isBanking) {
      finalPayMethod = 'transfer';
      isPaidCustomer = Boolean(paymentProof);
      payStatus = paymentProof ? 'pending_verification' : 'unpaid';
      paymentNoteText = paymentProof 
        ? 'Khách đã gửi xác nhận chuyển khoản QR kèm bill thanh toán - Chờ đối soát tiền về'
        : 'Khách đã gửi xác nhận chuyển khoản QR - Chờ đối soát tiền về';
    } else if (payMethod === 'pos') {
      finalPayMethod = 'pos';
      payStatus = 'unpaid';
    }

    const initialStatus = 'pending_confirmation';

    // 4. Tạo hóa đơn mới trong Database với status: 'pending_confirmation'
    const code = `HD-OL-${Math.floor(100000 + Math.random() * 900000)}`;

    // Khởi tạo giao dịch MoMo trước nếu khách chọn MoMo
    let momoPaymentData = null;
    if (isMomo) {
      try {
        const momoRes = await momoService.createMomoPayment({
          orderId: code,
          amount: calculatedFinal,
          orderInfo: `Thanh toan don hang ${code} - Lamour Bookstore`
        });
        if (momoRes && momoRes.data) {
          momoPaymentData = momoRes.data;
        }
      } catch (momoErr) {
        console.warn('Lỗi gọi MoMo createPayment ban đầu:', momoErr.message);
      }
    }

    // Xác định email nhận hóa đơn: ưu tiên email khách nhập -> fallback email tài khoản đăng nhập
    const resolvedCustomerEmail = (customerEmail && typeof customerEmail === 'string' && customerEmail.trim())
      ? customerEmail.trim().toLowerCase()
      : ((req.user && req.user.email) ? req.user.email.toLowerCase() : '');

    const invoice = await Invoice.create({
      invoiceCode: code,
      user: req.user ? req.user._id : null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      customerEmail: resolvedCustomerEmail,
      orderType: 'online',
      paymentMethod: finalPayMethod,
      isPaidByCustomer: isPaidCustomer,
      paymentProof: (paymentProof && typeof paymentProof === 'string') ? paymentProof.trim() : '',
      paymentStatus: payStatus,
      paymentNote: paymentNoteText,
      momoTransaction: momoPaymentData ? {
        partnerCode: momoPaymentData.partnerCode || '',
        orderId: code,
        requestId: momoPaymentData.requestId || '',
        amount: calculatedFinal,
        transId: '',
        resultCode: momoPaymentData.resultCode ?? -1,
        message: momoPaymentData.message || 'Khởi tạo MoMo',
        payType: 'qr',
        responseTime: Date.now(),
        orderInfo: `Thanh toan don hang ${code} - Lamour Bookstore`,
        payUrl: momoPaymentData.payUrl || momoPaymentData.shortLink || '',
        qrCodeUrl: momoPaymentData.qrCodeUrl || '',
        deeplink: momoPaymentData.deeplink || '',
        paidAt: null,
        autoVerified: false
      } : null,
      totalAmount: calculatedTotal,
      discount: computedDiscount,
      coupon: appliedCoupon ? appliedCoupon._id : null,
      couponCode: appliedCoupon ? appliedCoupon.code : (couponCode ? couponCode.trim().toUpperCase() : ''),
      couponDiscount: computedDiscount,
      finalAmount: calculatedFinal,
      items: processedItems,
      status: initialStatus
    });

    // Cập nhật và giải phóng sức chứa cho các kệ sách tương ứng
    await updateMultipleShelves(onlineAffectedShelves);

    // Tự động gửi email xác nhận đặt hàng & hóa đơn điện tử cho khách (chạy ngầm không chặn response)
    if (invoice.customerEmail) {
      sendInvoiceEmailAsync(invoice._id);
    }

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_CREATE_ONLINE',
      severity: 'INFO',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn Online #${invoice.invoiceCode}`,
      description: `Khách hàng đặt đơn online #${invoice.invoiceCode} (${invoice.customerName} - ${invoice.customerPhone}, ${Number(invoice.finalAmount || invoice.totalAmount || 0).toLocaleString('vi-VN')} đ, PT: ${invoice.paymentMethod === 'transfer' ? 'Chuyển khoản VietQR' : (invoice.paymentMethod === 'pos' ? 'Thẻ/Ví' : 'COD')})`,
      metadata: {
        orderType: 'online',
        totalAmount: invoice.totalAmount,
        discount: invoice.discount,
        finalAmount: invoice.finalAmount,
        paymentMethod: invoice.paymentMethod,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone
      }
    });

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công và đã khởi tạo hóa đơn',
      data: invoice,
      momoPayment: momoPaymentData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi tạo hóa đơn online'
    });
  }
};

// @desc    Cập nhật trạng thái hóa đơn (Admin, Accountant)
// @route   PUT /api/invoices/:id/status
// @access  Private (Admin, Accountant)
const updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = [
      'pending_confirmation',
      'pending_payment',
      'delivering',
      'processing',
      'shipping',
      'completed',
      'paid',
      'cancelled',
      'returned',
      'unpaid',
      'overdue'
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái hóa đơn không hợp lệ'
      });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn'
      });
    }

    const prevStatus = invoice.status;
    let targetStatus = status;
    if (status === 'paid') targetStatus = 'completed';
    else if (status === 'processing') targetStatus = 'delivering';
    else if (['unpaid', 'overdue'].includes(status)) targetStatus = 'pending_payment';

    invoice.status = targetStatus;
    if (['paid', 'completed'].includes(status)) {
      invoice.paymentStatus = 'paid';
    }
    await invoice.save();

    // Tự động hoàn trả lại tồn kho nếu đơn hàng chuyển sang trạng thái hủy (cancelled)
    if (targetStatus === 'cancelled' && prevStatus !== 'cancelled') {
      if (invoice.items && invoice.items.length > 0) {
        const cancelledShelves = [];
        for (const item of invoice.items) {
          if (item.book) {
            const restoredBook = await Book.findByIdAndUpdate(item.book, { $inc: { stock: Number(item.quantity || 1) } }, { new: true });
            if (restoredBook && restoredBook.shelf) {
              cancelledShelves.push(restoredBook.shelf);
            }
          }
        }
        await updateMultipleShelves(cancelledShelves);
      }
      // Hoàn lại 1 lượt sử dụng mã giảm giá
      if (invoice.coupon) {
        await Coupon.findOneAndUpdate(
          { _id: invoice.coupon, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      }
    }

    // TỰ ĐỘNG tạo 1 Transaction (Phiếu Thu) khi chuyển sang 'paid' hoặc 'completed'
    if (['paid', 'completed'].includes(status) || ['paid', 'completed'].includes(targetStatus)) {
      await recordOrderIncomeTransaction(invoice, req.user);
    }

    logActivity(req, {
      module: 'ORDERS',
      action: targetStatus === 'cancelled' ? 'INVOICE_CANCEL' : 'INVOICE_STATUS_CHANGE',
      severity: targetStatus === 'cancelled' ? 'WARNING' : 'INFO',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${invoice.invoiceCode}`,
      description: `Cập nhật trạng thái đơn #${invoice.invoiceCode} từ [${prevStatus}] sang [${targetStatus}] (${Number(invoice.finalAmount || invoice.totalAmount || 0).toLocaleString('vi-VN')} đ)`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái đơn', oldValue: prevStatus, newValue: targetStatus }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái hóa đơn thành ${status}`,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi cập nhật trạng thái hóa đơn'
    });
  }
};

// @desc    Lấy danh sách đơn mua của User với lọc theo trạng thái và tìm kiếm
// @route   GET /api/user/orders
// @access  Private
const getUserOrders = async (req, res) => {
  try {
    const { status, q } = req.query;
    const userPhone = req.user.phone || '';
    const userName = req.user.name || '';

    // Điều kiện lọc người dùng
    let filter = {
      $or: [
        { user: req.user._id },
        ...(userPhone ? [{ customerPhone: userPhone }] : []),
        ...(userName ? [{ customerName: userName }] : [])
      ]
    };

    // Lọc theo trạng thái chuẩn Shopee
    if (status && status !== 'all') {
      const st = status.toLowerCase();
      if (st === 'pending_payment' || st === 'pending_confirmation') {
        filter.status = { $in: ['pending_confirmation', 'pending_payment', 'unpaid', 'pending'] };
      } else if (st === 'shipping') {
        filter.status = { $in: ['shipping'] };
      } else if (st === 'delivering') {
        filter.status = { $in: ['delivering', 'processing'] };
      } else if (st === 'completed') {
        filter.status = { $in: ['completed', 'paid'] };
      } else if (st === 'cancelled') {
        filter.status = { $in: ['cancelled', 'overdue'] };
      } else if (st === 'returned') {
        filter.status = { $in: ['returned'] };
      } else {
        filter.status = st;
      }
    }

    // Tìm kiếm theo mã đơn hoặc tên sách
    if (q && q.trim()) {
      const cleanQ = q.trim();
      const escapedQ = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.invoiceCode = new RegExp(escapedQ, 'i');
    }

    let invoices = await Invoice.find(filter)
      .populate('items.book', 'title bookCode price category author coverImage')
      .sort({ createdAt: -1 });

    // Nếu tìm kiếm theo tên sách mà mã đơn không khớp, tìm tiếp qua title của book
    if (q && q.trim() && invoices.length === 0) {
      delete filter.invoiceCode;
      const allMyInvoices = await Invoice.find(filter)
        .populate('items.book', 'title bookCode price category author coverImage')
        .sort({ createdAt: -1 });

      const lowerQ = q.trim().toLowerCase();
      invoices = allMyInvoices.filter(inv => {
        return (
          (inv.invoiceCode && inv.invoiceCode.toLowerCase().includes(lowerQ)) ||
          inv.items.some(it => it.book && it.book.title && it.book.title.toLowerCase().includes(lowerQ))
        );
      });
    }

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đơn mua:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy đơn mua của bạn'
    });
  }
};

// @desc    Người dùng hủy đơn hàng
// @route   PUT /api/user/orders/:id/cancel
// @access  Private
const cancelUserOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userPhone = req.user.phone || '';
    const userName = req.user.name || '';

    const invoice = await Invoice.findOne({
      _id: id,
      $or: [
        { user: req.user._id },
        ...(userPhone ? [{ customerPhone: userPhone }] : []),
        ...(userName ? [{ customerName: userName }] : [])
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng cần hủy'
      });
    }

    // Chặn hủy đơn nếu đơn đang ở trạng thái 'delivering' hoặc 'shipping'
    if (['delivering', 'shipping', 'processing'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã được duyệt/đang vận chuyển, không thể hủy đơn!'
      });
    }

    // Chặn nếu đơn đã hoàn tất, đã hủy hoặc đã gửi yêu cầu trả hàng
    if (['completed', 'paid', 'returned', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng không ở trạng thái có thể hủy!'
      });
    }

    invoice.status = 'cancelled';
    await invoice.save();

    // Tự động hoàn lại tồn kho khi khách hàng hủy đơn
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        if (item.book) {
          await Book.findByIdAndUpdate(item.book, { $inc: { stock: Number(item.quantity || 1) } });
        }
      }
    }
    // Hoàn lại 1 lượt sử dụng mã giảm giá khi khách hủy đơn
    if (invoice.coupon) {
      await Coupon.findOneAndUpdate(
        { _id: invoice.coupon, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      );
    }

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_CANCEL_USER',
      severity: 'WARNING',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${invoice.invoiceCode}`,
      description: `Hủy đơn hàng #${invoice.invoiceCode} (${Number(invoice.finalAmount || invoice.totalAmount || 0).toLocaleString('vi-VN')} đ). Đã hoàn lại tồn kho cho ${invoice.items?.length || 0} sản phẩm.`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái đơn hàng', oldValue: 'pending', newValue: 'cancelled' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Hủy đơn hàng thành công!',
      data: invoice
    });
  } catch (error) {
    console.error('Lỗi khi hủy đơn hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi hủy đơn hàng'
    });
  }
};

// @desc    Người dùng xác nhận thanh toán cho đơn hàng
// @route   PUT /api/user/orders/:id/pay
// @access  Private
const payUserOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentNote, paymentProof } = req.body;
    const userPhone = req.user.phone || '';
    const userName = req.user.name || '';

    const invoice = await Invoice.findOne({
      _id: id,
      $or: [
        { user: req.user._id },
        ...(userPhone ? [{ customerPhone: userPhone }] : []),
        ...(userName ? [{ customerName: userName }] : [])
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng cần thanh toán'
      });
    }

    if (!['pending_payment', 'unpaid'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng này không ở trạng thái chờ thanh toán'
      });
    }

    const normPay = normalizePaymentMethod(paymentMethod || invoice.paymentMethod);
    invoice.paymentMethod = normPay;
    const payLabel = normPay === 'transfer' ? 'Chuyển khoản VietQR' : (normPay === 'pos' ? 'Thẻ POS / Ví điện tử' : 'Tiền mặt khi nhận hàng (COD)');
    invoice.paymentNote = paymentNote || `Khách đã xác nhận thanh toán (${payLabel}) lúc ${new Date().toLocaleString('vi-VN')}`;
    invoice.paymentStatus = 'pending_verification';

    if (paymentProof) {
      invoice.paymentProof = paymentProof;
    }

    // Nếu chọn Tiền mặt khi nhận hàng (COD), đơn hàng chuyển sang chuẩn bị giao hàng luôn
    if (normPay === 'cash') {
      invoice.paymentNote = 'Thanh toán tiền mặt khi nhận hàng (COD)';
      invoice.status = 'delivering';
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Đã ghi nhận thanh toán! Đơn hàng đang chờ nhân viên kiểm tra và duyệt.',
      data: invoice
    });
  } catch (error) {
    console.error('Lỗi khi xác nhận thanh toán đơn hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xác nhận thanh toán đơn hàng'
    });
  }
};

// @desc    Nhân viên (Staff/Admin/Accountant) duyệt thanh toán đơn hàng
// @route   PUT /api/orders/:id/verify-payment (hoặc /api/invoices/:id/verify-payment)
// @access  Private (Staff, Admin, Accountant)
const verifyPaymentOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng cần duyệt thanh toán'
      });
    }

    const prevStatus = invoice.status;
    invoice.status = 'delivering'; // Chuyển chính thức sang Chờ giao hàng
    invoice.paymentStatus = 'paid';
    invoice.paymentNote = (invoice.paymentNote ? invoice.paymentNote + ' | ' : '') + `Nhân viên ${req.user ? req.user.name : ''} đã duyệt thanh toán lúc ${new Date().toLocaleString('vi-VN')}`;
    await invoice.save();

    // Tự động tạo Transaction phiếu thu nếu trước đó chưa chốt
    if (['pending_confirmation', 'pending_payment', 'unpaid'].includes(prevStatus)) {
      const transCode = "PT-HD-" + Date.now().toString().slice(-6);
      let payMethodDisplay = 'Chuyển khoản banking';
      if (invoice.paymentMethod === 'card' || invoice.paymentMethod === 'MoMo') {
        payMethodDisplay = 'Ví điện tử MoMo / Thẻ';
      } else if (invoice.paymentMethod === 'cash' || invoice.paymentMethod === 'COD') {
        payMethodDisplay = 'Tiền mặt';
      }

      await Transaction.create({
        transactionCode: transCode,
        type: 'thu',
        amount: invoice.finalAmount || invoice.totalAmount || 0,
        description: "Thu tiền đơn hàng Online mã " + invoice.invoiceCode,
        personName: invoice.customerName || 'Khách online',
        address: invoice.customerAddress || '',
        paymentMethod: payMethodDisplay,
        attached: "Hóa đơn " + invoice.invoiceCode,
        note: "Nhân viên duyệt thanh toán đơn hàng chuyển khoản",
        accountantName: req.user ? req.user.name : "Nhân viên",
        performedBy: req.user ? req.user._id : null
      });
    }

    // Gửi email hóa đơn / xác nhận thanh toán thành công cho khách hàng
    if (invoice.customerEmail || invoice.user) {
      sendInvoiceEmailAsync(invoice._id);
    }

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_PAY_VERIFY',
      severity: 'WARNING',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${invoice.invoiceCode}`,
      description: `Nhân viên ${req.user ? req.user.name : ''} đã duyệt xác nhận thanh toán đơn hàng #${invoice.invoiceCode} (${Number(invoice.finalAmount || invoice.totalAmount || 0).toLocaleString('vi-VN')} đ) -> Chuyển sang chờ giao hàng`,
      diff: [
        { field: 'paymentStatus', fieldLabel: 'Trạng thái thanh toán', oldValue: 'unpaid', newValue: 'paid' },
        { field: 'status', fieldLabel: 'Trạng thái đơn hàng', oldValue: prevStatus, newValue: 'delivering' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Duyệt thanh toán thành công! Đơn hàng đã chuyển sang trạng thái "Chờ giao hàng".',
      data: invoice
    });
  } catch (error) {
    console.error('Lỗi khi duyệt thanh toán đơn hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi duyệt thanh toán'
    });
  }
};

// @desc    Người dùng gửi yêu cầu trả hàng / hoàn tiền (Bước 1)
// @route   POST /api/user/orders/:id/return-request (hoặc /api/orders/:id/return-request)
// @access  Private
const returnUserOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, refundMethod, bankInfo, refundBank, refundAccount, refundHolder, note } = req.body;
    const userPhone = req.user.phone || '';
    const userName = req.user.name || '';

    const invoice = await Invoice.findOne({
      _id: id,
      $or: [
        { user: req.user._id },
        ...(userPhone ? [{ customerPhone: userPhone }] : []),
        ...(userName ? [{ customerName: userName }] : [])
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng cần yêu cầu trả hàng/hoàn tiền'
      });
    }

    if (!['completed', 'paid'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ đơn hàng đã hoàn thành mới có thể gửi yêu cầu trả hàng / hoàn tiền!'
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp lý do yêu cầu trả hàng / hoàn tiền'
      });
    }

    const normRefund = normalizeRefundMethod(refundMethod || (refundBank ? 'transfer' : 'cash'));
    const finalBankInfo = {
      bankName: (bankInfo && bankInfo.bankName) || refundBank || '',
      accountNumber: (bankInfo && bankInfo.accountNumber) || refundAccount || '',
      accountHolder: (bankInfo && bankInfo.accountHolder) || refundHolder || ''
    };

    if (normRefund === 'transfer' && (!finalBankInfo.bankName || !finalBankInfo.accountNumber || !finalBankInfo.accountHolder)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin tài khoản ngân hàng để nhận tiền hoàn (Tên ngân hàng, Số tài khoản, Chủ tài khoản)'
      });
    }

    const fullReason = reason.trim() + (note && note.trim() ? `: ${note.trim()}` : '');

    invoice.status = 'returned';
    invoice.returnReason = fullReason;
    invoice.returnRefundInfo = finalBankInfo;
    invoice.returnRequestedAt = new Date();

    invoice.returnRequest = {
      reason: fullReason,
      refundMethod: normRefund,
      bankInfo: finalBankInfo,
      requestedAt: new Date(),
      receivedAt: null,
      inspectedAt: null,
      inspectionNote: '',
      status: 'requested'
    };

    const methodNote = normRefund === 'transfer' ? 'Chuyển khoản banking' : 'Tiền mặt tại quầy';
    invoice.paymentNote = (invoice.paymentNote ? invoice.paymentNote + ' | ' : '') + `[${new Date().toLocaleDateString('vi-VN')}]: Khách yêu cầu trả hàng (${methodNote})`;

    await invoice.save();

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_RETURN_REQUEST',
      severity: 'WARNING',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${invoice.invoiceCode}`,
      description: `Khách hàng gửi yêu cầu trả hàng/hoàn tiền đơn #${invoice.invoiceCode} (Lý do: ${fullReason}, Hoàn qua: ${methodNote})`,
      metadata: {
        reason: fullReason,
        refundMethod: normRefund,
        bankInfo: finalBankInfo
      }
    });

    const populatedOrder = await Invoice.findById(invoice._id)
      .populate('user', 'name email phone avatar addresses bankAccounts')
      .populate('items.book', 'title bookCode price category author coverImage stock');

    res.status(200).json({
      success: true,
      message: 'Gửi yêu cầu trả hàng / hoàn tiền thành công! Đơn hàng đã chuyển sang tab Trả hàng/Hoàn tiền để nhân viên tiếp nhận.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('Lỗi khi gửi yêu cầu trả hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi gửi yêu cầu trả hàng'
    });
  }
};

// @desc    Nhân viên tiếp nhận yêu cầu trả hàng & điều phối thu hồi (Bước 2)
// @route   PUT /api/orders/:id/return-receive
// @access  Private (Staff, Admin, Accountant)
const receiveReturnOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (invoice.status !== 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng này không nằm trong danh sách trả hàng / hoàn tiền'
      });
    }

    if (!invoice.returnRequest || !invoice.returnRequest.status) {
      invoice.returnRequest = {
        reason: invoice.returnReason || '',
        refundMethod: (invoice.returnRefundInfo && invoice.returnRefundInfo.accountNumber) ? 'transfer' : 'cash',
        bankInfo: invoice.returnRefundInfo || {},
        requestedAt: invoice.returnRequestedAt || new Date(),
        status: 'requested'
      };
    }

    invoice.returnRequest.status = 'shipping_back';
    invoice.returnRequest.receivedAt = new Date();
    const staffName = req.user ? req.user.name : 'Nhân viên';
    invoice.paymentNote = (invoice.paymentNote ? invoice.paymentNote + ' | ' : '') + `[${new Date().toLocaleDateString('vi-VN')}]: ${staffName} tiếp nhận yêu cầu & điều phối thu hồi hàng`;

    await invoice.save();

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_RETURN_RECEIVE',
      severity: 'INFO',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${invoice.invoiceCode}`,
      description: `Nhân viên ${staffName} tiếp nhận kiện hàng hoàn trả của đơn #${invoice.invoiceCode} -> Chuyển sang chờ kiểm định`,
      diff: [
        { field: 'returnRequest.status', fieldLabel: 'Trạng thái đổi trả', oldValue: 'requested', newValue: 'shipping_back' }
      ]
    });

    const populatedOrder = await Invoice.findById(invoice._id)
      .populate('user', 'name email phone avatar addresses bankAccounts')
      .populate('items.book', 'title bookCode price category author coverImage stock');

    res.status(200).json({
      success: true,
      message: 'Tiếp nhận yêu cầu thành công! Đơn vị vận chuyển đang đến lấy sách hoàn trả về tiệm.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('Lỗi khi tiếp nhận yêu cầu trả hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tiếp nhận yêu cầu trả hàng'
    });
  }
};

// @desc    Nhân viên kiểm tra sách đạt chuẩn & thực hiện hoàn tiền (Bước 3 - Thành công)
// @route   PUT /api/orders/:id/return-inspect-approve
// @access  Private (Staff, Admin, Accountant)
const inspectApproveReturnOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { inspectionNote } = req.body;
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (invoice.status !== 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng này không ở trạng thái hoàn trả'
      });
    }

    if (!invoice.returnRequest) {
      invoice.returnRequest = {
        reason: invoice.returnReason || '',
        refundMethod: (invoice.returnRefundInfo && invoice.returnRefundInfo.accountNumber) ? 'transfer' : 'cash',
        bankInfo: invoice.returnRefundInfo || {},
        requestedAt: invoice.returnRequestedAt || new Date(),
        status: 'shipping_back'
      };
    }

    const staffName = req.user ? req.user.name : 'Nhân viên';

    // 1. Cập nhật returnRequest: Đã duyệt hoàn tiền cho khách & chuyển kiện hàng sang Kho kiểm định
    invoice.returnRequest.status = 'approved_transferred_to_warehouse';
    invoice.returnRequest.inspectedAt = new Date();
    invoice.returnRequest.transferredToWarehouseAt = new Date();
    invoice.returnRequest.inspectionNote = inspectionNote || 'Nhân viên kiểm tra tiếp nhận sách hoàn, duyệt hoàn tiền cho khách và bàn giao kiện hàng sang bộ phận Kho kiểm định phân loại.';
    invoice.paymentNote = (invoice.paymentNote ? invoice.paymentNote + ' | ' : '') + `[${new Date().toLocaleDateString('vi-VN')}]: ${staffName} duyệt hoàn tiền cho khách và chuyển kiện hàng sang bộ phận Kho phân loại`;

    // 3. Hoàn lại 1 lượt sử dụng mã giảm giá khi trả hàng thành công
    if (invoice.coupon) {
      await Coupon.findOneAndUpdate(
        { _id: invoice.coupon, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      );
    }

    // 4. Tự động tạo Phiếu Chi (Transaction loại 'expense') để hoàn tiền cho khách
    const refundAmount = invoice.finalAmount || invoice.totalAmount || 0;
    await recordOrderRefundTransaction(
      invoice,
      refundAmount,
      invoice.returnRequest.refundMethod || 'transfer',
      req.user,
      `Hoàn tiền trả hàng. Ghi chú kiểm tra: ${invoice.returnRequest.inspectionNote || ''}`
    );

    await invoice.save();

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_RETURN_INSPECT_APPROVE',
      severity: 'CRITICAL',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${invoice.invoiceCode}`,
      description: `Nhân viên ${staffName} kiểm tra đạt chuẩn & duyệt hoàn tiền ${Number(refundAmount).toLocaleString('vi-VN')} đ cho đơn #${invoice.invoiceCode} qua ${invoice.returnRequest.refundMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}. Ghi chú: ${invoice.returnRequest.inspectionNote}`,
      diff: [
        { field: 'returnRequest.status', fieldLabel: 'Trạng thái hoàn trả', oldValue: 'shipping_back', newValue: 'approved_transferred_to_warehouse' },
        { field: 'refundAmount', fieldLabel: 'Số tiền hoàn trả', oldValue: 0, newValue: refundAmount }
      ],
      metadata: {
        refundAmount,
        refundMethod: invoice.returnRequest.refundMethod,
        bankInfo: invoice.returnRequest.bankInfo
      }
    });

    const populatedOrder = await Invoice.findById(invoice._id)
      .populate('user', 'name email phone avatar addresses bankAccounts')
      .populate('items.book', 'title bookCode price category author coverImage stock');

    res.status(200).json({
      success: true,
      message: `Duyệt hoàn tiền cho khách hàng thành công! Đã tự động lập phiếu chi hoàn tiền trong Sổ Quỹ và chuyển giao kiện hàng sang bộ phận Kho kiểm định.`,
      data: populatedOrder
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra & hoàn tiền:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi kiểm tra & hoàn tiền'
    });
  }
};

// @desc    Xử lý kiểm tra & thẩm định hàng hoàn (hỗ trợ gọi từ Admin Portal /return/inspect)
// @route   PUT /api/invoices/:id/return/inspect
// @access  Private (Staff, Admin, Accountant)
const inspectReturnOrder = async (req, res, next) => {
  const { condition, note, inspectionNote } = req.body;
  if (condition === 'rejected' || condition === 'failed') {
    req.body.reason = note || inspectionNote || 'Sách bị rách/hỏng không đạt tiêu chuẩn thu hồi';
    return rejectReturnOrder(req, res);
  }
  return inspectApproveReturnOrder(req, res);
};

// @desc    Nhân viên từ chối nhận hàng hoàn trả (Bước 3 - Từ chối)
// @route   PUT /api/orders/:id/return-reject
// @access  Private (Staff, Admin, Accountant)
const rejectReturnOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, inspectionNote } = req.body;
    const rejectReason = (reason || inspectionNote || '').trim();

    if (!rejectReason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp lý do từ chối yêu cầu hoàn trả'
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (!invoice.returnRequest) {
      invoice.returnRequest = {
        reason: invoice.returnReason || '',
        refundMethod: 'transfer',
        bankInfo: invoice.returnRefundInfo || {},
        requestedAt: invoice.returnRequestedAt || new Date(),
        status: 'requested'
      };
    }

    invoice.returnRequest.status = 'rejected';
    invoice.returnRequest.inspectedAt = new Date();
    invoice.returnRequest.inspectionNote = rejectReason;

    const staffName = req.user ? req.user.name : 'Nhân viên';
    invoice.paymentNote = (invoice.paymentNote ? invoice.paymentNote + ' | ' : '') + `[${new Date().toLocaleDateString('vi-VN')}]: ${staffName} từ chối: ${rejectReason}`;

    await invoice.save();

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_RETURN_REJECT',
      severity: 'WARNING',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${invoice.invoiceCode}`,
      description: `Nhân viên ${staffName} từ chối nhận hàng hoàn trả đơn #${invoice.invoiceCode}. Lý do: ${rejectReason}`,
      diff: [
        { field: 'returnRequest.status', fieldLabel: 'Trạng thái hoàn trả', oldValue: 'shipping_back', newValue: 'rejected' },
        { field: 'returnRequest.inspectionNote', fieldLabel: 'Lý do từ chối', oldValue: '', newValue: rejectReason }
      ]
    });

    const populatedOrder = await Invoice.findById(invoice._id)
      .populate('user', 'name email phone avatar addresses bankAccounts')
      .populate('items.book', 'title bookCode price category author coverImage stock');

    res.status(200).json({
      success: true,
      message: 'Đã từ chối nhận hàng hoàn trả thành công!',
      data: populatedOrder
    });
  } catch (error) {
    console.error('Lỗi khi từ chối trả hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi từ chối trả hàng'
    });
  }
};

// @desc    Lấy toàn bộ danh sách đơn mua khách hàng (Dành cho Admin/Staff/Thu ngân)
// @route   GET /api/admin/customer-orders
// @access  Private (Staff, Admin, Accountant)
const getCustomerOrders = async (req, res) => {
  try {
    const { status, q, fromDate, toDate, onlyCounts } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    // Pipeline gom nhóm đếm trạng thái cực nhanh trên Database engine
    const countsAggPromise = Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalAll: { $sum: 1 },
          pending_payment: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending_confirmation', 'pending_payment', 'unpaid', 'pending']] },
                1,
                0
              ]
            }
          },
          delivering: {
            $sum: {
              $cond: [
                { $in: ['$status', ['delivering', 'processing']] },
                1,
                0
              ]
            }
          },
          shipping: {
            $sum: {
              $cond: [
                { $in: ['$status', ['shipping', 'shipped']] },
                1,
                0
              ]
            }
          },
          completed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'paid', 'delivered']] },
                1,
                0
              ]
            }
          },
          cancelled: {
            $sum: {
              $cond: [
                { $in: ['$status', ['cancelled', 'canceled']] },
                1,
                0
              ]
            }
          },
          returned: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $in: ['$status', ['returned', 'return_requested', 'return_received', 'return_rejected']] },
                    { $ifNull: ['$returnRequest.status', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Nếu client chỉ cần lấy số lượng counts để cập nhật badge thông báo
    if (onlyCounts === 'true') {
      const countsResult = await countsAggPromise;
      const rawCounts = (countsResult && countsResult[0]) || {};
      const counts = {
        all: rawCounts.totalAll || 0,
        pending_payment: rawCounts.pending_payment || 0,
        pending_confirmation: rawCounts.pending_payment || 0,
        delivering: rawCounts.delivering || 0,
        shipping: rawCounts.shipping || 0,
        completed: rawCounts.completed || 0,
        cancelled: rawCounts.cancelled || 0,
        returned: rawCounts.returned || 0,
        return_process: rawCounts.returned || 0
      };
      return res.status(200).json({ success: true, counts });
    }

    // Xây dựng bộ lọc an toàn tránh xung đột $or
    const andClauses = [];

    // 1. Lọc theo trạng thái
    if (status && status !== 'all') {
      const st = status.toLowerCase().trim();
      if (st === 'pending_payment' || st === 'pending_confirmation' || st === 'pending') {
        andClauses.push({ status: { $in: ['pending_confirmation', 'pending_payment', 'unpaid', 'pending'] } });
      } else if (st === 'delivering' || st === 'processing') {
        andClauses.push({ status: { $in: ['delivering', 'processing'] } });
      } else if (st === 'shipping' || st === 'shipped') {
        andClauses.push({ status: { $in: ['shipping', 'shipped'] } });
      } else if (st === 'completed' || st === 'delivered' || st === 'paid') {
        andClauses.push({ status: { $in: ['completed', 'paid', 'delivered'] } });
      } else if (st === 'cancelled' || st === 'canceled') {
        andClauses.push({ status: { $in: ['cancelled', 'canceled'] } });
      } else if (st === 'returned' || st === 'return_process') {
        andClauses.push({
          $or: [
            { status: { $in: ['returned', 'return_requested', 'return_received', 'return_rejected'] } },
            { 'returnRequest.status': { $exists: true, $ne: null } }
          ]
        });
      } else {
        andClauses.push({ status: st });
      }
    }

    // 2. Lọc theo khoảng ngày
    if (fromDate || toDate) {
      const dateRange = {};
      if (fromDate) dateRange.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }
      andClauses.push({ createdAt: dateRange });
    }

    // 3. Tìm kiếm theo từ khóa (Mã đơn, Tên khách hàng, SĐT)
    if (q && q.trim()) {
      const cleanQ = q.trim();
      const escapedQ = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQ, 'i');
      andClauses.push({
        $or: [
          { invoiceCode: regex },
          { customerName: regex },
          { customerPhone: regex }
        ]
      });
    }

    const filter = andClauses.length > 0 ? { $and: andClauses } : {};

    const [countsResult, totalMatched, orders] = await Promise.all([
      countsAggPromise,
      Invoice.countDocuments(filter),
      Invoice.find(filter)
        .select('invoiceCode user customerName customerPhone customerAddress customerEmail orderType paymentMethod paymentStatus status returnRequest totalAmount discount coupon couponCode couponDiscount finalAmount items emailSent emailSentAt createdAt updatedAt')
        .populate('user', 'name email phone avatar')
        .populate('items.book', 'title bookCode price category author coverImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const rawCounts = (countsResult && countsResult[0]) || {};
    const counts = {
      all: rawCounts.totalAll || 0,
      pending_payment: rawCounts.pending_payment || 0,
      pending_confirmation: rawCounts.pending_payment || 0,
      delivering: rawCounts.delivering || 0,
      shipping: rawCounts.shipping || 0,
      completed: rawCounts.completed || 0,
      cancelled: rawCounts.cancelled || 0,
      returned: rawCounts.returned || 0,
      return_process: rawCounts.returned || 0
    };

    // Chuẩn hóa: nếu trạng thái là hoàn thành thì tiền phải luôn là 'paid'
    orders.forEach(ord => {
      if (['completed', 'paid'].includes(ord.status)) {
        ord.paymentStatus = 'paid';
      }
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      totalCount: totalMatched,
      page,
      totalPages: Math.ceil(totalMatched / limit) || 1,
      limit,
      counts,
      data: orders
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đơn mua khách hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách đơn mua khách hàng'
    });
  }
};

// @desc    Lấy chi tiết đơn mua khách hàng
// @route   GET /api/admin/customer-orders/:id
// @access  Private (Staff, Admin, Accountant)
const getCustomerOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Invoice.findById(id)
      .populate('user', 'name email phone avatar addresses bankAccounts')
      .populate('items.book', 'title bookCode price category author coverImage stock');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Ràng buộc nghiệp vụ: Nếu trạng thái hoàn thành thì bắt buộc tiền là đã thanh toán
    if (['completed', 'paid'].includes(order.status)) {
      order.paymentStatus = 'paid';
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết đơn hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy chi tiết đơn hàng'
    });
  }
};

// @desc    Nhân viên cập nhật trạng thái đơn mua khách hàng
// @route   PUT /api/admin/customer-orders/:id/status
// @access  Private (Staff, Admin, Accountant)
const updateCustomerOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const allowedStatuses = ['pending_confirmation', 'pending_payment', 'delivering', 'shipping', 'completed', 'cancelled', 'returned'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đơn hàng không hợp lệ'
      });
    }

    const order = await Invoice.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const prevStatus = order.status;
    order.status = (status === 'paid') ? 'completed' : status;

    if (note && note.trim()) {
      order.paymentNote = (order.paymentNote ? order.paymentNote + ' | ' : '') + `[${new Date().toLocaleDateString('vi-VN')}]: ${note.trim()}`;
    }

    // RÀNG BUỘC NGHIỆP VỤ:
    // 1. Khi trạng thái là completed -> BẮT BUỘC paymentStatus là 'paid'
    // 2. Khi trạng thái là pending_payment / pending_confirmation:
    //    - Nếu khách chuyển khoản QR (isPaidByCustomer), paymentStatus giữ 'pending_verification'
    //    - Ngược lại paymentStatus là 'unpaid'
    if (['completed', 'paid'].includes(status)) {
      order.paymentStatus = 'paid';
      order.status = 'completed';
    } else if (status === 'pending_payment' || status === 'pending_confirmation') {
      if (!order.isPaidByCustomer) {
        order.paymentStatus = 'unpaid';
      }
    } else if (['delivering', 'shipping'].includes(status)) {
      if (order.paymentMethod === 'transfer' || order.paymentMethod === 'card' || order.paymentMethod === 'MoMo') {
        order.paymentStatus = 'paid';
      }
    }

    // Tự động ghi nhận Phiếu Thu vào Sổ Quỹ nếu đơn hàng hoàn tất hoặc đã thanh toán
    if (['completed', 'paid'].includes(status) || (['delivering', 'shipping'].includes(status) && order.paymentStatus === 'paid')) {
      await recordOrderIncomeTransaction(order, req.user);
    }

    await order.save();

    // Tự động hoàn trả lại tồn kho nếu đơn hàng chuyển sang trạng thái hủy (cancelled)
    if (order.status === 'cancelled' && prevStatus !== 'cancelled') {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.book) {
            await Book.findByIdAndUpdate(item.book, { $inc: { stock: Number(item.quantity || 1) } });
          }
        }
      }
    }

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_STATUS_UPDATE',
      severity: order.status === 'cancelled' ? 'WARNING' : 'INFO',
      targetId: String(order._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${order.invoiceCode}`,
      description: `Cập nhật trạng thái đơn #${order.invoiceCode} từ [${prevStatus}] sang [${order.status}] (${Number(order.finalAmount || order.totalAmount || 0).toLocaleString('vi-VN')} đ)${note ? ` - Ghi chú: ${note}` : ''}`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái đơn hàng', oldValue: prevStatus, newValue: order.status }
      ]
    });

    const populatedOrder = await Invoice.findById(order._id)
      .populate('user', 'name email phone avatar')
      .populate('items.book', 'title bookCode price category author coverImage stock');

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng sang "${status}" thành công!`,
      data: populatedOrder
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật trạng thái đơn hàng'
    });
  }
};

// @desc    Tra cứu hóa đơn phục vụ đổi trả tại quầy POS
// @route   GET /api/invoices/counter-search
// @access  Private (Staff, Admin)
const searchInvoiceForCounterReturn = async (req, res) => {
  try {
    const { code, phone, q } = req.query;
    const queryTerm = (code || phone || q || '').trim();

    if (!queryTerm) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Mã hóa đơn hoặc Số điện thoại khách hàng để tìm kiếm!'
      });
    }

    const escaped = queryTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const orClauses = [
      { invoiceCode: regex },
      { customerPhone: regex }
    ];

    if (queryTerm.length >= 2) {
      orClauses.push({ customerName: regex });
    }

    const invoices = await Invoice.find({ $or: orClauses })
      .populate('user', 'name email phone avatar')
      .populate({
        path: 'items.book',
        select: 'title author bookCode price costPrice category coverImage stock supplier',
        populate: {
          path: 'supplier',
          select: 'name code phone email address'
        }
      })
      .sort({ createdAt: -1 })
      .limit(10);

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hóa đơn nào khớp với thông tin "${queryTerm}"!`
      });
    }

    const results = invoices.map(inv => {
      const createdDate = new Date(inv.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isEligibleDays = diffDays <= 7; // Chính sách đổi trả trong 7 ngày

      return {
        _id: inv._id,
        invoiceCode: inv.invoiceCode,
        createdAt: inv.createdAt,
        customerName: inv.customerName || (inv.user ? inv.user.name : 'Khách lẻ'),
        customerPhone: inv.customerPhone || (inv.user ? inv.user.phone : ''),
        paymentMethod: inv.paymentMethod || 'cash',
        totalAmount: inv.totalAmount || 0,
        discount: inv.discount || 0,
        finalAmount: inv.finalAmount || 0,
        status: inv.status,
        paymentStatus: inv.paymentStatus,
        diffDays,
        isEligibleDays,
        returnRequest: inv.returnRequest,
        items: (inv.items || []).map(it => ({
          _id: it._id,
          book: it.book,
          quantity: it.quantity,
          price: it.price,
          costPrice: it.costPrice || 0
        }))
      };
    });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Lỗi khi tra cứu hóa đơn đổi trả tại quầy:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tra cứu hóa đơn đổi trả'
    });
  }
};

// @desc    Xử lý giao dịch đổi trả tại quầy POS (cập nhật kho, quỹ kế toán, trả về Nhà cung cấp)
// @route   POST /api/invoices/counter-return
// @access  Private (Staff, Admin)
const processCounterReturn = async (req, res) => {
  try {
    const {
      invoiceId,
      returnType = 'exchange', // 'exchange' (Đổi sách) | 'refund' (Trả hàng hoàn tiền)
      returnedItems = [], // [{ bookId, quantity, price, reason, isDefective, bookTitle, unitPrice, lineTotal }]
      exchangeBookId,
      exchangeQty = 1,
      refundAmount = 0,
      refundMethod = 'cash', // 'cash' | 'transfer'
      mainReason,
      notes,
      note = ''
    } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã định danh hóa đơn cần đổi trả' });
    }

    if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một sản phẩm để đổi trả' });
    }

    const invoice = await Invoice.findById(invoiceId).populate({
      path: 'items.book',
      populate: { path: 'supplier' }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn cần đổi trả' });
    }

    const staffName = req.user ? req.user.name : 'Nhân viên Thu Ngân';
    const staffId = req.user ? req.user._id : null;
    let totalReturnedQty = 0;
    let calculatedRefundAmount = 0;

    // Phân loại và gom sách trả theo Nhà cung cấp
    const itemsBySupplier = new Map(); // supplierId => { supplier, items: [] }
    const nonDefectiveItems = []; // Sách khách trả lại nhưng còn nguyên vẹn, nhập lại kho bán

    // Tìm nhà cung cấp dự phòng nếu sách chưa gắn NCC
    let fallbackSupplier = await Supplier.findOne({ isDeleted: false, status: 'active' });
    if (!fallbackSupplier) fallbackSupplier = await Supplier.findOne({ isDeleted: false });

    for (const retItem of returnedItems) {
      const q = Math.max(1, Number(retItem.quantity) || 1);
      const p = Math.max(0, Number(retItem.unitPrice || retItem.price) || 0);
      totalReturnedQty += q;
      calculatedRefundAmount += (q * p);

      const bId = retItem.bookId || retItem.book;
      const bookDoc = await Book.findById(bId).populate('supplier');
      if (!bookDoc) continue;

      const isDefect = retItem.isDefective !== false;

      if (!isDefect) {
        nonDefectiveItems.push({ book: bookDoc, quantity: q, price: p, reason: retItem.reason || 'Khách đổi ý/không thích' });
        continue;
      }

      let supplier = bookDoc.supplier;
      if (!supplier) {
        supplier = fallbackSupplier;
      }
      const supKey = supplier ? supplier._id.toString() : 'unknown';

      if (!itemsBySupplier.has(supKey)) {
        itemsBySupplier.set(supKey, {
          supplier: supplier,
          items: []
        });
      }

      itemsBySupplier.get(supKey).items.push({
        book: bookDoc,
        quantity: q,
        price: p,
        reason: retItem.reason || (returnType === 'exchange' ? 'Sách bị lỗi in ấn / đổi sách tại quầy' : 'Khách trả hàng tại quầy')
      });
    }

    // Tái nhập kho bán cho các cuốn sách không bị lỗi (nếu có)
    const affectedShelves = [];
    for (const nonDef of nonDefectiveItems) {
      const updatedRestock = await Book.findByIdAndUpdate(nonDef.book._id, { $inc: { stock: nonDef.quantity } }, { new: true });
      if (updatedRestock && updatedRestock.shelf) {
        affectedShelves.push(updatedRestock.shelf);
      }
      await StockAdjustment.create({
        book: nonDef.book._id,
        bookCode: nonDef.book.bookCode || 'SKU',
        title: nonDef.book.title,
        previousStock: nonDef.book.stock,
        adjustmentQty: nonDef.quantity,
        newStock: (nonDef.book.stock || 0) + nonDef.quantity,
        reason: `Nhập lại kho bán sách hoàn nguyên vẹn từ HĐ ${invoice.invoiceCode} (Đổi trả quầy: ${nonDef.reason})`,
        adjustedBy: staffId
      });
    }

    // 1. NẾU LÀ ĐỔI SÁCH (EXCHANGE):
    // Giảm tồn kho cuốn sách mới đưa cho khách & kiểm tra số lượng khả dụng
    let exchangeBookDoc = null;
    const exQty = Math.max(1, Number(exchangeQty) || 1);
    let exchangeDiff = 0;
    let exchangeDetails = null;

    if (returnType === 'exchange' && exchangeBookId) {
      exchangeBookDoc = await Book.findById(exchangeBookId);
      if (!exchangeBookDoc) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy cuốn sách chọn đổi mới trong hệ thống' });
      }

      if (exchangeBookDoc.stock < exQty) {
        return res.status(400).json({
          success: false,
          message: `Sách đổi mới "${exchangeBookDoc.title}" chỉ còn tồn ${exchangeBookDoc.stock} cuốn, không đủ đổi ${exQty} cuốn cho khách.`
        });
      }

      // Trừ kho cuốn sách mới đưa cho khách
      const updatedExBook = await Book.findByIdAndUpdate(
        exchangeBookDoc._id,
        { $inc: { stock: -exQty } },
        { new: true }
      );

      if (updatedExBook && updatedExBook.shelf) {
        affectedShelves.push(updatedExBook.shelf);
      }

      await StockAdjustment.create({
        book: exchangeBookDoc._id,
        bookCode: exchangeBookDoc.bookCode || 'SKU',
        title: exchangeBookDoc.title,
        previousStock: exchangeBookDoc.stock,
        adjustmentQty: -exQty,
        newStock: Math.max(0, exchangeBookDoc.stock - exQty),
        reason: `Xuất sách mới đổi cho khách tại quầy từ HĐ ${invoice.invoiceCode} (${exQty} cuốn "${exchangeBookDoc.title}")`,
        adjustedBy: staffId
      });

      const newBookTotal = (exchangeBookDoc.price || 0) * exQty;
      exchangeDiff = newBookTotal - calculatedRefundAmount;

      exchangeDetails = {
        bookTitle: exchangeBookDoc.title,
        quantity: exQty,
        price: exchangeBookDoc.price || 0,
        total: newBookTotal,
        difference: exchangeDiff
      };

      // Ghi nhận dòng tiền chênh lệch nếu có:
      if (exchangeDiff > 0) {
        // Khách bù thêm tiền -> Ghi nhận Phiếu Thu
        const incomeCode = `PT-BD-${Date.now().toString().slice(-6)}`;
        await Transaction.create({
          transactionCode: incomeCode,
          type: 'thu',
          amount: exchangeDiff,
          category: 'Thu tiền bán sách',
          description: `Thu tiền khách bù đổi sách tại quầy HĐ ${invoice.invoiceCode} (${exQty} cuốn "${exchangeBookDoc.title}")`,
          personName: invoice.customerName || 'Khách lẻ',
          address: invoice.customerAddress || 'Tại quầy',
          paymentMethod: refundMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản banking',
          attached: `Hóa đơn ${invoice.invoiceCode}`,
          note: `Thu ngân: ${staffName}. Khách đổi bù chênh lệch sách giá trị cao hơn.`,
          cashierName: staffName,
          accountantName: 'Phạm Thị Mai',
          performedBy: staffId
        });
      } else if (exchangeDiff < 0) {
        // Tiệm hoàn bớt tiền cho khách -> Ghi nhận Phiếu Chi hoàn
        const refundDifference = Math.abs(exchangeDiff);
        await recordOrderRefundTransaction(
          invoice,
          refundDifference,
          refundMethod,
          req.user,
          `Hoàn tiền chênh lệch đổi sách tại quầy: ${refundDifference.toLocaleString('vi-VN')}₫ (${refundMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}). Thu ngân: ${staffName}`
        );
      }
    }

    if (affectedShelves.length > 0) {
      await updateMultipleShelves(affectedShelves);
    }

    // 2. TỰ ĐỘNG LẬP PHIẾU XUẤT TRẢ NHÀ CUNG CẤP (SUPPLIER RETURN)
    // Sách lỗi khách trả lại không đưa vào kho bán mà chuyển thành phiếu xuất trả NCC
    const createdSupplierReturns = [];
    for (const [supKey, supGroup] of itemsBySupplier.entries()) {
      const targetSupplier = supGroup.supplier;
      if (!targetSupplier) continue;

      const returnCode = `TH-NCC-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10)}`;
      let supGroupTotalQty = 0;
      let supGroupTotalAmt = 0;

      const processedItems = supGroup.items.map(it => {
        const lineTotal = it.quantity * it.price;
        supGroupTotalQty += it.quantity;
        supGroupTotalAmt += lineTotal;

        return {
          book: it.book._id,
          bookCode: it.book.bookCode || 'SKU',
          title: it.book.title,
          unit: 'Quyển',
          quantity: it.quantity,
          price: it.price,
          totalPrice: lineTotal,
          reason: it.reason,
          note: `Đổi trả tại quầy từ hóa đơn ${invoice.invoiceCode} của ${invoice.customerName || 'Khách lẻ'}`
        };
      });

      // Tạo giao dịch thu tiền hoàn từ NCC về quỹ kế toán
      const transCode = `PT-TH-NCC-${Date.now().toString().slice(-6)}`;
      await Transaction.create({
        transactionCode: transCode,
        type: 'thu',
        amount: supGroupTotalAmt,
        description: `Thu tiền hoàn trả sách lỗi tại quầy từ NCC ${targetSupplier.name} (HĐ bán: ${invoice.invoiceCode}, Phiếu trả: ${returnCode})`,
        personName: targetSupplier.name,
        address: targetSupplier.address || '',
        paymentMethod: 'Chuyển khoản banking',
        attached: `Phiếu xuất trả NCC ${returnCode}`,
        note: `Hoàn tiền trả sách lỗi đổi tại quầy theo HĐ ${invoice.invoiceCode}. Kế toán nhận tiền hoàn về quỹ.`,
        cashierName: staffName,
        accountantName: 'Phạm Thị Mai',
        performedBy: staffId || targetSupplier._id
      });

      // Tạo bản ghi SupplierReturn
      const supReturn = await SupplierReturn.create({
        returnCode,
        supplier: targetSupplier._id,
        supplierName: targetSupplier.name,
        supplierCode: targetSupplier.code,
        supplierAddress: targetSupplier.address,
        supplierPhone: targetSupplier.phone,
        warehouseName: 'Kho bán hàng trung tâm',
        warehouseAddress: 'Quầy thu ngân POS / Tiệm sách L\'Amour',
        returnDate: new Date(),
        reason: returnType === 'exchange' ? 'Khách đổi sách lỗi tại quầy (chuyển trả NCC)' : 'Khách trả hàng tại quầy (chuyển trả NCC)',
        items: processedItems,
        totalQuantity: supGroupTotalQty,
        totalAmount: supGroupTotalAmt,
        status: 'pending',
        refundStatus: 'received',
        refundTransactionCode: transCode,
        sourceInvoice: invoice._id,
        note: `Tự động tạo từ giao dịch Đổi trả tại quầy HĐ ${invoice.invoiceCode}. Thu ngân: ${staffName}. Khách hàng: ${invoice.customerName || 'Khách lẻ'} - SĐT: ${invoice.customerPhone || '---'}. Ghi chú: ${note || notes || 'Sách lỗi/hỏng đổi trả'}`,
        createdBy: staffId,
        staffName,
        signatures: {
          creator: staffName,
          storekeeper: 'Lê Văn Nam',
          supplierRep: targetSupplier.contactPerson || targetSupplier.name,
          accountant: 'Phạm Thị Mai'
        }
      });

      // Ghi log StockAdjustment cho từng cuốn lỗi xuất trả NCC
      for (const it of supGroup.items) {
        await StockAdjustment.create({
          book: it.book._id,
          bookCode: it.book.bookCode || 'SKU',
          title: it.book.title,
          previousStock: it.book.stock,
          adjustmentQty: 0,
          newStock: it.book.stock,
          reason: `Lập phiếu xuất trả NCC ${returnCode} cho sách lỗi từ đổi trả tại quầy HĐ ${invoice.invoiceCode} (SL: ${it.quantity} cuốn)`,
          adjustedBy: staffId
        });
      }

      createdSupplierReturns.push({
        _id: supReturn._id,
        returnCode: supReturn.returnCode,
        supplierName: targetSupplier.name,
        totalQuantity: supGroupTotalQty,
        totalAmount: supGroupTotalAmt,
        itemsCount: supGroupTotalQty
      });
    }

    // 3. TẠO BẢN GHI PHIẾU CHI KẾ TOÁN NẾU LÀ TRẢ HÀNG HOÀN TIỀN
    let finalRefundAmt = 0;
    let refundTrans = null;
    if (returnType === 'refund') {
      finalRefundAmt = Number(refundAmount) >= 0 ? Number(refundAmount) : calculatedRefundAmount;
      if (finalRefundAmt > 0) {
        refundTrans = await recordOrderRefundTransaction(
          invoice,
          finalRefundAmt,
          refundMethod,
          req.user,
          `Hoàn tiền tại quầy: ${finalRefundAmt.toLocaleString('vi-VN')}₫ (${refundMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}). Thu ngân: ${staffName}`
        );
      }
    } else {
      finalRefundAmt = exchangeDiff < 0 ? Math.abs(exchangeDiff) : 0;
    }

    // 4. CẬP NHẬT TRẠNG THÁI TRÊN HÓA ĐƠN GỐC
    const returnCodesStr = createdSupplierReturns.map(r => r.returnCode).join(', ');
    const isFullReturn = totalReturnedQty >= (invoice.items.reduce((s, it) => s + (it.quantity || 1), 0));

    invoice.status = (isFullReturn && returnType === 'refund') ? 'returned' : invoice.status;
    invoice.returnReason = note || notes || mainReason || (returnType === 'exchange' ? 'Khách đổi sách tại quầy' : 'Khách trả hàng hoàn tiền tại quầy');
    invoice.returnRequestedAt = new Date();
    invoice.returnRequest = {
      reason: invoice.returnReason,
      refundMethod: refundMethod === 'cash' ? 'cash' : 'transfer',
      requestedAt: new Date(),
      receivedAt: new Date(),
      inspectedAt: new Date(),
      inspectionNote: `Đổi trả trực tiếp tại quầy thu ngân bởi ${staffName}`,
      status: createdSupplierReturns.length > 0 ? 'warehouse_returned_supplier' : 'warehouse_restocked',
      transferredToWarehouseAt: new Date(),
      warehouseAction: createdSupplierReturns.length > 0 ? 'return_supplier' : 'restock',
      warehouseProcessedAt: new Date(),
      warehouseNote: createdSupplierReturns.length > 0 ? `Đã tự động lập phiếu trả Nhà cung cấp (${returnCodesStr})` : 'Sách nguyên vẹn đã tái nhập kho bán',
      supplierReturnCode: returnCodesStr,
      returnedItems: returnedItems,
      refundAmount: finalRefundAmt,
      returnType: returnType
    };

    invoice.paymentNote = (invoice.paymentNote ? invoice.paymentNote + ' | ' : '') + 
      `[Quầy POS]: Đã xử lý ${returnType === 'exchange' ? 'Đổi sách' : 'Trả hàng'} (${finalRefundAmt.toLocaleString('vi-VN')}₫)${returnCodesStr ? `, phiếu trả NCC: ${returnCodesStr}` : ''}`;

    await invoice.save();

    logActivity(req, {
      module: 'ORDERS',
      action: 'ORDER_COUNTER_RETURN',
      severity: 'CRITICAL',
      targetId: String(invoice._id),
      targetModel: 'Invoice',
      targetLabel: `Đơn #${invoice.invoiceCode}`,
      description: `Thu ngân ${staffName} xử lý ${returnType === 'exchange' ? 'Đổi sách' : 'Trả hàng hoàn tiền'} tại quầy HĐ #${invoice.invoiceCode} (${totalReturnedQty} cuốn, ${finalRefundAmt > 0 ? `hoàn ${finalRefundAmt.toLocaleString('vi-VN')} đ` : (exchangeDiff > 0 ? `thu bù ${exchangeDiff.toLocaleString('vi-VN')} đ` : 'đổi ngang giá')})`,
      metadata: {
        returnType,
        totalReturnedQty,
        refundAmount: finalRefundAmt,
        refundMethod,
        exchangeDetails
      }
    });

    const returnDocCode = `BB-DT-${Date.now().toString().slice(-6)}`;

    res.status(200).json({
      success: true,
      message: `Xử lý ${returnType === 'exchange' ? 'đổi sách' : 'trả hàng'} tại quầy thành công!${returnCodesStr ? ` Đã tự động tạo phiếu xuất trả Nhà cung cấp (${returnCodesStr}).` : ''}${returnType === 'exchange' ? ' Đã xuất sách mới và cập nhật kho chính xác.' : ''}`,
      data: {
        returnCode: returnDocCode,
        invoiceCode: invoice.invoiceCode,
        customerName: invoice.customerName || (invoice.user ? invoice.user.name : 'Khách lẻ'),
        customerPhone: invoice.customerPhone || (invoice.user ? invoice.user.phone : ''),
        returnType,
        refundAmount: finalRefundAmt,
        refundMethod,
        refundTransaction: refundTrans ? refundTrans.transactionCode : null,
        returnedItems: returnedItems.map(it => ({
          bookTitle: it.bookTitle || (it.book && it.book.title) || 'Tựa sách',
          unitPrice: it.unitPrice || it.price || 0,
          quantity: it.quantity || 1,
          lineTotal: (it.unitPrice || it.price || 0) * (it.quantity || 1),
          reason: it.reason || 'Lỗi sản phẩm',
          isDefective: it.isDefective !== false
        })),
        exchangeDetails,
        supplierReturnsCreated: createdSupplierReturns,
        invoice: {
          _id: invoice._id,
          invoiceCode: invoice.invoiceCode,
          status: invoice.status,
          returnRequest: invoice.returnRequest
        },
        supplierReturns: createdSupplierReturns
      }
    });
  } catch (error) {
    console.error('Lỗi khi xử lý đổi trả tại quầy:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xử lý đổi trả tại quầy'
    });
  }
};

// @desc    Tải lên ảnh bill thanh toán chuyển khoản
// @route   POST /api/invoices/upload-proof
// @access  Public / Private
const uploadPaymentProofFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file hình ảnh bill thanh toán'
      });
    }

    const fileUrl = `/uploads/payments/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: 'Tải lên ảnh bill thanh toán thành công',
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Lỗi khi tải ảnh bill thanh toán:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi tải ảnh bill thanh toán'
    });
  }
};

// @desc    Cập nhật/bổ sung ảnh bill thanh toán cho đơn hàng
// @route   PUT /api/invoices/:id/payment-proof
// @access  Private (User sở hữu đơn, Staff, Admin, Accountant)
const updateOrderPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
    let paymentProofUrl = req.body ? req.body.paymentProof : null;

    if (req.file) {
      paymentProofUrl = `/uploads/payments/${req.file.filename}`;
    }

    if (!paymentProofUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ảnh bill thanh toán'
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn'
      });
    }

    invoice.paymentProof = paymentProofUrl;
    invoice.paymentStatus = 'pending_verification';
    invoice.paymentNote = 'Khách đã cập nhật ảnh bill chuyển khoản - Chờ đối soát tiền về';
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh bill thanh toán thành công',
      data: invoice
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật ảnh bill:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật ảnh bill thanh toán'
    });
  }
};

// @desc    Gửi lại email hóa đơn cho khách hàng theo yêu cầu
// @route   POST /api/invoices/:id/resend-email
// @access  Private (User, Staff, Admin, Accountant)
const resendInvoiceEmailHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const invoice = await Invoice.findById(id)
      .populate('items.book', 'title author price bookCode coverImage')
      .populate('user', 'email name phone');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn cần gửi email'
      });
    }

    const targetEmail = (email || invoice.customerEmail || (invoice.user && invoice.user.email) || '').trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ email không hợp lệ. Vui lòng cung cấp email người nhận chính xác!'
      });
    }

    const result = await sendInvoiceEmail(invoice, targetEmail);
    if (result.success) {
      logActivity(req, {
        module: 'ORDERS',
        action: 'INVOICE_EMAIL_RESEND',
        severity: 'INFO',
        targetId: String(invoice._id),
        targetModel: 'Invoice',
        targetLabel: `Đơn #${invoice.invoiceCode}`,
        description: `Gửi lại email hóa đơn điện tử cho đơn #${invoice.invoiceCode} tới địa chỉ "${targetEmail}"`,
        metadata: {
          targetEmail,
          invoiceCode: invoice.invoiceCode
        }
      });

      return res.status(200).json({
        success: true,
        message: `Đã gửi thành công email hóa đơn tới ${targetEmail}!`,
        email: targetEmail
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message || 'Gửi email thất bại'
      });
    }
  } catch (error) {
    console.error('Lỗi khi gửi lại email hóa đơn:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi gửi email hóa đơn'
    });
  }
};

module.exports = {
  createInvoice,
  createOnlineInvoice,
  uploadPaymentProofFile,
  updateOrderPaymentProof,
  getAllInvoices,
  getMyInvoices,
  updateInvoiceStatus,
  getUserOrders,
  cancelUserOrder,
  payUserOrder,
  verifyPaymentOrder,
  returnUserOrder,
  receiveReturnOrder,
  inspectApproveReturnOrder,
  inspectReturnOrder,
  rejectReturnOrder,
  getCustomerOrders,
  getCustomerOrderDetail,
  updateCustomerOrderStatus,
  searchInvoiceForCounterReturn,
  processCounterReturn,
  resendInvoiceEmailHandler
};


