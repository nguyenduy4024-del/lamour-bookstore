const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const ImportReceipt = require('../models/ImportReceipt');
const Supplier = require('../models/Supplier');
const Book = require('../models/Book');
const { logActivity } = require('../utils/auditLogger');

let isTransactionsSeeded = false;
let financialReportCache = { data: null, timestamp: 0 };
let cashbookKpiCache = { data: null, timestamp: 0 };

const invalidateAccountingCache = () => {
  financialReportCache = { data: null, timestamp: 0 };
  cashbookKpiCache = { data: null, timestamp: 0 };
};

// Khởi tạo các giao dịch mẫu ban đầu nếu Sổ Quỹ chưa có dữ liệu
const seedDefaultTransactionsIfEmpty = async () => {
  if (isTransactionsSeeded) return;
  isTransactionsSeeded = true;
  const count = await Transaction.countDocuments();
  if (count === 0) {
    const accountantUser = await User.findOne({ role: 'accountant' }) || await User.findOne({ role: 'admin' });
    if (!accountantUser) return;

    const sampleTransactions = [
      {
        transactionCode: 'PT-2026-001',
        type: 'income',
        category: 'Thu tiền thanh lý',
        amount: 450000,
        description: 'Thu tiền thanh lý bao bì carton và giấy thừa',
        recipient: 'Cơ sở ve chai Hoàng Phát',
        personName: 'Cơ sở ve chai Hoàng Phát',
        address: 'Quận 5, TP.HCM',
        paymentMethod: 'cash',
        attached: 'Phiếu cân hàng',
        note: 'Đã nhập quỹ tiền mặt',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-01-15T09:30:00.000Z'),
        updatedAt: new Date('2026-01-15T09:30:00.000Z')
      },
      {
        transactionCode: 'PT-2026-002',
        type: 'income',
        category: 'Thu phí dịch vụ',
        amount: 1250000,
        description: 'Thu phí dịch vụ gói quà nghệ thuật và bọc bìa cao cấp',
        recipient: 'Khách hàng sự kiện Ngày Sách',
        personName: 'Khách hàng sự kiện Ngày Sách',
        address: 'Quận 1, TP.HCM',
        paymentMethod: 'cash',
        attached: 'Sổ kê dịch vụ quầy',
        note: 'Dịch vụ phụ trợ',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-02-14T15:20:00.000Z'),
        updatedAt: new Date('2026-02-14T15:20:00.000Z')
      },
      {
        transactionCode: 'PT-2026-003',
        type: 'income',
        category: 'Chiết khấu thương mại',
        amount: 3500000,
        description: 'Thu chiết khấu thương mại & thưởng doanh số Q1 từ NXB Kim Đồng',
        recipient: 'NXB Kim Đồng',
        personName: 'NXB Kim Đồng',
        address: '247 Vũ Hữu, Hà Nội',
        paymentMethod: 'transfer',
        attached: 'Ủy nhiệm chi số 8921',
        note: 'Chuyển khoản Techcombank',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-03-31T11:00:00.000Z'),
        updatedAt: new Date('2026-03-31T11:00:00.000Z')
      },
      {
        transactionCode: 'PT-2026-004',
        type: 'income',
        category: 'Tài trợ sự kiện',
        amount: 5000000,
        description: 'Thu phí tài trợ & tổ chức Workshop giới thiệu sách mới',
        recipient: 'CLB Văn Học & Sách Trẻ',
        personName: 'CLB Văn Học & Sách Trẻ',
        address: 'Quận 3, TP.HCM',
        paymentMethod: 'transfer',
        attached: 'Hợp đồng tài trợ',
        note: 'Sự kiện giao lưu tác giả',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-05-18T14:45:00.000Z'),
        updatedAt: new Date('2026-05-18T14:45:00.000Z')
      },
      {
        transactionCode: 'PT-2026-005',
        type: 'income',
        category: 'Cho thuê mặt bằng',
        amount: 2800000,
        description: 'Thu tiền cho thuê không gian chụp ảnh & triển lãm tranh minh họa',
        recipient: 'Studio Nghệ Thuật Ánh Dương',
        personName: 'Studio Nghệ Thuật Ánh Dương',
        address: 'Quận Bình Thạnh, TP.HCM',
        paymentMethod: 'transfer',
        attached: 'Biên bản bàn giao mặt bằng',
        note: 'Thu tiền trước sự kiện',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-06-25T16:10:00.000Z'),
        updatedAt: new Date('2026-06-25T16:10:00.000Z')
      },
      {
        transactionCode: 'PT-2026-006',
        type: 'income',
        category: 'Thẻ hội viên VIP',
        amount: 1600000,
        description: 'Thu tiền bán thẻ hội viên VIP & bookmark kim loại phiên bản giới hạn',
        recipient: 'Khách hàng thân thiết VIP',
        personName: 'Khách hàng thân thiết VIP',
        address: 'Quầy POS',
        paymentMethod: 'cash',
        attached: 'Bảng kê bán thẻ',
        note: 'Chương trình tri ân độc giả',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-07-20T10:15:00.000Z'),
        updatedAt: new Date('2026-07-20T10:15:00.000Z')
      },
      {
        transactionCode: 'PC-2026-001',
        type: 'expense',
        category: 'Chi phí mặt bằng',
        amount: 8500000,
        description: 'Thanh toán tiền thuê mặt bằng nhà sách tháng 01/2026',
        recipient: 'Ban Quản Lý Tòa Nhà L\'Amour',
        personName: 'Ban Quản Lý Tòa Nhà L\'Amour',
        address: 'Quận 1, TP.HCM',
        paymentMethod: 'transfer',
        attached: 'Hóa đơn VAT & Hợp đồng thuê',
        note: 'Kỳ thanh toán đầu tháng',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-01-05T08:00:00.000Z'),
        updatedAt: new Date('2026-01-05T08:00:00.000Z')
      },
      {
        transactionCode: 'PC-2026-002',
        type: 'expense',
        category: 'Chi phí điện nước',
        amount: 1850000,
        description: 'Thanh toán tiền điện chiếu sáng và máy lạnh nhà sách tháng 02/2026',
        recipient: 'Công ty Điện Lực TP.HCM',
        personName: 'Công ty Điện Lực TP.HCM',
        address: 'Quận 1, TP.HCM',
        paymentMethod: 'transfer',
        attached: 'Giấy báo tiền điện',
        note: 'Thanh toán tự động qua App',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-02-28T10:30:00.000Z'),
        updatedAt: new Date('2026-02-28T10:30:00.000Z')
      },
      {
        transactionCode: 'PC-2026-003',
        type: 'expense',
        category: 'Văn phòng phẩm',
        amount: 680000,
        description: 'Mua giấy in nhiệt k80, mực in mã vạch và bao bì xốp bọc sách',
        recipient: 'Công ty Văn Phòng Phẩm Minh Anh',
        personName: 'Công ty Văn Phòng Phẩm Minh Anh',
        address: 'Quận 10, TP.HCM',
        paymentMethod: 'cash',
        attached: 'Hóa đơn bán lẻ',
        note: 'Phục vụ đóng gói tại quầy',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-03-12T14:15:00.000Z'),
        updatedAt: new Date('2026-03-12T14:15:00.000Z')
      },
      {
        transactionCode: 'PC-2026-004',
        type: 'expense',
        category: 'Chi phí tiếp thị',
        amount: 2200000,
        description: 'Chi phí tiếp thị số & chạy quảng cáo tuần lễ sách hè trên Facebook/TikTok',
        recipient: 'Agency Truyền Thông Việt',
        personName: 'Agency Truyền Thông Việt',
        address: 'Quận 3, TP.HCM',
        paymentMethod: 'transfer',
        attached: 'Hợp đồng dịch vụ quảng cáo',
        note: 'Chiến dịch hè 2026',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-06-15T15:00:00.000Z'),
        updatedAt: new Date('2026-06-15T15:00:00.000Z')
      },
      {
        transactionCode: 'PC-2026-005',
        type: 'expense',
        category: 'Cước vận chuyển',
        amount: 1150000,
        description: 'Chi phí vận chuyển & cước bưu điện giao hàng online đợt 1',
        recipient: 'Giao Hàng Nhanh (GHN Express)',
        personName: 'Giao Hàng Nhanh (GHN Express)',
        address: 'TP. Thủ Đức, TP.HCM',
        paymentMethod: 'transfer',
        attached: 'Bảng đối soát cước vận chuyển',
        note: 'Phí ship đơn hàng online',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-07-10T17:20:00.000Z'),
        updatedAt: new Date('2026-07-10T17:20:00.000Z')
      },
      {
        transactionCode: 'PC-2026-006',
        type: 'expense',
        category: 'Chi phí khác',
        amount: 420000,
        description: 'Chi tiền mua trà, cà phê & nước uống phục vụ góc đọc sách',
        recipient: 'Cửa hàng Bách Hóa Xanh',
        personName: 'Cửa hàng Bách Hóa Xanh',
        address: 'Quận 1, TP.HCM',
        paymentMethod: 'cash',
        attached: 'Hóa đơn tính tiền siêu thị',
        note: 'Phục vụ bạn đọc',
        performedBy: accountantUser._id,
        createdAt: new Date('2026-08-05T08:45:00.000Z'),
        updatedAt: new Date('2026-08-05T08:45:00.000Z')
      }
    ];

    await Transaction.insertMany(sampleTransactions);
  }
};

