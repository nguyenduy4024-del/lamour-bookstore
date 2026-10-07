module.exports = `
    <!-- ========================================== -->
    <!-- NHÓM 4: QUẢN LÝ KHO & LOGISTICS -->
    <!-- ========================================== -->

    <!-- PANEL: TRA CỨU TỒN KHO & VỊ TRÍ KỆ -->
    <section class="tab-panel" id="tab-inventory-lookup">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Tra cứu Tồn kho & Vị trí Kệ</h2>
          <p class="panel-subtitle">Theo dõi số lượng tồn thực tế, cảnh báo ngưỡng an toàn và sơ đồ định vị kệ sách</p>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom: 20px;">
        <div class="stat-card">
          <div class="stat-icon icon-blue"><i class="fas fa-boxes"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">Tổng đầu sách đang lưu kho</h4>
            <div class="stat-value" id="invTotalTitles">0</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-emerald"><i class="fas fa-layer-group"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">Tổng số bản in tồn kho</h4>
            <div class="stat-value" id="invTotalUnits">0</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-amber"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">Sách sắp hết (≤ 5 cuốn)</h4>
            <div class="stat-value" id="invLowStock">0</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-red"><i class="fas fa-times-circle"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">Đã hết hàng (0 cuốn)</h4>
            <div class="stat-value" id="invOutOfStock">0</div>
          </div>
        </div>
      </div>

      <!-- SUB-NAVIGATION: BẢNG TỒN KHO VS BẢN ĐỒ KỆ SÁCH TRỰC QUAN -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px; border-bottom:1.5px solid var(--line); padding-bottom:12px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button type="button" class="btn btn-primary" id="btnViewInvTable" onclick="switchInvViewMode('table')">
            <i class="fas fa-list"></i> Danh sách Tồn kho
          </button>
          <button type="button" class="btn btn-secondary" id="btnViewInvShelves" onclick="switchInvViewMode('shelves')">
            <i class="fas fa-th-large"></i> Bản đồ Kệ sách Trực quan
          </button>
          <button type="button" class="btn btn-secondary" id="btnViewInvLogs" onclick="switchInvViewMode('logs')">
            <i class="fas fa-history"></i> Lịch sử Hoạt động & Luân chuyển Kệ
            <span id="adminShelfLogsBadge" class="badge" style="display:none; margin-left:6px; background:var(--gold); color:var(--navy-900); font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px;">0</span>
          </button>
          <button type="button" class="btn btn-secondary" id="btnViewInvHideRequests" onclick="switchInvViewMode('hide-requests')">
            <i class="fas fa-eye-slash"></i> Yêu cầu Ẩn Sách từ Kho
            <span id="adminHideRequestsBadge" class="badge" style="display:none; margin-left:6px; background:#EF4444; color:#fff; font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px;">0</span>
          </button>
          <button type="button" class="btn btn-secondary" id="btnViewInvShelfRequests" onclick="switchInvViewMode('shelf-requests')">
            <i class="fas fa-clipboard-check"></i> Yêu cầu Thêm Kệ từ Kho
            <span id="adminShelfRequestsBadge" class="badge" style="display:none; margin-left:6px; background:#EF4444; color:#fff; font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px;">0</span>
          </button>
          <button type="button" class="btn btn-secondary" id="btnViewInvMaintenanceRequests" onclick="switchInvViewMode('shelf-maintenance')">
            <i class="fas fa-wrench"></i> Yêu cầu Bảo Trì Kệ
            <span id="adminMaintenanceRequestsBadge" class="badge" style="display:none; margin-left:6px; background:#F59E0B; color:#fff; font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px;">0</span>
          </button>
          <button type="button" class="btn btn-secondary" id="btnViewInvTransferRequests" onclick="switchInvViewMode('shelf-transfer')">
            <i class="fas fa-truck-loading"></i> Yêu cầu Điều Chuyển Sách
            <span id="adminTransferRequestsBadge" class="badge" style="display:none; margin-left:6px; background:#8B5CF6; color:#fff; font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px;">0</span>
          </button>
        </div>
        <div id="invShelfActionBtns" style="display:none; gap:8px; align-items:center;">
          <button type="button" class="btn btn-primary" onclick="openAdminShelfModal()"><i class="fas fa-plus"></i> Thêm Kệ Mới</button>
          <button type="button" class="btn btn-secondary" onclick="openAdminShelfTransferModal()"><i class="fas fa-exchange-alt"></i> Điều chuyển sách</button>
          <button type="button" class="btn btn-secondary" onclick="loadAdminShelvesGrid()"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
      </div>

      <!-- VIEW 1: BẢNG DANH SÁCH TỒN KHO -->
      <div id="invTableViewContainer">
        <div class="filter-bar" style="display:flex; gap:10px; align-items:center; margin-bottom:16px; width:100%;">
          <div class="search-box" style="flex:1; min-width:240px;">
            <input type="text" id="invSearchInput" placeholder="Tìm kiếm sách, vị trí kệ..." style="width:100%; height:40px; border:1.5px solid #CBD5E1; border-radius:8px; padding:0 14px; font-size:13px; box-sizing:border-box; background:#fff; outline:none;" onkeydown="if(event.key==='Enter') loadInventoryLookup()" />
          </div>
          <div class="filter-select" style="flex:0 0 240px; width:240px;">
            <select id="invShelfFilter" style="width:100%;" onchange="loadInventoryLookup()">
              <option value="">Tất cả vị trí kệ</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="loadInventoryLookup()" style="height:40px; padding:0 18px; display:inline-flex; align-items:center; gap:6px; font-weight:600;"><i class="fas fa-search"></i> Tra cứu kho</button>
        </div>

        <div class="table-container" id="inventoryLookupTableContainer">
          <table id="inventoryLookupTable">
            <thead>
              <tr>
                <th style="width:65px; min-width:65px; text-align:center;">Bìa sách</th>
                <th style="min-width:250px;">Tên sách</th>
                <th style="min-width:150px;">Mã ISBN</th>
                <th style="min-width:170px;">Vị trí kệ</th>
                <th style="min-width:110px;">Tồn kho</th>
                <th style="min-width:120px;">Giá bán</th>
                <th style="min-width:120px;">Giá vốn</th>
                <th style="min-width:130px;">Tình trạng cảnh báo</th>
                <th style="min-width:140px; text-align: right;">Thao tác nhanh</th>
              </tr>
            </thead>
            <tbody id="inventoryLookupTableBody">
              <tr><td colspan="9" class="empty-cell">Đang tải dữ liệu tồn kho...</td></tr>
            </tbody>
          </table>
        </div>

        <div class="inventory-table-footer" id="inventoryTableFooter">
          <span id="invCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-boxes" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải dữ liệu tồn kho...</span>
          <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài &bull; Cuộn ngang xem chi tiết</span>
        </div>
      </div>

      <!-- VIEW 2: BẢN ĐỒ KỆ SÁCH TRỰC QUAN (SHELF VISUAL GRID) -->
      <div id="invShelvesViewContainer" style="display:none;">
        <!-- Banner thông báo yêu cầu thêm kệ đang chờ duyệt -->
        <div id="adminPendingShelvesBanner" style="display:none; background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:12px 18px; margin-bottom:16px; align-items:center; justify-content:space-between; gap:12px;">
          <div style="display:flex; align-items:center; gap:10px; color:#B45309; font-size:13px; font-weight:600;">
            <i class="fas fa-bell fa-bounce" style="font-size:16px;"></i>
            <span>Đang có <b id="adminPendingShelvesCount">0</b> yêu cầu thêm kệ sách mới từ nhân viên kho chờ bạn phê duyệt!</span>
          </div>
          <button type="button" class="btn btn-sm btn-primary" onclick="switchInvViewMode('shelf-requests')"><i class="fas fa-arrow-right"></i> Xem & Duyệt Ngay</button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; background:#F8FAFC; padding:12px 16px; border-radius:10px; border:1px solid var(--line);">
          <div style="display:flex; gap:6px; flex-wrap:wrap;" id="adminShelfZoneTabs">
            <button type="button" class="btn btn-sm btn-primary admin-zone-tab" data-zone="all" onclick="filterAdminShelfZone('all', this)">Tất cả các khu (<span id="countZoneAll">13</span>)</button>
            <button type="button" class="btn btn-sm btn-secondary admin-zone-tab" data-zone="Khu A" onclick="filterAdminShelfZone('Khu A', this)">Khu A (Văn học)</button>
            <button type="button" class="btn btn-sm btn-secondary admin-zone-tab" data-zone="Khu B" onclick="filterAdminShelfZone('Khu B', this)">Khu B (Kinh tế & Kỹ năng)</button>
            <button type="button" class="btn btn-sm btn-secondary admin-zone-tab" data-zone="Khu C" onclick="filterAdminShelfZone('Khu C', this)">Khu C (Khoa học & Lịch sử)</button>
            <button type="button" class="btn btn-sm btn-secondary admin-zone-tab" data-zone="Khu D" onclick="filterAdminShelfZone('Khu D', this)">Khu D (Thiếu nhi & Manga)</button>
            <button type="button" class="btn btn-sm btn-secondary admin-zone-tab" data-zone="Khu Dự Phòng" onclick="filterAdminShelfZone('Khu Dự Phòng', this)"><i class="fas fa-shield-alt"></i> Khu Dự Phòng</button>
          </div>
        </div>

        <div id="adminShelvesGridContainer" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:18px;">
          <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--muted);"><i class="fas fa-spinner fa-spin"></i> Đang tải sơ đồ kệ sách...</div>
        </div>
      </div>

      <!-- VIEW 3: LỊCH SỬ HOẠT ĐỘNG & LUÂN CHUYỂN KỆ SÁCH -->
      <div id="invLogsViewContainer" style="display:none;">
        <!-- Thanh lọc: Thiết kế chuẩn 2 hàng đầy đủ 100% -->
        <div style="background:#F8FAFC; padding:14px 16px; border-radius:10px; border:1px solid var(--line); margin-bottom:16px; display:flex; flex-direction:column; gap:12px;">
          <!-- Hàng 1: Tìm kiếm & 2 bộ lọc dropdown (100% full width) -->
          <div style="display:flex; gap:10px; align-items:center; width:100%;">
            <div class="search-box" style="flex:1; min-width:220px;">
              <input type="text" id="invLogsSearchInput" placeholder="Tìm theo tên sách, mã kệ, người thực hiện..." onkeydown="if(event.key==='Enter') loadShelfActivityLogs(1)" style="width:100%; height:40px; border:1.5px solid #CBD5E1; border-radius:8px; padding:0 14px; font-size:13px; box-sizing:border-box; background:#fff; outline:none;" />
            </div>
            <div class="filter-select" style="flex:0 0 240px; width:240px;">
              <select id="invLogsActionFilter" style="width:100%;" onchange="loadShelfActivityLogs(1)">
                <option value="all">Tất cả loại hoạt động</option>
                <option value="BOOK_CREATE">📥 Thêm sách vào kệ</option>
                <option value="BOOK_UPDATE_SHELF">🔄 Chuyển kệ (sửa sách)</option>
                <option value="SHELF_TRANSFER">↔️ Điều chuyển sách</option>
                <option value="SHELF_MAINTENANCE_START">🛠️ Bảo trì kệ sách</option>
                <option value="SHELF_MAINTENANCE_END">✅ Mở lại kệ sách</option>
                <option value="SHELF_CREATE">➕ Tạo kệ mới</option>
                <option value="SHELF_UPDATE">✏️ Cập nhật thông tin kệ</option>
                <option value="STOCK_IMPORT">📦 Nhập sách vào kệ</option>
              </select>
            </div>
            <div class="filter-select" style="flex:0 0 180px; width:180px;">
              <select id="invLogsShelfFilter" style="width:100%;" onchange="loadShelfActivityLogs(1)">
                <option value="all">Tất cả kệ sách</option>
              </select>
            </div>
          </div>

          <!-- Hàng 2: Khoảng thời gian bên trái + Nút thao tác bên phải (100% full width) -->
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:12px; flex-wrap:wrap;">
            <div style="display:inline-flex; align-items:center; gap:8px;">
              <span style="font-size:13px; color:var(--muted); font-weight:600;"><i class="fa-regular fa-calendar-days" style="margin-right:4px;"></i>Khoảng thời gian:</span>
              <span style="font-size:12.5px; color:var(--muted); font-weight:500;">Từ</span>
              <input type="date" id="invLogsStartDate" style="height:40px; padding:0 10px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:13px; background:#fff; color:#0F172A; outline:none;" onchange="loadShelfActivityLogs(1)" />
              <span style="font-size:12.5px; color:var(--muted); font-weight:500;">đến</span>
              <input type="date" id="invLogsEndDate" style="height:40px; padding:0 10px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:13px; background:#fff; color:#0F172A; outline:none;" onchange="loadShelfActivityLogs(1)" />
            </div>
            <div style="display:inline-flex; gap:8px; align-items:center;">
              <button type="button" class="btn btn-primary" onclick="loadShelfActivityLogs(1)" style="height:40px; padding:0 18px; display:inline-flex; align-items:center; gap:6px; font-weight:600;">
                <i class="fas fa-search"></i> Lọc dữ liệu
              </button>
              <button type="button" class="btn btn-secondary" onclick="clearInvLogsFilters()" style="height:40px; padding:0 16px; display:inline-flex; align-items:center; gap:6px;" title="Xoá bộ lọc">
                <i class="fas fa-rotate-left"></i> Xoá lọc
              </button>
            </div>
          </div>
        </div>

        <!-- Bảng nhật ký -->
        <div class="table-container" style="overflow-x:auto; width:100%; border:1px solid var(--line, #E2E8F0); border-radius:10px; background:#fff;">
          <table id="invLogsTable" style="width:100%; min-width:1150px; border-collapse:collapse; white-space:nowrap;">
            <thead>
              <tr style="background:#F8FAFC; border-bottom:1.5px solid var(--line, #E2E8F0);">
                <th style="white-space:nowrap; width:140px; padding:12px 14px; font-weight:700; font-size:12px; text-transform:uppercase; color:#475569;">Thời gian</th>
                <th style="white-space:nowrap; width:170px; padding:12px 14px; font-weight:700; font-size:12px; text-transform:uppercase; color:#475569;">Người thực hiện</th>
                <th style="white-space:nowrap; width:180px; padding:12px 14px; font-weight:700; font-size:12px; text-transform:uppercase; color:#475569;">Loại hoạt động</th>
                <th style="white-space:nowrap; width:160px; padding:12px 14px; font-weight:700; font-size:12px; text-transform:uppercase; color:#475569;">Kệ liên quan</th>
                <th style="white-space:nowrap; width:260px; padding:12px 14px; font-weight:700; font-size:12px; text-transform:uppercase; color:#475569;">Sách / Số lượng</th>
                <th style="white-space:nowrap; min-width:260px; padding:12px 14px; font-weight:700; font-size:12px; text-transform:uppercase; color:#475569;">Mô tả chi tiết</th>
                <th style="white-space:nowrap; width:120px; padding:12px 14px; font-weight:700; font-size:12px; text-transform:uppercase; color:#475569; text-align:center;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="invLogsTableBody">
              <tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);"><i class="fas fa-spinner fa-spin"></i> Đang tải lịch sử...</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Phân trang -->
        <div id="invLogsPagination" style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding:12px 0; border-top:1px solid var(--line);">
          <span id="invLogsTotalInfo" style="font-size:13px; color:var(--muted);">Đang tải...</span>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-sm btn-secondary" id="invLogsPrevBtn" onclick="shelfLogsGoPage(-1)" disabled><i class="fas fa-chevron-left"></i> Trang trước</button>
            <span id="invLogsPageInfo" style="font-size:13px; padding:6px 12px; background:#F8FAFC; border-radius:6px; border:1px solid var(--line); font-weight:600;">1 / 1</span>
            <button type="button" class="btn btn-sm btn-secondary" id="invLogsNextBtn" onclick="shelfLogsGoPage(1)" disabled>Trang sau <i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
      </div>

      <!-- VIEW 4: YÊU CẦU ẨN SÁCH TỪ NHÂN VIÊN KHO -->
      <div id="invHideRequestsViewContainer" style="display:none;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:18px;">
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-hourglass-half"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#92400E; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Chờ Admin Duyệt</div>
              <div style="font-size:22px; font-weight:800; color:#B45309;" id="adminCountHidePending">0</div>
            </div>
          </div>
          <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#DCFCE7; color:#16A34A; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-check-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#166534; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Phê Duyệt</div>
              <div style="font-size:22px; font-weight:800; color:#15803D;" id="adminCountHideApproved">0</div>
            </div>
          </div>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-times-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#991B1B; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Từ Chối</div>
              <div style="font-size:22px; font-weight:800; color:#B91C1C;" id="adminCountHideRejected">0</div>
            </div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#E2E8F0; color:#475569; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-inbox"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Tổng Số Yêu Cầu</div>
              <div style="font-size:22px; font-weight:800; color:#1E293B;" id="adminCountHideTotal">0</div>
            </div>
          </div>
        </div>

        <!-- Filter & Search bar -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" class="btn btn-sm btn-primary admin-hide-tab-btn" id="adminHideTabPending" onclick="filterAdminHideTab('pending')">
                <i class="fas fa-hourglass-half"></i> Chờ duyệt (<span id="adminTabCountPending">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-hide-tab-btn" id="adminHideTabApproved" onclick="filterAdminHideTab('approved')">
                <i class="fas fa-check"></i> Đã duyệt (<span id="adminTabCountApproved">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-hide-tab-btn" id="adminHideTabRejected" onclick="filterAdminHideTab('rejected')">
                <i class="fas fa-ban"></i> Đã từ chối (<span id="adminTabCountRejected">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-hide-tab-btn" id="adminHideTabAll" onclick="filterAdminHideTab('all')">
                Tất cả (<span id="adminTabCountAll">0</span>)
              </button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex:1; max-width:400px; min-width:260px;">
              <div style="position:relative; width:100%;">
                <input type="text" id="adminHideSearchInput" placeholder="Tìm mã yêu cầu, tên sách, người gửi..." onkeyup="if(event.key==='Enter') loadAdminHideRequests()" style="width:100%; height:38px; border:1.5px solid #CBD5E1; border-radius:8px; padding:0 34px 0 12px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;" />
                <i class="fas fa-search" style="position:absolute; right:12px; top:12px; color:#94A3B8; font-size:13px;"></i>
              </div>
              <button type="button" class="btn btn-secondary" onclick="loadAdminHideRequests()" style="height:38px; padding:0 14px;" title="Làm mới">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="table-responsive" style="border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <table class="table" style="width:100%; border-collapse:collapse; margin-bottom:0;">
            <thead style="background:#F8FAFC; border-bottom:1.5px solid var(--line);">
              <tr>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Mã Yêu Cầu</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Thông Tin Sách</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Người Gửi & Lý Do</th>
                <th style="padding:12px 14px; text-align:center; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Trạng Thái</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Phản Hồi Admin</th>
                <th style="padding:12px 14px; text-align:right; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="adminHideRequestsTableBody">
              <tr><td colspan="6" style="text-align:center; padding:40px; color:var(--muted);"><i class="fas fa-spinner fa-spin"></i> Đang tải yêu cầu ẩn sách...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VIEW 5: YÊU CẦU THÊM KỆ SÁCH TỪ KHO (ADMIN APPROVAL) -->
      <div id="invShelfRequestsViewContainer" style="display:none;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:18px;">
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-hourglass-half"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#92400E; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Chờ Duyệt Tạo Kệ</div>
              <div style="font-size:22px; font-weight:800; color:#B45309;" id="adminCountShelfReqPending">0</div>
            </div>
          </div>
          <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#DCFCE7; color:#16A34A; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-check-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#166534; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Phê Duyệt</div>
              <div style="font-size:22px; font-weight:800; color:#15803D;" id="adminCountShelfReqApproved">0</div>
            </div>
          </div>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-times-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#991B1B; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Từ Chối</div>
              <div style="font-size:22px; font-weight:800; color:#B91C1C;" id="adminCountShelfReqRejected">0</div>
            </div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#E2E8F0; color:#475569; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-layer-group"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Tổng Số Yêu Cầu</div>
              <div style="font-size:22px; font-weight:800; color:#1E293B;" id="adminCountShelfReqTotal">0</div>
            </div>
          </div>
        </div>

        <!-- Filter & Search bar -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" class="btn btn-sm btn-primary admin-shelf-req-tab-btn" id="adminShelfReqTabPending" onclick="filterAdminShelfReqTab('pending')">
                <i class="fas fa-hourglass-half"></i> Chờ duyệt (<span id="adminTabCountShelfReqPending">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-shelf-req-tab-btn" id="adminShelfReqTabApproved" onclick="filterAdminShelfReqTab('approved')">
                <i class="fas fa-check"></i> Đã duyệt (<span id="adminTabCountShelfReqApproved">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-shelf-req-tab-btn" id="adminShelfReqTabRejected" onclick="filterAdminShelfReqTab('rejected')">
                <i class="fas fa-ban"></i> Đã từ chối (<span id="adminTabCountShelfReqRejected">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-shelf-req-tab-btn" id="adminShelfReqTabAll" onclick="filterAdminShelfReqTab('all')">
                Tất cả (<span id="adminTabCountShelfReqAll">0</span>)
              </button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex:1; max-width:400px; min-width:260px;">
              <div style="position:relative; width:100%;">
                <input type="text" id="adminShelfReqSearchInput" placeholder="Tìm mã yêu cầu, mã kệ, tên kệ, người gửi..." onkeyup="if(event.key==='Enter') loadAdminShelfRequests()" style="width:100%; height:38px; border:1.5px solid #CBD5E1; border-radius:8px; padding:0 34px 0 12px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;" />
                <i class="fas fa-search" style="position:absolute; right:12px; top:12px; color:#94A3B8; font-size:13px;"></i>
              </div>
              <button type="button" class="btn btn-secondary" onclick="loadAdminShelfRequests()" style="height:38px; padding:0 14px;" title="Làm mới">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="table-responsive" style="border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <table class="table" style="width:100%; border-collapse:collapse; margin-bottom:0;">
            <thead style="background:#F8FAFC; border-bottom:1.5px solid var(--line);">
              <tr>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Mã Yêu Cầu</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Thông Tin Kệ Đề Xuất</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Khu Vực & Sức Chứa</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Người Gửi & Lý Do</th>
                <th style="padding:12px 14px; text-align:center; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Trạng Thái</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Phản Hồi Admin</th>
                <th style="padding:12px 14px; text-align:right; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="adminShelfRequestsTableBody">
              <tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách yêu cầu thêm kệ...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VIEW 6: YÊU CẦU BẢO TRÌ KỆ SÁCH TỪ KHO (ADMIN APPROVAL) -->
      <div id="invMaintenanceRequestsViewContainer" style="display:none;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:18px;">
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-hourglass-half"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#92400E; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Chờ Duyệt Bảo Trì</div>
              <div style="font-size:22px; font-weight:800; color:#B45309;" id="adminCountMaintReqPending">0</div>
            </div>
          </div>
          <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#DCFCE7; color:#16A34A; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-check-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#166534; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Phê Duyệt</div>
              <div style="font-size:22px; font-weight:800; color:#15803D;" id="adminCountMaintReqApproved">0</div>
            </div>
          </div>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-times-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#991B1B; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Từ Chối</div>
              <div style="font-size:22px; font-weight:800; color:#B91C1C;" id="adminCountMaintReqRejected">0</div>
            </div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#E2E8F0; color:#475569; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-layer-group"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Tổng Số Yêu Cầu</div>
              <div style="font-size:22px; font-weight:800; color:#1E293B;" id="adminCountMaintReqTotal">0</div>
            </div>
          </div>
        </div>

        <!-- Filter & Search bar -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" class="btn btn-sm btn-primary admin-maint-req-tab-btn" id="adminMaintReqTabPending" onclick="filterAdminMaintenanceReqTab('pending')">
                <i class="fas fa-hourglass-half"></i> Chờ duyệt (<span id="adminTabCountMaintReqPending">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-maint-req-tab-btn" id="adminMaintReqTabApproved" onclick="filterAdminMaintenanceReqTab('approved')">
                <i class="fas fa-check"></i> Đã duyệt (<span id="adminTabCountMaintReqApproved">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-maint-req-tab-btn" id="adminMaintReqTabRejected" onclick="filterAdminMaintenanceReqTab('rejected')">
                <i class="fas fa-ban"></i> Đã từ chối (<span id="adminTabCountMaintReqRejected">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-maint-req-tab-btn" id="adminMaintReqTabAll" onclick="filterAdminMaintenanceReqTab('all')">
                Tất cả (<span id="adminTabCountMaintReqAll">0</span>)
              </button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex:1; max-width:400px; min-width:260px;">
              <div style="position:relative; width:100%;">
                <input type="text" id="adminMaintReqSearchInput" placeholder="Tìm mã yêu cầu, mã kệ, tên kệ, người gửi..." onkeyup="if(event.key==='Enter') loadAdminMaintenanceRequests()" style="width:100%; height:38px; border:1.5px solid #CBD5E1; border-radius:8px; padding:0 34px 0 12px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;" />
                <i class="fas fa-search" style="position:absolute; right:12px; top:12px; color:#94A3B8; font-size:13px;"></i>
              </div>
              <button type="button" class="btn btn-secondary" onclick="loadAdminMaintenanceRequests()" style="height:38px; padding:0 14px;" title="Làm mới">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="table-responsive" style="border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <table class="table" style="width:100%; border-collapse:collapse; margin-bottom:0;">
            <thead style="background:#F8FAFC; border-bottom:1.5px solid var(--line);">
              <tr>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Mã Yêu Cầu</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Kệ Sách Cần Bảo Trì</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Sách Sẽ Chuyển (KE-DP)</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Người Gửi & Lý Do</th>
                <th style="padding:12px 14px; text-align:center; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Trạng Thái</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Phản Hồi Admin</th>
                <th style="padding:12px 14px; text-align:right; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="adminMaintenanceRequestsTableBody">
              <tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách yêu cầu bảo trì kệ...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VIEW 7: YÊU CẦU ĐIỀU CHUYỂN SÁCH TỪ KHO (ADMIN APPROVAL) -->
      <div id="invTransferRequestsViewContainer" style="display:none;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:18px;">
          <div style="background:#F5F3FF; border:1px solid #DDD6FE; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#EDE9FE; color:#7C3AED; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-hourglass-half"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#6D28D9; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Chờ Duyệt Điều Chuyển</div>
              <div style="font-size:22px; font-weight:800; color:#7C3AED;" id="adminCountTransferReqPending">0</div>
            </div>
          </div>
          <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#DCFCE7; color:#16A34A; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-check-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#166534; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Phê Duyệt</div>
              <div style="font-size:22px; font-weight:800; color:#15803D;" id="adminCountTransferReqApproved">0</div>
            </div>
          </div>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-times-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#991B1B; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Từ Chối</div>
              <div style="font-size:22px; font-weight:800; color:#B91C1C;" id="adminCountTransferReqRejected">0</div>
            </div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#E2E8F0; color:#475569; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-layer-group"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Tổng Số Yêu Cầu</div>
              <div style="font-size:22px; font-weight:800; color:#1E293B;" id="adminCountTransferReqTotal">0</div>
            </div>
          </div>
        </div>

        <!-- Filter & Search bar -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" class="btn btn-sm btn-primary admin-transfer-req-tab-btn" id="adminTransferReqTabPending" onclick="filterAdminTransferReqTab('pending')">
                <i class="fas fa-hourglass-half"></i> Chờ duyệt (<span id="adminTabCountTransferReqPending">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-transfer-req-tab-btn" id="adminTransferReqTabApproved" onclick="filterAdminTransferReqTab('approved')">
                <i class="fas fa-check"></i> Đã duyệt (<span id="adminTabCountTransferReqApproved">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-transfer-req-tab-btn" id="adminTransferReqTabRejected" onclick="filterAdminTransferReqTab('rejected')">
                <i class="fas fa-ban"></i> Đã từ chối (<span id="adminTabCountTransferReqRejected">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-transfer-req-tab-btn" id="adminTransferReqTabAll" onclick="filterAdminTransferReqTab('all')">
                Tất cả (<span id="adminTabCountTransferReqAll">0</span>)
              </button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex:1; max-width:400px; min-width:260px;">
              <div style="position:relative; width:100%;">
                <input type="text" id="adminTransferReqSearchInput" placeholder="Tìm mã yêu cầu, tên sách, mã kệ, người gửi..." onkeyup="if(event.key==='Enter') loadAdminTransferRequests()" style="width:100%; height:38px; border:1.5px solid #CBD5E1; border-radius:8px; padding:0 34px 0 12px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;" />
                <i class="fas fa-search" style="position:absolute; right:12px; top:12px; color:#94A3B8; font-size:13px;"></i>
              </div>
              <button type="button" class="btn btn-secondary" onclick="loadAdminTransferRequests()" style="height:38px; padding:0 14px;" title="Làm mới">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="table-responsive" style="border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <table class="table" style="width:100%; border-collapse:collapse; margin-bottom:0;">
            <thead style="background:#F8FAFC; border-bottom:1.5px solid var(--line);">
              <tr>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Mã Yêu Cầu</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Sách Điều Chuyển</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Kệ Nguồn ➜ Kệ Đích</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Người Gửi & Lý Do</th>
                <th style="padding:12px 14px; text-align:center; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Trạng Thái</th>
                <th style="padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Phản Hồi Admin</th>
                <th style="padding:12px 14px; text-align:right; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="adminTransferRequestsTableBody">
              <tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách yêu cầu điều chuyển sách...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>

    <!-- PANEL: NHẬP SÁCH NCC -->
    <section class="tab-panel" id="tab-import-receipts">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Phiếu Nhập Sách (Nhà Cung Cấp)</h2>
          <p class="panel-subtitle">Quản lý và phê duyệt các đợt nhập hàng từ nhà xuất bản / nhà cung cấp</p>
        </div>
      </div>

      <div class="filter-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:10px; align-items:center; flex:1; min-width:260px;">
          <div class="search-box" style="flex:1;">
            <input type="text" id="importReceiptSearchInput" placeholder="Tìm theo mã phiếu, NCC..." onkeydown="if(event.key==='Enter') loadImportReceipts()" />
          </div>
          <button class="btn btn-secondary" onclick="loadImportReceipts()"><i class="fas fa-filter"></i> Lọc</button>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;" id="adminImportStatusTabs">
          <button type="button" class="btn btn-sm btn-primary admin-imp-tab" data-status="all" onclick="filterAdminImportReceipts('all', this)">Tất cả</button>
          <button type="button" class="btn btn-sm btn-secondary admin-imp-tab" data-status="pending_approval" onclick="filterAdminImportReceipts('pending_approval', this)">⏳ Chờ duyệt <span id="adminPendingImportBadge" class="badge b-danger" style="display:none; margin-left:4px;">0</span></button>
          <button type="button" class="btn btn-sm btn-secondary admin-imp-tab" data-status="approved" onclick="filterAdminImportReceipts('approved', this)">✓ Đã duyệt</button>
          <button type="button" class="btn btn-sm btn-secondary admin-imp-tab" data-status="completed" onclick="filterAdminImportReceipts('completed', this)">✓✓ Đã hoàn tất</button>
          <button type="button" class="btn btn-sm btn-secondary admin-imp-tab" data-status="rejected" onclick="filterAdminImportReceipts('rejected', this)">✕ Bị từ chối</button>
        </div>
      </div>

      <div class="table-container" id="importReceiptTableContainer">
        <table id="importReceiptTable">
          <thead>
            <tr>
              <th style="min-width: 150px;">Mã phiếu</th>
              <th style="min-width: 250px;">Nhà cung cấp</th>
              <th style="min-width: 140px;">Số lượng nhập</th>
              <th style="min-width: 140px;">Tổng tiền hàng</th>
              <th style="min-width: 170px;">Người lập phiếu</th>
              <th style="min-width: 160px;">Ngày lập</th>
              <th style="min-width: 160px;">Trạng thái</th>
              <th style="text-align: right; min-width: 130px;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="importReceiptTableBody">
            <tr><td colspan="8" class="empty-cell">Đang tải danh sách phiếu nhập...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="import-receipt-table-footer" id="importReceiptTableFooter">
        <span id="importReceiptCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-file-import" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải danh sách phiếu nhập...</span>
        <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài &bull; Cuộn ngang xem chi tiết</span>
      </div>
    </section>

    <!-- PANEL: XUẤT SÁCH -->
    <section class="tab-panel" id="tab-export-receipts">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Phiếu Xuất Sách & Xuất Hủy</h2>
          <p class="panel-subtitle">Quản lý và phê duyệt phiếu xuất kho bán sỉ, chuyển kho hoặc xuất hủy sách lỗi hỏng</p>
        </div>
      </div>

      <div class="filter-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:10px; align-items:center; flex:1; min-width:260px;">
          <div class="search-box" style="flex:1;">
            <input type="text" id="exportReceiptSearchInput" placeholder="Tìm kiếm phiếu xuất..." onkeydown="if(event.key==='Enter') loadExportReceipts()" />
          </div>
          <button class="btn btn-secondary" onclick="loadExportReceipts()"><i class="fas fa-filter"></i> Lọc</button>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;" id="adminExportStatusTabs">
          <button type="button" class="btn btn-sm btn-primary admin-exp-tab" data-status="all" onclick="filterAdminExportReceipts('all', this)">Tất cả</button>
          <button type="button" class="btn btn-sm btn-secondary admin-exp-tab" data-status="pending_approval" onclick="filterAdminExportReceipts('pending_approval', this)">⏳ Chờ duyệt <span id="adminPendingExportBadge" class="badge b-danger" style="display:none; margin-left:4px;">0</span></button>
          <button type="button" class="btn btn-sm btn-secondary admin-exp-tab" data-status="approved" onclick="filterAdminExportReceipts('approved', this)">✓ Đã duyệt</button>
          <button type="button" class="btn btn-sm btn-secondary admin-exp-tab" data-status="completed" onclick="filterAdminExportReceipts('completed', this)">✓✓ Đã xuất kho</button>
          <button type="button" class="btn btn-sm btn-secondary admin-exp-tab" data-status="rejected" onclick="filterAdminExportReceipts('rejected', this)">✕ Bị từ chối</button>
        </div>
      </div>

      <div class="table-container" id="exportReceiptTableContainer">
        <table id="exportReceiptTable">
          <thead>
            <tr>
              <th style="min-width: 150px;">Mã phiếu</th>
              <th style="min-width: 160px;">Loại xuất kho</th>
              <th style="min-width: 240px;">Người nhận / Lý do</th>
              <th style="min-width: 130px;">Tổng số lượng</th>
              <th style="min-width: 160px;">Người lập phiếu</th>
              <th style="min-width: 160px;">Ngày xuất</th>
              <th style="min-width: 160px;">Trạng thái</th>
              <th style="text-align: right; min-width: 130px;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="exportReceiptTableBody">
            <tr><td colspan="8" class="empty-cell">Đang tải danh sách phiếu xuất...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="export-receipt-table-footer" id="exportReceiptTableFooter">
        <span id="exportReceiptCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-file-export" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải danh sách phiếu xuất...</span>
        <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài &bull; Cuộn ngang xem chi tiết</span>
      </div>
    </section>

    <!-- PANEL: KIỂM KÊ KHO -->
    <section class="tab-panel" id="tab-stock-audit">
      <div class="panel-header">
        <div>
          <span class="eyebrow">Kho Vận & Điều Chỉnh Tồn</span>
          <h2 class="panel-title">Kiểm Kê & Phê Duyệt Cân Bằng Kho</h2>
          <p class="panel-subtitle">Thẩm định biên bản kiểm đếm từ Thủ kho, duyệt điều chỉnh số lượng thực tế và ghi nhận hao hụt vào sổ quỹ</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn btn-secondary" onclick="loadStockAudit()"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
      </div>

      <!-- 4 THẺ KPI KIỂM KÊ -->
      <div class="kpi-grid" style="margin-bottom: 24px;">
        <div class="kpi-card" style="border-top: 3px solid var(--navy-900);">
          <div class="kpi-top">
            <span class="kpi-icon i-navy">
              <i class="fas fa-clipboard-list"></i>
            </span>
          </div>
          <div style="min-width: 0;">
            <div class="kpi-label">Tổng biên bản kiểm kê</div>
            <div class="kpi-value" id="adminAuditKpiTotal">0</div>
          </div>
          <div class="kpi-sub">Toàn bộ kỳ kiểm kê đã tạo</div>
        </div>

        <div class="kpi-card" style="border-top: 3px solid var(--danger);">
          <div class="kpi-top">
            <span class="kpi-icon i-danger">
              <i class="fas fa-exclamation-triangle"></i>
            </span>
          </div>
          <div style="min-width: 0;">
            <div class="kpi-label">Chờ Admin phê duyệt</div>
            <div class="kpi-value" id="adminAuditKpiPending" style="color:var(--danger);">0</div>
          </div>
          <div class="kpi-sub">Có chênh lệch tồn kho cần xử lý</div>
        </div>

        <div class="kpi-card" style="border-top: 3px solid var(--emerald);">
          <div class="kpi-top">
            <span class="kpi-icon i-success">
              <i class="fas fa-check-double"></i>
            </span>
          </div>
          <div style="min-width: 0;">
            <div class="kpi-label">Đã cân bằng kho</div>
            <div class="kpi-value" id="adminAuditKpiApproved" style="color:var(--emerald);">0</div>
          </div>
          <div class="kpi-sub">Đã chuẩn hóa số lượng tồn</div>
        </div>

        <div class="kpi-card" style="border-top: 3px solid var(--gold);">
          <div class="kpi-top">
            <span class="kpi-icon i-gold">
              <i class="fas fa-boxes"></i>
            </span>
          </div>
          <div style="min-width: 0;">
            <div class="kpi-label">Tổng lệch thực tế</div>
            <div class="kpi-value" id="adminAuditKpiDiff">0</div>
          </div>
          <div class="kpi-sub">Số cuốn chênh lệch lũy kế</div>
        </div>
      </div>

      <!-- THANH BỘ LỌC & TÌM KIẾM -->
      <div style="background: var(--card-bg, #fff); border: 1px solid var(--border-color, #E2E8F0); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap;" id="adminAuditStatusTabs">
          <button class="btn btn-sm btn-solid" data-status="all" onclick="filterAdminAuditByStatus('all', this)">Tất cả</button>
          <button class="btn btn-sm btn-secondary" data-status="pending_approval" onclick="filterAdminAuditByStatus('pending_approval', this)" style="display:flex; align-items:center; gap:6px;">
            <span>Chờ Admin duyệt</span>
            <span id="adminPendingAuditTabBadge" style="display:none; background:#EF4444; color:#fff; font-size:11px; font-weight:700; padding:1px 6px; border-radius:10px;">0</span>
          </button>
          <button class="btn btn-sm btn-secondary" data-status="approved" onclick="filterAdminAuditByStatus('approved', this)">Đã duyệt điều chỉnh</button>
          <button class="btn btn-sm btn-secondary" data-status="completed" onclick="filterAdminAuditByStatus('completed', this)">Khớp 100%</button>
          <button class="btn btn-sm btn-secondary" data-status="rejected" onclick="filterAdminAuditByStatus('rejected', this)">Yêu cầu kiểm lại</button>
        </div>
        <div style="position:relative; min-width:280px; flex:1; max-width:440px; display:flex; gap:6px;">
          <div style="position:relative; flex:1;">
            <i class="fas fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:13px;"></i>
            <input type="text" id="adminAuditSearchInput" class="form-control" placeholder="Tìm theo mã phiếu, ghi chú, khu vực, người lập..." style="padding-left:34px; height:36px; font-size:13px;" oninput="onAdminAuditSearchChange()" onkeydown="if(event.key==='Enter') onAdminAuditSearchChange()" />
          </div>
          <button type="button" class="btn btn-sm btn-solid" onclick="onAdminAuditSearchChange()" style="height:36px; padding:0 12px; white-space:nowrap; display:inline-flex; align-items:center; gap:6px;">
            <i class="fas fa-search"></i> Tìm kiếm
          </button>
        </div>
      </div>

      <div class="table-container" id="stockAuditTableContainer">
        <table id="stockAuditTable">
          <thead>
            <tr>
              <th style="min-width: 140px;">Mã kiểm kê</th>
              <th style="min-width: 160px;">Ngày lập</th>
              <th style="min-width: 180px;">Khu vực / Kệ sách</th>
              <th style="min-width: 160px;">Người kiểm kê</th>
              <th style="min-width: 130px; text-align: center;">Số mặt hàng</th>
              <th style="min-width: 200px;">Chênh lệch & Hỏng</th>
              <th style="min-width: 180px;">Trạng thái</th>
              <th style="text-align: right; min-width: 130px;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="stockAuditTableBody">
            <tr><td colspan="8" class="empty-cell" style="white-space: nowrap;">Đang tải danh sách phiếu kiểm kê...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="stock-audit-table-footer" id="stockAuditTableFooter">
        <span id="stockAuditCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-clipboard-check" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải danh sách phiếu kiểm kê...</span>
        <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài &bull; Cuộn ngang xem chi tiết</span>
      </div>
    </section>

    <!-- PANEL: NHÀ CUNG CẤP -->
    <section class="tab-panel" id="tab-suppliers">
      <div class="panel-header">
        <div>
          <span class="eyebrow">Hệ thống Đối Tác Cung Ứng</span>
          <h2 class="panel-title">Quản Lý Nhà Cung Cấp & Nhà Xuất Bản</h2>
          <p class="panel-subtitle">Quản lý mạng lưới NXB, đối tác phát hành, danh mục sách cung ứng và lịch sử giao dịch nhập hàng</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-secondary" onclick="loadSuppliers()"><i class="fas fa-sync-alt"></i> Làm mới</button>
          <button class="btn btn-primary" onclick="openSupplierModal()"><i class="fas fa-plus-circle"></i> Thêm đối tác mới</button>
        </div>
      </div>

      <!-- SUB-NAVIGATION: DANH SÁCH NCC VS YÊU CẦU TẠM NGƯNG TỪ KHO -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px; border-bottom:1.5px solid var(--line); padding-bottom:12px;">
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-primary" id="btnViewSupplierList" onclick="switchSupplierViewMode('list')">
            <i class="fas fa-list"></i> Danh sách Nhà cung cấp
          </button>
          <button type="button" class="btn btn-secondary" id="btnViewSupplierSuspendRequests" onclick="switchSupplierViewMode('suspend-requests')">
            <i class="fas fa-pause-circle"></i> Yêu cầu Tạm ngưng từ Kho
            <span id="adminSupplierSuspendRequestsBadge" class="badge" style="display:none; margin-left:6px; background:#EF4444; color:#fff; font-size:11px; font-weight:700; padding:2px 7px; border-radius:999px;">0</span>
          </button>
        </div>
      </div>

      <!-- VIEW 1: BẢNG DANH SÁCH NHÀ CUNG CẤP HIỆN TẠI -->
      <div id="supplierListViewContainer">
        <!-- 4 THẺ KPI NHÀ CUNG CẤP -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div class="kpi-card" style="border-top: 3px solid var(--navy-900); padding: 14px 16px; gap: 6px;">
            <div class="kpi-top">
              <span class="kpi-icon i-navy" style="width: 36px; height: 36px; font-size: 15px;">
                <i class="fas fa-handshake"></i>
              </span>
            </div>
            <div style="min-width: 0;">
              <div class="kpi-label" style="font-size: 10px;">Tổng đối tác NCC</div>
              <div class="kpi-value" id="supKpiTotal" style="font-size: 20px;">0</div>
            </div>
            <div class="kpi-sub" style="font-size: 11px;">Các đơn vị phát hành & NXB</div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid var(--gold); padding: 14px 16px; gap: 6px;">
            <div class="kpi-top">
              <span class="kpi-icon i-gold" style="width: 36px; height: 36px; font-size: 15px;">
                <i class="fas fa-book"></i>
              </span>
            </div>
            <div style="min-width: 0;">
              <div class="kpi-label" style="font-size: 10px;">Tổng đầu sách liên kết</div>
              <div class="kpi-value" id="supKpiTitles" style="font-size: 20px;">0</div>
            </div>
            <div class="kpi-sub" style="font-size: 11px;">Số tựa sách đã gán nguồn cung</div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid var(--emerald); padding: 14px 16px; gap: 6px;">
            <div class="kpi-top">
              <span class="kpi-icon i-success" style="width: 36px; height: 36px; font-size: 15px;">
                <i class="fas fa-file-invoice-dollar"></i>
              </span>
            </div>
            <div style="min-width: 0;">
              <div class="kpi-label" style="font-size: 10px;">Tổng giá trị nhập kho</div>
              <div class="kpi-value" id="supKpiImportVal" style="font-size: 18px;">0₫</div>
            </div>
            <div class="kpi-sub" style="font-size: 11px;">Giá trị hàng nhập lũy kế</div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid #2563EB; padding: 14px 16px; gap: 6px;">
            <div class="kpi-top">
              <span class="kpi-icon" style="background: #EFF6FF; color: #2563EB; width: 36px; height: 36px; font-size: 15px;">
                <i class="fas fa-crown"></i>
              </span>
            </div>
            <div style="min-width: 0;">
              <div class="kpi-label" style="font-size: 10px;">NCC nhập hàng nhiều nhất</div>
              <div class="kpi-value" id="supKpiTopName" style="font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;" title="---">---</div>
            </div>
            <div class="kpi-sub" id="supKpiTopSub" style="font-size: 11px;">Theo giá trị nhập kho</div>
          </div>
        </div>

        <!-- THANH TÌM KIẾM & BỘ LỌC -->
        <div class="filter-bar" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 260px;">
            <div class="search-input-wrap" style="position: relative; flex: 1;">
              <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 12.5px;"></i>
              <input type="text" id="adminSupSearch" class="form-control" placeholder="Tìm theo tên NCC, mã NCC, SĐT, email..." style="padding-left: 32px; height: 36px; font-size: 12.5px;" oninput="filterSuppliersTable()" />
            </div>
            <select id="adminSupStatusFilter" class="form-control" style="width: 150px; height: 36px; font-size: 12.5px;" onchange="filterSuppliersTable()">
              <option value="all">Tất cả trạng thái</option>
              <option value="active" selected>Đang hợp tác</option>
              <option value="inactive">Ngừng hợp tác</option>
            </select>
          </div>
          <div style="font-size: 12.5px; color: var(--muted); font-weight: 500;">
            Hiển thị: <strong id="adminSupCount" style="color: var(--navy-900);">0</strong> đối tác
          </div>
        </div>

        <div class="table-container" id="supplierTableContainer">
          <table class="table-compact" id="supplierTable">
            <thead>
              <tr>
                <th style="min-width: 100px;">Mã NCC</th>
                <th style="min-width: 240px;">Tên Nhà Cung Cấp / NXB</th>
                <th style="min-width: 160px;">Người đại diện</th>
                <th style="min-width: 180px;">Thông tin liên hệ</th>
                <th style="min-width: 220px;">Địa chỉ trụ sở</th>
                <th style="text-align: center; min-width: 110px;">Đầu sách</th>
                <th style="text-align: right; min-width: 160px;">Tiền nhập lũy kế</th>
                <th style="text-align: center; min-width: 130px;">Trạng thái</th>
                <th style="text-align: right; min-width: 110px;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="supplierTableBody">
              <tr><td colspan="9" class="empty-cell" style="white-space: nowrap;"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu nhà cung cấp...</td></tr>
            </tbody>
          </table>
        </div>

        <div class="supplier-table-footer" id="supplierTableFooter">
          <span id="supplierCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-truck" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải dữ liệu nhà cung cấp...</span>
          <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài &bull; Cuộn ngang xem chi tiết</span>
        </div>
      </div>

      <!-- VIEW 2: YÊU CẦU TẠM NGƯNG NHÀ CUNG CẤP TỪ THỦ KHO -->
      <div id="supplierSuspendRequestsViewContainer" style="display:none;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:18px;">
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-hourglass-half"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#92400E; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Chờ Admin Duyệt</div>
              <div style="font-size:22px; font-weight:800; color:#B45309;" id="adminCountSupSuspendPending">0</div>
            </div>
          </div>
          <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#DCFCE7; color:#16A34A; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-check-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#166534; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Phê Duyệt</div>
              <div style="font-size:22px; font-weight:800; color:#15803D;" id="adminCountSupSuspendApproved">0</div>
            </div>
          </div>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-times-circle"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#991B1B; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Đã Từ Chối</div>
              <div style="font-size:22px; font-weight:800; color:#B91C1C;" id="adminCountSupSuspendRejected">0</div>
            </div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px;">
            <div style="width:42px; height:42px; border-radius:8px; background:#E2E8F0; color:#475569; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fas fa-inbox"></i>
            </div>
            <div>
              <div style="font-size:12px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Tổng Số Yêu Cầu</div>
              <div style="font-size:22px; font-weight:800; color:#1E293B;" id="adminCountSupSuspendTotal">0</div>
            </div>
          </div>
        </div>

        <!-- Filter & Search bar -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" class="btn btn-sm btn-primary admin-sup-tab-btn" id="adminSupTabPending" onclick="filterAdminSupplierSuspendTab('pending')">
                <i class="fas fa-hourglass-half"></i> Chờ duyệt (<span id="adminTabCountSupPending">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-sup-tab-btn" id="adminSupTabApproved" onclick="filterAdminSupplierSuspendTab('approved')">
                <i class="fas fa-check"></i> Đã duyệt (<span id="adminTabCountSupApproved">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-sup-tab-btn" id="adminSupTabRejected" onclick="filterAdminSupplierSuspendTab('rejected')">
                <i class="fas fa-ban"></i> Đã từ chối (<span id="adminTabCountSupRejected">0</span>)
              </button>
              <button type="button" class="btn btn-sm btn-secondary admin-sup-tab-btn" id="adminSupTabAll" onclick="filterAdminSupplierSuspendTab('all')">
                Tất cả (<span id="adminTabCountSupAll">0</span>)
              </button>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <div class="search-input-wrap" style="position:relative; min-width:240px;">
                <i class="fas fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:12.5px;"></i>
                <input type="text" id="adminSupSuspendSearchInput" class="form-control" placeholder="Tìm theo mã YC, tên NCC, lý do..." style="padding-left:32px; height:36px; font-size:12.5px;" oninput="loadAdminSupplierSuspendRequests()" />
              </div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="loadAdminSupplierSuspendRequests()" style="height:36px;"><i class="fas fa-sync-alt"></i> Tải lại</button>
            </div>
          </div>
        </div>

        <div class="table-container" id="supplierSuspendTableContainer">
          <table class="table-compact" id="supplierSuspendTable">
            <thead>
              <tr>
                <th style="min-width: 120px;">Mã YC</th>
                <th style="min-width: 240px;">Nhà Cung Cấp</th>
                <th style="min-width: 220px;">Người gửi & Thời gian</th>
                <th style="min-width: 260px;">Lý do & Ghi chú từ kho</th>
                <th style="text-align: center; min-width: 140px;">Trạng thái</th>
                <th style="text-align: right; min-width: 160px;">Thao tác duyệt</th>
              </tr>
            </thead>
            <tbody id="adminSupplierSuspendTableBody">
              <tr><td colspan="6" class="empty-cell" style="white-space: nowrap;"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách yêu cầu tạm ngưng...</td></tr>
            </tbody>
          </table>
        </div>

        <div class="supplier-table-footer" id="supplierSuspendTableFooter">
          <span id="supplierSuspendCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-pause-circle" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải danh sách yêu cầu tạm ngưng...</span>
          <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài &bull; Cuộn ngang xem chi tiết</span>
        </div>
      </div>
    </section>
`;
