const Invoice = require('../models/Invoice');
const Book = require('../models/Book');
const User = require('../models/User');
const Category = require('../models/Category');
const AuditReceipt = require('../models/AuditReceipt');

// Helper escape regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// In-memory cache để tăng tốc tải trang tức thì (< 10ms) khi F5 / chuyển tab
let overviewCache = { data: null, timestamp: 0 };
const analyticsCache = new Map();

function clearAdminAnalyticsCache() {
  overviewCache = { data: null, timestamp: 0 };
  analyticsCache.clear();
}

// @desc    Lấy dữ liệu tổng quan cho Bàn làm việc (Dashboard Overview)
// @route   GET /api/admin/dashboard-overview
// @access  Private (Admin, Staff, Stock, Accountant)
const getDashboardOverview = async (req, res) => {
  try {
    const now = Date.now();
    // Cache 30 giây: khi reload trang hay đổi tab, phản hồi ngay lập tức dưới 10ms
    if (overviewCache.data && (now - overviewCache.timestamp < 30000)) {
      return res.status(200).json({
        success: true,
        data: overviewCache.data,
        cached: true
      });
    }

    // Thực thi đồng thời 11 truy vấn bằng Promise.all thay vì tuần tự
    const [
      completedRevAgg,
      refundAgg,
      totalOrders,
      urgentOrders,
      pendingAuditsCount,
      stockAgg,
      lowStockBooks,
      shippedCount,
      pendingAndDeliveringCount,
      recentOrders,
      activeStaff
    ] = await Promise.all([
      // 1. Doanh thu hoàn thành
      Invoice.aggregate([
        { $match: { status: { $in: ['completed', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      // 1.1 Doanh thu hoàn trả
      Invoice.aggregate([
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
      ]),
      // 2. Tổng số đơn mua (trừ đơn cancelled)
      Invoice.countDocuments({ status: { $ne: 'cancelled' } }),
      // 3. Đơn cần xử lý ngay
      Invoice.countDocuments({
        $or: [
          { status: { $in: ['pending_confirmation', 'pending_payment', 'unpaid', 'pending'] } },
          { 'returnRequest.status': { $in: ['requested', 'shipping_back'] } }
        ]
      }),
      // 3.1 Phiếu kiểm kê chờ duyệt
      AuditReceipt.countDocuments({ status: 'pending_approval' }).catch(() => 0),
      // 4. Tổng sách tồn kho
      Book.aggregate([
        { $group: { _id: null, total: { $sum: '$stock' } } }
      ]),
      // 5. Cảnh báo sách sắp hết hàng (stock <= 10)
      Book.find({ stock: { $lte: 10 } })
        .select('title stock isbn coverImage shelfLocation price author')
        .sort({ stock: 1 })
        .limit(5)
        .lean(),
      // 6. Tiến độ giao hàng
      Invoice.countDocuments({ status: 'shipping' }),
      Invoice.countDocuments({
        status: { $in: ['pending_confirmation', 'pending_payment', 'delivering'] }
      }),
      // 7. Đơn mua phát sinh gần nhất (10 đơn)
      Invoice.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email phone')
        .populate('items.book', 'title price coverImage author')
        .lean(),
      // 8. Nhân sự đang hoạt động
      User.find({
        role: { $in: ['admin', 'staff', 'stock', 'accountant'] },
        status: { $ne: 'blocked' }
      })
        .select('name email phone role department shift status employeeCode')
        .sort({ role: 1, name: 1 })
        .lean()
    ]);

    const completedRevenue = completedRevAgg[0]?.total || 0;
    const refundAmount = refundAgg[0]?.total || 0;
    const totalRevenue = Math.max(0, completedRevenue - refundAmount);
    const totalStock = stockAgg[0]?.total || 0;

    const data = {
      kpi: {
        totalRevenue,
        totalOrders,
        urgentOrders,
        pendingAuditsCount: pendingAuditsCount || 0,
        totalStock
      },
      lowStockBooks,
      shippingProgress: {
        shippedCount,
        pendingAndDeliveringCount
      },
      recentOrders,
      activeStaff
    };

    overviewCache = { data, timestamp: now };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Lỗi getDashboardOverview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy dữ liệu tổng quan bàn làm việc'
    });
  }
};

// @desc    Lấy dữ liệu thống kê & phân tích chuyên sâu (Revenue Analytics & BI) - SIÊU TỐI ƯU
// @route   GET /api/admin/analytics
// @access  Private (Admin, Staff, Accountant)
const getAnalyticsReport = async (req, res) => {
  try {
    const { startDate, endDate, channel, category, categoryId, author, authorId } = req.query;

    // Cache kết quả theo bộ lọc (45 giây) để chuyển qua lại các tab phản hồi tức thì
    const cacheKey = JSON.stringify({ startDate, endDate, channel, category, categoryId, author, authorId });
    const cached = analyticsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 45000)) {
      return res.status(200).json(cached.payload);
    }

    // 1. Xử lý thời gian (GMT+7)
    let start, end;
    if (startDate) {
      start = new Date(`${startDate}T00:00:00.000+07:00`);
    } else {
      // Mặc định: Toàn bộ thời gian từ đầu năm 2025 đến nay để khớp 100% doanh thu thực tế
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

    const matchCat = (category || categoryId || '').trim();
    const matchAuthor = (author || authorId || '').trim();
    const isFilteredByCatOrAuthor = (matchCat && matchCat !== 'all') || (matchAuthor && matchAuthor !== 'all');

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

    // 3. Thực thi song song các truy vấn: Đếm đơn, Lấy danh mục sách, Hóa đơn bán và Hóa đơn hoàn
    const [
      totalOrdersInPeriod,
      completedOrdersCount,
      cancelledOrdersCount,
      allBooks,
      invoices,
      refundInvoices
    ] = await Promise.all([
      Invoice.countDocuments(allPeriodMatch),
      Invoice.countDocuments(baseMatch),
      Invoice.countDocuments({ ...allPeriodMatch, status: 'cancelled' }),
      Book.find({}, 'title author category coverImage costPrice price stock shelfLocation').lean(),
      Invoice.find(baseMatch, 'invoiceCode paymentMethod customerName customerPhone user totalAmount finalAmount createdAt items.book items.price items.quantity items.costPrice').lean(),
      Invoice.find(refundMatch, 'invoiceCode finalAmount totalAmount returnRequest items.book items.price items.quantity items.costPrice').lean()
    ]);

    const successRate = totalOrdersInPeriod > 0 ? Math.round((completedOrdersCount / totalOrdersInPeriod) * 100) : 100;

    // Bản đồ sách tối ưu (O(1) lookup thay vì $lookup 25,000 lần trên MongoDB)
    const bookMap = new Map();
    allBooks.forEach(b => bookMap.set(String(b._id), b));

    // Định dạng ngày cho timeline
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const isDaily = diffDays <= 31;

    let grossCompletedRevenue = 0;
    let grossCompletedCost = 0;
    let totalItemsSold = 0;
    const matchingOrderIds = new Set();

    const bookSalesMap = {};
    const categorySalesMap = {};
    const authorSalesMap = {};
    const paymentMap = { cash: 0, transfer: 0, pos: 0 };
    const customerMap = {};
    const channelData = {
      pos: { count: 0, revenue: 0, orders: 0, percent: 50 },
      online: { count: 0, revenue: 0, orders: 0, percent: 50 }
    };
    const timelineMap = {};

    // 4. Duyệt qua hóa đơn và items bằng Single Pass cực nhanh (~20ms)
    invoices.forEach(inv => {
      const isOnline = /^HD-OL/i.test(inv.invoiceCode || '');
      const chKey = isOnline ? 'online' : 'pos';

      // Tạo dateStr cho timeline theo múi giờ VN (GMT+7)
      const d = new Date(inv.createdAt);
      d.setHours(d.getHours() + 7); // chuyển đổi GMT+7
      const dateStr = isDaily 
        ? d.toISOString().slice(0, 10)
        : d.toISOString().slice(0, 7);

      if (!timelineMap[dateStr]) {
        timelineMap[dateStr] = {
          dateStr,
          revenue: 0,
          cost: 0,
          grossProfit: 0,
          orderIds: new Set()
        };
      }

      let invHadMatchingItem = false;

      (inv.items || []).forEach(it => {
        const bInfo = (it.book ? bookMap.get(String(it.book)) : null) || {};
        const bTitle = bInfo.title || it.title || 'Sách tham chiếu';
        const bAuthor = bInfo.author || it.author || 'Chưa rõ';
        const bCategory = bInfo.category || it.category || 'Khác';

        // Lọc theo thể loại / tác giả nếu có chọn
        if (matchCat && matchCat !== 'all') {
          if (!new RegExp('^' + escapeRegex(matchCat) + '$', 'i').test(bCategory)) {
            return;
          }
        }
        if (matchAuthor && matchAuthor !== 'all') {
          if (!new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i').test(bAuthor)) {
            return;
          }
        }

        invHadMatchingItem = true;
        matchingOrderIds.add(String(inv._id));

        const itemPrice = Number(it.price) || Number(bInfo.price) || 0;
        const qty = Number(it.quantity) || 1;
        const rev = itemPrice * qty;

        let cost = Number(it.costPrice) || Number(bInfo.costPrice) || 0;
        if (cost <= 0 || cost >= itemPrice) {
          cost = Math.round(itemPrice * 0.65);
        }
        const itemCostTotal = cost * qty;
        const itemProfit = Math.max(0, rev - itemCostTotal);

        grossCompletedRevenue += rev;
        grossCompletedCost += itemCostTotal;
        totalItemsSold += qty;

        channelData[chKey].revenue += rev;
        timelineMap[dateStr].revenue += rev;
        timelineMap[dateStr].cost += itemCostTotal;
        timelineMap[dateStr].grossProfit += itemProfit;
        timelineMap[dateStr].orderIds.add(String(inv._id));

        // Book Map
        const bKey = it.book ? String(it.book) : bTitle;
        if (!bookSalesMap[bKey]) {
          bookSalesMap[bKey] = {
            bookId: it.book,
            title: bTitle,
            author: bAuthor,
            category: bCategory,
            coverImage: bInfo.coverImage || '/images/covers/default-book.svg',
            stock: bInfo.stock || 0,
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
        const cKey = bCategory;
        if (!categorySalesMap[cKey]) {
          categorySalesMap[cKey] = { category: cKey, soldQuantity: 0, revenue: 0 };
        }
        categorySalesMap[cKey].soldQuantity += qty;
        categorySalesMap[cKey].revenue += rev;

        // Author Map
        const rawAuthor = String(bAuthor).trim();
        if (rawAuthor && !['chưa rõ', 'chua ro', 'không rõ', 'khong ro', 'đang cập nhật', 'unknown', 'n/a'].includes(rawAuthor.toLowerCase())) {
          if (!authorSalesMap[rawAuthor]) {
            authorSalesMap[rawAuthor] = { author: rawAuthor, soldQuantity: 0, revenue: 0 };
          }
          authorSalesMap[rawAuthor].soldQuantity += qty;
          authorSalesMap[rawAuthor].revenue += rev;
        }

        // Customer Map
        const rawName = (inv.customerName && String(inv.customerName).trim()) ? String(inv.customerName).trim() : 'Khách lẻ';
        const rawPhone = (inv.customerPhone && String(inv.customerPhone).trim()) ? String(inv.customerPhone).trim() : '';
        const custKey = rawPhone || (rawName !== 'Khách lẻ' ? rawName : '') || (inv.user ? String(inv.user) : `Khách lẻ #${String(inv._id).slice(-4)}`);

        if (!customerMap[custKey]) {
          customerMap[custKey] = {
            key: custKey,
            name: rawName,
            phone: rawPhone,
            userId: inv.user ? String(inv.user) : null,
            totalSpent: 0,
            totalProducts: 0,
            orderCount: 0,
            orderIds: new Set()
          };
        }
        customerMap[custKey].totalProducts += qty;
        customerMap[custKey].totalSpent += rev;
        if (!customerMap[custKey].orderIds.has(String(inv._id))) {
          customerMap[custKey].orderIds.add(String(inv._id));
          customerMap[custKey].orderCount += 1;
        }
      });

      // Đếm số đơn theo kênh
      if (!isFilteredByCatOrAuthor || invHadMatchingItem) {
        channelData[chKey].count++;
        channelData[chKey].orders++;
      }

      // Payment Map
      if (!isFilteredByCatOrAuthor || invHadMatchingItem) {
        const pm = (inv.paymentMethod || 'cash').toLowerCase();
        const invRev = Number(inv.finalAmount || inv.totalAmount || 0);
        if (['transfer', 'banking'].includes(pm)) paymentMap.transfer += invRev;
        else if (['pos', 'card', 'momo'].includes(pm)) paymentMap.pos += invRev;
        else paymentMap.cash += invRev;
      }
    });

    // 5. Khấu trừ hoàn trả
    let totalRefundAmount = 0;
    let totalRefundCOGS = 0;

    refundInvoices.forEach(rInv => {
      const isOnline = /^HD-OL/i.test(rInv.invoiceCode || '');
      const chKey = isOnline ? 'online' : 'pos';
      let rAmt = 0;
      let rCost = 0;

      if (rInv.items && rInv.items.length > 0) {
        rInv.items.forEach(rItem => {
          const bInfo = (rItem.book ? bookMap.get(String(rItem.book)) : null) || {};
          const itemCat = bInfo.category || rItem.category || '';
          const itemAuth = bInfo.author || rItem.author || '';

          const catMatch = !matchCat || matchCat === 'all' || new RegExp('^' + escapeRegex(matchCat) + '$', 'i').test(itemCat);
          const authMatch = !matchAuthor || matchAuthor === 'all' || new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i').test(itemAuth);

          if (catMatch && authMatch) {
            const rPrice = Number(rItem.price) || Number(bInfo.price) || 0;
            const rQty = Number(rItem.quantity) || 1;
            const rItemTotal = rPrice * rQty;
            rAmt += rItemTotal;

            let c = Number(rItem.costPrice) || Number(bInfo.costPrice) || 0;
            if (c <= 0 || c >= rPrice) c = Math.round(rPrice * 0.65);
            rCost += (c * rQty);
          }
        });
      } else if (!isFilteredByCatOrAuthor) {
        rAmt = Number(rInv.finalAmount || rInv.totalAmount || 0);
      }

      totalRefundAmount += rAmt;
      totalRefundCOGS += rCost;
      channelData[chKey].revenue = Math.max(0, channelData[chKey].revenue - rAmt);
    });

    // 6. Tính toán KPI tài chính cuối cùng
    const totalRevenue = Math.max(0, grossCompletedRevenue - totalRefundAmount);
    const netTotalCost = Math.max(0, grossCompletedCost - totalRefundCOGS);
    const grossProfit = Math.max(0, totalRevenue - netTotalCost);
    const profitMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;
    
    let finalCompletedOrdersCount = isFilteredByCatOrAuthor ? matchingOrderIds.size : completedOrdersCount;
    const aov = finalCompletedOrdersCount > 0 ? Math.round(totalRevenue / finalCompletedOrdersCount) : 0;

    const combinedChannelRev = channelData.pos.revenue + channelData.online.revenue;
    if (combinedChannelRev > 0) {
      channelData.pos.percent = Math.round((channelData.pos.revenue / combinedChannelRev) * 100);
      channelData.online.percent = 100 - channelData.pos.percent;
    }

    // 7. Timeline
    const timeline = Object.keys(timelineMap)
      .sort()
      .map(key => ({
        _id: key,
        date: key,
        revenue: timelineMap[key].revenue,
        orderCount: timelineMap[key].orderIds.size,
        grossProfit: Math.max(0, timelineMap[key].grossProfit)
      }));

    // 8. Top 10 Sách Bán Chạy Nhất
    const topSellingBooks = Object.values(bookSalesMap)
      .map(b => ({
        ...b,
        percent: totalRevenue > 0 ? Number(((b.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.soldQuantity - a.soldQuantity || b.revenue - a.revenue)
      .slice(0, 10);

    // 9. Top 10 Sách Tồn Đọng / Dead Stock (trực tiếp từ allBooks)
    const deadStockBooks = allBooks
      .filter(b => {
        if (b.stock <= 10) return false;
        if (matchCat && matchCat !== 'all' && !new RegExp('^' + escapeRegex(matchCat) + '$', 'i').test(b.category)) return false;
        if (matchAuthor && matchAuthor !== 'all' && !new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i').test(b.author)) return false;
        return true;
      })
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

    // 10. Danh sách Thể loại & Tác giả cho bộ lọc (trích xuất tức thì từ allBooks)
    const catSet = new Set();
    const authSet = new Set();
    allBooks.forEach(b => {
      if (b.category) catSet.add(b.category);
      if (b.author) {
        const a = String(b.author).trim();
        if (a && !['chưa rõ', 'chua ro', 'không rõ', 'khong ro', 'đang cập nhật', 'unknown', 'n/a'].includes(a.toLowerCase())) {
          authSet.add(a);
        }
      }
    });
    const sortedCategories = Array.from(catSet).sort((a, b) => a.localeCompare(b, 'vi'));
    const sortedAuthors = Array.from(authSet).sort((a, b) => a.localeCompare(b, 'vi'));

    // 11. Báo cáo Thể Loại
    const categoryReport = Object.values(categorySalesMap)
      .map(c => ({
        ...c,
        quantity: c.soldQuantity,
        percent: totalRevenue > 0 ? Number(((c.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 12. Báo cáo Tác Giả (Top 5)
    const authorReport = Object.values(authorSalesMap)
      .map(a => ({
        ...a,
        quantity: a.soldQuantity,
        percent: totalRevenue > 0 ? Number(((a.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
      .slice(0, 5);

    // 13. Cơ cấu Phương thức Thanh toán
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

    // 14. Khách hàng thân thiết
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

    const sortedLoyalCustomers = [...allLoyalCustomers].sort((a, b) => b.totalSpent - a.totalSpent);
    const topSpenders = sortedLoyalCustomers.slice(0, 15);

    const topFrequent = [...allLoyalCustomers]
      .sort((a, b) => b.orderCount - a.orderCount || b.totalSpent - a.totalSpent)
      .slice(0, 15);

    const customerLoyalty = {
      summary: {
        totalLoyalCustomers: allLoyalCustomers.length,
        totalTopSpend: topSpenders.reduce((sum, c) => sum + c.totalSpent, 0),
        topSpendSharePercent: totalRevenue > 0 
          ? Number(((topSpenders.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100).toFixed(1))
          : 0,
        avgSpendPerCustomer: allLoyalCustomers.length > 0 
          ? Math.round(allLoyalCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / allLoyalCustomers.length)
          : 0,
        avgOrdersPerCustomer: allLoyalCustomers.length > 0
          ? Number((allLoyalCustomers.reduce((sum, c) => sum + c.orderCount, 0) / allLoyalCustomers.length).toFixed(1))
          : 0
      },
      topSpenders,
      topFrequent,
      allCustomers: sortedLoyalCustomers.slice(0, 50)
    };

    const payload = {
      success: true,
      data: {
        filter: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
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
          completedOrdersCount: finalCompletedOrdersCount,
          cancelledOrdersCount,
          totalOrdersInPeriod,
          successRate,
          aov,
          totalItemsSold
        },
        channelBreakdown: channelData,
        timeline,
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
    };

    analyticsCache.set(cacheKey, { payload, timestamp: Date.now() });

    res.status(200).json(payload);
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
  getAnalyticsReport,
  clearAdminAnalyticsCache
};
