const Invoice = require('../models/Invoice');
const Book = require('../models/Book');
const User = require('../models/User');
const Category = require('../models/Category');
const AuditReceipt = require('../models/AuditReceipt');

// Helper escape regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// @desc    Lấy dữ liệu tổng quan cho Bàn làm việc (Dashboard Overview)
// @route   GET /api/admin/dashboard-overview
// @access  Private (Admin, Staff, Stock, Accountant)
const getDashboardOverview = async (req, res) => {
  try {
    // 1. Tổng doanh thu thực tế (đơn completed/paid trừ đi hoàn trả inspected_ok)
    const completedRevAgg = await Invoice.aggregate([
      { $match: { status: { $in: ['completed', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const completedRevenue = completedRevAgg[0]?.total || 0;

    const refundAgg = await Invoice.aggregate([
      {
        $match: {
          'returnRequest.status': {
            $in: [
              'inspected_ok',
              'approved_transferred_to_warehouse',
              'warehouse_restocked',
              'warehouse_returned_supplier',
              'warehouse_discarded'
            ]
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const refundAmount = refundAgg[0]?.total || 0;
    const totalRevenue = Math.max(0, completedRevenue - refundAmount);

    // 2. Tổng số đơn mua (trừ đơn cancelled)
    const totalOrders = await Invoice.countDocuments({ status: { $ne: 'cancelled' } });

    // 3. Đơn cần xử lý ngay (pending_confirmation, pending_payment hoặc returnRequest đang requested / shipping_back)
    const urgentOrders = await Invoice.countDocuments({
      $or: [
        { status: { $in: ['pending_confirmation', 'pending_payment', 'unpaid', 'pending'] } },
        { 'returnRequest.status': { $in: ['requested', 'shipping_back'] } }
      ]
    });

    // 3.1. Đợt kiểm kê có chênh lệch đang chờ Ban Giám Đốc thẩm định
    let pendingAuditsCount = 0;
    try {
      pendingAuditsCount = await AuditReceipt.countDocuments({ status: 'pending_approval' });
    } catch (auditErr) {
      console.error('Lỗi đếm phiếu kiểm kê chờ duyệt (không ảnh hưởng Dashboard):', auditErr.message);
    }

    // 4. Tổng sách tồn kho
    const stockAgg = await Book.aggregate([
      { $group: { _id: null, total: { $sum: '$stock' } } }
    ]);
    const totalStock = stockAgg[0]?.total || 0;

    // 5. Cảnh báo sách sắp hết hàng (stock <= 10)
    const lowStockBooks = await Book.find({ stock: { $lte: 10 } })
      .select('title stock isbn coverImage shelfLocation price author')
      .sort({ stock: 1 })
      .limit(5)
      .lean();

    // 6. Tiến độ giao hàng
    const shippedCount = await Invoice.countDocuments({ status: 'shipping' });
    const pendingAndDeliveringCount = await Invoice.countDocuments({
      status: { $in: ['pending_confirmation', 'pending_payment', 'delivering'] }
    });

    // 7. Đơn mua phát sinh gần nhất (10 đơn)
    const recentOrders = await Invoice.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email phone')
      .populate('items.book', 'title price coverImage author')
      .lean();

    // 8. Nhân sự đang hoạt động
    const activeStaff = await User.find({
      role: { $in: ['admin', 'staff', 'stock', 'accountant'] },
      status: { $ne: 'blocked' }
    })
      .select('name email phone role department shift status employeeCode')
      .sort({ role: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        kpi: {
          totalRevenue,
          totalOrders,
          urgentOrders,
          pendingAuditsCount,
          totalStock
        },
        lowStockBooks,
        shippingProgress: {
          shippedCount,
          pendingAndDeliveringCount
        },
        recentOrders,
        activeStaff
      }
    });
  } catch (error) {
    console.error('Lỗi getDashboardOverview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy dữ liệu tổng quan bàn làm việc'
    });
  }
};

// @desc    Lấy dữ liệu thống kê & phân tích chuyên sâu (Revenue Analytics & BI)
// @route   GET /api/admin/analytics
// @access  Private (Admin, Staff, Accountant)
const getAnalyticsReport = async (req, res) => {
  try {
    const { startDate, endDate, channel, category, categoryId, author, authorId } = req.query;

    // 1. Xử lý thời gian (GMT+7)
    let start, end;
    if (startDate) {
      start = new Date(`${startDate}T00:00:00.000+07:00`);
    } else {
      // Mặc định: Toàn bộ thời gian từ đầu năm đến nay (để khớp 100% với Tổng doanh thu thực tế)
      start = new Date('2025-01-01T00:00:00.000Z');
    }

    if (endDate) {
      end = new Date(`${endDate}T23:59:59.999+07:00`);
    } else {
      end = new Date();
    }

    if (isNaN(start.getTime())) start = new Date('2026-01-01T00:00:00.000+07:00');
    if (isNaN(end.getTime())) end = new Date();

    // 2. Bộ lọc cơ bản
    const baseMatch = {
      createdAt: { $gte: start, $lte: end },
      status: { $in: ['completed', 'paid'] }
    };

    const allPeriodMatch = {
      createdAt: { $gte: start, $lte: end }
    };

    if (channel === 'pos') {
      baseMatch.invoiceCode = { $regex: '^HD-(POS|\\d+)', $options: 'i' };
      allPeriodMatch.invoiceCode = { $regex: '^HD-(POS|\\d+)', $options: 'i' };
    } else if (channel === 'online') {
      baseMatch.invoiceCode = { $regex: '^HD-OL', $options: 'i' };
      allPeriodMatch.invoiceCode = { $regex: '^HD-OL', $options: 'i' };
    }

    // 3. Số đơn phát sinh & tỷ lệ hoàn thành
    const totalOrdersInPeriod = await Invoice.countDocuments(allPeriodMatch);
    const completedOrdersCount = await Invoice.countDocuments(baseMatch);
    const cancelledOrdersCount = await Invoice.countDocuments({ ...allPeriodMatch, status: 'cancelled' });
    const successRate = totalOrdersInPeriod > 0 ? Math.round((completedOrdersCount / totalOrdersInPeriod) * 100) : 100;

    // 4. Aggregation Pipeline chi tiết cho từng item sách đã bán
    const matchCat = (category || categoryId || '').trim();
    const matchAuthor = (author || authorId || '').trim();

    const pipeline = [
      { $match: baseMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.book',
          foreignField: '_id',
          as: 'bookInfo'
        }
      },
      { $unwind: { path: '$bookInfo', preserveNullAndEmptyArrays: true } }
    ];

    if (matchCat && matchCat !== 'all') {
      pipeline.push({
        $match: { 'bookInfo.category': { $regex: new RegExp('^' + escapeRegex(matchCat) + '$', 'i') } }
      });
    }

    if (matchAuthor && matchAuthor !== 'all') {
      pipeline.push({
        $match: { 'bookInfo.author': { $regex: new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i') } }
      });
    }

    pipeline.push({
      $project: {
        orderId: '$_id',
        invoiceCode: '$invoiceCode',
        paymentMethod: '$paymentMethod',
        createdAt: '$createdAt',
        customerName: { $ifNull: ['$customerName', 'Khách lẻ'] },
        customerPhone: { $ifNull: ['$customerPhone', ''] },
        user: '$user',
        finalAmount: '$finalAmount',
        totalAmount: '$totalAmount',
        bookId: '$items.book',
        title: { $ifNull: ['$bookInfo.title', { $ifNull: ['$items.title', 'Sách tham chiếu'] }] },
        author: { $ifNull: ['$bookInfo.author', 'Chưa rõ'] },
        category: { $ifNull: ['$bookInfo.category', 'Khác'] },
        coverImage: { $ifNull: ['$bookInfo.coverImage', '/images/covers/default-book.svg'] },
        stock: { $ifNull: ['$bookInfo.stock', 0] },
        price: '$items.price',
        quantity: '$items.quantity',
        costPrice: {
          $cond: [
            {
              $and: [
                { $gt: ['$items.costPrice', 0] },
                { $lt: ['$items.costPrice', '$items.price'] }
              ]
            },
            '$items.costPrice',
            {
              $cond: [
                {
                  $and: [
                    { $gt: ['$bookInfo.costPrice', 0] },
                    { $lt: ['$bookInfo.costPrice', '$items.price'] }
                  ]
                },
                '$bookInfo.costPrice',
                { $round: [{ $multiply: ['$items.price', 0.65] }, 0] }
              ]
            }
          ]
        },
        itemRevenue: { $multiply: ['$items.price', '$items.quantity'] }
      }
    });

    const itemsData = await Invoice.aggregate(pipeline);

    // Tính toán KPI tài chính từ các đơn bán thành công
    let grossCompletedRevenue = 0;
    let grossCompletedCost = 0;
    let totalItemsSold = 0;

    const bookSalesMap = {};
    const categorySalesMap = {};
    const authorSalesMap = {};
    const paymentMap = { cash: 0, transfer: 0, pos: 0 };
    const customerMap = {};

    itemsData.forEach(item => {
      const itemPrice = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const rev = Number(item.itemRevenue) || (itemPrice * qty);

      let cost = Number(item.costPrice) || 0;
      if (cost <= 0 || cost >= itemPrice) {
        cost = Math.round(itemPrice * 0.65);
      }
      const itemCostTotal = cost * qty;
      const itemProfit = Math.max(0, rev - itemCostTotal);

      grossCompletedRevenue += rev;
      grossCompletedCost += itemCostTotal;
      totalItemsSold += qty;

      // Book Map
      const bTitle = item.title && item.title !== 'undefined' ? item.title : (item.bookId ? `Sách #${String(item.bookId).slice(-4)}` : 'Đầu sách');
      const bAuthor = item.author && item.author !== 'undefined' ? item.author : 'Chưa rõ';
      const bCategory = item.category && item.category !== 'undefined' ? item.category : 'Khác';
      const bKey = item.bookId ? String(item.bookId) : bTitle;
      if (!bookSalesMap[bKey]) {
        bookSalesMap[bKey] = {
          bookId: item.bookId,
          title: bTitle,
          author: bAuthor,
          category: bCategory,
          coverImage: item.coverImage,
          stock: item.stock,
          price: itemPrice,
          costPrice: cost,
          totalCost: 0,
          soldQuantity: 0,
          quantity: 0,
          revenue: 0,
          grossProfit: 0
        };
      }
      bookSalesMap[bKey].soldQuantity += qty;
      bookSalesMap[bKey].quantity += qty;
      bookSalesMap[bKey].revenue += rev;
      bookSalesMap[bKey].totalCost += itemCostTotal;
      bookSalesMap[bKey].grossProfit += itemProfit;

      // Category Map
      const cKey = item.category || 'Khác';
      if (!categorySalesMap[cKey]) {
        categorySalesMap[cKey] = { category: cKey, soldQuantity: 0, revenue: 0 };
      }
      categorySalesMap[cKey].soldQuantity += qty;
      categorySalesMap[cKey].revenue += rev;

      // Author Map (Chỉ ghi nhận tác giả thực tế, loại bỏ 'Chưa rõ' / placeholder)
      const rawAuthor = item.author && item.author !== 'undefined' ? String(item.author).trim() : '';
      const isPlaceholderAuthor = !rawAuthor || [
        'chưa rõ', 'chua ro', 'không rõ', 'khong ro',
        'đang cập nhật', 'dang cap nhat', 'unknown', 'n/a',
        'chưa xác định', 'null', 'undefined'
      ].includes(rawAuthor.toLowerCase());

      if (!isPlaceholderAuthor) {
        if (!authorSalesMap[rawAuthor]) {
          authorSalesMap[rawAuthor] = { author: rawAuthor, soldQuantity: 0, revenue: 0 };
        }
        authorSalesMap[rawAuthor].soldQuantity += qty;
        authorSalesMap[rawAuthor].revenue += rev;
      }

      // Payment Map
      const pm = (item.paymentMethod || 'cash').toLowerCase();
      if (['transfer', 'banking'].includes(pm)) paymentMap.transfer += rev;
      else if (['pos', 'card', 'momo'].includes(pm)) paymentMap.pos += rev;
      else paymentMap.cash += rev;

      // Customer Loyalty Map
      const rawName = (item.customerName && String(item.customerName).trim()) ? String(item.customerName).trim() : 'Khách lẻ';
      const rawPhone = (item.customerPhone && String(item.customerPhone).trim()) ? String(item.customerPhone).trim() : '';
      const custKey = rawPhone || (rawName !== 'Khách lẻ' ? rawName : '') || (item.user ? String(item.user) : `Khách lẻ #${String(item.orderId).slice(-4)}`);

      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          key: custKey,
          name: rawName,
          phone: rawPhone,
          userId: item.user ? String(item.user) : null,
          totalSpent: 0,
          totalProducts: 0,
          orderCount: 0,
          orderIds: new Set()
        };
      }
      customerMap[custKey].totalProducts += qty;
      customerMap[custKey].totalSpent += rev;
      const oIdStr = String(item.orderId);
      if (!customerMap[custKey].orderIds.has(oIdStr)) {
        customerMap[custKey].orderIds.add(oIdStr);
        customerMap[custKey].orderCount += 1;
      }
    });

    // 5. Tính toán đơn hoàn trả thành công
    const refundMatch = {
      createdAt: { $gte: start, $lte: end },
      'returnRequest.status': {
        $in: [
          'inspected_ok',
          'approved_transferred_to_warehouse',
          'warehouse_restocked',
          'warehouse_returned_supplier',
          'warehouse_discarded'
        ]
      }
    };
    if (channel === 'pos') {
      refundMatch.invoiceCode = { $regex: '^HD-(POS|\\d+)', $options: 'i' };
    } else if (channel === 'online') {
      refundMatch.invoiceCode = { $regex: '^HD-OL', $options: 'i' };
    }

    const refundInvoices = await Invoice.find(refundMatch)
      .populate('items.book', 'costPrice price title category author')
      .lean();

    let totalRefundAmount = 0;
    let totalRefundCOGS = 0;
    const isFilteredByCatOrAuthor = (matchCat && matchCat !== 'all') || (matchAuthor && matchAuthor !== 'all');

    refundInvoices.forEach(rInv => {
      if (rInv.items && rInv.items.length > 0) {
        rInv.items.forEach(rItem => {
          const itemCat = (rItem.book && rItem.book.category) || rItem.category || '';
          const itemAuth = (rItem.book && rItem.book.author) || rItem.author || '';

          const catMatch = !matchCat || matchCat === 'all' || new RegExp('^' + escapeRegex(matchCat) + '$', 'i').test(itemCat);
          const authMatch = !matchAuthor || matchAuthor === 'all' || new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i').test(itemAuth);

          if (catMatch && authMatch) {
            const rPrice = Number(rItem.price) || (rItem.book && rItem.book.price) || 0;
            const rQty = Number(rItem.quantity) || 1;
            totalRefundAmount += rPrice * rQty;

            let rCost = Number(rItem.costPrice) || (rItem.book && rItem.book.costPrice) || 0;
            if (rCost <= 0 || rCost >= rPrice) {
              rCost = Math.round(rPrice * 0.65);
            }
            totalRefundCOGS += rCost * rQty;
          }
        });
      } else if (!isFilteredByCatOrAuthor) {
        totalRefundAmount += Number(rInv.finalAmount || rInv.totalAmount || 0);
      }
    });

    // Doanh thu thuần = Doanh thu bán hoàn thành - Tiền hoàn trả
    const totalRevenue = Math.max(0, grossCompletedRevenue - totalRefundAmount);
    // Giá vốn hàng bán thuần = Tổng giá vốn bán ra - Giá vốn hàng hoàn lại kho
    const netTotalCost = Math.max(0, grossCompletedCost - totalRefundCOGS);
    // Lợi nhuận gộp ước tính = Doanh thu thuần - Tổng giá vốn thuần
    const grossProfit = Math.max(0, totalRevenue - netTotalCost);
    const profitMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;
    let finalCompletedOrdersCount = completedOrdersCount;
    if (isFilteredByCatOrAuthor) {
      finalCompletedOrdersCount = new Set(itemsData.map(i => String(i.orderId))).size;
    }
    const aov = finalCompletedOrdersCount > 0 ? Math.round(totalRevenue / finalCompletedOrdersCount) : 0;

    // 6. Phân tích Kênh bán (POS vs Online)
    const channelData = {
      pos: { count: 0, revenue: 0, orders: 0, percent: 50 },
      online: { count: 0, revenue: 0, orders: 0, percent: 50 }
    };

    if (isFilteredByCatOrAuthor) {
      const posOrders = new Set();
      const onlineOrders = new Set();
      itemsData.forEach(item => {
        const isOnline = /^HD-OL/i.test(item.invoiceCode);
        const chKey = isOnline ? 'online' : 'pos';
        const rev = Number(item.itemRevenue) || 0;
        channelData[chKey].revenue += rev;
        if (isOnline) onlineOrders.add(String(item.orderId));
        else posOrders.add(String(item.orderId));
      });
      channelData.pos.orders = posOrders.size;
      channelData.pos.count = posOrders.size;
      channelData.online.orders = onlineOrders.size;
      channelData.online.count = onlineOrders.size;
    } else {
      const channelMatch = { ...baseMatch };
      const channelAgg = await Invoice.aggregate([
        { $match: channelMatch },
        {
          $group: {
            _id: {
              $cond: [
                { $regexMatch: { input: '$invoiceCode', regex: '^HD-OL', options: 'i' } },
                'online',
                'pos'
              ]
            },
            orderCount: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        }
      ]);

      channelAgg.forEach(c => {
        if (channelData[c._id]) {
          channelData[c._id].count = c.orderCount;
          channelData[c._id].orders = c.orderCount;
          channelData[c._id].revenue = c.revenue;
        }
      });
    }

    // Khấu trừ refund theo kênh bán
    refundInvoices.forEach(rInv => {
      const isOnline = /^HD-OL/i.test(rInv.invoiceCode);
      const chKey = isOnline ? 'online' : 'pos';
      let rAmt = 0;
      if (rInv.items && rInv.items.length > 0) {
        rInv.items.forEach(rItem => {
          const itemCat = (rItem.book && rItem.book.category) || rItem.category || '';
          const itemAuth = (rItem.book && rItem.book.author) || rItem.author || '';
          const catMatch = !matchCat || matchCat === 'all' || new RegExp('^' + escapeRegex(matchCat) + '$', 'i').test(itemCat);
          const authMatch = !matchAuthor || matchAuthor === 'all' || new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i').test(itemAuth);
          if (catMatch && authMatch) {
            const rPrice = Number(rItem.price) || (rItem.book && rItem.book.price) || 0;
            const rQty = Number(rItem.quantity) || 1;
            rAmt += rPrice * rQty;
          }
        });
      } else if (!isFilteredByCatOrAuthor) {
        rAmt = Number(rInv.finalAmount || rInv.totalAmount || 0);
      }
      channelData[chKey].revenue = Math.max(0, channelData[chKey].revenue - rAmt);
    });

    const combinedChannelRev = channelData.pos.revenue + channelData.online.revenue;
    if (combinedChannelRev > 0) {
      channelData.pos.percent = Math.round((channelData.pos.revenue / combinedChannelRev) * 100);
      channelData.online.percent = 100 - channelData.pos.percent;
    }

    // 7. Biến động Doanh thu & Lợi nhuận theo Thời gian (Timeline)
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const isDaily = diffDays <= 31;
    const timelineFormat = isDaily ? '%Y-%m-%d' : '%Y-%m';

    const timelinePipeline = [
      { $match: baseMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.book',
          foreignField: '_id',
          as: 'bookInfo'
        }
      },
      { $unwind: { path: '$bookInfo', preserveNullAndEmptyArrays: true } }
    ];

    if (matchCat && matchCat !== 'all') {
      timelinePipeline.push({
        $match: { 'bookInfo.category': { $regex: new RegExp('^' + escapeRegex(matchCat) + '$', 'i') } }
      });
    }

    if (matchAuthor && matchAuthor !== 'all') {
      timelinePipeline.push({
        $match: { 'bookInfo.author': { $regex: new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i') } }
      });
    }

    timelinePipeline.push({
      $project: {
        dateStr: {
          $dateToString: {
            format: timelineFormat,
            date: '$createdAt',
            timezone: '+07:00'
          }
        },
        invoiceId: '$_id',
        itemRev: { $multiply: ['$items.price', '$items.quantity'] },
        itemCost: {
          $multiply: [
            {
              $cond: [
                {
                  $and: [
                    { $gt: ['$items.costPrice', 0] },
                    { $lt: ['$items.costPrice', '$items.price'] }
                  ]
                },
                '$items.costPrice',
                {
                  $cond: [
                    {
                      $and: [
                        { $gt: ['$bookInfo.costPrice', 0] },
                        { $lt: ['$bookInfo.costPrice', '$items.price'] }
                      ]
                    },
                    '$bookInfo.costPrice',
                    { $round: [{ $multiply: ['$items.price', 0.65] }, 0] }
                  ]
                }
              ]
            },
            '$items.quantity'
          ]
        }
      }
    });

    timelinePipeline.push({
      $group: {
        _id: '$dateStr',
        revenue: { $sum: '$itemRev' },
        totalCost: { $sum: '$itemCost' },
        invoices: { $addToSet: '$invoiceId' }
      }
    });

    timelinePipeline.push({
      $project: {
        _id: 1,
        date: '$_id',
        revenue: 1,
        grossProfit: { $max: [0, { $subtract: ['$revenue', '$totalCost'] }] },
        orderCount: { $size: '$invoices' }
      }
    });

    timelinePipeline.push({ $sort: { _id: 1 } });

    const timelineAgg = await Invoice.aggregate(timelinePipeline);

    const timeline = timelineAgg.map(t => ({
      _id: t._id,
      date: t._id,
      revenue: t.revenue,
      orderCount: t.orderCount,
      grossProfit: t.grossProfit
    }));

    // 8. Top 10 Sách Bán Chạy Nhất
    const topSellingBooks = Object.values(bookSalesMap)
      .map(b => ({
        ...b,
        percent: totalRevenue > 0 ? Number(((b.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.soldQuantity - a.soldQuantity || b.revenue - a.revenue)
      .slice(0, 10);

    // 9. Top 10 Sách Bán Ế / Tồn Đọng Cao (Dead Stock: stock > 10 và soldInPeriod <= 1)
    const deadStockQuery = { stock: { $gt: 10 } };
    if (matchCat && matchCat !== 'all') {
      deadStockQuery.category = { $regex: new RegExp('^' + escapeRegex(matchCat) + '$', 'i') };
    }
    if (matchAuthor && matchAuthor !== 'all') {
      deadStockQuery.author = { $regex: new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i') };
    }

    const candidateBooks = await Book.find(deadStockQuery)
      .select('title author category price costPrice stock coverImage shelfLocation')
      .lean();

    let deadStockBooks = candidateBooks
      .map(book => {
        const bKey = String(book._id);
        const salesInfo = bookSalesMap[bKey];
        const soldQty = salesInfo ? salesInfo.soldQuantity : 0;
        let cPrice = Number(book.costPrice) || 0;
        if (cPrice <= 0 || cPrice >= Number(book.price || 0)) {
          cPrice = Math.round(Number(book.price || 0) * 0.65);
        }
        const totalCostValue = (Number(book.stock) || 0) * cPrice;
        return {
          bookId: book._id,
          title: book.title,
          author: book.author,
          category: book.category,
          price: book.price,
          costPrice: cPrice,
          stock: book.stock,
          totalCostValue,
          coverImage: book.coverImage || '/images/covers/default-book.svg',
          soldInPeriod: soldQty,
          alertBadge: soldQty === 0 ? 'Chưa bán được cuốn nào' : `Bán chậm (${soldQty} cuốn)`
        };
      })
      .filter(b => b.soldInPeriod <= 1)
      .sort((a, b) => a.soldInPeriod - b.soldInPeriod || b.stock - a.stock)
      .slice(0, 10);

    if (deadStockBooks.length === 0) {
      deadStockBooks = candidateBooks
        .map(book => {
          const bKey = String(book._id);
          const salesInfo = bookSalesMap[bKey];
          const soldQty = salesInfo ? salesInfo.soldQuantity : 0;
          let cPrice = Number(book.costPrice) || 0;
          if (cPrice <= 0 || cPrice >= Number(book.price || 0)) {
            cPrice = Math.round(Number(book.price || 0) * 0.65);
          }
          return {
            bookId: book._id,
            title: book.title,
            author: book.author,
            category: book.category,
            price: book.price,
            costPrice: cPrice,
            stock: book.stock,
            totalCostValue: (Number(book.stock) || 0) * cPrice,
            coverImage: book.coverImage || '/images/covers/default-book.svg',
            soldInPeriod: soldQty,
            alertBadge: soldQty === 0 ? 'Chưa bán được cuốn nào' : `Bán chậm (${soldQty} cuốn)`
          };
        })
        .sort((a, b) => a.soldInPeriod - b.soldInPeriod || b.stock - a.stock)
        .slice(0, 10);
    }

    // Danh sách toàn bộ Thể loại & Tác giả thực tế từ kho sách để phục vụ bộ lọc
    const [allCategories, allAuthors] = await Promise.all([
      Book.distinct('category'),
      Book.distinct('author')
    ]);
    const sortedCategories = (allCategories || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
    const sortedAuthors = (allAuthors || []).filter(a => {
      if (!a) return false;
      const clean = String(a).trim().toLowerCase();
      return !['chưa rõ', 'chua ro', 'không rõ', 'khong ro', 'đang cập nhật', 'unknown', 'n/a'].includes(clean);
    }).sort((a, b) => a.localeCompare(b, 'vi'));

    // 9. Phân Tích Thể Loại Sách
    const categoryReport = Object.values(categorySalesMap)
      .map(c => ({
        ...c,
        quantity: c.soldQuantity,
        percent: totalRevenue > 0 ? Number(((c.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 10. Phân Tích Tác Giả (Top 5 Tác Giả Có Doanh Số Cao Nhất - chuẩn xác logic)
    const authorReport = Object.values(authorSalesMap)
      .filter(a => a && a.author && ![
        'chưa rõ', 'chua ro', 'không rõ', 'khong ro',
        'đang cập nhật', 'dang cap nhat', 'unknown', 'n/a'
      ].includes(String(a.author).trim().toLowerCase()))
      .map(a => ({
        ...a,
        quantity: a.soldQuantity,
        percent: totalRevenue > 0 ? Number(((a.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
      .slice(0, 5);

    // 11. Cơ cấu Phương thức Thanh toán
    const totalPayment = paymentMap.cash + paymentMap.transfer + paymentMap.pos;
    const paymentReport = [
      {
        method: 'Chuyển khoản VietQR',
        code: 'transfer',
        amount: paymentMap.transfer,
        percent: totalPayment > 0 ? Math.round((paymentMap.transfer / totalPayment) * 100) : 0,
        color: '#0284C7'
      },
      {
        method: 'Tiền mặt',
        code: 'cash',
        amount: paymentMap.cash,
        percent: totalPayment > 0 ? Math.round((paymentMap.cash / totalPayment) * 100) : 0,
        color: '#16A34A'
      },
      {
        method: 'Thẻ POS / Ví điện tử',
        code: 'pos',
        amount: paymentMap.pos,
        percent: totalPayment > 0 ? Math.round((paymentMap.pos / totalPayment) * 100) : 0,
        color: '#D97706'
      }
    ];

    // 12. Phân Tích Khách Hàng Thân Thiết (Loyal Customers: Frequent Buyers & VIP Spenders)
    const allLoyalCustomers = Object.values(customerMap).map(c => {
      const avgOrderValue = c.orderCount > 0 ? Math.round(c.totalSpent / c.orderCount) : 0;
      let tier = 'Member';
      let tierBadge = 'Thân Thiết';
      let tierColor = '#64748B';
      let tierIcon = 'fa-user-tag';
      if (c.totalSpent >= 2000000 || c.orderCount >= 5) {
        tier = 'Diamond';
        tierBadge = 'Kim Cương 👑';
        tierColor = '#2563EB';
        tierIcon = 'fa-gem';
      } else if (c.totalSpent >= 1000000 || c.orderCount >= 3) {
        tier = 'Platinum';
        tierBadge = 'Bạch Kim 💎';
        tierColor = '#7C3AED';
        tierIcon = 'fa-award';
      } else if (c.totalSpent >= 500000 || c.orderCount >= 2) {
        tier = 'Gold';
        tierBadge = 'Vàng 🌟';
        tierColor = '#D97706';
        tierIcon = 'fa-crown';
      } else if (c.totalSpent >= 200000 || c.orderCount >= 1) {
        tier = 'Silver';
        tierBadge = 'Bạc 🥈';
        tierColor = '#475569';
        tierIcon = 'fa-medal';
      }

      const phoneClean = c.phone ? String(c.phone).trim() : '';
      const phoneDisplay = phoneClean.length >= 7 
        ? `${phoneClean.slice(0, 3)}****${phoneClean.slice(-3)}`
        : (phoneClean || '--');

      return {
        key: c.key,
        name: c.name,
        phone: c.phone,
        phoneDisplay,
        userId: c.userId,
        totalSpent: c.totalSpent,
        totalProducts: c.totalProducts,
        orderCount: c.orderCount,
        avgOrderValue,
        tier,
        tierBadge,
        tierColor,
        tierIcon
      };
    });

    const topSpenders = allLoyalCustomers
      .slice()
      .sort((a, b) => b.totalSpent - a.totalSpent || b.orderCount - a.orderCount);

    const topFrequent = allLoyalCustomers
      .slice()
      .sort((a, b) => b.orderCount - a.orderCount || b.totalSpent - a.totalSpent);

    const top10SpendSum = topSpenders.slice(0, 10).reduce((sum, c) => sum + c.totalSpent, 0);
    const topSpendSharePercent = totalRevenue > 0 ? Number(((top10SpendSum / totalRevenue) * 100).toFixed(1)) : 0;
    const avgSpendPerCust = allLoyalCustomers.length > 0 ? Math.round(allLoyalCustomers.reduce((s, c) => s + c.totalSpent, 0) / allLoyalCustomers.length) : 0;
    const avgOrdersPerCust = allLoyalCustomers.length > 0 ? Number((allLoyalCustomers.reduce((s, c) => s + c.orderCount, 0) / allLoyalCustomers.length).toFixed(1)) : 0;

    const customerLoyalty = {
      topSpenders,
      topFrequent,
      allCustomers: topSpenders,
      summary: {
        totalCustomers: allLoyalCustomers.length,
        totalTopSpend: top10SpendSum,
        topSpendSharePercent,
        avgSpendPerCustomer: avgSpendPerCust,
        avgOrdersPerCustomer: avgOrdersPerCust,
        championFrequent: topFrequent[0] || null,
        championSpender: topSpenders[0] || null
      }
    };

    res.status(200).json({
      success: true,
      data: {
        filter: {
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          channel: channel || 'all',
          category: matchCat || 'all',
          author: matchAuthor || 'all',
          isDaily,
          diffDays
        },
        kpi: {
          totalRevenue,
          grossProfit,
          profitMargin,
          completedOrdersCount,
          cancelledOrdersCount,
          totalOrdersInPeriod,
          successRate,
          aov,
          totalItemsSold
        },
        channelBreakdown: channelData,
        timeline: timeline,
        topSellingBooks,
        deadStockBooks,
        categoryReport,
        authorReport,
        paymentReport,
        customerLoyalty,
        filterOptions: {
          categories: sortedCategories,
          authors: sortedAuthors
        }
      }
    });
  } catch (error) {
    console.error('Lỗi getAnalyticsReport:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tính toán báo cáo thống kê phân tích'
    });
  }
};

module.exports = {
  getDashboardOverview,
  getAnalyticsReport
};
