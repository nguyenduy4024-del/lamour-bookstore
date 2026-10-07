module.exports = `
    <!-- ===================== [NHÓM 1] TAB 1: BÀN LÀM VIỆC (OVERVIEW) ===================== -->
    <section class="tab-panel active" id="tab-overview">
      <div class="page-head">
        <div>
          <p class="eyebrow">Nhóm 1 · Tổng quan điều hành</p>
          <h2>Bàn Làm Việc Doanh Nghiệp</h2>
          <p>Số liệu tổng hợp theo thời gian thực về doanh thu, tình trạng đơn hàng và nhân sự của L'Amour Bookstore.</p>
        </div>
        <div>
          <button class="btn btn-solid" onclick="refreshAllData()">
            🔄 Làm Mới Dữ Liệu
          </button>
        </div>
      </div>

      <!-- 4 KPI cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon i-navy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
          </div>
          <div>
            <div class="kpi-label">Tổng doanh thu thực tế</div>
            <div class="kpi-value" id="kpiTotalRevenue">0₫</div>
          </div>
          <div class="kpi-sub"><span class="trend up">▲ Doanh số đã thanh toán</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon i-gold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </span>
          </div>
          <div>
            <div class="kpi-label">Tổng số đơn mua</div>
            <div class="kpi-value" id="kpiTotalOrders">0 đơn</div>
          </div>
          <div class="kpi-sub"><span class="trend up">Cả Online & POS (trừ hủy)</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon i-danger">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </span>
          </div>
          <div>
            <div class="kpi-label">Đơn cần xử lý ngay</div>
            <div class="kpi-value" id="kpiPendingOrdersCount" style="color:var(--danger);">0 đơn</div>
          </div>
          <div class="kpi-sub" id="kpiPendingSubText">Chờ duyệt tiền & Trả hàng</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon i-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
            </span>
          </div>
          <div>
            <div class="kpi-label">Tổng sách tồn kho</div>
            <div class="kpi-value" id="kpiTotalBooks">0 cuốn</div>
          </div>
          <div class="kpi-sub" id="kpiLowStockAlertText">Đang kiểm tra...</div>
        </div>
      </div>

      <!-- KHỐI CẢNH BÁO TỒN KHO & ĐƠN CẦN CHÚ Ý -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:24px;">
        <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:#B45309; font-size:13.5px; display:flex; align-items:center; gap:6px;">
              ⚠️ Sách sắp hết hàng (Tồn &le; 10 cuốn)
            </strong>
            <a href="javascript:void(0)" onclick="goToTab('inventory-lookup')" style="font-size:11.5px; color:#B45309; font-weight:600;">Xem kho →</a>
          </div>
          <div id="overviewLowStockList" style="font-size:12.5px; color:#78350F; line-height:1.6;">
            Đang tải dữ liệu cảnh báo...
          </div>
        </div>

        <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:#1E40AF; font-size:13.5px; display:flex; align-items:center; gap:6px;">
              🚚 Tiến độ giao hàng & Đơn hàng mới
            </strong>
            <a href="javascript:void(0)" onclick="goToTab('orders')" style="font-size:11.5px; color:#1E40AF; font-weight:600;">Xử lý đơn →</a>
          </div>
          <div id="overviewShippingSummary" style="font-size:12.5px; color:#1E3A8A; line-height:1.6;">
            Đang tổng hợp đơn hàng...
          </div>
        </div>
      </div>

      <!-- BẢNG ĐƠN HÀNG MỚI NHẤT -->
      <div class="section-card">
        <div class="section-card-head">
          <h3>Đơn Mua Khách Hàng Phát Sinh Gần Nhất</h3>
          <a href="javascript:void(0)" onclick="goToTab('orders')" class="see-all">Xem tất cả đơn hàng →</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã Hóa Đơn</th>
                <th>Thời Gian Đặt (GMT+7)</th>
                <th>Khách Hàng</th>
                <th>Thanh Toán</th>
                <th>Tổng Tiền</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody id="overviewRecentOrdersTbody">
              <tr><td colspan="7" style="text-align:center; padding:20px; color:var(--muted);">Đang tải đơn hàng...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- BẢNG NHÂN SỰ ĐANG LÀM VIỆC -->
      <div class="section-card">
        <div class="section-card-head">
          <h3>Nhân Sự Đang Hoạt Động Trên Hệ Thống</h3>
          <a href="javascript:void(0)" onclick="goToTab('employees')" class="see-all">Quản lý nhân viên →</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Nhân Viên</th>
                <th>Số Điện Thoại</th>
                <th>Bộ Phận</th>
                <th>Vai Trò (Role)</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody id="overviewStaffTbody">
              <tr><td colspan="6" style="text-align:center; padding:20px; color:var(--muted);">Đang tải nhân sự...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ===================== [NHÓM 1] TAB 2: THỐNG KÊ & PHÂN TÍCH (ANALYTICS) ===================== -->
    <section class="tab-panel" id="tab-analytics">
      <div class="page-head">
        <div>
          <p class="eyebrow">Nhóm 1 · Tổng quan điều hành</p>
          <h2>Thống Kê & Phân Tích Doanh Thu</h2>
          <p>Phân tích chuyên sâu đa chiều: Lợi nhuận gộp, phân loại kênh POS vs Online, Top bán chạy và Sách tồn đọng.</p>
        </div>
        <div class="head-tools" style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-outline" onclick="printAnalyticsReport()" style="display:flex; align-items:center; gap:6px;">
            🖨️ In Báo Cáo
          </button>
          <button class="btn btn-solid" onclick="exportAnalyticsCSV()" style="display:flex; align-items:center; gap:6px;">
            📥 Xuất Báo Cáo CSV
          </button>
        </div>
      </div>

      <!-- BỘ LỌC ĐA NĂNG (FILTER TOOLBAR UI/UX) -->
      <div class="analytics-filter-card">
        <!-- Hàng 1: Chọn nhanh khoảng thời gian (Pills bên trái) & Nút hành động (bên phải) -->
        <div class="analytics-pills-row">
          <div class="analytics-pills-left">
            <div class="analytics-pills-label">
              <i class="fa-solid fa-clock-rotate-left"></i> Khoảng thời gian:
            </div>
            <div class="analytics-pills-group">
              <button type="button" class="analytics-pill-btn active" data-preset="allTime" onclick="setAnalyticsQuickDate('allTime')">Toàn thời gian</button>
              <button type="button" class="analytics-pill-btn" data-preset="today" onclick="setAnalyticsQuickDate('today')">Hôm nay</button>
              <button type="button" class="analytics-pill-btn" data-preset="7days" onclick="setAnalyticsQuickDate('7days')">7 ngày</button>
              <button type="button" class="analytics-pill-btn" data-preset="30days" onclick="setAnalyticsQuickDate('30days')">30 ngày</button>
              <button type="button" class="analytics-pill-btn" data-preset="thisMonth" onclick="setAnalyticsQuickDate('thisMonth')">Tháng này</button>
              <button type="button" class="analytics-pill-btn" data-preset="thisYear" onclick="setAnalyticsQuickDate('thisYear')">Năm 2026</button>
            </div>
          </div>

          <!-- Nút hành động Lọc dữ liệu & Đặt lại gọn gàng góc phải -->
          <div class="analytics-actions-group">
            <button type="button" class="btn-analytics-filter" onclick="applyAnalyticsFilter()">
              <i class="fa-solid fa-magnifying-glass"></i> Lọc dữ liệu
            </button>
            <button type="button" class="btn-analytics-reset" onclick="resetAnalyticsFilter()" title="Khôi phục mặc định">
              <i class="fa-solid fa-rotate-right"></i> Đặt lại
            </button>
          </div>
        </div>

        <!-- Hàng 2: Bộ lọc chi tiết trải đều 100% chiều ngang -->
        <div class="analytics-controls-grid">
          <!-- 1. Cụm ngày Từ ngày — Đến ngày -->
          <div class="analytics-date-range">
            <div class="analytics-date-wrap">
              <i class="fa-regular fa-calendar-days analytics-date-icon"></i>
              <input type="date" id="analyticsStartDate" class="analytics-date-input" title="Từ ngày" onchange="applyAnalyticsFilter()" />
            </div>
            <span class="analytics-date-sep">—</span>
            <div class="analytics-date-wrap">
              <i class="fa-regular fa-calendar-days analytics-date-icon"></i>
              <input type="date" id="analyticsEndDate" class="analytics-date-input" title="Đến ngày" onchange="applyAnalyticsFilter()" />
            </div>
          </div>

          <!-- 2. Dropdown Kênh bán -->
          <div class="analytics-select-wrap">
            <select id="analyticsChannel" class="analytics-select" title="Kênh bán" onchange="applyAnalyticsFilter()">
              <option value="all">Tất cả kênh bán</option>
              <option value="pos">Tại quầy POS</option>
              <option value="online">Trực tuyến Online</option>
            </select>
          </div>

          <!-- 3. Dropdown Thể loại sách -->
          <div class="analytics-select-wrap">
            <select id="analyticsCategory" class="analytics-select" title="Thể loại sách" onchange="applyAnalyticsFilter()">
              <option value="all">Tất cả thể loại</option>
            </select>
          </div>

          <!-- 4. Dropdown Tác giả -->
          <div class="analytics-select-wrap">
            <select id="analyticsAuthor" class="analytics-select" title="Tác giả" onchange="applyAnalyticsFilter()">
              <option value="all">Tất cả tác giả</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 4 KPI CARDS -->
      <div class="kpi-grid" style="margin-bottom:24px;">
        <div class="kpi-card" style="border-top:3px solid var(--navy-900);">
          <div class="kpi-top">
            <span class="kpi-icon i-navy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
          </div>
          <div>
            <div class="kpi-label">Doanh Thu Thuần</div>
            <div class="kpi-value" id="anTotalRevenue" style="color:var(--navy-900);">0₫</div>
          </div>
          <div class="kpi-sub" id="anTotalRevenueSub"><span class="trend up">▲ Doanh số thực tế ghi nhận</span></div>
        </div>

        <div class="kpi-card" style="border-top:3px solid var(--gold);">
          <div class="kpi-top">
            <span class="kpi-icon i-gold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
          </div>
          <div>
            <div class="kpi-label">Lợi Nhuận Gộp Ước Tính</div>
            <div class="kpi-value" id="anGrossProfit" style="color:#059669;">0₫</div>
          </div>
          <div class="kpi-sub"><span id="anProfitMarginBadge" class="trend up">Tỷ suất: 0%</span></div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #2563EB;">
          <div class="kpi-top">
            <span class="kpi-icon" style="background:#EFF6FF; color:#2563EB;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </span>
          </div>
          <div>
            <div class="kpi-label">Số Đơn Hoàn Thành</div>
            <div class="kpi-value" id="anSuccessOrders">0 đơn</div>
          </div>
          <div class="kpi-sub"><span id="anSuccessRate" class="trend up">Tỷ lệ thành công: 0%</span></div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #7C3AED;">
          <div class="kpi-top">
            <span class="kpi-icon" style="background:#F5F3FF; color:#7C3AED;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            </span>
          </div>
          <div>
            <div class="kpi-label">Giá Trị Đơn Trung Bình (AOV)</div>
            <div class="kpi-value" id="anAvgOrderValue">0₫</div>
          </div>
          <div class="kpi-sub"><span>Doanh thu / Đơn thành công</span></div>
        </div>
      </div>

      <!-- BIỂU ĐỒ DOANH THU & PHÂN BỔ KÊNH (GRID 1.6fr 1fr) -->
      <div style="display:grid; grid-template-columns: 1.6fr 1fr; gap:20px; margin-bottom:24px;">
        <!-- CỘT TRÁI: BIỂU ĐỒ BIẾN ĐỘNG THEO THỜI GIAN -->
        <div class="section-card" style="padding:22px; margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
              <div>
                <h3 style="font-size:16px; margin-bottom:4px;">Biến Động Doanh Thu & Lợi Nhuận</h3>
                <span style="font-size:12px; color:var(--muted);">Theo mốc thời gian lọc (Đơn vị: VNĐ)</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="display:flex; align-items:center; gap:4px; font-size:11.5px; color:var(--muted);">
                  <span style="width:10px; height:10px; background:var(--gold); border-radius:2px; display:inline-block;"></span> Doanh thu
                </span>
                <span style="display:flex; align-items:center; gap:4px; font-size:11.5px; color:var(--muted);">
                  <span style="width:10px; height:10px; background:#059669; border-radius:2px; display:inline-block;"></span> Lợi nhuận
                </span>
              </div>
            </div>

            <!-- Chart Container -->
            <div id="analyticsChartBars" style="display:flex; align-items:flex-end; gap:12px; height:330px; padding:16px 8px 8px; border-bottom:1px solid var(--line); overflow-x:auto; background:linear-gradient(180deg, rgba(248,250,252,0.5) 0%, rgba(255,255,255,1) 100%); border-radius:8px;">
              <div style="width:100%; text-align:center; color:var(--muted); padding-top:120px; font-size:12.5px;">Đang tính toán biểu đồ...</div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; font-size:11.5px; color:var(--muted);">
            <span>📊 Rê chuột vào từng cột để xem chi tiết Doanh thu & Lợi nhuận</span>
            <span id="anChartSummaryText"></span>
          </div>
        </div>

        <!-- CỘT PHẢI: KÊNH BÁN HÀNG & THỂ LOẠI -->
        <div class="section-card" style="padding:22px; margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div class="section-card-head" style="padding:0 0 12px; border-bottom:1px solid var(--line); margin-bottom:16px;">
              <h3 style="font-size:16px;">Phân Bổ Kênh Bán Hàng & Thể Loại</h3>
            </div>

            <!-- Tỷ trọng Kênh POS vs Online: Di chuột để xem chi tiết -->
            <div id="anChannelWrap" style="margin-bottom:20px; position:relative;" onmouseenter="showChannelDetail(true)" onmouseleave="showChannelDetail(false)">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="font-size:13px; color:var(--navy-900); display:flex; align-items:center; gap:6px;">
                  Tỷ Trọng Kênh Bán
                </strong>
                <span id="anChannelRatioLabel" style="font-size:12px; font-family:'IBM Plex Mono',monospace; font-weight:600; color:var(--navy-700);">POS: 0% | Online: 0%</span>
              </div>
              <div id="anChannelBar" onclick="toggleChannelBreakdownDetail()" onmouseenter="showChannelDetail(true)" style="height:16px; width:100%; background:var(--navy-100); border-radius:99px; overflow:hidden; display:flex; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.08); transition:transform 0.2s ease;" title="Di chuột vào để xem chi tiết Tại quầy & Online">
                <div id="anChannelBarPos" style="height:100%; width:50%; background:#0284C7; transition:width 0.4s ease;" title="Tại quầy (POS)"></div>
                <div id="anChannelBarOnline" style="height:100%; width:50%; background:#10B981; transition:width 0.4s ease;" title="Online"></div>
              </div>

              <!-- Chi tiết kênh bán: Hiển thị ngay khi di chuột vào thanh tỉ trọng -->
              <div id="anChannelDetailBox" style="display:none; margin-top:10px; padding:10px 14px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:8px; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; font-size:12.5px; box-shadow:0 4px 12px rgba(0,0,0,0.06); transition:all 0.2s ease;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#0284C7;"></span>
                  <span style="color:#0284C7; font-weight:700; font-size:13px;">🏪 Tại quầy: <span id="anPosStats" style="color:#0284C7; font-weight:800;">0₫ (0 đơn)</span></span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#10B981;"></span>
                  <span style="color:#10B981; font-weight:700; font-size:13px;">🌐 Online: <span id="anOnlineStats" style="color:#10B981; font-weight:800;">0₫ (0 đơn)</span></span>
                </div>
              </div>
            </div>

            <!-- Top Thể loại sách mang lại doanh thu -->
            <div>
              <strong style="font-size:13px; color:var(--navy-900); display:block; margin-bottom:10px;">Top Thể Loại Đóng Góp Doanh Thu</strong>
              <div id="anCategoryBreakdown" style="display:flex; flex-direction:column; gap:10px;">
                <div style="color:var(--muted); font-size:12px;">Đang tổng hợp thể loại...</div>
              </div>
            </div>
          </div>

          <div style="background:#F8FAFC; border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin-top:16px; font-size:11.5px; color:var(--muted); line-height:1.5;">
            💡 <em>Dữ liệu giúp điều chỉnh chính sách khuyến mãi và tối ưu tồn kho giữa kênh cửa hàng và bán online.</em>
          </div>
        </div>
      </div>

      <!-- KHU VỰC BIỂU ĐỒ PHÂN TÍCH TỒN KHO SÁCH (INVENTORY & STOCK ANALYTICS BI) -->
      <div class="section-card" style="padding:22px; margin-bottom:24px;">
        <!-- Card Header with Title and Mode Switcher -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; border-bottom:1px solid var(--line); padding-bottom:16px; margin-bottom:18px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #DBEAFE, #BFDBFE); color:#1D4ED8; font-size:15px; box-shadow:0 2px 4px rgba(29,78,216,0.15);">
                <i class="fa-solid fa-boxes-stacked"></i>
              </span>
              <h3 style="font-size:17px; margin:0; color:var(--navy-900);">Biểu Đồ Phân Tích Sách Tồn Kho & Giá Trị Lưu Kho</h3>
            </div>
            <p style="font-size:12.5px; color:var(--muted); margin:0;">
              Thống kê số lượng sách lưu kho, cơ cấu phân bổ theo thể loại và các đầu sách chiếm tỷ trọng vốn lưu động lớn nhất.
            </p>
          </div>

          <!-- Controls: Mode Switcher -->
          <div class="analytics-pills-group" style="margin:0; background:var(--cream); padding:3px; border-radius:8px; border:1px solid var(--line); display:flex; gap:3px;">
            <button type="button" class="analytics-pill-btn active" id="btnStockModeCategory" onclick="setStockAnalyticsMode('category')">
              <i class="fa-solid fa-layer-group"></i> Theo Thể Loại
            </button>
            <button type="button" class="analytics-pill-btn" id="btnStockModeTopBooks" onclick="setStockAnalyticsMode('topbooks')">
              <i class="fa-solid fa-book-bookmark"></i> Top Sách Tồn Lớn
            </button>
          </div>
        </div>

        <!-- 4 Quick KPI Badges for Stock -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:20px;">
          <div style="background:#F8FAFC; border:1px solid var(--line); border-radius:8px; padding:12px 14px; border-left:4px solid #2563EB;">
            <div style="font-size:11.5px; color:var(--muted); font-weight:600; text-transform:uppercase;">Tổng Sách Tồn Kho</div>
            <div id="stkTotalQty" style="font-size:19px; font-weight:800; color:#1E40AF; margin-top:2px;">0 cuốn</div>
            <div style="font-size:11px; color:var(--muted); margin-top:2px;" id="stkTotalTitles">108 đầu sách sẵn sàng</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid var(--line); border-radius:8px; padding:12px 14px; border-left:4px solid #D97706;">
            <div style="font-size:11.5px; color:var(--muted); font-weight:600; text-transform:uppercase;">Tổng Vốn Lưu Đọng</div>
            <div id="stkTotalCost" style="font-size:19px; font-weight:800; color:#B45309; margin-top:2px;">0₫</div>
            <div style="font-size:11px; color:var(--muted); margin-top:2px;">Giá vốn thực tế lưu kho</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid var(--line); border-radius:8px; padding:12px 14px; border-left:4px solid #059669;">
            <div style="font-size:11.5px; color:var(--muted); font-weight:600; text-transform:uppercase;">Giá Trị Bán Niêm Yết</div>
            <div id="stkTotalRetail" style="font-size:19px; font-weight:800; color:#047857; margin-top:2px;">0₫</div>
            <div style="font-size:11px; color:var(--muted); margin-top:2px;">Doanh thu ước tính xuất kho</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid var(--line); border-radius:8px; padding:12px 14px; border-left:4px solid #7C3AED;">
            <div style="font-size:11.5px; color:var(--muted); font-weight:600; text-transform:uppercase;">Bình Quân / Đầu Sách</div>
            <div id="stkAvgPerTitle" style="font-size:19px; font-weight:800; color:#6D28D9; margin-top:2px;">0 cuốn</div>
            <div style="font-size:11px; color:var(--muted); margin-top:2px;">Độ phủ tồn kho dồi dào</div>
          </div>
        </div>

        <!-- Grid: Cột trái Bar Chart + Cột phải Phân Bổ Tỷ Trọng Vốn (1.6fr 1fr) -->
        <div style="display:grid; grid-template-columns: 1.6fr 1fr; gap:20px;">
          <!-- CỘT TRÁI: BIỂU ĐỒ CỘT TỒN KHO -->
          <div style="background:#FFFFFF; border:1px solid var(--line); border-radius:10px; padding:18px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                <strong id="stkChartTitle" style="font-size:13.5px; color:var(--navy-900);">
                  Cơ Cấu Số Lượng Sách Tồn Kho Theo Thể Loại (Đơn vị: Cuốn)
                </strong>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="display:flex; align-items:center; gap:4px; font-size:11px; color:var(--muted);">
                    <span style="width:10px; height:10px; background:#2563EB; border-radius:2px; display:inline-block;"></span> Số lượng tồn
                  </span>
                  <span style="display:flex; align-items:center; gap:4px; font-size:11px; color:var(--muted);">
                    <span style="width:10px; height:10px; background:#D97706; border-radius:2px; display:inline-block;"></span> Giá trị vốn
                  </span>
                </div>
              </div>

              <!-- Container Biểu Đồ Cột -->
              <div id="stockAnalyticsChartBars" style="display:flex; align-items:flex-end; gap:10px; height:270px; padding:16px 8px 8px; border-bottom:1px solid var(--line); overflow-x:auto; background:linear-gradient(180deg, rgba(240,249,255,0.4) 0%, rgba(255,255,255,1) 100%); border-radius:8px;">
                <div style="width:100%; text-align:center; color:var(--muted); padding-top:100px; font-size:12.5px;">Đang tải biểu đồ tồn kho...</div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:11.5px; color:var(--muted);">
              <span>📊 Rê chuột vào từng cột để xem chi tiết Số lượng & Giá trị vốn tồn kho</span>
              <span id="stkChartSummaryText"></span>
            </div>
          </div>

          <!-- CỘT PHẢI: TỶ TRỌNG VỐN TỒN KHO & ĐIỀU HÀNH -->
          <div style="background:#FFFFFF; border:1px solid var(--line); border-radius:10px; padding:18px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="padding-bottom:10px; border-bottom:1px solid var(--line); margin-bottom:14px;">
                <strong style="font-size:13.5px; color:var(--navy-900); display:block;">
                  Tỷ Trọng Vốn Lưu Kho Theo Thể Loại
                </strong>
                <span style="font-size:11.5px; color:var(--muted);">Xếp hạng giá trị vốn bị chiếm dụng trong kho</span>
              </div>

              <!-- List thể loại với progress bar -->
              <div id="stkCategoryShareList" style="display:flex; flex-direction:column; gap:9px; max-height:240px; overflow-y:auto; padding-right:4px;">
                <div style="color:var(--muted); font-size:12px;">Đang tổng hợp cơ cấu vốn tồn...</div>
              </div>
            </div>

            <div style="background:#F8FAFC; border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin-top:14px; font-size:11.5px; color:var(--muted); line-height:1.45;">
              💡 <em>Khuyến nghị: Nhóm sách Tâm lý & Kinh tế chiếm hơn 39% vốn lưu kho. Cần đẩy mạnh bán chéo (cross-selling) và flash sale để tối ưu vòng quay hàng tồn (Inventory Turnover).</em>
            </div>
          </div>
        </div>
      </div>

      <!-- KHU VỰC ĐỐI SOÁT SẢN PHẨM: 2 TABS (BÁN CHẠY vs DEAD STOCK) -->
      <div class="section-card" style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--line); flex-wrap:wrap; gap:10px;">
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-sm btn-solid" id="btnTabTopSelling" onclick="switchBookAnalyticsTab('bestsellers')">
              🔥 Top 10 Sách Bán Chạy Nhất
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btnTabDeadStock" onclick="switchBookAnalyticsTab('deadstock')">
              ⚠️ Top 10 Sách Tồn Kho / Bán Chậm (Dead Stock)
            </button>
          </div>
          <span style="font-size:12px; color:var(--muted);" id="anBookTableSubtitle">
            Sắp xếp theo số lượng bán ra cao nhất trong kỳ
          </span>
        </div>

        <!-- BẢNG 1: TOP 10 BÁN CHẠY -->
        <div class="table-wrap" id="analyticsBestsellersWrap">
          <table>
            <thead>
              <tr>
                <th style="width:60px; text-align:center;">Hạng</th>
                <th>Tên Đầu Sách & Tác Giả</th>
                <th>Thể Loại</th>
                <th style="text-align:center;">Đã Bán</th>
                <th style="text-align:right;">Doanh Số</th>
                <th style="text-align:right;">Lợi Nhuận Gộp</th>
                <th style="text-align:center;">Tỷ Trọng</th>
              </tr>
            </thead>
            <tbody id="analyticsTopBooksTbody">
              <tr><td colspan="7" style="text-align:center; padding:24px; color:var(--muted);">Đang tính toán sách bán chạy...</td></tr>
            </tbody>
          </table>
        </div>

        <!-- BẢNG 2: TOP 10 DEAD STOCK (ẨN MẶC ĐỊNH) -->
        <div class="table-wrap" id="analyticsDeadStockWrap" style="display:none;">
          <table>
            <thead>
              <tr>
                <th style="width:60px; text-align:center;">Hạng</th>
                <th>Tên Đầu Sách & Tác Giả</th>
                <th>Thể Loại</th>
                <th style="text-align:center;">Tồn Kho Hiện Tại</th>
                <th style="text-align:right;">Giá Vốn Tồn Đọng</th>
                <th style="text-align:center;">Bán Trong Kỳ</th>
                <th>Khuyến Nghị Điều Hành</th>
              </tr>
            </thead>
            <tbody id="analyticsDeadStockTbody">
              <tr><td colspan="7" style="text-align:center; padding:24px; color:var(--muted);">Đang rà soát sách tồn kho lâu...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- KHU VỰC PHÂN TÍCH KHÁCH HÀNG THÂN THIẾT & VIP SPENDERS (ADMIN BI) -->
      <div class="section-card" style="margin-bottom:24px; padding:22px;">
        <!-- Card Header with Title, Badges and Controls -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; border-bottom:1px solid var(--line); padding-bottom:16px; margin-bottom:18px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; background:linear-gradient(135deg, var(--gold-100), #FDE68A); color:var(--gold-dark); font-size:14px; box-shadow:0 2px 4px rgba(199,161,90,0.2);">
                <i class="fa-solid fa-crown"></i>
              </span>
              <h3 style="font-size:17px; margin:0; color:var(--navy-900);">Phân Tích Khách Hàng Thân Thiết: Chi Tiêu & Số Lần Mua</h3>
            </div>
            <p style="font-size:12.5px; color:var(--muted); margin:0;">
              Chân dung nhóm khách hàng trọng điểm dựa trên <strong>tổng số tiền chi tiêu (VIP Spenders)</strong> và <strong>tần suất mua hàng lặp lại (Frequent Buyers)</strong> trong kỳ.
            </p>
          </div>

          <!-- Controls: Mode pills & Limit dropdown -->
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <!-- View Mode Switcher -->
            <div class="analytics-pills-group" style="margin:0; background:var(--cream); padding:3px; border-radius:8px; border:1px solid var(--line); display:flex; gap:3px;">
              <button type="button" class="analytics-pill-btn active" id="btnAdminCustModeBoth" onclick="setAdminCustLoyaltyMode('both')">
                <i class="fa-solid fa-table-columns"></i> Song Song
              </button>
              <button type="button" class="analytics-pill-btn" id="btnAdminCustModeSpend" onclick="setAdminCustLoyaltyMode('spend')">
                💎 Top Chi Tiêu
              </button>
              <button type="button" class="analytics-pill-btn" id="btnAdminCustModeFreq" onclick="setAdminCustLoyaltyMode('frequency')">
                🔁 Top Tần Suất Đơn
              </button>
            </div>

            <!-- Limit Selector -->
            <div style="width: 135px; min-width: 135px;">
              <select id="adminCustLoyaltyLimitSelect" data-no-custom="true" onchange="setAdminCustLoyaltyLimit(this.value)" style="width:100%; height:32px; border:1px solid var(--line); border-radius:6px; font-size:12px; font-family:'IBM Plex Mono',monospace; padding:0 10px; background:#fff; cursor:pointer; color:var(--navy-900); font-weight:600;">
                <option value="5">Top 5 khách</option>
                <option value="10" selected>Top 10 khách</option>
                <option value="15">Top 15 khách</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 4 Thẻ KPI Tóm Tắt Khách Hàng Thân Thiết (Admin Executive Style) -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:14px; margin-bottom:20px;">
          <!-- KPI 1: Tổng chi tiêu Top khách -->
          <div style="background:#FAF7F2; border:1px solid var(--line); border-left:4px solid var(--gold); border-radius:8px; padding:12px 14px;">
            <div style="font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; font-family:'IBM Plex Mono',monospace; color:var(--muted); margin-bottom:4px;">
              Tổng Chi Tiêu Top Khách
            </div>
            <div id="adminCustTopSpendVal" style="font-size:19px; font-weight:700; color:var(--navy-900); font-family:'IBM Plex Mono',monospace; margin-bottom:2px;">
              0 ₫
            </div>
            <div id="adminCustTopSpendSub" style="font-size:11.5px; color:#059669; font-weight:500;">
              Chiếm 0% tổng doanh thu kỳ
            </div>
          </div>

          <!-- KPI 2: Chi tiêu TB / Khách VIP -->
          <div style="background:#FAF7F2; border:1px solid var(--line); border-left:4px solid #7C3AED; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; font-family:'IBM Plex Mono',monospace; color:var(--muted); margin-bottom:4px;">
              Chi Tiêu TB / Khách VIP
            </div>
            <div id="adminCustAvgSpendVal" style="font-size:19px; font-weight:700; color:#5B21B6; font-family:'IBM Plex Mono',monospace; margin-bottom:2px;">
              0 ₫
            </div>
            <div style="font-size:11.5px; color:var(--muted);">
              Giá trị tích lũy bình quân mỗi khách
            </div>
          </div>

          <!-- KPI 3: Tần suất đơn bình quân -->
          <div style="background:#FAF7F2; border:1px solid var(--line); border-left:4px solid var(--navy-700); border-radius:8px; padding:12px 14px;">
            <div style="font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; font-family:'IBM Plex Mono',monospace; color:var(--muted); margin-bottom:4px;">
              Tần Suất Đơn TB / Khách
            </div>
            <div id="adminCustAvgOrderVal" style="font-size:19px; font-weight:700; color:var(--navy-900); font-family:'IBM Plex Mono',monospace; margin-bottom:2px;">
              0 đơn
            </div>
            <div id="adminCustAvgOrderSub" style="font-size:11.5px; color:var(--muted);">
              Tỷ lệ quay lại đặt hàng trong kỳ
            </div>
          </div>

          <!-- KPI 4: Quán quân mua hàng -->
          <div style="background:#FAF7F2; border:1px solid var(--line); border-left:4px solid #0D9488; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; font-family:'IBM Plex Mono',monospace; color:var(--muted); margin-bottom:4px;">
              Khách Mua Nhiều Nhất
            </div>
            <div id="adminCustTopChampName" style="font-size:15px; font-weight:700; color:#0F766E; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;" title="Chưa có">
              --
            </div>
            <div id="adminCustTopChampSub" style="font-size:11.5px; color:#0F766E; font-weight:500;">
              0 đơn đã hoàn thành
            </div>
          </div>
        </div>

        <!-- 2 Chart Panels Grid -->
        <div id="adminCustChartsGrid" style="display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:20px;">
          <!-- Chart 1: VIP Spenders (Tổng tiền mua) -->
          <div id="adminCustSpendChartBox" style="background:#FFFFFF; border:1px solid var(--line); border-radius:10px; padding:16px; box-shadow:var(--shadow-card);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #F1ECE1;">
              <div>
                <h4 style="font-size:13.5px; font-weight:700; color:var(--navy-900); margin:0; display:flex; align-items:center; gap:6px;">
                  <span style="color:var(--gold-dark); font-size:15px;">💎</span> Top Khách Hàng Chi Tiêu Nhiều Nhất (VIP Spenders)
                </h4>
                <span style="font-size:11.5px; color:var(--muted);">Xếp theo tổng số tiền mua tích lũy (VNĐ)</span>
              </div>
              <span class="badge" style="background:var(--gold-100); color:var(--gold-dark); font-size:11px; font-weight:600; padding:3px 8px; border-radius:4px;">Doanh Số Cao</span>
            </div>
            <div style="height:310px; position:relative; width:100%;">
              <canvas id="adminCustLoyaltySpendChart"></canvas>
            </div>
          </div>

          <!-- Chart 2: Frequent Buyers (Số lần mua) -->
          <div id="adminCustFreqChartBox" style="background:#FFFFFF; border:1px solid var(--line); border-radius:10px; padding:16px; box-shadow:var(--shadow-card);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #F1ECE1;">
              <div>
                <h4 style="font-size:13.5px; font-weight:700; color:var(--navy-900); margin:0; display:flex; align-items:center; gap:6px;">
                  <span style="color:#2563EB; font-size:15px;">🔁</span> Top Khách Hàng Mua Nhiều Lần Nhất (Frequent Buyers)
                </h4>
                <span style="font-size:11.5px; color:var(--muted);">Xếp theo số lần mua hàng lặp lại (Số đơn)</span>
              </div>
              <span class="badge" style="background:var(--navy-100); color:var(--navy-700); font-size:11px; font-weight:600; padding:3px 8px; border-radius:4px;">Tần Suất Cao</span>
            </div>
            <div style="height:310px; position:relative; width:100%;">
              <canvas id="adminCustLoyaltyFreqChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Collapsible Detailed Ranking Table -->
        <div style="border-top:1px solid var(--line); padding-top:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; font-size:13.5px; color:var(--navy-900);">
                <i class="fa-solid fa-list-ol" style="color:var(--gold-dark); margin-right:4px;"></i> Bảng Phân Hạng Khách Hàng Thân Thiết & Chi Tiết Tích Lũy
              </span>
              <span id="adminCustTableCountBadge" style="background:var(--navy-100); color:var(--navy-900); font-size:11px; font-family:'IBM Plex Mono',monospace; padding:2px 7px; border-radius:12px; font-weight:600;">
                0 khách
              </span>
            </div>
            <button type="button" class="btn btn-sm btn-outline" onclick="toggleAdminCustLoyaltyTable()" id="btnToggleAdminCustTable" style="display:flex; align-items:center; gap:5px;">
              <i class="fa-solid fa-eye-slash" id="iconToggleAdminCustTable"></i> <span id="textToggleAdminCustTable">Ẩn Bảng Chi Tiết</span>
            </button>
          </div>

          <div id="adminCustLoyaltyTableWrap" class="table-wrap" style="max-height:340px; overflow-y:auto; border:1px solid var(--line); border-radius:8px;">
            <table style="width:100%; font-size:12.5px;">
              <thead>
                <tr>
                  <th style="width:55px; text-align:center;">Hạng</th>
                  <th>Khách Hàng</th>
                  <th style="width:130px;">Số Điện Thoại</th>
                  <th style="width:110px; text-align:center;">Số Lần Mua</th>
                  <th style="width:120px; text-align:center;">Sách Đã Mua</th>
                  <th style="width:140px; text-align:right;">Tổng Chi Tiêu</th>
                  <th style="width:130px; text-align:right;">TB / Đơn (AOV)</th>
                  <th style="width:140px; text-align:center;">Phân Hạng VIP</th>
                </tr>
              </thead>
              <tbody id="adminCustLoyaltyTbody">
                <tr><td colspan="8" style="text-align:center; padding:22px; color:var(--muted);">Đang tổng hợp dữ liệu khách hàng thân thiết...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- KHU VỰC TÁC GIẢ & CƠ CẤU THANH TOÁN (GRID 1.2fr 1fr) -->
      <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:20px; margin-bottom:24px;">
        <!-- TOP 5 TÁC GIẢ -->
        <div class="section-card" style="margin-bottom:0;">
          <div class="section-card-head">
            <h3>Top 5 Tác Giả Có Doanh Số Cao Nhất</h3>
            <span style="font-size:12px; color:var(--muted);">Ghi nhận trong kỳ lọc</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:50px; text-align:center;">#</th>
                  <th>Tác Giả</th>
                  <th style="text-align:center;">Số Lượng Bán</th>
                  <th style="text-align:right;">Tổng Doanh Thu</th>
                </tr>
              </thead>
              <tbody id="analyticsTopAuthorsTbody">
                <tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">Đang tổng hợp tác giả...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CƠ CẤU THANH TOÁN -->
        <div class="section-card" style="margin-bottom:0; padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div class="section-card-head" style="padding:0 0 14px; border-bottom:1px solid var(--line);">
              <h3>Cơ Cấu Phương Thức Thanh Toán</h3>
            </div>
            <div id="analyticsPaymentBreakdown" style="margin-top:16px; display:flex; flex-direction:column; gap:14px;">
              <div style="color:var(--muted); font-size:12px;">Đang tải phương thức thanh toán...</div>
            </div>
          </div>

          <div style="background:#F8FAFC; border:1px solid var(--line); border-radius:8px; padding:12px; margin-top:20px; font-size:12px; color:var(--muted); line-height:1.5;">
            💡 <em>Chuyển khoản VietQR tự động khớp và đối soát trực tiếp, giúp rút ngắn thời gian giao dịch tại quầy.</em>
          </div>
        </div>
      </div>
    </section>
`;

