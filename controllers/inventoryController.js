const Supplier = require('../models/Supplier');
const ImportReceipt = require('../models/ImportReceipt');
const ExportReceipt = require('../models/ExportReceipt');
const AuditReceipt = require('../models/AuditReceipt');
const Book = require('../models/Book');
const StockAdjustment = require('../models/StockAdjustment');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const SupplierReturn = require('../models/SupplierReturn');
const Invoice = require('../models/Invoice');
const Shelf = require('../models/Shelf');
const ShelfActivityLog = require('../models/ShelfActivityLog');
const BookHideRequest = require('../models/BookHideRequest');
const SupplierSuspendRequest = require('../models/SupplierSuspendRequest');
const ShelfCreateRequest = require('../models/ShelfCreateRequest');
const ShelfMaintenanceRequest = require('../models/ShelfMaintenanceRequest');
const ShelfTransferRequest = require('../models/ShelfTransferRequest');
const { logShelfActivity } = require('../utils/shelfActivityLogger');
const {
  getOrCreateBackupShelf,
  getShelfOccupancy,
  updateShelfStatus,
  updateMultipleShelves,
  checkShelfCapacity,
  resolveShelf
} = require('../utils/shelfHelper');
const { logActivity } = require('../utils/auditLogger');

// ================= SUPPLIER CONTROLLERS =================

// @desc    Lấy danh sách tất cả nhà cung cấp kèm thống kê động & KPI
// @route   GET /api/inventory/suppliers hoặc GET /api/admin/suppliers
// @access  Private (Stock, Admin, Staff)
const getAllSuppliers = async (req, res) => {
  try {
    const { status, includeDeleted, keyword } = req.query;
    const filter = {};

    if (includeDeleted !== 'true') {
      filter.isDeleted = { $ne: true };
    }
    if (status && ['active', 'inactive'].includes(status)) {
      filter.status = status;
    }
    if (keyword) {
      const kw = keyword.trim();
      filter.$or = [
        { name: { $regex: kw, $options: 'i' } },
        { code: { $regex: kw, $options: 'i' } },
        { phone: { $regex: kw, $options: 'i' } },
        { email: { $regex: kw, $options: 'i' } },
        { contactPerson: { $regex: kw, $options: 'i' } }
      ];
    }

    // Thực thi song song tất cả 5 truy vấn để giảm tối đa độ trễ
    const [
      suppliers,
      directBooks,
      receiptBooksAgg,
      allBooks,
      receiptStats,
      activeRequests
    ] = await Promise.all([
      Supplier.find(filter).sort({ createdAt: -1, _id: -1 }).lean(),
      Book.find({ isDeleted: { $ne: true }, supplier: { $ne: null } }).select('_id supplier stock').lean(),
      ImportReceipt.aggregate([
        { $match: { supplier: { $ne: null } } },
        { $unwind: '$items' },
        { $match: { 'items.book': { $ne: null } } },
        {
          $group: {
            _id: { supplier: '$supplier', book: '$items.book' }
          }
        }
      ]),
      Book.find({ isDeleted: { $ne: true } }).select('_id stock').lean(),
      ImportReceipt.aggregate([
        {
          $group: {
            _id: '$supplier',
            totalImportAmount: { $sum: '$totalAmount' },
            totalImportReceipts: { $sum: 1 }
          }
        }
      ]),
      SupplierSuspendRequest.find({
        status: { $in: ['pending', 'approved'] }
      }).sort({ createdAt: -1 }).lean()
    ]);

    // 1. Thống kê số đầu sách và tổng tồn kho theo NCC (kết hợp cả sách gán trực tiếp và sách từng nhập hàng)
    const supBookIdsMap = new Map();
    directBooks.forEach(b => {
      const sId = String(b.supplier);
      if (!supBookIdsMap.has(sId)) supBookIdsMap.set(sId, new Set());
      supBookIdsMap.get(sId).add(String(b._id));
    });
    receiptBooksAgg.forEach(item => {
      const sId = String(item._id.supplier);
      if (!supBookIdsMap.has(sId)) supBookIdsMap.set(sId, new Set());
      supBookIdsMap.get(sId).add(String(item._id.book));
    });

    const bookStockMap = new Map(allBooks.map(b => [String(b._id), b.stock || 0]));

    const bookStatsMap = {};
    for (const [sId, bIdSet] of supBookIdsMap.entries()) {
      let totalStock = 0;
      for (const bId of bIdSet) {
        totalStock += (bookStockMap.get(bId) || 0);
      }
      bookStatsMap[sId] = {
        titlesCount: bIdSet.size,
        totalStock
      };
    }

    // 2. Thống kê tổng giá trị nhập hàng và số phiếu nhập theo NCC
    const receiptStatsMap = {};
    receiptStats.forEach(item => {
      if (item._id) receiptStatsMap[item._id.toString()] = item;
    });

    // 3. Thống kê yêu cầu tạm ngưng NCC (SupplierSuspendRequest)

    const suspendRequestMap = {};
    let pendingSuspendCount = 0;
    activeRequests.forEach(req => {
      const sId = (req.supplier || '').toString();
      if (req.status === 'pending') pendingSuspendCount++;
      if (!suspendRequestMap[sId]) {
        suspendRequestMap[sId] = {
          _id: req._id,
          requestCode: req.requestCode,
          status: req.status,
          reason: req.reason,
          note: req.note,
          executionStatus: req.executionStatus,
          requestedByName: req.requestedByName,
          createdAt: req.createdAt,
          reviewedByName: req.reviewedByName,
          adminNote: req.adminNote
        };
      }
    });

    let totalLinkedTitles = 0;
    let totalImportValue = 0;
    let maxImportAmount = -1;
    let topSupplier = null;

    let enriched = suppliers.map(s => {
      const bStat = bookStatsMap[s._id.toString()] || { titlesCount: 0, totalStock: 0 };
      const rStat = receiptStatsMap[s._id.toString()] || { totalImportAmount: 0, totalImportReceipts: 0 };
      const suspendReq = suspendRequestMap[s._id.toString()] || null;

      const titlesCount = bStat.titlesCount || 0;
      const totalStock = bStat.totalStock || 0;
      const totalImportAmount = rStat.totalImportAmount || 0;
      const totalImportReceipts = rStat.totalImportReceipts || 0;

      totalLinkedTitles += titlesCount;
      totalImportValue += totalImportAmount;

      if (totalImportAmount > maxImportAmount || (!topSupplier && titlesCount > 0)) {
        maxImportAmount = totalImportAmount;
        topSupplier = {
          _id: s._id,
          code: s.code,
          name: s.name,
          totalImportAmount,
          titlesCount
        };
      }

      return {
        ...s,
        titlesCount,
        totalStock,
        totalImportAmount,
        totalImportReceipts,
        suspendRequest: suspendReq
      };
    });

    if (status === 'pending_suspend') {
      enriched = enriched.filter(s => s.suspendRequest && s.suspendRequest.status === 'pending');
    }

    res.status(200).json({
      success: true,
      kpi: {
        totalSuppliers: suppliers.length,
        totalLinkedTitles,
        totalImportValue,
        topSupplier: topSupplier || (suppliers[0] ? { name: suppliers[0].name, code: suppliers[0].code } : null),
        pendingSuspendCount
      },
      pendingSuspendCount,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    console.error('Lỗi getAllSuppliers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách nhà cung cấp'
    });
  }
};

// @desc    Lấy chi tiết 1 nhà cung cấp kèm thống kê
// @route   GET /api/inventory/suppliers/:id
// @access  Private (Stock, Admin, Staff)
const getSupplierDetail = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).lean();
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
    }

    // Lấy tất cả sách liên kết trực tiếp HOẶC từng được nhập từ nhà cung cấp này
    const importedBookIds = await ImportReceipt.distinct('items.book', {
      supplier: supplier._id,
      'items.book': { $ne: null }
    });

    const bookFilter = {
      $or: [
        { supplier: supplier._id },
        { _id: { $in: importedBookIds } }
      ],
      isDeleted: { $ne: true }
    };

    const titlesCount = await Book.countDocuments(bookFilter);
    const stockAgg = await Book.aggregate([
      { $match: bookFilter },
      { $group: { _id: null, totalStock: { $sum: '$stock' } } }
    ]);
    const totalStock = stockAgg[0]?.totalStock || 0;

    const receiptAgg = await ImportReceipt.aggregate([
      { $match: { supplier: supplier._id } },
      { $group: { _id: null, totalAmount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    const totalImportAmount = receiptAgg[0]?.totalAmount || 0;
    const totalImportReceipts = receiptAgg[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: {
        ...supplier,
        titlesCount,
        totalStock,
        totalImportAmount,
        totalImportReceipts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi lấy thông tin nhà cung cấp' });
  }
};

// @desc    Lấy danh mục sách do Nhà cung cấp phân phối
// @route   GET /api/inventory/suppliers/:id/books
// @access  Private (Stock, Admin, Staff)
const getSupplierBooks = async (req, res) => {
  try {
    const importedBookIds = await ImportReceipt.distinct('items.book', {
      supplier: req.params.id,
      'items.book': { $ne: null }
    });

    const bookFilter = {
      $or: [
        { supplier: req.params.id },
        { _id: { $in: importedBookIds } }
      ],
      isDeleted: { $ne: true }
    };

    const books = await Book.find(bookFilter)
      .select('bookCode title author category price costPrice stock shelfLocation coverImage status')
      .sort({ title: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi lấy danh sách sách của NCC' });
  }
};

// @desc    Lấy lịch sử các đợt nhập hàng từ Nhà cung cấp
// @route   GET /api/inventory/suppliers/:id/history
// @access  Private (Stock, Admin, Staff)
const getSupplierHistory = async (req, res) => {
  try {
    const receipts = await ImportReceipt.find({ supplier: req.params.id })
      .select('receiptCode receiptDate invoiceNo totalAmount totalQuantity receiverStaff note createdAt items createdUser createdBy')
      .populate('createdBy', 'name')
      .populate('createdUser', 'name')
      .sort({ receiptDate: -1, createdAt: -1 })
      .lean();

    const formatted = receipts.map(r => {
      const items = Array.isArray(r.items) ? r.items : [];
      const totalQty = (typeof r.totalQuantity === 'number' && r.totalQuantity > 0)
        ? r.totalQuantity
        : items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      const itemCount = items.length;
      return {
        ...r,
        totalQuantity: totalQty,
        itemCount,
        creatorName: (r.createdUser && r.createdUser.name) || (r.createdBy && r.createdBy.name) || r.receiverStaff || 'Thủ kho'
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi lấy lịch sử nhập kho của NCC' });
  }
};

// @desc    Thêm nhà cung cấp mới
// @route   POST /api/inventory/suppliers
// @access  Private (Stock, Admin)
const createSupplier = async (req, res) => {
  try {
    let { code, name, contactPerson, phone, email, address, categories, bankAccount, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên nhà cung cấp không được để trống' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không được để trống' });
    }
    const cleanPhone = phone.replace(/[\s.-]/g, '');
    if (!/^0[0-9]{8,9}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số' });
    }
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Email không đúng định dạng' });
    }

    if (!code || !code.trim()) {
      const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3);
      const randNum = Math.floor(10 + Math.random() * 90);
      code = `NCC-${initials}${randNum}`;
    }
    code = code.trim().toUpperCase();

    if (bankAccount && typeof bankAccount === 'object') {
      const rawHolder = (bankAccount.accountHolder || '').trim();
      if (rawHolder) {
        const hasAccents = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/i.test(rawHolder);
        if (hasAccents || !/^[A-Za-z0-9\s.,&'/-]+$/.test(rawHolder)) {
          return res.status(400).json({
            success: false,
            message: 'Tên chủ tài khoản ngân hàng phải viết hoa không dấu (Ví dụ: NGUYEN VAN A)'
          });
        }
        bankAccount.accountHolder = rawHolder.toUpperCase();
      }
    }

    const parsedCategories = Array.isArray(categories)
      ? categories.map(s => String(s).trim()).filter(Boolean)
      : (categories ? String(categories).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (!parsedCategories || parsedCategories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn hoặc nhập ít nhất một Danh mục / Thể loại phân phối cho nhà cung cấp'
      });
    }

    const existing = await Supplier.findOne({ code });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã nhà cung cấp "${code}" đã tồn tại` });
    }

    const supplier = await Supplier.create({
      code,
      name: name.trim(),
      contactPerson: (contactPerson || '').trim(),
      phone: cleanPhone,
      email: email.trim(),
      address: (address || '').trim(),
      categories: parsedCategories,
      bankAccount: bankAccount || {},
      status: status || 'active',
      isDeleted: false
    });

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_CREATE',
      severity: 'INFO',
      targetId: String(supplier._id),
      targetModel: 'Supplier',
      targetLabel: `Nhà cung cấp ${supplier.name}`,
      description: `Tạo mới nhà cung cấp "${supplier.name}" (${supplier.code}), SĐT: ${supplier.phone}`,
      diff: [
        { field: 'code', fieldLabel: 'Mã NCC', oldValue: null, newValue: supplier.code },
        { field: 'name', fieldLabel: 'Tên NCC', oldValue: null, newValue: supplier.name }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Thêm nhà cung cấp thành công',
      data: supplier
    });
  } catch (error) {
    console.error('Lỗi createSupplier:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Dữ liệu nhà cung cấp không hợp lệ'
    });
  }
};

// @desc    Cập nhật thông tin nhà cung cấp
// @route   PUT /api/inventory/suppliers/:id
// @access  Private (Stock, Admin)
const updateSupplier = async (req, res) => {
  try {
    const { code, name, contactPerson, phone, email, address, categories, bankAccount, status, debt } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson.trim();
    if (phone !== undefined) {
      const cleanPhone = phone.replace(/[\s.-]/g, '');
      if (!/^0[0-9]{8,9}$/.test(cleanPhone)) {
        return res.status(400).json({ success: false, message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số' });
      }
      updateData.phone = cleanPhone;
    }
    if (email !== undefined) {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Email không đúng định dạng' });
      }
      updateData.email = email.trim();
    }
    if (address !== undefined) updateData.address = address.trim();
    if (categories !== undefined) {
      const parsedCategories = Array.isArray(categories)
        ? categories.map(s => String(s).trim()).filter(Boolean)
        : String(categories).split(',').map(s => s.trim()).filter(Boolean);
      if (!parsedCategories || parsedCategories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn hoặc nhập ít nhất một Danh mục / Thể loại phân phối cho nhà cung cấp'
        });
      }
      updateData.categories = parsedCategories;
    }
    if (bankAccount !== undefined) {
      if (bankAccount && typeof bankAccount === 'object') {
        const rawHolder = (bankAccount.accountHolder || '').trim();
        if (rawHolder) {
          const hasAccents = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/i.test(rawHolder);
          if (hasAccents || !/^[A-Za-z0-9\s.,&'/-]+$/.test(rawHolder)) {
            return res.status(400).json({
              success: false,
              message: 'Tên chủ tài khoản ngân hàng phải viết hoa không dấu (Ví dụ: NGUYEN VAN A)'
            });
          }
          bankAccount.accountHolder = rawHolder.toUpperCase();
        }
      }
      updateData.bankAccount = bankAccount;
    }
    if (status !== undefined) {
      if (status === 'inactive' && req.user && req.user.role === 'stock') {
        const approvedReq = await SupplierSuspendRequest.findOne({
          supplier: req.params.id,
          status: 'approved',
          executionStatus: { $ne: 'executed' }
        }).sort({ reviewedAt: -1 });

        if (!approvedReq) {
          return res.status(403).json({
            success: false,
            message: 'Nhân viên kho không thể tự ý tạm ngưng nhà cung cấp. Vui lòng gửi yêu cầu tới Quản trị viên và chờ Admin phê duyệt!'
          });
        }

        approvedReq.executionStatus = 'executed';
        approvedReq.executedAt = new Date();
        approvedReq.executedBy = req.user._id;
        approvedReq.executedByName = req.user.name || 'Thủ kho';
        await approvedReq.save();
      }
      updateData.status = status;
    }
    if (req.body.isDeleted !== undefined) updateData.isDeleted = Boolean(req.body.isDeleted);
    if (debt !== undefined) updateData.debt = Number(debt) || 0;
    if (code !== undefined && code.trim()) updateData.code = code.trim().toUpperCase();

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhà cung cấp để cập nhật'
      });
    }

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_UPDATE',
      severity: 'INFO',
      targetId: String(supplier._id),
      targetModel: 'Supplier',
      targetLabel: `Nhà cung cấp ${supplier.name}`,
      description: `Cập nhật thông tin nhà cung cấp "${supplier.name}" (${supplier.code})`
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật nhà cung cấp thành công',
      data: supplier
    });
  } catch (error) {
    console.error('Lỗi updateSupplier:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật nhà cung cấp'
    });
  }
};

// @desc    Xóa / Ẩn nhà cung cấp (Bảo toàn dữ liệu Soft Delete)
// @desc    Tạm ngưng nhà cung cấp (bảo toàn dữ liệu sách, chứng từ & công nợ)
// @route   DELETE /api/inventory/suppliers/:id
// @access  Private (Stock, Admin)
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhà cung cấp'
      });
    }

    // NẾU LÀ ROLE 'stock': Kiểm tra xem đã có yêu cầu tạm ngưng được Admin phê duyệt chưa
    if (req.user && req.user.role === 'stock') {
      const approvedReq = await SupplierSuspendRequest.findOne({
        supplier: supplier._id,
        status: 'approved',
        executionStatus: { $ne: 'executed' }
      }).sort({ reviewedAt: -1 });

      if (!approvedReq) {
        return res.status(403).json({
          success: false,
          message: 'Nhân viên kho không thể tự ý tạm ngưng nhà cung cấp. Vui lòng gửi yêu cầu tới Quản trị viên và chờ Admin phê duyệt!'
        });
      }

      // Đánh dấu yêu cầu đã được thực hiện
      approvedReq.executionStatus = 'executed';
      approvedReq.executedAt = new Date();
      approvedReq.executedBy = req.user._id;
      approvedReq.executedByName = req.user.name || 'Thủ kho';
      await approvedReq.save();
    } else if (req.user && req.user.role === 'admin') {
      // Nếu Admin tự thực hiện trực tiếp, tự động duyệt các yêu cầu pending nếu có
      await SupplierSuspendRequest.updateMany(
        { supplier: supplier._id, status: 'pending' },
        {
          $set: {
            status: 'approved',
            reviewedBy: req.user._id,
            reviewedByName: req.user.name || 'Admin',
            reviewedAt: new Date(),
            adminNote: 'Admin đã trực tiếp thực hiện tạm ngưng nhà cung cấp',
            executionStatus: 'executed',
            executedAt: new Date(),
            executedBy: req.user._id,
            executedByName: req.user.name || 'Admin'
          }
        }
      );
    }

    // Chuyển trạng thái sang Tạm ngưng, vẫn hiển thị ở danh sách với nhãn "Tạm ngưng"
    // nhưng không cho phép tạo phiếu nhập sách mới từ đối tác này
    supplier.status = 'inactive';
    supplier.isDeleted = false;
    await supplier.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_DELETE',
      severity: 'WARNING',
      targetId: String(supplier._id),
      targetModel: 'Supplier',
      targetLabel: `Nhà cung cấp ${supplier.name}`,
      description: `Tạm ngưng / Ẩn nhà cung cấp "${supplier.name}" (${supplier.code})`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái hoạt động', oldValue: 'active', newValue: 'inactive' }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Đã chuyển nhà cung cấp "${supplier.name}" sang trạng thái Tạm ngưng. Dữ liệu sách, công nợ và chứng từ nhập kho được bảo toàn nguyên vẹn.`
    });
  } catch (error) {
    console.error('Lỗi deleteSupplier:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật trạng thái nhà cung cấp'
    });
  }
};


// ================= IMPORT RECEIPT CONTROLLERS =================

// @desc    Lấy danh sách tất cả phiếu nhập kho (hỗ trợ lọc theo status)
// @route   GET /api/inventory/import-receipts
// @access  Private (Stock, Admin, Staff)
const getAllImportReceipts = async (req, res) => {
  try {
    const { status, keyword } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (keyword) {
      const kw = keyword.trim();
      filter.$or = [
        { receiptCode: { $regex: kw, $options: 'i' } },
        { invoiceNo: { $regex: kw, $options: 'i' } },
        { invoiceNumber: { $regex: kw, $options: 'i' } },
        { note: { $regex: kw, $options: 'i' } }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = req.query.all === 'true' ? 1000 : Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      ImportReceipt.find(filter)
        .populate('supplier', 'name code phone email address')
        .populate('createdUser', 'name email role')
        .populate('createdBy', 'name email role')
        .populate('approvedBy', 'name email role')
        .populate('completedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ImportReceipt.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: receipts.length,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      data: receipts
    });
  } catch (error) {
    console.error('Lỗi getAllImportReceipts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách phiếu nhập kho'
    });
  }
};

// @desc    Lấy chi tiết 1 phiếu nhập kho
// @route   GET /api/inventory/import-receipts/:id
// @access  Private (Stock, Admin, Staff)
const getImportReceiptById = async (req, res) => {
  try {
    const receipt = await ImportReceipt.findById(req.params.id)
      .populate('supplier', 'name code phone email address contactPerson')
      .populate('createdUser', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('completedBy', 'name email role')
      .populate('items.book', 'bookCode title author price costPrice stock shelfLocation');

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập kho' });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết phiếu nhập kho'
    });
  }
};

// @desc    Tạo mới phiếu nhập kho (BƯỚC 1: LẬP YÊU CẦU - CHƯA TĂNG TỒN KHO)
// @route   POST /api/inventory/import-receipts
// @access  Private (Stock, Admin)
const createImportReceipt = async (req, res) => {
  try {
    const {
      receiptCode,
      invoiceNo,
      invoiceNumber,
      receiptDate,
      lien,
      warehouseName,
      importWarehouse,
      warehouseAddress,
      reason,
      supplierId,
      supplier,
      supplierAddress,
      delivererName,
      deliveryPerson,
      delivererAddress,
      receiverStaff,
      items,
      shelfPosition,
      note,
      signatures
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Phiếu nhập kho phải chứa ít nhất 1 sản phẩm'
      });
    }

    const suppId = supplierId || supplier;
    if (!suppId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn Nhà cung cấp nhập hàng'
      });
    }

    const supplierDoc = await Supplier.findById(suppId);
    if (!supplierDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin Nhà cung cấp đã chọn'
      });
    }
    if (supplierDoc.status === 'inactive' || supplierDoc.isDeleted) {
      return res.status(400).json({
        success: false,
        message: `Nhà cung cấp "${supplierDoc.name}" đang ở trạng thái Tạm ngưng, không thể lập phiếu nhập sách mới.`
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.importPrice)), 0);
    const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);

    const formattedItems = [];
    for (const item of items) {
      const bId = item.bookId || item.book;
      const bDoc = await Book.findById(bId);
      formattedItems.push({
        book: bId,
        bookCode: (bDoc && bDoc.bookCode) || item.bookCode || '',
        title: (bDoc && bDoc.title) || item.title || '',
        quantity: Number(item.quantity),
        importPrice: Number(item.importPrice),
        unit: item.unit || 'Quyển',
        itemNote: item.itemNote || item.note || ''
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const code = receiptCode || (`PNK-${todayStr}-${Math.floor(100 + Math.random() * 900)}`);

    const receipt = await ImportReceipt.create({
      receiptCode: code,
      invoiceNo: invoiceNo || invoiceNumber || '',
      invoiceNumber: invoiceNo || invoiceNumber || '',
      receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
      lien: lien || '01 - Lưu',
      warehouseName: warehouseName || importWarehouse || 'Kho bán hàng',
      importWarehouse: importWarehouse || warehouseName || 'Kho bán hàng',
      warehouseAddress: warehouseAddress || '123 Đường Sách, P. Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh',
      reason: reason || 'Nhập sách mới từ NCC',
      supplier: suppId,
      supplierAddress: supplierAddress || '',
      delivererName: delivererName || deliveryPerson || '',
      deliveryPerson: deliveryPerson || delivererName || '',
      delivererAddress: delivererAddress || '',
      receiverStaff: receiverStaff || (req.user ? req.user.name : ''),
      createdUser: req.user._id,
      createdBy: req.user._id,
      items: formattedItems,
      totalAmount,
      totalPrice: totalAmount,
      totalQuantity,
      shelfPosition: shelfPosition || '',
      note: note || '',
      status: 'pending_approval', // QUY TRÌNH ĐA TẦNG: Chờ phê duyệt, TUYỆT ĐỐI CHƯA CỘNG TỒN KHO
      signatures: {
        creator: (signatures && signatures.creator) || (req.user ? req.user.name : ''),
        storekeeper: (signatures && signatures.storekeeper) || 'Lê Văn Nam',
        deliverer: (signatures && signatures.deliverer) || delivererName || deliveryPerson || '',
        accountant: (signatures && signatures.accountant) || 'Phạm Thị Mai'
      }
    });

    const populated = await ImportReceipt.findById(receipt._id)
      .populate('supplier', 'name code phone')
      .populate('createdUser', 'name email role');

    logActivity(req, {
      module: 'INVENTORY',
      action: 'IMPORT_RECEIPT_CREATE',
      severity: 'INFO',
      targetId: String(receipt._id),
      targetModel: 'ImportReceipt',
      targetLabel: `Phiếu nhập #${receipt.receiptCode}`,
      description: `Lập phiếu nhập kho mới #${receipt.receiptCode} từ NCC "${supplierDoc.name}" (${formattedItems.length} đầu sách, ${totalQuantity} cuốn, tổng tiền: ${Number(totalAmount).toLocaleString('vi-VN')} đ) -> Chờ phê duyệt`,
      metadata: {
        supplierName: supplierDoc.name,
        totalQuantity,
        totalAmount,
        itemsCount: formattedItems.length
      }
    });

    res.status(201).json({
      success: true,
      message: `Đã gửi yêu cầu phê duyệt Phiếu nhập kho "${receipt.receiptCode}" thành công! Phiếu đang ở trạng thái 'Chờ duyệt' (Chưa thay đổi tồn kho).`,
      data: populated
    });
  } catch (error) {
    console.error('Lỗi khi lập phiếu nhập kho:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi lập phiếu nhập kho'
    });
  }
};


