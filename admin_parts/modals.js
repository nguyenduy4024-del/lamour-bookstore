module.exports = `
  <!-- ========================================== -->
  <!-- TOAST NOTIFICATION CONTAINER -->
  <!-- ========================================== -->
  <div class="toast-container" id="toastContainer"></div>

  <!-- CONFIRM OVERLAY -->
  <div class="modal-overlay" id="confirmModalOverlay" style="z-index: 1200;">
    <div class="modal-content" style="max-width: 440px; text-align: center;">
      <div style="font-size: 2.5rem; color: var(--color-amber); margin-bottom: 12px;">
        <i class="fas fa-question-circle"></i>
      </div>
      <h3 style="font-family: var(--font-heading); margin-bottom: 8px;" id="confirmModalTitle">Xác nhận thao tác</h3>
      <p style="color: var(--color-text-muted); margin-bottom: 24px;" id="confirmModalMessage">Bạn có chắc chắn muốn thực hiện hành động này?</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn btn-secondary" onclick="closeConfirmModal()">Hủy bỏ</button>
        <button class="btn btn-primary" id="confirmModalOkBtn">Đồng ý</button>
      </div>
    </div>
  </div>

  <!-- MODAL: PHÂN QUYỀN TÀI KHOẢN -->
  <div class="modal-overlay" id="accountRoleModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Phân Quyền Tài Khoản</h3>
        <button class="modal-close" onclick="closeModal('accountRoleModal')">&times;</button>
      </div>
      <input type="hidden" id="roleUserId" />
      <div class="form-group">
        <label class="form-label">Tài khoản người dùng</label>
        <input type="text" id="roleUserName" class="form-control" readonly disabled />
      </div>
      <div class="form-group">
        <label class="form-label">Vai trò hệ thống</label>
        <select id="roleUserSelect" class="form-control">
          <option value="admin">Quản trị viên (Admin)</option>
          <option value="staff">Nhân viên bán hàng (Staff)</option>
          <option value="stock">Thủ kho (Stock)</option>
          <option value="accountant">Kế toán (Accountant)</option>
          <option value="user">Khách hàng thông thường (User)</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('accountRoleModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitUserRole()">Cập nhật quyền</button>
      </div>
    </div>
  </div>

  <!-- MODAL: ĐẶT LẠI MẬT KHẨU TÀI KHOẢN -->
  <div class="modal-overlay" id="accountResetPwdModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Đặt Lại Mật Khẩu Tài Khoản</h3>
        <button class="modal-close" onclick="closeModal('accountResetPwdModal')">&times;</button>
      </div>
      <input type="hidden" id="resetPwdUserId" />
      <div class="form-group">
        <label class="form-label">Tài khoản</label>
        <input type="text" id="resetPwdUserName" class="form-control" readonly disabled />
      </div>
      <div class="form-group">
        <label class="form-label">Mật khẩu mới (Tối thiểu 6 ký tự)</label>
        <input type="password" id="resetPwdNewPassword" class="form-control" placeholder="Nhập mật khẩu mới..." />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('accountResetPwdModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitResetPassword()">Xác nhận đổi mật khẩu</button>
      </div>
    </div>
  </div>

  <!-- MODAL: HỒ SƠ NHÂN VIÊN -->
  <div class="modal-overlay" id="employeeModal">
    <div class="modal-content" style="max-width: 620px;">
      <div class="modal-header">
        <h3 class="modal-title" id="employeeModalTitle">Thêm Nhân Viên Mới</h3>
        <button class="modal-close" onclick="closeModal('employeeModal')">&times;</button>
      </div>
      <input type="hidden" id="employeeId" />
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Họ và tên nhân viên <span style="color: var(--color-red);">*</span></label>
          <input type="text" id="empName" class="form-control" placeholder="VD: Nguyễn Văn An" />
        </div>
        <div class="form-group">
          <label class="form-label">Số điện thoại (9-10 số, bắt đầu bằng 0) <span style="color: var(--color-red);">*</span></label>
          <input type="text" id="empPhone" class="form-control" placeholder="09xxxxxxxx" />
        </div>
      </div>
      <div class="form-group" id="empEmailGroup">
        <label class="form-label">Email đăng nhập <span style="color: var(--color-red);">*</span></label>
        <input type="email" id="empEmail" class="form-control" placeholder="nhanvien@lamour.vn" />
      </div>
      <div class="form-group" id="empPasswordGroup">
        <label class="form-label">Mật khẩu khởi tạo <span style="color: var(--color-red);">*</span></label>
        <input type="password" id="empPassword" class="form-control" placeholder="Tối thiểu 6 ký tự" />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Ca làm việc</label>
          <select id="empShift" class="form-control">
            <option value="Ca sáng (08:00 - 16:00)">Ca sáng (08:00 - 16:00)</option>
            <option value="Ca chiều (14:00 - 22:00)">Ca chiều (14:00 - 22:00)</option>
            <option value="Ca tối (18:00 - 23:00)">Ca tối (18:00 - 23:00)</option>
            <option value="Hành chính (08:00 - 17:30)">Hành chính (08:00 - 17:30)</option>
            <option value="Toàn thời gian (Fulltime)">Toàn thời gian (Fulltime)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Vai trò hệ thống</label>
          <select id="empRole" class="form-control">
            <option value="staff">Nhân viên bán hàng (Staff)</option>
            <option value="stock">Thủ kho (Stock)</option>
            <option value="accountant">Kế toán (Accountant)</option>
            <option value="admin">Quản trị viên (Admin)</option>
          </select>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr; gap: 14px;" id="empStatusGroup">
        <div class="form-group">
          <label class="form-label">Trạng thái làm việc</label>
          <select id="empStatus" class="form-control">
            <option value="active">Đang làm việc</option>
            <option value="blocked">Đã nghỉ việc / Khóa</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('employeeModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitEmployeeForm()">Lưu thông tin nhân viên</button>
      </div>
    </div>
  </div>

  <!-- MODAL: THÊM KHÁCH HÀNG MỚI (CRM) -->
  <div class="modal-overlay" id="customerModal">
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title" id="customerModalTitle">Thêm Khách Hàng Mới</h3>
        <button class="modal-close" onclick="closeModal('customerModal')">&times;</button>
      </div>
      <form id="customerForm" onsubmit="event.preventDefault(); submitCustomerForm();">
        <input type="hidden" id="customerId" value="" />
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label">Họ và tên khách hàng <span style="color: var(--color-red);">*</span></label>
            <input type="text" id="custName" class="form-control" placeholder="VD: Trần Hoàng Nam" required />
          </div>
          <div class="form-group">
            <label class="form-label">Số điện thoại (9-10 số, bắt đầu bằng 0) <span style="color: var(--color-red);">*</span></label>
            <input type="text" id="custPhone" class="form-control" placeholder="09xxxxxxxx" required />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label">Email (nhận hóa đơn / tài khoản)</label>
            <input type="email" id="custEmail" class="form-control" placeholder="khachhang@gmail.com (tùy chọn)" />
          </div>
          <div class="form-group">
            <label class="form-label" id="custPasswordLabel">Mật khẩu khởi tạo</label>
            <input type="text" id="custPassword" class="form-control" value="123456" placeholder="Mặc định: 123456" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label">Giới tính</label>
            <select id="custGender" class="form-control">
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ngày sinh</label>
            <input type="date" id="custBirthday" class="form-control" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Địa chỉ nhận hàng / liên hệ</label>
          <input type="text" id="custAddress" class="form-control" placeholder="VD: 123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM" />
        </div>
        <div class="form-group">
          <label class="form-label">Trạng thái tài khoản</label>
          <select id="custStatus" class="form-control">
            <option value="active">Hoạt động bình thường</option>
            <option value="blocked">Tạm khóa tài khoản</option>
          </select>
        </div>
        <div class="modal-footer" style="padding-top:14px; margin-top:8px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('customerModal')">Hủy</button>
          <button type="submit" class="btn btn-primary" id="custSubmitBtn"><i class="fas fa-save"></i> Lưu thông tin khách hàng</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: LỊCH SỬ ĐƠN HÀNG KHÁCH HÀNG -->
  <div class="modal-overlay" id="customerOrdersModal">
    <div class="modal-content" style="max-width: 980px; width: 95%;">
      <div class="modal-header">
        <div>
          <h3 class="modal-title" id="customerOrdersModalTitle">Lịch Sử Mua Hàng</h3>
          <div id="customerOrdersModalSubtitle" style="font-size: 12.5px; color: var(--muted); margin-top: 3px;">Theo dõi danh sách đơn mua và chi tiết các sản phẩm của khách hàng</div>
        </div>
        <button class="modal-close" onclick="closeModal('customerOrdersModal')">&times;</button>
      </div>
      <div class="table-container" style="max-height: 520px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th style="min-width: 100px;">Mã đơn</th>
              <th style="min-width: 95px; text-align: center;">Kênh mua</th>
              <th style="min-width: 120px;">Ngày đặt</th>
              <th style="min-width: 300px;">Sản phẩm đã mua (Ảnh & Tên)</th>
              <th style="min-width: 110px;">Tổng tiền</th>
              <th style="min-width: 105px;">PTTT</th>
              <th style="min-width: 115px;">Trạng thái</th>
              <th style="min-width: 85px; text-align: right;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="customerOrdersTableBody">
            <tr><td colspan="8" class="empty-cell">Đang tải lịch sử đơn...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
        <div id="customerOrdersSummary" style="font-size: 12.5px; color: var(--muted); font-weight: 500;"></div>
        <button class="btn btn-secondary" onclick="closeModal('customerOrdersModal')">Đóng</button>
      </div>
    </div>
  </div>

  <!-- MODAL: THÊM / SỬA SÁCH -->
  <div class="modal-overlay" id="bookModal">
    <div class="modal-content" style="max-width: 720px; overflow-x: hidden;">
      <div class="modal-header">
        <h3 class="modal-title" id="bookModalTitle">Thêm Đầu Sách Mới</h3>
        <button class="modal-close" onclick="closeModal('bookModal')">&times;</button>
      </div>
      <input type="hidden" id="bookFormId" />
      <div style="display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 14px; width: 100%;">
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label">Tên sách <span style="color: var(--color-red);">*</span></label>
          <input type="text" id="bookFormTitle" class="form-control" placeholder="Nhập tên sách..." />
        </div>
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label">Mã ISBN</label>
          <input type="text" id="bookFormIsbn" class="form-control" placeholder="VD: 978-604-..." />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; width: 100%;">
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label">Tác giả</label>
          <input type="text" id="bookFormAuthor" class="form-control" placeholder="Tên tác giả" />
        </div>
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label">Thể loại</label>
          <select id="bookFormCategory" class="form-control" style="width: 100%; max-width: 100%; min-width: 0;">
            <option value="Tâm lý & Kỹ năng sống">Tâm lý & Kỹ năng sống</option>
            <option value="Kinh tế & Quản trị">Kinh tế & Quản trị</option>
            <option value="Văn học Kinh điển & Thế giới">Văn học Kinh điển & Thế giới</option>
            <option value="Văn học Việt Nam & Tác phẩm chọn lọc">Văn học Việt Nam & Tác phẩm chọn lọc</option>
            <option value="Khoa học & Tri thức">Khoa học & Tri thức</option>
            <option value="Văn học Thiếu nhi">Văn học Thiếu nhi</option>
            <option value="Trinh thám & Bí ẩn">Trinh thám & Bí ẩn</option>
            <option value="Tâm linh & Nghệ thuật sống">Tâm linh & Nghệ thuật sống</option>
          </select>
        </div>
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="margin-bottom: 0;">Nhà cung cấp / NXB</label>
            <a href="javascript:void(0)" onclick="openSupplierModal()" style="font-size: 11.5px; color: var(--color-primary); text-decoration: none; font-weight: 600;" title="Thêm đối tác nhà cung cấp mới">
              <i class="fas fa-plus-circle"></i> Thêm NCC mới
            </a>
          </div>
          <select id="bookFormSupplier" class="form-control" data-align="right" style="width: 100%; max-width: 100%; min-width: 0;">
            <option value="">-- Chọn Nhà Cung Cấp / NXB --</option>
          </select>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; width: 100%;">
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label">Giá niêm yết (VNĐ) <span style="color: var(--color-red);">*</span></label>
          <input type="number" id="bookFormPrice" class="form-control" min="0" />
        </div>
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label">Giá vốn ước tính (VNĐ)</label>
          <input type="number" id="bookFormCost" class="form-control" min="0" />
        </div>
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label">Số lượng tồn kho</label>
          <input type="number" id="bookFormStock" class="form-control" min="0" />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; width: 100%;">
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Vị trí kệ sách (Sức chứa vật lý)">Vị trí kệ sách (Sức chứa vật lý)</label>
          <select id="bookShelfSelect" name="shelf" class="form-control" style="width: 100%; max-width: 100%; min-width: 0; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            <option value="">-- Chọn vị trí kệ --</option>
          </select>
        </div>
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Trạng thái kinh doanh">Trạng thái kinh doanh</label>
          <select id="bookFormStatus" class="form-control" style="width: 100%; max-width: 100%; min-width: 0;">
            <option value="active">Đang kinh doanh (Mở bán)</option>
            <option value="hidden">Đã ẩn / Ngừng kinh doanh</option>
          </select>
        </div>
        <div class="form-group" style="min-width: 0; max-width: 100%;">
          <label class="form-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Tình trạng ảnh bìa">Tình trạng ảnh bìa</label>
          <div id="bookCoverStatusText" style="font-size: 12px; color: var(--navy-700); padding: 8px 12px; background: #F1F5F9; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; height: 38px; display: flex; align-items: center; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;">
            Chưa chọn ảnh
          </div>
        </div>
      </div>

      <!-- KHU VỰC CHỌN ẢNH BÌA TỪ MÁY TÍNH -->
      <div class="form-group" style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
        <label class="form-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <span><i class="fas fa-image" style="color: var(--color-primary);"></i> Ảnh bìa sách</span>
          <span style="font-size: 11px; font-weight: normal; color: var(--muted);">Tải ảnh bìa trực tiếp từ máy tính</span>
        </label>
        
        <input type="hidden" id="bookFormImage" />
        <input type="file" id="bookCoverFileInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display: none;" onchange="handleBookCoverUpload(this)" />

        <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
          <!-- Preview Box -->
          <div id="bookCoverPreviewContainer" style="width: 78px; height: 108px; border-radius: 6px; border: 1px solid var(--line); background: #fff; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 2px 6px rgba(0,0,0,0.06); flex-shrink: 0;">
            <img id="bookCoverPreviewImg" src="/images/covers/default-book.svg" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="handleImgError(this)" />
            <div id="bookCoverLoadingOverlay" style="display: none; position: absolute; inset: 0; background: rgba(255,255,255,0.85); align-items: center; justify-content: center; font-size: 14px; color: var(--color-primary);"><i class="fas fa-spinner fa-spin"></i></div>
          </div>

          <!-- Action Buttons -->
          <div style="flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('bookCoverFileInput').click()" style="display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-upload"></i> Chọn ảnh từ máy tính
              </button>
              <button type="button" class="btn btn-sm" onclick="removeBookCover()" style="background: transparent; color: var(--danger); border: 1px solid #FECACA; padding: 4px 10px;" title="Xóa ảnh bìa">
                <i class="fas fa-trash-alt"></i> Xóa
              </button>
            </div>
            <div style="font-size: 11.5px; color: var(--muted); line-height: 1.4;">
              • Hỗ trợ tải file từ máy tính (định dạng JPG, PNG, WEBP, GIF, tối đa 10MB).<br/>
              • Ảnh được tải lên sẽ tự động hiển thị làm bìa sách.
            </div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả tác phẩm</label>
        <textarea id="bookFormDescription" class="form-control" rows="3" placeholder="Tóm tắt nội dung sách..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('bookModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitBookForm()">Lưu thông tin sách</button>
      </div>
    </div>
  </div>

  <!-- MODAL: THÊM / SỬA TÁC GIẢ -->
  <div class="modal-overlay" id="authorModal">
    <div class="modal-content" style="max-width: 540px;">
      <div class="modal-header">
        <h3 class="modal-title" id="authorModalTitle"><i class="fas fa-pen-nib" style="color: var(--color-amber);"></i> Thêm Tác Giả</h3>
        <button class="modal-close" onclick="closeModal('authorModal')">&times;</button>
      </div>
      <input type="hidden" id="authorId" />

      <!-- KHUNG CHỌN ẢNH CHÂN DUNG TÁC GIẢ -->
      <div style="display: flex; gap: 16px; align-items: center; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
        <div style="width: 72px; height: 72px; border-radius: 50%; overflow: hidden; border: 2px solid var(--color-amber, #C7A15A); background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); position: relative;">
          <img id="authorAvatarPreview" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'" />
          <div id="authorAvatarLoading" style="display: none; position: absolute; inset: 0; background: rgba(255,255,255,0.85); align-items: center; justify-content: center; font-size: 14px; color: var(--color-primary);"><i class="fas fa-spinner fa-spin"></i></div>
        </div>
        <input type="hidden" id="authorAvatar" />
        <input type="file" id="authorAvatarFileInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display: none;" onchange="handleAuthorAvatarUpload(this)" />
        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
          <div style="font-size: 12px; font-weight: 600; color: var(--navy-900);">Ảnh chân dung đại diện</div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('authorAvatarFileInput').click()" style="display: inline-flex; align-items: center; gap: 6px;">
              <i class="fas fa-upload"></i> Chọn ảnh từ máy
            </button>
            <button type="button" class="btn btn-sm" onclick="removeAuthorAvatar()" style="background: transparent; color: var(--danger); border: 1px solid #FECACA; padding: 4px 8px;">
              <i class="fas fa-trash-alt"></i> Xóa
            </button>
          </div>
          <div style="font-size: 11px; color: var(--muted);">Hỗ trợ file JPG, PNG, WEBP tối đa 5MB</div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tên tác giả <span style="color: var(--color-red);">*</span></label>
        <input type="text" id="authorName" class="form-control" placeholder="VD: Nguyễn Nhật Ánh, Haruki Murakami..." />
      </div>

      <div class="form-group">
        <label class="form-label">Thể loại sở trường / Phong cách nghệ thuật</label>
        <input type="text" id="authorGenre" class="form-control" placeholder="VD: Tuổi thơ & Ký ức, Văn học hiện thực..." />
      </div>

      <div class="form-group">
        <label class="form-label">Trích dẫn / Châm ngôn tiêu biểu (Hiển thị nổi bật ở trang chủ)</label>
        <textarea id="authorQuote" class="form-control" rows="2" placeholder="Câu nói nổi tiếng hoặc trích dẫn hay từ tác phẩm..."></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Tiểu sử ngắn</label>
        <textarea id="authorBio" class="form-control" rows="2" placeholder="Năm sinh, quê quán, dấu ấn sự nghiệp văn chương..."></textarea>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('authorModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitAuthorForm()"><i class="fas fa-save"></i> Lưu tác giả</button>
      </div>
    </div>
  </div>

  <!-- MODAL: THÊM / SỬA THỂ LOẠI -->
  <div class="modal-overlay" id="categoryModal">
    <div class="modal-content" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title" id="categoryModalTitle"><i class="fas fa-tags" style="color: var(--color-amber);"></i> Thêm Thể Loại Sách</h3>
        <button class="modal-close" onclick="closeModal('categoryModal')">&times;</button>
      </div>
      <input type="hidden" id="categoryId" />
      <div class="form-group">
        <label class="form-label">Tên thể loại <span style="color: var(--color-red);">*</span></label>
        <input type="text" id="categoryName" class="form-control" placeholder="VD: Văn học thiếu nhi, Kinh tế..." />
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả thể loại</label>
        <textarea id="categoryDescription" class="form-control" rows="3" placeholder="Đặc điểm, nội dung trọng tâm của thể loại..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('categoryModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitCategoryForm()"><i class="fas fa-save"></i> Lưu thể loại</button>
      </div>
    </div>
  </div>

  <!-- MODAL: CHI TIẾT ĐƠN HÀNG & CẬP NHẬT TRẠNG THÁI -->
  <div class="modal-overlay" id="orderDetailModal">
    <div class="modal-content" style="max-width: 780px;">
      <div class="modal-header">
        <h3 class="modal-title" id="orderDetailTitle">Chi Tiết Đơn Hàng</h3>
        <button class="modal-close" onclick="closeModal('orderDetailModal')">&times;</button>
      </div>
      <div id="orderDetailContent">
        <!-- Đổ dữ liệu động -->
      </div>
      <div class="modal-footer" id="orderDetailActions">
        <button class="btn btn-secondary" onclick="closeModal('orderDetailModal')">Đóng</button>
      </div>
    </div>
  </div>

  <!-- MODAL: TIẾP NHẬN & GIÁM ĐỊNH HÀNG HOÀN TRẢ (BƯỚC 2 & BƯỚC 3 QUY TRÌNH) -->
  <div class="modal-overlay" id="inspectReturnModal">
    <div class="modal-content" style="max-width: 540px;">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-clipboard-check" style="color: var(--color-amber);"></i> Giám Định & Quyết Định Hoàn Tiền</h3>
        <button class="modal-close" onclick="closeModal('inspectReturnModal')">&times;</button>
      </div>
      <input type="hidden" id="inspectOrderId" />
      
      <div style="background: #FAF7F2; padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--color-border);">
        <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px;" id="inspectOrderCode">Đơn hàng #...</div>
        <div style="font-size: 0.85rem; color: var(--color-text-muted);" id="inspectOrderRefundReason">Lý do hoàn: ...</div>
      </div>

      <div class="form-group">
        <label class="form-label">Kết quả thẩm định sản phẩm hoàn <span style="color: var(--color-red);">*</span></label>
        <select id="inspectConditionSelect" class="form-control" onchange="toggleInspectRefundFields()">
          <option value="passed">Đạt chuẩn (Sách còn nguyên vẹn, đủ điều kiện hoàn tiền)</option>
          <option value="rejected">Từ chối (Sách rách hỏng do khách, không đúng hàng)</option>
        </select>
      </div>

      <div id="inspectPassedFields">
        <div class="form-group">
          <label class="form-label">Số tiền hoàn cho khách (VNĐ)</label>
          <input type="number" id="inspectRefundAmount" class="form-control" />
        </div>
        <div class="form-group">
          <label class="form-label">Phương thức hoàn tiền</label>
          <select id="inspectRefundMethod" class="form-control">
            <option value="transfer">Chuyển khoản Ngân hàng</option>
            <option value="momo">Ví điện tử MoMo</option>
            <option value="cash">Tiền mặt tại quầy</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Ghi chú biên bản giám định</label>
        <textarea id="inspectNote" class="form-control" rows="2" placeholder="Ghi nhận tình trạng sách nhận lại..."></textarea>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('inspectReturnModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitInspectReturn()">Xác nhận & Hoàn tất</button>
      </div>
    </div>
  </div>

  <!-- MODAL: PHIẾU NHẬP SÁCH NCC -->
  <div class="modal-overlay" id="importReceiptModal">
    <div class="modal-content" style="max-width: 650px;">
      <div class="modal-header">
        <h3 class="modal-title">Tạo Phiếu Nhập Sách Từ Nhà Cung Cấp</h3>
        <button class="modal-close" onclick="closeModal('importReceiptModal')">&times;</button>
      </div>
      <div class="form-group">
        <label class="form-label">Nhà cung cấp / NXB <span style="color: var(--color-red);">*</span></label>
        <select id="importSupplierSelect" class="form-control">
          <option value="">Chọn nhà cung cấp...</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Chọn đầu sách nhập <span style="color: var(--color-red);">*</span></label>
        <select id="importBookSelect" class="form-control">
          <option value="">Chọn sách...</option>
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Số lượng nhập <span style="color: var(--color-red);">*</span></label>
          <input type="number" id="importQuantity" class="form-control" min="1" value="50" />
        </div>
        <div class="form-group">
          <label class="form-label">Đơn giá nhập / cuốn (VNĐ) <span style="color: var(--color-red);">*</span></label>
          <input type="number" id="importCostPrice" class="form-control" min="0" placeholder="Giá nhập NCC" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Ghi chú phiếu nhập</label>
        <textarea id="importNote" class="form-control" rows="2" placeholder="Số hóa đơn VAT, số hợp đồng..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('importReceiptModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitImportReceipt()">Lập phiếu & Nhập kho</button>
      </div>
    </div>
  </div>

  <!-- MODAL: PHIẾU XUẤT SÁCH -->
  <div class="modal-overlay" id="exportReceiptModal">
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title">Lập Phiếu Xuất Sách Kho</h3>
        <button class="modal-close" onclick="closeModal('exportReceiptModal')">&times;</button>
      </div>
      <div class="form-group">
        <label class="form-label">Loại phiếu xuất</label>
        <select id="exportTypeSelect" class="form-control">
          <option value="wholesale">Xuất bán sỉ / Đại lý</option>
          <option value="transfer">Xuất luân chuyển chi nhánh</option>
          <option value="damage">Xuất hủy sách ố rách, lỗi in ấn</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Chọn sách xuất kho <span style="color: var(--color-red);">*</span></label>
        <select id="exportBookSelect" class="form-control">
          <option value="">Chọn sách...</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Số lượng xuất <span style="color: var(--color-red);">*</span></label>
        <input type="number" id="exportQuantity" class="form-control" min="1" value="1" />
      </div>
      <div class="form-group">
        <label class="form-label">Người nhận / Lý do xuất kho</label>
        <input type="text" id="exportRecipient" class="form-control" placeholder="VD: Đại lý Fahasa, Chuyển cơ sở 2..." />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('exportReceiptModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitExportReceipt()">Lập phiếu xuất kho</button>
      </div>
    </div>
  </div>

  <!-- MODAL: KIỂM KÊ KHO -->
  <div class="modal-overlay" id="stockAuditModal">
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title">Tạo Phiếu Kiểm Kê & Cân Bằng Kho</h3>
        <button class="modal-close" onclick="closeModal('stockAuditModal')">&times;</button>
      </div>
      <div class="form-group">
        <label class="form-label">Tên kỳ kiểm kê / Ghi chú <span style="color: var(--color-red);">*</span></label>
        <input type="text" id="auditTitle" class="form-control" placeholder="VD: Kiểm kê định kỳ Cuối tháng..." />
      </div>
      <div class="form-group">
        <label class="form-label">Chọn sách kiểm kê <span style="color: var(--color-red);">*</span></label>
        <select id="auditBookSelect" class="form-control" onchange="onAuditBookSelected()">
          <option value="">Chọn sách kiểm kê...</option>
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Tồn hệ thống</label>
          <input type="number" id="auditSystemStock" class="form-control" readonly disabled value="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Số lượng đếm thực tế <span style="color: var(--color-red);">*</span></label>
          <input type="number" id="auditActualStock" class="form-control" min="0" value="0" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Nguyên nhân chênh lệch</label>
        <textarea id="auditReason" class="form-control" rows="2" placeholder="Hao hụt, thất thoát hoặc tìm thấy sách thất lạc..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('stockAuditModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitStockAudit()">Cập nhật cân bằng tồn kho</button>
      </div>
    </div>
  </div>

  <!-- MODAL: NHÀ CUNG CẤP (THÊM / SỬA) -->
  <div class="modal-overlay" id="supplierModal">
    <div class="modal-content" style="max-width: 620px;">
      <div class="modal-header">
        <h3 class="modal-title" id="supplierModalTitle">Thêm Đối Tác Nhà Cung Cấp</h3>
        <button class="modal-close" onclick="closeModal('supplierModal')">&times;</button>
      </div>
      <input type="hidden" id="supEditId" />
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Mã NCC</label>
          <input type="text" id="supCode" class="form-control" placeholder="Tự sinh nếu trống (VD: NCC-007)" />
        </div>
        <div class="form-group">
          <label class="form-label">Tên nhà cung cấp / NXB <span style="color: var(--color-red);">*</span></label>
          <input type="text" id="supName" class="form-control" placeholder="VD: NXB Kim Đồng, Nhã Nam..." />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Người liên hệ</label>
          <input type="text" id="supContactPerson" class="form-control" placeholder="Họ tên đại diện" />
        </div>
        <div class="form-group">
          <label class="form-label">Số điện thoại <span style="color: var(--color-red);">*</span></label>
          <input type="text" id="supPhone" class="form-control" placeholder="09xxxxxxxx (10-11 số)" />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Email đối tác</label>
          <input type="email" id="supEmail" class="form-control" placeholder="contact@nxb.vn" />
        </div>
        <div class="form-group">
          <label class="form-label">Danh mục / Thể loại phân phối</label>
          <input type="text" id="supCategories" class="form-control" placeholder="Văn học, Thiếu nhi... (cách bằng dấu phẩy)" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Địa chỉ trụ sở / Kho</label>
        <input type="text" id="supAddress" class="form-control" placeholder="Địa chỉ trụ sở..." />
      </div>
      <!-- THÔNG TIN TÀI KHOẢN NGÂN HÀNG -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
        <div style="font-weight: 600; font-size: 13px; color: var(--navy-800); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <i class="fas fa-university" style="color: var(--color-primary);"></i> Thông Tin Tài Khoản Ngân Hàng (Phục vụ thanh toán/chi tiền)
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 12px;">Ngân hàng</label>
            <input type="text" id="supBankName" class="form-control" placeholder="VD: Vietcombank, MB..." />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 12px;">Số tài khoản</label>
            <input type="text" id="supAccountNumber" class="form-control" placeholder="Số tài khoản..." />
          </div>
        </div>
        <div class="form-group" style="margin-top: 10px; margin-bottom: 0;">
          <label class="form-label" style="font-size: 12px;">Tên chủ tài khoản (Viết hoa không dấu)</label>
          <input type="text" id="supAccountHolder" class="form-control" placeholder="Tên in hoa không dấu (VD: NGUYEN VAN A)..." style="text-transform: uppercase;" oninput="validateSupAccountHolder(this)" />
          <div id="supAccountHolderErr" style="display: none; color: #EF4444; font-size: 11.5px; margin-top: 4px; font-weight: 500;">
            <i class="fas fa-exclamation-circle"></i> Tên chủ tài khoản phải viết hoa không dấu (Ví dụ: NGUYEN VAN A)
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('supplierModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitSupplierForm()">Lưu nhà cung cấp</button>
      </div>
    </div>
  </div>

  <!-- MODAL: CHI TIẾT NHÀ CUNG CẤP (3 TABS) -->
  <div class="modal-overlay" id="supplierDetailModal">
    <div class="modal-content" style="max-width: 860px; max-height: 90vh; display: flex; flex-direction: column;">
      <div class="modal-header" style="border-bottom: 1px solid var(--line); padding-bottom: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <h3 class="modal-title" id="supDetailTitle" style="margin: 0;">Chi Tiết Nhà Cung Cấp</h3>
            <span id="supDetailStatusBadge" class="badge">Đang hợp tác</span>
          </div>
          <div id="supDetailSubtitle" style="font-size: 12px; color: var(--muted); margin-top: 4px;">Mã: NCC-001 | 0987654321</div>
        </div>
        <button class="modal-close" onclick="closeModal('supplierDetailModal')">&times;</button>
      </div>

      <!-- TABS NAVIGATION -->
      <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--line); padding: 10px 0 0 0; background: #FAF7F1;">
        <button type="button" class="sup-detail-tab-btn active" id="btnTabSupInfo" onclick="switchSupplierDetailTab('info')" style="padding: 8px 16px; border: none; background: transparent; font-weight: 600; font-size: 13px; color: var(--navy-800); border-bottom: 2px solid var(--gold-600); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fas fa-info-circle"></i> Thông tin chung & Tài khoản
        </button>
        <button type="button" class="sup-detail-tab-btn" id="btnTabSupBooks" onclick="switchSupplierDetailTab('books')" style="padding: 8px 16px; border: none; background: transparent; font-weight: 500; font-size: 13px; color: var(--muted); border-bottom: 2px solid transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fas fa-book"></i> Danh sách sách phân phối (<span id="supDetailBookCount">0</span>)
        </button>
        <button type="button" class="sup-detail-tab-btn" id="btnTabSupHistory" onclick="switchSupplierDetailTab('history')" style="padding: 8px 16px; border: none; background: transparent; font-weight: 500; font-size: 13px; color: var(--muted); border-bottom: 2px solid transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fas fa-history"></i> Lịch sử nhập hàng (<span id="supDetailReceiptCount">0</span>)
        </button>
      </div>

      <!-- TABS CONTENT CONTAINER -->
      <div style="overflow-y: auto; padding: 18px 4px 10px 4px; flex: 1;">
        
        <!-- TAB 1: THÔNG TIN CHUNG & THẺ NGÂN HÀNG -->
        <div id="supTabContentInfo">
          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-bottom: 16px;">
            <!-- Left: Basic info cards -->
            <div style="background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px;">
              <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--navy-900); display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-building" style="color: var(--color-primary);"></i> Thông Tin Liên Lạc & Địa Chỉ
              </h4>
              <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px 12px; font-size: 13px;">
                <span style="color: var(--muted);">Người đại diện:</span>
                <strong id="supDetailContact">-</strong>

                <span style="color: var(--muted);">Số điện thoại:</span>
                <span id="supDetailPhone">-</span>

                <span style="color: var(--muted);">Email:</span>
                <span id="supDetailEmail">-</span>

                <span style="color: var(--muted);">Địa chỉ trụ sở:</span>
                <span id="supDetailAddress">-</span>

                <span style="color: var(--muted);">Danh mục sách:</span>
                <div id="supDetailCategories" style="display: flex; flex-wrap: wrap; gap: 4px;">-</div>
              </div>
            </div>

            <!-- Right: ATM/Bank Card visual UI -->
            <div style="background: linear-gradient(135deg, #0A1930 0%, #1E3A8A 50%, #0D234A 100%); border-radius: 14px; padding: 18px; color: #fff; box-shadow: 0 8px 20px rgba(10,25,48,0.25); position: relative; overflow: hidden; min-height: 180px; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #93C5FD; font-weight: 600;">Tài khoản nhận tiền</span>
                  <div id="supCardBankName" style="font-size: 15px; font-weight: 700; color: #F59E0B; margin-top: 2px;">VIETCOMBANK</div>
                </div>
                <div style="width: 38px; height: 26px; background: linear-gradient(135deg, #FDE68A 0%, #D97706 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                  <i class="fas fa-microchip" style="color: #78350F; font-size: 13px;"></i>
                </div>
              </div>
              <div style="margin: 14px 0 10px 0;">
                <div style="font-size: 10px; color: #CBD5E1; letter-spacing: 0.5px;">SỐ TÀI KHOẢN (ACCOUNT NUMBER)</div>
                <div id="supCardNumber" style="font-size: 17px; font-weight: 700; letter-spacing: 2px; font-family: 'Courier New', monospace; color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">•••• •••• ••••</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                  <div style="font-size: 9px; color: #94A3B8; text-transform: uppercase;">Chủ tài khoản (Card Holder)</div>
                  <div id="supCardHolder" style="font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #F1F5F9;">-</div>
                </div>
                <div style="font-size: 11px; color: #93C5FD; opacity: 0.8;"><i class="fas fa-shield-alt"></i> Verified NCC</div>
              </div>
            </div>
          </div>

          <!-- Quick Metrics Grid -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 4px;">Đầu sách liên kết</div>
              <div id="supDetailTitlesCount" style="font-size: 20px; font-weight: 700; color: #1E3A8A;">0</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 4px;">Tổng số lượng tồn</div>
              <div id="supDetailTotalStock" style="font-size: 20px; font-weight: 700; color: #0D9488;">0 cuốn</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 4px;">Tổng tiền đã nhập</div>
              <div id="supDetailTotalImport" style="font-size: 20px; font-weight: 700; color: #D97706;">0 đ</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 4px;">Tổng đợt nhập hàng</div>
              <div id="supDetailTotalReceipts" style="font-size: 20px; font-weight: 700; color: #7C3AED;">0 phiếu</div>
            </div>
          </div>
        </div>

        <!-- TAB 2: DANH SÁCH ĐẦU SÁCH PHÂN PHỐI -->
        <div id="supTabContentBooks" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <input type="text" id="supBookFilterInput" class="form-control" placeholder="Tìm theo tên sách, ISBN..." style="max-width: 320px; height: 36px; font-size: 12.5px;" oninput="filterSupplierDetailBooks()" />
            <span style="font-size: 12px; color: var(--muted);" id="supBookFilteredCount">Hiển thị tất cả</span>
          </div>
          <div style="max-height: 400px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            <table class="data-table" style="font-size: 12.5px; width: 100%;">
              <thead>
                <tr>
                  <th style="width: 50px;">Bìa</th>
                  <th>Tên sách & ISBN</th>
                  <th>Thể loại</th>
                  <th style="text-align: right;">Giá bán</th>
                  <th style="text-align: right;">Giá vốn</th>
                  <th style="text-align: center;">Tồn kho</th>
                  <th>Kệ</th>
                  <th style="text-align: center;">Trạng thái</th>
                </tr>
              </thead>
              <tbody id="supDetailBookTableBody">
                <tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--muted);">Đang tải dữ liệu sách...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 3: LỊCH SỬ NHẬP HÀNG -->
        <div id="supTabContentHistory" style="display: none;">
          <div style="max-height: 400px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            <table class="data-table" style="font-size: 12.5px; width: 100%;">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Ngày nhập</th>
                  <th>Số mặt hàng</th>
                  <th style="text-align: right;">Tổng giá trị</th>
                  <th>Người lập</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody id="supDetailHistoryTableBody">
                <tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--muted);">Đang tải lịch sử nhập...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- MODAL FOOTER -->
      <div class="modal-footer" style="border-top: 1px solid var(--line); padding-top: 12px; display: flex; justify-content: space-between;">
        <button class="btn btn-secondary" onclick="closeModal('supplierDetailModal')">Đóng</button>
        <button class="btn btn-primary" id="btnEditCurrentSup" onclick="editCurrentSupplierFromDetail()"><i class="fas fa-edit"></i> Chỉnh sửa nhà cung cấp</button>
      </div>
    </div>
  </div>

  <!-- MODAL: TẠO / SỬA PHIẾU SỔ QUỸ -->
  <div class="modal-overlay" id="cashbookModal">
    <div class="modal-content" style="max-width: 650px;">
      <div class="modal-header">
        <h3 class="modal-title" id="cashModalTitle">Lập Phiếu Thu / Chi Tiền Mặt & Ngân Hàng</h3>
        <button class="modal-close" onclick="closeModal('cashbookModal')">&times;</button>
      </div>
      <input type="hidden" id="cashEditId" value="" />
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Loại giao dịch <span style="color: var(--color-red);">*</span></label>
          <select id="cashType" class="form-control" onchange="onCashTypeChanged()">
            <option value="income">Phiếu Thu (Ghi nhận tiền vào quỹ)</option>
            <option value="expense">Phiếu Chi (Ghi nhận tiền ra khỏi quỹ)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Thời gian lập phiếu <span style="color: var(--color-red);">*</span></label>
          <input type="datetime-local" id="cashCreatedAt" class="form-control" required />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Số tiền (VNĐ) <span style="color: var(--color-red);">*</span></label>
          <input type="number" id="cashAmount" class="form-control" min="1000" placeholder="Số tiền..." />
        </div>
        <div class="form-group">
          <label class="form-label">Phương thức</label>
          <select id="cashPaymentMethod" class="form-control">
            <option value="cash">Tiền mặt</option>
            <option value="transfer">Chuyển khoản</option>
            <option value="momo">Ví MoMo</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Hạng mục thu/chi <span style="color: var(--color-red);">*</span></label>
        <input type="text" id="cashCategory" class="form-control" placeholder="VD: Tiền thuê mặt bằng, Tiền điện nước, Tiền hàng NCC..." />
      </div>
      <div id="cashSupplierGroup" class="form-group" style="display: none; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;">
        <label class="form-label" style="font-size: 12.5px; font-weight: 600; color: var(--navy-800); display: flex; justify-content: space-between;">
          <span><i class="fas fa-truck" style="color: var(--color-primary);"></i> Chọn Nhà Cung Cấp nhận tiền (Tùy chọn)</span>
          <span style="font-weight: normal; font-size: 11px; color: var(--muted);">Tự điền người nhận & số tài khoản</span>
        </label>
        <select id="cashSupplierSelect" class="form-control" onchange="onCashSupplierChanged(this.value)">
          <option value="">-- Không liên kết NCC hoặc chi đối tác khác --</option>
        </select>
        <div id="cashSupplierBankHint" style="display: none; margin-top: 8px; font-size: 12px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; padding: 8px 10px; color: #1E40AF;"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Người nộp / nhận tiền</label>
        <input type="text" id="cashRecipient" class="form-control" placeholder="Họ tên người giao dịch" />
      </div>
      <div class="form-group">
        <label class="form-label">Diễn giải nội dung</label>
        <textarea id="cashDescription" class="form-control" rows="2" placeholder="Ghi chú chi tiết lý do..."></textarea>
      </div>

      <!-- KÈM THEO CHỨNG TỪ GỐC BẮT BUỘC: LỜI HOẶC ẢNH -->
      <div class="form-group" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:12px;">
        <label class="form-label" style="font-weight:700; color:var(--navy-800); display:flex; justify-content:space-between; align-items:center;">
          <span>📎 Kèm theo chứng từ gốc <span style="color: var(--color-red);">*</span> <span style="font-weight:normal; font-size:11.5px; color:var(--muted);">(Bắt buộc nhập lời hoặc tải ảnh)</span></span>
        </label>
        <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:12px; margin-top:6px;">
          <div>
            <label style="font-size:12px; color:var(--muted); margin-bottom:4px; display:block;">Lời ghi chú chứng từ gốc (*):</label>
            <input type="text" id="cashAttached" class="form-control" placeholder="vd: Hóa đơn đỏ / Bảng kê chi / Phiếu giao hàng..." />
          </div>
          <div>
            <label style="font-size:12px; color:var(--muted); margin-bottom:4px; display:block;">Chọn ảnh chứng từ (tùy chọn):</label>
            <input type="file" id="cashAttachedFile" class="form-control" accept="image/*" style="font-size:12px; padding:5px 8px; width:100%;" onchange="previewCashAttachedImage(this)" />
            <input type="hidden" id="cashAttachedImage" value="" />
          </div>
        </div>
        <div id="cashAttachedPreviewBox" style="display:none; margin-top:10px; align-items:center; gap:12px; background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px;">
          <img id="cashAttachedPreviewImg" src="" style="width:48px; height:48px; object-fit:cover; border-radius:4px; border:1px solid #e2e8f0; cursor:pointer;" onclick="window.open(this.src, '_blank')" title="Bấm để xem ảnh gốc" />
          <div style="flex:1; font-size:12px;">
            <div id="cashAttachedPreviewName" style="font-weight:600; color:var(--text);">image.png</div>
            <div style="color:var(--muted); font-size:11px;">Chứng từ hình ảnh đã sẵn sàng đính kèm</div>
          </div>
          <button type="button" class="btn btn-sm" style="color:var(--color-red); border-color:var(--color-red); padding:2px 8px; font-size:12px;" onclick="removeCashAttachedImage()">✕ Gỡ ảnh</button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('cashbookModal')">Hủy</button>
        <button class="btn btn-primary" id="cashSubmitBtn" onclick="submitCashbookForm()">Lập phiếu giao dịch</button>
      </div>
    </div>
  </div>

  <!-- MODAL: ĐIỀU CHỈNH NHANH TỒN KHO & VỊ TRÍ KỆ -->
  <div class="modal-overlay" id="quickAdjustModal">
    <div class="modal-content" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title">Cập Nhật Kệ Sách & Tồn Kho</h3>
        <button class="modal-close" onclick="closeModal('quickAdjustModal')">&times;</button>
      </div>
      <input type="hidden" id="quickBookId" />
      <div class="form-group">
        <label class="form-label">Tên sách</label>
        <input type="text" id="quickBookTitle" class="form-control" readonly disabled />
      </div>
      <div class="form-group">
        <label class="form-label">Vị trí kệ sách</label>
        <select id="quickBookShelf" class="form-control"></select>
      </div>
      <div class="form-group">
        <label class="form-label">Số lượng tồn kho thực tế</label>
        <input type="number" id="quickBookStock" class="form-control" min="0" />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('quickAdjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitQuickAdjust()">Cập nhật nhanh</button>
      </div>
    </div>
  </div>

  <!-- MODAL: ĐỔI CA LÀM VIỆC NHANH -->
  <div class="modal-overlay" id="quickShiftModal">
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-clock" style="color: var(--color-amber);"></i> Phân Ca Làm Việc</h3>
        <button class="modal-close" onclick="closeModal('quickShiftModal')">&times;</button>
      </div>
      <input type="hidden" id="quickShiftEmpId" />
      <div class="form-group">
        <label class="form-label">Nhân viên</label>
        <input type="text" id="quickShiftEmpName" class="form-control" readonly disabled />
      </div>
      <div class="form-group">
        <label class="form-label">Chọn ca làm việc mới <span style="color: var(--color-red);">*</span></label>
        <select id="quickShiftSelect" class="form-control">
          <option value="Ca sáng (08:00 - 16:00)">Ca sáng (08:00 - 16:00)</option>
          <option value="Ca chiều (14:00 - 22:00)">Ca chiều (14:00 - 22:00)</option>
          <option value="Ca tối (18:00 - 23:00)">Ca tối (18:00 - 23:00)</option>
          <option value="Hành chính (08:00 - 17:30)">Hành chính (08:00 - 17:30)</option>
          <option value="Toàn thời gian (Fulltime)">Toàn thời gian (Fulltime)</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('quickShiftModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitQuickShift()"><i class="fas fa-save"></i> Cập nhật ca</button>
      </div>
    </div>
  </div>

  <!-- MODAL THẨM ĐỊNH & PHÊ DUYỆT PHIẾU NHẬP / XUẤT KHO (MULTI-TIER APPROVAL) -->
  <div class="modal-overlay" id="receiptApprovalModal">
    <div class="modal-content modal-box modal-lg" style="max-width:860px; max-height:92vh; display:flex; flex-direction:column; background:var(--paper, #FFFFFF); padding:24px 28px; border-radius:14px; border:1px solid var(--line); box-shadow:var(--shadow-soft);">
      <div class="modal-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 class="modal-title" id="apprModalTitle">Thẩm Định & Phê Duyệt Phiếu Kho</h3>
            <span id="apprModalStatusBadge" class="badge">Chờ duyệt</span>
          </div>
          <p class="modal-subtitle" id="apprModalSubtitle">Xem xét danh mục sách, số lượng và tổng tiền trước khi ra quyết định phê duyệt</p>
        </div>
        <button class="modal-close" onclick="closeModal('receiptApprovalModal')">&times;</button>
      </div>

      <div class="modal-body" style="overflow-y:auto; flex:1;">
        <!-- METADATA CARD -->
        <div style="background:var(--bg-secondary, #f8fafc); border:1px solid var(--border-color, #e2e8f0); border-radius:8px; padding:14px; margin-bottom:16px; display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; font-size:13px;">
          <div><span style="color:var(--muted);">Mã phiếu:</span> <strong id="apprReceiptCode" style="color:var(--primary, #0f172a); display:block; font-size:14px;">---</strong></div>
          <div><span style="color:var(--muted);">Loại chứng từ:</span> <strong id="apprReceiptType" style="display:block;">Phiếu nhập kho</strong></div>
          <div><span style="color:var(--muted);">Đơn vị liên quan:</span> <strong id="apprPartyName" style="display:block;">---</strong></div>
          <div><span style="color:var(--muted);">Người lập yêu cầu:</span> <strong id="apprCreatorName" style="display:block;">---</strong></div>
          <div><span style="color:var(--muted);">Ngày lập phiếu:</span> <span id="apprDate" style="display:block;">---</span></div>
          <div><span style="color:var(--muted);">Kho lưu trữ:</span> <span id="apprWarehouse" style="display:block;">Kho bán hàng</span></div>
        </div>

        <div id="apprNoteBox" style="background:#fffbeb; border:1px solid #fef3c7; border-radius:6px; padding:8px 12px; font-size:12.5px; color:#92400e; margin-bottom:14px; display:none;">
          <strong>Ghi chú từ Thủ kho:</strong> <span id="apprNoteText"></span>
        </div>

        <!-- BẢNG CHI TIẾT SÁCH ĐỀ XUẤT -->
        <h4 style="font-size:14px; margin-bottom:8px; color:var(--text-color, #0f172a); display:flex; align-items:center; gap:6px;">
          <i class="fas fa-list-check" style="color:#f59e0b;"></i> Danh Mục Sách Thẩm Định
        </h4>
        <div class="table-container" style="margin-bottom:14px; max-height:260px; overflow-y:auto;">
          <table>
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">STT</th>
                <th>Tên sách</th>
                <th style="width:100px; text-align:center;">Tồn kho hiện tại</th>
                <th style="width:90px; text-align:center;">SL đề xuất</th>
                <th style="width:110px; text-align:right;">Đơn giá</th>
                <th style="width:120px; text-align:right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody id="apprItemsTableBody"></tbody>
          </table>
        </div>

        <!-- TỔNG KẾT TIỀN & SỐ LƯỢNG -->
        <div style="background:var(--bg-secondary, #f8fafc); border:1px solid var(--border-color, #e2e8f0); border-radius:8px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
          <div><strong>Tổng số lượng sách:</strong> <span id="apprTotalQty" style="font-weight:700; color:var(--primary, #0f172a);">0</span> cuốn</div>
          <div><strong>Tổng giá trị đề xuất:</strong> <span id="apprTotalAmount" style="font-weight:700; color:#d97706; font-size:17px;">0₫</span></div>
        </div>

        <!-- Ô NHẬP LÝ DO TỪ CHỐI -->
        <div id="adminApprovalRejectBox" style="display:none; margin-top:14px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px;">
          <label style="font-size:13px; font-weight:600; color:#991b1b; display:block; margin-bottom:6px;">
            Lý do từ chối phê duyệt (* bắt buộc):
          </label>
          <textarea id="adminApprovalRejectReason" rows="2" placeholder="Nhập chi tiết lý do từ chối để Thủ kho điều chỉnh lại thông tin..." style="width:100%; padding:8px; border:1px solid #fca5a5; border-radius:6px; font-size:13px;"></textarea>
        </div>
      </div>

      <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:12px; color:var(--muted); font-style:italic;">
            * Lưu ý: Khi Admin duyệt, tồn kho chưa thay đổi. Tồn kho chỉ cập nhật khi Thủ kho hoàn tất nhập/xuất thực tế.
          </span>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="closeModal('receiptApprovalModal')">Đóng</button>
          <button class="btn btn-danger" id="adminRejectBtn" onclick="adminHandleRejectClick()"><i class="fas fa-times"></i> Từ Chối</button>
          <button class="btn btn-success" id="adminApproveBtn" onclick="adminExecuteApprove()"><i class="fas fa-check"></i> Phê Duyệt Phiếu</button>
        </div>
      </div>
    </div>
  </div>



  <!-- MODAL: THÊM / CHỈNH SỬA MÃ GIẢM GIÁ (COUPON) -->
  <div class="modal-overlay" id="couponModal">
    <div class="modal-content" style="max-width: 620px;">
      <div class="modal-header">
        <h3 class="modal-title" id="couponModalTitle">Thêm Mã Giảm Giá Mới</h3>
        <button class="modal-close" onclick="closeModal('couponModal')">&times;</button>
      </div>
      <form id="couponForm" onsubmit="submitCouponForm(event)">
        <input type="hidden" id="couponFormId" />
        
        <div style="display:grid; grid-template-columns: 1fr 1.4fr; gap:14px; margin-bottom:14px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Mã Voucher (* viết liền, không dấu)</label>
            <input type="text" id="couponFormCode" class="form-control" placeholder="VD: LAMOUR20, CHAOMUNG" required style="text-transform:uppercase; font-family:'IBM Plex Mono', monospace; font-weight:700; letter-spacing:0.05em;" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Tên chương trình ưu đãi (*)</label>
            <input type="text" id="couponFormName" class="form-control" placeholder="VD: Khuyến mãi mừng khai trương" required />
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px; margin-bottom:14px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Loại giảm (*)</label>
            <select id="couponFormType" class="form-control" onchange="onCouponTypeChange(this.value)">
              <option value="percent">Giảm theo phần trăm (%)</option>
              <option value="fixed">Giảm số tiền cố định (₫)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" id="couponValLabel">Mức giảm (% *)</label>
            <input type="number" id="couponFormValue" class="form-control" min="1" placeholder="VD: 10" required />
          </div>
          <div class="form-group" style="margin-bottom:0;" id="couponMaxDiscountGroup">
            <label class="form-label">Giảm tối đa (₫ - 0=KGH)</label>
            <input type="number" id="couponFormMaxDiscount" class="form-control" min="0" step="1000" placeholder="0 (không giới hạn)" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:14px; margin-bottom:14px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Giá trị đơn hàng tối thiểu (₫)</label>
            <input type="number" id="couponFormMinOrder" class="form-control" min="0" step="10000" placeholder="0 (áp dụng mọi đơn)" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Tổng số lượt sử dụng (*)</label>
            <input type="number" id="couponFormUsageLimit" class="form-control" min="1" placeholder="VD: 50" required />
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Ngày bắt đầu có hiệu lực</label>
            <input type="date" id="couponFormStartDate" class="form-control" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Ngày hết hạn sử dụng (*)</label>
            <input type="date" id="couponFormEndDate" class="form-control" required />
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Mô tả / Điều kiện áp dụng (Tùy chọn)</label>
          <textarea id="couponFormDesc" class="form-control" rows="2" placeholder="VD: Áp dụng cho mọi khách hàng đặt mua trên web và tại quầy..."></textarea>
        </div>

        <div class="form-group" style="display:flex; align-items:center; gap:8px; margin-bottom:0;">
          <input type="checkbox" id="couponFormActive" checked style="width:16px; height:16px; accent-color:var(--navy-700);" />
          <label for="couponFormActive" style="font-size:13.5px; font-weight:600; color:var(--navy-900); cursor:pointer; margin-bottom:0;">
            Kích hoạt mã giảm giá ngay sau khi lưu
          </label>
        </div>

        <div class="modal-footer" style="margin-top:20px; padding-top:16px; border-top:1px solid var(--line);">
          <button type="button" class="btn btn-secondary" onclick="closeModal('couponModal')">Hủy bỏ</button>
          <button type="submit" class="btn btn-primary" id="btnSubmitCoupon"><i class="fas fa-save"></i> Lưu mã giảm giá</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL THÊM / SỬA KỆ SÁCH -->
  <div class="modal-overlay" id="adminShelfModal">
    <div class="modal-card" style="max-width: 520px;">
      <div class="modal-header">
        <h3 class="modal-title" id="adminShelfModalTitle">Thêm Kệ Sách Mới</h3>
        <button type="button" class="modal-close" onclick="closeModal('adminShelfModal')">&times;</button>
      </div>
      <form id="adminShelfForm" onsubmit="saveAdminShelf(event)">
        <input type="hidden" id="adminShelfFormId" value="" />
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
          <div class="form-group">
            <label class="form-label">Mã Kệ (*)</label>
            <input type="text" id="adminShelfFormCode" class="form-control" placeholder="VD: KE-A4, KE-B4..." uppercase required />
          </div>
          <div class="form-group">
            <label class="form-label">Khu vực (*)</label>
            <select id="adminShelfFormZone" class="form-control">
              <option value="Khu A">Khu A (Văn học)</option>
              <option value="Khu B">Khu B (Kinh tế & Kỹ năng)</option>
              <option value="Khu C">Khu C (Khoa học & Lịch sử)</option>
              <option value="Khu D">Khu D (Thiếu nhi & Manga)</option>
              <option value="Khu Dự Phòng">Khu Dự Phòng</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">Tên Kệ Sách (*)</label>
          <input type="text" id="adminShelfFormName" class="form-control" placeholder="VD: Kệ A4 - Tiểu thuyết trinh thám" required />
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">Sức chứa tối đa (cuốn) (*)</label>
          <input type="number" id="adminShelfFormCapacity" class="form-control" min="1" max="5000" placeholder="100" required />
          <div style="font-size: 11.5px; color: var(--muted); margin-top: 4px;">Số lượng bản in tối đa kệ có thể chứa cùng lúc.</div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label">Mô tả vị trí / Loại sách lưu trữ</label>
          <textarea id="adminShelfFormDesc" class="form-control" rows="2" placeholder="Ghi chú chi tiết vị trí kệ trong hiệu sách..."></textarea>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--line); padding-top: 14px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('adminShelfModal')">Hủy bỏ</button>
          <button type="submit" class="btn btn-primary" id="btnSubmitAdminShelf"><i class="fas fa-save"></i> Lưu Kệ Sách</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL XEM CHI TIẾT SÁCH TRÊN KỆ -->
  <div class="modal-overlay" id="adminShelfDetailModal">
    <div class="modal-card" style="max-width: 860px;">
      <div class="modal-header">
        <div>
          <h3 class="modal-title" id="adminShelfDetailTitle">Chi Tiết Sách Trên Kệ</h3>
          <div id="adminShelfDetailSubtitle" style="font-size: 12.5px; color: var(--muted); margin-top: 3px;">Danh sách các đầu sách đang xếp trên kệ này</div>
        </div>
        <button type="button" class="modal-close" onclick="closeModal('adminShelfDetailModal')">&times;</button>
      </div>
      <div style="padding: 18px 24px; max-height: 540px; overflow-y: auto;">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Bìa</th>
                <th>Mã SKU & Tên sách</th>
                <th>Thể loại</th>
                <th>Tồn thực tế</th>
                <th>Đơn giá</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody id="adminShelfDetailTableBody">
              <tr><td colspan="6" class="empty-cell">Đang tải sách trên kệ...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 24px; border-top: 1px solid var(--line);">
        <span id="adminShelfDetailFooterSummary" style="font-size: 13px; font-weight: 600; color: var(--navy-800);">Tổng số: 0 đầu sách</span>
        <button type="button" class="btn btn-secondary" onclick="closeModal('adminShelfDetailModal')">Đóng</button>
      </div>
    </div>
  </div>
  <!-- MODAL DUYỆT / XEM CHI TIẾT YÊU CẦU THÊM KỆ TỪ KHO -->
  <div class="modal-overlay" id="adminShelfRequestModal">
    <div class="modal-card" style="max-width: 600px;">
      <div class="modal-header">
        <div>
          <h3 class="modal-title" id="adminShelfRequestModalTitle">Chi Tiết Yêu Cầu Thêm Kệ Sách</h3>
          <div style="font-size: 12.5px; color: var(--muted); margin-top: 3px;" id="adminShelfRequestModalSubtitle">Phê duyệt hoặc từ chối đề xuất tạo kệ mới từ nhân viên kho</div>
        </div>
        <button type="button" class="modal-close" onclick="closeModal('adminShelfRequestModal')">&times;</button>
      </div>
      <div style="padding: 20px 24px;">
        <input type="hidden" id="adminShelfReqCurrentId" value="" />
        
        <div style="background: #F8FAFC; border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
            <div><span style="color: var(--muted);">Mã yêu cầu:</span> <strong id="adminShelfReqModalCode" class="mono" style="color: var(--navy-900);">-</strong></div>
            <div><span style="color: var(--muted);">Trạng thái:</span> <span id="adminShelfReqModalStatus">-</span></div>
            <div><span style="color: var(--muted);">Người gửi:</span> <strong id="adminShelfReqModalSender" style="color: var(--navy-900);">-</strong></div>
            <div><span style="color: var(--muted);">Thời gian gửi:</span> <span id="adminShelfReqModalTime" style="color: var(--navy-900);">-</span></div>
          </div>
        </div>

        <div style="border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--navy-900);"><i class="fas fa-layer-group" style="color: var(--primary); margin-right: 6px;"></i>Thông Tin Kệ Sách Đề Xuất</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
            <div><span style="color: var(--muted);">Mã kệ:</span> <span id="adminShelfReqModalShelfCode" class="mono" style="font-weight: 700; color: var(--navy-900); padding: 2px 6px; background: #EEF2F6; border-radius: 4px;">-</span></div>
            <div><span style="color: var(--muted);">Khu vực:</span> <strong id="adminShelfReqModalZone">-</strong></div>
            <div style="grid-column: 1/-1;"><span style="color: var(--muted);">Tên kệ sách:</span> <strong id="adminShelfReqModalShelfName" style="color: var(--navy-900); font-size: 14px;">-</strong></div>
            <div><span style="color: var(--muted);">Sức chứa tối đa:</span> <strong id="adminShelfReqModalCapacity" style="color: #059669;">-</strong></div>
            <div style="grid-column: 1/-1;"><span style="color: var(--muted);">Mô tả vị trí:</span> <span id="adminShelfReqModalDesc" style="color: var(--navy-900);">-</span></div>
          </div>
        </div>

        <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #92400E;"><i class="fas fa-comment-dots" style="margin-right: 6px;"></i>Lý Do Đề Xuất Thêm Kệ</h4>
          <div id="adminShelfReqModalReason" style="font-size: 13.5px; font-weight: 600; color: #78350F; line-height: 1.4;">-</div>
          <div id="adminShelfReqModalNote" style="font-size: 12px; color: #92400E; margin-top: 6px; font-style: italic;"></div>
        </div>

        <!-- Phản hồi của Quản trị viên -->
        <div class="form-group" id="adminShelfReqResponseGroup" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 600;">Ghi chú / Phản hồi của Quản trị viên</label>
          <textarea id="adminShelfReqModalAdminNote" class="form-control" rows="2" placeholder="Nhập ghi chú khi duyệt hoặc lý do nếu từ chối yêu cầu..."></textarea>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding: 14px 24px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('adminShelfRequestModal')">Đóng</button>
        <div id="adminShelfReqModalActions" style="display: flex; gap: 10px;">
          <!-- Nút hành động phê duyệt / từ chối sẽ được render linh hoạt -->
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL ĐIỀU CHUYỂN SÁCH GIỮA CÁC KỆ -->
  <div class="modal-overlay" id="adminShelfTransferModal">
    <div class="modal-card" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title">Điều Chuyển Sách Giữa Các Kệ</h3>
        <button type="button" class="modal-close" onclick="closeModal('adminShelfTransferModal')">&times;</button>
      </div>
      <form id="adminShelfTransferForm" onsubmit="saveAdminShelfTransfer(event)">
        <div style="padding: 16px 20px;">
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Chọn Sách Cần Chuyển (*)</label>
            <select id="transferBookSelect" class="form-control" required onchange="onTransferBookSelected()">
              <option value="">-- Chọn đầu sách --</option>
            </select>
            <div id="transferBookInfo" style="font-size: 12px; color: var(--navy-700); margin-top: 4px; display: none;"></div>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">Kệ Đích Tiếp Nhận (*)</label>
            <select id="transferTargetShelfSelect" class="form-control" required onchange="onTransferTargetShelfSelected()">
              <option value="">-- Chọn kệ đích --</option>
            </select>
            <div id="transferTargetShelfInfo" style="font-size: 12px; color: var(--muted); margin-top: 4px;"></div>
          </div>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--line); padding: 14px 20px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('adminShelfTransferModal')">Hủy</button>
          <button type="submit" class="btn btn-primary" id="btnSubmitTransfer"><i class="fas fa-exchange-alt"></i> Xác Nhận Chuyển Kệ</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL XÁC NHẬN CHUNG (CONFIRM DIALOG) -->
  <div class="confirm-overlay" id="confirmOverlay">
    <div class="confirm-modal">
      <div class="confirm-title" id="confirmTitle">Xác nhận thao tác</div>
      <div class="confirm-msg" id="confirmMsg">Bạn có chắc chắn muốn thực hiện thao tác này?</div>
      <div class="confirm-actions">
        <button type="button" class="confirm-btn" onclick="closeConfirmDialog()">Hủy bỏ</button>
        <button type="button" class="confirm-btn confirm-btn-primary" id="confirmOkBtn">Đồng ý</button>
      </div>
    </div>
  </div>

  <!-- =================================================================== -->
  <!-- MODAL THẨM ĐỊNH & PHÊ DUYỆT PHIẾU KIỂM KÊ (AUDIT APPROVAL MODAL)    -->
  <!-- ẨN MẶC ĐỊNH 100%, CHỈ HIỂN THỊ KHI ADMIN THAO TÁC POPUP             -->
  <!-- =================================================================== -->
  <div class="modal-overlay audit-approval-modal-overlay" id="auditApprovalModal" style="display:none !important;">
    <div class="modal-content audit-approval-modal-container">
      <div class="modal-header">
        <div>
          <span class="eyebrow" style="color:var(--primary, #0f172a); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Phê Duyệt Đa Tầng · Quản Trị Kho</span>
          <h3 class="modal-title" style="margin:2px 0 0 0; font-size:18px;">Thẩm Định & Phê Duyệt Phiếu Kiểm Kê</h3>
          <p style="margin:2px 0 0 0; font-size:12.5px; color:var(--muted, #64748b);">
            Xem xét đối soát chênh lệch tồn thực tế và quyết định cân đối số liệu kho / ghi nhận hạch toán tổn thất
          </p>
        </div>
        <button class="modal-close" onclick="closeAuditApprovalModal()" title="Đóng">&times;</button>
      </div>

      <div class="modal-body" style="max-height:75vh; overflow-y:auto; padding:20px 0;">
        <!-- THÔNG TIN CHUNG PHIẾU KIỂM KÊ -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; background:var(--bg-secondary, #f8fafc); border:1px solid var(--border-color, #e2e8f0); border-radius:10px; padding:14px 18px; margin-bottom:18px;">
          <div>
            <div style="font-size:11.5px; color:var(--muted, #64748b);">Mã phiếu kiểm:</div>
            <div id="auditApprCode" style="font-weight:700; font-size:14px; color:var(--primary, #0f172a);">---</div>
          </div>
          <div>
            <div style="font-size:11.5px; color:var(--muted, #64748b);">Ngày lập phiếu:</div>
            <div id="auditApprDate" style="font-weight:600; font-size:13px;">---</div>
          </div>
          <div>
            <div style="font-size:11.5px; color:var(--muted, #64748b);">Thủ kho kiểm đếm:</div>
            <div id="auditApprAuditor" style="font-weight:600; font-size:13px; color:#1e40af;">---</div>
          </div>
          <div>
            <div style="font-size:11.5px; color:var(--muted, #64748b);">Khu vực / Kệ sách:</div>
            <div id="auditApprShelf" style="font-weight:600; font-size:13px;">---</div>
          </div>
          <div>
            <div style="font-size:11.5px; color:var(--muted, #64748b);">Trạng thái hiện tại:</div>
            <div id="auditApprStatusBadge" style="margin-top:2px;">---</div>
          </div>
        </div>

        <!-- 4 THẺ TỔNG HỢP CHÊNH LỆCH -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:18px;">
          <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; font-weight:600; color:#991b1b; text-transform:uppercase;">▼ Sách Thiếu (Hụt Tồn)</div>
            <div id="auditApprShortageQty" style="font-size:20px; font-weight:800; color:#dc2626; margin-top:2px;">0 cuốn</div>
            <div style="font-size:11px; color:#b91c1c;">Cần trừ tồn kho</div>
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; font-weight:600; color:#1e40af; text-transform:uppercase;">▲ Sách Thừa (Dôi Dư)</div>
            <div id="auditApprSurplusQty" style="font-size:20px; font-weight:800; color:#2563eb; margin-top:2px;">0 cuốn</div>
            <div style="font-size:11px; color:#1d4ed8;">Cần cộng thêm vào kho</div>
          </div>
          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; font-weight:600; color:#92400e; text-transform:uppercase;">⚠ Sách Hỏng / Lỗi</div>
            <div id="auditApprDamagedQty" style="font-size:20px; font-weight:800; color:#d97706; margin-top:2px;">0 cuốn</div>
            <div style="font-size:11px; color:#b45309;">Hư hại cần xuất hủy/đổi</div>
          </div>
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; font-weight:600; color:#166534; text-transform:uppercase;">💰 Tổn Thất Ước Tính</div>
            <div id="auditApprEstLossVal" style="font-size:20px; font-weight:800; color:#15803d; margin-top:2px;">0₫</div>
            <div style="font-size:11px; color:#166534;">Giá trị sách thiếu & hỏng</div>
          </div>
        </div>

        <!-- BẢNG CHI TIẾT SẢN PHẨM KIỂM KÊ -->
        <div style="margin-bottom:18px;">
          <div style="font-weight:700; font-size:13.5px; margin-bottom:8px; color:var(--primary, #0f172a); display:flex; justify-content:space-between; align-items:center;">
            <span>📋 Danh mục sách đối soát trong phiếu:</span>
            <span id="auditApprItemCount" style="font-size:12px; font-weight:normal; color:var(--muted, #64748b);">0 sản phẩm</span>
          </div>
          <div style="overflow-x:auto; border:1px solid var(--border-color, #e2e8f0); border-radius:8px;">
            <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
              <thead>
                <tr style="background:var(--bg-secondary, #f8fafc); border-bottom:1px solid var(--border-color, #e2e8f0); text-align:left;">
                  <th style="padding:10px 12px; font-weight:600;">Sản phẩm / ISBN</th>
                  <th style="padding:10px 10px; text-align:center; font-weight:600; width:70px;">Tồn HT</th>
                  <th style="padding:10px 10px; text-align:center; font-weight:600; width:70px;">Thực tế</th>
                  <th style="padding:10px 10px; text-align:center; font-weight:600; width:80px;">Chênh lệch</th>
                  <th style="padding:10px 10px; text-align:center; font-weight:600; width:70px;">Hỏng</th>
                  <th style="padding:10px 10px; font-weight:600; width:130px;">Trạng thái</th>
                  <th style="padding:10px 12px; font-weight:600;">Lý do giải trình</th>
                  <th style="padding:10px 12px; font-weight:600;">Đề xuất xử lý</th>
                </tr>
              </thead>
              <tbody id="auditApprItemsTableBody">
                <tr><td colspan="8" style="text-align:center; padding:20px; color:var(--muted);">Chưa có dữ liệu</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- GHI CHÚ THỦ KHO NẾU CÓ -->
        <div id="auditApprNoteBox" style="margin-bottom:14px; background:#fff; border:1px solid var(--border-color, #e2e8f0); border-radius:8px; padding:10px 14px; font-size:12.5px;">
          <strong style="color:var(--primary, #0f172a);">Ghi chú đính kèm từ Thủ kho:</strong>
          <span id="auditApprNote" style="color:#475569; margin-left:6px;">Không có ghi chú</span>
        </div>

        <!-- GHI CHÚ PHÊ DUYỆT CỦA ADMIN -->
        <div style="margin-bottom:14px;">
          <label style="font-size:13px; font-weight:600; color:var(--primary, #0f172a); display:block; margin-bottom:6px;">
            Ý kiến chỉ đạo / Ghi chú thẩm định của Admin:
          </label>
          <input type="text" id="auditApprAdminNote" class="form-control" placeholder="Ví dụ: Đồng ý cân đối tồn kho theo đề xuất; Kế toán trích xuất chi phí hao hụt..." style="width:100%; height:38px; font-size:13px;" />
        </div>

        <!-- HỘP NHẬP LÝ DO TỪ CHỐI / YÊU CẦU KIỂM LẠI -->
        <div id="auditApprRejectBox" style="display:none; margin-bottom:14px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:14px;">
          <label style="font-size:13px; font-weight:700; color:#991b1b; display:block; margin-bottom:6px;">
            Lý do yêu cầu kiểm đếm lại (* bắt buộc khi từ chối):
          </label>
          <textarea id="auditApprRejectReason" rows="2" placeholder="Nêu rõ lý do từ chối (Ví dụ: Số lượng lệch lớn ở Kệ A3, yêu cầu Thủ kho kiểm đếm lại trước khi cân đối)..." style="width:100%; padding:8px 12px; border:1px solid #fca5a5; border-radius:6px; font-size:13px; font-family:inherit;"></textarea>
        </div>

        <!-- CẢNH BÁO QUY TRÌNH -->
        <div id="auditApprWorkflowNotice" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; font-size:12px; color:#1e40af; line-height:1.5;">
          <i class="fas fa-info-circle" style="margin-right:4px;"></i>
          <strong>Cơ chế đồng bộ tự động:</strong> Khi Admin bấm <b>[Phê Duyệt Điều Chỉnh]</b>, hệ thống sẽ tự động cập nhật số lượng tồn kho của từng đầu sách về số thực tế, lưu lịch sử điều chỉnh tồn (StockAdjustment), và lập phiếu Chi kế toán nếu có tổn thất sách thiếu/hỏng.
        </div>
      </div>

      <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px;">
        <div id="auditApprFooterStatusText" style="font-size:12px; color:var(--muted); font-style:italic;">
          Phiếu đang chờ duyệt thẩm định
        </div>
        <div style="display:flex; gap:10px;" id="auditApprActionButtons">
          <button class="btn btn-secondary" onclick="closeAuditApprovalModal()">Đóng</button>
          <button class="btn btn-danger" id="adminAuditRejectBtn" onclick="adminHandleRejectAuditClick()"><i class="fas fa-undo"></i> Yêu Cầu Kiểm Lại</button>
          <button class="btn btn-success" id="adminAuditApproveBtn" onclick="adminExecuteApproveAudit()"><i class="fas fa-check-double"></i> Phê Duyệt Điều Chỉnh Tồn Kho</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: CHI TIẾT HOẠT ĐỘNG LUÂN CHUYỂN KỆ & DANH SÁCH SÁCH ĐƯỢC CHUYỂN -->
  <div class="modal-overlay" id="shelfActivityDetailModal" style="z-index: 1250;">
    <div class="modal-content" style="max-width: 860px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
      <div class="modal-header" style="padding: 16px 22px; background: #0F172A; color: #fff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1E293B;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; font-size: 16px; color: #38BDF8;">
            <i class="fas fa-boxes-stacked"></i>
          </div>
          <div>
            <h3 class="modal-title" style="margin: 0; font-size: 16px; font-weight: 700; color: #fff;">Chi Tiết Hoạt Động Luân Chuyển Kệ</h3>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #94A3B8;" id="shelfLogModalSubtitle">Danh sách chi tiết các cuốn sách được luân chuyển</p>
          </div>
        </div>
        <button class="modal-close" onclick="closeModal('shelfActivityDetailModal')" style="color: #94A3B8; font-size: 22px; border: none; background: none; cursor: pointer; padding: 4px 8px;">&times;</button>
      </div>

      <div class="modal-body" style="padding: 20px 24px; overflow-y: auto; flex: 1;">
        <!-- Hộp tóm tắt thông tin luân chuyển -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px;">
          <div>
            <div style="font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Thời gian thực hiện</div>
            <div id="shelfLogModalTime" style="font-size: 13px; font-weight: 600; color: #0F172A; margin-top: 3px;">—</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Người thực hiện</div>
            <div id="shelfLogModalPerformer" style="font-size: 13px; font-weight: 600; color: #0F172A; margin-top: 3px;">—</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Loại hoạt động</div>
            <div id="shelfLogModalAction" style="margin-top: 3px;">—</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Kệ liên quan</div>
            <div id="shelfLogModalRoute" style="margin-top: 3px; font-size: 13px; font-weight: 700;">—</div>
          </div>
        </div>

        <!-- Mô tả ghi chú -->
        <div style="margin-bottom: 18px; padding: 10px 14px; background: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 6px; font-size: 12.5px; color: #1E40AF;" id="shelfLogModalDescBox">
          <i class="fas fa-info-circle" style="margin-right: 6px;"></i><span id="shelfLogModalDesc">—</span>
        </div>

        <!-- Tiêu đề danh sách sách -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-book-bookmark" style="color: #2563EB;"></i> Danh sách cụ thể các sách được chuyển
            <span id="shelfLogModalBookCountBadge" style="font-size: 11px; background: #DBEAFE; color: #1D4ED8; padding: 2px 9px; border-radius: 12px; font-weight: 600;">0 đầu sách</span>
          </h4>
        </div>

        <!-- Bảng danh sách các sách -->
        <div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <div style="overflow-x: auto; max-height: 320px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; min-width: 620px;">
              <thead style="background: #F1F5F9; color: #475569; position: sticky; top: 0; z-index: 1;">
                <tr>
                  <th style="padding: 10px 14px; font-weight: 600; width: 45px; text-align: center; white-space: nowrap;">STT</th>
                  <th style="padding: 10px 14px; font-weight: 600; width: 120px; white-space: nowrap;">Mã sách</th>
                  <th style="padding: 10px 14px; font-weight: 600; min-width: 180px; white-space: nowrap;">Tên cuốn sách</th>
                  <th style="padding: 10px 14px; font-weight: 600; width: 140px; white-space: nowrap;">Tác giả</th>
                  <th style="padding: 10px 14px; font-weight: 600; width: 90px; text-align: center; white-space: nowrap;">Số lượng</th>
                  <th style="padding: 10px 14px; font-weight: 600; width: 160px; text-align: center; white-space: nowrap;">Từ kệ ➔ Đến kệ</th>
                </tr>
              </thead>
              <tbody id="shelfLogModalBooksBody">
                <!-- Nội dung danh sách sách sẽ được chèn qua JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 22px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('shelfActivityDetailModal')" style="padding: 8px 20px; font-weight: 600;">
          Đóng
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: CHI TIẾT NHẬT KÝ HOẠT ĐỘNG (AUDIT LOG DIFF VIEWER) -->
  <div class="modal-overlay" id="modalAuditLogDetail" style="z-index: 1200;">
    <div class="modal-content" style="max-width: 780px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
      <div class="modal-header" style="padding: 16px 24px; background: #1E293B; color: #FFF; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: rgba(245, 158, 11, 0.2); color: #F59E0B; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-history"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #FFF;">Chi Tiết Nhật Ký Hoạt Động</h3>
            <span id="auditDetailLogId" style="font-size: 11px; color: #94A3B8; font-family: monospace;">LOG-ID: ---</span>
          </div>
        </div>
        <button type="button" onclick="closeModal('modalAuditLogDetail')" style="background: transparent; border: none; color: #94A3B8; font-size: 18px; cursor: pointer;">&times;</button>
      </div>

      <div class="modal-body" style="padding: 20px 24px; overflow-y: auto; flex: 1;">
        <!-- THÔNG TIN TỔNG QUAN -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 4px;">Người thực hiện</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div id="auditDetailAvatar" style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-navy); color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">QT</div>
              <div>
                <div id="auditDetailPerformerName" style="font-weight: 700; font-size: 14px; color: var(--navy-900);">---</div>
                <div id="auditDetailPerformerEmail" style="font-size: 12px; color: var(--muted);">---</div>
              </div>
            </div>
          </div>

          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 4px;">Thời gian & Mạng</div>
            <div style="font-size: 13px; color: var(--navy-900); font-weight: 600;" id="auditDetailTime">---</div>
            <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">
              <i class="fas fa-network-wired" style="margin-right: 4px;"></i>IP: <span id="auditDetailIp" style="font-family: monospace; font-weight: 600;">---</span>
            </div>
          </div>

          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 4px;">Phân hệ & Hành động</div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span id="auditDetailModuleBadge" class="badge" style="background: #E0F2FE; color: #0369A1;">---</span>
              <span id="auditDetailActionTag" style="font-size: 12px; font-family: monospace; font-weight: 600; color: var(--navy-700);">---</span>
            </div>
          </div>

          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 4px;">Mức độ cảnh báo</div>
            <div id="auditDetailSeverityBadge">---</div>
          </div>
        </div>

        <!-- MÔ TẢ HÀNH ĐỘNG -->
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--navy-800); margin-bottom: 6px; text-transform: uppercase;">Mô tả tác vụ</div>
          <div id="auditDetailDescription" style="background: #FFF; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: var(--navy-900); line-height: 1.5;">
            ---
          </div>
        </div>

        <!-- THÔNG TIN THAY ĐỔI DỮ LIỆU (DIFF BEFORE & AFTER) -->
        <div id="auditDetailDiffSection" style="margin-bottom: 20px; display: none;">
          <div style="font-size: 12px; font-weight: 700; color: var(--navy-800); margin-bottom: 8px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fas fa-exchange-alt" style="color: var(--color-amber);"></i> Chi tiết thay đổi giá trị (Diff)</span>
            <span style="font-size: 11px; color: var(--muted); font-weight: 500;">So sánh dữ liệu Trước và Sau</span>
          </div>
          <div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead style="background: #F1F5F9; color: #475569;">
                <tr>
                  <th style="padding: 10px 14px; text-align: left; width: 25%;">Thuộc tính</th>
                  <th style="padding: 10px 14px; text-align: left; width: 37.5%; background: #FEF2F2; color: #991B1B;">Giá trị trước khi sửa</th>
                  <th style="padding: 10px 14px; text-align: left; width: 37.5%; background: #ECFDF5; color: #065F46;">Giá trị mới cập nhật</th>
                </tr>
              </thead>
              <tbody id="auditDetailDiffBody">
                <!-- Chèn qua JS -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- THÔNG TIN THIẾT BỊ (USER AGENT) -->
        <div>
          <div style="font-size: 12px; font-weight: 700; color: var(--navy-800); margin-bottom: 6px; text-transform: uppercase;">Môi trường truy cập & Trình duyệt</div>
          <div id="auditDetailUserAgent" style="font-family: monospace; font-size: 11px; color: var(--muted); background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; word-break: break-all;">
            ---
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modalAuditLogDetail')" style="padding: 8px 24px;">Đóng</button>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: TẠO BẢN SAO LƯU DỮ LIỆU MỚI -->
  <!-- ========================================== -->
  <div class="modal-overlay" id="modalCreateBackup">
    <div class="modal-content" style="max-width: 520px; width: 92%; border-radius: 14px; overflow: hidden; padding: 0;">
      <div class="modal-header" style="background: var(--navy-900); color: #FFF; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 14px 14px 0 0; margin-bottom: 0;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #FFF;">
          <i class="fas fa-shield-alt" style="color: var(--color-amber);"></i>
          <span>Tạo Bản Sao Lưu Dữ Liệu Mới</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal('modalCreateBackup')" style="color: #FFF;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <div style="margin-bottom: 18px;">
          <label class="form-label" style="font-weight: 600; margin-bottom: 8px; display: block;">Phạm vi sao lưu</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <label style="border: 2px solid var(--navy-900); border-radius: 10px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: all 0.2s;" id="labelScopeFull">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--navy-900);">
                <input type="radio" name="backupScopeOption" value="FULL" checked onchange="updateBackupScopeStyle()" />
                <span>Toàn diện (Full)</span>
              </div>
              <span style="font-size: 11.5px; color: var(--muted); line-height: 1.4;">CSDL MongoDB + Toàn bộ ảnh bìa, QR ngân hàng & tệp tải lên</span>
            </label>

            <label style="border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: all 0.2s;" id="labelScopeDb">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--navy-900);">
                <input type="radio" name="backupScopeOption" value="DATABASE_ONLY" onchange="updateBackupScopeStyle()" />
                <span>Chỉ CSDL</span>
              </div>
              <span style="font-size: 11.5px; color: var(--muted); line-height: 1.4;">Dữ liệu bảng 17 collections (nhẹ & tạo nhanh siêu tốc)</span>
            </label>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="font-weight: 600;">Phân loại bản sao lưu</label>
          <select id="createBackupType" class="form-control" style="width: 100%;">
            <option value="MANUAL" selected>Thủ công (Manual) — Bản lưu trữ chủ động của Admin</option>
            <option value="PRE_RESTORE_SNAPSHOT">Snapshot cứu hộ (Pre-restore) — Điểm khôi phục an toàn</option>
          </select>
        </div>

        <!-- KHOẢNG THỜI GIAN DỮ LIỆU SAO LƯU -->
        <div style="margin-bottom: 18px;">
          <label class="form-label" style="font-weight: 600; margin-bottom: 8px; display: block;">Thời gian dữ liệu cần sao lưu</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <label style="border: 2px solid var(--navy-900); border-radius: 10px; padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;" id="labelDateRangeAll">
              <input type="radio" name="backupDateMode" value="ALL" checked onchange="toggleBackupDateRangeMode()" />
              <div>
                <div style="font-weight: 700; font-size: 13px; color: var(--navy-900);">Toàn bộ thời gian</div>
                <div style="font-size: 11px; color: var(--muted);">Tất cả dữ liệu từ trước tới nay</div>
              </div>
            </label>

            <label style="border: 1px solid #CBD5E1; border-radius: 10px; padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;" id="labelDateRangeCustom">
              <input type="radio" name="backupDateMode" value="CUSTOM" onchange="toggleBackupDateRangeMode()" />
              <div>
                <div style="font-weight: 700; font-size: 13px; color: var(--navy-900);">Theo khoảng ngày</div>
                <div style="font-size: 11px; color: var(--muted);">Chọn từ ngày đến ngày</div>
              </div>
            </label>
          </div>

          <!-- KHUNG CHỌN NGÀY BẮT ĐẦU & KẾT THÚC (HIỂN THỊ KHI CHỌN CUSTOM) -->
          <div id="backupDateRangeInputs" style="display: none; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 10px; padding: 14px; margin-top: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
              <div>
                <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--navy-800);">Từ ngày bắt đầu</label>
                <input type="date" id="createBackupStartDate" class="form-control" />
              </div>
              <div>
                <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--navy-800);">Đến ngày kết thúc</label>
                <input type="date" id="createBackupEndDate" class="form-control" />
              </div>
            </div>
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 12px; color: var(--navy-900);">
              <input type="checkbox" id="createBackupIncludeMaster" checked style="margin-top: 2px;" />
              <span>Luôn kèm dữ liệu nền tảng (Sách, Khách hàng, Cài đặt) để đảm bảo toàn vẹn liên kết khi phục hồi.</span>
            </label>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="font-weight: 600;">Ghi chú bản sao lưu (Tùy chọn)</label>
          <textarea id="createBackupNote" class="form-control" rows="3" placeholder="Nhập lý do tạo sao lưu (VD: Trước khi cập nhật danh mục sách mới...)"></textarea>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; font-size: 12px; color: var(--muted); line-height: 1.5;">
          <i class="fas fa-info-circle" style="color: #3B82F6;"></i> Hệ thống sẽ tự động đóng gói file ZIP chuẩn BSON/EJSON và lưu trữ vào thư mục an toàn trên máy chủ. Bạn có thể tải file này về máy sau khi tạo.
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 0;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modalCreateBackup')">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnSubmitCreateBackup" onclick="submitCreateBackup()">
          <i class="fas fa-play"></i> Bắt đầu sao lưu
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: PHỤC HỒI DỮ LIỆU TỪ SERVER (DANGEROUS) -->
  <!-- ========================================== -->
  <div class="modal-overlay" id="modalRestoreBackup">
    <div class="modal-content" style="max-width: 560px; width: 92%; border-radius: 14px; overflow: hidden; border: 2px solid #EF4444; padding: 0;">
      <div class="modal-header" style="background: #DC2626; color: #FFF; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0; margin-bottom: 0;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #FFF;">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Xác Nhận Phục Hồi Dữ Liệu Toàn Hệ Thống</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal('modalRestoreBackup')" style="color: #FFF;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <div style="background: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
          <div style="font-weight: 700; color: #991B1B; font-size: 13.5px; margin-bottom: 4px;">CẢNH BÁO NGUY HIỂM / THAO TÁC KHÔNG THỂ HOÀN TÁC TRỰC TIẾP:</div>
          <div style="font-size: 12.5px; color: #B91C1C; line-height: 1.5;">
            Thao tác này sẽ xóa trắng dữ liệu CSDL hiện tại và nạp lại toàn bộ từ bản sao lưu được chọn. Mọi phát sinh (đơn hàng mới, giao dịch, chỉnh sửa) sau thời điểm tạo bản sao lưu sẽ bị thay thế.
          </div>
        </div>

        <input type="hidden" id="restoreTargetBackupId" value="" />

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--muted);">Mã bản sao lưu:</span>
            <strong id="restoreTargetCode" style="color: var(--navy-900); font-family: monospace;">---</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--muted);">Tệp lưu trữ:</span>
            <span id="restoreTargetFile" style="font-weight: 600; color: #2563EB;">---</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--muted);">Tổng số bản ghi:</span>
            <strong id="restoreTargetDocs" style="color: #059669;">--- bản ghi</strong>
          </div>
        </div>

        <!-- TỰ ĐỘNG SNAPSHOT CHỐT CHẶN CỨU HỘ -->
        <div style="margin-bottom: 18px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px 14px;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="restoreAutoSnapshotCheck" checked style="margin-top: 3px;" />
            <div style="font-size: 12.5px; line-height: 1.4;">
              <strong style="color: #065F46;">Tự động tạo Snapshot cứu hộ trước khi ghi đè (Khuyên dùng)</strong>
              <div style="color: #047857; font-size: 11.5px; margin-top: 2px;">Hệ thống sẽ sao lưu tức thì CSDL hiện tại phòng khi bạn muốn quay lại trạng thái trước lúc phục hồi.</div>
            </div>
          </label>
        </div>

        <!-- XÁC THỰC MẬT KHẨU ADMIN -->
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 700; color: #991B1B;">
            <i class="fas fa-lock"></i> Nhập mật khẩu tài khoản Admin để xác nhận ủy quyền:
          </label>
          <input type="password" id="restoreAdminPassword" class="form-control" placeholder="Nhập mật khẩu đang đăng nhập..." style="border-color: #F87171;" />
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 0;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modalRestoreBackup')">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnSubmitRestoreBackup" onclick="submitRestoreBackup()" style="background: #DC2626; border-color: #DC2626;">
          <i class="fas fa-undo"></i> Xác nhận & Phục hồi dữ liệu
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: PHỤC HỒI TỪ TỆP TẢI LÊN (.ZIP) -->
  <!-- ========================================== -->
  <div class="modal-overlay" id="modalUploadRestore">
    <div class="modal-content" style="max-width: 540px; width: 92%; border-radius: 14px; overflow: hidden; border: 2px solid #F59E0B; padding: 0;">
      <div class="modal-header" style="background: #D97706; color: #FFF; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0; margin-bottom: 0;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #FFF;">
          <i class="fas fa-file-upload"></i>
          <span>Phục Hồi Dữ Liệu Từ File Máy Tính</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal('modalUploadRestore')" style="color: #FFF;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; font-size: 12.5px; color: #92400E; line-height: 1.5;">
          Chọn tệp sao lưu định dạng <strong>.zip</strong> đã từng xuất từ hệ thống L'Amour Bookstore để tiến hành nạp lại toàn bộ CSDL.
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="font-weight: 600;">Chọn tệp sao lưu (.zip)</label>
          <input type="file" id="uploadRestoreFileInput" accept=".zip" class="form-control" style="padding: 8px;" />
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Dung lượng tối đa hỗ trợ: 250 MB.</div>
        </div>

        <div style="margin-bottom: 18px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px 14px;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="uploadRestoreAutoSnapshotCheck" checked style="margin-top: 3px;" />
            <div style="font-size: 12.5px; line-height: 1.4;">
              <strong style="color: #065F46;">Tự động tạo Snapshot CSDL hiện tại trước khi khôi phục</strong>
            </div>
          </label>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 700; color: #991B1B;">
            <i class="fas fa-lock"></i> Mật khẩu Quản trị viên (Admin):
          </label>
          <input type="password" id="uploadRestoreAdminPassword" class="form-control" placeholder="Nhập mật khẩu Admin..." />
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 0;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modalUploadRestore')">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnSubmitUploadRestore" onclick="submitUploadRestore()" style="background: #D97706; border-color: #D97706;">
          <i class="fas fa-upload"></i> Tải lên & Khôi phục ngay
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: CẤU HÌNH TỰ ĐỘNG ĐỊNH KỲ -->
  <!-- ========================================== -->
  <div class="modal-overlay" id="modalBackupConfig">
    <div class="modal-content" style="max-width: 480px; width: 92%; border-radius: 14px; overflow: hidden; padding: 0;">
      <div class="modal-header" style="background: var(--navy-900); color: #FFF; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 14px 14px 0 0; margin-bottom: 0;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #FFF;">
          <i class="fas fa-clock" style="color: var(--color-amber);"></i>
          <span>Cấu Hình Tự Động Sao Lưu</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal('modalBackupConfig')" style="color: #FFF;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <div style="margin-bottom: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
            <div>
              <strong style="color: var(--navy-900); font-size: 14px;">Bật tự động sao lưu định kỳ</strong>
              <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">Hệ thống sẽ chạy nền vào khung giờ chỉ định</div>
            </div>
            <input type="checkbox" id="configAutoBackupEnabled" style="width: 20px; height: 20px; cursor: pointer;" />
          </label>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="font-weight: 600;">Khung giờ sao lưu hàng ngày (HH:mm)</label>
          <input type="time" id="configBackupScheduleTime" class="form-control" value="02:00" />
          <div style="font-size: 11.5px; color: var(--muted); margin-top: 4px;">Khuyên dùng khung giờ đêm khuya (01:00 - 04:00) ít người truy cập.</div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="font-weight: 600;">Phạm vi tự động sao lưu</label>
          <select id="configBackupScope" class="form-control">
            <option value="FULL">Toàn diện (CSDL + Tệp tải lên)</option>
            <option value="DATABASE_ONLY">Chỉ CSDL (MongoDB)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 600;">Thời gian lưu giữ bản sao lưu</label>
          <select id="configBackupRetentionDays" class="form-control">
            <option value="7">Lưu giữ 7 ngày gần nhất</option>
            <option value="15">Lưu giữ 15 ngày gần nhất</option>
            <option value="30" selected>Lưu giữ 30 ngày gần nhất (Khuyên dùng)</option>
            <option value="60">Lưu giữ 60 ngày gần nhất</option>
            <option value="90">Lưu giữ 90 ngày gần nhất</option>
          </select>
          <div style="font-size: 11.5px; color: var(--muted); margin-top: 4px;">Các bản sao lưu cũ hơn thời hạn này sẽ được tự động dọn dẹp để tiết kiệm dung lượng đĩa.</div>
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 0;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modalBackupConfig')">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnSubmitBackupConfig" onclick="submitBackupConfig()">
          <i class="fas fa-save"></i> Lưu cấu hình
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: PHÊ DUYỆT YÊU CẦU ẨN SÁCH TỪ KHO -->
  <!-- ========================================== -->
  <div class="modal-overlay" id="adminApproveHideRequestModal" style="z-index: 1300;">
    <div class="modal-content" style="max-width: 580px; width: 92%; border-radius: 14px; overflow: hidden; padding: 0;">
      <div class="modal-header" style="background: #065F46; color: #FFF; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 14px 14px 0 0; margin-bottom: 0;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #FFF;">
          <i class="fas fa-check-circle" style="color: #34D399;"></i>
          <span>Phê Duyệt Yêu Cầu Ẩn Sách</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal('adminApproveHideRequestModal')" style="color: #FFF; background:none; border:none; font-size:22px; cursor:pointer;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <input type="hidden" id="adminApproveReqId" value="" />
        
        <!-- Book preview card -->
        <div style="display:flex; gap:16px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px; margin-bottom:18px;">
          <img id="adminApproveBookCover" src="/images/placeholder-book.png" alt="Book cover" style="width:60px; height:85px; object-fit:cover; border-radius:6px; border:1px solid #CBD5E1; flex-shrink:0;" />
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:14px; color:#0F172A; margin-bottom:4px; line-height:1.3;" id="adminApproveBookTitle">---</div>
            <div style="font-size:12px; color:#64748B; margin-bottom:6px;">
              Mã sách: <span id="adminApproveBookCode" style="font-family:monospace; font-weight:600; color:#1E293B;">---</span> | Kệ: <span id="adminApproveBookShelf" style="font-weight:600; color:#2563EB;">---</span> | Tồn: <span id="adminApproveBookStock" style="font-weight:700; color:#D97706;">---</span>
            </div>
            <div style="font-size:12px; color:#475569; background:#fff; border:1px solid #E2E8F0; border-radius:6px; padding:6px 10px;">
              <strong>Người gửi:</strong> <span id="adminApproveReqSender">---</span><br>
              <strong>Lý do kho đưa ra:</strong> <span id="adminApproveReqReason" style="color:#B45309;">---</span>
            </div>
          </div>
        </div>

        <!-- Tự động ẩn checkbox -->
        <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:8px; padding:14px; margin-bottom:18px;">
          <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; margin-bottom:0;">
            <input type="checkbox" id="adminApproveAutoHide" checked style="width:18px; height:18px; margin-top:2px;" />
            <div>
              <strong style="color:#065F46; font-size:13.5px;">Tự động ẩn sách ngay lập tức sau khi duyệt</strong>
              <div style="color:#047857; font-size:12px; margin-top:2px;">Sách sẽ được gỡ khỏi trang bán hàng và đánh dấu 'Đã ẩn' ngay. Nếu bỏ chọn, nhân viên kho sẽ nhận quyền duyệt và chủ động bấm nút Ẩn sách trên giao diện kho.</div>
            </div>
          </label>
        </div>

        <!-- Admin Note -->
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-weight:600; font-size:13px; margin-bottom:6px;">Ghi chú phản hồi của Admin (tùy chọn):</label>
          <textarea id="adminApproveNote" class="form-control" rows="2" placeholder="Ví dụ: Đã kiểm tra lý do rách bìa, đồng ý cho kho tạm ẩn sách..."></textarea>
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 0;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('adminApproveHideRequestModal')">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnConfirmAdminApproveHide" onclick="submitAdminApproveHide()" style="background:#059669; border-color:#059669;">
          <i class="fas fa-check-circle"></i> Đồng Ý Phê Duyệt
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: TỪ CHỐI YÊU CẦU ẨN SÁCH TỪ KHO -->
  <!-- ========================================== -->
  <div class="modal-overlay" id="adminRejectHideRequestModal" style="z-index: 1300;">
    <div class="modal-content" style="max-width: 520px; width: 92%; border-radius: 14px; overflow: hidden; padding: 0;">
      <div class="modal-header" style="background: #991B1B; color: #FFF; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 14px 14px 0 0; margin-bottom: 0;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #FFF;">
          <i class="fas fa-times-circle" style="color: #F87171;"></i>
          <span>Từ Chối Yêu Cầu Ẩn Sách</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal('adminRejectHideRequestModal')" style="color: #FFF; background:none; border:none; font-size:22px; cursor:pointer;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <input type="hidden" id="adminRejectReqId" value="" />
        
        <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:12px 14px; margin-bottom:18px;">
          <div style="font-size:13px; color:#991B1B;">
            Từ chối yêu cầu của <strong><span id="adminRejectReqSender">---</span></strong> đối với sách: <strong><span id="adminRejectBookTitle">---</span></strong>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-weight:700; color:#991B1B; font-size:13px; margin-bottom:6px;">
            Lý do từ chối (* bắt buộc):
          </label>
          <textarea id="adminRejectReason" class="form-control" rows="3" placeholder="Nhập lý do không đồng ý ẩn (Ví dụ: Sách còn nhiều độc giả quan tâm, bao bì còn nguyên không được ẩn, cần kiểm kê lại...)" required></textarea>
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 0;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('adminRejectHideRequestModal')">Hủy bỏ</button>
        <button type="button" class="btn btn-danger" id="btnConfirmAdminRejectHide" onclick="submitAdminRejectHide()">
          <i class="fas fa-ban"></i> Xác Nhận Từ Chối
        </button>
      </div>
    </div>
  </div>
  <!-- ========================================== -->
  <!-- MODAL: PHÊ DUYỆT YÊU CẦU TẠM NGƯNG NCC TỪ KHO -->
  <!-- ========================================== -->
  <div class="modal-overlay" id="adminApproveSupplierSuspendModal" style="z-index: 1300;">
    <div class="modal-content" style="max-width: 580px; width: 92%; border-radius: 14px; overflow: hidden; padding: 0;">
      <div class="modal-header" style="background: #065F46; color: #FFF; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 14px 14px 0 0; margin-bottom: 0;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #FFF;">
          <i class="fas fa-check-circle" style="color: #34D399;"></i>
          <span>Phê Duyệt Yêu Cầu Tạm Ngưng Nhà Cung Cấp</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal('adminApproveSupplierSuspendModal')" style="color: #FFF; background:none; border:none; font-size:22px; cursor:pointer;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <input type="hidden" id="adminApproveSupReqId" value="" />
        
        <!-- Supplier preview card -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-weight:700; font-size:15px; color:#0F172A;" id="adminApproveSupName">---</div>
              <div style="font-size:12px; color:#64748B; margin-top:2px;">
                Mã: <span id="adminApproveSupCode" style="font-family:monospace; font-weight:600; color:#1E293B;">---</span> | Đại diện: <span id="adminApproveSupContact">---</span>
              </div>
            </div>
            <span style="background:#FEF3C7; color:#92400E; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px;">Chờ duyệt</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed #CBD5E1; font-size:12px; color:#334155;">
            <div>📞 SĐT: <strong id="adminApproveSupPhone">---</strong></div>
            <div>✉️ Email: <strong id="adminApproveSupEmail">---</strong></div>
            <div>📚 Số đầu sách: <strong id="adminApproveSupTitles">0</strong></div>
            <div>💰 Tổng tiền nhập: <strong id="adminApproveSupImport" style="color:#B45309;">0₫</strong></div>
          </div>

          <div style="font-size:12px; color:#475569; background:#fff; border:1px solid #E2E8F0; border-radius:6px; padding:8px 10px; margin-top:10px;">
            <strong>Người gửi:</strong> <span id="adminApproveSupSender">---</span><br>
            <strong>Lý do kho đề xuất:</strong> <span id="adminApproveSupReason" style="color:#B45309; font-weight:600;">---</span>
            <div id="adminApproveSupNoteWrap" style="margin-top:4px; display:none;">
              <strong>Ghi chú:</strong> <span id="adminApproveSupNoteText">---</span>
            </div>
          </div>
        </div>

        <!-- Tự động tạm ngưng checkbox -->
        <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:8px; padding:14px; margin-bottom:18px;">
          <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; margin-bottom:0;">
            <input type="checkbox" id="adminApproveAutoSuspend" checked style="width:18px; height:18px; margin-top:2px;" />
            <div>
              <strong style="color:#065F46; font-size:13.5px;">Tự động chuyển Nhà cung cấp sang 'Tạm ngưng' ngay lập tức</strong>
              <div style="color:#047857; font-size:12px; margin-top:2px;">Hệ thống sẽ chuyển trạng thái NCC sang Tạm ngưng và chặn lập phiếu nhập sách mới ngay. Nếu bỏ chọn, nhân viên kho sẽ nhận quyền duyệt và bấm Tạm ngưng trên màn hình kho.</div>
            </div>
          </label>
        </div>

        <!-- Admin Note -->
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-weight:600; font-size:13px; margin-bottom:6px;">Ghi chú phản hồi của Admin (tùy chọn):</label>
          <textarea id="adminApproveSupNote" class="form-control" rows="2" placeholder="Ví dụ: Đồng ý tạm ngưng đối tác do chính sách chiết khấu không còn phù hợp..."></textarea>
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 0;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('adminApproveSupplierSuspendModal')">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnConfirmAdminApproveSup" onclick="submitAdminApproveSupplierSuspend()" style="background:#059669; border-color:#059669;">
          <i class="fas fa-check-circle"></i> Đồng Ý Phê Duyệt
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL: TỪ CHỐI YÊU CẦU TẠM NGƯNG NCC TỪ KHO -->
  <!-- ========================================== -->
  <div class="modal-overlay" id="adminRejectSupplierSuspendModal" style="z-index: 1300;">
    <div class="modal-content" style="max-width: 520px; width: 92%; border-radius: 14px; overflow: hidden; padding: 0;">
      <div class="modal-header" style="background: #991B1B; color: #FFF; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 14px 14px 0 0; margin-bottom: 0;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #FFF;">
          <i class="fas fa-times-circle" style="color: #F87171;"></i>
          <span>Từ Chối Yêu Cầu Tạm Ngưng NCC</span>
        </h3>
        <button type="button" class="modal-close" onclick="closeModal('adminRejectSupplierSuspendModal')" style="color: #FFF; background:none; border:none; font-size:22px; cursor:pointer;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <input type="hidden" id="adminRejectSupReqId" value="" />
        
        <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:12px 14px; margin-bottom:18px;">
          <div style="font-size:13px; color:#991B1B;">
            Từ chối yêu cầu của <strong><span id="adminRejectSupSender">---</span></strong> đối với Nhà cung cấp: <strong><span id="adminRejectSupName">---</span></strong>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-weight:700; color:#991B1B; font-size:13px; margin-bottom:6px;">
            Lý do từ chối (* bắt buộc):
          </label>
          <textarea id="adminRejectSupReason" class="form-control" rows="3" placeholder="Nhập lý do không đồng ý tạm ngưng (Ví dụ: Đối tác đã cam kết giao bù hàng vào tuần sau, hợp đồng còn hiệu lực đến cuối quý...)" required></textarea>
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 0;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('adminRejectSupplierSuspendModal')">Hủy bỏ</button>
        <button type="button" class="btn btn-danger" id="btnConfirmAdminRejectSup" onclick="submitAdminRejectSupplierSuspend()">
          <i class="fas fa-ban"></i> Xác Nhận Từ Chối
        </button>
      </div>
    </div>
  </div>
`;