// @desc    Lấy số lượng phiếu thu/chi chờ duyệt (siêu nhẹ cho sidebar/badge)
// @route   GET /api/accounting/badge-counts
// @access  Private (Accountant, Admin)
const getAccountingBadgeCounts = async (req, res) => {
  try {
    const [pendingReceipts, pendingPayments] = await Promise.all([
      Transaction.Receipt.countDocuments({ status: 'pending' }),
      Transaction.Payment.countDocuments({ status: 'pending' })
    ]);
    res.status(200).json({
      success: true,
      pendingCount: pendingReceipts + pendingPayments
    });
  } catch (err) {
    res.status(500).json({ success: false, pendingCount: 0 });
  }
};

// @desc    Lấy danh sách Sổ Quỹ Thu - Chi (Cashbook) kèm 3 thẻ KPI
// @route   GET /api/accounting/cashbook
// @access  Private (Accountant, Admin)
const getCashbook = async (req, res) => {
  try {
    await seedDefaultTransactionsIfEmpty();

    const { startDate, endDate, type, keyword, status } = req.query;
    const limit = parseInt(req.query.limit) || (req.query.all === 'true' ? 1000 : 150);
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // 1. Tính toán các thẻ KPI tổng quan toàn hệ thống bằng MongoDB Aggregation song song
    const now = Date.now();
    let kpiData;
    if (cashbookKpiCache.data && (now - cashbookKpiCache.timestamp < 15000)) {
      kpiData = cashbookKpiCache.data;
    } else {
      const [incAgg, expAgg, pendIncAgg, pendExpAgg] = await Promise.all([
        Transaction.Receipt.aggregate([
          { $match: { $or: [{ status: 'approved' }, { status: { $exists: false } }, { status: null }] } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Transaction.Payment.aggregate([
          { $match: { $or: [{ status: 'approved' }, { status: { $exists: false } }, { status: null }] } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Transaction.Receipt.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Transaction.Payment.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ])
      ]);

      const totalIncome = incAgg[0]?.total || 0;
      const totalExpense = expAgg[0]?.total || 0;
      const pendingCount = (pendIncAgg[0]?.count || 0) + (pendExpAgg[0]?.count || 0);
      const pendingIncome = pendIncAgg[0]?.total || 0;
      const pendingExpense = pendExpAgg[0]?.total || 0;

      // Tính giá trị tồn kho thực tế (Giá vốn) của nhà sách để hiển thị số dương
      const allBooks = await Book.find({}, 'stock price costPrice').lean();
      let inventoryCostValue = 0;
      let inventoryUnits = 0;
      for (const b of allBooks) {
        const s = Math.max(0, Number(b.stock) || 0);
        inventoryUnits += s;
        const price = Number(b.price) || 0;
        const cost = Number(b.costPrice) > 0 ? Number(b.costPrice) : Math.round(price * 0.65);
        inventoryCostValue += (s * cost);
      }

      kpiData = {
        totalIncome,
        totalExpense,
        inventoryCostValue,
        inventoryUnits,
        currentBalance: inventoryCostValue, // Hiển thị giá trị tồn kho dương theo cấu hình mới
        pendingCount,
        pendingIncome,
        pendingExpense
      };
      cashbookKpiCache = { data: kpiData, timestamp: now };
    }

    // 2. Lọc danh sách giao dịch theo điều kiện tìm kiếm
    const query = {};

    if (type && type !== 'all') {
      if (type === 'income') {
        query.type = { $in: ['income', 'thu'] };
      } else if (type === 'expense') {
        query.type = { $in: ['expense', 'chi'] };
      }
    }

    if (status && status !== 'all') {
      if (status === 'approved') {
        query.$or = [{ status: 'approved' }, { status: { $exists: false } }, { status: null }];
      } else {
        query.status = status;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (keyword && keyword.trim()) {
      const regex = new RegExp(keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { transactionCode: regex },
        { category: regex },
        { recipient: regex },
        { personName: regex },
        { description: regex },
        { note: regex }
      ];
    }

    const transactions = await Transaction.find(query)
      .populate('performedBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('referenceOrder', 'invoiceCode totalAmount finalAmount status paymentMethod')
      .populate('referenceReceipt', 'receiptCode totalAmount')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    // Chuẩn hóa dữ liệu trả về cho frontend
    const normalizedData = transactions.map(t => {
      const isInc = ['income', 'thu'].includes(t.type);
      const curStatus = t.status || 'approved';
      return {
        _id: t._id,
        transactionCode: t.transactionCode,
        type: isInc ? 'income' : 'expense',
        rawType: t.type,
        typeDisplay: isInc ? 'Phiếu Thu' : 'Phiếu Chi',
        status: curStatus,
        statusDisplay: curStatus === 'pending' ? 'Chờ duyệt' : (curStatus === 'rejected' ? 'Từ chối' : 'Đã duyệt'),
        approvedBy: t.approvedBy,
        approvedAt: t.approvedAt,
        rejectionReason: t.rejectionReason || '',
        category: t.category || (isInc ? 'Thu tiền bán sách' : 'Chi phí vận hành'),
        amount: Number(t.amount) || 0,
        recipient: t.recipient || t.personName || '---',
        personName: t.personName || t.recipient || '---',
        paymentMethod: t.paymentMethod || 'cash',
        description: t.description || '',
        note: t.note || '',
        attached: t.attached || '',
        attachedImage: t.attachedImage || '',
        address: t.address || '',
        referenceOrder: t.referenceOrder,
        referenceReceipt: t.referenceReceipt,
        performedBy: t.performedBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      count: normalizedData.length,
      kpi: kpiData,
      data: normalizedData
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Sổ Quỹ:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tải Sổ Quỹ'
    });
  }
};

// @desc    Tạo mới phiếu Thu hoặc Chi trong Sổ Quỹ (thủ công)
// @route   POST /api/accounting/cashbook
// @access  Private (Accountant, Admin)
const createCashbookEntry = async (req, res) => {
  try {
    const {
      transactionCode,
      type,
      amount,
      category,
      recipient,
      personName,
      paymentMethod,
      description,
      address,
      attached,
      attachedImage,
      note,
      accountantName,
      cashierName,
      signatureMode,
      referenceOrder,
      referenceReceipt,
      createdAt
    } = req.body;

    // Validate type
    if (!type || !['income', 'expense', 'thu', 'chi'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại giao dịch không hợp lệ! Vui lòng chọn Phiếu Thu (income) hoặc Phiếu Chi (expense).'
      });
    }

    // Validate amount
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền giao dịch phải là một số dương lớn hơn 0!'
      });
    }

    // Bắt buộc kèm theo chứng từ gốc: có thể nhập lời hoặc chọn ảnh
    const finalAttached = (attached || '').trim();
    const finalAttachedImage = (attachedImage || '').trim();
    if (!finalAttached && !finalAttachedImage) {
      return res.status(400).json({
        success: false,
        message: 'Kèm theo chứng từ gốc là bắt buộc! Vui lòng nhập lời ghi chú hoặc tải lên ảnh chứng từ.'
      });
    }

    // Validate / sanitize category (tự động fallback sang description hoặc mặc định nếu form không gửi)
    let finalCategory = (category || '').trim();
    if (!finalCategory && description && description.trim()) {
      finalCategory = description.trim().slice(0, 100);
    }
    if (!finalCategory) {
      finalCategory = ['income', 'thu'].includes(type) ? 'Khoản thu khác' : 'Chi phí vận hành';
    }

    const normType = ['income', 'thu'].includes(type) ? 'income' : 'expense';
    const prefix = normType === 'income' ? 'PT' : 'PC';
    const code = transactionCode && transactionCode.trim() 
      ? transactionCode.trim() 
      : `${prefix}-${Date.now().toString().slice(-6)}`;

    const targetRecipient = (recipient || personName || '').trim() || (normType === 'income' ? 'Khách hàng / Đối tác' : 'Đối tác nhận tiền');

    let performerId = (req.user && req.user._id) ? req.user._id : null;
    if (!performerId) {
      const defaultUser = await User.findOne({ role: 'accountant' }) || await User.findOne({ role: 'admin' });
      if (defaultUser) performerId = defaultUser._id;
    }

    // Xác định trạng thái phê duyệt chứng từ:
    // Nếu tạo bởi Admin: có thể duyệt ngay (hoặc theo req.body.status)
    // Nếu tạo bởi Kế toán / Nhân viên khác: BẮT BUỘC status: 'pending' (Chờ Admin duyệt)
    let initialStatus = 'pending';
    let approverId = null;
    let approvedAtDate = null;

    if (req.user && req.user.role === 'admin') {
      initialStatus = req.body.status || 'approved';
      if (initialStatus === 'approved') {
        approverId = req.user._id;
        approvedAtDate = new Date();
      }
    }

    // Đồng bộ thời gian thực: Nếu client gửi chuỗi ngày YYYY-MM-DD (10 ký tự, không có giờ phút), bù giờ phút thực tế hiện tại
    let finalCreatedAt = new Date();
    if (createdAt) {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) {
        if (typeof createdAt === 'string' && createdAt.length === 10 && !createdAt.includes('T')) {
          const now = new Date();
          parsed.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }
        finalCreatedAt = parsed;
      }
    }

    const transactionData = {
      transactionCode: code,
      type: normType,
      category: finalCategory,
      amount: numAmount,
      recipient: targetRecipient,
      personName: targetRecipient,
      paymentMethod: paymentMethod || 'cash',
      description: description ? description.trim() : `Giao dịch ${finalCategory}`,
      address: address ? address.trim() : '',
      attached: finalAttached || (finalAttachedImage ? 'Chứng từ đính kèm (ảnh)' : 'Có chứng từ gốc'),
      attachedImage: finalAttachedImage,
      note: note ? note.trim() : '',
      accountantName: accountantName ? accountantName.trim() : (req.user ? req.user.name : ''),
      cashierName: cashierName ? cashierName.trim() : (req.user ? req.user.name : ''),
      signatureMode: signatureMode === 'sign' ? 'sign' : 'blank',
      referenceOrder: referenceOrder || null,
      referenceReceipt: referenceReceipt || null,
      performedBy: performerId,
      status: initialStatus,
      approvedBy: approverId,
      approvedAt: approvedAtDate,
      createdAt: finalCreatedAt
    };

    const transaction = await Transaction.create(transactionData);
    const populatedTrans = await Transaction.findById(transaction._id)
      .populate('performedBy', 'name email role')
      .populate('approvedBy', 'name email role');

    const typeLabel = normType === 'income' ? 'Phiếu Thu' : 'Phiếu Chi';
    const successMsg = initialStatus === 'pending'
      ? `Đã lập ${typeLabel} "${code}" thành công và gửi tới Ban Giám Đốc / Admin chờ phê duyệt!`
      : `Lập và phê duyệt ${typeLabel} "${code}" thành công!`;

    logActivity(req, {
      module: 'ACCOUNTING',
      action: 'TRANSACTION_CREATE',
      severity: numAmount >= 5000000 ? 'WARNING' : 'INFO',
      targetId: String(transaction._id),
      targetModel: 'Transaction',
      targetLabel: `${typeLabel} #${code}`,
      description: `Lập ${typeLabel} #${code} (${finalCategory}): Số tiền ${numAmount.toLocaleString('vi-VN')} đ cho đối tượng: ${targetRecipient}`,
      diff: [
        { field: 'amount', fieldLabel: 'Số tiền', oldValue: null, newValue: numAmount },
        { field: 'type', fieldLabel: 'Loại phiếu', oldValue: null, newValue: normType }
      ]
    });

    invalidateAccountingCache();
    res.status(201).json({
      success: true,
      message: successMsg,
      data: populatedTrans
    });
  } catch (error) {
    console.error('Lỗi khi tạo phiếu Sổ Quỹ:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo phiếu Sổ Quỹ'
    });
  }
};

// @desc    Cập nhật phiếu Thu / Chi
// @route   PUT /api/accounting/transactions/:id
// @access  Private (Accountant, Admin)
const updateTransaction = async (req, res) => {
  try {
    const {
      transactionCode,
      type,
      amount,
      category,
      recipient,
      personName,
      address,
      paymentMethod,
      description,
      attached,
      attachedImage,
      note,
      accountantName,
      cashierName,
      signatureMode,
      createdAt
    } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu giao dịch'
      });
    }

    if (transaction.status === 'approved' && req.user && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Phiếu đã được Ban Giám Đốc / Admin phê duyệt, Kế toán không thể tự ý sửa đổi!'
      });
    }

    const oldData = {
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      recipient: transaction.recipient
    };

    if (transactionCode && transactionCode.trim()) {
      transaction.transactionCode = transactionCode.trim();
    }
    if (type && ['income', 'expense', 'thu', 'chi'].includes(type)) {
      transaction.type = ['income', 'thu'].includes(type) ? 'income' : 'expense';
    }
    if (amount && Number(amount) > 0) {
      transaction.amount = Number(amount);
    }
    if (category && category.trim()) {
      transaction.category = category.trim();
    }
    if (recipient !== undefined) {
      transaction.recipient = recipient.trim() || 'Khách hàng / Đối tác';
      transaction.personName = transaction.recipient;
    } else if (personName !== undefined) {
      transaction.personName = personName.trim() || 'Khách hàng / Đối tác';
      transaction.recipient = transaction.personName;
    }
    if (address !== undefined) {
      transaction.address = address.trim();
    }
    if (paymentMethod !== undefined) {
      transaction.paymentMethod = paymentMethod.trim() || 'cash';
    }
    if (description !== undefined) {
      transaction.description = description.trim();
    }
    if (attached !== undefined) {
      transaction.attached = attached.trim();
    }
    if (attachedImage !== undefined) {
      transaction.attachedImage = attachedImage.trim();
    }
    if (note !== undefined) {
      transaction.note = note.trim();
    }
    if (accountantName !== undefined) {
      transaction.accountantName = accountantName.trim();
    }
    if (cashierName !== undefined) {
      transaction.cashierName = cashierName.trim();
    }
    if (signatureMode !== undefined) {
      transaction.signatureMode = signatureMode === 'sign' ? 'sign' : 'blank';
    }
    if (createdAt) {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) {
        if (typeof createdAt === 'string' && createdAt.length === 10 && !createdAt.includes('T')) {
          const now = new Date();
          parsed.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }
        transaction.createdAt = parsed;
      }
    }

    await transaction.save();
    const updatedTrans = await Transaction.findById(transaction._id)
      .populate('performedBy', 'name email role');

    const diff = [];
    if (oldData.amount !== transaction.amount) {
      diff.push({ field: 'amount', fieldLabel: 'Số tiền', oldValue: oldData.amount, newValue: transaction.amount });
    }
    if (oldData.type !== transaction.type) {
      diff.push({ field: 'type', fieldLabel: 'Loại phiếu', oldValue: oldData.type, newValue: transaction.type });
    }
    if (oldData.category !== transaction.category) {
      diff.push({ field: 'category', fieldLabel: 'Hạng mục thu/chi', oldValue: oldData.category, newValue: transaction.category });
    }
    if (oldData.recipient !== transaction.recipient) {
      diff.push({ field: 'recipient', fieldLabel: 'Đối tượng giao dịch', oldValue: oldData.recipient, newValue: transaction.recipient });
    }

    logActivity(req, {
      module: 'ACCOUNTING',
      action: 'TRANSACTION_UPDATE',
      severity: diff.some(d => d.field === 'amount') || transaction.amount >= 5000000 ? 'WARNING' : 'INFO',
      targetId: String(transaction._id),
      targetModel: 'Transaction',
      targetLabel: `Phiếu #${transaction.transactionCode}`,
      description: `Cập nhật thông tin phiếu giao dịch #${transaction.transactionCode} (${transaction.category}, ${Number(transaction.amount).toLocaleString('vi-VN')} đ)`,
      diff
    });

    invalidateAccountingCache();
    res.status(200).json({
      success: true,
      message: `Cập nhật phiếu giao dịch "${transaction.transactionCode}" thành công`,
      data: updatedTrans
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật giao dịch'
    });
  }
};