// ================= EXPORT RECEIPT CONTROLLERS =================

// @desc    Lấy danh sách tất cả phiếu xuất kho (hỗ trợ lọc theo status)
// @route   GET /api/inventory/export-receipts
// @access  Private (Stock, Admin, Staff)
const getAllExportReceipts = async (req, res) => {
  try {
    const { status, keyword } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (keyword) {
      const kw = keyword.trim();
      filter.$or = [
        { receiptCode: { $regex: kw, $options: 'i' } },
        { invoiceNo: { $regex: kw, $options: 'i' } },
        { customerName: { $regex: kw, $options: 'i' } },
        { note: { $regex: kw, $options: 'i' } }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = req.query.all === 'true' ? 1000 : Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      ExportReceipt.find(filter)
        .populate('createdUser', 'name email role')
        .populate('createdBy', 'name email role')
        .populate('approvedBy', 'name email role')
        .populate('completedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExportReceipt.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: receipts.length,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      data: receipts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách phiếu xuất kho'
    });
  }
};

// @desc    Lấy chi tiết 1 phiếu xuất kho
// @route   GET /api/inventory/export-receipts/:id
// @access  Private (Stock, Admin, Staff)
const getExportReceiptById = async (req, res) => {
  try {
    const receipt = await ExportReceipt.findById(req.params.id)
      .populate('createdUser', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('completedBy', 'name email role')
      .populate('items.book', 'bookCode title author price stock shelfLocation');

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu xuất kho' });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết phiếu xuất kho'
    });
  }
};

// @desc    Tạo mới phiếu xuất kho (BƯỚC 1: LẬP YÊU CẦU - CHƯA TRỪ TỒN KHO)
// @route   POST /api/inventory/export-receipts
// @access  Private (Stock, Admin)
const createExportReceipt = async (req, res) => {
  try {
    const {
      receiptCode,
      invoiceNo,
      exportDate,
      lien,
      warehouseName,
      warehouseAddress,
      reason,
      customerName,
      customerAddress,
      receiverName,
      receiverAddress,
      staffName,
      items,
      note,
      signatures
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Phiếu xuất kho phải chứa ít nhất 1 sản phẩm'
      });
    }

    // 1. Kiểm tra tính khả dụng của tồn kho trước khi gửi yêu cầu
    const verifiedItems = [];
    for (const item of items) {
      const bookId = item.bookId || item.book;
      const qty = Number(item.quantity);
      const price = Number(item.price);
      const unit = item.unit || 'Quyển';

      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sách với ID: ${bookId}`
        });
      }

      if (book.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Sách "${book.title}" (Mã: ${book.bookCode}) hiện chỉ còn tồn ${book.stock} quyển, không đủ để tạo phiếu xuất ${qty} quyển!`
        });
      }

      verifiedItems.push({
        book: book._id,
        bookCode: book.bookCode || item.bookCode || '',
        title: book.title || item.title || '',
        unit: unit,
        quantity: qty,
        price: price,
        totalPrice: qty * price,
        itemNote: item.itemNote || item.note || ''
      });
    }

    // 2. Tính tổng tiền & tổng số lượng
    const totalAmount = verifiedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalQuantity = verifiedItems.reduce((sum, item) => sum + item.quantity, 0);

    // 3. Tạo phiếu xuất kho ở trạng thái Chờ duyệt (CHƯA TRỪ TỒN KHO)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const code = receiptCode || (`PXK-${todayStr}-${Math.floor(100 + Math.random() * 900)}`);
    const receipt = await ExportReceipt.create({
      receiptCode: code,
      invoiceNo: invoiceNo || '',
      exportDate: exportDate ? new Date(exportDate) : new Date(),
      lien: lien || '01 - Lưu',
      warehouseName: warehouseName || 'Kho bán hàng',
      warehouseAddress: warehouseAddress || '123 Đường Sách, P. Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh',
      reason: reason || 'Bán sỉ / Đối tác',
      customerName: customerName || '',
      customerAddress: customerAddress || '',
      receiverName: receiverName || '',
      receiverAddress: receiverAddress || '',
      staffName: staffName || (req.user ? req.user.name : ''),
      createdUser: req.user._id,
      createdBy: req.user._id,
      items: verifiedItems,
      totalAmount,
      totalQuantity,
      note: note || '',
      status: 'pending_approval', // QUY TRÌNH ĐA TẦNG: Chờ duyệt, TUYỆT ĐỐI CHƯA TRỪ TỒN KHO
      signatures: {
        creator: (signatures && signatures.creator) || (req.user ? req.user.name : ''),
        storekeeper: (signatures && signatures.storekeeper) || 'Lê Văn Nam',
        receiver: (signatures && signatures.receiver) || receiverName || '',
        accountant: (signatures && signatures.accountant) || 'Phạm Thị Mai'
      }
    });

    logActivity(req, {
      module: 'INVENTORY',
      action: 'EXPORT_RECEIPT_CREATE',
      severity: 'INFO',
      targetId: String(receipt._id),
      targetModel: 'ExportReceipt',
      targetLabel: `Phiếu xuất #${receipt.receiptCode}`,
      description: `Lập phiếu xuất kho mới #${receipt.receiptCode} cho "${customerName || receiverName || 'Khách/Đối tác'}" (${verifiedItems.length} đầu sách, ${totalQuantity} cuốn, tổng tiền: ${Number(totalAmount).toLocaleString('vi-VN')} đ) -> Chờ phê duyệt`,
      metadata: {
        receiver: customerName || receiverName,
        totalQuantity,
        totalAmount,
        itemsCount: verifiedItems.length,
        reason: receipt.reason
      }
    });

    res.status(201).json({
      success: true,
      message: `Đã gửi yêu cầu phê duyệt Phiếu xuất kho "${receipt.receiptCode}" thành công! Phiếu đang chờ Ban Giám Đốc xét duyệt (Chưa trừ tồn kho).`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi khi lập phiếu xuất kho:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi lập phiếu xuất kho'
    });
  }
};


// ================= WORKFLOW & APPROVAL CONTROLLERS =================

// @desc    Thêm nhanh nhà cung cấp ngay trên form phiếu nhập
// @route   POST /api/inventory/quick-supplier
// @access  Private (Stock, Admin)
const quickCreateSupplier = async (req, res) => {
  try {
    const { name, phone, address, contactPerson, email } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên nhà cung cấp không được để trống' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Số điện thoại nhà cung cấp không được để trống' });
    }
    const phoneTrimmed = phone.trim();
    if (!/^0[0-9]{8,9}$/.test(phoneTrimmed)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
      });
    }

    if (email && email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Email không đúng định dạng' });
      }
    }

    const existing = await Supplier.findOne({
      isDeleted: { $ne: true },
      $or: [
        { phone: phoneTrimmed },
        ...(email && email.trim() ? [{ email: email.trim().toLowerCase() }] : [])
      ]
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.phone === phoneTrimmed
          ? `Số điện thoại "${phoneTrimmed}" đã tồn tại trên nhà cung cấp ${existing.name} (${existing.code})`
          : `Email "${email}" đã tồn tại trên hệ thống`
      });
    }

    let code;
    let isUnique = false;
    let counter = 0;
    while (!isUnique && counter < 10) {
      counter++;
      const rand = Math.floor(1000 + Math.random() * 9000);
      code = `NCC-${rand}`;
      const codeExists = await Supplier.findOne({ code });
      if (!codeExists) isUnique = true;
    }

    const supplier = await Supplier.create({
      code,
      name: name.trim(),
      phone: phoneTrimmed,
      address: address ? address.trim() : '',
      contactPerson: contactPerson ? contactPerson.trim() : name.trim(),
      email: email && email.trim() ? email.trim().toLowerCase() : `contact.${code.toLowerCase()}@ncc-lamour.vn`,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: `Thêm nhanh nhà cung cấp "${supplier.name}" (${supplier.code}) thành công!`,
      data: supplier
    });
  } catch (error) {
    console.error('Lỗi quickCreateSupplier:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo nhanh nhà cung cấp' });
  }
};

// @desc    Lấy danh sách các phiếu nhập/xuất đang chờ Admin phê duyệt
// @route   GET /api/admin/receipts/pending
// @access  Private (Admin, Staff)
const getPendingReceipts = async (req, res) => {
  try {
    const importReceipts = await ImportReceipt.find({ status: 'pending_approval' })
      .populate('supplier', 'name code phone')
      .populate('createdUser', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('items.book', 'bookCode title price costPrice stock')
      .sort({ createdAt: -1 });

    const exportReceipts = await ExportReceipt.find({ status: 'pending_approval' })
      .populate('createdUser', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('items.book', 'bookCode title price stock')
      .sort({ createdAt: -1 });

    const auditReceipts = await AuditReceipt.find({ status: 'pending_approval' })
      .populate('auditor', 'name email role')
      .populate('createdUser', 'name email role')
      .populate('items.book', 'bookCode title price costPrice stock shelfLocation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalPending: importReceipts.length + exportReceipts.length + auditReceipts.length,
      data: {
        importReceipts,
        exportReceipts,
        auditReceipts
      }
    });
  } catch (error) {
    console.error('Lỗi getPendingReceipts:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi lấy danh sách phiếu chờ duyệt' });
  }
};

// @desc    Admin phê duyệt Phiếu Nhập Kho (BƯỚC 2: PHÊ DUYỆT - TỒN KHO VẪN CHƯA THAY ĐỔI)
// @route   PUT /api/admin/import-receipts/:id/approve
// @access  Private (Admin)
const approveImportReceipt = async (req, res) => {
  try {
    const receipt = await ImportReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập kho' });
    }
    if (receipt.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Phiếu hiện đang ở trạng thái "${receipt.status}", không thể phê duyệt`
      });
    }

    // Kiểm tra sức chứa kệ trước khi phê duyệt phiếu nhập
    const shelfIncomingMap = new Map();
    for (const item of receipt.items) {
      const book = await Book.findById(item.book);
      if (!book) continue;
      let sId = book.shelf ? book.shelf.toString() : null;
      if (!sId && (book.shelfLocation || book.shelfPosition)) {
        const resolved = await resolveShelf(book.shelfLocation || book.shelfPosition);
        if (resolved) sId = resolved._id.toString();
      }
      if (sId) {
        const cur = shelfIncomingMap.get(sId) || 0;
        shelfIncomingMap.set(sId, cur + Number(item.quantity || 0));
      }
    }

    for (const [shelfId, incomingQty] of shelfIncomingMap.entries()) {
      const shelf = await Shelf.findById(shelfId);
      if (!shelf) continue;
      const currentOccupancy = await getShelfOccupancy(shelf._id);
      const remainingSpace = shelf.capacity - currentOccupancy;
      if (incomingQty > remainingSpace) {
        const safeRemaining = Math.max(0, remainingSpace);
        const overCapacity = incomingQty - safeRemaining;
        return res.status(400).json({
          success: false,
          message: `Không thể phê duyệt phiếu nhập kho: Kệ "${shelf.shelfName}" không đủ chỗ! Sức chứa còn lại: ${safeRemaining} chỗ, số lượng nhập: ${incomingQty} cuốn (quá tải ${overCapacity} cuốn). Vui lòng yêu cầu điều chỉnh phân bổ kệ trước khi phê duyệt!`
        });
      }
    }

    receipt.status = 'approved';
    receipt.approvedBy = req.user._id;
    receipt.approvedAt = new Date();
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'IMPORT_RECEIPT_APPROVE',
      severity: 'INFO',
      targetId: String(receipt._id),
      targetModel: 'ImportReceipt',
      targetLabel: `Phiếu nhập kho #${receipt.receiptCode}`,
      description: `Admin phê duyệt Phiếu nhập kho #${receipt.receiptCode} (Tổng tiền: ${Number(receipt.totalAmount || 0).toLocaleString('vi-VN')} đ, SL: ${receipt.totalQuantity || 0} cuốn)`
    });

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt Phiếu nhập kho "${receipt.receiptCode}". Thủ kho đã có thể tiến hành kiểm đếm và hoàn tất nhập kho thực tế!`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi approveImportReceipt:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi phê duyệt phiếu nhập' });
  }
};

// @desc    Admin từ chối Phiếu Nhập Kho kèm lý do
// @route   PUT /api/admin/import-receipts/:id/reject
// @access  Private (Admin)
const rejectImportReceipt = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối phê duyệt' });
    }

    const receipt = await ImportReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập kho' });
    }
    if (receipt.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Phiếu hiện đang ở trạng thái "${receipt.status}", không thể từ chối`
      });
    }

    receipt.status = 'rejected';
    receipt.rejectionReason = reason.trim();
    receipt.approvedBy = req.user._id;
    receipt.approvedAt = new Date();
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'IMPORT_RECEIPT_REJECT',
      severity: 'WARNING',
      targetId: String(receipt._id),
      targetModel: 'ImportReceipt',
      targetLabel: `Phiếu nhập kho #${receipt.receiptCode}`,
      description: `Admin từ chối duyệt Phiếu nhập kho #${receipt.receiptCode}. Lý do: ${reason.trim()}`
    });

    res.status(200).json({
      success: true,
      message: `Đã từ chối Phiếu nhập kho "${receipt.receiptCode}".`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi rejectImportReceipt:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi từ chối phiếu nhập' });
  }
};

// @desc    Admin phê duyệt Phiếu Xuất Kho (BƯỚC 2: PHÊ DUYỆT - TỒN KHO VẪN CHƯA THAY ĐỔI)
// @route   PUT /api/admin/export-receipts/:id/approve
// @access  Private (Admin)
const approveExportReceipt = async (req, res) => {
  try {
    const receipt = await ExportReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu xuất kho' });
    }
    if (receipt.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Phiếu hiện đang ở trạng thái "${receipt.status}", không thể phê duyệt`
      });
    }

    receipt.status = 'approved';
    receipt.approvedBy = req.user._id;
    receipt.approvedAt = new Date();
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'EXPORT_RECEIPT_APPROVE',
      severity: 'INFO',
      targetId: String(receipt._id),
      targetModel: 'ExportReceipt',
      targetLabel: `Phiếu xuất kho #${receipt.receiptCode}`,
      description: `Admin phê duyệt Phiếu xuất kho #${receipt.receiptCode} (Xuất cho: ${receipt.customerName || receipt.receiverName || 'Khách hàng'})`
    });

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt Phiếu xuất kho "${receipt.receiptCode}". Thủ kho đã có thể tiến hành xuất kho thực tế!`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi approveExportReceipt:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi phê duyệt phiếu xuất' });
  }
};

// @desc    Admin từ chối Phiếu Xuất Kho kèm lý do
// @route   PUT /api/admin/export-receipts/:id/reject
// @access  Private (Admin)
const rejectExportReceipt = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối phê duyệt' });
    }

    const receipt = await ExportReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu xuất kho' });
    }
    if (receipt.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Phiếu hiện đang ở trạng thái "${receipt.status}", không thể từ chối`
      });
    }

    receipt.status = 'rejected';
    receipt.rejectionReason = reason.trim();
    receipt.approvedBy = req.user._id;
    receipt.approvedAt = new Date();
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'EXPORT_RECEIPT_REJECT',
      severity: 'WARNING',
      targetId: String(receipt._id),
      targetModel: 'ExportReceipt',
      targetLabel: `Phiếu xuất kho #${receipt.receiptCode}`,
      description: `Admin từ chối duyệt Phiếu xuất kho #${receipt.receiptCode}. Lý do: ${reason.trim()}`
    });

    res.status(200).json({
      success: true,
      message: `Đã từ chối Phiếu xuất kho "${receipt.receiptCode}".`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi rejectExportReceipt:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi từ chối phiếu xuất' });
  }
};

// @desc    Thủ kho thực hiện nhập kho thực tế (BƯỚC 3: CẬP NHẬT TỒN KHO & TỰ ĐỘNG SINH PHIẾU CHI KẾ TOÁN)
// @route   PUT /api/inventory/import-receipts/:id/complete
// @access  Private (Stock, Admin)
const completeImportReceipt = async (req, res) => {
  try {
    const receipt = await ImportReceipt.findById(req.params.id).populate('supplier');
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập kho' });
    }
    if (receipt.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Phiếu nhập kho đang ở trạng thái "${receipt.status}". Chỉ có phiếu đã được Admin phê duyệt (approved) mới được phép tiến hành nhập kho thực tế!`
      });
    }

    // 0. KIỂM TRA SỨC CHỨA CỦA CÁC KỆ SÁCH ĐƯỢC GÁN
    // Gom nhóm số lượng sách nhập theo từng kệ để kiểm tra quá tải
    const shelfIncomingMap = new Map();

    for (const item of receipt.items) {
      const book = await Book.findById(item.book);
      if (!book) continue;

      let sId = book.shelf ? book.shelf.toString() : null;
      if (!sId && (book.shelfLocation || book.shelfPosition)) {
        const resolved = await resolveShelf(book.shelfLocation || book.shelfPosition);
        if (resolved) sId = resolved._id.toString();
      }

      if (sId) {
        const currentIncoming = shelfIncomingMap.get(sId) || 0;
        shelfIncomingMap.set(sId, currentIncoming + Number(item.quantity || 0));
      }
    }

    // Kiểm tra từng kệ có bị tràn dung lượng (overflow) hay không
    for (const [shelfId, incomingQty] of shelfIncomingMap.entries()) {
      const shelf = await Shelf.findById(shelfId);
      if (!shelf) continue;

      const currentOccupancy = await getShelfOccupancy(shelf._id);
      const remainingSpace = shelf.capacity - currentOccupancy;

      if (incomingQty > remainingSpace) {
        const safeRemaining = Math.max(0, remainingSpace);
        const overCapacity = incomingQty - safeRemaining;
        return res.status(400).json({
          success: false,
          message: `Không thể hoàn tất nhập kho: Kệ "${shelf.shelfName}" không đủ chỗ! Sức chứa còn lại: ${safeRemaining} chỗ, số lượng nhập thêm: ${incomingQty} cuốn (quá tải ${overCapacity} cuốn). Vui lòng điều chỉnh phân bổ kệ cho các sách nhập trước khi hoàn tất nhập kho!`
        });
      }
    }

    // 1. TĂNG TỒN KHO CHÍNH THỨC VÀ CẬP NHẬT GIÁ VỐN BÌNH QUÂN GIA QUYỀN (MAC)
    for (const item of receipt.items) {
      const bookDoc = await Book.findById(item.book);
      if (!bookDoc) continue;

      const currentStock = Math.max(0, Number(bookDoc.stock) || 0);
      const currentCost = Number(bookDoc.costPrice) || Math.round((Number(bookDoc.price) || 0) * 0.65);
      const incomingQty = Math.max(1, Number(item.quantity) || 1);
      const incomingPrice = Number(item.importPrice) >= 0 ? Number(item.importPrice) : currentCost;

      // Công thức bình quân gia quyền di động (Moving Average Cost)
      const newStock = currentStock + incomingQty;
      const weightedCost = Math.round(((currentStock * currentCost) + (incomingQty * incomingPrice)) / newStock);

      bookDoc.stock = newStock;
      bookDoc.costPrice = weightedCost;
      await bookDoc.save();
    }

    // Đồng bộ lại trạng thái và sức chứa của các kệ sách liên quan
    const affectedShelfIds = Array.from(shelfIncomingMap.keys());
    await updateMultipleShelves(affectedShelfIds);

    // Ghi nhật ký STOCK_IMPORT cho từng sách được nhập vào kệ
    for (const item of receipt.items) {
      const bookDoc = await Book.findById(item.book).select('title bookCode shelf');
      if (!bookDoc || !bookDoc.shelf) continue;
      const shelfDoc = await Shelf.findById(bookDoc.shelf);
      await logShelfActivity({
        action: 'STOCK_IMPORT',
        description: `Nhập kho thực tế "${bookDoc.title}" (${bookDoc.bookCode}): +${item.quantity} cuốn vào kệ ${shelfDoc ? shelfDoc.shelfCode : ''}. Phiếu nhập: ${receipt.receiptCode}.`,
        book: { _id: bookDoc._id, title: bookDoc.title, bookCode: bookDoc.bookCode },
        toShelf: shelfDoc ? { _id: shelfDoc._id, shelfCode: shelfDoc.shelfCode, shelfName: shelfDoc.shelfName } : null,
        quantity: item.quantity,
        performer: req.user,
        details: { receiptCode: receipt.receiptCode, supplierName: receipt.supplier ? receipt.supplier.name : '' }
      });
    }

    // 2. ĐÁNH DẤU HOÀN TẤT NHẬP KHO VẬT CHẤT (TÁCH BIỆT VỚI THANH TOÁN CỦA KẾ TOÁN)
    receipt.status = 'completed';
    receipt.paymentStatus = 'unpaid'; // Chờ kế toán thực hiện thủ tục chi trả theo kỳ công nợ
    receipt.paidAmount = 0;
    receipt.completedBy = req.user._id;
    receipt.completedAt = new Date();
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'IMPORT_RECEIPT_COMPLETE',
      severity: 'INFO',
      targetId: String(receipt._id),
      targetModel: 'ImportReceipt',
      targetLabel: `Phiếu nhập kho #${receipt.receiptCode}`,
      description: `Hoàn tất nhập kho thực tế Phiếu #${receipt.receiptCode} (${receipt.items.length} đầu sách, ${receipt.totalQuantity || 0} cuốn). Tồn kho và giá vốn MAC đã được cập nhật.`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái nhập kho', oldValue: 'approved', newValue: 'completed' }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Nhập kho thực tế thành công! Đã tăng số lượng tồn kho cho ${receipt.items.length} đầu sách và tính lại giá vốn bình quân gia quyền di động. Phiếu đã hoàn tất lưu kho và chuyển trạng thái chờ Kế toán đối soát thanh toán.`,
      data: {
        receipt
      }
    });
  } catch (error) {
    console.error('Lỗi completeImportReceipt:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi xác nhận hoàn tất nhập kho' });
  }
};

// @desc    Thủ kho thực hiện xuất kho thực tế (BƯỚC 3: TRỪ TỒN KHO THỰC TẾ)
// @route   PUT /api/inventory/export-receipts/:id/complete
// @access  Private (Stock, Admin)
const completeExportReceipt = async (req, res) => {
  try {
    const receipt = await ExportReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu xuất kho' });
    }
    if (receipt.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Phiếu xuất kho đang ở trạng thái "${receipt.status}". Chỉ có phiếu đã được Admin phê duyệt (approved) mới được phép thực hiện xuất kho thực tế!`
      });
    }

    // 1. Kiểm tra tồn kho tại thời điểm xuất thực tế
    for (const item of receipt.items) {
      const book = await Book.findById(item.book);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sách ${item.title || item.bookCode}`
        });
      }
      if (book.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sách "${book.title}" (Mã: ${book.bookCode}) chỉ còn tồn ${book.stock} quyển, không đủ để xuất ${item.quantity} quyển!`
        });
      }
    }

    // 2. TRỪ TỒN KHO CHÍNH THỨC & ĐỒNG BỘ DUNG LƯỢNG KỆ
    const exportAffectedShelves = [];
    for (const item of receipt.items) {
      const updatedBook = await Book.findByIdAndUpdate(
        item.book,
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (updatedBook && updatedBook.shelf) {
        exportAffectedShelves.push(updatedBook.shelf);
      }
    }

    // Đồng bộ trạng thái các kệ sách có sách bị trừ tồn kho
    if (exportAffectedShelves.length > 0) {
      await updateMultipleShelves(exportAffectedShelves);
    }

    // Ghi nhật ký luân chuyển kho
    for (const item of receipt.items) {
      const bookDoc = await Book.findById(item.book).select('title bookCode shelf');
      if (!bookDoc || !bookDoc.shelf) continue;
      const shelfDoc = await Shelf.findById(bookDoc.shelf);
      await logShelfActivity({
        action: 'SHELF_TRANSFER',
        description: `Xuất kho thực tế "${bookDoc.title}" (${bookDoc.bookCode}): -${item.quantity} cuốn từ kệ ${shelfDoc ? shelfDoc.shelfCode : ''}. Phiếu xuất: ${receipt.receiptCode}.`,
        book: { _id: bookDoc._id, title: bookDoc.title, bookCode: bookDoc.bookCode },
        fromShelf: shelfDoc ? { _id: shelfDoc._id, shelfCode: shelfDoc.shelfCode, shelfName: shelfDoc.shelfName } : null,
        quantity: item.quantity,
        performer: req.user,
        details: { receiptCode: receipt.receiptCode, customerName: receipt.customerName || '' }
      });
    }

    // 3. Cập nhật trạng thái phiếu sang completed
    receipt.status = 'completed';
    receipt.completedBy = req.user._id;
    receipt.completedAt = new Date();
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'EXPORT_RECEIPT_COMPLETE',
      severity: 'INFO',
      targetId: String(receipt._id),
      targetModel: 'ExportReceipt',
      targetLabel: `Phiếu xuất kho #${receipt.receiptCode}`,
      description: `Hoàn tất xuất kho thực tế Phiếu #${receipt.receiptCode} (${receipt.items.length} đầu sách, xuất cho: ${receipt.customerName || receipt.receiverName || 'Khách hàng'}). Tồn kho đã được trừ thực tế.`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái xuất kho', oldValue: 'approved', newValue: 'completed' }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Xuất kho thực tế thành công! Đã trừ số lượng tồn kho cho ${receipt.items.length} đầu sách và cập nhật lại dung lượng các kệ sách liên quan.`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi completeExportReceipt:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi xác nhận hoàn tất xuất kho' });
  }
};

