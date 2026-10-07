module.exports = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trung Tâm Quản Trị Doanh Nghiệp — L'Amour Bookstore</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="/css/custom-dropdown.css">
<style>
  :root{
    --navy-900:#0A1930;
    --navy-800:#0F2444;
    --navy-700:#173461;
    --navy-500:#2E5590;
    --navy-100:#EEF2F8;
    --cream:#FAF7F1;
    --paper:#FFFFFF;
    --gold:#C7A15A;
    --gold-dark:#9C7C3B;
    --gold-100:#FBF3E3;
    --danger:#B5533C;
    --danger-100:#FBEDE8;
    --success:#2E7D32;
    --success-100:#E8F5E9;
    --info:#0284C7;
    --info-100:#E0F2FE;
    --purple:#7C3AED;
    --purple-100:#EDE9FE;
    --ink:#12203A;
    --muted:#5C6B85;
    --line:#E4DFD3;
    --shadow-soft:0 20px 40px -20px rgba(10,25,48,0.25);
    --shadow-card:0 10px 24px -14px rgba(10,25,48,0.28);
    --sidebar-w:268px;

    /* Semantic color aliases */
    --color-navy: var(--navy-900);
    --color-amber: var(--gold);
    --color-emerald: var(--success);
    --color-red: var(--danger);
    --color-border: var(--line);
    --color-text-main: var(--ink);
    --color-text-muted: var(--muted);
  }

  *,*::before,*::after{ box-sizing:border-box; }
  html, body{
    margin:0; padding:0; background:var(--cream); color:var(--ink);
    font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased;
    overflow-x:hidden; max-width:100vw;
  }
  a{ color:inherit; text-decoration:none; }
  button{ font-family:inherit; cursor:pointer; }
  ul{ list-style:none; margin:0; padding:0; }
  h1,h2,h3,h4{ font-family:'Fraunces',serif; margin:0; color:var(--navy-900); }
  :focus-visible{ outline:2px solid var(--gold); outline-offset:2px; }
  .eyebrow{
    font-family:'IBM Plex Mono',monospace; text-transform:uppercase;
    letter-spacing:.14em; font-size:11px; font-weight:600; color:var(--gold-dark);
  }
  .mono{ font-family:'IBM Plex Mono',monospace; }

  /* ============ APP SHELL ============ */
  .app{
    display:flex;
    min-height:100vh;
    width:100%;
    max-width:100vw;
    overflow-x:hidden;
  }

  /* ============ SIDEBAR ============ */
  .sidebar{
    background:var(--navy-900); color:#C7D1E3;
    display:flex; flex-direction:column;
    padding:18px 14px; position:fixed; top:0; left:0; bottom:0;
    width:var(--sidebar-w); height:100vh;
    overflow-y:auto; border-right:1px solid rgba(255,255,255,0.08);
    z-index:90; box-sizing:border-box;
  }
  .sidebar::-webkit-scrollbar{ width:4px; }
  .sidebar::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.18); border-radius:4px; }

  .brand{ display:flex; align-items:center; gap:10px; padding:4px 6px 16px; border-bottom:1px solid rgba(255,255,255,0.08); }
  .brand .mark{
    width:34px; height:34px; border-radius:8px; flex:0 0 auto;
    background:linear-gradient(150deg,var(--gold),var(--gold-dark));
    color:var(--navy-900); font-family:'Fraunces',serif; font-weight:600; font-size:16px;
    display:flex; align-items:center; justify-content:center;
  }
  .brand .txt .name{ font-family:'Fraunces',serif; font-size:16px; color:#fff; line-height:1.1; }
  .brand .txt .tag{ font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:#94A3B8; margin-top:2px; }

  .admin-mini{
    display:flex; align-items:center; gap:10px;
    background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
    border-radius:10px; padding:10px; margin:14px 0 12px;
  }
  .admin-mini .avatar{
    width:34px; height:34px; border-radius:50%; flex:0 0 auto;
    background:linear-gradient(150deg,var(--navy-500),var(--navy-700));
    color:#fff; display:flex; align-items:center; justify-content:center;
    font-family:'Fraunces',serif; font-size:12px; border:1px solid rgba(255,255,255,0.15);
  }
  .admin-mini .name{ font-size:12.5px; font-weight:600; color:#fff; }
  .admin-mini .role{ font-family:'IBM Plex Mono',monospace; font-size:9.5px; color:var(--gold); margin-top:1px; }

  .side-nav{ display:flex; flex-direction:column; gap:2px; flex:1 1 auto; }
  .side-nav .grp-label{
    font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.12em; text-transform:uppercase;
    color:#64748B; padding:12px 10px 5px; font-weight:700;
  }
  .side-nav button{
    display:flex; align-items:center; gap:10px; width:100%;
    padding:8.5px 12px; border:0; border-radius:8px; background:transparent;
    color:#CBD5E1; font-size:13px; font-weight:500; text-align:left;
    border-left:2px solid transparent;
    transition:background .15s ease, color .15s ease;
  }
  .side-nav button svg{ flex:0 0 auto; opacity:.85; }
  .side-nav button:hover{ background:rgba(255,255,255,0.07); color:#fff; }
  .side-nav button.active{ background:var(--gold); color:var(--navy-900); font-weight:700; border-left-color:var(--gold-dark); }
  .side-nav button.active svg{ opacity:1; }

  .sidebar-bottom{ border-top:1px solid rgba(255,255,255,0.1); padding-top:10px; margin-top:12px; }
  .logout-btn{
    display:flex; align-items:center; gap:10px; width:100%;
    padding:9px 12px; border:0; border-radius:8px; background:transparent;
    color:#FCA5A5; font-size:13px; font-weight:600; text-align:left;
  }
  .logout-btn:hover{ background:rgba(181,83,60,0.2); color:#fff; }

  /* ============ CONTENT & PANELS ============ */
  .content{
    margin-left:var(--sidebar-w);
    width:calc(100% - var(--sidebar-w));
    max-width:calc(100% - var(--sidebar-w));
    min-width:0;
    padding:32px 36px 80px;
    box-sizing:border-box;
    flex:1;
  }
  .page-head, .panel-header{ display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap; margin-bottom:24px; width:100%; }
  .page-head h2, .panel-title{ font-size:28px; font-weight:500; margin-top:6px; }
  .page-head p, .panel-subtitle{ color:var(--muted); font-size:13.5px; margin:6px 0 0; max-width:640px; line-height:1.5; }

  .tab-panel{ display:none; width:100%; min-width:0; }
  .tab-panel.active{ display:block; animation:fadeIn .2s ease; }
  @keyframes fadeIn{ from{ opacity:0; transform:translateY(4px); } to{ opacity:1; transform:translateY(0); } }

  /* ============ BUTTONS ============ */
  .btn{
    font-size:13px; font-weight:600; padding:9px 16px; border-radius:8px;
    border:1px solid var(--line); background:var(--paper); color:var(--navy-900);
    display:inline-flex; align-items:center; gap:8px; white-space:nowrap;
    transition:all .15s ease; cursor:pointer;
  }
  .btn:hover{ border-color:var(--navy-500); }
  .btn-solid, .btn-primary{ background:var(--navy-900); color:var(--cream); border-color:var(--navy-900); }
  .btn-solid:hover, .btn-primary:hover{ background:var(--navy-700); color:#fff; }
  .btn-gold{ background:var(--gold); color:var(--navy-900); border-color:var(--gold); font-weight:700; }
  .btn-gold:hover{ background:#D8B673; }
  .btn-secondary{ background:var(--paper); color:var(--navy-900); border-color:var(--line); }
  .btn-secondary:hover{ border-color:var(--navy-500); }
  .btn-danger{ background:var(--danger-100); color:var(--danger); border-color:var(--danger); }
  .btn-danger:hover{ background:var(--danger); color:#fff; }
  .btn-warning{ background:var(--gold-100); color:var(--gold-dark); border-color:var(--gold); }
  .btn-sm{ padding:6px 11px; font-size:12px; border-radius:6px; }

  /* ============ KPI & STAT CARDS ============ */
  .kpi-grid, .stats-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:18px; margin-top:10px; margin-bottom:24px; }
  .kpi-card, .stat-card{
    background:var(--paper); border:1px solid var(--line); border-radius:12px;
    padding:20px; display:flex; flex-direction:column; gap:10px;
    box-shadow:0 2px 8px rgba(10,25,48,0.04); min-width:0;
  }
  .stat-card{ flex-direction:row; align-items:center; gap:16px; }
  .stat-info{ display:flex; flex-direction:column; gap:4px; min-width:0; flex:1; }
  .kpi-top{ display:flex; align-items:flex-start; justify-content:space-between; }
  .kpi-icon, .stat-icon{
    width:42px; height:42px; border-radius:10px;
    display:flex; align-items:center; justify-content:center; flex:0 0 auto; font-size:18px;
  }
  .kpi-icon.i-navy{ background:var(--navy-900); color:var(--gold); }
  .kpi-icon.i-gold, .icon-amber{ background:var(--gold-100); color:var(--gold-dark); }
  .kpi-icon.i-danger, .icon-red{ background:var(--danger-100); color:var(--danger); }
  .kpi-icon.i-muted, .icon-blue{ background:var(--navy-100); color:var(--navy-700); }
  .kpi-icon.i-success, .icon-emerald{ background:var(--success-100); color:var(--success); }

  .kpi-label, .stat-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin:0; }
  .kpi-value, .stat-value{ font-family:'Fraunces',serif; font-size:24px; font-weight:600; color:var(--navy-900); line-height:1.15; word-break:break-word; }
  .kpi-sub, .stat-sub{ font-size:12px; color:var(--muted); display:flex; align-items:center; gap:6px; }
  .kpi-sub .trend{ font-family:'IBM Plex Mono',monospace; font-weight:600; display:flex; align-items:center; gap:3px; }
  .kpi-sub .trend.up{ color:var(--gold-dark); }
  .kpi-sub .trend.down{ color:var(--danger); }

  /* ============ SECTION & TABLE ============ */
  .section-card, .card{
    background:var(--paper); border:1px solid var(--line); border-radius:12px;
    overflow:hidden; box-shadow:0 2px 10px rgba(10,25,48,0.04); margin-bottom:24px; padding:20px;
  }
  .section-card{ padding:0; }
  .section-card-head{
    display:flex; align-items:center; justify-content:space-between; gap:16px;
    padding:18px 22px; border-bottom:1px solid var(--line); flex-wrap:wrap;
  }
  .section-card-head h3, .card-title{ font-size:16.5px; font-weight:500; }
  .head-tools{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

  .filter-bar{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:18px; }
  .search-box input, .search-mini input{
    border:1px solid var(--line); border-radius:8px; padding:8px 12px;
    font-size:13px; outline:0; min-width:240px; background:#fff; color:var(--ink);
  }
  .search-box input:focus, .search-mini input:focus{ border-color:var(--navy-500); }
  .filter-select select, select.form-control{
    border:1px solid var(--line); border-radius:8px; padding:8px 12px;
    font-size:13px; background:#fff; color:var(--ink); outline:0; cursor:pointer;
  }
  .card:has(.cr-custom-select-wrap),
  .card.card-overflow-visible {
    overflow: visible !important;
  }
  .cr-custom-select-wrap.open {
    z-index: 10000 !important;
  }
  .cr-custom-select-options {
    z-index: 999999 !important;
  }

  .table-wrap, .table-container{
    overflow-x:auto; max-width:100%; width:100%;
    background:var(--paper); border:1px solid var(--line); border-radius:12px;
    -webkit-overflow-scrolling:touch;
  }
  .table-wrap::-webkit-scrollbar, .table-container::-webkit-scrollbar{ height:7px; width:7px; }
  .table-wrap::-webkit-scrollbar-track, .table-container::-webkit-scrollbar-track{ background:#F1F5F9; border-radius:4px; }
  .table-wrap::-webkit-scrollbar-thumb, .table-container::-webkit-scrollbar-thumb{ background:#CBD5E1; border-radius:4px; }
  .table-wrap::-webkit-scrollbar-thumb:hover, .table-container::-webkit-scrollbar-thumb:hover{ background:#94A3B8; }
  table{ width:100%; border-collapse:collapse; min-width:700px; }
  thead th{
    text-align:left; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em;
    text-transform:uppercase; color:var(--muted); font-weight:600;
    padding:12px 18px; border-bottom:1px solid var(--line); background:#F8FAFC; white-space:nowrap;
  }
  tbody td{
    padding:13px 18px; border-bottom:1px solid var(--line); font-size:13px;
    vertical-align:middle;
  }
  tbody tr:last-child td{ border-bottom:0; }
  tbody tr:hover td{ background:rgba(238,242,248,0.4); }
  .table-compact{ width:100%; border-collapse:collapse; min-width:860px; }
  .table-compact thead th{ padding:9px 10px; font-size:10px; }
  .table-compact tbody td{ padding:9px 10px; font-size:12px; }

  /* Bảng Quản lý Tài khoản, Khách hàng CRM, Danh mục Sách, Đơn mua, Tra cứu Tồn kho, Phiếu Nhập Sách, Phiếu Xuất Sách, Kiểm Kê Kho, Nhà Cung Cấp, Sổ Quỹ & Nhật Ký Hoạt Động: Giới hạn chiều dài bảng, cuộn nội bộ mượt mà và cố định tiêu đề */
  #accountTableContainer,
  #customerTableContainer,
  #bookTableContainer,
  #orderTableContainer,
  #inventoryLookupTableContainer,
  #importReceiptTableContainer,
  #exportReceiptTableContainer,
  #stockAuditTableContainer,
  #supplierTableContainer,
  #supplierSuspendTableContainer,
  #cashbookTableContainer,
  #auditLogsTableContainer,
  #backupTableContainer {
    max-height: 520px;
    overflow-y: auto;
    overflow-x: auto;
    position: relative;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom: 0;
  }
  #accountTableContainer thead th,
  #customerTableContainer thead th,
  #bookTableContainer thead th,
  #orderTableContainer thead th,
  #inventoryLookupTableContainer thead th,
  #importReceiptTableContainer thead th,
  #exportReceiptTableContainer thead th,
  #stockAuditTableContainer thead th,
  #supplierTableContainer thead th,
  #supplierSuspendTableContainer thead th,
  #cashbookTableContainer thead th,
  #auditLogsTableContainer thead th,
  #backupTableContainer thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #F8FAFC;
    box-shadow: 0 1px 0 var(--line);
    white-space: nowrap !important;
  }
  #accountTable,
  #customerTable {
    width: 100%;
    min-width: 1200px;
    border-collapse: collapse;
  }
  #bookTable {
    width: 100%;
    min-width: 1450px;
    border-collapse: collapse;
  }
  #orderTable {
    width: 100%;
    min-width: 1350px;
    border-collapse: collapse;
  }
  #inventoryLookupTable {
    width: 100%;
    min-width: 1350px;
    border-collapse: collapse;
  }
  #importReceiptTable,
  #exportReceiptTable,
  #stockAuditTable {
    width: 100%;
    min-width: 1280px;
    border-collapse: collapse;
  }
  #supplierTable {
    width: 100%;
    min-width: 1420px;
    border-collapse: collapse;
  }
  #supplierSuspendTable {
    width: 100%;
    min-width: 1180px;
    border-collapse: collapse;
  }
  #cashbookTable {
    width: 100%;
    min-width: 1800px;
    border-collapse: collapse;
  }
  #auditLogsTable {
    width: 100%;
    min-width: 1520px;
    border-collapse: collapse;
  }
  #backupTable {
    width: 100%;
    min-width: 1560px;
    border-collapse: collapse;
  }
  #accountTable th,
  #accountTable td,
  #customerTable th,
  #customerTable td,
  #bookTable th,
  #bookTable td,
  #orderTable th,
  #orderTable td,
  #inventoryLookupTable th,
  #inventoryLookupTable td,
  #importReceiptTable th,
  #importReceiptTable td,
  #exportReceiptTable th,
  #exportReceiptTable td,
  #stockAuditTable th,
  #stockAuditTable td,
  #supplierTable th,
  #supplierTable td,
  #supplierSuspendTable th,
  #supplierSuspendTable td,
  #cashbookTable th,
  #cashbookTable td,
  #auditLogsTable th,
  #auditLogsTable td,
  #backupTable th,
  #backupTable td {
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  #accountTable .person-cell,
  #customerTable .person-cell {
    display: inline-flex !important;
    align-items: center !important;
    white-space: nowrap !important;
    gap: 10px;
  }
  #accountTable .person-info-inline,
  #customerTable .person-info-inline {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px;
    white-space: nowrap !important;
  }
  #accountTable .person-info-inline .nm,
  #customerTable .person-info-inline .nm {
    font-weight: 600;
    color: var(--navy-900);
    white-space: nowrap !important;
  }
  .account-table-footer,
  .customer-table-footer,
  .book-table-footer,
  .order-table-footer,
  .inventory-table-footer,
  .import-receipt-table-footer,
  .export-receipt-table-footer,
  .stock-audit-table-footer,
  .supplier-table-footer,
  .cashbook-table-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 11px 18px;
    background: #F8FAFC;
    border: 1px solid var(--line);
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
    font-size: 13px;
    color: var(--muted);
  }

  /* Bảng Thể loại & Tác giả: Giới hạn chiều dài bảng, cuộn nội bộ và cố định tiêu đề */
  #categoryTableContainer,
  #authorTableContainer {
    max-height: 440px;
    overflow-y: auto;
    overflow-x: auto;
    position: relative;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom: 0;
  }
  #categoryTableContainer thead th,
  #authorTableContainer thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #F8FAFC;
    box-shadow: 0 1px 0 var(--line);
    white-space: nowrap !important;
  }
  #categoryTable,
  #authorTable {
    width: 100%;
    min-width: 960px;
    border-collapse: collapse;
  }
  #categoryTable th,
  #authorTable th {
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  #categoryTable td,
  #authorTable td {
    vertical-align: middle !important;
  }
  #categoryTable td:not(.cell-wrap),
  #authorTable td:not(.cell-wrap) {
    white-space: nowrap;
  }
  #categoryTable td.cell-wrap,
  #authorTable td.cell-wrap {
    white-space: normal !important;
  }
  .category-desc-clamped {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal !important;
    word-break: break-word;
    font-size: 13px;
    line-height: 1.45;
    color: var(--navy-800);
    max-width: 500px;
  }
  .author-quote-clamped {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal !important;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.4;
    color: var(--navy-700);
    font-style: italic;
    margin-top: 4px;
    max-width: 480px;
  }
  .category-table-footer,
  .author-table-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 18px;
    background: #F8FAFC;
    border: 1px solid var(--line);
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
    font-size: 13px;
    color: var(--muted);
  }

  /* Sổ quỹ table: Hiển thị 1 dòng, kéo dài bảng với thanh cuộn ngang mượt mà */
  #cashbookTable {
    width: 100%;
    min-width: 1700px;
    border-collapse: collapse;
  }
  #cashbookTable th,
  #cashbookTable td {
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  #cashbookTable tbody tr td {
    padding: 11px 16px;
    height: 48px;
    box-sizing: border-box;
  }
  .cash-person-pill {
    transition: all 0.2s ease;
  }
  .cash-person-pill:hover {
    filter: brightness(0.96);
  }
  .cash-cert-link {
    transition: all 0.2s ease;
  }
  .cash-cert-link:hover {
    background: #DBEAFE !important;
    border-color: #93C5FD !important;
    color: #1E40AF !important;
    box-shadow: 0 1px 3px rgba(37,99,235,0.15);
  }

  .person-cell{ display:flex; align-items:center; gap:10px; }
  .person-cell .av{
    width:32px; height:32px; border-radius:50%; flex:0 0 auto;
    background:var(--navy-100); color:var(--navy-700);
    font-family:'Fraunces',serif; font-size:11.5px; font-weight:600;
    display:flex; align-items:center; justify-content:center;
  }
  .person-cell .nm{ font-weight:600; color:var(--navy-900); }
  .id-cell{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--muted); }
  .amount{ font-family:'IBM Plex Mono',monospace; font-weight:600; color:var(--navy-900); }
  .empty-cell{ text-align:center; padding:28px !important; color:var(--muted); font-style:italic; }

  /* ============ BADGES ============ */
  .badge{
    display:inline-flex; align-items:center; justify-content:center; gap:5px;
    padding:3px 9px; border-radius:99px;
    font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:600;
    white-space:nowrap;
  }
  .badge-dot{ width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0; }
  .b-active, .badge-success{ background:#DCFCE7; color:#166534; }
  .b-locked, .badge-danger{ background:#FEE2E2; color:#991B1B; }
  .b-admin, .badge-primary{ background:#EDE9FE; color:#5B21B6; }
  .b-staff, .badge-info{ background:#E0F2FE; color:#0369A1; }
  .b-stock, .badge-warning{ background:#FEF3C7; color:#92400E; }
  .b-accountant{ background:#FCE7F3; color:#9D174D; }
  .b-user, .badge-secondary{ background:#F1F5F9; color:#475569; }

  /* ============ ORDER STATUS TABS (7 TABS) ============ */
  .order-status-tabs{ display:flex; gap:8px; overflow-x:auto; margin-bottom:18px; padding-bottom:4px; }
  .order-tab{
    padding:7px 15px; border-radius:99px; border:1px solid var(--line);
    background:var(--paper); font-size:12.5px; font-weight:600; color:var(--muted);
    cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap;
    transition:all .15s ease;
  }
  .order-tab:hover{ border-color:var(--navy-500); color:var(--navy-900); }
  .order-tab.active{ background:var(--navy-900); color:#fff; border-color:var(--navy-900); }
  .order-tab-refund{ border-color:var(--danger); color:var(--danger); }
  .order-tab-refund.active{ background:var(--danger); color:#fff; border-color:var(--danger); }
  .order-count{
    padding:1px 6px; border-radius:99px; font-size:11px;
    background:var(--navy-100); color:var(--navy-900);
  }
  .order-tab.active .order-count{ background:rgba(255,255,255,0.25); color:#fff; }

  /* ============ INVENTORY LOOKUP SUB-NAVIGATION ============ */
  .inv-subnav-panel {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 12px 18px;
    margin-bottom: 22px;
    box-shadow: 0 2px 10px rgba(10, 25, 48, 0.03);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .inv-subnav-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
  }
  .inv-subnav-section {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .inv-section-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--navy-700);
    background: var(--navy-100);
    padding: 6.5px 11px;
    border-radius: 8px;
    white-space: nowrap;
    border: 1px solid rgba(23, 52, 97, 0.08);
  }
  .inv-section-badge.requests {
    color: #92400E;
    background: #FEF3C7;
    border-color: rgba(217, 119, 6, 0.2);
  }
  .inv-nav-btn {
    font-size: 12.5px;
    font-weight: 600;
    padding: 7.5px 14px;
    border-radius: 8px;
    border: 1.5px solid #E2E8F0;
    background: #FFFFFF;
    color: #334155;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    cursor: pointer;
    transition: all .18s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  .inv-nav-btn:hover {
    border-color: var(--navy-500) !important;
    background: #F8FAFC !important;
    color: var(--navy-900) !important;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(10, 25, 48, 0.06);
  }
  .inv-nav-btn.btn-primary {
    background: linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 100%) !important;
    color: #FFFFFF !important;
    border-color: var(--navy-900) !important;
    box-shadow: 0 4px 12px rgba(10, 25, 48, 0.22) !important;
  }
  .inv-nav-btn.btn-primary i {
    color: var(--gold) !important;
  }
  .inv-nav-btn.btn-secondary {
    background: #FFFFFF !important;
    color: #334155 !important;
    border-color: #E2E8F0 !important;
  }
  .inv-nav-btn.btn-secondary:hover {
    border-color: var(--navy-500) !important;
    background: #F8FAFC !important;
    color: var(--navy-900) !important;
  }
  .inv-nav-btn .badge {
    min-width: 19px;
    height: 19px;
    padding: 0 6px;
    font-size: 10.5px;
    font-weight: 800;
    font-family: 'IBM Plex Mono', monospace;
    line-height: 19px;
    text-align: center;
    border-radius: 999px;
    margin-left: 6px;
    vertical-align: middle;
    box-shadow: 0 1px 3px rgba(0,0,0,0.18);
  }
  #adminHideRequestsBadge,
  #adminShelfRequestsBadge {
    background: #EF4444 !important;
    color: #FFFFFF !important;
    box-shadow: 0 0 0 1.5px rgba(239, 68, 68, 0.35);
  }
  #adminMaintenanceRequestsBadge {
    background: #F59E0B !important;
    color: #FFFFFF !important;
    box-shadow: 0 0 0 1.5px rgba(245, 158, 11, 0.35);
  }
  #adminTransferRequestsBadge {
    background: #8B5CF6 !important;
    color: #FFFFFF !important;
    box-shadow: 0 0 0 1.5px rgba(139, 92, 246, 0.35);
  }
  #adminShelfLogsBadge {
    background: var(--gold) !important;
    color: var(--navy-900) !important;
    box-shadow: 0 0 0 1.5px rgba(199, 161, 90, 0.35);
  }
  .inv-subnav-divider {
    height: 1px;
    background: #EBE6DC;
    width: 100%;
    margin: 2px 0;
  }

  /* ============ MODAL SYSTEM ============ */
  .modal-overlay, .confirm-overlay{
    position:fixed; inset:0; z-index:9999;
    background:rgba(10,25,48,0.65); backdrop-filter:blur(5px);
    display:flex; align-items:center; justify-content:center; padding:20px;
    opacity:0; pointer-events:none; transition:opacity .2s ease;
  }
  .modal-overlay.active, .confirm-overlay.active{ opacity:1; pointer-events:auto; }
  .modal-card, .modal-content, .modal-box{
    background:var(--paper); border:1px solid var(--line); border-radius:14px;
    width:100%; max-width:620px; max-height:92vh; overflow-y:auto; overflow-x:hidden;
    padding:26px 28px; box-shadow:var(--shadow-soft);
    transform:scale(0.96); transition:transform .2s ease;
  }
  .modal-card.modal-lg, .modal-content.modal-lg, .modal-box.modal-lg{
    max-width:860px;
  }
  .confirm-modal{
    background:var(--paper); border:1px solid var(--line); border-radius:14px;
    width:100%; max-width:440px; max-height:92vh; overflow-y:auto;
    padding:24px 26px; box-shadow:var(--shadow-soft);
    transform:scale(0.96); transition:transform .2s ease;
    text-align:center;
  }
  .confirm-title { font-size: 18px; font-weight: 700; color: var(--navy-900); margin-bottom: 8px; font-family: 'Fraunces', serif; }
  .confirm-msg { font-size: 13.5px; color: var(--muted); margin-bottom: 22px; line-height: 1.5; }
  .confirm-actions { display: flex; gap: 10px; justify-content: center; }
  .confirm-btn { flex: 1; padding: 10px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 600; border: 1px solid var(--line); background: #FFF; color: var(--navy-800); cursor: pointer; transition: all 0.15s ease; }
  .confirm-btn:hover { background: #F8FAFC; }
  .confirm-btn-primary { background: var(--navy-900); color: #FFF; border-color: var(--navy-900); }
  .confirm-btn-primary:hover { background: var(--navy-800); }
  .modal-overlay.active .modal-card, .modal-overlay.active .modal-content, .modal-overlay.active .modal-box, .confirm-overlay.active .confirm-modal{ transform:scale(1); }
  .modal-head, .modal-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; padding-bottom:12px; border-bottom:1px solid var(--line); }
  .modal-head h3, .modal-title{ font-size:19px; font-family:'Fraunces',serif; }
  .modal-close{ border:0; background:transparent; font-size:20px; cursor:pointer; color:var(--muted); padding:4px 8px; border-radius:4px; }
  .modal-close:hover{ color:var(--navy-900); background:var(--navy-100); }
  .modal-footer{ display:flex; justify-content:flex-end; gap:10px; margin-top:20px; padding-top:14px; border-top:1px solid var(--line); }

  /* ============ AUDIT APPROVAL MODAL OVERLAY CHUẨN ============ */
  /* Lớp phủ mờ toàn màn hình - BẮT BUỘC ẨN MẶC ĐỊNH */
  #auditApprovalModal,
  .audit-approval-modal-overlay {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background-color: rgba(15, 23, 42, 0.65) !important; /* Lớp nền tối làm mờ phía sau */
    backdrop-filter: blur(4px);
    z-index: 99999 !important; /* Luôn đè lên trên mọi thành phần khác */
    display: none !important; /* TUYỆT ĐỐI KHÔNG HIỂN THỊ KHI CHƯA GỌI */
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    overflow-y: auto;
  }

  /* Trạng thái khi được kích hoạt mở */
  #auditApprovalModal.active,
  #auditApprovalModal.show,
  .audit-approval-modal-overlay.active {
    display: flex !important;
  }

  /* Khung nội dung hộp thoại bên trong */
  #auditApprovalModal .modal-content,
  .audit-approval-modal-container {
    background: #FAF7F2;
    width: 100%;
    max-width: 1100px;
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border: 1px solid #E2E8F0;
    padding: 24px;
    position: relative;
  }

  .form-group{ display:flex; flex-direction:column; gap:5px; margin-bottom:12px; min-width:0; max-width:100%; box-sizing:border-box; }
  .form-group label, .form-label{ font-size:12px; font-weight:600; color:var(--navy-900); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
  .form-control{
    width:100%; max-width:100%; min-width:0; box-sizing:border-box; border:1px solid var(--line); border-radius:6px; padding:9px 12px;
    font-family:'Inter',sans-serif; font-size:13.5px; color:var(--ink); outline:0;
    background:#fff; transition:border-color .15s ease;
  }
  select.form-control{
    width:100%; max-width:100%; min-width:0; box-sizing:border-box; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;
  }
  .form-control:focus{ border-color:var(--navy-500); box-shadow:0 0 0 3px rgba(46,85,144,0.12); }
  textarea.form-control{ resize:vertical; min-height:80px; }

  /* ============ TOAST CONTAINER ============ */
  #toast-container, .toast-container{
    position:fixed; top:20px; right:20px; z-index:999999;
    display:flex; flex-direction:column; gap:10px; max-width:380px; width:calc(100% - 40px);
    pointer-events:none;
  }
  .custom-toast{
    pointer-events:auto; background:rgba(255, 255, 255, 0.96);
    backdrop-filter:blur(12px); border-radius:12px; padding:14px 16px;
    box-shadow:0 12px 32px -8px rgba(10,25,48,0.22), 0 0 0 1px rgba(228,223,211,0.8);
    display:flex; align-items:flex-start; gap:12px;
    animation:toastIn .3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
  }
  @keyframes toastIn{ from{ opacity:0; transform:translateX(40px); } to{ opacity:1; transform:translateX(0); } }
  .toast-icon{ width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#fff; flex-shrink:0; }
  .toast-success .toast-icon{ background:#10B981; }
  .toast-error .toast-icon{ background:#EF4444; }
  .toast-warning .toast-icon{ background:#F59E0B; }
  .toast-info .toast-icon{ background:#3B82F6; }
  .toast-content{ flex:1; }
  .toast-title{ font-weight:700; font-size:13px; color:#0F172A; }
  .toast-msg{ font-size:12px; color:#475569; margin-top:2px; line-height:1.4; }
  .toast-close{ border:0; background:transparent; color:#94A3B8; font-size:16px; cursor:pointer; padding:0 4px; }
  .toast-close:hover{ color:#0F172A; }

  .confirm-title{ font-size:18px; font-weight:700; color:var(--navy-900); margin-bottom:8px; font-family:'Fraunces',serif; text-align:center; }
  .confirm-msg{ font-size:13.5px; color:var(--muted); line-height:1.55; margin-bottom:22px; text-align:center; word-break:break-word; }
  .confirm-actions{ display:flex; justify-content:center; gap:12px; }
  .confirm-btn{
    min-width:105px; padding:9px 20px; border-radius:8px; font-size:13.5px; font-weight:600;
    border:1px solid var(--line); background:#fff; cursor:pointer; transition:all .15s ease;
  }
  .confirm-btn:hover{ background:var(--navy-50, #f8fafc); }
  .confirm-btn-primary{ background:var(--navy-900); color:#fff; border-color:var(--navy-900); }
  .confirm-btn-primary:hover{ background:var(--navy-800, #0a1930); }

  /* ============ ANALYTICS FILTER TOOLBAR UI/UX ============ */
  .analytics-filter-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 18px 24px;
    margin-bottom: 24px;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .analytics-pills-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .analytics-pills-left {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .analytics-pills-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #0F172A;
    white-space: nowrap;
  }
  .analytics-pills-label i {
    color: #C59B27;
    font-size: 13px;
  }
  .analytics-pills-group {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .analytics-pill-btn {
    border: 1px solid #E2E8F0;
    background: #F8FAFC;
    color: #475569;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    outline: none;
    line-height: 1.3;
  }
  .analytics-pill-btn:hover {
    border-color: #CBD5E1;
    background: #F1F5F9;
    color: #0F172A;
  }
  .analytics-pill-btn.active {
    background: #0F172A;
    border-color: #0F172A;
    color: #FFFFFF;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
  }

  .analytics-actions-group {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .analytics-controls-grid {
    display: grid;
    grid-template-columns: auto minmax(130px, 1fr) minmax(170px, 1.4fr) minmax(160px, 1.3fr);
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .analytics-date-range {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .analytics-date-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .analytics-date-icon {
    position: absolute;
    left: 12px;
    color: #64748B;
    font-size: 13px;
    pointer-events: none;
    z-index: 1;
  }
  .analytics-date-input {
    height: 40px;
    padding: 0 10px 0 32px;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    color: #0F172A;
    background: #FFFFFF;
    width: 132px;
    outline: none;
    transition: all 0.2s ease;
    cursor: pointer;
  }
  .analytics-date-input:focus {
    border-color: #C59B27;
    box-shadow: 0 0 0 3px rgba(197, 155, 39, 0.15);
  }
  .analytics-date-sep {
    font-size: 13px;
    color: #94A3B8;
    user-select: none;
    font-weight: 500;
  }

  .analytics-select-wrap {
    display: flex;
    align-items: center;
    position: relative;
    width: 100%;
  }
  .analytics-select {
    height: 40px;
    padding: 0 12px;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    color: #0F172A;
    background: #FFFFFF;
    outline: none;
    transition: all 0.2s ease;
    cursor: pointer;
    width: 100%;
    min-width: 0;
  }
  .analytics-select:focus {
    border-color: #C59B27;
    box-shadow: 0 0 0 3px rgba(197, 155, 39, 0.15);
  }

  .btn-analytics-filter {
    height: 40px;
    padding: 0 18px;
    background: #0F172A;
    color: #FFFFFF;
    border: 1px solid #0F172A;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  .btn-analytics-filter:hover {
    background: #1E293B;
    border-color: #1E293B;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
    transform: translateY(-1px);
  }
  .btn-analytics-filter:active {
    transform: translateY(0);
  }

  .btn-analytics-reset {
    height: 40px;
    padding: 0 16px;
    background: #FFFFFF;
    color: #475569;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  .btn-analytics-reset:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
    color: #0F172A;
  }
</style>
</head>
<body>
<div id="toast-container"></div>
<div class="app">
`;
