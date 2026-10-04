module.exports = `
    <!-- ========================================== -->
    <!-- NHÓM 3: SẢN PHẨM & BÁN HÀNG -->
    <!-- ========================================== -->

    <!-- PANEL: SÁCH -->
    <section class="tab-panel" id="tab-books">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Quản lý Danh mục Sách</h2>
          <p class="panel-subtitle">Quản lý kho sách, định giá niêm yết/khuyến mãi, trạng thái kinh doanh và tồn kho</p>
        </div>
        <button class="btn btn-primary" onclick="openBookModal()"><i class="fas fa-plus"></i> Thêm đầu sách mới</button>
      </div>

      <!-- BỘ LỌC TRẠNG THÁI SÁCH (QUICK TABS) -->
      <div class="order-status-tabs" id="bookStatusTabs" style="margin-bottom: 14px;">
        <button class="order-tab active" data-status="all" onclick="setBookStatusFilter('all')">
          <i class="fas fa-layer-group"></i> Tất cả sách <span class="badge b-user" id="tabCountAll">0</span>
        </button>
        <button class="order-tab" data-status="active" onclick="setBookStatusFilter('active')">
          <i class="fas fa-check-circle" style="color:var(--emerald);"></i> Đang kinh doanh <span class="badge badge-success" id="tabCountActive">0</span>
        </button>
        <button class="order-tab" data-status="hidden" onclick="setBookStatusFilter('hidden')">
          <i class="fas fa-eye-slash" style="color:#64748B;"></i> Đã ẩn / Ngừng kinh doanh <span class="badge badge-secondary" id="tabCountHidden">0</span>
        </button>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <input type="text" id="bookSearchInput" placeholder="Tìm tên sách, ISBN, tác giả..." oninput="filterBooksClient()" />
        </div>
        <div class="filter-select">
          <select id="bookStatusFilter" onchange="onBookStatusDropdownChange(this.value)">
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang kinh doanh</option>
            <option value="hidden">Đã ẩn / Ngừng kinh doanh</option>
          </select>
        </div>
        <div class="filter-select">
          <select id="bookCategoryFilter" onchange="filterBooksClient()">
            <option value="">Tất cả thể loại</option>
          </select>
        </div>
        <div class="filter-select">
          <select id="bookStockFilter" onchange="filterBooksClient()">
            <option value="">Tất cả tồn kho</option>
            <option value="low">Sắp hết hàng (≤ 5)</option>
            <option value="out">Hết hàng (0)</option>
            <option value="available">Còn hàng (> 5)</option>
          </select>
        </div>
        <button class="btn btn-secondary" onclick="loadBooks()"><i class="fas fa-sync-alt"></i> Tải lại</button>
      </div>

      <div class="table-container" id="bookTableContainer">
        <table id="bookTable">
          <thead>
            <tr>
              <th style="min-width: 65px; width: 65px;">Bìa sách</th>
              <th style="min-width: 140px;">Mã sách</th>
              <th style="min-width: 260px;">Tên tác phẩm</th>
              <th style="min-width: 170px;">Tác giả</th>
              <th style="min-width: 130px;">Thể loại</th>
              <th style="min-width: 120px;">Giá bán</th>
              <th style="min-width: 120px;">Giá vốn</th>
              <th style="min-width: 110px;">Tồn kho</th>
              <th style="min-width: 130px;">Vị trí kệ</th>
              <th style="min-width: 130px;">Trạng thái</th>
              <th style="min-width: 180px; text-align: right;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="bookTableBody">
            <tr><td colspan="11" class="empty-cell">Đang tải danh sách sách...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Footer hiển thị tổng số sách (Cuộn dọc xem toàn bộ) -->
      <div class="book-table-footer" id="bookTableFooter">
        <span id="bookCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-book" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải danh sách sách...</span>
        <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc để xem toàn bộ sách</span>
      </div>
    </section>

    <!-- PANEL: TÁC GIẢ & THỂ LOẠI -->
    <section class="tab-panel" id="tab-authors-categories">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Tác giả & Thể loại sách</h2>
          <p class="panel-subtitle">Quản trị các danh mục phân loại sách và hồ sơ tác giả nổi bật</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="openAuthorModal()"><i class="fas fa-pen-nib"></i> Thêm tác giả</button>
          <button class="btn btn-primary" onclick="openCategoryModal()"><i class="fas fa-tags"></i> Thêm thể loại</button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 26px;">
        <!-- BẢNG 1: DANH MỤC THỂ LOẠI SÁCH (1 HÀNG FULL-WIDTH) -->
        <div class="card" style="padding: 22px; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 17px; font-weight: 700; color: var(--navy-900); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-tags" style="color: var(--color-amber);"></i> Danh mục Thể loại Sách
              </h3>
              <p style="margin: 4px 0 0; font-size: 13px; color: var(--muted);">Phân loại các dòng sách để phục vụ tìm kiếm, phân nhóm và điều hướng trên hệ thống</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="openCategoryModal()"><i class="fas fa-plus"></i> Thêm thể loại</button>
          </div>

          <div class="table-container" id="categoryTableContainer">
            <table id="categoryTable">
              <thead>
                <tr>
                  <th style="min-width: 240px;">Tên thể loại</th>
                  <th style="min-width: 440px;">Mô tả thể loại</th>
                  <th style="text-align: center; min-width: 140px;">Số sách</th>
                  <th style="text-align: right; min-width: 160px;">Thao tác</th>
                </tr>
              </thead>
              <tbody id="categoryTableBody">
                <tr><td colspan="4" class="empty-cell">Đang tải thể loại...</td></tr>
              </tbody>
            </table>
          </div>

          <div class="category-table-footer" id="categoryTableFooter">
            <span id="categoryCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-tags" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải thể loại...</span>
            <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài</span>
          </div>
        </div>

        <!-- BẢNG 2: DANH SÁCH TÁC GIẢ (1 HÀNG FULL-WIDTH) -->
        <div class="card" style="padding: 22px; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 17px; font-weight: 700; color: var(--navy-900); display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-pen-nib" style="color: var(--color-amber);"></i> Danh sách Tác giả Sách
              </h3>
              <p style="margin: 4px 0 0; font-size: 13px; color: var(--muted);">Hồ sơ tác giả nổi bật, thể loại chấp bút chính, danh ngôn trích dẫn và liên kết tác phẩm</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="openAuthorModal()"><i class="fas fa-plus"></i> Thêm tác giả</button>
          </div>

          <div class="table-container" id="authorTableContainer">
            <table id="authorTable">
              <thead>
                <tr>
                  <th style="min-width: 260px;">Tác giả</th>
                  <th style="min-width: 440px;">Thể loại chính & Trích dẫn nổi bật</th>
                  <th style="text-align: center; min-width: 140px;">Tác phẩm</th>
                  <th style="text-align: right; min-width: 160px;">Thao tác</th>
                </tr>
              </thead>
              <tbody id="authorTableBody">
                <tr><td colspan="4" class="empty-cell">Đang tải tác giả...</td></tr>
              </tbody>
            </table>
          </div>

          <div class="author-table-footer" id="authorTableFooter">
            <span id="authorCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-pen-nib" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải tác giả...</span>
            <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài</span>
          </div>
        </div>
      </div>
    </section>

    <!-- PANEL: ĐƠN HÀNG & QUY TRÌNH TRẢ HÀNG -->
    <section class="tab-panel" id="tab-orders">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Quản lý Đơn Mua Khách Hàng</h2>
          <p class="panel-subtitle">Xử lý toàn bộ vòng đời đơn hàng và tiếp nhận xử lý yêu cầu Trả hàng / Hoàn tiền</p>
        </div>
      </div>

      <!-- 7 TABS TRẠNG THÁI -->
      <div class="order-status-tabs">
        <button class="order-tab active" data-order-status="all" onclick="switchOrderStatusTab('all')">
          Tất cả <span class="order-count" id="count-all">0</span>
        </button>
        <button class="order-tab" data-order-status="pending_payment" onclick="switchOrderStatusTab('pending_payment')">
          Chờ xác nhận <span class="order-count" id="count-pending_payment">0</span>
        </button>
        <button class="order-tab" data-order-status="delivering" onclick="switchOrderStatusTab('delivering')">
          Đang chuẩn bị <span class="order-count" id="count-delivering">0</span>
        </button>
        <button class="order-tab" data-order-status="shipping" onclick="switchOrderStatusTab('shipping')">
          Đang giao hàng <span class="order-count" id="count-shipping">0</span>
        </button>
        <button class="order-tab" data-order-status="completed" onclick="switchOrderStatusTab('completed')">
          Hoàn thành <span class="order-count" id="count-completed">0</span>
        </button>
        <button class="order-tab" data-order-status="cancelled" onclick="switchOrderStatusTab('cancelled')">
          Đã hủy <span class="order-count" id="count-cancelled">0</span>
        </button>
        <button class="order-tab order-tab-refund" data-order-status="return_process" onclick="switchOrderStatusTab('return_process')">
          <i class="fas fa-undo"></i> Trả hàng / Hoàn tiền <span class="order-count" id="count-return_process">0</span>
        </button>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <input type="text" id="orderSearchInput" placeholder="Tìm mã đơn, tên khách, số điện thoại..." />
        </div>
        <div class="filter-select">
          <select id="orderPaymentMethodFilter">
            <option value="">Tất cả PTTT</option>
            <option value="cod">Thanh toán khi nhận (COD)</option>
            <option value="transfer">Chuyển khoản Ngân hàng</option>
            <option value="momo">Ví MoMo</option>
            <option value="cash">Tiền mặt tại quầy</option>
          </select>
        </div>
        <button class="btn btn-secondary" onclick="loadOrders()"><i class="fas fa-search"></i> Tra cứu</button>
      </div>

      <div class="table-container" id="orderTableContainer">
        <table id="orderTable">
          <thead>
            <tr>
              <th style="min-width: 170px;">Mã đơn</th>
              <th style="text-align: center; min-width: 110px;">Kênh bán</th>
              <th style="min-width: 240px;">Khách hàng</th>
              <th style="min-width: 130px;">Tổng tiền</th>
              <th style="min-width: 140px;">Thanh toán</th>
              <th style="min-width: 150px;">Trạng thái đơn</th>
              <th style="min-width: 160px;">Tiến trình Trả hàng</th>
              <th style="min-width: 160px;">Ngày tạo</th>
              <th style="text-align: right; min-width: 180px;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="orderTableBody">
            <tr><td colspan="9" class="empty-cell">Đang tải danh sách đơn mua...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="order-table-footer" id="orderTableFooter">
        <span id="orderCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-receipt" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải danh sách đơn mua...</span>
        <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài &bull; Cuộn ngang xem chi tiết</span>
      </div>
    </section>

    <!-- PANEL: MÃ GIẢM GIÁ (COUPONS) -->
    <section class="tab-panel" id="tab-coupons">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Quản lý Mã Giảm Giá & Voucher</h2>
          <p class="panel-subtitle">Thiết lập chính sách chiết khấu, quản lý số lượt áp dụng khả dụng và theo dõi hiệu quả khuyến mãi</p>
        </div>
        <button class="btn btn-primary" onclick="openCouponModal()"><i class="fas fa-plus"></i> Tạo mã giảm giá mới</button>
      </div>

      <!-- KPI STATS CARDS -->
      <div class="kpi-grid">
        <div class="kpi-card" style="border-top:3px solid var(--navy-900);">
          <div class="kpi-top">
            <span class="kpi-icon i-navy">
              <i class="fas fa-ticket-alt"></i>
            </span>
            <span class="badge" style="background:var(--navy-100); color:var(--navy-800); font-weight:600;">Hệ thống</span>
          </div>
          <div>
            <div class="kpi-label">Tổng số mã ưu đãi</div>
            <div class="kpi-value" id="couponKpiTotal">0</div>
          </div>
          <div class="kpi-sub">
            <i class="fas fa-layer-group" style="color:var(--muted); font-size:11px;"></i>
            <span>Chương trình khuyến mãi</span>
          </div>
        </div>

        <div class="kpi-card" style="border-top:3px solid var(--emerald);">
          <div class="kpi-top">
            <span class="kpi-icon i-success">
              <i class="fas fa-check-circle"></i>
            </span>
            <span class="badge badge-success">Sẵn sàng</span>
          </div>
          <div>
            <div class="kpi-label">Đang có hiệu lực</div>
            <div class="kpi-value" id="couponKpiActive" style="color:var(--emerald);">0</div>
          </div>
          <div class="kpi-sub">
            <i class="fas fa-bolt" style="color:var(--emerald); font-size:11px;"></i>
            <span style="color:var(--emerald); font-weight:500;">Có thể áp dụng ngay</span>
          </div>
        </div>

        <div class="kpi-card" style="border-top:3px solid var(--gold);">
          <div class="kpi-top">
            <span class="kpi-icon i-gold">
              <i class="fas fa-fire"></i>
            </span>
            <span class="badge" style="background:var(--gold-100); color:var(--gold-dark); font-weight:600;">Kích cầu</span>
          </div>
          <div>
            <div class="kpi-label">Tổng lượt đã dùng</div>
            <div class="kpi-value" id="couponKpiUsed" style="color:var(--gold-dark);">0</div>
          </div>
          <div class="kpi-sub">
            <i class="fas fa-shopping-bag" style="color:var(--gold-dark); font-size:11px;"></i>
            <span style="color:var(--gold-dark); font-weight:500;">Khách hưởng ưu đãi</span>
          </div>
        </div>

        <div class="kpi-card" style="border-top:3px solid var(--danger);">
          <div class="kpi-top">
            <span class="kpi-icon i-danger">
              <i class="fas fa-ban"></i>
            </span>
            <span class="badge" style="background:var(--danger-100); color:var(--danger); font-weight:600;">Cần chú ý</span>
          </div>
          <div>
            <div class="kpi-label">Hết hạn / Hết lượt</div>
            <div class="kpi-value" id="couponKpiExpired" style="color:var(--danger);">0</div>
          </div>
          <div class="kpi-sub">
            <i class="fas fa-redo-alt" style="color:var(--muted); font-size:10px;"></i>
            <span>Cần gia hạn / bổ sung</span>
          </div>
        </div>
      </div>

      <!-- FILTER BAR -->
      <div class="filter-bar">
        <div class="search-box">
          <input type="text" id="couponSearchInput" placeholder="Tìm mã voucher, tên chương trình..." oninput="debounceCoupons()" />
        </div>
        <div class="filter-select">
          <select id="couponStatusFilter" onchange="loadCoupons()">
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đang tạm dừng</option>
            <option value="out_of_uses">Hết lượt dùng</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>
        <div class="filter-select">
          <select id="couponTypeFilter" onchange="loadCoupons()">
            <option value="all">Tất cả loại giảm</option>
            <option value="percent">Giảm theo %</option>
            <option value="fixed">Giảm số tiền cố định</option>
          </select>
        </div>
        <button class="btn btn-secondary" onclick="loadCoupons()"><i class="fas fa-sync-alt"></i> Tải lại</button>
      </div>

      <!-- DATA TABLE -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Mã Voucher</th>
              <th>Tên Chương Trình</th>
              <th>Mức Giảm</th>
              <th>Đơn Tối Thiểu</th>
              <th style="min-width:140px;">Tiến Độ Sử Dụng</th>
              <th>Thời Gian Áp Dụng</th>
              <th style="text-align:center;">Trạng Thái</th>
              <th style="text-align:right;">Thao Tác</th>
            </tr>
          </thead>
          <tbody id="couponTableBody">
            <tr><td colspan="8" class="empty-cell">Đang tải danh sách mã giảm giá...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
`;