// @desc    Hủy phiếu xuất kho (hỗ trợ trạng thái pending_approval hoặc approved khi chưa xuất thực tế)
// @route   PUT /api/inventory/export-receipts/:id/cancel
// @access  Private (Stock, Admin)
const cancelExportReceipt = async (req, res) => {
  try {
    const { reason } = req.body;
    const receipt = await ExportReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu xuất kho' });
    }

    if (!['pending_approval', 'approved'].includes(receipt.status)) {
      return res.status(400).json({
        success: false,
        message: `Phiếu xuất kho đang ở trạng thái "${receipt.status}", không thể hủy bỏ!`
      });
    }

    receipt.status = 'cancelled';
    receipt.rejectionReason = (reason || req.body.cancelReason || 'Đã hủy phiếu xuất kho').trim();
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'EXPORT_RECEIPT_CANCEL',
      severity: 'WARNING',
      targetId: String(receipt._id),
      targetModel: 'ExportReceipt',
      targetLabel: `Phiếu xuất kho #${receipt.receiptCode}`,
      description: `Hủy phiếu xuất kho #${receipt.receiptCode}. Lý do: ${receipt.rejectionReason}`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái xuất kho', oldValue: 'pending_approval/approved', newValue: 'cancelled' }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Đã hủy phiếu xuất kho "${receipt.receiptCode}" thành công!`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi cancelExportReceipt:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi hủy phiếu xuất kho' });
  }
};


// ================= AUDIT RECEIPT CONTROLLERS =================

// @desc    Lấy danh sách tất cả phiếu kiểm kê kho
// @route   GET /api/inventory/audit-receipts
// @desc    Lấy danh sách tất cả biên bản kiểm kê kho (hỗ trợ lọc status & keyword)
// @route   GET /api/inventory/audit-receipts
// @access  Private (Stock, Admin, Staff)
const getAllAuditReceipts = async (req, res) => {
  try {
    const { status, keyword } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (keyword) {
      const kw = keyword.trim();
      filter.$or = [
        { auditCode: { $regex: kw, $options: 'i' } },
        { warehouseName: { $regex: kw, $options: 'i' } },
        { shelfArea: { $regex: kw, $options: 'i' } },
        { auditorStaff: { $regex: kw, $options: 'i' } },
        { conclusion: { $regex: kw, $options: 'i' } }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = req.query.all === 'true' ? 1000 : Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      AuditReceipt.find(filter)
        .populate('auditor', 'name email role')
        .populate('createdUser', 'name email role')
        .populate('adminReview.approvedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditReceipt.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: receipts.length,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      data: receipts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách biên bản kiểm kê kho'
    });
  }
};

// @desc    Lấy chi tiết 1 biên bản kiểm kê kho
// @route   GET /api/inventory/audit-receipts/:id
// @access  Private (Stock, Admin, Staff)
const getAuditReceiptById = async (req, res) => {
  try {
    const receipt = await AuditReceipt.findById(req.params.id)
      .populate('auditor', 'name email role')
      .populate('createdUser', 'name email role')
      .populate('adminReview.approvedBy', 'name email role')
      .populate('items.book', 'bookCode title author price costPrice stock shelfLocation');

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy biên bản kiểm kê' });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết biên bản kiểm kê'
    });
  }
};

// @desc    Tạo mới biên bản kiểm kê kho (BƯỚC 1: LẬP BIÊN BẢN - CHƯA TỰ Ý SỬA TỒN KHO NẾU CÓ CHÊNH LỆCH)
// @route   POST /api/inventory/audit-receipts
// @access  Private (Stock, Admin)
const createAuditReceipt = async (req, res) => {
  try {
    const {
      auditCode,
      auditDate,
      warehouseName,
      shelfArea,
      auditorStaff,
      items,
      conclusion,
      signatures
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Biên bản kiểm kê phải chứa ít nhất 1 sản phẩm được chọn'
      });
    }

    // Xử lý và tính toán chênh lệch từng dòng
    const formattedItems = [];
    let totalSystemStock = 0;
    let totalActualStock = 0;
    let totalDifference = 0;
    let totalDamaged = 0;

    for (const item of items) {
      const bookId = item.bookId || item.book;
      const sysStock = Number(item.systemStock) || 0;
      const actStock = Number(item.actualStock) || 0;
      const dmgStock = Number(item.damagedStock) || 0;
      const diff = actStock - sysStock;

      const book = await Book.findById(bookId);
      const bookCode = (book && book.bookCode) || item.bookCode || '';
      const title = (book && book.title) || item.title || '';

      totalSystemStock += sysStock;
      totalActualStock += actStock;
      totalDifference += diff;
      totalDamaged += dmgStock;

      let itemStatus = 'matched';
      if (dmgStock > 0) itemStatus = 'damaged';
      else if (diff > 0) itemStatus = 'surplus';
      else if (diff < 0) itemStatus = 'deficit';

      const itemReason = (item.reason || item.note || '').trim();
      const itemResolution = (item.resolutionPlan || '').trim();

      // Bắt buộc chọn Nguyên nhân và Đề xuất hướng xử lý cho Admin khi có lệch số liệu
      if (diff !== 0 || dmgStock > 0) {
        if (!itemReason) {
          return res.status(400).json({
            success: false,
            message: `Sách "${title || bookCode || 'được chọn'}" có chênh lệch tồn kho (${diff > 0 ? '+' : ''}${diff} cuốn, ${dmgStock} hỏng). Bắt buộc phải chọn hoặc nhập Nguyên nhân!`
          });
        }
        if (!itemResolution) {
          return res.status(400).json({
            success: false,
            message: `Sách "${title || bookCode || 'được chọn'}" có chênh lệch tồn kho. Bắt buộc phải đề xuất Hướng xử lý cho Admin!`
          });
        }
      }

      formattedItems.push({
        book: bookId,
        bookCode,
        title,
        unit: item.unit || 'Quyển',
        systemStock: sysStock,
        actualStock: actStock,
        damagedStock: dmgStock,
        difference: diff,
        discrepancy: diff, // Hỗ trợ backward compatibility
        itemStatus,
        reason: itemReason,
        resolutionPlan: itemResolution,
        note: (item.note || itemReason).trim()
      });
    }

    const hasDiscrepancy = (totalDifference !== 0 || totalDamaged > 0 || formattedItems.some(i => i.itemStatus !== 'matched'));
    const initialStatus = hasDiscrepancy ? 'pending_approval' : 'completed';

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const code = auditCode || (`KK-${todayStr}-${Math.floor(100 + Math.random() * 900)}`);

    const receipt = await AuditReceipt.create({
      auditCode: code,
      auditDate: auditDate ? new Date(auditDate) : new Date(),
      auditor: req.user ? req.user._id : null,
      createdUser: req.user ? req.user._id : null,
      auditorStaff: auditorStaff || (req.user ? req.user.name : 'Thủ kho'),
      warehouseName: warehouseName || 'Kho bán hàng',
      shelfArea: shelfArea || 'Toàn kho',
      items: formattedItems,
      totalSystemStock,
      totalActualStock,
      totalDamaged,
      totalDifference,
      totalDiscrepancy: totalDifference,
      hasDiscrepancy,
      status: initialStatus,
      conclusion: conclusion || (hasDiscrepancy ? 'Có chênh lệch phát sinh, chuyển báo cáo lên Ban Giám Đốc thẩm định' : 'Số lượng thực tế khớp 100% với sổ sách.'),
      signatures: {
        auditor: (signatures && signatures.auditor) || auditorStaff || (req.user ? req.user.name : ''),
        storekeeper: (signatures && signatures.storekeeper) || 'Lê Văn Nam',
        accountant: (signatures && signatures.accountant) || 'Phạm Thị Mai',
        manager: (signatures && signatures.manager) || 'Nguyễn Văn Quản Lý'
      }
    });

    logActivity(req, {
      module: 'INVENTORY',
      action: 'STOCK_AUDIT_CREATE',
      severity: hasDiscrepancy ? 'WARNING' : 'INFO',
      targetId: String(receipt._id),
      targetModel: 'AuditReceipt',
      targetLabel: `Biên bản kiểm kê #${receipt.auditCode}`,
      description: `Lập biên bản kiểm kê kho #${receipt.auditCode} tại khu vực "${receipt.shelfArea || 'Toàn kho'}" (${formattedItems.length} đầu sách, thực tế: ${totalActualStock}, sổ sách: ${totalSystemStock}, ${hasDiscrepancy ? `lệch: ${totalDifference > 0 ? '+' : ''}${totalDifference} cuốn, hỏng: ${totalDamaged} -> Chờ Admin duyệt` : 'khớp 100%'})`,
      metadata: {
        auditCode: receipt.auditCode,
        shelfArea: receipt.shelfArea,
        hasDiscrepancy,
        totalDifference,
        totalDamaged,
        itemsCount: formattedItems.length
      }
    });

    res.status(201).json({
      success: true,
      message: hasDiscrepancy
        ? `Đã gửi Báo cáo chênh lệch kiểm kê "${receipt.auditCode}" lên Ban Giám Đốc thẩm định và phê duyệt! Tồn kho hệ thống hiện tại chưa thay đổi.`
        : `Lập biên bản kiểm kê kho "${receipt.auditCode}" thành công! Dữ liệu kho khớp 100% với thực tế.`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi khi lưu biên bản kiểm kê:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi lưu biên bản kiểm kê kho'
    });
  }
};

// @desc    Admin phê duyệt điều chỉnh tồn kho sau kiểm kê (BƯỚC 2: CẬP NHẬT TỒN KHO & HẠCH TOÁN TỔN THẤT)
// @route   PUT /api/inventory/audit-receipts/:id/approve hoặc /api/admin/audit-receipts/:id/approve
// @access  Private (Admin)
const approveAuditReceipt = async (req, res) => {
  try {
    const receipt = await AuditReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy biên bản kiểm kê' });
    }

    if (receipt.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Biên bản hiện đang ở trạng thái "${receipt.status}", không thể phê duyệt`
      });
    }

    const { adminNote } = req.body;

    // 1. CẬP NHẬT TỒN KHO THỰC TẾ CHO TỪNG ĐẦU SÁCH & LƯU LỊCH SỬ STOCK ADJUSTMENT
    let totalEstimatedLoss = 0;
    const auditAffectedShelves = [];

    for (const item of receipt.items) {
      const book = await Book.findById(item.book);
      if (!book) continue;

      if (book.shelf) {
        auditAffectedShelves.push(book.shelf);
      }

      const previousStock = book.stock;
      const newStock = item.actualStock;
      const adjustmentQty = newStock - previousStock;

      // Cập nhật tồn kho sách
      book.stock = newStock;
      await book.save();

      // Ghi lịch sử StockAdjustment
      await StockAdjustment.create({
        book: book._id,
        bookCode: book.bookCode || item.bookCode || 'SKU',
        title: book.title,
        previousStock,
        adjustmentQty,
        newStock,
        reason: item.reason || `Điều chỉnh cân bằng theo Biên bản kiểm kê ${receipt.auditCode}`,
        adjustedBy: req.user._id,
        auditReceipt: receipt._id,
        auditCode: receipt.auditCode,
        decision: 'approved_adjust'
      });

      // Ước tính giá trị tổn thất nếu thiếu hoặc hỏng
      const unitCost = book.costPrice && book.costPrice > 0 ? book.costPrice : (book.price * 0.65 || 50000);
      const lossUnits = (item.difference < 0 ? Math.abs(item.difference) : 0) + (item.damagedStock || 0);
      if (lossUnits > 0) {
        totalEstimatedLoss += lossUnits * unitCost;
      }
    }

    // Cập nhật lại dung lượng cho các kệ sách có sản phẩm kiểm kê
    await updateMultipleShelves(auditAffectedShelves);

    // 2. TỰ ĐỘNG TẠO GIAO DỊCH KẾ TOÁN GHI NHẬN TỔN THẤT (NẾU CÓ THẤT THOÁT / HỎNG)
    let lossTransaction = null;
    if (totalEstimatedLoss > 0) {
      const transCode = `PC-KK-${Date.now().toString().slice(-6)}`;
      lossTransaction = await Transaction.create({
        transactionCode: transCode,
        type: 'chi',
        amount: Math.round(totalEstimatedLoss),
        description: `Chi phí tổn thất / hao hụt kiểm kê kho mã ${receipt.auditCode} - ${receipt.shelfArea || 'Toàn kho'}`,
        personName: 'Kho nội bộ / Tổn thất kiểm kê',
        address: receipt.warehouseName || 'Kho bán hàng',
        paymentMethod: 'Khác',
        attached: `Biên bản kiểm kê ${receipt.auditCode}`,
        note: adminNote ? `Ghi nhận tổn thất theo chỉ đạo: ${adminNote}` : `Ghi nhận chi phí tổn thất kiểm kê kho theo biên bản ${receipt.auditCode}`,
        accountantName: 'Phạm Thị Mai',
        cashierName: req.user ? req.user.name : 'Quản trị viên',
        performedBy: req.user._id
      });
    }

    // 3. CẬP NHẬT TRẠNG THÁI BIÊN BẢN SANG APPROVED
    receipt.status = 'approved';
    receipt.adminReview = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      adminNote: adminNote || 'Đã duyệt điều chỉnh cân bằng tồn kho hệ thống.',
      decision: 'approved_adjust'
    };
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'STOCK_AUDIT_APPROVE',
      severity: 'CRITICAL',
      targetId: String(receipt._id),
      targetModel: 'AuditReceipt',
      targetLabel: `Phiếu kiểm kê #${receipt.auditCode}`,
      description: `Phê duyệt điều chỉnh cân bằng tồn kho theo Biên bản #${receipt.auditCode} (${receipt.items.length} đầu sách, ${lossTransaction ? `Tổn thất: ${Math.round(totalEstimatedLoss).toLocaleString('vi-VN')} đ` : 'Khớp tồn kho'})`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái kiểm kê', oldValue: 'pending_approval', newValue: 'approved' },
        { field: 'lossAmount', fieldLabel: 'Giá trị tổn thất ghi nhận', oldValue: 0, newValue: Math.round(totalEstimatedLoss) }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt điều chỉnh tồn kho theo Biên bản "${receipt.auditCode}" thành công! Tồn kho sách đã được đồng bộ chuẩn xác và ghi nhận lịch sử điều chỉnh.${lossTransaction ? ` Đã tự động tạo Phiếu chi ghi nhận chi phí tổn thất (${lossTransaction.transactionCode}) sang phân hệ Kế toán.` : ''}`,
      data: {
        receipt,
        lossTransaction
      }
    });
  } catch (error) {
    console.error('Lỗi approveAuditReceipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi phê duyệt biên bản kiểm kê'
    });
  }
};

// @desc    Admin yêu cầu kiểm đếm lại (Từ chối biên bản kiểm kê kèm ghi chú chỉ đạo)
// @route   PUT /api/inventory/audit-receipts/:id/reject hoặc /api/admin/audit-receipts/:id/reject
// @access  Private (Admin)
const rejectAuditReceipt = async (req, res) => {
  try {
    const { reason, adminNote } = req.body;
    const note = (adminNote || reason || '').trim();

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ghi chú yêu cầu kiểm đếm lại cho Thủ kho'
      });
    }

    const receipt = await AuditReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy biên bản kiểm kê' });
    }

    if (receipt.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Biên bản hiện đang ở trạng thái "${receipt.status}", không thể yêu cầu kiểm đếm lại`
      });
    }

    receipt.status = 'rejected';
    receipt.adminReview = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      adminNote: note,
      decision: 're_audit'
    };
    await receipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'STOCK_AUDIT_REJECT',
      severity: 'WARNING',
      targetId: String(receipt._id),
      targetModel: 'AuditReceipt',
      targetLabel: `Phiếu kiểm kê #${receipt.auditCode}`,
      description: `Admin từ chối duyệt Biên bản kiểm kê #${receipt.auditCode}, yêu cầu kiểm đếm lại. Lý do / Chỉ đạo: ${note}`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái kiểm kê', oldValue: 'pending_approval', newValue: 'rejected' },
        { field: 'adminDecision', fieldLabel: 'Quyết định Admin', oldValue: null, newValue: 're_audit' }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Đã gửi yêu cầu kiểm đếm lại Biên bản "${receipt.auditCode}" tới Thủ kho thành công. Tồn kho hệ thống giữ nguyên.`,
      data: receipt
    });
  } catch (error) {
    console.error('Lỗi rejectAuditReceipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi từ chối biên bản kiểm kê'
    });
  }
};

// @desc    Điều chỉnh tồn kho nhanh cho một cuốn sách
// @route   PUT /api/inventory/books/:id/adjust
// @access  Private (Stock, Admin)
const adjustBookStock = async (req, res) => {
  try {
    const { adjustmentQty, reason } = req.body;
    const qty = Number(adjustmentQty);

    if (isNaN(qty) || qty === 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng điều chỉnh phải là một số khác 0'
      });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sách trong kho'
      });
    }

    if (book.stock + qty < 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể điều chỉnh! Số lượng tồn kho sau điều chỉnh (${book.stock + qty}) không được âm (Tồn kho hiện tại: ${book.stock})`
      });
    }

    const oldStock = book.stock;
    const newStock = book.stock + qty;

    // Kiểm tra sức chứa kệ nếu điều chỉnh tăng số lượng tồn kho
    if (qty > 0 && book.shelf) {
      const capacityCheck = await checkShelfCapacity(book.shelf, newStock, book._id);
      if (!capacityCheck.allowed) {
        return res.status(400).json({
          success: false,
          message: capacityCheck.message
        });
      }
    }

    book.stock = newStock;
    await book.save();

    if (book.shelf) {
      await updateShelfStatus(book.shelf);
    }

    // Lưu vào lịch sử điều chỉnh kho
    const adjustmentRecord = await StockAdjustment.create({
      book: book._id,
      bookCode: book.bookCode || 'SKU',
      title: book.title,
      previousStock: oldStock,
      adjustmentQty: qty,
      newStock: newStock,
      reason: reason ? reason.trim() : 'Điều chỉnh tồn kho nhanh',
      adjustedBy: req.user ? req.user._id : null
    });

    const populatedRecord = await StockAdjustment.findById(adjustmentRecord._id).populate('adjustedBy', 'name email role');

    logActivity(req, {
      module: 'INVENTORY',
      action: 'STOCK_ADJUST',
      severity: Math.abs(qty) >= 20 ? 'WARNING' : 'INFO',
      targetId: String(book._id),
      targetModel: 'Book',
      targetLabel: `Sách "${book.title}"`,
      description: `Điều chỉnh tồn kho sách "${book.title}" (${qty > 0 ? '+' : ''}${qty} cuốn): Tồn từ ${oldStock} -> ${newStock} cuốn. Lý do: ${reason || 'Không ghi chú'}`,
      diff: [
        { field: 'stock', fieldLabel: 'Số lượng tồn kho', oldValue: oldStock, newValue: newStock }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Đã điều chỉnh tồn kho sách "${book.title}" từ ${oldStock} thành ${book.stock} cuốn thành công${reason ? ` (Lý do: ${reason})` : ''}`,
      data: {
        book,
        oldStock,
        newStock: book.stock,
        adjustmentQty: qty,
        reason: reason || '',
        adjustment: populatedRecord
      }
    });
  } catch (error) {
    console.error('Lỗi khi điều chỉnh tồn kho sách:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi điều chỉnh tồn kho sách'
    });
  }
};

// @desc    Lấy toàn bộ lịch sử điều chỉnh kho
// @route   GET /api/inventory/adjustments/history
// @access  Private (Stock, Admin, Staff)
const getAdjustmentHistory = async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find()
      .populate('adjustedBy', 'name email role')
      .populate('book', 'bookCode title price shelfLocation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: adjustments.length,
      data: adjustments
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử điều chỉnh kho:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy lịch sử điều chỉnh kho'
    });
  }
};

// @desc    Tra cứu tồn kho sách tổng hợp đa năng (KPI Aggregation, Lọc & Tìm kiếm)
// @route   GET /api/inventory/lookup
// @access  Private (Stock, Admin, Staff)
const getInventoryLookup = async (req, res) => {
  try {
    const { keyword, q, category, shelf, status, sort } = req.query;
    const searchTerm = (keyword || q || '').trim();

    // 1. XÂY DỰNG BỘ LỌC TÌM KIẾM CHO DANH SÁCH
    const filter = {};

    // Tìm kiếm từ khóa: Tên sách, Tác giả, Mã sách, ISBN
    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { author: { $regex: searchTerm, $options: 'i' } },
        { bookCode: { $regex: searchTerm, $options: 'i' } },
        { isbn: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Lọc theo thể loại
    if (category && category !== 'all') {
      filter.category = { $regex: category.trim(), $options: 'i' };
    }

    // Lọc theo vị trí kệ
    if (shelf && shelf !== 'all') {
      if (shelf === 'none') {
        filter.$or = [
          { shelfLocation: { $exists: false } },
          { shelfLocation: '' },
          { shelfLocation: null }
        ];
      } else {
        filter.shelfLocation = { $regex: shelf.trim(), $options: 'i' };
      }
    }

    // Lọc theo trạng thái tồn kho hoặc trạng thái ẩn / chờ duyệt ẩn
    if (status && status !== 'all') {
      if (status === 'safe' || status === 'in_stock') {
        filter.stock = { $gt: 10 };
      } else if (status === 'low' || status === 'low_stock') {
        filter.stock = { $gte: 1, $lte: 10 };
      } else if (status === 'out' || status === 'out_stock') {
        filter.stock = { $lte: 0 };
      } else if (status === 'hidden') {
        filter.$or = [{ isDeleted: true }, { status: 'hidden' }];
      } else if (status === 'pending_hide') {
        const pendingReqs = await BookHideRequest.find({ status: 'pending' }).select('book').lean();
        const pendingBookIds = pendingReqs.map(r => r.book);
        filter._id = { $in: pendingBookIds };
      }
    }

    // Sắp xếp
    let sortObj = { title: 1 };
    if (sort === 'name_asc') sortObj = { title: 1 };
    else if (sort === 'name_desc') sortObj = { title: -1 };
    else if (sort === 'stock_asc') sortObj = { stock: 1, title: 1 };
    else if (sort === 'stock_desc') sortObj = { stock: -1, title: 1 };
    else if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };

    // 2. CHẠY SONG SONG TÍNH KPI VÀ TRUY VẤN DANH SÁCH QUA PROMISE.ALL
    const kpiPipelinePromise = Book.aggregate([
      {
        $group: {
          _id: null,
          totalTitles: { $sum: 1 },
          totalStock: { $sum: { $ifNull: ['$stock', 0] } },
          totalRetailValue: {
            $sum: { $multiply: [{ $ifNull: ['$stock', 0] }, { $ifNull: ['$price', 0] }] }
          },
          totalCostValue: {
            $sum: {
              $multiply: [
                { $ifNull: ['$stock', 0] },
                {
                  $cond: [
                    { $gt: ['$costPrice', 0] },
                    '$costPrice',
                    { $round: [{ $multiply: [{ $ifNull: ['$price', 0] }, 0.65] }, 0] }
                  ]
                }
              ]
            }
          },
          safeStockCount: {
            $sum: { $cond: [{ $gt: [{ $ifNull: ['$stock', 0] }, 10] }, 1, 0] }
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: [{ $ifNull: ['$stock', 0] }, 1] },
                    { $lte: [{ $ifNull: ['$stock', 0] }, 10] }
                  ]
                },
                1,
                0
              ]
            }
          },
          outStockCount: {
            $sum: { $cond: [{ $lte: [{ $ifNull: ['$stock', 0] }, 0] }, 1, 0] }
          }
        }
      }
    ]);

    const booksPromise = Book.find(filter).sort(sortObj).lean();
    const activeHideRequestsPromise = BookHideRequest.find({
      status: { $in: ['pending', 'approved'] }
    }).sort({ createdAt: -1 }).lean();

    const [kpiAgg, books, activeHideRequests] = await Promise.all([
      kpiPipelinePromise,
      booksPromise,
      activeHideRequestsPromise
    ]);

    const kpiData = kpiAgg[0] || {};
    const totalTitles = kpiData.totalTitles || 0;
    const totalStock = kpiData.totalStock || 0;
    const totalCostValue = Math.round(kpiData.totalCostValue || 0);
    const totalRetailValue = Math.round(kpiData.totalRetailValue || 0);
    const safeStockCount = kpiData.safeStockCount || 0;
    const lowStockCount = kpiData.lowStockCount || 0;
    const outStockCount = kpiData.outStockCount || 0;
    const alertCount = lowStockCount + outStockCount;
    const pendingHideCount = activeHideRequests.filter(r => r.status === 'pending').length;

    const hideMap = {};
    activeHideRequests.forEach(hr => {
      const bId = hr.book.toString();
      if (!hideMap[bId]) {
        hideMap[bId] = {
          _id: hr._id,
          requestCode: hr.requestCode,
          status: hr.status,
          executionStatus: hr.executionStatus,
          reason: hr.reason,
          note: hr.note,
          hideType: hr.hideType || 'partial',
          quantity: hr.quantity || 1,
          remainingStock: hr.remainingStock,
          requestedByName: hr.requestedByName,
          requestedByRole: hr.requestedByRole,
          requestedAt: hr.createdAt,
          reviewedByName: hr.reviewedByName,
          reviewedAt: hr.reviewedAt,
          adminNote: hr.adminNote
        };
      }
    });

    const enrichedBooks = books.map(b => ({
      ...b,
      hideRequest: hideMap[b._id.toString()] || null
    }));

    res.status(200).json({
      success: true,
      kpi: {
        totalTitles,
        totalStock,
        totalCostValue,
        totalRetailValue,
        safeStockCount,
        lowStockCount,
        outStockCount,
        alertCount,
        pendingHideCount
      },
      count: enrichedBooks.length,
      data: enrichedBooks
    });
  } catch (error) {
    console.error('Lỗi khi tra cứu tồn kho:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tra cứu tồn kho'
    });
  }
};

// ================= BOOK HIDE REQUEST CONTROLLERS =================

// @desc    Thủ kho / Nhân viên gửi yêu cầu ẩn sách tới Quản trị viên
// @route   POST /api/inventory/hide-requests
// @access  Private (Stock, Admin, Staff)
const createBookHideRequest = async (req, res) => {
  try {
    const { bookId, reason, note, hideType = 'partial', quantity } = req.body;

    if (!bookId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã ID cuốn sách cần ẩn' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do yêu cầu ẩn sách' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sách trong hệ thống' });
    }

    if (book.isDeleted || book.status === 'hidden') {
      return res.status(400).json({ success: false, message: 'Sách này hiện đã ở trạng thái ẩn trong hệ thống' });
    }

    // Kiểm tra xem đã có yêu cầu ẩn nào đang chờ duyệt hay chưa
    const existingPending = await BookHideRequest.findOne({
      book: book._id,
      status: 'pending'
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: `Sách "${book.title}" đang có một yêu cầu ẩn chờ Admin phê duyệt (Mã: ${existingPending.requestCode}). Vui lòng chờ phản hồi!`
      });
    }

    const targetHideType = hideType === 'all' ? 'all' : 'partial';
    let hideQty = Number(quantity) || (targetHideType === 'all' ? (book.stock || 1) : 1);
    if (hideQty <= 0) hideQty = 1;
    if (targetHideType === 'partial' && book.stock > 0 && hideQty > book.stock) {
      hideQty = book.stock;
    }
    const remainingStock = Math.max(0, (book.stock || 0) - hideQty);

    // Tạo mã yêu cầu duy nhất
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `YCA-${dateStr}-${randomSuffix}`;

    const hideReq = await BookHideRequest.create({
      requestCode,
      book: book._id,
      bookCode: book.bookCode || '',
      title: book.title,
      author: book.author || '',
      category: book.category || '',
      coverImage: book.coverImage || '',
      stock: book.stock || 0,
      hideType: targetHideType,
      quantity: hideQty,
      remainingStock,
      price: book.price || 0,
      shelfLocation: book.shelfLocation || '',
      requestedBy: req.user._id,
      requestedByName: req.user.name || 'Nhân viên kho',
      requestedByRole: req.user.role || 'stock',
      reason: reason.trim(),
      note: (note || '').trim(),
      status: 'pending',
      executionStatus: 'pending_execution'
    });

    logActivity(req, {
      module: 'INVENTORY',
      action: 'BOOK_HIDE_REQUEST',
      severity: 'INFO',
      targetId: String(hideReq._id),
      targetModel: 'BookHideRequest',
      targetLabel: `${hideReq.requestCode} - ${book.title}`,
      description: `Thủ kho ${req.user.name} gửi yêu cầu ${targetHideType === 'partial' ? `ẩn ${hideQty} cuốn (lỗi/hỏng)` : 'ẩn toàn bộ'} sách "${book.title}" (${book.bookCode || ''}) tới Admin. Lý do: ${reason.trim()}`
    });

    const successMsg = targetHideType === 'partial'
      ? `Đã gửi yêu cầu ẩn ${hideQty} cuốn sách "${book.title}" tới Quản trị viên (Còn lại ${remainingStock} cuốn vẫn mở bán bình thường). Vui lòng chờ Admin phê duyệt!`
      : `Đã gửi yêu cầu ẩn toàn bộ đầu sách "${book.title}" tới Quản trị viên. Vui lòng chờ Admin phê duyệt!`;

    res.status(201).json({
      success: true,
      message: successMsg,
      data: hideReq
    });
  } catch (error) {
    console.error('Lỗi createBookHideRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi gửi yêu cầu ẩn sách' });
  }
};

// @desc    Lấy danh sách các yêu cầu ẩn sách (kèm bộ lọc & phân trang)
// @route   GET /api/inventory/hide-requests hoặc GET /api/admin/hide-requests
// @access  Private (Stock, Admin, Staff)
const getAllBookHideRequests = async (req, res) => {
  try {
    const { status, keyword, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    const q = (keyword || search || '').trim();
    if (q) {
      filter.$or = [
        { requestCode: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { bookCode: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } },
        { requestedByName: { $regex: q, $options: 'i' } },
        { reason: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [requests, total, pendingCount, approvedCount, rejectedCount, cancelledCount, allCount] = await Promise.all([
      BookHideRequest.find(filter)
        .populate('requestedBy', 'name email role')
        .populate('reviewedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BookHideRequest.countDocuments(filter),
      BookHideRequest.countDocuments({ status: 'pending' }),
      BookHideRequest.countDocuments({ status: 'approved' }),
      BookHideRequest.countDocuments({ status: 'rejected' }),
      BookHideRequest.countDocuments({ status: 'cancelled' }),
      BookHideRequest.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      total,
      pendingCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
        total: allCount,
        all: allCount
      },
      page: pageNum,
      limit: limitNum,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Lỗi getAllBookHideRequests:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy danh sách yêu cầu ẩn sách' });
  }
};

// @desc    Lấy chi tiết 1 yêu cầu ẩn sách
// @route   GET /api/inventory/hide-requests/:id
// @access  Private (Stock, Admin, Staff)
const getBookHideRequestById = async (req, res) => {
  try {
    const hideReq = await BookHideRequest.findById(req.params.id)
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('book');

    if (!hideReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu ẩn sách' });
    }

    res.status(200).json({ success: true, data: hideReq });
  } catch (error) {
    console.error('Lỗi getBookHideRequestById:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy chi tiết yêu cầu ẩn sách' });
  }
};

// @desc    Admin phê duyệt yêu cầu ẩn sách (có thể tự động ẩn hoặc cấp quyền để kho ẩn)
// @route   PUT /api/inventory/hide-requests/:id/approve hoặc PUT /api/admin/hide-requests/:id/approve
// @access  Private (Admin)
const approveBookHideRequest = async (req, res) => {
  try {
    const { adminNote, autoHide = true } = req.body;

    const hideReq = await BookHideRequest.findById(req.params.id);
    if (!hideReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu ẩn sách' });
    }

    if (hideReq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này đã ở trạng thái "${hideReq.status === 'approved' ? 'Đã duyệt' : hideReq.status === 'rejected' ? 'Đã từ chối' : 'Đã hủy'}", không thể duyệt lại.`
      });
    }

    hideReq.status = 'approved';
    hideReq.reviewedBy = req.user._id;
    hideReq.reviewedByName = req.user.name || 'Admin';
    hideReq.reviewedAt = new Date();
    hideReq.adminNote = (adminNote || '').trim();

    const willAutoHide = autoHide === true || autoHide === 'true';
    if (willAutoHide) {
      // Thực hiện ẩn sách ngay lập tức
      if (hideReq.hideType === 'partial') {
        const qtyToHide = Number(hideReq.quantity) || 1;
        const book = await Book.findById(hideReq.book);
        if (book) {
          book.stock = Math.max(0, (book.stock || 0) - qtyToHide);
          book.damagedStock = (book.damagedStock || 0) + qtyToHide;
          await book.save();
        }
      } else {
        const book = await Book.findByIdAndUpdate(
          hideReq.book,
          {
            isDeleted: true,
            status: 'hidden',
            deletedAt: new Date()
          },
          { new: true }
        );
        if (book && book.shelf) {
          await updateShelfStatus(book.shelf);
        }
      }
      hideReq.executionStatus = 'executed';
      hideReq.executedAt = new Date();
      hideReq.executedBy = req.user._id;
      hideReq.executedByName = req.user.name || 'Admin';
    } else {
      hideReq.executionStatus = 'pending_execution';
    }

    await hideReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'BOOK_HIDE_APPROVE',
      severity: 'WARNING',
      targetId: String(hideReq._id),
      targetModel: 'BookHideRequest',
      targetLabel: `${hideReq.requestCode} - ${hideReq.title}`,
      description: `Admin ${req.user.name} đã phê duyệt yêu cầu ẩn sách "${hideReq.title}" (${hideReq.requestCode}) từ thủ kho ${hideReq.requestedByName}.${willAutoHide ? ' Sách đã được ẩn ngay.' : ' Quyền ẩn đã được cấp cho kho.'}`
    });

    res.status(200).json({
      success: true,
      message: willAutoHide
        ? `Đã phê duyệt yêu cầu và ẩn sách "${hideReq.title}" thành công!`
        : `Đã phê duyệt yêu cầu ẩn sách "${hideReq.title}". Nhân viên kho hiện có thể hoàn tất ẩn sách!`,
      data: hideReq
    });
  } catch (error) {
    console.error('Lỗi approveBookHideRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi duyệt yêu cầu ẩn sách' });
  }
};