// @desc    Xóa phiếu Thu / Chi
// @route   DELETE /api/accounting/transactions/:id
// @access  Private (Accountant, Admin)
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu giao dịch'
      });
    }

    if (transaction.status === 'approved' && req.user && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Không thể xóa phiếu đã được Ban Giám Đốc / Admin phê duyệt!'
      });
    }

    const deletedCode = transaction.transactionCode;
    const deletedAmount = transaction.amount;
    const deletedType = transaction.type;
    const deletedCategory = transaction.category;
    const deletedRecipient = transaction.recipient;
    const deletedStatus = transaction.status;

    await transaction.deleteOne();

    logActivity(req, {
      module: 'ACCOUNTING',
      action: 'TRANSACTION_DELETE',
      severity: deletedAmount >= 5000000 || deletedStatus === 'approved' ? 'CRITICAL' : 'WARNING',
      targetId: String(transaction._id),
      targetModel: 'Transaction',
      targetLabel: `Phiếu #${deletedCode}`,
      description: `Xóa phiếu ${deletedType === 'income' ? 'Thu' : 'Chi'} #${deletedCode} (${deletedCategory}): Số tiền ${Number(deletedAmount || 0).toLocaleString('vi-VN')} đ của ${deletedRecipient || 'Đối tác'}`,
      diff: [
        { field: 'isDeleted', fieldLabel: 'Trạng thái xóa', oldValue: false, newValue: true },
        { field: 'amount', fieldLabel: 'Số tiền phiếu đã xóa', oldValue: deletedAmount, newValue: null }
      ]
    });

    invalidateAccountingCache();
    res.status(200).json({
      success: true,
      message: 'Đã xóa phiếu giao dịch thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa phiếu giao dịch'
    });
  }
};

