module.exports = `
  <!-- ============ SIDEBAR ============ -->
  <aside class="sidebar">
    <div class="brand">
      <div class="mark">L</div>
      <div class="txt">
        <div class="name">L'Amour</div>
        <div class="tag">Enterprise Admin</div>
      </div>
    </div>

    <div class="admin-mini" id="adminProfileMini">
      <div class="avatar" id="adminAvatar">QT</div>
      <div>
        <div class="name" id="adminName">Lê Thị Quỳnh</div>
        <div class="role" id="adminRole">Quản trị viên (Admin)</div>
      </div>
    </div>

    <nav class="side-nav" id="sideNav">
      <!-- TỔNG QUAN -->
      <span class="grp-label">📊 TỔNG QUAN</span>
      <button data-tab="overview" class="active">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
        Bàn làm việc
      </button>
      <button data-tab="analytics">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M7 15l4-6 3 4 5-8"/></svg>
        Thống kê & Phân tích
      </button>

      <!-- QUẢN LÝ TÀI KHOẢN & NHÂN SỰ -->
      <span class="grp-label">👥 TÀI KHOẢN & NHÂN SỰ</span>
      <button data-tab="accounts">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Quản lý Tài khoản
      </button>
      <button data-tab="employees">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Quản lý Nhân viên
      </button>
      <button data-tab="customers">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Quản lý Khách hàng
      </button>

      <!-- SẢN PHẨM & BÁN HÀNG -->
      <span class="grp-label">📚 SẢN PHẨM & BÁN HÀNG</span>
      <button data-tab="books">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        Quản lý Sách
      </button>
      <button data-tab="authors-categories">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        Tác giả & Thể loại
      </button>
      <button data-tab="orders" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span style="flex:1;">Đơn mua khách hàng</span>
        <span id="sidebarPendingOrdersBadge" style="display:none; background:#EF4444; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; margin-left:6px;" title="Đơn hàng chờ xử lý">0</span>
      </button>
      <button data-tab="coupons">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        Mã Giảm Giá
      </button>

      <!-- QUẢN LÝ KHO & LOGISTICS -->
      <span class="grp-label">📦 KHO & LOGISTICS</span>
      <button data-tab="inventory-lookup" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
        <span style="flex:1;">Tồn kho & Vị trí kệ</span>
        <span id="sidebarPendingHideBadge" style="display:none; background:#EF4444; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; margin-left:6px;" title="Yêu cầu ẩn sách từ kho chờ duyệt">0</span>
      </button>
      <button data-tab="import-receipts" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
        <span style="flex:1;">Nhập sách (NCC)</span>
        <span id="sidebarPendingImportBadge" style="display:none; background:#EF4444; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; margin-left:6px;" title="Phiếu nhập chờ duyệt">0</span>
      </button>
      <button data-tab="export-receipts" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        <span style="flex:1;">Xuất sách</span>
        <span id="sidebarPendingExportBadge" style="display:none; background:#EF4444; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; margin-left:6px;" title="Phiếu xuất chờ duyệt">0</span>
      </button>
      <button data-tab="stock-audit" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <span style="flex:1;">Kiểm kê & Điều chỉnh</span>
        <span id="sidebarPendingAuditBadge" style="display:none; background:#EF4444; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; margin-left:6px;">0</span>
      </button>
      <button data-tab="suppliers" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span style="flex:1;">Nhà cung cấp</span>
        <span id="sidebarPendingSupplierSuspendBadge" style="display:none; background:#EF4444; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; margin-left:6px;" title="Yêu cầu tạm ngưng NCC từ kho chờ duyệt">0</span>
      </button>

      <!-- KẾ TOÁN & TÀI CHÍNH -->
      <span class="grp-label">💰 KẾ TOÁN & TÀI CHÍNH</span>
      <button data-tab="cashbook" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        <span style="flex:1;">Sổ quỹ Thu - Chi</span>
        <span id="sidebarPendingCashbookBadge" style="display:none; background:#EF4444; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; margin-left:6px;">0</span>
      </button>
      <button data-tab="financial-report">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Báo cáo Tài chính
      </button>

      <!-- HỆ THỐNG -->
      <span class="grp-label">⚙️ HỆ THỐNG</span>
      <button data-tab="system-settings">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Cài đặt hệ thống
      </button>
      <button data-tab="audit-logs" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <span style="flex:1;">Nhật ký hoạt động</span>
        <span id="sidebarAuditCriticalBadge" style="display:none; background:#EF4444; color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; margin-left:6px;">0</span>
      </button>
      <button data-tab="backup-restore" style="display:flex; align-items:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span style="flex:1;">Sao lưu & Phục hồi</span>
      </button>
    </nav>

    <div class="sidebar-bottom">
      <button class="logout-btn" id="logoutBtn" onclick="logout()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Đăng xuất
      </button>
    </div>
  </aside>

  <!-- ============ MAIN CONTENT AREA ============ -->
  <main class="content">
`;