// @desc    Admin từ chối yêu cầu ẩn sách
// @route   PUT /api/inventory/hide-requests/:id/reject hoặc PUT /api/admin/hide-requests/:id/reject
// @access  Private (Admin)
const rejectBookHideRequest = async (req, res) => {
  try {
    const { rejectReason, adminNote, reason: reqReason } = req.body;
    const reason = (rejectReason || adminNote || reqReason || '').trim();

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối yêu cầu ẩn sách để thông báo tới thủ kho' });
    }

    const hideReq = await BookHideRequest.findById(req.params.id);
    if (!hideReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu ẩn sách' });
    }

    if (hideReq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${hideReq.status}).`
      });
    }

    hideReq.status = 'rejected';
    hideReq.reviewedBy = req.user._id;
    hideReq.reviewedByName = req.user.name || 'Admin';
    hideReq.reviewedAt = new Date();
    hideReq.adminNote = reason;
    await hideReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'BOOK_HIDE_REJECT',
      severity: 'INFO',
      targetId: String(hideReq._id),
      targetModel: 'BookHideRequest',
      targetLabel: `${hideReq.requestCode} - ${hideReq.title}`,
      description: `Admin ${req.user.name} từ chối yêu cầu ẩn sách "${hideReq.title}" (${hideReq.requestCode}). Lý do: ${reason}`
    });

    res.status(200).json({
      success: true,
      message: `Đã từ chối yêu cầu ẩn sách "${hideReq.title}".`,
      data: hideReq
    });
  } catch (error) {
    console.error('Lỗi rejectBookHideRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi từ chối yêu cầu ẩn sách' });
  }
};

// @desc    Thủ kho hủy yêu cầu ẩn sách đã gửi (khi đang chờ duyệt)
// @route   PUT /api/inventory/hide-requests/:id/cancel
// @access  Private (Stock, Admin)
const cancelBookHideRequest = async (req, res) => {
  try {
    const hideReq = await BookHideRequest.findById(req.params.id);
    if (!hideReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu ẩn sách' });
    }

    if (hideReq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy các yêu cầu đang ở trạng thái chờ duyệt!'
      });
    }

    hideReq.status = 'cancelled';
    await hideReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'BOOK_HIDE_CANCEL',
      severity: 'INFO',
      targetId: String(hideReq._id),
      targetModel: 'BookHideRequest',
      targetLabel: `${hideReq.requestCode} - ${hideReq.title}`,
      description: `Người dùng ${req.user.name} đã hủy yêu cầu ẩn sách "${hideReq.title}" (${hideReq.requestCode})`
    });

    res.status(200).json({
      success: true,
      message: `Đã hủy yêu cầu ẩn sách "${hideReq.title}" thành công.`,
      data: hideReq
    });
  } catch (error) {
    console.error('Lỗi cancelBookHideRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi hủy yêu cầu ẩn sách' });
  }
};

// @desc    Thủ kho thực hiện ẩn sách sau khi Admin đã duyệt yêu cầu
// @route   POST /api/inventory/hide-requests/:id/execute
// @access  Private (Stock, Admin)
const executeBookHideRequest = async (req, res) => {
  try {
    const hideReq = await BookHideRequest.findById(req.params.id);
    if (!hideReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu ẩn sách' });
    }

    if (hideReq.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này chưa được Admin phê duyệt, không thể thực hiện ẩn sách!'
      });
    }

    if (hideReq.executionStatus === 'executed') {
      return res.status(400).json({
        success: false,
        message: 'Sách này đã được thực hiện ẩn trước đó.'
      });
    }

    if (hideReq.hideType === 'partial') {
      const qtyToHide = Number(hideReq.quantity) || 1;
      const book = await Book.findById(hideReq.book);
      if (book) {
        book.stock = Math.max(0, (book.stock || 0) - qtyToHide);
        book.damagedStock = (book.damagedStock || 0) + qtyToHide;
        await book.save();
      }
    } else {
      const book = await Book.findByIdAndUpdate(
        hideReq.book,
        {
          isDeleted: true,
          status: 'hidden',
          deletedAt: new Date()
        },
        { new: true }
      );
      if (book && book.shelf) {
        await updateShelfStatus(book.shelf);
      }
    }

    hideReq.executionStatus = 'executed';
    hideReq.executedAt = new Date();
    hideReq.executedBy = req.user._id;
    hideReq.executedByName = req.user.name || 'Nhân viên kho';
    await hideReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'BOOK_HIDE_EXECUTE',
      severity: 'WARNING',
      targetId: String(hideReq.book),
      targetModel: 'Book',
      targetLabel: `${hideReq.title} (${hideReq.bookCode || ''})`,
      description: `Thủ kho ${req.user.name} đã thực hiện ẩn sách "${hideReq.title}" theo phê duyệt của Admin (Mã YC: ${hideReq.requestCode})`
    });

    res.status(200).json({
      success: true,
      message: `Đã hoàn tất ẩn sách "${hideReq.title}" thành công theo phê duyệt của Quản trị viên!`,
      data: hideReq
    });
  } catch (error) {
    console.error('Lỗi executeBookHideRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi thực hiện ẩn sách' });
  }
};

// ================= SUPPLIER SUSPEND REQUEST CONTROLLERS =================

// @desc    Thủ kho gửi yêu cầu tạm ngưng hợp tác với nhà cung cấp tới Admin
// @route   POST /api/inventory/supplier-suspend-requests
// @access  Private (Stock, Admin)
const createSupplierSuspendRequest = async (req, res) => {
  try {
    const { supplierId, supplier: supIdBody, reason, note } = req.body;
    const targetId = supplierId || supIdBody;

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chỉ định nhà cung cấp cần tạm ngưng' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hoặc nhập lý do tạm ngưng nhà cung cấp' });
    }

    const supplier = await Supplier.findById(targetId);
    if (!supplier || supplier.isDeleted || supplier.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy nhà cung cấp hoặc nhà cung cấp này hiện đã ở trạng thái tạm ngưng.'
      });
    }

    // Kiểm tra xem đã có yêu cầu nào đang ở trạng thái pending cho NCC này chưa
    const existingPending = await SupplierSuspendRequest.findOne({
      supplier: supplier._id,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: `Đã có yêu cầu tạm ngưng (${existingPending.requestCode}) cho nhà cung cấp "${supplier.name}" đang chờ Admin phê duyệt!`
      });
    }

    // Thống kê số đầu sách và tổng tiền nhập hàng để lưu snapshot
    const titlesCount = await Book.countDocuments({ supplier: supplier._id, isDeleted: { $ne: true } });
    const receiptStats = await ImportReceipt.aggregate([
      { $match: { supplier: supplier._id } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalImportAmount = (receiptStats[0] && receiptStats[0].total) || 0;

    const suspendReq = new SupplierSuspendRequest({
      supplier: supplier._id,
      supplierCode: supplier.code || '',
      supplierName: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      titlesCount,
      totalImportAmount,
      debt: supplier.debt || 0,
      requestedBy: req.user._id,
      requestedByName: req.user.name || 'Thủ kho',
      requestedByRole: req.user.role || 'stock',
      reason: reason.trim(),
      note: (note || '').trim(),
      status: 'pending',
      executionStatus: 'pending_execution'
    });

    await suspendReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_SUSPEND_REQUEST_CREATE',
      severity: 'WARNING',
      targetId: String(suspendReq._id),
      targetModel: 'SupplierSuspendRequest',
      targetLabel: `${suspendReq.requestCode} - ${supplier.name}`,
      description: `Nhân viên kho ${req.user.name} đã gửi yêu cầu tạm ngưng nhà cung cấp "${supplier.name}" (${suspendReq.requestCode}). Lý do: ${reason}`
    });

    res.status(201).json({
      success: true,
      message: `Đã gửi yêu cầu tạm ngưng đối tác "${supplier.name}" tới Quản trị viên thành công. Vui lòng chờ Admin phê duyệt!`,
      data: suspendReq
    });
  } catch (error) {
    console.error('Lỗi createSupplierSuspendRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tạo yêu cầu tạm ngưng nhà cung cấp' });
  }
};

// @desc    Lấy danh sách tất cả yêu cầu tạm ngưng nhà cung cấp
// @route   GET /api/inventory/supplier-suspend-requests
// @access  Private (Stock, Admin)
const getAllSupplierSuspendRequests = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { requestCode: { $regex: q, $options: 'i' } },
        { supplierName: { $regex: q, $options: 'i' } },
        { supplierCode: { $regex: q, $options: 'i' } },
        { requestedByName: { $regex: q, $options: 'i' } },
        { reason: { $regex: q, $options: 'i' } },
        { note: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      SupplierSuspendRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SupplierSuspendRequest.countDocuments(filter)
    ]);

    // Thống kê tổng số lượng theo từng trạng thái
    const [pendingCount, approvedCount, rejectedCount, allCount] = await Promise.all([
      SupplierSuspendRequest.countDocuments({ status: 'pending' }),
      SupplierSuspendRequest.countDocuments({ status: 'approved' }),
      SupplierSuspendRequest.countDocuments({ status: 'rejected' }),
      SupplierSuspendRequest.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: allCount
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Lỗi getAllSupplierSuspendRequests:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tải danh sách yêu cầu tạm ngưng' });
  }
};

// @desc    Lấy chi tiết 1 yêu cầu tạm ngưng
// @route   GET /api/inventory/supplier-suspend-requests/:id
// @access  Private (Stock, Admin)
const getSupplierSuspendRequestById = async (req, res) => {
  try {
    const request = await SupplierSuspendRequest.findById(req.params.id)
      .populate('supplier')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .lean();

    if (!request) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu tạm ngưng nhà cung cấp' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('Lỗi getSupplierSuspendRequestById:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi xem chi tiết yêu cầu' });
  }
};

// @desc    Admin phê duyệt yêu cầu tạm ngưng NCC
// @route   PUT /api/inventory/supplier-suspend-requests/:id/approve
// @access  Private (Admin)
const approveSupplierSuspendRequest = async (req, res) => {
  try {
    const { autoSuspend = true, adminNote } = req.body;
    const suspendReq = await SupplierSuspendRequest.findById(req.params.id);

    if (!suspendReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu tạm ngưng nhà cung cấp' });
    }

    if (suspendReq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${suspendReq.status}).`
      });
    }

    suspendReq.status = 'approved';
    suspendReq.reviewedBy = req.user._id;
    suspendReq.reviewedByName = req.user.name || 'Admin';
    suspendReq.reviewedAt = new Date();
    suspendReq.adminNote = (adminNote || '').trim();

    if (autoSuspend === true || autoSuspend === 'true') {
      // Tự động tạm ngưng nhà cung cấp ngay lập tức
      const supplier = await Supplier.findById(suspendReq.supplier);
      if (supplier) {
        supplier.status = 'inactive';
        supplier.isDeleted = false;
        await supplier.save();
      }

      suspendReq.executionStatus = 'executed';
      suspendReq.executedAt = new Date();
      suspendReq.executedBy = req.user._id;
      suspendReq.executedByName = req.user.name || 'Admin';
    } else {
      suspendReq.executionStatus = 'pending_execution';
    }

    await suspendReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_SUSPEND_APPROVE',
      severity: 'WARNING',
      targetId: String(suspendReq._id),
      targetModel: 'SupplierSuspendRequest',
      targetLabel: `${suspendReq.requestCode} - ${suspendReq.supplierName}`,
      description: `Admin ${req.user.name} đã phê duyệt yêu cầu tạm ngưng đối tác "${suspendReq.supplierName}" (${suspendReq.requestCode}). Tự động tạm ngưng: ${autoSuspend ? 'Có' : 'Không'}`
    });

    res.status(200).json({
      success: true,
      message: autoSuspend
        ? `Đã phê duyệt yêu cầu và chuyển đối tác "${suspendReq.supplierName}" sang trạng thái Tạm ngưng thành công!`
        : `Đã phê duyệt yêu cầu tạm ngưng "${suspendReq.supplierName}". Nhân viên kho hiện có thể hoàn tất tạm ngưng!`,
      data: suspendReq
    });
  } catch (error) {
    console.error('Lỗi approveSupplierSuspendRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi phê duyệt yêu cầu' });
  }
};