// @desc    Phê duyệt phiếu Thu / Chi (Chỉ Ban Giám Đốc / Admin)
// @route   PUT /api/accounting/transactions/:id/approve
// @access  Private (Admin)
const approveTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu giao dịch cần duyệt'
      });
    }

    if (transaction.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: `Phiếu "${transaction.transactionCode}" đã được phê duyệt trước đó!`
      });
    }

    transaction.status = 'approved';
    transaction.approvedBy = req.user ? req.user._id : null;
    transaction.approvedAt = new Date();
    transaction.rejectionReason = '';

    await transaction.save();

    // Nếu phiếu này liên kết với Phiếu trả hàng Nhà cung cấp: cập nhật trạng thái SupplierReturn sang completed & refundStatus sang received
    if (transaction.referenceSupplierReturn) {
      try {
        const SupplierReturn = require('../models/SupplierReturn');
        await SupplierReturn.findByIdAndUpdate(transaction.referenceSupplierReturn, {
          status: 'completed',
          refundStatus: 'received',
          accountantApprovedBy: req.user ? req.user._id : null,
          accountantApprovedAt: new Date(),
          refundTransaction: transaction._id,
          refundTransactionCode: transaction.transactionCode
        });
      } catch (errSupp) {
        console.error('Lỗi khi cập nhật SupplierReturn liên kết trong approveTransaction:', errSupp);
      }
    }

    const populated = await Transaction.findById(transaction._id)
      .populate('performedBy', 'name email role')
      .populate('approvedBy', 'name email role');

    const typeText = ['income', 'thu'].includes(transaction.type) ? 'Phiếu Thu' : 'Phiếu Chi';

    logActivity(req, {
      module: 'ACCOUNTING',
      action: 'TRANSACTION_APPROVE',
      severity: transaction.amount >= 5000000 ? 'WARNING' : 'INFO',
      targetId: String(transaction._id),
      targetModel: 'Transaction',
      targetLabel: `${typeText} #${transaction.transactionCode}`,
      description: `Admin phê duyệt ${typeText} #${transaction.transactionCode} (${transaction.category}): Số tiền ${Number(transaction.amount).toLocaleString('vi-VN')} đ`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái chứng từ', oldValue: 'pending', newValue: 'approved' }
      ]
    });

    invalidateAccountingCache();
    res.status(200).json({
      success: true,
      message: `Đã phê duyệt ${typeText} "${transaction.transactionCode}" thành công! Giao dịch được phép hạch toán vào Sổ Quỹ.`,
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi phê duyệt phiếu giao dịch'
    });
  }
};

