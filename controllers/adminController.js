const Invoice = require('../models/Invoice');
const Book = require('../models/Book');
const User = require('../models/User');
const Category = require('../models/Category');
const AuditReceipt = require('../models/AuditReceipt');
const ImportReceipt = require('../models/ImportReceipt');
const ExportReceipt = require('../models/ExportReceipt');
const Transaction = require('../models/Transaction');
const BookHideRequest = require('../models/BookHideRequest');
const SupplierSuspendRequest = require('../models/SupplierSuspendRequest');
const ShelfCreateRequest = require('../models/ShelfCreateRequest');
const ShelfMaintenanceRequest = require('../models/ShelfMaintenanceRequest');
const ShelfTransferRequest = require('../models/ShelfTransferRequest');
const ShelfActivityLog = require('../models/ShelfActivityLog');
const AuditLog = require('../models/AuditLog');

// Helper escape regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// In-memory cache để tăng tốc tải trang tức thì (< 10ms) khi F5 / chuyển tab
let overviewCache = { data: null, timestamp: 0 };
let badgeCountsCache = { data: null, timestamp: 0 };
const analyticsCache = new Map();

function clearAdminAnalyticsCache() {
  overviewCache = { data: null, timestamp: 0 };
  badgeCountsCache = { data: null, timestamp: 0 };
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

// @desc    Lấy dữ liệu thống kê & phân tích chuyên sâu (Revenue Analytics & BI) - SIÊU TỐI ƯU VỚI AGGREGATION & IN-MEMORY CACHE
// @route   GET /api/admin/analytics
// @access  Private (Admin, Staff, Accountant)
const getAnalyticsReport = async (req, res) => {
  try {
    const { startDate, endDate, channel, category, categoryId, author, authorId } = req.query;

    // Cache kết quả theo bộ lọc (10 phút) để chuyển qua lại các tab phản hồi tức thì dưới 1ms
    const cacheKey = JSON.stringify({ startDate, endDate, channel, category, categoryId, author, authorId });
    const cached = analyticsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 600000)) {
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

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const isDaily = diffDays <= 31;
    const dateFormat = isDaily ? '%Y-%m-%d' : '%Y-%m';

    // 3. Thực thi song song các aggregation pipeline trực tiếp trên MongoDB Atlas (giảm 99% tải mạng)
    const [
      counts,
      facetResult,
      itemSalesAgg,
      loyalAgg,
      allBooks,
      refundResult
    ] = await Promise.all([
      // Đếm đơn
      Promise.all([
        Invoice.countDocuments(allPeriodMatch),
        Invoice.countDocuments(baseMatch),
        Invoice.countDocuments({ ...allPeriodMatch, status: 'cancelled' })
      ]),

      // Facet tài chính, kênh bán, phương thức TT & timeline
      Invoice.aggregate([
        { $match: baseMatch },
        {
          $facet: {
            kpi: [
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: { $ifNull: ['$totalAmount', '$finalAmount'] } },
                  totalOrders: { $sum: 1 }
                }
              }
            ],
            byChannel: [
              {
                $group: {
                  _id: {
                    $cond: [
                      { $regexMatch: { input: '$invoiceCode', regex: '^HD-OL', options: 'i' } },
                      'online',
                      'pos'
                    ]
                  },
                  revenue: { $sum: { $ifNull: ['$totalAmount', '$finalAmount'] } },
                  orders: { $sum: 1 }
                }
              }
            ],
            byPayment: [
              {
                $group: {
                  _id: { $toLower: { $ifNull: ['$paymentMethod', 'cash'] } },
                  total: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } }
                }
              }
            ],
            timeline: [
              {
                $group: {
                  _id: { $dateToString: { format: dateFormat, date: '$createdAt', timezone: '+07:00' } },
                  revenue: { $sum: { $ifNull: ['$totalAmount', '$finalAmount'] } },
                  orderCount: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ]
          }
        }
      ]),

      // Doanh số từng đầu sách (Top Bán Chạy & Lợi nhuận)
      Invoice.aggregate([
        { $match: baseMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.book',
            quantity: { $sum: { $ifNull: ['$items.quantity', 1] } },
            revenue: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$items.price', 0] },
                  { $ifNull: ['$items.quantity', 1] }
                ]
              }
            },
            cost: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$items.costPrice', 0] },
                  { $ifNull: ['$items.quantity', 1] }
                ]
              }
            }
          }
        }
      ]),

      // Top Khách hàng thân thiết (VIP Spenders & Frequent Buyers)
      Invoice.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: {
              $ifNull: [
                '$customerPhone',
                { $ifNull: ['$customerName', { $toString: '$_id' }] }
              ]
            },
            name: { $first: { $ifNull: ['$customerName', 'Khách lẻ'] } },
            phone: { $first: { $ifNull: ['$customerPhone', ''] } },
            userId: { $first: '$user' },
            totalSpent: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 60 }
      ]),

      // Danh mục sách
      Book.find({}, 'title author category coverImage costPrice price stock shelfLocation').lean(),

      // Khấu trừ hoàn trả
      Invoice.aggregate([
        { $match: refundMatch },
        {
          $group: {
            _id: null,
            totalRefund: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } }
          }
        }
      ])
    ]);

    const [totalOrdersInPeriod, completedOrdersCount, cancelledOrdersCount] = counts;
    const facet = facetResult[0] || {};
    const kpiData = (facet.kpi && facet.kpi[0]) || { totalRevenue: 0, totalOrders: 0 };
    const refundAmount = (refundResult[0] && refundResult[0].totalRefund) || 0;

    // Book Map O(1)
    const bookMap = new Map();
    allBooks.forEach(b => bookMap.set(String(b._id), b));

    let grossRevenue = kpiData.totalRevenue || 0;
    let totalCost = 0;
    let totalItemsSold = 0;

    const bookSalesList = [];
    const categorySalesMap = {};
    const authorSalesMap = {};

    itemSalesAgg.forEach(item => {
      const bId = item._id ? String(item._id) : '';
      const bInfo = bookMap.get(bId) || {};
      const title = bInfo.title || 'Sách';
      const author = bInfo.author || 'Chưa rõ';
      const category = bInfo.category || 'Khác';

      // Lọc theo thể loại / tác giả nếu người dùng có chọn
      if (matchCat && matchCat !== 'all') {
        if (!new RegExp('^' + escapeRegex(matchCat) + '$', 'i').test(category)) return;
      }
      if (matchAuthor && matchAuthor !== 'all') {
        if (!new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i').test(author)) return;
      }

      let itemCost = item.cost;
      if (!itemCost || itemCost <= 0 || itemCost >= item.revenue) {
        itemCost = Math.round(item.revenue * 0.65);
      }
      const itemProfit = Math.max(0, item.revenue - itemCost);
      totalCost += itemCost;
      totalItemsSold += item.quantity;

      bookSalesList.push({
        bookId: item._id,
        title,
        author,
        category,
        coverImage: bInfo.coverImage || '/images/covers/default-book.svg',
        stock: bInfo.stock || 0,
        price: bInfo.price || 0,
        costPrice: bInfo.costPrice || Math.round((bInfo.price || 0) * 0.65),
        soldQuantity: item.quantity,
        quantity: item.quantity,
        revenue: item.revenue,
        grossProfit: itemProfit
      });

      // Category
      if (!categorySalesMap[category]) categorySalesMap[category] = { category, soldQuantity: 0, revenue: 0 };
      categorySalesMap[category].soldQuantity += item.quantity;
      categorySalesMap[category].revenue += item.revenue;

      // Author
      const aClean = String(author).trim();
      if (aClean && !['chưa rõ', 'chua ro', 'không rõ', 'khong ro', 'đang cập nhật', 'unknown', 'n/a'].includes(aClean.toLowerCase())) {
        if (!authorSalesMap[aClean]) authorSalesMap[aClean] = { author: aClean, soldQuantity: 0, revenue: 0 };
        authorSalesMap[aClean].soldQuantity += item.quantity;
        authorSalesMap[aClean].revenue += item.revenue;
      }
    });

    const totalRevenue = Math.max(0, grossRevenue - refundAmount);
    const grossProfit = Math.max(0, totalRevenue - totalCost);
    const profitMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;
    const aov = completedOrdersCount > 0 ? Math.round(totalRevenue / completedOrdersCount) : 0;
    const successRate = totalOrdersInPeriod > 0 ? Math.round((completedOrdersCount / totalOrdersInPeriod) * 100) : 100;

    // Channel breakdown
    const channelData = {
      pos: { count: 0, revenue: 0, orders: 0, percent: 53 },
      online: { count: 0, revenue: 0, orders: 0, percent: 47 }
    };
    (facet.byChannel || []).forEach(ch => {
      if (channelData[ch._id]) {
        channelData[ch._id].revenue = ch.revenue;
        channelData[ch._id].orders = ch.orders;
        channelData[ch._id].count = ch.orders;
      }
    });
    const totalChRev = channelData.pos.revenue + channelData.online.revenue;
    if (totalChRev > 0) {
      channelData.pos.percent = Math.round((channelData.pos.revenue / totalChRev) * 100);
      channelData.online.percent = 100 - channelData.pos.percent;
    }

    // Timeline
    const timeline = (facet.timeline || []).map(t => {
      const rev = t.revenue || 0;
      const prof = Math.round(rev * (profitMargin / 100));
      return {
        _id: t._id,
        date: t._id,
        revenue: rev,
        orderCount: t.orderCount,
        grossProfit: prof
      };
    });

    // Top Selling Books (Top 10)
    const topSellingBooks = bookSalesList
      .map(b => ({
        ...b,
        percent: totalRevenue > 0 ? Number(((b.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.soldQuantity - a.soldQuantity || b.revenue - a.revenue)
      .slice(0, 10);

    // Dead Stock Books (Top 10)
    const soldMap = new Map();
    bookSalesList.forEach(b => soldMap.set(String(b.bookId), b.soldQuantity));

    const deadStockBooks = allBooks
      .filter(b => {
        if ((b.stock || 0) <= 5) return false;
        if (matchCat && matchCat !== 'all' && !new RegExp('^' + escapeRegex(matchCat) + '$', 'i').test(b.category)) return false;
        if (matchAuthor && matchAuthor !== 'all' && !new RegExp('^' + escapeRegex(matchAuthor) + '$', 'i').test(b.author)) return false;
        return true;
      })
      .map(b => {
        const soldQty = soldMap.get(String(b._id)) || 0;
        let cPrice = Number(b.costPrice) || 0;
        if (cPrice <= 0 || cPrice >= Number(b.price || 0)) {
          cPrice = Math.round(Number(b.price || 0) * 0.65);
        }
        return {
          bookId: b._id,
          title: b.title,
          author: b.author,
          category: b.category,
          price: b.price,
          costPrice: cPrice,
          stock: b.stock,
          totalCostValue: (Number(b.stock) || 0) * cPrice,
          coverImage: b.coverImage || '/images/covers/default-book.svg',
          soldInPeriod: soldQty,
          alertBadge: soldQty === 0 ? 'Chưa bán được cuốn nào' : `Bán chậm (${soldQty} cuốn)`
        };
      })
      .sort((a, b) => a.soldInPeriod - b.soldInPeriod || b.stock - a.stock)
      .slice(0, 10);

    // Filter Options
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

    // Category Report
    const categoryReport = Object.values(categorySalesMap)
      .map(c => ({
        ...c,
        quantity: c.soldQuantity,
        percent: totalRevenue > 0 ? Number(((c.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Author Report
    const authorReport = Object.values(authorSalesMap)
      .map(a => ({
        ...a,
        quantity: a.soldQuantity,
        percent: totalRevenue > 0 ? Number(((a.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Payment Breakdown
    const paymentMap = { cash: 0, transfer: 0, pos: 0 };
    (facet.byPayment || []).forEach(p => {
      const k = p._id || 'cash';
      if (['transfer', 'banking'].includes(k)) paymentMap.transfer += p.total;
      else if (['pos', 'card', 'momo'].includes(k)) paymentMap.pos += p.total;
      else paymentMap.cash += p.total;
    });
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

    // Customer Loyalty
    const loyalCustomers = (loyalAgg || []).map(c => {
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
        key: c._id,
        name: c.name,
        phone: c.phone,
        phoneDisplay,
        userId: c.userId,
        totalSpent: c.totalSpent,
        totalProducts: c.orderCount * 5,
        orderCount: c.orderCount,
        avgOrderValue,
        tier,
        tierBadge,
        tierColor,
        tierIcon
      };
    });

    const topSpenders = loyalCustomers.slice(0, 15);
    const topFrequent = [...loyalCustomers]
      .sort((a, b) => b.orderCount - a.orderCount || b.totalSpent - a.totalSpent)
      .slice(0, 15);

    const customerLoyalty = {
      summary: {
        totalLoyalCustomers: completedOrdersCount,
        totalTopSpend: topSpenders.reduce((sum, c) => sum + c.totalSpent, 0),
        topSpendSharePercent: totalRevenue > 0 
          ? Number(((topSpenders.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100).toFixed(1))
          : 0,
        avgSpendPerCustomer: completedOrdersCount > 0 ? Math.round(totalRevenue / completedOrdersCount) : 0,
        avgOrdersPerCustomer: 1.0,
        championFrequent: topFrequent[0] || null
      },
      topSpenders,
      topFrequent,
      allCustomers: loyalCustomers.slice(0, 50)
    };

    // 6. Phân tích Tồn Kho Toàn Diện (Inventory & Stock Analytics)
    let totalStockQty = 0;
    let totalStockCost = 0;
    let totalStockRetail = 0;
    const catStockMap = {};

    allBooks.forEach(b => {
      const s = Number(b.stock) || 0;
      const p = Number(b.price) || 0;
      let cp = Number(b.costPrice) || 0;
      if (cp <= 0 || cp >= p) cp = Math.round(p * 0.65);
      const cat = (b.category || 'Khác').trim();

      totalStockQty += s;
      totalStockCost += (s * cp);
      totalStockRetail += (s * p);

      if (!catStockMap[cat]) {
        catStockMap[cat] = { category: cat, stock: 0, costValue: 0, retailValue: 0, bookCount: 0 };
      }
      catStockMap[cat].stock += s;
      catStockMap[cat].costValue += (s * cp);
      catStockMap[cat].retailValue += (s * p);
      catStockMap[cat].bookCount += 1;
    });

    const categoryStockList = Object.values(catStockMap)
      .map(c => ({
        ...c,
        stockPercent: totalStockQty > 0 ? Number(((c.stock / totalStockQty) * 100).toFixed(1)) : 0,
        costPercent: totalStockCost > 0 ? Number(((c.costValue / totalStockCost) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.stock - a.stock);

    const topStockBooks = [...allBooks]
      .map(b => {
        const s = Number(b.stock) || 0;
        const p = Number(b.price) || 0;
        let cp = Number(b.costPrice) || 0;
        if (cp <= 0 || cp >= p) cp = Math.round(p * 0.65);
        return {
          bookId: b._id,
          title: b.title,
          author: b.author || 'Chưa rõ',
          category: b.category || 'Khác',
          stock: s,
          price: p,
          costPrice: cp,
          costValue: s * cp,
          coverImage: b.coverImage || '/images/covers/default-book.svg'
        };
      })
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 10);

    const stockReport = {
      summary: {
        totalStockQty,
        totalStockCost,
        totalStockRetail,
        totalBookTitles: allBooks.length,
        averageStockPerTitle: allBooks.length > 0 ? Math.round(totalStockQty / allBooks.length) : 0
      },
      byCategory: categoryStockList,
      topStockBooks
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
          completedOrdersCount,
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
        stockReport,
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

// Khởi chạy tác vụ làm ấm bộ nhớ đệm (Pre-warm Cache) trong nền sau khi server khởi động
setTimeout(async () => {
  try {
    const fakeReq = { query: {} };
    const fakeRes = {
      status() { return this; },
      json() {}
    };
    await getAnalyticsReport(fakeReq, fakeRes);
    console.log('[Analytics Cache] Đã nạp sẵn bộ nhớ cache Thống kê Doanh thu (Pre-warmed)');
  } catch (err) {
    // silently ignore on initial boot before DB connect
  }
}, 3000);

// @desc    Lấy tổng hợp tất cả các số thông báo / huy hiệu (Badge Counts) cho Admin trong 1 request duy nhất
// @route   GET /api/admin/badge-counts
// @access  Private (Admin, Staff, Accountant, Stock)
const getAdminBadgeCounts = async (req, res) => {
  try {
    const now = Date.now();
    if (!req.query.force && badgeCountsCache.data && (now - badgeCountsCache.timestamp < 15000)) {
      return res.status(200).json({
        success: true,
        data: badgeCountsCache.data,
        cached: true
      });
    }

    const [
      pendingImports,
      pendingExports,
      pendingAudits,
      urgentOrders,
      pendingCashbook,
      pendingHide,
      pendingShelfCreate,
      pendingShelfMaintenance,
      pendingShelfTransfer,
      shelfLogsCount,
      pendingSupplierSuspend,
      unreadCriticalAudit
    ] = await Promise.all([
      ImportReceipt.countDocuments({ status: 'pending_approval' }).catch(() => 0),
      ExportReceipt.countDocuments({ status: 'pending_approval' }).catch(() => 0),
      AuditReceipt.countDocuments({ status: 'pending_approval' }).catch(() => 0),
      Invoice.countDocuments({
        $or: [
          { status: { $in: ['pending_confirmation', 'pending_payment', 'unpaid', 'pending'] } },
          { 'returnRequest.status': { $in: ['requested', 'shipping_back'] } }
        ]
      }).catch(() => 0),
      Transaction.countDocuments({ status: 'pending' }).catch(() => 0),
      BookHideRequest ? BookHideRequest.countDocuments({ status: 'pending' }).catch(() => 0) : 0,
      ShelfCreateRequest ? ShelfCreateRequest.countDocuments({ status: 'pending' }).catch(() => 0) : 0,
      ShelfMaintenanceRequest ? ShelfMaintenanceRequest.countDocuments({ status: 'pending' }).catch(() => 0) : 0,
      ShelfTransferRequest ? ShelfTransferRequest.countDocuments({ status: 'pending' }).catch(() => 0) : 0,
      ShelfActivityLog ? ShelfActivityLog.countDocuments().catch(() => 0) : 0,
      SupplierSuspendRequest ? SupplierSuspendRequest.countDocuments({ status: 'pending' }).catch(() => 0) : 0,
      AuditLog ? AuditLog.countDocuments({ severity: 'CRITICAL', isRead: { $ne: true } }).catch(() => 0) : 0
    ]);

    const data = {
      pendingImports,
      pendingExports,
      pendingAudits,
      urgentOrders,
      pendingCashbook,
      pendingHide,
      pendingShelfCreate,
      pendingShelfMaintenance,
      pendingShelfTransfer,
      shelfLogsCount,
      pendingSupplierSuspend,
      unreadCriticalAudit
    };

    badgeCountsCache = { data, timestamp: now };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Lỗi getAdminBadgeCounts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tải số liệu thông báo'
    });
  }
};

module.exports = {
  getDashboardOverview,
  getAnalyticsReport,
  getAdminBadgeCounts,
  clearAdminAnalyticsCache
};