// @desc    Admin từ chối yêu cầu tạm ngưng NCC
// @route   PUT /api/inventory/supplier-suspend-requests/:id/reject
// @access  Private (Admin)
const rejectSupplierSuspendRequest = async (req, res) => {
  try {
    const { reason, rejectReason, adminNote } = req.body;
    const reasonText = (reason || rejectReason || adminNote || '').trim();

    if (!reasonText) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối yêu cầu tạm ngưng để thông báo tới thủ kho' });
    }

    const suspendReq = await SupplierSuspendRequest.findById(req.params.id);
    if (!suspendReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu tạm ngưng nhà cung cấp' });
    }

    if (suspendReq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${suspendReq.status}).`
      });
    }

    suspendReq.status = 'rejected';
    suspendReq.reviewedBy = req.user._id;
    suspendReq.reviewedByName = req.user.name || 'Admin';
    suspendReq.reviewedAt = new Date();
    suspendReq.adminNote = reasonText;
    await suspendReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_SUSPEND_REJECT',
      severity: 'INFO',
      targetId: String(suspendReq._id),
      targetModel: 'SupplierSuspendRequest',
      targetLabel: `${suspendReq.requestCode} - ${suspendReq.supplierName}`,
      description: `Admin ${req.user.name} từ chối yêu cầu tạm ngưng đối tác "${suspendReq.supplierName}" (${suspendReq.requestCode}). Lý do: ${reasonText}`
    });

    res.status(200).json({
      success: true,
      message: `Đã từ chối yêu cầu tạm ngưng đối tác "${suspendReq.supplierName}".`,
      data: suspendReq
    });
  } catch (error) {
    console.error('Lỗi rejectSupplierSuspendRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi từ chối yêu cầu tạm ngưng' });
  }
};

// @desc    Thủ kho hủy yêu cầu tạm ngưng đã gửi (khi đang chờ duyệt)
// @route   PUT /api/inventory/supplier-suspend-requests/:id/cancel
// @access  Private (Stock, Admin)
const cancelSupplierSuspendRequest = async (req, res) => {
  try {
    const suspendReq = await SupplierSuspendRequest.findById(req.params.id);
    if (!suspendReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu tạm ngưng' });
    }

    if (suspendReq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy các yêu cầu đang ở trạng thái chờ duyệt!'
      });
    }

    suspendReq.status = 'cancelled';
    await suspendReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_SUSPEND_CANCEL',
      severity: 'INFO',
      targetId: String(suspendReq._id),
      targetModel: 'SupplierSuspendRequest',
      targetLabel: `${suspendReq.requestCode} - ${suspendReq.supplierName}`,
      description: `Người dùng ${req.user.name} đã hủy yêu cầu tạm ngưng đối tác "${suspendReq.supplierName}" (${suspendReq.requestCode})`
    });

    res.status(200).json({
      success: true,
      message: `Đã hủy yêu cầu tạm ngưng đối tác "${suspendReq.supplierName}" thành công.`,
      data: suspendReq
    });
  } catch (error) {
    console.error('Lỗi cancelSupplierSuspendRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi hủy yêu cầu tạm ngưng' });
  }
};

// @desc    Thủ kho thực hiện tạm ngưng nhà cung cấp sau khi Admin đã duyệt yêu cầu
// @route   POST /api/inventory/supplier-suspend-requests/:id/execute
// @access  Private (Stock, Admin)
const executeSupplierSuspendRequest = async (req, res) => {
  try {
    const suspendReq = await SupplierSuspendRequest.findById(req.params.id);
    if (!suspendReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu tạm ngưng' });
    }

    if (suspendReq.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này chưa được Admin phê duyệt, không thể thực hiện tạm ngưng!'
      });
    }

    if (suspendReq.executionStatus === 'executed') {
      return res.status(400).json({
        success: false,
        message: 'Nhà cung cấp này đã được thực hiện tạm ngưng trước đó.'
      });
    }

    const supplier = await Supplier.findById(suspendReq.supplier);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp gốc' });
    }

    supplier.status = 'inactive';
    supplier.isDeleted = false;
    await supplier.save();

    suspendReq.executionStatus = 'executed';
    suspendReq.executedAt = new Date();
    suspendReq.executedBy = req.user._id;
    suspendReq.executedByName = req.user.name || 'Nhân viên kho';
    await suspendReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_SUSPEND_EXECUTE',
      severity: 'WARNING',
      targetId: String(supplier._id),
      targetModel: 'Supplier',
      targetLabel: `${supplier.name} (${supplier.code || ''})`,
      description: `Thủ kho ${req.user.name} đã thực hiện tạm ngưng đối tác "${supplier.name}" theo phê duyệt của Admin (Mã YC: ${suspendReq.requestCode})`
    });

    res.status(200).json({
      success: true,
      message: `Đã hoàn tất tạm ngưng đối tác "${supplier.name}" thành công theo phê duyệt của Quản trị viên!`,
      data: suspendReq
    });
  } catch (error) {
    console.error('Lỗi executeSupplierSuspendRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi thực thi tạm ngưng' });
  }
};

// @desc    Chỉnh sửa nhanh vị trí kệ sách
// @route   PUT /api/inventory/books/:id/shelf
// @access  Private (Stock, Admin)
const updateBookShelfLocation = async (req, res) => {
  try {
    const { shelfId, shelfLocation, shelfPosition } = req.body;
    const targetParam = shelfId || shelfPosition || shelfLocation;

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sách để cập nhật vị trí kệ'
      });
    }

    let targetShelf = null;
    if (targetParam && targetParam.toString().trim() !== '') {
      targetShelf = await resolveShelf(targetParam);
      if (!targetShelf) {
        return res.status(400).json({
          success: false,
          message: 'Kệ sách được chọn không tồn tại trong hệ thống.'
        });
      }

      // Kiểm tra sức chứa của kệ đích
      const capacityCheck = await checkShelfCapacity(targetShelf._id, book.stock, book._id);
      if (!capacityCheck.allowed) {
        return res.status(400).json({
          success: false,
          message: capacityCheck.message
        });
      }

      // Nếu sách đã có kệ và chuyển sang kệ khác, nhân viên kho cần gửi yêu cầu điều chuyển
      if (book.shelf && String(book.shelf) !== String(targetShelf._id) && req.user && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Nhân viên kho không thể tự ý đổi kệ sách trực tiếp. Vui lòng gửi Yêu Cầu Điều Chuyển Sách để Quản trị viên (Admin) phê duyệt!'
        });
      }
    }

    const previousShelfId = book.shelf ? book.shelf.toString() : null;
    const previousShelfDoc = (previousShelfId || book.shelfLocation || book.shelfPosition)
      ? await resolveShelf(previousShelfId || book.shelfLocation || book.shelfPosition)
      : null;

    book.shelf = targetShelf ? targetShelf._id : null;
    book.shelfPosition = targetShelf ? targetShelf.shelfName : (shelfPosition || shelfLocation || '');
    book.shelfLocation = targetShelf ? targetShelf.shelfName : (shelfLocation || shelfPosition || '');
    await book.save();

    if (targetShelf) {
      await updateShelfStatus(targetShelf._id);
    }
    if (previousShelfId && (!targetShelf || targetShelf._id.toString() !== previousShelfId)) {
      await updateShelfStatus(previousShelfId);
    }

    // Ghi nhật ký luân chuyển / đổi vị trí kệ sách
    const isShelfChanged = (previousShelfDoc?._id?.toString() || '') !== (targetShelf?._id?.toString() || '');
    if (isShelfChanged) {
      await logShelfActivity({
        action: previousShelfDoc ? 'SHELF_TRANSFER' : 'BOOK_CREATE',
        description: previousShelfDoc
          ? `Chuyển sách "${book.title}" (${book.bookCode || ''}) từ kệ ${previousShelfDoc.shelfCode} sang kệ ${targetShelf ? targetShelf.shelfCode : 'Chưa xếp kệ'}.`
          : `Xếp sách "${book.title}" (${book.bookCode || ''}) vào kệ ${targetShelf ? targetShelf.shelfCode : 'Chưa xếp kệ'}.`,
        book: { _id: book._id, title: book.title, bookCode: book.bookCode || '', author: book.author || '', price: book.price || 0 },
        fromShelf: previousShelfDoc ? { _id: previousShelfDoc._id, shelfCode: previousShelfDoc.shelfCode, shelfName: previousShelfDoc.shelfName } : null,
        fromShelfCode: previousShelfDoc ? previousShelfDoc.shelfCode : '',
        fromShelfName: previousShelfDoc ? previousShelfDoc.shelfName : '',
        toShelf: targetShelf ? { _id: targetShelf._id, shelfCode: targetShelf.shelfCode, shelfName: targetShelf.shelfName } : null,
        toShelfCode: targetShelf ? targetShelf.shelfCode : '',
        toShelfName: targetShelf ? targetShelf.shelfName : '',
        quantity: book.stock || 0,
        performer: req.user,
        details: {
          books: [
            {
              _id: book._id,
              bookCode: book.bookCode || book.isbn || '—',
              title: book.title,
              author: book.author || '—',
              price: book.price || 0,
              quantity: book.stock || 0,
              fromShelfCode: previousShelfDoc ? previousShelfDoc.shelfCode : 'Chưa xếp kệ',
              toShelfCode: targetShelf ? targetShelf.shelfCode : 'Chưa xếp kệ'
            }
          ]
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật vị trí lưu trữ kệ của sách "${book.title}" thành: ${book.shelfLocation || 'Chưa xếp kệ'}`,
      data: book
    });
  } catch (error) {
    console.error('Lỗi cập nhật vị trí kệ:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật vị trí kệ'
    });
  }
};

// ================= SUPPLIER RETURN CONTROLLERS (TRẢ HÀNG NHÀ CUNG CẤP) =================

// @desc    Lập phiếu trả hàng cho Nhà cung cấp (giảm tồn kho & hoàn tiền vào quỹ kế toán)
// @route   POST /api/inventory/supplier-returns
// @access  Private (Stock, Admin)
const createSupplierReturn = async (req, res) => {
  try {
    const {
      returnCode,
      supplierId,
      warehouseName,
      warehouseAddress,
      returnDate,
      reason,
      items,
      sourceInvoiceId,
      note,
      signatures
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn Nhà cung cấp' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một cuốn sách để trả hàng' });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin Nhà cung cấp' });
    }

    const finalCode = (returnCode && returnCode.trim()) ? returnCode.trim() : `TH-NCC-${Date.now().toString().slice(-6)}`;

    // Kiểm tra trùng mã
    const existing = await SupplierReturn.findOne({ returnCode: finalCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã phiếu trả hàng ${finalCode} đã tồn tại trong hệ thống` });
    }

    // 0. Kiểm tra tính khả dụng của tồn kho trước khi xuất trả (nếu xuất từ kho bán thông thường)
    for (const it of items) {
      const isFromUnrestockedCustomerReturn = Boolean(it.isFromCustomerReturn);
      if (!isFromUnrestockedCustomerReturn) {
        const book = await Book.findById(it.bookId || it.book);
        if (!book) {
          return res.status(404).json({ success: false, message: `Không tìm thấy sách có ID ${it.bookId || it.book}` });
        }
        const q = Math.max(1, Number(it.quantity) || 1);
        if (book.stock < q) {
          return res.status(400).json({
            success: false,
            message: `Sách "${book.title}" (Mã: ${book.bookCode || 'SKU'}) hiện chỉ còn tồn ${book.stock} quyển, không đủ số lượng để xuất trả ${q} quyển cho Nhà cung cấp!`
          });
        }
      }
    }

    // Xử lý danh sách items & tính toán (Lưu ý: Chưa trừ kho tại bước này; kho chỉ trừ khi Admin duyệt & Kho ấn OK xuất hàng)
    let totalQty = 0;
    let totalAmt = 0;
    const processedItems = [];

    for (const it of items) {
      const book = await Book.findById(it.bookId || it.book);
      const q = Math.max(1, Number(it.quantity) || 1);
      const p = Number(it.price) >= 0 ? Number(it.price) : (Number(book.costPrice) || Math.round((book.price || 0) * 0.65));
      const lineTotal = q * p;

      totalQty += q;
      totalAmt += lineTotal;

      processedItems.push({
        book: book._id,
        bookCode: book.bookCode,
        title: book.title,
        unit: it.unit || 'Quyển',
        quantity: q,
        price: p,
        totalPrice: lineTotal,
        reason: it.reason || reason || 'Sách lỗi in ấn / thiếu trang',
        note: it.note || ''
      });
    }

    // 2. TẠO BẢN GHI PHIẾU TRẢ HÀNG Ở TRẠNG THÁI CHỜ ADMIN PHÊ DUYỆT (pending_admin)
    const staffName = req.user ? req.user.name : 'Nhân viên Kho';

    const supplierReturn = await SupplierReturn.create({
      returnCode: finalCode,
      supplier: supplier._id,
      supplierName: supplier.name,
      supplierCode: supplier.code,
      supplierAddress: supplier.address,
      supplierPhone: supplier.phone,
      warehouseName: warehouseName || 'Kho bán hàng trung tâm',
      warehouseAddress: warehouseAddress || '123 Đường Sách, P. Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh',
      returnDate: returnDate ? new Date(returnDate) : new Date(),
      reason: reason || 'Trả hàng sách lỗi / thừa số lượng',
      items: processedItems,
      totalQuantity: totalQty,
      totalAmount: totalAmt,
      status: 'pending_admin', // Bước 1: Chờ Admin phê duyệt
      refundStatus: 'pending',
      refundTransaction: null,
      refundTransactionCode: '',
      sourceInvoice: sourceInvoiceId || null,
      note: note || '',
      createdBy: req.user ? req.user._id : null,
      staffName,
      signatures: {
        creator: (signatures && signatures.creator) || staffName,
        storekeeper: (signatures && signatures.storekeeper) || 'Lê Văn Nam',
        supplierRep: (signatures && signatures.supplierRep) || (supplier.contactPerson || supplier.name),
        accountant: (signatures && signatures.accountant) || 'Phạm Thị Mai'
      }
    });

    const populatedReturn = await SupplierReturn.findById(supplierReturn._id)
      .populate('supplier', 'name code phone email contactPerson')
      .populate('items.book', 'title bookCode price category coverImage')
      .populate('createdBy', 'name email role');

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_RETURN_CREATE',
      severity: 'WARNING',
      targetId: String(supplierReturn._id),
      targetModel: 'SupplierReturn',
      targetLabel: `Phiếu trả NCC #${supplierReturn.returnCode}`,
      description: `Nhân viên kho ${staffName} lập phiếu yêu cầu trả hàng sách lỗi #${supplierReturn.returnCode} cho NCC "${supplier.name}" (${processedItems.length} đầu sách, ${totalQty} cuốn, tổng giá trị: ${Number(totalAmt).toLocaleString('vi-VN')} đ). Chờ Admin phê duyệt.`,
      metadata: {
        supplierName: supplier.name,
        returnCode: supplierReturn.returnCode,
        totalQuantity: totalQty,
        totalAmount: totalAmt,
        sourceInvoiceId
      }
    });

    res.status(201).json({
      success: true,
      message: `Đã lập phiếu trả hàng NCC "${finalCode}" và gửi yêu cầu tới Quản trị viên (Admin) phê duyệt! Tồn kho sẽ được giữ nguyên cho tới khi Admin duyệt và Kho xác nhận xuất hàng thực tế.`,
      data: populatedReturn
    });
  } catch (error) {
    console.error('Lỗi khi lập phiếu trả hàng NCC:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lập phiếu trả hàng Nhà cung cấp'
    });
  }
};

// @desc    Admin phê duyệt yêu cầu trả hàng Nhà cung cấp -> Chuyển lại cho Kho xuất hàng thực tế
// @route   PUT /api/inventory/supplier-returns/:id/admin-approve
// @access  Private (Admin)
const adminApproveSupplierReturn = async (req, res) => {
  try {
    const returnReceipt = await SupplierReturn.findById(req.params.id);
    if (!returnReceipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu trả hàng Nhà cung cấp' });
    }

    if (returnReceipt.status !== 'pending_admin' && returnReceipt.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Phiếu trả hàng không ở trạng thái chờ duyệt (Hiện tại: ${returnReceipt.status})`
      });
    }

    returnReceipt.status = 'admin_approved';
    returnReceipt.adminApprovedBy = req.user ? req.user._id : null;
    returnReceipt.adminApprovedAt = new Date();
    returnReceipt.adminRejectReason = '';
    await returnReceipt.save();

    const populated = await SupplierReturn.findById(returnReceipt._id)
      .populate('supplier', 'name code phone')
      .populate('items.book', 'title bookCode price coverImage')
      .populate('adminApprovedBy', 'name email role')
      .populate('createdBy', 'name email role');

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_RETURN_ADMIN_APPROVE',
      severity: 'INFO',
      targetId: String(returnReceipt._id),
      targetModel: 'SupplierReturn',
      targetLabel: `Phiếu trả NCC #${returnReceipt.returnCode}`,
      description: `Quản trị viên ${req.user ? req.user.name : 'Admin'} đã phê duyệt yêu cầu trả hàng NCC #${returnReceipt.returnCode} (${returnReceipt.totalQuantity} cuốn, ${Number(returnReceipt.totalAmount).toLocaleString('vi-VN')} đ). Chuyển lại cho Kho để xuất hàng thực tế.`
    });

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt yêu cầu trả hàng NCC #${returnReceipt.returnCode}! Yêu cầu đã được chuyển lại cho Kho để tiến hành đóng gói & xuất hàng.`,
      data: populated
    });
  } catch (error) {
    console.error('Lỗi khi Admin duyệt yêu cầu trả hàng NCC:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi duyệt yêu cầu trả hàng NCC' });
  }
};

// @desc    Admin từ chối yêu cầu trả hàng Nhà cung cấp
// @route   PUT /api/inventory/supplier-returns/:id/admin-reject
// @access  Private (Admin)
const adminRejectSupplierReturn = async (req, res) => {
  try {
    const { reason } = req.body;
    const returnReceipt = await SupplierReturn.findById(req.params.id);
    if (!returnReceipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu trả hàng Nhà cung cấp' });
    }

    if (returnReceipt.status !== 'pending_admin' && returnReceipt.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Phiếu trả hàng không ở trạng thái chờ duyệt (Hiện tại: ${returnReceipt.status})`
      });
    }

    const rejectReason = (reason && reason.trim()) ? reason.trim() : 'Admin từ chối yêu cầu trả hàng';
    returnReceipt.status = 'rejected';
    returnReceipt.adminApprovedBy = req.user ? req.user._id : null;
    returnReceipt.adminApprovedAt = new Date();
    returnReceipt.adminRejectReason = rejectReason;
    await returnReceipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_RETURN_ADMIN_REJECT',
      severity: 'WARNING',
      targetId: String(returnReceipt._id),
      targetModel: 'SupplierReturn',
      targetLabel: `Phiếu trả NCC #${returnReceipt.returnCode}`,
      description: `Quản trị viên ${req.user ? req.user.name : 'Admin'} từ chối yêu cầu trả hàng NCC #${returnReceipt.returnCode}. Lý do: ${rejectReason}`
    });

    res.status(200).json({
      success: true,
      message: `Đã từ chối yêu cầu trả hàng NCC #${returnReceipt.returnCode}.`,
      data: returnReceipt
    });
  } catch (error) {
    console.error('Lỗi khi Admin từ chối yêu cầu trả hàng NCC:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi từ chối yêu cầu trả hàng NCC' });
  }
};

// @desc    Thủ kho xác nhận xuất gửi hàng lại cho Nhà cung cấp (Ấn OK) -> Tự động sinh Phiếu Thu gửi sang Kế toán
// @route   PUT /api/inventory/supplier-returns/:id/warehouse-dispatch
// @access  Private (Stock, Admin)
const warehouseDispatchSupplierReturn = async (req, res) => {
  try {
    const { note } = req.body;
    const returnReceipt = await SupplierReturn.findById(req.params.id).populate('supplier');
    if (!returnReceipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu trả hàng Nhà cung cấp' });
    }

    if (returnReceipt.status !== 'admin_approved') {
      return res.status(400).json({
        success: false,
        message: `Phiếu trả hàng cần được Admin phê duyệt trước khi Kho có thể xuất hàng! (Trạng thái hiện tại: ${returnReceipt.status})`
      });
    }

    // 1. Kiểm tra tồn kho sách trước khi xuất
    for (const it of returnReceipt.items) {
      const isFromUnrestockedCustomerReturn = Boolean(it.isFromCustomerReturn);
      if (!isFromUnrestockedCustomerReturn) {
        const book = await Book.findById(it.book);
        if (book) {
          const q = Math.max(1, Number(it.quantity) || 1);
          if (book.stock < q) {
            return res.status(400).json({
              success: false,
              message: `Sách "${book.title}" hiện chỉ còn tồn ${book.stock} quyển, không đủ số lượng ${q} quyển để xuất trả cho NCC!`
            });
          }
        }
      }
    }

    // 2. Giảm tồn kho, cập nhật kệ sách & ghi nhận lịch sử điều chỉnh kho
    const returnAffectedShelves = [];
    for (const it of returnReceipt.items) {
      const isFromUnrestockedCustomerReturn = Boolean(it.isFromCustomerReturn);
      if (!isFromUnrestockedCustomerReturn) {
        const book = await Book.findById(it.book);
        if (book) {
          const q = Math.max(1, Number(it.quantity) || 1);
          const updatedBook = await Book.findByIdAndUpdate(
            book._id,
            { $inc: { stock: -q } },
            { new: true }
          );

          if (updatedBook && updatedBook.shelf) {
            returnAffectedShelves.push(updatedBook.shelf);
          }

          await StockAdjustment.create({
            book: book._id,
            bookCode: book.bookCode || '',
            title: book.title,
            previousStock: book.stock,
            adjustmentQty: -q,
            newStock: Math.max(0, (book.stock || 0) - q),
            reason: `Xuất gửi trả Nhà cung cấp ${returnReceipt.supplierName} (Phiếu: ${returnReceipt.returnCode})`,
            adjustedBy: req.user ? req.user._id : null
          });
        }
      }
    }

    if (returnAffectedShelves.length > 0) {
      await updateMultipleShelves(returnAffectedShelves);
    }

    // 3. Nếu xuất phát từ đơn hàng hoàn của khách: cập nhật trạng thái đơn hàng
    if (returnReceipt.sourceInvoice) {
      const inv = await Invoice.findById(returnReceipt.sourceInvoice);
      if (inv && inv.returnRequest) {
        inv.returnRequest.status = 'warehouse_returned_supplier';
        inv.returnRequest.warehouseAction = 'return_supplier';
        inv.returnRequest.warehouseProcessedAt = new Date();
        inv.returnRequest.warehouseProcessedBy = req.user ? req.user._id : null;
        inv.returnRequest.warehouseNote = `Kho đã xuất gửi trả NCC ${returnReceipt.supplierName} theo phiếu ${returnReceipt.returnCode}`;
        inv.returnRequest.supplierReturnCode = returnReceipt.returnCode;
        inv.paymentNote = (inv.paymentNote ? inv.paymentNote + ' | ' : '') + `[Kho]: Đã xuất trả NCC ${returnReceipt.returnCode} (Chờ Kế toán duyệt thu tiền)`;
        await inv.save();
      }
    }

    // 4. Tự động sinh Phiếu Thu gửi tới Quản lý Giao Dịch Thu / Chi của Kế toán (Trạng thái: pending)
    const transactionCode = `PT-THNCC-${Date.now().toString().slice(-6)}`;
    const newTransaction = await Transaction.create({
      transactionCode,
      type: 'thu',
      category: 'Thu tiền hoàn từ Nhà cung cấp',
      amount: returnReceipt.totalAmount,
      description: `Thu tiền hoàn trả hàng sách lỗi từ NCC ${returnReceipt.supplierName} (Phiếu #${returnReceipt.returnCode})`,
      recipient: returnReceipt.supplierName,
      personName: returnReceipt.supplierName,
      payerName: returnReceipt.supplierName,
      payerAddress: returnReceipt.supplierAddress || '',
      paymentMethod: 'bank_transfer',
      referenceSupplierReturn: returnReceipt._id,
      status: 'pending', // Chờ kế toán duyệt
      performedBy: req.user ? req.user._id : null,
      note: note || returnReceipt.note || `Kho đã xuất trả hàng theo phiếu #${returnReceipt.returnCode}, gửi Kế toán duyệt thu tiền.`
    });

    // 5. Cập nhật phiếu trả hàng sang pending_accountant
    returnReceipt.status = 'pending_accountant';
    returnReceipt.warehouseDispatchedBy = req.user ? req.user._id : null;
    returnReceipt.warehouseDispatchedAt = new Date();
    returnReceipt.warehouseDispatchNote = note || '';
    returnReceipt.refundTransaction = newTransaction._id;
    returnReceipt.refundTransactionCode = transactionCode;
    await returnReceipt.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SUPPLIER_RETURN_WAREHOUSE_DISPATCH',
      severity: 'INFO',
      targetId: String(returnReceipt._id),
      targetModel: 'SupplierReturn',
      targetLabel: `Phiếu trả NCC #${returnReceipt.returnCode}`,
      description: `Thủ kho ${req.user ? req.user.name : 'Kho'} xác nhận xuất gửi hàng lại cho NCC "${returnReceipt.supplierName}" (${returnReceipt.totalQuantity} cuốn, ${Number(returnReceipt.totalAmount).toLocaleString('vi-VN')} đ). Đã tạo phiếu thu #${transactionCode} chuyển sang Kế toán duyệt.`
    });

    const populated = await SupplierReturn.findById(returnReceipt._id)
      .populate('supplier', 'name code phone')
      .populate('items.book', 'title bookCode price coverImage')
      .populate('warehouseDispatchedBy', 'name email role')
      .populate('refundTransaction');

    res.status(200).json({
      success: true,
      message: `Kho đã xác nhận xuất gửi hàng lại cho Nhà cung cấp thành công! Đã tạo phiếu thu tiền #${transactionCode} chuyển tới Quản lý Giao Dịch Thu / Chi của Kế toán.`,
      data: populated
    });
  } catch (error) {
    console.error('Lỗi khi Kho xuất hàng trả NCC:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi xác nhận xuất hàng trả NCC' });
  }
};

// @desc    Lấy danh sách tất cả phiếu trả hàng Nhà cung cấp kèm bộ đếm các trạng thái
// @route   GET /api/inventory/supplier-returns
// @access  Private (Stock, Admin, Staff)
const getAllSupplierReturns = async (req, res) => {
  try {
    const { supplierId, keyword, startDate, endDate, status } = req.query;
    const filter = {};

    if (supplierId && supplierId !== 'all') {
      filter.supplier = supplierId;
    }
    if (status && status !== 'all') {
      if (status === 'pending_admin') {
        filter.status = { $in: ['pending_admin', 'pending'] };
      } else {
        filter.status = status;
      }
    }
    if (keyword) {
      const kw = keyword.trim();
      filter.$or = [
        { returnCode: { $regex: kw, $options: 'i' } },
        { supplierName: { $regex: kw, $options: 'i' } },
        { reason: { $regex: kw, $options: 'i' } },
        { 'items.title': { $regex: kw, $options: 'i' } },
        { 'items.bookCode': { $regex: kw, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      filter.returnDate = {};
      if (startDate) filter.returnDate.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.returnDate.$lte = e;
      }
    }

    const [
      returns,
      pendingAdminCount,
      adminApprovedCount,
      pendingAccountantCount,
      completedCount,
      rejectedCount
    ] = await Promise.all([
      SupplierReturn.find(filter)
        .sort({ returnDate: -1, createdAt: -1 })
        .populate('supplier', 'name code phone contactPerson')
        .populate('items.book', 'title bookCode price coverImage')
        .populate('adminApprovedBy', 'name email role')
        .populate('warehouseDispatchedBy', 'name email role')
        .populate('accountantApprovedBy', 'name email role')
        .populate('refundTransaction')
        .lean(),
      SupplierReturn.countDocuments({ status: { $in: ['pending_admin', 'pending'] } }),
      SupplierReturn.countDocuments({ status: 'admin_approved' }),
      SupplierReturn.countDocuments({ status: 'pending_accountant' }),
      SupplierReturn.countDocuments({ status: 'completed' }),
      SupplierReturn.countDocuments({ status: 'rejected' })
    ]);

    const totalReturnsCount = returns.length;
    const totalReturnedQty = returns.reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0);
    const totalRefundedAmount = returns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

    res.status(200).json({
      success: true,
      summary: {
        totalReturnsCount,
        totalReturnedQty,
        totalRefundedAmount,
        pendingAdminCount,
        adminApprovedCount,
        pendingAccountantCount,
        completedCount,
        rejectedCount,
        allCount: pendingAdminCount + adminApprovedCount + pendingAccountantCount + completedCount + rejectedCount
      },
      count: returns.length,
      data: returns
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách phiếu trả hàng NCC:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách phiếu trả hàng Nhà cung cấp'
    });
  }
};

// @desc    Lấy chi tiết một phiếu trả hàng Nhà cung cấp
// @route   GET /api/inventory/supplier-returns/:id
// @access  Private (Stock, Admin, Staff)
const getSupplierReturnById = async (req, res) => {
  try {
    const returnReceipt = await SupplierReturn.findById(req.params.id)
      .populate('supplier')
      .populate('items.book', 'title bookCode price costPrice category coverImage')
      .populate('refundTransaction')
      .populate('createdBy', 'name email role');

    if (!returnReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu trả hàng Nhà cung cấp'
      });
    }

    res.status(200).json({
      success: true,
      data: returnReceipt
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết phiếu trả hàng NCC:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết phiếu trả hàng NCC'
    });
  }
};