// @desc    Từ chối phê duyệt phiếu Thu / Chi (Chỉ Ban Giám Đốc / Admin)
// @route   PUT /api/accounting/transactions/:id/reject
// @access  Private (Admin)
const rejectTransaction = async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu giao dịch'
      });
    }

    transaction.status = 'rejected';
    transaction.approvedBy = req.user ? req.user._id : null;
    transaction.approvedAt = new Date();
    transaction.rejectionReason = (reason || '').trim() || 'Kế toán từ chối duyệt giao dịch này.';

    await transaction.save();

    // Nếu phiếu này liên kết với Phiếu trả hàng Nhà cung cấp: gửi trả lại cho actor Kho
    if (transaction.referenceSupplierReturn) {
      try {
        const SupplierReturn = require('../models/SupplierReturn');
        const StockAdjustment = require('../models/StockAdjustment');
        const supplierReturn = await SupplierReturn.findById(transaction.referenceSupplierReturn);

        if (supplierReturn) {
          // 1. Hoàn lại số lượng tồn kho sách cho Thủ kho (vì phiếu thu hoàn tiền bị Kế toán từ chối, hàng gửi về Kho)
          for (const it of supplierReturn.items) {
            const isFromUnrestocked = Boolean(it.isFromCustomerReturn);
            if (!isFromUnrestocked && it.book) {
              const q = Math.max(1, Number(it.quantity) || 1);
              const currentBook = await Book.findById(it.book);
              if (currentBook) {
                const prevStock = currentBook.stock || 0;
                const newStock = prevStock + q;
                currentBook.stock = newStock;
                await currentBook.save();

                await StockAdjustment.create({
                  book: currentBook._id,
                  bookCode: currentBook.bookCode || '',
                  title: currentBook.title,
                  previousStock: prevStock,
                  adjustmentQty: q,
                  newStock: newStock,
                  reason: `Hoàn nhập kho do Kế toán từ chối duyệt tiền phiếu trả NCC #${supplierReturn.returnCode}`,
                  decision: `Từ chối duyệt: ${transaction.rejectionReason}`,
                  adjustedBy: req.user ? req.user._id : null
                });
              }
            }
          }

          // 2. Cập nhật phiếu trả NCC: gửi về cho actor Kho
          supplierReturn.status = 'admin_approved';
          supplierReturn.accountantRejectReason = transaction.rejectionReason;
          supplierReturn.accountantApprovedBy = req.user ? req.user._id : null;
          supplierReturn.accountantApprovedAt = new Date();
          supplierReturn.warehouseDispatchedAt = null;
          supplierReturn.warehouseDispatchedBy = null;
          supplierReturn.refundTransaction = null;
          supplierReturn.refundTransactionCode = '';
          await supplierReturn.save();

          logActivity(req, {
            module: 'INVENTORY',
            action: 'SUPPLIER_RETURN_REJECT_BY_ACCOUNTANT',
            severity: 'WARNING',
            targetId: String(supplierReturn._id),
            targetModel: 'SupplierReturn',
            targetLabel: `Phiếu trả NCC #${supplierReturn.returnCode}`,
            description: `Kế toán ${req.user ? req.user.name : 'Kế toán'} từ chối duyệt thu tiền hoàn phiếu #${supplierReturn.returnCode}. Hàng đã được hoàn lại tồn kho và gửi về actor Kho xử lý tiếp. Lý do: ${transaction.rejectionReason}`
          });
        }
      } catch (suppErr) {
        console.error('Lỗi khi gửi trả SupplierReturn về cho Kho trong rejectTransaction:', suppErr);
      }
    }

    const populated = await Transaction.findById(transaction._id)
      .populate('performedBy', 'name email role')
      .populate('approvedBy', 'name email role');

    const typeText = ['income', 'thu'].includes(transaction.type) ? 'Phiếu Thu' : 'Phiếu Chi';

    logActivity(req, {
      module: 'ACCOUNTING',
      action: 'TRANSACTION_REJECT',
      severity: 'WARNING',
      targetId: String(transaction._id),
      targetModel: 'Transaction',
      targetLabel: `${typeText} #${transaction.transactionCode}`,
      description: `Admin từ chối duyệt ${typeText} #${transaction.transactionCode}. Lý do: ${transaction.rejectionReason}`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái chứng từ', oldValue: 'pending', newValue: 'rejected' },
        { field: 'rejectionReason', fieldLabel: 'Lý do từ chối', oldValue: '', newValue: transaction.rejectionReason }
      ]
    });

    invalidateAccountingCache();
    res.status(200).json({
      success: true,
      message: `Đã từ chối ${typeText} "${transaction.transactionCode}". Giao dịch KHÔNG được phép thu/chi!`,
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi từ chối duyệt phiếu giao dịch'
    });
  }
};

