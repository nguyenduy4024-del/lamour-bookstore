module.exports = `
    <!-- ========================================== -->
    <!-- NHÓM 5: KẾ TOÁN & TÀI CHÍNH -->
    <!-- ========================================== -->

    <!-- PANEL: SỔ QUỸ THU - CHI -->
    <section class="tab-panel" id="tab-cashbook">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Sổ Quỹ Thu - Chi Tiền Mặt & Ngân Hàng</h2>
          <p class="panel-subtitle">Theo dõi toàn bộ dòng tiền thu từ bán hàng, chi phí vận hành, nhập hàng và các khoản hoàn tiền</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="loadCashbook()"><i class="fas fa-sync-alt"></i> Tải lại</button>
          <button class="btn btn-primary" onclick="openCashbookModal()"><i class="fas fa-plus-circle"></i> Tạo phiếu thu / chi</button>
        </div>
      </div>

      <div id="adminCashbookPendingAlert" style="display:none; margin-bottom:16px; background:#FEF3C7; border:1px solid #F59E0B; border-radius:8px; padding:10px 16px; color:#92400E; display:flex; justify-content:space-between; align-items:center; font-size:13px; font-weight:600;">
        <span><i class="fas fa-bell" style="margin-right:6px; color:#D97706;"></i> <span id="adminCashbookPendingAlertText">Có phiếu thu / chi mới gửi đang chờ phê duyệt.</span></span>
        <button class="btn btn-sm" style="background:#D97706; color:#fff; border:none; padding:4px 10px; font-size:12px; border-radius:5px;" onclick="filterPendingCashbook()">Xem danh sách chờ duyệt</button>
      </div>

      <div class="stats-grid" style="margin-bottom: 20px;">
        <div class="stat-card">
          <div class="stat-icon icon-emerald"><i class="fas fa-arrow-down"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">Tổng thu trong kỳ</h4>
            <div class="stat-value" id="cashTotalIncome" style="color: var(--color-emerald);">0 ₫</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-red"><i class="fas fa-arrow-up"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">Tổng chi trong kỳ</h4>
            <div class="stat-value" id="cashTotalExpense" style="color: var(--color-red);">0 ₫</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-amber"><i class="fas fa-balance-scale"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">Tồn quỹ hiện tại</h4>
            <div class="stat-value" id="cashBalance" style="color: var(--color-amber);">0 ₫</div>
          </div>
        </div>
      </div>

      <div class="filter-bar" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
        <div class="search-box" style="flex: 1; min-width: 200px;">
          <input type="text" id="cashbookSearchInput" placeholder="Tìm mã phiếu PT/PC, hạng mục, người nhận..." onkeyup="if(event.key==='Enter') loadCashbook()" />
        </div>
        <div class="filter-select" style="min-width: 170px;">
          <select id="cashbookTypeFilter" onchange="loadCashbook()">
            <option value="">Tất cả loại giao dịch</option>
            <option value="income">Phiếu Thu (Income)</option>
            <option value="expense">Phiếu Chi (Expense)</option>
          </select>
        </div>
        <div class="filter-select" style="min-width: 170px;">
          <select id="cashbookStatusFilter" onchange="loadCashbook()">
            <option value="">Tất cả trạng thái</option>
            <option value="pending">⏳ Chờ duyệt (Cần duyệt)</option>
            <option value="approved">✅ Đã phê duyệt</option>
            <option value="rejected">❌ Đã từ chối</option>
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <input type="date" id="cashbookStartDate" class="form-control" style="font-size: 12.5px; padding: 6px 10px; width: 140px;" title="Từ ngày" onchange="loadCashbook()" />
          <span style="color: var(--muted);">-</span>
          <input type="date" id="cashbookEndDate" class="form-control" style="font-size: 12.5px; padding: 6px 10px; width: 140px;" title="Đến ngày" onchange="loadCashbook()" />
        </div>
        <button class="btn btn-secondary" onclick="resetCashbookFilter()" title="Xóa bộ lọc"><i class="fas fa-undo"></i> Đặt lại</button>
      </div>

      <div class="table-container" id="cashbookTableContainer">
        <table id="cashbookTable">
          <thead>
            <tr>
              <th style="min-width: 130px;">Mã phiếu</th>
              <th style="min-width: 120px; text-align: center;">Loại phiếu</th>
              <th style="min-width: 190px;">Hạng mục</th>
              <th style="min-width: 150px; text-align: right;">Số tiền</th>
              <th style="min-width: 130px; text-align: center;">Trạng thái</th>
              <th style="min-width: 200px;">Người nộp / nhận</th>
              <th style="min-width: 130px; text-align: center;">Phương thức</th>
              <th style="min-width: 160px; text-align: center;">Ngày giao dịch</th>
              <th style="min-width: 250px;">Diễn giải</th>
              <th style="min-width: 180px; text-align: center;">Chứng từ</th>
              <th style="min-width: 160px; text-align: center;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="cashbookTableBody">
            <tr><td colspan="11" class="empty-cell" style="white-space: nowrap;">Đang tải sổ quỹ...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="cashbook-table-footer" id="cashbookTableFooter">
        <span id="cashbookCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-wallet" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải sổ quỹ...</span>
        <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc nếu danh sách dài &bull; Cuộn ngang xem chi tiết</span>
      </div>
    </section>

    <!-- PANEL: BÁO CÁO TÀI CHÍNH -->
    <section class="tab-panel" id="tab-financial-report">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Báo Cáo Tài Chính & Kết Quả Kinh Doanh (P&L)</h2>
          <p class="panel-subtitle">Theo dõi Doanh thu thuần, Giá vốn hàng bán (COGS), Tồn kho hiện tại và Lợi nhuận thực tế của nhà sách</p>
        </div>
        <button class="btn btn-secondary" onclick="loadFinancialReport()"><i class="fas fa-sync-alt"></i> Làm mới báo cáo</button>
      </div>

      <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
        <!-- Card 1: Doanh thu thuần -->
        <div class="stat-card">
          <div class="stat-icon icon-blue"><i class="fas fa-chart-line"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">1. Doanh thu thuần</h4>
            <div class="stat-value" id="finNetRevenue" style="color: var(--color-navy);">0 ₫</div>
            <p style="font-size: 11.5px; color: var(--muted); margin: 3px 0 0;" id="finNetRevenueSub">Từ các đơn hàng thành công (đã trừ hoàn tiền)</p>
          </div>
        </div>

        <!-- Card 2: Tồn kho hiện tại -->
        <div class="stat-card">
          <div class="stat-icon icon-amber"><i class="fas fa-warehouse"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">2. Tồn kho hiện tại</h4>
            <div class="stat-value" id="finInventoryValue" style="color: #B45309;">0 ₫</div>
            <p style="font-size: 11.5px; color: var(--muted); margin: 3px 0 0;" id="finInventorySub">0 cuốn sách đang lưu kho</p>
          </div>
        </div>

        <!-- Card 3: Lợi nhuận -->
        <div class="stat-card">
          <div class="stat-icon icon-emerald"><i class="fas fa-wallet"></i></div>
          <div class="stat-info">
            <h4 class="stat-label">3. Lợi nhuận thực tế</h4>
            <div class="stat-value" id="finProfit" style="color: var(--color-emerald);">0 ₫</div>
            <p style="font-size: 11.5px; color: var(--muted); margin: 3px 0 0;" id="finProfitSub">Doanh thu thuần − Giá vốn COGS</p>
          </div>
        </div>
      </div>

      <div class="grid-two-cols">
        <div class="card">
          <h3 class="card-title"><i class="fas fa-file-invoice-dollar" style="color: var(--color-amber);"></i> Bảng Kết Quả Hoạt Động Kinh Doanh & Tồn Kho Thực Tế</h3>
          <div style="margin-top: 16px;">
            <table class="data-table" style="width: 100%;">
              <tbody>
                <tr style="border-bottom: 1px solid var(--color-border);">
                  <td style="padding: 11px 0; font-weight: 600;">1. Doanh thu bán hàng gộp (Gross Sales)</td>
                  <td style="padding: 11px 0; text-align: right; font-weight: 600;" id="tableGrossRevenue">0 ₫</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--color-border); color: var(--color-red);">
                  <td style="padding: 11px 0;">2. Giảm trừ doanh thu (Hàng bán trả lại / Hoàn tiền)</td>
                  <td style="padding: 11px 0; text-align: right;" id="tableRefundRevenue">- 0 ₫</td>
                </tr>
                <tr style="border-bottom: 2px solid var(--color-border); font-weight: 700; background: #FAF7F2;">
                  <td style="padding: 11px 8px;">3. Doanh thu thuần (Net Revenue = 1 − 2)</td>
                  <td style="padding: 11px 8px; text-align: right; color: var(--color-navy);" id="tableNetRevenue">0 ₫</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--color-border); color: #854D0E;">
                  <td style="padding: 11px 0;">4. Giá vốn hàng bán thực tế (COGS - Hàng xuất kho đã bán)</td>
                  <td style="padding: 11px 0; text-align: right;" id="tableCogsVal">- 0 ₫</td>
                </tr>
                <tr style="border-bottom: 2px solid var(--color-amber); font-weight: 700; font-size: 1.05rem; background: rgba(16, 185, 129, 0.1);">
                  <td style="padding: 13px 8px;">5. LỢI NHUẬN THỰC TẾ (Profit = 3 − 4)</td>
                  <td style="padding: 13px 8px; text-align: right; color: var(--color-emerald); font-weight: 800;" id="tableProfitVal">0 ₫</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--color-border); background: rgba(245, 158, 11, 0.05);">
                  <td style="padding: 11px 8px; font-weight: 600; color: #92400E;">6. Tổng giá trị tồn kho hiện tại (Inventory Cost Value)</td>
                  <td style="padding: 11px 8px; text-align: right; font-weight: 700; color: #B45309;" id="tableInventoryVal">0 ₫</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 12.5px; color: var(--muted);"><i class="fas fa-percentage"></i> Tỷ suất lợi nhuận (Profit Margin = 5 / 3)</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 600; font-size: 12.5px; color: var(--color-navy);" id="tableProfitMarginVal">0.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title"><i class="fas fa-chart-pie" style="color: var(--color-amber);"></i> Cơ Cấu Doanh Thu, Vốn Hàng Bán, Lợi Nhuận & Tồn Kho</h3>
          <div style="height: 280px; position: relative; margin-top: 14px;">
            <canvas id="financialChart"></canvas>
          </div>
          <div style="display: flex; justify-content: space-around; font-size: 12px; margin-top: 10px; color: var(--muted); text-align: center; flex-wrap: wrap; gap: 8px;">
            <div><span style="display:inline-block;width:10px;height:10px;background:#3B82F6;border-radius:2px;margin-right:4px;"></span>Doanh thu thuần</div>
            <div><span style="display:inline-block;width:10px;height:10px;background:#F59E0B;border-radius:2px;margin-right:4px;"></span>Giá vốn (COGS)</div>
            <div><span style="display:inline-block;width:10px;height:10px;background:#10B981;border-radius:2px;margin-right:4px;"></span>Lợi nhuận thực tế</div>
            <div><span style="display:inline-block;width:10px;height:10px;background:#8B5CF6;border-radius:2px;margin-right:4px;"></span>Tồn kho (Giá vốn)</div>
          </div>
        </div>
      </div>

      <!-- BIỂU ĐỒ DOANH THU: HÀNG BÁN NHIỀU VS HÀNG BÁN ÍT -->
      <div class="card" style="margin-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 class="card-title" style="margin-bottom: 4px;"><i class="fas fa-chart-bar" style="color: var(--color-amber);"></i> Hiệu Suất Sản Phẩm: Hàng Bán Nhiều vs Hàng Bán Ít (Tồn Chậm)</h3>
            <p style="font-size: 12.5px; color: var(--muted); margin: 0;">So sánh doanh thu xuất bán và giá trị hàng tồn đọng vốn</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="adminProdBtnRev" onclick="switchAdminProdMetric('revenue')" style="background:var(--color-navy); color:#fff;">Doanh thu (VNĐ)</button>
            <button class="btn btn-secondary btn-sm" id="adminProdBtnQty" onclick="switchAdminProdMetric('quantity')">Số lượng (Cuốn)</button>
          </div>
        </div>
        <div class="grid-two-cols" style="gap: 20px;">
          <div style="background: #FAF7F2; padding: 14px; border-radius: 8px; border: 1px solid var(--color-border); min-width: 0; overflow: hidden;">
            <h4 style="font-size: 13px; font-weight: 700; color: #065F46; margin-bottom: 10px;">🔥 Top 10 Hàng Bán Nhiều Nhất (Doanh Thu Cao)</h4>
            <div style="height: 300px; position: relative; width: 100%; min-width: 0; overflow: hidden;">
              <canvas id="adminFinTopBooksChart" style="max-width: 100% !important;"></canvas>
            </div>
          </div>
          <div style="background: #FAF7F2; padding: 14px; border-radius: 8px; border: 1px solid var(--color-border); min-width: 0; overflow: hidden;">
            <h4 style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 10px;">❄️ Top 10 Hàng Bán Ít / Chậm Nhất (Vốn Đọng)</h4>
            <div style="height: 300px; position: relative; width: 100%; min-width: 0; overflow: hidden;">
              <canvas id="adminFinSlowBooksChart" style="max-width: 100% !important;"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- BIỂU ĐỒ KHÁCH HÀNG: MUA NHIỀU TIỀN & MUA NHIỀU SẢN PHẨM -->
      <div class="card" style="margin-top: 24px;">
        <div style="margin-bottom: 16px;">
          <h3 class="card-title" style="margin-bottom: 4px;"><i class="fas fa-users" style="color: var(--color-amber);"></i> Phân Tích Khách Hàng: Mua Nhiều Tiền (VIP Spenders) & Mua Nhiều Sản Phẩm</h3>
          <p style="font-size: 12.5px; color: var(--muted); margin: 0;">Khách hàng có đóng góp doanh số và sản lượng tiêu thụ lớn nhất trong kỳ</p>
        </div>
        <div class="grid-two-cols" style="gap: 20px;">
          <div style="background: #FAF7F2; padding: 14px; border-radius: 8px; border: 1px solid var(--color-border); min-width: 0; overflow: hidden;">
            <h4 style="font-size: 13px; font-weight: 700; color: #3730A3; margin-bottom: 10px;">💎 Top Khách Hàng Mua Nhiều Tiền Nhất (VIP Spenders)</h4>
            <div style="height: 300px; position: relative; width: 100%; min-width: 0; overflow: hidden;">
              <canvas id="adminFinTopSpendersChart" style="max-width: 100% !important;"></canvas>
            </div>
          </div>
          <div style="background: #FAF7F2; padding: 14px; border-radius: 8px; border: 1px solid var(--color-border); min-width: 0; overflow: hidden;">
            <h4 style="font-size: 13px; font-weight: 700; color: #0F766E; margin-bottom: 10px;">📦 Top Khách Hàng Mua Nhiều Sản Phẩm Nhất (Volume Buyers)</h4>
            <div style="height: 300px; position: relative; width: 100%; min-width: 0; overflow: hidden;">
              <canvas id="adminFinTopVolumeChart" style="max-width: 100% !important;"></canvas>
            </div>
          </div>
        </div>
      </div>
    </section>
`;