// @desc    Lấy danh sách các đơn hàng hoàn trả từ khách đang chờ Kho xử lý kiểm định
// @route   GET /api/inventory/customer-returns
// @access  Private (Stock, Admin, Staff)
const getCustomerReturnsPendingWarehouse = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};

    if (status === 'pending') {
      filter = { 'returnRequest.status': 'approved_transferred_to_warehouse' };
    } else if (status === 'processed') {
      filter = { 'returnRequest.status': { $in: ['warehouse_restocked', 'warehouse_returned_supplier', 'warehouse_discarded'] } };
    } else {
      filter = {
        'returnRequest.status': {
          $in: [
            'approved_transferred_to_warehouse',
            'warehouse_restocked',
            'warehouse_returned_supplier',
            'warehouse_discarded'
          ]
        }
      };
    }

    const orders = await Invoice.find(filter)
      .sort({ 'returnRequest.transferredToWarehouseAt': -1, updatedAt: -1 })
      .populate('user', 'name email phone avatar')
      .populate('items.book', 'title bookCode price costPrice category coverImage stock supplier')
      .lean();

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách sách hoàn chờ kho xử lý:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách sách hoàn chờ kho xử lý'
    });
  }
};

// @desc    Bộ phận Kho xử lý phân loại kiện sách hoàn từ khách (Nhập lại kho bán / Xuất hủy)
// @route   PUT /api/inventory/customer-returns/:id/process
// @access  Private (Stock, Admin)
const processCustomerReturnDisposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; // action: 'restock' | 'discard'

    const invoice = await Invoice.findById(id).populate('items.book');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (!invoice.returnRequest) {
      return res.status(400).json({ success: false, message: 'Đơn hàng này không có yêu cầu hoàn trả hợp lệ' });
    }

    if (['warehouse_restocked', 'warehouse_returned_supplier', 'warehouse_discarded'].includes(invoice.returnRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng này đã được bộ phận kho phân loại trước đó (trạng thái hiện tại: ${invoice.returnRequest.status})!`
      });
    }

    const staffName = req.user ? req.user.name : 'Thủ kho';

    if (action === 'restock') {
      // 1. NHẬP LẠI KHO BÁN: Tăng tồn kho cho từng cuốn sách & Cập nhật kệ
      let totalRestocked = 0;
      const restockAffectedShelves = [];

      for (const item of invoice.items) {
        if (item.book) {
          const bId = item.book._id || item.book;
          const q = Number(item.quantity) || 1;
          const curBook = await Book.findById(bId);
          await Book.findByIdAndUpdate(bId, { $inc: { stock: q } });

          if (curBook && curBook.shelf) {
            restockAffectedShelves.push(curBook.shelf);
          }

          totalRestocked += q;
          await StockAdjustment.create({
            book: bId,
            bookCode: curBook ? curBook.bookCode : 'SKU',
            title: curBook ? curBook.title : 'Sách hoàn',
            previousStock: curBook ? curBook.stock : 0,
            adjustmentQty: q,
            newStock: (curBook ? curBook.stock : 0) + q,
            reason: `Tái nhập kho sách hoàn đạt chuẩn từ đơn khách ${invoice.invoiceCode}. Ghi chú: ${note || 'Sách tốt/mới'}`,
            adjustedBy: req.user ? req.user._id : null
          });
        }
      }

      if (restockAffectedShelves.length > 0) {
        await updateMultipleShelves(restockAffectedShelves);
      }

      invoice.returnRequest.status = 'warehouse_restocked';
      invoice.returnRequest.warehouseAction = 'restock';
      invoice.returnRequest.warehouseProcessedAt = new Date();
      invoice.returnRequest.warehouseProcessedBy = req.user ? req.user._id : null;
      invoice.returnRequest.warehouseNote = note || `Thủ kho ${staffName} kiểm tra sách đạt chuẩn, đã tái nhập ${totalRestocked} cuốn vào kho bán`;
      invoice.paymentNote = (invoice.paymentNote ? invoice.paymentNote + ' | ' : '') + `[Kho]: Đã tái nhập ${totalRestocked} cuốn vào kho bán`;

      await invoice.save();

      logActivity(req, {
        module: 'INVENTORY',
        action: 'CUSTOMER_RETURN_DISPOSITION',
        severity: 'INFO',
        targetId: String(invoice._id),
        targetModel: 'Invoice',
        targetLabel: `Đơn hoàn #${invoice.invoiceCode}`,
        description: `Thủ kho ${staffName} kiểm định & tái nhập ${totalRestocked} cuốn sách từ đơn hoàn #${invoice.invoiceCode} vào kho bán. Ghi chú: ${invoice.returnRequest.warehouseNote}`,
        diff: [
          { field: 'returnRequest.status', fieldLabel: 'Trạng thái xử lý kho', oldValue: 'approved_transferred_to_warehouse', newValue: 'warehouse_restocked' },
          { field: 'returnRequest.warehouseAction', fieldLabel: 'Hành động phân loại', oldValue: '', newValue: 'restock' }
        ]
      });

      return res.status(200).json({
        success: true,
        message: `Đã kiểm định và tái nhập ${totalRestocked} cuốn sách vào kho bán thành công! Tồn kho và dung lượng kệ sách đã được đồng bộ chuẩn xác.`,
        data: invoice
      });
    } else if (action === 'discard') {
      // 2. XUẤT HỦY / HAO HỤT: Không cộng tồn bán, ghi nhận biên bản hao hụt
      let totalDiscarded = 0;
      for (const item of invoice.items) {
        const q = Number(item.quantity) || 1;
        totalDiscarded += q;
        const bId = item.book ? (item.book._id || item.book) : null;
        if (bId) {
          const curBook = await Book.findById(bId);
          await StockAdjustment.create({
            book: bId,
            bookCode: curBook ? curBook.bookCode : 'SKU',
            title: curBook ? curBook.title : 'Sách hoàn',
            previousStock: curBook ? curBook.stock : 0,
            adjustmentQty: 0,
            newStock: curBook ? curBook.stock : 0,
            reason: `Biên bản xuất hủy sách nát/hỏng từ đơn khách hoàn ${invoice.invoiceCode}. Số lượng hủy: ${q} cuốn. Lý do: ${note || 'Sách hư hỏng không thể bán lại hay trả NCC'}`,
            adjustedBy: req.user ? req.user._id : null
          });
        }
      }

      invoice.returnRequest.status = 'warehouse_discarded';
      invoice.returnRequest.warehouseAction = 'discard';
      invoice.returnRequest.warehouseProcessedAt = new Date();
      invoice.returnRequest.warehouseProcessedBy = req.user ? req.user._id : null;
      invoice.returnRequest.warehouseNote = note || `Thủ kho ${staffName} lập biên bản xuất hủy ${totalDiscarded} cuốn sách hư hỏng, không nhập kho bán`;
      invoice.paymentNote = (invoice.paymentNote ? invoice.paymentNote + ' | ' : '') + `[Kho]: Đã lập biên bản xuất hủy ${totalDiscarded} cuốn sách hỏng`;

      await invoice.save();

      logActivity(req, {
        module: 'INVENTORY',
        action: 'CUSTOMER_RETURN_DISPOSITION',
        severity: 'WARNING',
        targetId: String(invoice._id),
        targetModel: 'Invoice',
        targetLabel: `Đơn hoàn #${invoice.invoiceCode}`,
        description: `Thủ kho ${staffName} lập biên bản xuất hủy ${totalDiscarded} cuốn sách hỏng từ đơn hoàn #${invoice.invoiceCode} (không nhập kho bán). Lý do: ${note || 'Sách nát/hỏng'}`,
        diff: [
          { field: 'returnRequest.status', fieldLabel: 'Trạng thái xử lý kho', oldValue: 'approved_transferred_to_warehouse', newValue: 'warehouse_discarded' },
          { field: 'returnRequest.warehouseAction', fieldLabel: 'Hành động phân loại', oldValue: '', newValue: 'discard' }
        ]
      });

      return res.status(200).json({
        success: true,
        message: `Đã lập biên bản xuất hủy ${totalDiscarded} cuốn sách hư hỏng thành công. Tồn kho bán không bị thay đổi.`,
        data: invoice
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Hành động không hợp lệ. Vui lòng chọn restock hoặc discard.'
      });
    }
  } catch (error) {
    console.error('Lỗi khi xử lý phân loại sách hoàn tại kho:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xử lý sách hoàn tại kho'
    });
  }
};

// ================= SHELF CAPACITY & POSITION MANAGEMENT CONTROLLERS =================

// @desc    Lấy danh sách tất cả các kệ kèm số liệu thực tế thời gian thực
// @route   GET /api/inventory/shelves
// @access  Private (Stock, Admin, Staff)
const getAllShelves = async (req, res) => {
  try {
    const { zone, status, keyword } = req.query;
    const filter = {};
    if (zone) filter.zone = zone;
    if (keyword) {
      const kw = keyword.trim();
      filter.$or = [
        { shelfCode: { $regex: kw, $options: 'i' } },
        { shelfName: { $regex: kw, $options: 'i' } },
        { description: { $regex: kw, $options: 'i' } }
      ];
    }

    const shelves = await Shelf.find(filter).sort({ zone: 1, shelfCode: 1 }).lean();

    // Lấy toàn bộ sách trên các kệ để tính toán số liệu chính xác
    const shelfIds = shelves.map(s => s._id);
    const booksOnShelves = await Book.find({
      shelf: { $in: shelfIds },
      isDeleted: { $ne: true }
    }).select('title bookCode author category price costPrice stock coverImage status shelf').lean();

    const booksByShelf = {};
    for (const b of booksOnShelves) {
      const sid = b.shelf.toString();
      if (!booksByShelf[sid]) booksByShelf[sid] = [];
      booksByShelf[sid].push(b);
    }

    // Lấy danh sách yêu cầu bảo trì kệ đang chờ duyệt để thông báo trên sơ đồ
    const pendingMaintList = await ShelfMaintenanceRequest.find({ status: 'pending' }).lean();
    const pendingMaintMap = {};
    for (const pm of pendingMaintList) {
      if (pm.shelf) {
        pendingMaintMap[pm.shelf.toString()] = pm;
      }
    }

    let shelvesWithStats = shelves.map(s => {
      const sid = s._id.toString();
      const books = booksByShelf[sid] || [];
      const currentStock = books.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
      const remainingSpace = Math.max(0, s.capacity - currentStock);
      const occupancyPercent = s.capacity > 0 ? Math.round((currentStock / s.capacity) * 100) : 0;

      let calculatedStatus = 'available';
      if (s.status === 'maintenance') calculatedStatus = 'maintenance';
      else if (currentStock > s.capacity) calculatedStatus = 'overloaded';
      else if (remainingSpace <= 0) calculatedStatus = 'full';
      else if (remainingSpace <= s.capacity * 0.2) calculatedStatus = 'nearly_full';

      return {
        ...s,
        currentStock,
        currentUnits: currentStock,
        remainingSpace,
        occupancyPercent,
        occupancyRate: occupancyPercent,
        booksCount: books.length,
        status: calculatedStatus,
        pendingMaintenance: pendingMaintMap[sid] || null,
        books
      };
    });

    // Lọc trạng thái dựa trên số liệu thực tế thời gian thực
    if (status && status !== 'all') {
      if (status === 'full') {
        shelvesWithStats = shelvesWithStats.filter(s => s.status === 'full' || s.status === 'overloaded');
      } else {
        shelvesWithStats = shelvesWithStats.filter(s => s.status === status);
      }
    }

    res.status(200).json({
      success: true,
      count: shelvesWithStats.length,
      data: shelvesWithStats
    });
  } catch (error) {
    console.error('Lỗi getAllShelves:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy danh sách kệ sách' });
  }
};