// @desc    Báo cáo Kết Quả Hoạt Động Kinh Doanh (P&L) Chuẩn Xác
// @desc    Tổng hợp Báo Cáo Tài Chính & Kết Quả Kinh Doanh (P&L): Doanh thu thuần, Tồn kho hiện tại và Lợi nhuận
// @route   GET /api/accounting/financial-report
// @access  Private (Accountant, Admin)
const getFinancialReport = async (req, res) => {
  try {
    const now = Date.now();
    // Cache 60 giây: khi reload trang hay đổi tab, phản hồi ngay lập tức dưới 5ms
    if (!req.query.force && financialReportCache.data && (now - financialReportCache.timestamp < 60000)) {
      return res.status(200).json({
        success: true,
        data: financialReportCache.data,
        cached: true
      });
    }

    // 1. Chạy song song các truy vấn tối ưu và dùng lean()
    const [invoices, allBooks, importReceipts, otherIncomeReceipts] = await Promise.all([
      Invoice.find({ status: { $in: ['completed', 'paid', 'returned'] } })
        .select('status totalAmount finalAmount returnRequest items customerName customerPhone user')
        .lean(),
      Book.find()
        .select('title author category price costPrice stock')
        .lean(),
      ImportReceipt.find({ paymentStatus: { $ne: 'paid' } })
        .select('totalAmount paidAmount paymentStatus')
        .lean(),
      Transaction.find({
        status: 'approved',
        type: { $in: ['thu', 'income'] },
        referenceOrder: null
      }).select('amount').lean()
    ]);

    // Tạo Map chi phí sách và khởi tạo bookSalesMap để tra cứu O(1)
    const bookCostMap = new Map();
    const bookSalesMap = {};
    for (const b of allBooks) {
      const bId = b._id.toString();
      const cp = Number(b.costPrice) > 0 ? Number(b.costPrice) : Math.round(Number(b.price || 0) * 0.65);
      bookCostMap.set(bId, cp);

      bookSalesMap[bId] = {
        id: bId,
        title: b.title,
        author: b.author || 'Chưa rõ tác giả',
        category: b.category || 'Khác',
        price: b.price || 0,
        costPrice: cp,
        stock: b.stock || 0,
        quantity: 0,
        revenue: 0,
        grossProfit: 0
      };
    }

    // 1. DOANH THU BÁN HÀNG GỘP (Gross Sales): Các hóa đơn hoàn tất hoặc đã thanh toán (POS & Web)
    const completedInvoices = invoices.filter(inv => ['completed', 'paid'].includes(inv.status));
    let grossSales = 0;
    for (const inv of completedInvoices) {
      grossSales += Number(inv.finalAmount !== undefined ? inv.finalAmount : inv.totalAmount) || 0;
    }

    // Thu nhập khác từ các phiếu thu đã duyệt vào quỹ (ví dụ: tiền hoàn từ NCC, thanh lý...)
    let otherIncome = 0;
    if (Array.isArray(otherIncomeReceipts)) {
      for (const r of otherIncomeReceipts) {
        otherIncome += Number(r.amount) || 0;
      }
    }
    grossSales += otherIncome;

    // 2. CÁC KHOẢN GIẢM TRỪ DOANH THU (Sales Returns): Đơn hàng khách trả lại
    const returnedInvoices = invoices.filter(inv => inv.status === 'returned');
    let salesReturns = 0;
    for (const inv of returnedInvoices) {
      const refund = (inv.returnRequest && inv.returnRequest.refundAmount) 
        ? Number(inv.returnRequest.refundAmount) 
        : (Number(inv.finalAmount || inv.totalAmount) || 0);
      salesReturns += refund;
    }

    // 3. DOANH THU THUẦN (Net Revenue = Doanh thu gộp - Giảm trừ)
    const netRevenue = Math.max(0, grossSales - salesReturns);

    // 4. GIÁ VỐN HÀNG BÁN THỰC TẾ (COGS) & HIỆU SUẤT SẢN PHẨM / KHÁCH HÀNG
    let cogs = 0;
    const customerMap = {};

    for (const inv of completedInvoices) {
      const custKey = (inv.customerPhone && inv.customerPhone.trim()) 
        ? inv.customerPhone.trim() 
        : (inv.customerName || (inv.user ? inv.user.toString() : 'Khách lẻ'));
      const custName = inv.customerName || 'Khách lẻ';
      const custPhone = inv.customerPhone || '';
      const orderAmount = Number(inv.finalAmount !== undefined ? inv.finalAmount : inv.totalAmount) || 0;

      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          key: custKey,
          name: custName,
          phone: custPhone,
          totalSpent: 0,
          totalProducts: 0,
          orderCount: 0
        };
      }
      customerMap[custKey].totalSpent += orderAmount;
      customerMap[custKey].orderCount += 1;

      let orderItemCount = 0;
      if (Array.isArray(inv.items)) {
        for (const item of inv.items) {
          const qty = Math.max(1, Number(item.quantity) || 1);
          orderItemCount += qty;
          const itemPrice = Number(item.price) || 0;
          const itemSubtotal = Number(item.subtotal) || (qty * itemPrice);

          const bookId = item.book ? (item.book._id ? item.book._id.toString() : item.book.toString()) : null;
          let itemCost = Number(item.costPrice);
          if (!itemCost || itemCost <= 0) {
            itemCost = (bookId && bookCostMap.has(bookId)) ? bookCostMap.get(bookId) : Math.round(itemPrice * 0.65);
          }

          cogs += (itemCost * qty);
          const itemProfit = itemSubtotal - (itemCost * qty);

          if (bookId && bookSalesMap[bookId]) {
            bookSalesMap[bookId].quantity += qty;
            bookSalesMap[bookId].revenue += itemSubtotal;
            bookSalesMap[bookId].grossProfit += itemProfit;
          }
        }
      }
      customerMap[custKey].totalProducts += orderItemCount;
    }

    // 5. LỢI NHUẬN THỰC TẾ (Profit = Doanh thu thuần - Giá vốn COGS)
    const profit = netRevenue - cogs;
    const profitMarginPercent = netRevenue > 0 ? Number(((profit / netRevenue) * 100).toFixed(1)) : 0;

    // 6. TỒN KHO HIỆN TẠI (Current Inventory): Tính trực tiếp từ kho sách thực tế (số lượng cuốn & giá trị vốn)
    let currentInventoryUnits = 0;
    let currentInventoryCostValue = 0;
    let currentInventoryRetailValue = 0;
    for (const b of allBooks) {
      const st = Math.max(0, Number(b.stock) || 0);
      currentInventoryUnits += st;
      const cp = bookCostMap.get(b._id.toString()) || 0;
      currentInventoryCostValue += (st * cp);
      currentInventoryRetailValue += (st * (Number(b.price) || 0));
    }

    // Tổng công nợ nhà cung cấp
    const totalSupplierDebt = importReceipts
      .reduce((sum, r) => sum + Math.max(0, (r.totalAmount || 0) - (r.paidAmount || 0)), 0);

    const allBooksList = Object.values(bookSalesMap);
    const topSellingBooks = allBooksList
      .filter(b => b.revenue > 0 || b.quantity > 0)
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
      .slice(0, 10);

    const slowSellingBooks = allBooksList
      .slice()
      .sort((a, b) => {
        if (a.quantity !== b.quantity) return a.quantity - b.quantity;
        if (a.revenue !== b.revenue) return a.revenue - b.revenue;
        return (b.stock || 0) - (a.stock || 0);
      })
      .slice(0, 10);

    const topSpenderCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const topVolumeCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalProducts - a.totalProducts || b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const reportData = {
      grossSales,
      salesReturns,
      netRevenue,
      cogs,
      profit,
      grossProfit: profit,
      netProfit: profit,
      profitMarginPercent,
      grossMarginPercent: profitMarginPercent,
      netMarginPercent: profitMarginPercent,
      currentInventoryUnits,
      currentInventoryCostValue,
      currentInventoryRetailValue,
      totalSupplierDebt,
      totalCustomerDebt: 0,
      completedInvoicesCount: completedInvoices.length,
      returnedInvoicesCount: returnedInvoices.length,
      totalBooksCount: allBooks.length,
      topSellingBooks,
      slowSellingBooks,
      topSpenderCustomers,
      topVolumeCustomers,
      chart: {
        labels: ['Doanh thu thuần', 'Giá vốn (COGS)', 'Lợi nhuận thực tế', 'Tồn kho (Giá vốn)'],
        data: [netRevenue, cogs, Math.max(0, profit), currentInventoryCostValue]
      }
    };

    financialReportCache = { data: reportData, timestamp: now };

    res.status(200).json({
      success: true,
      data: reportData
    });

    const isExport = req.query.export === 'true' || req.query.action === 'export';
    logActivity(req, {
      module: 'ACCOUNTING',
      action: isExport ? 'FINANCIAL_REPORT_EXPORT' : 'FINANCIAL_REPORT_VIEW',
      severity: isExport ? 'WARNING' : 'INFO',
      targetLabel: 'Báo Cáo Tài Chính & P&L',
      description: isExport
        ? `Xuất báo cáo tài chính P&L: Doanh thu thuần ${netRevenue.toLocaleString('vi-VN')} đ, Giá vốn ${cogs.toLocaleString('vi-VN')} đ, Lợi nhuận ${profit.toLocaleString('vi-VN')} đ`
        : `Truy cập tổng hợp báo cáo tài chính & kết quả kinh doanh P&L (Doanh thu thuần: ${netRevenue.toLocaleString('vi-VN')} đ, Lợi nhuận: ${profit.toLocaleString('vi-VN')} đ)`,
      metadata: {
        grossSales,
        netRevenue,
        cogs,
        profit,
        profitMarginPercent
      }
    });
  } catch (error) {
    console.error('Lỗi khi tính toán Báo Cáo Tài Chính:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tổng hợp báo cáo tài chính'
    });
  }
};

