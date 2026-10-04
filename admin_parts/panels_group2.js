module.exports = `
    <!-- ========================================== -->
    <!-- NHÓM 2: QUẢN LÝ TÀI KHOẢN & NHÂN SỰ -->
    <!-- ========================================== -->

    <!-- PANEL: TÀI KHOẢN HỆ THỐNG -->
    <section class="tab-panel" id="tab-accounts">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Quản lý Tài khoản Hệ thống</h2>
          <p class="panel-subtitle">Quản trị phân quyền, trạng thái hoạt động và bảo mật của tất cả tài khoản trong hệ thống</p>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <input type="text" id="accountSearchInput" placeholder="Tìm theo tên, email, SĐT, mã..." oninput="debounceLoadAccounts()" onkeydown="if(event.key==='Enter') loadAccounts()" />
        </div>
        <div class="filter-select">
          <select id="accountRoleFilter" onchange="loadAccounts()">
            <option value="">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="staff">Nhân viên bán hàng (Staff)</option>
            <option value="stock">Thủ kho (Stock)</option>
            <option value="accountant">Kế toán (Accountant)</option>
            <option value="user">Khách hàng (Customer)</option>
          </select>
        </div>
        <div class="filter-select">
          <select id="accountStatusFilter" onchange="loadAccounts()">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="blocked">Đã khóa</option>
          </select>
        </div>
        <button class="btn btn-secondary" onclick="loadAccounts()"><i class="fas fa-filter"></i> Lọc dữ liệu</button>
        <button class="btn btn-outline btn-sm" onclick="resetAccountFilters()" title="Đặt lại bộ lọc"><i class="fas fa-redo"></i> Xóa lọc</button>
      </div>

      <div class="table-container" id="accountTableContainer">
        <table id="accountTable">
          <thead>
            <tr>
              <th style="min-width: 270px;">Người dùng</th>
              <th style="min-width: 220px;">Email</th>
              <th style="min-width: 140px;">Số điện thoại</th>
              <th style="min-width: 150px;">Vai trò</th>
              <th style="min-width: 140px;">Trạng thái</th>
              <th style="min-width: 170px;">Ngày tham gia</th>
              <th style="min-width: 180px; text-align: right;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="accountTableBody">
            <tr><td colspan="7" class="empty-cell">Đang tải danh sách tài khoản...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Footer hiển thị tổng số tài khoản (Cuộn dọc xem toàn bộ, không cắt trang) -->
      <div class="account-table-footer" id="accountTableFooter">
        <span id="accountCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-users" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải danh sách tài khoản...</span>
        <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc để xem toàn bộ tài khoản</span>
      </div>
    </section>

    <!-- PANEL: NHÂN VIÊN -->
    <section class="tab-panel" id="tab-employees">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Quản lý Nhân sự & Phân ca</h2>
          <p class="panel-subtitle">Hồ sơ nhân viên, mã định danh NV, vai trò hệ thống và ca làm việc</p>
        </div>
        <button class="btn btn-primary" onclick="openEmployeeModal()"><i class="fas fa-user-plus"></i> Thêm nhân viên mới</button>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <input type="text" id="employeeSearchInput" placeholder="Tìm kiếm theo mã NV, họ tên, email, SĐT..." oninput="debounceLoadEmployees()" onkeydown="if(event.key==='Enter') loadEmployees()" />
        </div>
        <div class="filter-select">
          <select id="employeeDeptFilter" onchange="loadEmployees()">
            <option value="">Tất cả vai trò</option>
            <option value="staff">Nhân viên bán hàng (Staff)</option>
            <option value="stock">Thủ kho (Stock)</option>
            <option value="accountant">Kế toán (Accountant)</option>
            <option value="admin">Quản trị viên (Admin)</option>
          </select>
        </div>
        <button class="btn btn-secondary" onclick="loadEmployees()"><i class="fas fa-filter"></i> Lọc</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Mã NV</th>
              <th>Họ và tên</th>
              <th>Liên hệ</th>
              <th>Ca làm việc</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th style="text-align: right;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="employeeTableBody">
            <tr><td colspan="7" class="empty-cell">Đang tải danh sách nhân viên...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- PANEL: KHÁCH HÀNG -->
    <section class="tab-panel" id="tab-customers">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Quản lý Khách hàng & CRM</h2>
          <p class="panel-subtitle">Theo dõi hành vi mua sắm, lịch sử đơn hàng, tổng chi tiêu và phân hạng khách hàng</p>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" onclick="openAddCustomerModal()"><i class="fas fa-user-plus"></i> Thêm khách hàng</button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <input type="text" id="customerSearchInput" placeholder="Tìm khách hàng theo tên, email, SĐT..." oninput="debounceLoadCustomers()" onkeydown="if(event.key==='Enter') loadCustomers()" />
        </div>
        <button class="btn btn-secondary" onclick="loadCustomers()"><i class="fas fa-search"></i> Tìm kiếm</button>
      </div>

      <div class="table-container" id="customerTableContainer">
        <table id="customerTable">
          <thead>
            <tr>
              <th style="min-width: 260px;">Khách hàng</th>
              <th style="min-width: 220px;">Email</th>
              <th style="min-width: 140px;">Số điện thoại</th>
              <th style="min-width: 110px;">Tổng đơn</th>
              <th style="min-width: 130px;">Đơn thành công</th>
              <th style="min-width: 150px;">Tổng chi tiêu</th>
              <th style="min-width: 170px;">Lần mua gần nhất</th>
              <th style="min-width: 220px; text-align: right;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="customerTableBody">
            <tr><td colspan="8" class="empty-cell">Đang tải dữ liệu khách hàng...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Footer hiển thị tổng số khách hàng (Cuộn dọc xem toàn bộ) -->
      <div class="customer-table-footer" id="customerTableFooter">
        <span id="customerCountInfo" style="font-weight:600; color:var(--text);"><i class="fas fa-users" style="margin-right:6px; color:var(--navy-700);"></i>Đang tải dữ liệu khách hàng...</span>
        <span style="font-size:12px; color:var(--muted);"><i class="fas fa-arrows-alt-v" style="margin-right:4px;"></i>Cuộn dọc để xem toàn bộ khách hàng</span>
      </div>
    </section>
`;