// @desc    Tạo mới một kệ sách vật lý
// @route   POST /api/inventory/shelves
// @access  Private (Admin, Stock)
const createShelf = async (req, res) => {
  try {
    if (req.user && req.user.role === 'stock') {
      return res.status(403).json({
        success: false,
        message: 'Nhân viên kho không thể tạo kệ trực tiếp. Vui lòng gửi yêu cầu thêm kệ sách để Quản trị viên phê duyệt!'
      });
    }

    const { shelfCode, shelfName, zone, capacity, description } = req.body;
    if (!shelfCode || !shelfName) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mã kệ và tên kệ'
      });
    }

    const formattedCode = shelfCode.trim().toUpperCase();
    const existing = await Shelf.findOne({ shelfCode: formattedCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã kệ "${formattedCode}" đã tồn tại trong hệ thống!`
      });
    }

    const shelf = await Shelf.create({
      shelfCode: formattedCode,
      shelfName: shelfName.trim(),
      zone: zone || 'Khu A',
      capacity: Number(capacity) || 100,
      description: (description || '').trim(),
      status: 'available'
    });

    // Ghi nhật ký tạo kệ mới
    await logShelfActivity({
      action: 'SHELF_CREATE',
      description: `Tạo kệ sách mới "${shelf.shelfName}" (${shelf.shelfCode}), khu vực ${shelf.zone}, sức chứa ${shelf.capacity} cuốn.`,
      toShelf: { _id: shelf._id, shelfCode: shelf.shelfCode, shelfName: shelf.shelfName },
      performer: req.user,
      details: { zone: shelf.zone, capacity: shelf.capacity, description: shelf.description }
    });

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_CREATE',
      severity: 'WARNING',
      targetId: String(shelf._id),
      targetModel: 'Shelf',
      targetLabel: `Kệ ${shelf.shelfCode}`,
      description: `Tạo kệ sách mới "${shelf.shelfName}" (${shelf.shelfCode}) tại khu vực ${shelf.zone}, sức chứa ${shelf.capacity} cuốn`,
      metadata: {
        shelfCode: shelf.shelfCode,
        zone: shelf.zone,
        capacity: shelf.capacity
      }
    });

    res.status(201).json({
      success: true,
      message: `Thêm kệ sách "${shelf.shelfName}" (${shelf.shelfCode}) thành công!`,
      data: shelf
    });
  } catch (error) {
    console.error('Lỗi createShelf:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo kệ sách mới' });
  }
};

// @desc    Cập nhật thông tin / điều chỉnh sức chứa kệ sách
// @route   PUT /api/inventory/shelves/:id
// @access  Private (Admin, Stock)
const updateShelf = async (req, res) => {
  try {
    const { shelfName, zone, capacity, description } = req.body;
    const shelf = await Shelf.findById(req.params.id);
    if (!shelf) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kệ sách' });
    }

    const currentStock = await getShelfOccupancy(shelf._id);
    if (capacity !== undefined) {
      const newCap = Number(capacity);
      if (newCap < 1) {
        return res.status(400).json({ success: false, message: 'Sức chứa tối thiểu phải là 1 cuốn' });
      }
      if (newCap < currentStock) {
        return res.status(400).json({
          success: false,
          message: `Không thể giảm sức chứa xuống ${newCap} cuốn vì kệ đang chứa ${currentStock} cuốn sách! Vui lòng chuyển bớt sách sang kệ khác trước khi giảm sức chứa.`
        });
      }
      shelf.capacity = newCap;
    }

    if (shelfName) shelf.shelfName = shelfName.trim();
    if (zone) shelf.zone = zone;
    if (description !== undefined) shelf.description = description.trim();

    await shelf.save();

    // Cập nhật lại shelfPosition / shelfLocation cho các sách trên kệ nếu tên kệ thay đổi
    if (shelfName) {
      await Book.updateMany(
        { shelf: shelf._id },
        { $set: { shelfPosition: shelf.shelfName, shelfLocation: shelf.shelfName } }
      );
    }

    const updatedInfo = await updateShelfStatus(shelf._id);

    // Ghi nhật ký cập nhật thông tin kệ
    const changes = [];
    if (shelfName) changes.push(`Tên: ${shelfName}`);
    if (zone) changes.push(`Khu vực: ${zone}`);
    if (capacity !== undefined) changes.push(`Sức chứa: ${capacity} cuốn`);
    await logShelfActivity({
      action: 'SHELF_UPDATE',
      description: `Cập nhật thông tin kệ "${shelf.shelfName}" (${shelf.shelfCode}): ${changes.join(', ') || 'Mô tả kệ'}.`,
      toShelf: { _id: shelf._id, shelfCode: shelf.shelfCode, shelfName: shelf.shelfName },
      performer: req.user,
      details: { changes, zone: shelf.zone, capacity: shelf.capacity }
    });

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_UPDATE',
      severity: 'INFO',
      targetId: String(shelf._id),
      targetModel: 'Shelf',
      targetLabel: `Kệ ${shelf.shelfCode}`,
      description: `Cập nhật thông tin kệ "${shelf.shelfName}" (${shelf.shelfCode}): ${changes.join(', ') || 'Cập nhật ghi chú/mô tả'}`
    });

    res.status(200).json({
      success: true,
      message: `Cập nhật thông tin kệ "${shelf.shelfName}" thành công!`,
      data: updatedInfo.shelf
    });
  } catch (error) {
    console.error('Lỗi updateShelf:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật kệ sách' });
  }
};

// @desc    Xóa kệ sách (Hệ thống quy định không xóa kệ mà phải chuyển sang chế độ Bảo Trì)
// @route   DELETE /api/inventory/shelves/:id
// @access  Private (Admin)
const deleteShelf = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Hệ thống quy định không xóa kệ sách vật lý để bảo toàn lịch sử luân chuyển kho. Nếu kệ gặp sự cố hoặc hư hỏng, vui lòng sử dụng chức năng "Bảo Trì Kệ Sách" (toàn bộ sách trên kệ sẽ được tự động chuyển sang Kệ Dự Phòng an toàn).'
  });
};

// @desc    Chuyển kệ sang chế độ Bảo Trì (chuyển toàn bộ sách sang Kệ Dự Phòng) hoặc Hoàn tất bảo trì
// @route   PUT /api/inventory/shelves/:id/maintenance
// @access  Private (Admin, Stock)
const toggleShelfMaintenance = async (req, res) => {
  try {
    const { toMaintenance } = req.body;
    const shelf = await Shelf.findById(req.params.id);
    if (!shelf) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kệ sách' });
    }

    if (shelf.shelfCode === 'KE-DP') {
      return res.status(400).json({
        success: false,
        message: 'Kệ Dự Phòng là kệ trung tâm dự phòng của kho, không thể đưa vào chế độ bảo trì!'
      });
    }

    // Nhân viên kho không thể tự ý bảo trì kệ trực tiếp mà phải gửi yêu cầu cho Admin duyệt
    if (toMaintenance && req.user && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nhân viên kho không thể tự ý bảo trì kệ sách trực tiếp. Vui lòng gửi Yêu Cầu Bảo Trì Kệ Sách để Quản trị viên (Admin) phê duyệt!'
      });
    }

    const backupShelf = await getOrCreateBackupShelf();

    if (toMaintenance) {
      // 1. Tìm toàn bộ sách đang nằm trên kệ này
      const booksOnShelf = await Book.find({ shelf: shelf._id, isDeleted: { $ne: true } });
      const totalUnits = booksOnShelf.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

      // 2. Chuyển toàn bộ sách sang Kệ Dự Phòng Lưu Trữ (KE-DP)
      if (booksOnShelf.length > 0) {
        await Book.updateMany(
          { shelf: shelf._id },
          {
            $set: {
              shelf: backupShelf._id,
              shelfPosition: backupShelf.shelfName,
              shelfLocation: backupShelf.shelfName
            }
          }
        );
        // Đồng bộ dung lượng cho Kệ Dự Phòng
        await updateShelfStatus(backupShelf._id);
      }

      // 3. Đặt trạng thái kệ thành maintenance
      shelf.status = 'maintenance';
      await shelf.save();

      // Ghi nhật ký bảo trì kệ
      const movedBookIds = booksOnShelf.map(b => b._id);
      await logShelfActivity({
        action: 'SHELF_MAINTENANCE_START',
        description: `Đưa kệ "${shelf.shelfName}" (${shelf.shelfCode}) vào chế độ BẢO TRÌ. Tự động chuyển ${booksOnShelf.length} đầu sách (${totalUnits} cuốn) sang Kệ Dự Phòng (${backupShelf.shelfCode}).`,
        fromShelf: { _id: shelf._id, shelfCode: shelf.shelfCode, shelfName: shelf.shelfName },
        toShelf: { _id: backupShelf._id, shelfCode: backupShelf.shelfCode, shelfName: backupShelf.shelfName },
        quantity: totalUnits,
        performer: req.user,
        details: { movedBooksCount: booksOnShelf.length, movedUnits: totalUnits, movedBookIds }
      });

      logActivity(req, {
        module: 'INVENTORY',
        action: 'SHELF_MAINTENANCE_TOGGLE',
        severity: 'INFO',
        targetId: String(shelf._id),
        targetModel: 'Shelf',
        targetLabel: `Kệ ${shelf.shelfCode}`,
        description: `Đưa kệ "${shelf.shelfName}" (${shelf.shelfCode}) vào chế độ BẢO TRÌ (đã chuyển tạm ${totalUnits} cuốn sang Kệ Dự Phòng)`
      });

      return res.status(200).json({
        success: true,
        message: `Đã đưa kệ "${shelf.shelfName}" (${shelf.shelfCode}) vào chế độ BẢO TRÌ! Đã tự động chuyển ${booksOnShelf.length} đầu sách (${totalUnits} cuốn) sang ${backupShelf.shelfName}. Kệ sẽ tạm ngưng tiếp nhận sách mới.`,
        movedBooksCount: booksOnShelf.length,
        movedUnits: totalUnits,
        shelf
      });
    } else {
      // Hoàn tất bảo trì -> Khôi phục hoạt động cho kệ & Tự động đưa sách từ Kệ Dự Phòng quay trở lại
      shelf.status = 'available';
      await shelf.save();

      let restoredCount = 0;
      let restoredUnits = 0;

      // Tìm nhật ký bảo trì gần nhất của kệ này để lấy danh sách sách đã dời tạm
      const lastMaintLog = await ShelfActivityLog.findOne({
        action: 'SHELF_MAINTENANCE_START',
        $or: [
          { fromShelf: shelf._id },
          { fromShelfCode: shelf.shelfCode }
        ]
      }).sort({ createdAt: -1 });

      if (lastMaintLog && lastMaintLog.details && Array.isArray(lastMaintLog.details.movedBookIds)) {
        const booksToRestore = await Book.find({
          _id: { $in: lastMaintLog.details.movedBookIds },
          shelf: backupShelf._id,
          isDeleted: { $ne: true }
        });

        if (booksToRestore.length > 0) {
          restoredCount = booksToRestore.length;
          restoredUnits = booksToRestore.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

          await Book.updateMany(
            { _id: { $in: booksToRestore.map(b => b._id) } },
            {
              $set: {
                shelf: shelf._id,
                shelfPosition: shelf.shelfName,
                shelfLocation: shelf.shelfName
              }
            }
          );

          // Cập nhật lại dung lượng Kệ Dự Phòng
          await updateShelfStatus(backupShelf._id);
        }
      }

      await updateShelfStatus(shelf._id);

      // Ghi nhật ký mở lại kệ
      await logShelfActivity({
        action: 'SHELF_MAINTENANCE_END',
        description: `Hoàn tất bảo trì, mở lại hoạt động cho kệ "${shelf.shelfName}" (${shelf.shelfCode}).${restoredCount > 0 ? ` Đã tự động chuyển lại ${restoredCount} đầu sách (${restoredUnits} cuốn) từ Kệ Dự Phòng về kệ ban đầu.` : ''}`,
        fromShelf: { _id: shelf._id, shelfCode: shelf.shelfCode, shelfName: shelf.shelfName },
        quantity: restoredUnits,
        performer: req.user,
        details: { restoredCount, restoredUnits }
      });

      logActivity(req, {
        module: 'INVENTORY',
        action: 'SHELF_MAINTENANCE_TOGGLE',
        severity: 'INFO',
        targetId: String(shelf._id),
        targetModel: 'Shelf',
        targetLabel: `Kệ ${shelf.shelfCode}`,
        description: `Hoàn tất bảo trì, mở lại hoạt động cho kệ "${shelf.shelfName}" (${shelf.shelfCode})${restoredCount > 0 ? `, đã hoàn trả ${restoredCount} đầu sách (${restoredUnits} cuốn) từ Kệ Dự Phòng về kệ` : ''}`
      });

      return res.status(200).json({
        success: true,
        message: `Kệ "${shelf.shelfName}" (${shelf.shelfCode}) đã hoàn tất bảo trì và sẵn sàng tiếp nhận sách trở lại!${restoredCount > 0 ? ` Đã tự động hoàn trả ${restoredCount} đầu sách (${restoredUnits} cuốn) từ Kệ Dự Phòng về kệ.` : ''}`,
        restoredCount,
        restoredUnits,
        shelf
      });
    }
  } catch (error) {
    console.error('Lỗi toggleShelfMaintenance:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi cập nhật trạng thái bảo trì kệ' });
  }
};

// @desc    Điều chuyển sách giữa các kệ sách có kiểm tra sức chứa kệ đích
// @route   POST /api/inventory/shelves/transfer
// @access  Private (Admin, Stock)
const transferBooksBetweenShelves = async (req, res) => {
  try {
    // Nhân viên kho phải gửi yêu cầu điều chuyển sách để Admin duyệt
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nhân viên kho không thể tự ý điều chuyển sách trực tiếp. Vui lòng gửi Yêu Cầu Điều Chuyển Sách để Quản trị viên (Admin) phê duyệt!'
      });
    }

    const { bookIds, targetShelfId } = req.body;
    if (!Array.isArray(bookIds) || bookIds.length === 0 || !targetShelfId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn danh sách sách và kệ đích cần chuyển'
      });
    }

    const targetShelf = await Shelf.findById(targetShelfId);
    if (!targetShelf) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kệ đích' });
    }

    if (targetShelf.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        message: `Kệ đích "${targetShelf.shelfName}" (${targetShelf.shelfCode}) đang trong chế độ BẢO TRÌ! Không thể điều chuyển sách vào kệ này.`
      });
    }

    const booksToMove = await Book.find({ _id: { $in: bookIds }, isDeleted: { $ne: true } });
    if (booksToMove.length === 0) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy sách hợp lệ để chuyển' });
    }

    const totalStockToMove = booksToMove.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

    // Tính số lượng sách chuyển từ các kệ KHÁC sang kệ đích (loại trừ sách vốn đã ở kệ đích)
    const nonTargetBooksStock = booksToMove
      .filter(b => !b.shelf || b.shelf.toString() !== targetShelf._id.toString())
      .reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

    const targetOccupancy = await getShelfOccupancy(targetShelf._id);
    const remainingTargetSpace = targetShelf.capacity - targetOccupancy;

    if (nonTargetBooksStock > remainingTargetSpace) {
      const safeRemaining = Math.max(0, remainingTargetSpace);
      return res.status(400).json({
        success: false,
        message: `Kệ ${targetShelf.shelfName} chỉ còn chứa được ${safeRemaining} cuốn nữa. Không thể chuyển thêm ${nonTargetBooksStock} cuốn từ các kệ khác!`
      });
    }

    const sourceShelfIds = [...new Set(booksToMove.map(b => b.shelf ? b.shelf.toString() : null).filter(Boolean))];

    // Cập nhật vị trí kệ mới cho các cuốn sách
    await Book.updateMany(
      { _id: { $in: bookIds } },
      {
        $set: {
          shelf: targetShelf._id,
          shelfPosition: targetShelf.shelfName,
          shelfLocation: targetShelf.shelfName
        }
      }
    );

    // Cập nhật lại dung lượng kệ đích và các kệ nguồn
    await updateShelfStatus(targetShelf._id);
    await updateMultipleShelves(sourceShelfIds);

    // Ghi nhật ký điều chuyển sách với danh sách chi tiết các cuốn sách
    const movedBooksDetails = [];
    for (const b of booksToMove) {
      const fromShelfDoc = (b.shelf || b.shelfLocation || b.shelfPosition)
        ? await resolveShelf(b.shelf || b.shelfLocation || b.shelfPosition)
        : null;
      if (fromShelfDoc && fromShelfDoc._id.toString() === targetShelf._id.toString()) continue;

      movedBooksDetails.push({
        _id: b._id,
        bookCode: b.bookCode || b.isbn || '—',
        title: b.title,
        author: b.author || '—',
        price: b.price || 0,
        quantity: b.stock || 0,
        fromShelfCode: fromShelfDoc ? fromShelfDoc.shelfCode : (b.shelfPosition || b.shelfLocation || 'Chưa xếp kệ'),
        toShelfCode: targetShelf.shelfCode
      });
    }

    if (movedBooksDetails.length === 1) {
      const single = movedBooksDetails[0];
      const singleBook = booksToMove[0];
      const fromShelfDoc = (singleBook.shelf || singleBook.shelfLocation || singleBook.shelfPosition)
        ? await resolveShelf(singleBook.shelf || singleBook.shelfLocation || singleBook.shelfPosition)
        : null;
      await logShelfActivity({
        action: 'SHELF_TRANSFER',
        description: `Điều chuyển sách "${single.title}" (${single.bookCode}) ${fromShelfDoc ? 'từ kệ ' + fromShelfDoc.shelfCode : ''} sang kệ ${targetShelf.shelfCode}.`,
        book: { _id: singleBook._id, title: singleBook.title, bookCode: singleBook.bookCode || '', author: singleBook.author, price: singleBook.price },
        fromShelf: fromShelfDoc ? { _id: fromShelfDoc._id, shelfCode: fromShelfDoc.shelfCode, shelfName: fromShelfDoc.shelfName } : null,
        fromShelfCode: fromShelfDoc ? fromShelfDoc.shelfCode : '',
        fromShelfName: fromShelfDoc ? fromShelfDoc.shelfName : '',
        toShelf: { _id: targetShelf._id, shelfCode: targetShelf.shelfCode, shelfName: targetShelf.shelfName },
        toShelfCode: targetShelf.shelfCode,
        toShelfName: targetShelf.shelfName,
        quantity: single.quantity,
        performer: req.user,
        details: { books: movedBooksDetails }
      });
    } else if (movedBooksDetails.length > 1) {
      await logShelfActivity({
        action: 'SHELF_TRANSFER',
        description: `Điều chuyển ${movedBooksDetails.length} đầu sách (${totalStockToMove} cuốn) sang kệ ${targetShelf.shelfCode}.`,
        fromShelf: null,
        fromShelfCode: '',
        fromShelfName: 'Nhiều kệ nguồn',
        toShelf: { _id: targetShelf._id, shelfCode: targetShelf.shelfCode, shelfName: targetShelf.shelfName },
        toShelfCode: targetShelf.shelfCode,
        toShelfName: targetShelf.shelfName,
        quantity: totalStockToMove,
        performer: req.user,
        details: { books: movedBooksDetails }
      });
    }

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_TRANSFER_BOOKS',
      severity: 'INFO',
      targetId: String(targetShelf._id),
      targetModel: 'Shelf',
      targetLabel: `Kệ đích ${targetShelf.shelfCode}`,
      description: `Điều chuyển ${booksToMove.length} đầu sách (${totalStockToMove} cuốn) sang kệ ${targetShelf.shelfCode} (${targetShelf.shelfName})`,
      metadata: {
        targetShelfCode: targetShelf.shelfCode,
        targetShelfName: targetShelf.shelfName,
        booksCount: booksToMove.length,
        totalStockToMove
      }
    });

    res.status(200).json({
      success: true,
      message: `Đã chuyển thành công ${booksToMove.length} đầu sách (${totalStockToMove} cuốn) sang ${targetShelf.shelfName}!`
    });
  } catch (error) {
    console.error('Lỗi transferBooksBetweenShelves:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi điều chuyển sách giữa các kệ' });
  }
};

// @desc    Lấy lịch sử hoạt động kệ sách & luân chuyển sách
// @route   GET /api/inventory/shelf-activities
// @access  Private (Admin, Stock)
const getShelfActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      action,
      shelfCode,
      search,
      startDate,
      endDate
    } = req.query;

    const conditions = [];

    if (action && action !== 'all') {
      conditions.push({ action });
    }

    if (shelfCode && shelfCode !== 'all') {
      conditions.push({
        $or: [
          { fromShelfCode: shelfCode },
          { toShelfCode: shelfCode }
        ]
      });
    }

    if (search && search.trim() !== '') {
      const re = new RegExp(search.trim(), 'i');
      conditions.push({
        $or: [
          { bookTitle: re },
          { bookCode: re },
          { fromShelfCode: re },
          { toShelfCode: re },
          { performerName: re },
          { description: re }
        ]
      });
    }

    if (startDate || endDate) {
      const dateCond = {};
      if (startDate) dateCond.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateCond.$lte = end;
      }
      conditions.push({ createdAt: dateCond });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      ShelfActivityLog.find(filter)
        .populate('book', 'title bookCode isbn author category price stock coverImage shelfLocation')
        .populate('performedBy', 'fullName name email role')
        .populate('fromShelf', 'shelfCode shelfName zone')
        .populate('toShelf', 'shelfCode shelfName zone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ShelfActivityLog.countDocuments(filter)
    ]);

    // Thống kê theo loại hành động
    const statsByAction = await ShelfActivityLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]);

    // Danh sách tất cả mã kệ đã có trong log (để populate bộ lọc)
    const allShelfCodes = await ShelfActivityLog.distinct('fromShelfCode').then(async from => {
      const to = await ShelfActivityLog.distinct('toShelfCode');
      return [...new Set([...from, ...to].filter(Boolean))];
    });

    res.status(200).json({
      success: true,
      data: logs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      statsByAction,
      allShelfCodes
    });
  } catch (error) {
    console.error('Lỗi getShelfActivityLogs:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy lịch sử hoạt động kệ sách' });
  }
};

// ================= SHELF CREATE REQUEST CONTROLLERS (YÊU CẦU THÊM KỆ TỪ KHO) =================

// @desc    Nhân viên kho gửi yêu cầu tạo kệ sách mới tới Quản trị viên
// @route   POST /api/inventory/shelf-create-requests
// @access  Private (Stock, Admin, Staff)
const createShelfCreateRequest = async (req, res) => {
  try {
    const { shelfCode, shelfName, zone, capacity, description, reason, note } = req.body;

    if (!shelfCode || !shelfCode.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã kệ sách (VD: KE-A4, KE-B2)' });
    }
    if (!shelfName || !shelfName.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên kệ sách' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hoặc nhập lý do đề xuất thêm kệ' });
    }

    const formattedCode = shelfCode.trim().toUpperCase();

    // Kiểm tra xem kệ đã tồn tại trong kho chưa
    const existingShelf = await Shelf.findOne({ shelfCode: formattedCode });
    if (existingShelf) {
      return res.status(400).json({
        success: false,
        message: `Mã kệ "${formattedCode}" đã tồn tại trong kho (${existingShelf.shelfName})!`
      });
    }

    // Kiểm tra xem đã có yêu cầu thêm kệ nào đang ở trạng thái pending cho mã kệ này chưa
    const existingPending = await ShelfCreateRequest.findOne({
      shelfCode: formattedCode,
      status: 'pending'
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: `Đã có yêu cầu thêm kệ (${existingPending.requestCode}) với mã "${formattedCode}" đang chờ Admin phê duyệt!`
      });
    }

    const validZones = ['Khu A', 'Khu B', 'Khu C', 'Khu D', 'Khu Dự Phòng'];
    const chosenZone = validZones.includes(zone) ? zone : 'Khu A';
    const parsedCapacity = Number(capacity);
    if (isNaN(parsedCapacity) || parsedCapacity < 1) {
      return res.status(400).json({ success: false, message: 'Sức chứa tối đa của kệ phải là số nguyên tối thiểu 1 cuốn' });
    }

    const createReq = new ShelfCreateRequest({
      shelfCode: formattedCode,
      shelfName: shelfName.trim(),
      zone: chosenZone,
      capacity: parsedCapacity,
      description: (description || '').trim(),
      reason: reason.trim(),
      note: (note || '').trim(),
      requestedBy: req.user._id,
      requestedByName: req.user.name || 'Nhân viên kho',
      requestedByRole: req.user.role || 'stock',
      status: 'pending'
    });

    await createReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_CREATE_REQUEST_SUBMIT',
      severity: 'WARNING',
      targetId: String(createReq._id),
      targetModel: 'ShelfCreateRequest',
      targetLabel: `${createReq.requestCode} - ${createReq.shelfCode}`,
      description: `Nhân viên kho ${req.user.name} đã gửi yêu cầu thêm kệ sách mới "${createReq.shelfName}" (${createReq.shelfCode}) tại ${createReq.zone}, sức chứa ${createReq.capacity} cuốn. Lý do: ${createReq.reason}`
    });

    res.status(201).json({
      success: true,
      message: `Đã gửi yêu cầu thêm kệ sách "${createReq.shelfName}" (${createReq.shelfCode}) tới Quản trị viên thành công. Vui lòng chờ Admin phê duyệt!`,
      data: createReq
    });
  } catch (error) {
    console.error('Lỗi createShelfCreateRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tạo yêu cầu thêm kệ sách' });
  }
};

// @desc    Lấy danh sách tất cả yêu cầu thêm kệ sách
// @route   GET /api/inventory/shelf-create-requests
// @access  Private (Stock, Admin, Staff)
const getAllShelfCreateRequests = async (req, res) => {
  try {
    const { status, zone, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all' && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      filter.status = status;
    }
    if (zone && zone !== 'all') {
      filter.zone = zone;
    }
    if (search && search.trim()) {
      const kw = search.trim();
      const regex = new RegExp(kw, 'i');
      filter.$or = [
        { requestCode: regex },
        { shelfCode: regex },
        { shelfName: regex },
        { requestedByName: regex },
        { reason: regex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [requests, total, pendingCount, approvedCount, rejectedCount, allCount] = await Promise.all([
      ShelfCreateRequest.find(filter)
        .populate('requestedBy', 'name email role')
        .populate('reviewedBy', 'name email role')
        .populate('createdShelf', 'shelfCode shelfName zone capacity status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ShelfCreateRequest.countDocuments(filter),
      ShelfCreateRequest.countDocuments({ status: 'pending' }),
      ShelfCreateRequest.countDocuments({ status: 'approved' }),
      ShelfCreateRequest.countDocuments({ status: 'rejected' }),
      ShelfCreateRequest.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: allCount
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Lỗi getAllShelfCreateRequests:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tải danh sách yêu cầu thêm kệ' });
  }
};

// @desc    Lấy chi tiết 1 yêu cầu thêm kệ sách
// @route   GET /api/inventory/shelf-create-requests/:id
// @access  Private (Stock, Admin, Staff)
const getShelfCreateRequestById = async (req, res) => {
  try {
    const request = await ShelfCreateRequest.findById(req.params.id)
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('createdShelf')
      .lean();

    if (!request) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu thêm kệ sách' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('Lỗi getShelfCreateRequestById:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi xem chi tiết yêu cầu' });
  }
};

// @desc    Admin phê duyệt yêu cầu thêm kệ sách -> Chính thức tạo kệ mới
// @route   PUT /api/inventory/shelf-create-requests/:id/approve
// @access  Private (Admin)
const approveShelfCreateRequest = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const reqDoc = await ShelfCreateRequest.findById(req.params.id);

    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu thêm kệ sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${reqDoc.status}).`
      });
    }

    // Kiểm tra xem mã kệ này có bị trùng với kệ đã tạo trước đó không
    const existing = await Shelf.findOne({ shelfCode: reqDoc.shelfCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã kệ "${reqDoc.shelfCode}" đã tồn tại trong kho (${existing.shelfName}). Vui lòng kiểm tra lại!`
      });
    }

    // Tạo kệ sách mới chính thức
    const shelf = await Shelf.create({
      shelfCode: reqDoc.shelfCode,
      shelfName: reqDoc.shelfName,
      zone: reqDoc.zone || 'Khu A',
      capacity: reqDoc.capacity || 100,
      description: reqDoc.description || '',
      status: 'available'
    });

    reqDoc.status = 'approved';
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedByName = req.user.name || 'Quản trị viên';
    reqDoc.reviewedAt = new Date();
    reqDoc.adminNote = (adminNote || '').trim();
    reqDoc.createdShelf = shelf._id;
    await reqDoc.save();

    // Ghi nhật ký hoạt động kệ sách
    await logShelfActivity({
      action: 'SHELF_CREATE',
      description: `Quản trị viên phê duyệt yêu cầu ${reqDoc.requestCode} của ${reqDoc.requestedByName}: Tạo kệ sách "${shelf.shelfName}" (${shelf.shelfCode}), khu vực ${shelf.zone}, sức chứa ${shelf.capacity} cuốn.`,
      toShelf: { _id: shelf._id, shelfCode: shelf.shelfCode, shelfName: shelf.shelfName },
      performer: req.user,
      details: {
        zone: shelf.zone,
        capacity: shelf.capacity,
        description: shelf.description,
        requestCode: reqDoc.requestCode,
        reason: reqDoc.reason
      }
    });

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_CREATE_REQUEST_APPROVE',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfCreateRequest',
      targetLabel: `${reqDoc.requestCode} - ${shelf.shelfCode}`,
      description: `Quản trị viên ${req.user.name} đã phê duyệt yêu cầu thêm kệ sách ${shelf.shelfCode} (${shelf.shelfName}) của ${reqDoc.requestedByName}`,
      metadata: {
        shelfId: shelf._id,
        shelfCode: shelf.shelfCode,
        zone: shelf.zone,
        capacity: shelf.capacity
      }
    });

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt yêu cầu và tạo thành công kệ sách "${shelf.shelfName}" (${shelf.shelfCode})!`,
      data: {
        request: reqDoc,
        shelf
      }
    });
  } catch (error) {
    console.error('Lỗi approveShelfCreateRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi phê duyệt yêu cầu thêm kệ' });
  }
};

// @desc    Admin từ chối yêu cầu thêm kệ sách
// @route   PUT /api/inventory/shelf-create-requests/:id/reject
// @access  Private (Admin)
const rejectShelfCreateRequest = async (req, res) => {
  try {
    const { reason, rejectReason, adminNote } = req.body;
    const reasonText = (reason || rejectReason || adminNote || '').trim();

    if (!reasonText) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối yêu cầu thêm kệ để thông báo tới nhân viên kho' });
    }

    const reqDoc = await ShelfCreateRequest.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu thêm kệ sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${reqDoc.status}).`
      });
    }

    reqDoc.status = 'rejected';
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedByName = req.user.name || 'Quản trị viên';
    reqDoc.reviewedAt = new Date();
    reqDoc.adminNote = reasonText;
    await reqDoc.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_CREATE_REQUEST_REJECT',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfCreateRequest',
      targetLabel: `${reqDoc.requestCode} - ${reqDoc.shelfCode}`,
      description: `Quản trị viên ${req.user.name} từ chối yêu cầu thêm kệ sách "${reqDoc.shelfCode}" (${reqDoc.shelfName}) của ${reqDoc.requestedByName}. Lý do: ${reasonText}`
    });

    res.status(200).json({
      success: true,
      message: `Đã từ chối yêu cầu thêm kệ sách "${reqDoc.shelfCode}".`,
      data: reqDoc
    });
  } catch (error) {
    console.error('Lỗi rejectShelfCreateRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi từ chối yêu cầu thêm kệ' });
  }
};

// @desc    Nhân viên kho hủy yêu cầu thêm kệ đang chờ duyệt
// @route   PUT /api/inventory/shelf-create-requests/:id/cancel
// @access  Private (Stock, Admin)
const cancelShelfCreateRequest = async (req, res) => {
  try {
    const reqDoc = await ShelfCreateRequest.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu thêm kệ sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy các yêu cầu đang ở trạng thái chờ duyệt!'
      });
    }

    // Nếu không phải Admin thì chỉ người tạo mới được hủy
    if (req.user.role !== 'admin' && String(reqDoc.requestedBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy yêu cầu của người khác!'
      });
    }

    reqDoc.status = 'cancelled';
    await reqDoc.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_CREATE_REQUEST_CANCEL',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfCreateRequest',
      targetLabel: `${reqDoc.requestCode} - ${reqDoc.shelfCode}`,
      description: `Người dùng ${req.user.name} đã hủy yêu cầu thêm kệ sách "${reqDoc.shelfCode}" (${reqDoc.requestCode})`
    });

    res.status(200).json({
      success: true,
      message: `Đã hủy yêu cầu thêm kệ sách "${reqDoc.shelfCode}" thành công.`,
      data: reqDoc
    });
  } catch (error) {
    console.error('Lỗi cancelShelfCreateRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi hủy yêu cầu thêm kệ' });
  }
};

// ================= SHELF MAINTENANCE REQUEST CONTROLLERS =================

// @desc    Nhân viên kho gửi yêu cầu bảo trì kệ sách tới Quản trị viên
// @route   POST /api/inventory/shelf-maintenance-requests
// @access  Private (Stock, Admin, Staff)
const createShelfMaintenanceRequest = async (req, res) => {
  try {
    const { shelfId, reason, expectedDuration, note } = req.body;

    if (!shelfId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn kệ sách cần bảo trì' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hoặc nhập lý do đề xuất bảo trì kệ' });
    }

    const shelf = await Shelf.findById(shelfId);
    if (!shelf) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kệ sách' });
    }

    if (shelf.shelfCode === 'KE-DP') {
      return res.status(400).json({
        success: false,
        message: 'Kệ Dự Phòng là kệ trung tâm dự phòng của kho, không thể đưa vào bảo trì!'
      });
    }

    if (shelf.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        message: `Kệ "${shelf.shelfName}" (${shelf.shelfCode}) hiện đang trong trạng thái bảo trì rồi!`
      });
    }

    // Kiểm tra xem đã có yêu cầu bảo trì nào đang pending cho kệ này chưa
    const existingPending = await ShelfMaintenanceRequest.findOne({
      shelf: shelf._id,
      status: 'pending'
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: `Đã có yêu cầu bảo trì (${existingPending.requestCode}) cho kệ "${shelf.shelfCode}" đang chờ Admin phê duyệt!`
      });
    }

    // Đếm số sách và cuốn sách thực tế trên kệ hiện tại
    const booksOnShelf = await Book.find({ shelf: shelf._id, isDeleted: { $ne: true } });
    const currentUnits = booksOnShelf.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

    const maintReq = new ShelfMaintenanceRequest({
      shelf: shelf._id,
      shelfCode: shelf.shelfCode,
      shelfName: shelf.shelfName,
      zone: shelf.zone,
      capacity: shelf.capacity,
      currentUnits,
      booksCount: booksOnShelf.length,
      reason: reason.trim(),
      expectedDuration: (expectedDuration || '1 - 2 ngày').trim(),
      note: (note || '').trim(),
      requestedBy: req.user._id,
      requestedByName: req.user.name || 'Thủ kho',
      requestedByRole: req.user.role || 'stock',
      status: 'pending'
    });

    await maintReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_MAINTENANCE_REQUEST_SUBMIT',
      severity: 'WARNING',
      targetId: String(maintReq._id),
      targetModel: 'ShelfMaintenanceRequest',
      targetLabel: `${maintReq.requestCode} - ${maintReq.shelfCode}`,
      description: `Nhân viên kho ${req.user.name} đã gửi yêu cầu bảo trì kệ sách "${maintReq.shelfName}" (${maintReq.shelfCode}) đang chứa ${currentUnits} cuốn. Lý do: ${maintReq.reason}`
    });

    res.status(201).json({
      success: true,
      message: `Đã gửi yêu cầu bảo trì kệ sách "${maintReq.shelfName}" (${maintReq.shelfCode}) tới Quản trị viên thành công. Vui lòng chờ Admin phê duyệt!`,
      data: maintReq
    });
  } catch (error) {
    console.error('Lỗi createShelfMaintenanceRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tạo yêu cầu bảo trì kệ' });
  }
};

// @desc    Lấy danh sách tất cả yêu cầu bảo trì kệ sách
// @route   GET /api/inventory/shelf-maintenance-requests
// @access  Private (Stock, Admin, Staff)
const getAllShelfMaintenanceRequests = async (req, res) => {
  try {
    const { status, zone, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all' && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      filter.status = status;
    }
    if (zone && zone !== 'all') {
      filter.zone = zone;
    }
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { requestCode: regex },
        { shelfCode: regex },
        { shelfName: regex },
        { reason: regex },
        { requestedByName: regex }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total, countPending, countApproved, countRejected, countCancelled, countAll] = await Promise.all([
      ShelfMaintenanceRequest.find(filter)
        .populate('requestedBy', 'name email role')
        .populate('reviewedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ShelfMaintenanceRequest.countDocuments(filter),
      ShelfMaintenanceRequest.countDocuments({ status: 'pending' }),
      ShelfMaintenanceRequest.countDocuments({ status: 'approved' }),
      ShelfMaintenanceRequest.countDocuments({ status: 'rejected' }),
      ShelfMaintenanceRequest.countDocuments({ status: 'cancelled' }),
      ShelfMaintenanceRequest.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      counts: {
        all: countAll,
        pending: countPending,
        approved: countApproved,
        rejected: countRejected,
        cancelled: countCancelled
      }
    });
  } catch (error) {
    console.error('Lỗi getAllShelfMaintenanceRequests:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy danh sách yêu cầu bảo trì kệ' });
  }
};

// @desc    Lấy chi tiết yêu cầu bảo trì kệ sách theo ID
// @route   GET /api/inventory/shelf-maintenance-requests/:id
// @access  Private (Stock, Admin, Staff)
const getShelfMaintenanceRequestById = async (req, res) => {
  try {
    const request = await ShelfMaintenanceRequest.findById(req.params.id)
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('shelf');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu bảo trì kệ sách' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('Lỗi getShelfMaintenanceRequestById:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy chi tiết yêu cầu bảo trì' });
  }
};

// @desc    Admin phê duyệt yêu cầu bảo trì kệ sách -> Tự động chuyển sách sang Kệ Dự Phòng & đặt kệ vào chế độ bảo trì
// @route   PUT /api/inventory/shelf-maintenance-requests/:id/approve
// @access  Private (Admin)
const approveShelfMaintenanceRequest = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const reqDoc = await ShelfMaintenanceRequest.findById(req.params.id);

    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu bảo trì kệ sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${reqDoc.status}).`
      });
    }

    const shelf = await Shelf.findById(reqDoc.shelf);
    if (!shelf) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kệ sách cần bảo trì trong hệ thống!' });
    }

    if (shelf.shelfCode === 'KE-DP') {
      return res.status(400).json({
        success: false,
        message: 'Kệ Dự Phòng là kệ trung tâm dự phòng của kho, không thể đưa vào chế độ bảo trì!'
      });
    }

    const backupShelf = await getOrCreateBackupShelf();

    // 1. Tìm toàn bộ sách đang có trên kệ này
    const booksOnShelf = await Book.find({ shelf: shelf._id, isDeleted: { $ne: true } });
    const totalUnits = booksOnShelf.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

    // 2. Chuyển sách sang KE-DP
    if (booksOnShelf.length > 0) {
      await Book.updateMany(
        { shelf: shelf._id },
        {
          $set: {
            shelf: backupShelf._id,
            shelfPosition: backupShelf.shelfName,
            shelfLocation: backupShelf.shelfName
          }
        }
      );
      await updateShelfStatus(backupShelf._id);
    }

    // 3. Đặt trạng thái kệ thành maintenance
    shelf.status = 'maintenance';
    await shelf.save();
    await updateShelfStatus(shelf._id);

    // 4. Cập nhật yêu cầu bảo trì
    const movedBookIds = booksOnShelf.map(b => b._id);
    reqDoc.status = 'approved';
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedByName = req.user.name || 'Quản trị viên';
    reqDoc.reviewedAt = new Date();
    reqDoc.adminNote = (adminNote || '').trim();
    reqDoc.executedAt = new Date();
    reqDoc.movedToBackupUnits = totalUnits;
    reqDoc.movedBookIds = movedBookIds;
    await reqDoc.save();

    // 5. Ghi nhật ký kệ sách
    await logShelfActivity({
      action: 'SHELF_MAINTENANCE_START',
      description: `Quản trị viên phê duyệt yêu cầu bảo trì ${reqDoc.requestCode} của ${reqDoc.requestedByName}: Đưa kệ "${shelf.shelfName}" (${shelf.shelfCode}) vào BẢO TRÌ. Đã chuyển ${booksOnShelf.length} đầu sách (${totalUnits} cuốn) sang Kệ Dự Phòng (${backupShelf.shelfCode}).`,
      fromShelf: { _id: shelf._id, shelfCode: shelf.shelfCode, shelfName: shelf.shelfName },
      toShelf: { _id: backupShelf._id, shelfCode: backupShelf.shelfCode, shelfName: backupShelf.shelfName },
      quantity: totalUnits,
      performer: req.user,
      details: {
        requestCode: reqDoc.requestCode,
        reason: reqDoc.reason,
        expectedDuration: reqDoc.expectedDuration,
        movedBooksCount: booksOnShelf.length,
        movedUnits: totalUnits,
        movedBookIds
      }
    });

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_MAINTENANCE_REQUEST_APPROVE',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfMaintenanceRequest',
      targetLabel: `${reqDoc.requestCode} - ${shelf.shelfCode}`,
      description: `Quản trị viên ${req.user.name} đã phê duyệt yêu cầu bảo trì kệ sách ${shelf.shelfCode} (${shelf.shelfName}) của ${reqDoc.requestedByName}. Đã chuyển ${totalUnits} cuốn sang KE-DP.`
    });

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt yêu cầu bảo trì kệ "${shelf.shelfName}" (${shelf.shelfCode})! Đã chuyển ${booksOnShelf.length} đầu sách (${totalUnits} cuốn) sang Kệ Dự Phòng an toàn.`,
      data: {
        request: reqDoc,
        shelf,
        movedUnits: totalUnits,
        movedBooksCount: booksOnShelf.length
      }
    });
  } catch (error) {
    console.error('Lỗi approveShelfMaintenanceRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi phê duyệt yêu cầu bảo trì kệ' });
  }
};

// @desc    Admin từ chối yêu cầu bảo trì kệ sách
// @route   PUT /api/inventory/shelf-maintenance-requests/:id/reject
// @access  Private (Admin)
const rejectShelfMaintenanceRequest = async (req, res) => {
  try {
    const { reason, rejectReason, adminNote } = req.body;
    const reasonText = (reason || rejectReason || adminNote || '').trim();

    if (!reasonText) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối yêu cầu bảo trì kệ' });
    }

    const reqDoc = await ShelfMaintenanceRequest.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu bảo trì kệ sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${reqDoc.status}).`
      });
    }

    reqDoc.status = 'rejected';
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedByName = req.user.name || 'Quản trị viên';
    reqDoc.reviewedAt = new Date();
    reqDoc.adminNote = reasonText;
    await reqDoc.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_MAINTENANCE_REQUEST_REJECT',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfMaintenanceRequest',
      targetLabel: `${reqDoc.requestCode} - ${reqDoc.shelfCode}`,
      description: `Quản trị viên ${req.user.name} từ chối yêu cầu bảo trì kệ sách "${reqDoc.shelfCode}" (${reqDoc.shelfName}) của ${reqDoc.requestedByName}. Lý do: ${reasonText}`
    });

    res.status(200).json({
      success: true,
      message: `Đã từ chối yêu cầu bảo trì kệ sách "${reqDoc.shelfCode}".`,
      data: reqDoc
    });
  } catch (error) {
    console.error('Lỗi rejectShelfMaintenanceRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi từ chối yêu cầu bảo trì kệ' });
  }
};