// @desc    Lấy danh sách toàn bộ công nợ Nhà cung cấp từ Phiếu nhập kho
// @route   GET /api/accounting/supplier-debts
// @access  Private (Accountant, Admin)
const getSupplierDebts = async (req, res) => {
  try {
    const receipts = await ImportReceipt.find()
      .populate('supplier', 'name phone address email bankAccount')
      .populate('createdUser', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: receipts.length,
      data: receipts
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách công nợ NCC:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách công nợ Nhà cung cấp'
    });
  }
};

// @desc    Thanh toán nợ Nhà cung cấp cho Phiếu Nhập Kho
// @route   POST /api/accounting/supplier-debts/:id/pay
// @access  Private (Accountant, Admin)
const paySupplierDebt = async (req, res) => {
  try {
    const { amount, paymentMethod, note, accountantName, cashierName } = req.body;
    const payAmount = Number(amount);

    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán phải lớn hơn 0'
      });
    }

    const receipt = await ImportReceipt.findById(req.params.id).populate('supplier');
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập kho'
      });
    }

    const currentPaid = receipt.paidAmount || 0;
    const totalAmount = receipt.totalAmount || 0;
    const remainingDebt = totalAmount - currentPaid;

    if (remainingDebt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Phiếu nhập kho này đã được thanh toán toàn bộ'
      });
    }

    if (payAmount > remainingDebt) {
      return res.status(400).json({
        success: false,
        message: `Số tiền thanh toán (${payAmount.toLocaleString('vi-VN')}₫) vượt quá số nợ còn lại (${remainingDebt.toLocaleString('vi-VN')}₫)`
      });
    }

    const newPaidAmount = currentPaid + payAmount;
    receipt.paidAmount = newPaidAmount;
    receipt.paymentStatus = newPaidAmount >= totalAmount ? 'paid' : 'partial';
    await receipt.save();

    // TỰ ĐỘNG tạo 1 Transaction loại 'expense' (Phiếu Chi NCC)
    const supplierName = receipt.supplier ? (receipt.supplier.name || 'Nhà cung cấp') : (receipt.delivererName || 'Nhà cung cấp');
    const supplierAddress = receipt.supplier ? (receipt.supplier.address || '') : (receipt.supplierAddress || '');
    const transCode = `PC-NK-${Date.now().toString().slice(-6)}`;

    let performerId = (req.user && req.user._id) ? req.user._id : null;
    if (!performerId) {
      const defaultUser = await User.findOne({ role: 'accountant' }) || await User.findOne({ role: 'admin' });
      if (defaultUser) performerId = defaultUser._id;
    }

    const transaction = await Transaction.create({
      transactionCode: transCode,
      type: 'expense',
      amount: payAmount,
      category: 'Chi tiền nhập sách NCC',
      recipient: supplierName,
      personName: supplierName,
      address: supplierAddress,
      paymentMethod: paymentMethod ? paymentMethod.trim() : 'transfer',
      description: `Thanh toán tiền nhập hàng cho phiếu nhập ${receipt.receiptCode} (${supplierName})`,
      attached: `Phiếu nhập kho ${receipt.receiptCode}`,
      note: note ? note.trim() : `Thanh toán nợ phiếu nhập ${receipt.receiptCode}`,
      referenceReceipt: receipt._id,
      accountantName: accountantName ? accountantName.trim() : (req.user ? req.user.name : 'Kế toán'),
      cashierName: cashierName ? cashierName.trim() : '',
      performedBy: performerId
    });

    const populatedTrans = await Transaction.findById(transaction._id)
      .populate('performedBy', 'name email role');

    logActivity(req, {
      module: 'ACCOUNTING',
      action: 'SUPPLIER_DEBT_PAY',
      severity: payAmount >= 5000000 ? 'WARNING' : 'INFO',
      targetId: String(transaction._id),
      targetModel: 'Transaction',
      targetLabel: `Chi trả nợ NCC #${receipt.receiptCode}`,
      description: `Thanh toán ${payAmount.toLocaleString('vi-VN')} đ nợ nhập hàng cho phiếu nhập #${receipt.receiptCode} (${supplierName})`,
      diff: [
        { field: 'paidAmount', fieldLabel: 'Đã thanh toán', oldValue: currentPaid, newValue: newPaidAmount },
        { field: 'paymentStatus', fieldLabel: 'Trạng thái thanh toán', oldValue: 'unpaid/partial', newValue: receipt.paymentStatus }
      ]
    });

    invalidateAccountingCache();
    res.status(200).json({
      success: true,
      message: `Đã thanh toán ${payAmount.toLocaleString('vi-VN')}₫ cho phiếu nhập ${receipt.receiptCode} thành công`,
      data: {
        receipt,
        transaction: populatedTrans
      }
    });
  } catch (error) {
    console.error('Lỗi khi thanh toán nợ NCC:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi thanh toán nợ Nhà cung cấp'
    });
  }
};

