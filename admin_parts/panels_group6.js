module.exports = `
    <!-- ========================================== -->
    <!-- NHÓM 6: HỆ THỐNG -->
    <!-- ========================================== -->

    <!-- PANEL: CÀI ĐẶT HỆ THỐNG -->
    <section class="tab-panel" id="tab-system-settings">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Cấu Hình & Cài Đặt Hệ Thống</h2>
          <p class="panel-subtitle">Quản lý thông tin cửa hàng, tài khoản thanh toán QR/MoMo và cấu hình hiển thị</p>
        </div>
        <button class="btn btn-primary" onclick="saveSystemSettings()"><i class="fas fa-save"></i> Lưu cài đặt</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- THÔNG TIN CỬA HÀNG -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;"><i class="fas fa-store" style="color: var(--color-amber);"></i> Thông tin Hiệu sách L'Amour</h3>
          <div class="form-group">
            <label class="form-label">Tên hiệu sách / Doanh nghiệp</label>
            <input type="text" id="settingStoreName" class="form-control" value="L'Amour Bookstore" />
          </div>
          <div class="form-group">
            <label class="form-label">Hotline hỗ trợ</label>
            <input type="text" id="settingHotline" class="form-control" value="0987.654.321" />
          </div>
          <div class="form-group">
            <label class="form-label">Email liên hệ / CSKH</label>
            <input type="email" id="settingEmail" class="form-control" value="support@lamourbookstore.vn" />
          </div>
          <div class="form-group">
            <label class="form-label">Địa chỉ trụ sở</label>
            <input type="text" id="settingAddress" class="form-control" value="123 Đường Sách Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh" />
          </div>
          <div class="form-group">
            <label class="form-label">Giờ mở cửa</label>
            <input type="text" id="settingOpenHours" class="form-control" value="08:00 - 22:00 (Thứ 2 - Chủ Nhật)" />
          </div>
        </div>

        <!-- CỔNG THANH TOÁN QR & MOMO -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;"><i class="fas fa-qrcode" style="color: var(--color-amber);"></i> Cổng Thanh Toán Chuyển Khoản & Ví Điện Tử</h3>
          
          <div style="font-weight: 600; color: var(--color-navy); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-university" style="color: var(--navy-700);"></i> Tài khoản Ngân hàng (VietQR)
          </div>
          <div class="form-group">
            <label class="form-label">Ngân hàng thụ hưởng</label>
            <input type="text" id="settingBankName" class="form-control" placeholder="VD: MBBank, Vietcombank, Techcombank..." />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Số tài khoản</label>
              <input type="text" id="settingBankAccountNumber" class="form-control" placeholder="Số tài khoản ngân hàng" />
            </div>
            <div class="form-group">
              <label class="form-label">Tên chủ tài khoản</label>
              <input type="text" id="settingBankAccountHolder" class="form-control" placeholder="VD: CONG TY CP SACH L AMOUR" />
            </div>
          </div>

          <!-- Khung tải ảnh mã VietQR -->
          <div class="form-group" style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 14px; margin-top: 8px;">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; color: var(--navy-800);"><i class="fas fa-qrcode" style="color: var(--navy-600);"></i> Ảnh mã QR Ngân hàng (VietQR)</span>
              <span style="font-size: 11px; color: var(--muted);">Định dạng .jpg, .png, .webp (≤ 3MB)</span>
            </label>
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="width: 140px; height: 140px; border-radius: 8px; border: 1.5px solid var(--line); background: #FFF; padding: 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); flex-shrink: 0; overflow: hidden;">
                <img id="settingBankQrPreview" src="/images/qr-bank.jpg" alt="Mã VietQR" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px; display: block;" onerror="this.src='/images/qr-bank.jpg'" />
              </div>
              <div>
                <input type="file" id="settingBankQrFile" accept="image/jpeg,image/png,image/webp,image/jpg" style="display: none;" onchange="previewSettingQr(this, 'settingBankQrPreview', 'settingBankQrFileName')" />
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('settingBankQrFile').click()" style="margin-bottom: 6px;">
                  <i class="fas fa-upload"></i> Chọn ảnh mã QR Ngân hàng
                </button>
                <div id="settingBankQrFileName" style="font-size: 12px; color: var(--muted); line-height: 1.4;">
                  Chưa chọn ảnh mới (Đang dùng ảnh hiện tại)
                </div>
              </div>
            </div>
          </div>

          <hr style="border: none; border-top: 1px solid var(--color-border); margin: 20px 0;" />

          <div style="font-weight: 600; color: #A50064; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-wallet"></i> Ví MoMo Doanh Nghiệp
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Số điện thoại ví MoMo</label>
              <input type="text" id="settingMomoPhone" class="form-control" placeholder="09xxxxxxxx" />
            </div>
            <div class="form-group">
              <label class="form-label">Tên chủ ví MoMo</label>
              <input type="text" id="settingMomoHolder" class="form-control" placeholder="Họ và tên chủ ví" />
            </div>
          </div>

          <!-- Khung tải ảnh mã MoMo QR -->
          <div class="form-group" style="background: #FDF2F8; border: 1px dashed #F472B6; border-radius: 10px; padding: 14px; margin-top: 8px;">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; color: #9D174D;"><i class="fas fa-qrcode" style="color: #BE185D;"></i> Ảnh mã QR Ví MoMo</span>
              <span style="font-size: 11px; color: var(--muted);">Định dạng .jpg, .png, .webp (≤ 3MB)</span>
            </label>
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="width: 140px; height: 140px; border-radius: 8px; border: 1.5px solid #FBCFE8; background: #FFF; padding: 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(165,0,100,0.08); flex-shrink: 0; overflow: hidden;">
                <img id="settingMomoQrPreview" src="/images/qr-momo.jpg" alt="Mã MoMo QR" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px; display: block;" onerror="this.src='/images/qr-momo.jpg'" />
              </div>
              <div>
                <input type="file" id="settingMomoQrFile" accept="image/jpeg,image/png,image/webp,image/jpg" style="display: none;" onchange="previewSettingQr(this, 'settingMomoQrPreview', 'settingMomoQrFileName')" />
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('settingMomoQrFile').click()" style="margin-bottom: 6px; border-color: #F472B6; color: #9D174D;">
                  <i class="fas fa-upload"></i> Chọn ảnh mã QR MoMo
                </button>
                <div id="settingMomoQrFileName" style="font-size: 12px; color: var(--muted); line-height: 1.4;">
                  Chưa chọn ảnh mới (Đang dùng ảnh hiện tại)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- QUẢN LÝ SLIDER BANNER TRANG CHỦ (HERO BANNERS) -->
      <!-- ========================================== -->
      <div class="card" style="margin-top: 24px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px; border-bottom: 1px solid var(--color-border); padding-bottom: 16px;">
          <div>
            <h3 class="card-title" style="margin: 0 0 6px 0; display: flex; align-items: center; gap: 10px; font-size: 18px;">
              <i class="fas fa-images" style="color: var(--color-amber);"></i> Quản Lý Slider Banner Trang Chủ (Hero Banners)
            </h3>
            <p style="font-size: 13px; color: var(--muted); margin: 0;">
              Tùy chỉnh danh sách banner trượt đầu trang chủ: thay đổi ảnh bìa/nền, huy hiệu phân loại, tiêu đề, tóm tắt và đường dẫn liên kết khi độc giả bấm vào.
            </p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="resetDefaultHeroBanners()" title="Phục hồi danh sách 4 banner sách mẫu mặc định">
              <i class="fas fa-undo"></i> Khôi phục mẫu gốc
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="addNewHeroBannerItem()">
              <i class="fas fa-plus"></i> Thêm Banner Mới
            </button>
          </div>
        </div>

        <!-- Khung danh sách banner linh hoạt -->
        <div id="heroBannersContainer" style="display: flex; flex-direction: column; gap: 18px;">
          <div style="text-align: center; padding: 30px; color: var(--muted);">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i> Đang tải danh sách banner...
          </div>
        </div>
      </div>
    </section>

    <!-- PANEL: NHẬT KÝ HOẠT ĐỘNG (AUDIT LOG) -->
    <section class="tab-panel" id="tab-audit-logs">
      <div class="panel-header">
        <div>
          <h2 class="panel-title"><i class="fas fa-clipboard-list" style="color: var(--color-amber);"></i> Nhật Ký Hoạt Động Hệ Thống</h2>
          <p class="panel-subtitle">Theo dõi truy vết toàn bộ hoạt động đăng nhập, sửa giá sách, thay đổi phân quyền, duyệt kho và cấu hình ngân hàng</p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="markAllAuditLogsAsRead()" title="Đánh dấu tất cả thông báo nhật ký là đã xem"><i class="fas fa-check-double" style="color: var(--color-amber);"></i> Đã xem tất cả</button>
          <button class="btn btn-secondary" onclick="exportAuditLogsCsv()"><i class="fas fa-file-excel" style="color:#10B981;"></i> Xuất file CSV</button>
          <button class="btn btn-primary" onclick="loadAuditLogs(1)"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
      </div>

      <!-- KPI STATS CARDS (Click để lọc nhanh) -->
      <style>
        .audit-kpi-card {
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          position: relative;
        }
        .audit-kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(10, 25, 48, 0.08) !important;
        }
        .audit-kpi-card.audit-kpi-active {
          box-shadow: 0 0 0 2px var(--navy-900), 0 8px 20px rgba(10, 25, 48, 0.12) !important;
          transform: translateY(-2px) !important;
          background: #FFFFFF !important;
        }
      </style>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
        <div id="auditCard_today" class="card audit-kpi-card" onclick="quickFilterAuditKpi('today')" title="Bấm để lọc các sự kiện diễn ra hôm nay" style="padding: 16px; border-left: 4px solid #3B82F6;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: var(--navy-800); font-weight: 600;">Hôm nay</span>
            <span style="background: #EFF6FF; color: #2563EB; padding: 4px 8px; border-radius: 6px; font-size: 13px;"><i class="fas fa-calendar-day"></i></span>
          </div>
          <div id="auditStatToday" style="font-size: 26px; font-weight: 700; color: var(--navy-900); margin-top: 8px;">0</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Sự kiện 24h qua</div>
        </div>

        <div id="auditCard_critical" class="card audit-kpi-card" onclick="quickFilterAuditKpi('critical')" title="Bấm để lọc các sự kiện Nghiêm trọng (7 ngày qua)" style="padding: 16px; border-left: 4px solid #EF4444;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #DC2626; font-weight: 600;">Nghiêm trọng (7 ngày)</span>
            <span style="background: #FEE2E2; color: #DC2626; padding: 4px 8px; border-radius: 6px; font-size: 13px;"><i class="fas fa-exclamation-triangle"></i></span>
          </div>
          <div id="auditStatCritical" style="font-size: 26px; font-weight: 700; color: #DC2626; margin-top: 8px;">0</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Sửa STK, đổi quyền Admin...</div>
        </div>

        <div id="auditCard_warning" class="card audit-kpi-card" onclick="quickFilterAuditKpi('warning')" title="Bấm để lọc các sự kiện Cảnh báo (7 ngày qua)" style="padding: 16px; border-left: 4px solid #F59E0B;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #D97706; font-weight: 600;">Cảnh báo (7 ngày)</span>
            <span style="background: #FEF3C7; color: #D97706; padding: 4px 8px; border-radius: 6px; font-size: 13px;"><i class="fas fa-bell"></i></span>
          </div>
          <div id="auditStatWarning" style="font-size: 26px; font-weight: 700; color: #D97706; margin-top: 8px;">0</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Đăng nhập sai, sửa giá sách...</div>
        </div>

        <div id="auditCard_total" class="card audit-kpi-card" onclick="quickFilterAuditKpi('total')" title="Bấm để xem tất cả nhật ký hệ thống" style="padding: 16px; border-left: 4px solid #10B981;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #059669; font-weight: 600;">Tổng số nhật ký</span>
            <span style="background: #ECFDF5; color: #059669; padding: 4px 8px; border-radius: 6px; font-size: 13px;"><i class="fas fa-database"></i></span>
          </div>
          <div id="auditStatTotal" style="font-size: 26px; font-weight: 700; color: var(--navy-900); margin-top: 8px;">0</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Toàn bộ bản ghi lưu trữ</div>
        </div>
      </div>

      <!-- BỘ LỌC ĐA NĂNG -->
      <div class="card card-overflow-visible" style="margin-bottom: 20px; padding: 18px; overflow: visible !important; position: relative; z-index: 60;">
        <div style="display: grid; grid-template-columns: 1.8fr 1.3fr 1.2fr 1.1fr 1.1fr auto; gap: 12px; align-items: flex-end; overflow: visible !important;">
          <div>
            <label class="form-label" style="font-size: 12px; font-weight: 600;">Tìm kiếm từ khóa</label>
            <div style="position: relative;">
              <input type="text" id="auditFilterSearch" class="form-control" placeholder="Tìm theo tên, email, mô tả, IP..." onkeydown="if(event.key==='Enter') filterAuditLogs()" oninput="debounceAuditLogs()" />
            </div>
          </div>

          <div style="position: relative; overflow: visible !important;">
            <label class="form-label" style="font-size: 12px; font-weight: 600;">Phân hệ</label>
            <select id="auditFilterModule" class="form-control" onchange="filterAuditLogs()">
              <option value="ALL">Tất cả phân hệ</option>
              <option value="AUTH">Xác thực & Đăng nhập (AUTH)</option>
              <option value="USERS">Tài khoản & Phân quyền (USERS)</option>
              <option value="BOOKS">Sách & Danh mục (BOOKS)</option>
              <option value="ORDERS">Đơn hàng (ORDERS)</option>
              <option value="INVENTORY">Kho & Logistics (INVENTORY)</option>
              <option value="ACCOUNTING">Kế toán & Thu chi (ACCOUNTING)</option>
              <option value="SETTINGS">Cài đặt hệ thống (SETTINGS)</option>
              <option value="SYSTEM">Hệ thống & An ninh (SYSTEM)</option>
            </select>
          </div>

          <div style="position: relative; overflow: visible !important;">
            <label class="form-label" style="font-size: 12px; font-weight: 600;">Mức độ</label>
            <select id="auditFilterSeverity" class="form-control" onchange="filterAuditLogs()">
              <option value="ALL">Tất cả mức độ</option>
              <option value="INFO">🟢 Thông thường (INFO)</option>
              <option value="WARNING">🟡 Cảnh báo (WARNING)</option>
              <option value="CRITICAL">🔴 Nghiêm trọng (CRITICAL)</option>
            </select>
          </div>

          <div>
            <label class="form-label" style="font-size: 12px; font-weight: 600;">Từ ngày</label>
            <input type="date" id="auditFilterStartDate" class="form-control" onchange="filterAuditLogs()" />
          </div>

          <div>
            <label class="form-label" style="font-size: 12px; font-weight: 600;">Đến ngày</label>
            <input type="date" id="auditFilterEndDate" class="form-control" onchange="filterAuditLogs()" />
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" onclick="filterAuditLogs()"><i class="fas fa-filter"></i> Lọc</button>
            <button class="btn btn-secondary" onclick="resetAuditLogFilters()" title="Đặt lại bộ lọc"><i class="fas fa-undo"></i></button>
          </div>
        </div>
      </div>

      <!-- BẢNG NHẬT KÝ HOẠT ĐỘNG -->
      <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 2px 8px rgba(10,25,48,0.04); position: relative; z-index: 10;">
        <div id="auditLogsTableContainer" style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;">
          <table class="table" id="auditLogsTable" style="width: 100%; min-width: 1520px; margin: 0; border-collapse: collapse;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1.5px solid var(--line); font-size: 12px; text-transform: uppercase; color: var(--navy-700); letter-spacing: 0.5px;">
                <th style="padding: 14px 16px; text-align: left; min-width: 140px; white-space: nowrap;">Thời gian</th>
                <th style="padding: 14px 16px; text-align: left; min-width: 210px; white-space: nowrap;">Người thực hiện</th>
                <th style="padding: 14px 16px; text-align: center; min-width: 130px; white-space: nowrap;">Vai trò</th>
                <th style="padding: 14px 16px; text-align: center; min-width: 130px; white-space: nowrap;">Phân hệ</th>
                <th style="padding: 14px 16px; text-align: left; min-width: 480px;">Mô tả hành động</th>
                <th style="padding: 14px 16px; text-align: center; min-width: 130px; white-space: nowrap;">Mức độ</th>
                <th style="padding: 14px 16px; text-align: center; min-width: 130px; white-space: nowrap;">Địa chỉ IP</th>
                <th style="padding: 14px 16px; text-align: center; min-width: 100px; white-space: nowrap;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="auditLogsTableBody">
              <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--muted); white-space: nowrap;">
                  <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--color-amber); margin-bottom: 8px;"></i>
                  <div>Đang tải dữ liệu nhật ký hoạt động...</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PHÂN TRANG -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #F8FAFC; border-top: 1px solid var(--line);">
          <div id="auditPaginationInfo" style="font-size: 13px; color: var(--muted);">
            Đang hiển thị 0 / 0 bản ghi
          </div>
          <div id="auditPaginationBtns" style="display: flex; gap: 6px; align-items: center;">
            <!-- Render động các nút trang -->
          </div>
        </div>
      </div>
    </section>

    <!-- PANEL: SAO LƯU & PHỤC HỒI DỮ LIỆU -->
    <section class="tab-panel" id="tab-backup-restore">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Sao Lưu & Phục Hồi Dữ Liệu</h2>
          <p class="panel-subtitle">Quản lý điểm khôi phục dữ liệu, tạo bản sao lưu toàn diện và phục hồi CSDL khi có sự cố</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-secondary" onclick="openBackupConfigModal()">
            <i class="fas fa-clock"></i> Cấu hình tự động
          </button>
          <button class="btn btn-secondary" onclick="openUploadRestoreModal()" style="border-color: #F59E0B; color: #D97706;">
            <i class="fas fa-file-upload"></i> Phục hồi từ file tải lên
          </button>
          <button class="btn btn-primary" onclick="openCreateBackupModal()">
            <i class="fas fa-shield-alt"></i> Tạo bản sao lưu mới
          </button>
        </div>
      </div>

      <!-- 4 KPI CARDS THỐNG KÊ SAO LƯU -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
        <div class="card audit-kpi-card" onclick="quickFilterBackupType('MANUAL')" title="Bấm để lọc bản sao lưu Thủ công" style="padding: 16px; border-left: 4px solid #3B82F6; cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: var(--navy-800); font-weight: 600;">Lần sao lưu gần nhất</span>
            <span style="background: #EFF6FF; color: #2563EB; padding: 4px 8px; border-radius: 6px; font-size: 13px;"><i class="fas fa-history"></i></span>
          </div>
          <div id="backupStatLastTime" style="font-size: 18px; font-weight: 700; color: var(--navy-900); margin-top: 8px;">Chưa có</div>
          <div id="backupStatLastDetail" style="font-size: 12px; color: var(--muted); margin-top: 4px;">Dung lượng: 0 MB</div>
        </div>

        <div class="card audit-kpi-card" onclick="quickFilterBackupType('ALL')" title="Bấm để xem tất cả bản sao lưu" style="padding: 16px; border-left: 4px solid #10B981; cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #059669; font-weight: 600;">Tổng bản lưu trữ</span>
            <span style="background: #ECFDF5; color: #059669; padding: 4px 8px; border-radius: 6px; font-size: 13px;"><i class="fas fa-archive"></i></span>
          </div>
          <div id="backupStatTotal" style="font-size: 26px; font-weight: 700; color: var(--navy-900); margin-top: 8px;">0</div>
          <div id="backupStatBreakdown" style="font-size: 12px; color: var(--muted); margin-top: 4px;">Thủ công: 0 | Tự động: 0</div>
        </div>

        <div class="card" style="padding: 16px; border-left: 4px solid #8B5CF6;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #7C3AED; font-weight: 600;">Dung lượng chiếm dụng</span>
            <span style="background: #F5F3FF; color: #7C3AED; padding: 4px 8px; border-radius: 6px; font-size: 13px;"><i class="fas fa-hdd"></i></span>
          </div>
          <div id="backupStatTotalSize" style="font-size: 26px; font-weight: 700; color: var(--navy-900); margin-top: 8px;">0.00 MB</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">Tổng kích thước file ZIP</div>
        </div>

        <div class="card audit-kpi-card" onclick="quickFilterBackupType('SCHEDULED')" title="Bấm để lọc bản sao lưu Tự động định kỳ" style="padding: 16px; border-left: 4px solid #F59E0B; cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #D97706; font-weight: 600;">Tự động định kỳ</span>
            <span style="background: #FEF3C7; color: #D97706; padding: 4px 8px; border-radius: 6px; font-size: 13px;"><i class="fas fa-clock"></i></span>
          </div>
          <div id="backupStatAutoStatus" style="font-size: 18px; font-weight: 700; color: #059669; margin-top: 8px;">Đang BẬT</div>
          <div id="backupStatAutoDetail" style="font-size: 12px; color: var(--muted); margin-top: 4px;">Chạy lúc 02:00 mỗi ngày</div>
        </div>
      </div>

      <!-- BỘ LỌC TÌM KIẾM BẢN SAO LƯU -->
      <div class="card" style="margin-bottom: 20px; padding: 16px; overflow: visible !important; position: relative; z-index: 50;">
        <div style="display: grid; grid-template-columns: 1.8fr 1.3fr 1.1fr 1.1fr auto; gap: 12px; align-items: flex-end; overflow: visible !important;">
          <div>
            <label class="form-label" style="font-size: 12px; font-weight: 600;">Tìm kiếm bản sao lưu</label>
            <input type="text" id="backupSearchInput" class="form-control" placeholder="Tìm theo mã BKP, tên file, ghi chú..." onkeydown="if(event.key==='Enter') loadBackupList(1)" />
          </div>
          <div style="position: relative; overflow: visible !important;">
            <label class="form-label" style="font-size: 12px; font-weight: 600;">Phân loại bản sao lưu</label>
            <select id="backupTypeFilter" class="form-control" onchange="loadBackupList(1)">
              <option value="ALL">Tất cả loại sao lưu</option>
              <option value="MANUAL">Thủ công (Manual)</option>
              <option value="SCHEDULED">Tự động định kỳ (Scheduled)</option>
              <option value="PRE_RESTORE_SNAPSHOT">Snapshot cứu hộ (Pre-restore)</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 12px; font-weight: 600;"><i class="far fa-calendar-alt"></i> Từ ngày tạo</label>
            <input type="date" id="backupFilterStartDate" class="form-control" onchange="loadBackupList(1)" />
          </div>
          <div>
            <label class="form-label" style="font-size: 12px; font-weight: 600;"><i class="far fa-calendar-alt"></i> Đến ngày tạo</label>
            <input type="date" id="backupFilterEndDate" class="form-control" onchange="loadBackupList(1)" />
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" onclick="loadBackupList(1)"><i class="fas fa-search"></i> Lọc</button>
            <button class="btn btn-secondary" onclick="resetBackupFilters()" title="Làm mới"><i class="fas fa-sync-alt"></i></button>
          </div>
        </div>
      </div>

      <!-- BẢNG DANH SÁCH BẢN SAO LƯU -->
      <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 2px 8px rgba(10,25,48,0.04);">
        <div id="backupTableContainer" style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;">
          <table class="table" id="backupTable" style="width: 100%; min-width: 1560px; margin: 0; border-collapse: collapse;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1.5px solid var(--line); font-size: 12px; text-transform: uppercase; color: var(--navy-700); letter-spacing: 0.5px;">
                <th style="padding: 14px 16px; text-align: left; width: 220px; min-width: 220px;">Mã bản sao lưu</th>
                <th style="padding: 14px 16px; text-align: left; min-width: 380px;">Tên tệp & Ghi chú</th>
                <th style="padding: 14px 16px; text-align: center; width: 140px; min-width: 140px;">Phân loại</th>
                <th style="padding: 14px 16px; text-align: center; width: 120px; min-width: 120px;">Phạm vi</th>
                <th style="padding: 14px 16px; text-align: left; width: 260px; min-width: 260px;">Thời gian tạo</th>
                <th style="padding: 14px 16px; text-align: right; width: 130px; min-width: 130px;">Dung lượng</th>
                <th style="padding: 14px 16px; text-align: right; width: 130px; min-width: 130px;">Tổng bản ghi</th>
                <th style="padding: 14px 16px; text-align: center; width: 180px; min-width: 180px;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="backupListTableBody">
              <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--muted);">
                  <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--color-amber); margin-bottom: 8px;"></i>
                  <div>Đang tải danh sách bản sao lưu...</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PHÂN TRANG -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #F8FAFC; border-top: 1px solid var(--line);">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div id="backupPaginationInfo" style="font-size: 13px; color: var(--muted);">
              Đang hiển thị 0 / 0 bản ghi
            </div>
            <div style="font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-arrows-alt-h" style="color: #94A3B8;"></i>
              <span>Cuộn ngang để xem trọn vẹn thông tin</span>
            </div>
          </div>
          <div id="backupPaginationBtns" style="display: flex; gap: 6px; align-items: center;">
            <!-- Render động nút phân trang -->
          </div>
        </div>
      </div>
    </section>
`;