// @desc    Nhân viên kho hủy yêu cầu bảo trì đang chờ duyệt
// @route   PUT /api/inventory/shelf-maintenance-requests/:id/cancel
// @access  Private (Stock, Admin)
const cancelShelfMaintenanceRequest = async (req, res) => {
  try {
    const reqDoc = await ShelfMaintenanceRequest.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu bảo trì kệ sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy các yêu cầu đang ở trạng thái chờ duyệt!'
      });
    }

    if (req.user.role !== 'admin' && String(reqDoc.requestedBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy yêu cầu của người khác!'
      });
    }

    reqDoc.status = 'cancelled';
    await reqDoc.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_MAINTENANCE_REQUEST_CANCEL',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfMaintenanceRequest',
      targetLabel: `${reqDoc.requestCode} - ${reqDoc.shelfCode}`,
      description: `Người dùng ${req.user.name} đã hủy yêu cầu bảo trì kệ sách "${reqDoc.shelfCode}" (${reqDoc.requestCode})`
    });

    res.status(200).json({
      success: true,
      message: `Đã hủy yêu cầu bảo trì kệ sách "${reqDoc.shelfCode}" thành công.`,
      data: reqDoc
    });
  } catch (error) {
    console.error('Lỗi cancelShelfMaintenanceRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi hủy yêu cầu bảo trì kệ' });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierDetail,
  getSupplierBooks,
  getSupplierHistory,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  quickCreateSupplier,
  getAllImportReceipts,
  getImportReceiptById,
  createImportReceipt,
  approveImportReceipt,
  rejectImportReceipt,
  completeImportReceipt,
  getAllExportReceipts,
  getExportReceiptById,
  createExportReceipt,
  approveExportReceipt,
  rejectExportReceipt,
  completeExportReceipt,
  cancelExportReceipt,
  getPendingReceipts,
  getAllAuditReceipts,
  getAuditReceiptById,
  createAuditReceipt,
  approveAuditReceipt,
  rejectAuditReceipt,
  adjustBookStock,
  getAdjustmentHistory,
  getInventoryLookup,
  updateBookShelfLocation,
  createSupplierReturn,
  adminApproveSupplierReturn,
  adminRejectSupplierReturn,
  warehouseDispatchSupplierReturn,
  getAllSupplierReturns,
  getSupplierReturnById,
  getCustomerReturnsPendingWarehouse,
  processCustomerReturnDisposition,
  getAllShelves,
  createShelf,
  updateShelf,
  deleteShelf,
  transferBooksBetweenShelves,
  toggleShelfMaintenance,
  getShelfActivityLogs,
  logShelfActivity,
  createBookHideRequest,
  getAllBookHideRequests,
  getBookHideRequestById,
  approveBookHideRequest,
  rejectBookHideRequest,
  cancelBookHideRequest,
  executeBookHideRequest,
  createSupplierSuspendRequest,
  getAllSupplierSuspendRequests,
  getSupplierSuspendRequestById,
  approveSupplierSuspendRequest,
  rejectSupplierSuspendRequest,
  cancelSupplierSuspendRequest,
  executeSupplierSuspendRequest,
  createShelfCreateRequest,
  getAllShelfCreateRequests,
  getShelfCreateRequestById,
  approveShelfCreateRequest,
  rejectShelfCreateRequest,
  cancelShelfCreateRequest,
  createShelfMaintenanceRequest,
  getAllShelfMaintenanceRequests,
  getShelfMaintenanceRequestById,
  approveShelfMaintenanceRequest,
  rejectShelfMaintenanceRequest,
  cancelShelfMaintenanceRequest
};

// ================= SHELF TRANSFER REQUEST CONTROLLERS =================

// @desc    Nhân viên kho gửi yêu cầu điều chuyển sách tới Quản trị viên
// @route   POST /api/inventory/shelf-transfer-requests
// @access  Private (Stock, Admin, Staff)
const createShelfTransferRequest = async (req, res) => {
  try {
    const { bookIds, targetShelfId, reason, note } = req.body;

    if (!Array.isArray(bookIds) || bookIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn danh sách sách cần điều chuyển' });
    }
    if (!targetShelfId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn kệ đích tiếp nhận' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hoặc nhập lý do điều chuyển sách' });
    }

    const targetShelf = await Shelf.findById(targetShelfId);
    if (!targetShelf) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kệ đích tiếp nhận' });
    }

    if (targetShelf.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        message: `Kệ đích "${targetShelf.shelfName}" (${targetShelf.shelfCode}) đang trong chế độ BẢO TRÌ! Không thể điều chuyển sách vào kệ này.`
      });
    }

    const booksToMove = await Book.find({ _id: { $in: bookIds }, isDeleted: { $ne: true } });
    if (booksToMove.length === 0) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy sách hợp lệ để chuyển' });
    }

    const totalStockToMove = booksToMove.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

    // Tính số lượng sách chuyển từ các kệ KHÁC sang kệ đích (loại trừ sách vốn đã ở kệ đích)
    const nonTargetBooksStock = booksToMove
      .filter(b => !b.shelf || b.shelf.toString() !== targetShelf._id.toString())
      .reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

    const targetOccupancy = await getShelfOccupancy(targetShelf._id);
    const remainingTargetSpace = targetShelf.capacity - targetOccupancy;

    if (nonTargetBooksStock > remainingTargetSpace) {
      const safeRemaining = Math.max(0, remainingTargetSpace);
      return res.status(400).json({
        success: false,
        message: `Kệ đích "${targetShelf.shelfName}" chỉ còn trống ${safeRemaining} cuốn. Không đủ chứa ${nonTargetBooksStock} cuốn điều chuyển đến!`
      });
    }

    // Xây dựng danh sách items chi tiết
    const items = [];
    for (const b of booksToMove) {
      let fromShelfDoc = null;
      if (b.shelf) {
        fromShelfDoc = await Shelf.findById(b.shelf);
      } else if (b.shelfLocation || b.shelfPosition) {
        fromShelfDoc = await resolveShelf(b.shelfLocation || b.shelfPosition);
      }

      items.push({
        book: b._id,
        bookCode: b.bookCode || b.isbn || 'SKU',
        title: b.title,
        author: b.author || '—',
        price: b.price || 0,
        quantity: b.stock || 0,
        fromShelf: fromShelfDoc ? fromShelfDoc._id : null,
        fromShelfCode: fromShelfDoc ? fromShelfDoc.shelfCode : (b.shelfLocation || b.shelfPosition || 'Chưa xếp kệ'),
        fromShelfName: fromShelfDoc ? fromShelfDoc.shelfName : (b.shelfLocation || b.shelfPosition || 'Chưa xếp kệ')
      });
    }

    const transferReq = new ShelfTransferRequest({
      items,
      targetShelf: targetShelf._id,
      targetShelfCode: targetShelf.shelfCode,
      targetShelfName: targetShelf.shelfName,
      targetZone: targetShelf.zone,
      targetCapacity: targetShelf.capacity,
      totalBooksCount: booksToMove.length,
      totalQuantity: totalStockToMove,
      reason: reason.trim(),
      note: (note || '').trim(),
      requestedBy: req.user._id,
      requestedByName: req.user.name || 'Thủ kho',
      requestedByRole: req.user.role || 'stock',
      status: 'pending'
    });

    await transferReq.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_TRANSFER_REQUEST_SUBMIT',
      severity: 'WARNING',
      targetId: String(transferReq._id),
      targetModel: 'ShelfTransferRequest',
      targetLabel: `${transferReq.requestCode} -> ${targetShelf.shelfCode}`,
      description: `Nhân viên kho ${req.user.name} đã gửi yêu cầu điều chuyển ${booksToMove.length} đầu sách (${totalStockToMove} cuốn) sang kệ ${targetShelf.shelfCode} (${targetShelf.shelfName}). Lý do: ${transferReq.reason}`
    });

    res.status(201).json({
      success: true,
      message: `Đã gửi yêu cầu điều chuyển ${booksToMove.length} đầu sách (${totalStockToMove} cuốn) sang kệ "${targetShelf.shelfName}" (${targetShelf.shelfCode}) tới Quản trị viên thành công. Vui lòng chờ Admin phê duyệt!`,
      data: transferReq
    });
  } catch (error) {
    console.error('Lỗi createShelfTransferRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tạo yêu cầu điều chuyển sách' });
  }
};

// @desc    Lấy danh sách tất cả yêu cầu điều chuyển sách
// @route   GET /api/inventory/shelf-transfer-requests
// @access  Private (Stock, Admin, Staff)
const getAllShelfTransferRequests = async (req, res) => {
  try {
    const { status, zone, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all' && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      filter.status = status;
    }
    if (zone && zone !== 'all') {
      filter.targetZone = zone;
    }
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { requestCode: regex },
        { targetShelfCode: regex },
        { targetShelfName: regex },
        { reason: regex },
        { requestedByName: regex },
        { 'items.title': regex },
        { 'items.bookCode': regex }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total, countPending, countApproved, countRejected, countCancelled, countAll] = await Promise.all([
      ShelfTransferRequest.find(filter)
        .populate('requestedBy', 'name email role')
        .populate('reviewedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ShelfTransferRequest.countDocuments(filter),
      ShelfTransferRequest.countDocuments({ status: 'pending' }),
      ShelfTransferRequest.countDocuments({ status: 'approved' }),
      ShelfTransferRequest.countDocuments({ status: 'rejected' }),
      ShelfTransferRequest.countDocuments({ status: 'cancelled' }),
      ShelfTransferRequest.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      counts: {
        all: countAll,
        pending: countPending,
        approved: countApproved,
        rejected: countRejected,
        cancelled: countCancelled
      }
    });
  } catch (error) {
    console.error('Lỗi getAllShelfTransferRequests:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy danh sách yêu cầu điều chuyển sách' });
  }
};

// @desc    Lấy chi tiết yêu cầu điều chuyển sách theo ID
// @route   GET /api/inventory/shelf-transfer-requests/:id
// @access  Private (Stock, Admin, Staff)
const getShelfTransferRequestById = async (req, res) => {
  try {
    const request = await ShelfTransferRequest.findById(req.params.id)
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('targetShelf');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu điều chuyển sách' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('Lỗi getShelfTransferRequestById:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy chi tiết yêu cầu điều chuyển' });
  }
};

// @desc    Admin phê duyệt yêu cầu điều chuyển sách -> Chính thức thực hiện chuyển sách sang kệ đích
// @route   PUT /api/inventory/shelf-transfer-requests/:id/approve
// @access  Private (Admin)
const approveShelfTransferRequest = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const reqDoc = await ShelfTransferRequest.findById(req.params.id);

    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu điều chuyển sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${reqDoc.status}).`
      });
    }

    const targetShelf = await Shelf.findById(reqDoc.targetShelf);
    if (!targetShelf) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kệ đích tiếp nhận trong hệ thống!' });
    }

    if (targetShelf.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        message: `Kệ đích "${targetShelf.shelfName}" (${targetShelf.shelfCode}) hiện đang BẢO TRÌ! Không thể điều chuyển sách vào kệ này.`
      });
    }

    const bookIds = reqDoc.items.map(it => it.book);
    const booksToMove = await Book.find({ _id: { $in: bookIds }, isDeleted: { $ne: true } });
    if (booksToMove.length === 0) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy các đầu sách cần điều chuyển trong kho!' });
    }

    const nonTargetBooksStock = booksToMove
      .filter(b => !b.shelf || b.shelf.toString() !== targetShelf._id.toString())
      .reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

    const targetOccupancy = await getShelfOccupancy(targetShelf._id);
    const remainingTargetSpace = targetShelf.capacity - targetOccupancy;

    if (nonTargetBooksStock > remainingTargetSpace) {
      const safeRemaining = Math.max(0, remainingTargetSpace);
      return res.status(400).json({
        success: false,
        message: `Kệ đích "${targetShelf.shelfName}" chỉ còn trống ${safeRemaining} cuốn tại thời điểm duyệt. Không đủ chứa ${nonTargetBooksStock} cuốn điều chuyển!`
      });
    }

    const sourceShelfIds = [...new Set(booksToMove.map(b => b.shelf ? b.shelf.toString() : null).filter(Boolean))];

    // Cập nhật vị trí kệ mới cho các cuốn sách
    await Book.updateMany(
      { _id: { $in: bookIds } },
      {
        $set: {
          shelf: targetShelf._id,
          shelfPosition: targetShelf.shelfName,
          shelfLocation: targetShelf.shelfName
        }
      }
    );

    // Cập nhật lại dung lượng kệ đích và các kệ nguồn
    await updateShelfStatus(targetShelf._id);
    await updateMultipleShelves(sourceShelfIds);

    // Ghi nhật ký điều chuyển sách
    const movedBooksDetails = reqDoc.items.map(it => ({
      _id: it.book,
      bookCode: it.bookCode,
      title: it.title,
      author: it.author,
      price: it.price,
      quantity: it.quantity,
      fromShelfCode: it.fromShelfCode,
      toShelfCode: targetShelf.shelfCode
    }));

    await logShelfActivity({
      action: 'SHELF_TRANSFER',
      description: `Quản trị viên phê duyệt yêu cầu ${reqDoc.requestCode} của ${reqDoc.requestedByName}: Điều chuyển ${reqDoc.totalBooksCount} đầu sách (${reqDoc.totalQuantity} cuốn) sang kệ ${targetShelf.shelfCode} (${targetShelf.shelfName}). Lý do: ${reqDoc.reason}`,
      toShelf: { _id: targetShelf._id, shelfCode: targetShelf.shelfCode, shelfName: targetShelf.shelfName },
      toShelfCode: targetShelf.shelfCode,
      toShelfName: targetShelf.shelfName,
      quantity: reqDoc.totalQuantity,
      performer: req.user,
      details: {
        requestCode: reqDoc.requestCode,
        reason: reqDoc.reason,
        books: movedBooksDetails
      }
    });

    reqDoc.status = 'approved';
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedByName = req.user.name || 'Quản trị viên';
    reqDoc.reviewedAt = new Date();
    reqDoc.adminNote = (adminNote || '').trim();
    reqDoc.executedAt = new Date();
    await reqDoc.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_TRANSFER_REQUEST_APPROVE',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfTransferRequest',
      targetLabel: `${reqDoc.requestCode} -> ${targetShelf.shelfCode}`,
      description: `Quản trị viên ${req.user.name} đã phê duyệt yêu cầu điều chuyển ${reqDoc.totalBooksCount} đầu sách (${reqDoc.totalQuantity} cuốn) sang kệ ${targetShelf.shelfCode} của ${reqDoc.requestedByName}`
    });

    res.status(200).json({
      success: true,
      message: `Đã phê duyệt và thực hiện điều chuyển thành công ${reqDoc.totalBooksCount} đầu sách (${reqDoc.totalQuantity} cuốn) sang kệ "${targetShelf.shelfName}" (${targetShelf.shelfCode})!`,
      data: reqDoc
    });
  } catch (error) {
    console.error('Lỗi approveShelfTransferRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi phê duyệt yêu cầu điều chuyển sách' });
  }
};

// @desc    Admin từ chối yêu cầu điều chuyển sách
// @route   PUT /api/inventory/shelf-transfer-requests/:id/reject
// @access  Private (Admin)
const rejectShelfTransferRequest = async (req, res) => {
  try {
    const { reason, rejectReason, adminNote } = req.body;
    const reasonText = (reason || rejectReason || adminNote || '').trim();

    if (!reasonText) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối yêu cầu điều chuyển sách' });
    }

    const reqDoc = await ShelfTransferRequest.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu điều chuyển sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Yêu cầu này không ở trạng thái chờ duyệt (Hiện tại: ${reqDoc.status}).`
      });
    }

    reqDoc.status = 'rejected';
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedByName = req.user.name || 'Quản trị viên';
    reqDoc.reviewedAt = new Date();
    reqDoc.adminNote = reasonText;
    await reqDoc.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_TRANSFER_REQUEST_REJECT',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfTransferRequest',
      targetLabel: `${reqDoc.requestCode} -> ${reqDoc.targetShelfCode}`,
      description: `Quản trị viên ${req.user.name} từ chối yêu cầu điều chuyển sách ${reqDoc.requestCode} sang kệ ${reqDoc.targetShelfCode} của ${reqDoc.requestedByName}. Lý do: ${reasonText}`
    });

    res.status(200).json({
      success: true,
      message: `Đã từ chối yêu cầu điều chuyển sách "${reqDoc.requestCode}".`,
      data: reqDoc
    });
  } catch (error) {
    console.error('Lỗi rejectShelfTransferRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi từ chối yêu cầu điều chuyển sách' });
  }
};

// @desc    Nhân viên kho hủy yêu cầu điều chuyển sách đang chờ duyệt
// @route   PUT /api/inventory/shelf-transfer-requests/:id/cancel
// @access  Private (Stock, Admin)
const cancelShelfTransferRequest = async (req, res) => {
  try {
    const reqDoc = await ShelfTransferRequest.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu điều chuyển sách' });
    }

    if (reqDoc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy các yêu cầu đang ở trạng thái chờ duyệt!'
      });
    }

    if (req.user.role !== 'admin' && String(reqDoc.requestedBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy yêu cầu của người khác!'
      });
    }

    reqDoc.status = 'cancelled';
    await reqDoc.save();

    logActivity(req, {
      module: 'INVENTORY',
      action: 'SHELF_TRANSFER_REQUEST_CANCEL',
      severity: 'INFO',
      targetId: String(reqDoc._id),
      targetModel: 'ShelfTransferRequest',
      targetLabel: `${reqDoc.requestCode} -> ${reqDoc.targetShelfCode}`,
      description: `Người dùng ${req.user.name} đã hủy yêu cầu điều chuyển sách "${reqDoc.requestCode}"`
    });

    res.status(200).json({
      success: true,
      message: `Đã hủy yêu cầu điều chuyển sách "${reqDoc.requestCode}" thành công.`,
      data: reqDoc
    });
  } catch (error) {
    console.error('Lỗi cancelShelfTransferRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi hủy yêu cầu điều chuyển sách' });
  }
};

module.exports.createShelfTransferRequest = createShelfTransferRequest;
module.exports.getAllShelfTransferRequests = getAllShelfTransferRequests;
module.exports.getShelfTransferRequestById = getShelfTransferRequestById;
module.exports.approveShelfTransferRequest = approveShelfTransferRequest;
module.exports.rejectShelfTransferRequest = rejectShelfTransferRequest;
module.exports.cancelShelfTransferRequest = cancelShelfTransferRequest;