// @desc    Thu nợ khách hàng cho Hóa đơn bán hàng
// @route   POST /api/accounting/customer-debts/:id/pay
// @access  Private (Accountant, Admin)
const payCustomerDebt = async (req, res) => {
  try {
    const { amount, paymentMethod, note, accountantName, cashierName } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn'
      });
    }

    const payAmount = Number(amount) || invoice.finalAmount || 0;
    invoice.status = 'paid';
    invoice.paymentStatus = 'paid';
    if (paymentMethod) {
      invoice.paymentMethod = (paymentMethod === 'Chuyển khoản' || paymentMethod === 'transfer') ? 'transfer' : ((paymentMethod === 'Thẻ POS' || paymentMethod === 'card') ? 'pos' : 'cash');
    }
    await invoice.save();

    // TỰ ĐỘNG tạo 1 Transaction loại 'income' (Phiếu Thu bán hàng)
    const transCode = `PT-HD-${Date.now().toString().slice(-6)}`;
    const custName = invoice.customerName || 'Khách lẻ';

    let performerId = (req.user && req.user._id) ? req.user._id : null;
    if (!performerId) {
      const defaultUser = await User.findOne({ role: 'accountant' }) || await User.findOne({ role: 'admin' });
      if (defaultUser) performerId = defaultUser._id;
    }

    const transaction = await Transaction.create({
      transactionCode: transCode,
      type: 'income',
      amount: payAmount,
      category: 'Thu tiền bán sách',
      recipient: custName,
      personName: custName,
      address: invoice.customerAddress || '',
      paymentMethod: invoice.paymentMethod,
      description: `Thu tiền công nợ hóa đơn bán hàng ${invoice.invoiceCode} (${custName})`,
      attached: `Hóa đơn bán hàng ${invoice.invoiceCode}`,
      note: note ? note.trim() : `Thu hồi công nợ hóa đơn ${invoice.invoiceCode}`,
      referenceOrder: invoice._id,
      accountantName: accountantName ? accountantName.trim() : (req.user ? req.user.name : 'Kế toán'),
      cashierName: cashierName ? cashierName.trim() : '',
      performedBy: performerId
    });

    const populatedTrans = await Transaction.findById(transaction._id)
      .populate('performedBy', 'name email role');

    logActivity(req, {
      module: 'ACCOUNTING',
      action: 'CUSTOMER_DEBT_PAY',
      severity: 'INFO',
      targetId: String(transaction._id),
      targetModel: 'Transaction',
      targetLabel: `Thu nợ đơn hàng #${invoice.invoiceCode}`,
      description: `Thu hồi công nợ hóa đơn #${invoice.invoiceCode} (${custName}): ${payAmount.toLocaleString('vi-VN')} đ qua ${invoice.paymentMethod}`,
      diff: [
        { field: 'paymentStatus', fieldLabel: 'Trạng thái thanh toán', oldValue: 'unpaid', newValue: 'paid' }
      ]
    });

    invalidateAccountingCache();
    res.status(200).json({
      success: true,
      message: `Đã thu ${payAmount.toLocaleString('vi-VN')}₫ cho hóa đơn ${invoice.invoiceCode} thành công`,
      data: {
        invoice,
        transaction: populatedTrans
      }
    });
  } catch (error) {
    console.error('Lỗi khi thu nợ khách hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi thu nợ khách hàng'
    });
  }
};

module.exports = {
  getCashbook,
  createCashbookEntry,
  getAllTransactions: getCashbook,
  createTransaction: createCashbookEntry,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  rejectTransaction,
  getFinancialReport,
  getSupplierDebts,
  paySupplierDebt,
  payCustomerDebt,
  getAccountingBadgeCounts,
  invalidateAccountingCache
};
