const mongoose = require('mongoose');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const { logActivity } = require('../utils/auditLogger');

// @desc    Lấy danh sách người dùng theo role (vd: ?role=staff hoặc ?role=staff,admin)
// @route   GET /api/users
// @access  Private/Admin
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;
    let filter = {};

    if (role) {
      if (role.includes(',')) {
        const roles = role.split(',').map(r => r.trim());
        filter = { role: { $in: roles } };
      } else {
        filter = { role };
      }
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách người dùng'
    });
  }
};

// @desc    Khóa / Mở khóa tài khoản người dùng
// @route   PUT /api/users/:id/lock
// @access  Private/Admin
const toggleUserLock = async (req, res) => {
  try {
    // Chỉ admin mới có quyền khóa tài khoản
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị viên (Admin) mới có quyền khóa/mở khóa tài khoản!'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isCurrentlyActive = (user.status !== 'blocked' && user.isActive !== false);

    // Nếu đang hoạt động mà muốn khóa: Kiểm tra không được khóa Admin
    if (isCurrentlyActive) {
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không thể khóa tài khoản có quyền Quản trị viên (Admin)!'
        });
      }
      if (req.user._id.toString() === user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể tự khóa tài khoản của chính mình!'
        });
      }
    }

    const willActive = !isCurrentlyActive;
    user.isActive = willActive;
    user.status = willActive ? 'active' : 'blocked';
    await user.save();

    logActivity(req, {
      module: 'USERS',
      action: willActive ? 'USER_UNBLOCK' : 'USER_BLOCK',
      severity: willActive ? 'INFO' : 'WARNING',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `${willActive ? 'Mở khóa' : 'Khóa'} tài khoản người dùng: ${user.name} (${user.email})`,
      diff: [
        { field: 'status', fieldLabel: 'Trạng thái', oldValue: isCurrentlyActive ? 'active' : 'blocked', newValue: user.status }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Đã ${user.isActive ? 'mở khóa' : 'khóa'} tài khoản ${user.name} thành công.`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Lỗi khi khóa/mở khóa người dùng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi khóa/mở khóa người dùng'
    });
  }
};

// @desc    Tạo nhân viên mới / người dùng mới
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Nếu tạo tài khoản vai trò khách hàng (user), chuyển tiếp xử lý sang createCustomer
    if (role === 'user') {
      return createCustomer(req, res);
    }

    // Kiểm tra hợp lệ: bắt buộc có đầy đủ họ tên, email, mật khẩu, vai trò
    if (!name || !name.trim() || !email || !email.trim() || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ họ tên, email, mật khẩu và vai trò.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim();

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email không đúng định dạng (Ví dụ: nguyenvana@gmail.com)'
      });
    }

    const phoneRegex = /^0[0-9]{8,9}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
      });
    }

    // Kiểm tra trùng lặp email hoặc số điện thoại trong collection User
    const duplicateConditions = [{ email: cleanEmail }, { phone: cleanPhone }];

    const userExists = await User.findOne({
      $or: duplicateConditions
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc số điện thoại này đã được sử dụng'
      });
    }

    // Tạo mới tài khoản với isActive: true, mật khẩu được mã hóa an toàn qua pre('save') bcrypt
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password,
      role: role.trim(),
      isActive: true
    });

    logActivity(req, {
      module: 'USERS',
      action: 'USER_CREATE_STAFF',
      severity: 'CRITICAL',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `Quản trị viên tạo tài khoản nhân sự mới: "${user.name}" (${user.email}), vai trò được cấp: [${user.role}]`,
      metadata: {
        role: user.role,
        email: user.email,
        phone: user.phone
      }
    });

    // Trả về status 201 cùng thông báo thành công và dữ liệu nhân viên mới tạo (ẩn mật khẩu)
    res.status(201).json({
      success: true,
      message: 'Đã thêm nhân viên mới thành công!',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo nhân viên mới:', error);

    // Xử lý nếu trùng key duplicate index MongoDB (code 11000)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc số điện thoại này đã được sử dụng'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo nhân viên mới'
    });
  }
};

// @desc    Lấy toàn bộ thông tin hồ sơ của User đang đăng nhập
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin hồ sơ:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin hồ sơ'
    });
  }
};

// @desc    Cập nhật thông tin hồ sơ (Tên, Giới tính, Ngày sinh, SĐT)
// @route   PUT /api/user/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const { name, gender, birthday, phone } = req.body;

    if (name && name.trim()) {
      const cleanName = name.trim();
      const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]+$/;
      if (!nameRegex.test(cleanName)) {
        return res.status(400).json({
          success: false,
          message: 'Họ và tên chỉ được chứa chữ cái tiếng Việt và khoảng trắng, không chứa số hoặc ký tự đặc biệt'
        });
      }
      user.name = cleanName;
    }
    if (gender && ['Nam', 'Nữ', 'Khác'].includes(gender)) {
      user.gender = gender;
    }
    if (birthday !== undefined) {
      user.birthday = birthday;
    }
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim();
      const phoneRegex = /^0[0-9]{8,9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
        });
      }
      // Kiểm tra trùng SĐT với người khác
      const phoneExists = await User.findOne({ phone: cleanPhone, _id: { $ne: user._id } });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại này đã được sử dụng bởi tài khoản khác'
        });
      }
      user.phone = cleanPhone;
    }

    await user.save();

    logActivity(req, {
      module: 'USERS',
      action: 'USER_UPDATE_PROFILE',
      severity: 'INFO',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `Người dùng ${user.name} (${user.email}) đã cập nhật thông tin hồ sơ cá nhân`
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công!',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        gender: user.gender,
        birthday: user.birthday,
        identityCard: user.identityCard,
        addresses: user.addresses,
        bankAccounts: user.bankAccounts
      }
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật hồ sơ:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật hồ sơ'
    });
  }
};

// @desc    Upload ảnh đại diện user
// @route   POST /api/user/avatar
// @access  Private
const uploadUserAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file hình ảnh đại diện'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const avatarPath = '/uploads/users/' + req.file.filename;
    user.avatar = avatarPath;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công!',
      avatar: avatarPath
    });
  } catch (error) {
    console.error('Lỗi upload avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tải lên ảnh đại diện'
    });
  }
};

// @desc    Thêm mới địa chỉ giao hàng
// @route   POST /api/user/address
// @access  Private
const addUserAddress = async (req, res) => {
  try {
    const { fullName, phone, province, district, ward, detailAddress, isDefault } = req.body;

    if (!fullName || !fullName.trim() || !phone || !phone.trim() || !detailAddress || !detailAddress.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ cụ thể'
      });
    }

    const phoneRegex = /^0[0-9]{8,9}$/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Nếu là địa chỉ đầu tiên hoặc được đánh dấu mặc định
    const shouldBeDefault = isDefault === true || user.addresses.length === 0;

    if (shouldBeDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    const newAddress = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      province: (province || '').trim(),
      district: (district || '').trim(),
      ward: (ward || '').trim(),
      detailAddress: detailAddress.trim(),
      isDefault: shouldBeDefault
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Thêm địa chỉ giao hàng thành công!',
      data: user.addresses
    });
  } catch (error) {
    console.error('Lỗi khi thêm địa chỉ:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi thêm địa chỉ'
    });
  }
};

// @desc    Cập nhật địa chỉ hoặc đặt làm mặc định
// @route   PUT /api/user/address/:id
// @access  Private
const updateUserAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, province, district, ward, detailAddress, isDefault } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const address = user.addresses.id(id);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa chỉ cần cập nhật'
      });
    }

    if (fullName !== undefined) address.fullName = fullName.trim();
    if (phone !== undefined) {
      const cleanPhone = phone.trim();
      const phoneRegex = /^0[0-9]{8,9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số'
        });
      }
      address.phone = cleanPhone;
    }
    if (province !== undefined) address.province = province.trim();
    if (district !== undefined) address.district = district.trim();
    if (ward !== undefined) address.ward = ward.trim();
    if (detailAddress !== undefined) address.detailAddress = detailAddress.trim();

    if (isDefault === true) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
      address.isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật địa chỉ thành công!',
      data: user.addresses
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật địa chỉ:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật địa chỉ'
    });
  }
};

// @desc    Xóa địa chỉ giao hàng
// @route   DELETE /api/user/address/:id
// @access  Private
const deleteUserAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const addrIndex = user.addresses.findIndex(a => a._id.toString() === id);
    if (addrIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa chỉ cần xóa'
      });
    }

    const wasDefault = user.addresses[addrIndex].isDefault;
    user.addresses.splice(addrIndex, 1);

    // Nếu vừa xóa địa chỉ mặc định mà còn địa chỉ khác thì gán địa chỉ đầu tiên làm mặc định
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đã xóa địa chỉ thành công!',
      data: user.addresses
    });
  } catch (error) {
    console.error('Lỗi khi xóa địa chỉ:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa địa chỉ'
    });
  }
};

// @desc    Thêm tài khoản ngân hàng liên kết
// @route   POST /api/user/bank
// @access  Private
const addUserBank = async (req, res) => {
  try {
    const { bankName, accountNumber, accountHolder, branch, isDefault } = req.body;

    if (!bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ tên ngân hàng, số tài khoản và họ tên chủ thẻ'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const shouldBeDefault = isDefault === true || user.bankAccounts.length === 0;

    if (shouldBeDefault) {
      user.bankAccounts.forEach(b => {
        b.isDefault = false;
      });
    }

    user.bankAccounts.push({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim().toUpperCase(),
      branch: (branch || '').trim(),
      isDefault: shouldBeDefault,
      status: 'Đã duyệt'
    });

    await user.save();

    logActivity(req, {
      module: 'USERS',
      action: 'USER_BANK_CHANGE',
      severity: 'WARNING',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `Thêm tài khoản ngân hàng: ${bankName.trim()} - ${accountNumber.trim()} (${accountHolder.trim().toUpperCase()})`,
      metadata: {
        actionType: 'ADD_BANK',
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim().toUpperCase(),
        branch: (branch || '').trim(),
        isDefault: shouldBeDefault
      }
    });

    res.status(201).json({
      success: true,
      message: 'Liên kết tài khoản ngân hàng thành công!',
      data: user.bankAccounts
    });
  } catch (error) {
    console.error('Lỗi khi thêm ngân hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi thêm ngân hàng'
    });
  }
};

// @desc    Đặt tài khoản ngân hàng làm mặc định
// @route   PUT /api/user/bank/default/:id
// @access  Private
const setDefaultUserBank = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    let found = false;
    user.bankAccounts.forEach(b => {
      if (b._id.toString() === id) {
        b.isDefault = true;
        found = true;
      } else {
        b.isDefault = false;
      }
    });

    if (!found) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản ngân hàng này'
      });
    }

    await user.save();

    const defBank = user.bankAccounts.find(b => b.isDefault);
    logActivity(req, {
      module: 'USERS',
      action: 'USER_BANK_CHANGE',
      severity: 'INFO',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `Đặt tài khoản ngân hàng ${defBank ? `${defBank.bankName} - ${defBank.accountNumber}` : id} làm mặc định`,
      metadata: {
        actionType: 'SET_DEFAULT',
        bankId: id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Đã thiết lập tài khoản ngân hàng mặc định!',
      data: user.bankAccounts
    });
  } catch (error) {
    console.error('Lỗi khi đặt ngân hàng mặc định:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi đặt ngân hàng mặc định'
    });
  }
};

// @desc    Xóa tài khoản ngân hàng
// @route   DELETE /api/user/bank/:id
// @access  Private
const deleteUserBank = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const bankIndex = user.bankAccounts.findIndex(b => b._id.toString() === id);
    if (bankIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản ngân hàng cần xóa'
      });
    }

    const removedBank = user.bankAccounts[bankIndex];
    const removedDesc = removedBank ? `${removedBank.bankName} - ${removedBank.accountNumber}` : id;
    user.bankAccounts.splice(bankIndex, 1);

    if (wasDefault && user.bankAccounts.length > 0) {
      user.bankAccounts[0].isDefault = true;
    }

    await user.save();

    logActivity(req, {
      module: 'USERS',
      action: 'USER_BANK_CHANGE',
      severity: 'WARNING',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `Xóa tài khoản ngân hàng: ${removedDesc}`,
      metadata: {
        actionType: 'DELETE_BANK',
        bankId: id,
        bankName: removedBank?.bankName,
        accountNumber: removedBank?.accountNumber
      }
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa tài khoản ngân hàng thành công!',
      data: user.bankAccounts
    });
  } catch (error) {
    console.error('Lỗi khi xóa ngân hàng:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa ngân hàng'
    });
  }
};

// @desc    Cập nhật thông tin CCCD định danh
// @route   PUT /api/user/identity
// @access  Private
const updateUserIdentity = async (req, res) => {
  try {
    const { fullName, idNumber, permanentAddress } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const oldIdNumber = user.identityCard?.idNumber || '';
    user.identityCard = {
      fullName: (fullName || '').trim(),
      idNumber: (idNumber || '').trim(),
      permanentAddress: (permanentAddress || '').trim()
    };

    await user.save();

    logActivity(req, {
      module: 'USERS',
      action: 'USER_UPDATE_PROFILE',
      severity: 'WARNING',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `Cập nhật thông tin CCCD/Định danh: Họ tên "${user.identityCard.fullName}", Số CCCD: ${user.identityCard.idNumber ? user.identityCard.idNumber.replace(/\d(?=\d{4})/g, '*') : 'Trống'}`,
      metadata: {
        actionType: 'UPDATE_IDENTITY',
        hasOldId: Boolean(oldIdNumber)
      }
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin CCCD thành công!',
      data: user.identityCard
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật CCCD:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật CCCD'
    });
  }
};

// @desc    Đổi mật khẩu người dùng
// @route   PUT /api/user/change-password
// @access  Private
const changeUserPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền mật khẩu cũ và mật khẩu mới'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 6 ký tự'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      logActivity(req, {
        module: 'AUTH',
        action: 'AUTH_CHANGE_PASSWORD',
        severity: 'WARNING',
        status: 'FAILURE',
        targetId: String(user._id),
        targetModel: 'User',
        targetLabel: `${user.name} (${user.email})`,
        description: `Người dùng ${user.name} đổi mật khẩu thất bại (mật khẩu hiện tại không đúng)`
      });

      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    user.password = newPassword;
    await user.save();

    logActivity(req, {
      module: 'AUTH',
      action: 'AUTH_CHANGE_PASSWORD',
      severity: 'WARNING',
      status: 'SUCCESS',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `Người dùng ${user.name} (${user.email}) đã đổi mật khẩu tài khoản thành công`
    });

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });
  } catch (error) {
    console.error('Lỗi khi đổi mật khẩu:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi đổi mật khẩu'
    });
  }
};

// ============ ENTERPRISE ADMIN PORTAL USER MODULES ============

// @desc    Lấy tất cả tài khoản với tìm kiếm, phân trang & lọc role
// @route   GET /api/users/accounts
// @access  Private/Admin
const getAllAccounts = async (req, res) => {
  try {
    const { q, search, role, status } = req.query;
    const searchTerm = (q || search || '').trim();
    const conditions = [];

    if (searchTerm) {
      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      const orClauses = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { employeeCode: searchRegex }
      ];
      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        orClauses.push({ _id: searchTerm });
      }
      conditions.push({ $or: orClauses });
    }

    if (role && role !== 'all') {
      conditions.push({ role });
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        conditions.push({
          status: { $ne: 'blocked' },
          isActive: { $ne: false }
        });
      } else if (status === 'blocked') {
        conditions.push({
          $or: [
            { status: 'blocked' },
            { isActive: false }
          ]
        });
      }
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tài khoản:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách tài khoản'
    });
  }
};

// @desc    Đổi quyền / trạng thái tài khoản (Role: admin, staff, stock, accountant, user | Status: active, blocked)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  try {
    // Chỉ admin mới có quyền đổi vai trò hoặc khóa/mở khóa tài khoản
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này!'
      });
    }

    const { role, status } = req.body;
    const validRoles = ['admin', 'staff', 'stock', 'accountant', 'user'];
    const validStatuses = ['active', 'blocked'];

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ. Chỉ chấp nhận: admin, staff, stock, accountant, user.'
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: active, blocked.'
      });
    }

    if (!role && !status) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp vai trò hoặc trạng thái cần cập nhật.'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản người dùng'
      });
    }

    // Nếu đang thao tác khóa tài khoản
    if (status === 'blocked') {
      // 1. Không cho phép tự khóa tài khoản của chính mình
      if (req.user._id.toString() === user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể tự khóa tài khoản của chính mình!'
        });
      }
      // 2. Không cho phép khóa tài khoản Admin khác
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không thể khóa tài khoản có quyền Quản trị viên (Admin)!'
        });
      }
    }

    // Không cho phép tự hạ quyền admin của chính mình nếu đang đăng nhập
    if (req.user._id.toString() === user._id.toString()) {
      if (role && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể tự hạ quyền Admin của chính mình!'
        });
      }
    }

    const oldRole = user.role;
    const oldStatus = user.status;

    if (role) user.role = role;
    if (status) {
      user.status = status;
      user.isActive = (status === 'active');
    }
    await user.save();

    const roleChanged = role && role !== oldRole;
    const statusChanged = status && status !== oldStatus;

    logActivity(req, {
      module: 'USERS',
      action: roleChanged ? 'USER_UPDATE_ROLE' : 'USER_STATUS_CHANGE',
      severity: roleChanged ? 'CRITICAL' : 'WARNING',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: roleChanged
        ? `Thay đổi vai trò người dùng "${user.name}" từ [${oldRole}] thành [${user.role}]`
        : `Thay đổi trạng thái tài khoản "${user.name}" thành [${user.status}]`,
      diff: [
        ...(roleChanged ? [{ field: 'role', fieldLabel: 'Vai trò (Role)', oldValue: oldRole, newValue: user.role }] : []),
        ...(statusChanged ? [{ field: 'status', fieldLabel: 'Trạng thái', oldValue: oldStatus, newValue: user.status }] : [])
      ]
    });

    res.status(200).json({
      success: true,
      message: `Đã cập nhật tài khoản ${user.name} thành công.`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật tài khoản:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật tài khoản'
    });
  }
};

// @desc    Admin đặt lại mật khẩu cho tài khoản
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
const adminResetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const pwd = (newPassword && newPassword.trim()) ? newPassword.trim() : '123456';

    if (pwd.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới tối thiểu 6 ký tự.'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản người dùng'
      });
    }

    user.password = pwd;
    await user.save();

    logActivity(req, {
      module: 'USERS',
      action: 'USER_RESET_PASSWORD',
      severity: 'WARNING',
      targetId: String(user._id),
      targetModel: 'User',
      targetLabel: `${user.name} (${user.email})`,
      description: `Quản trị viên đặt lại mật khẩu cho tài khoản: ${user.name} (${user.email})`
    });

    res.status(200).json({
      success: true,
      message: `Đã đặt lại mật khẩu cho tài khoản ${user.name} thành công. Mật khẩu mới: ${pwd}`
    });
  } catch (error) {
    console.error('Lỗi khi reset mật khẩu:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đặt lại mật khẩu'
    });
  }
};

// @desc    Lấy danh sách hồ sơ nhân viên
// @route   GET /api/users/employees
// @access  Private/Admin
const getEmployees = async (req, res) => {
  try {
    const { q, search, department } = req.query;
    const searchTerm = (q || search || '').trim();
    const conditions = [
      { role: { $in: ['staff', 'stock', 'accountant', 'admin'] } }
    ];

    if (searchTerm) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const orClauses = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { employeeCode: regex }
      ];
      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        orClauses.push({ _id: searchTerm });
      }
      conditions.push({ $or: orClauses });
    }

    if (department && department !== 'all') {
      conditions.push({ department });
    }

    const { role } = req.query;
    if (role && role !== 'all') {
      conditions.push({ role });
    }

    const filter = conditions.length > 1 ? { $and: conditions } : conditions[0];
    const employees = await User.find(filter).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách nhân viên:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách nhân viên'
    });
  }
};

// @desc    Tạo mới hồ sơ nhân viên với validate nghiêm ngặt
// @route   POST /api/users/employees
// @access  Private/Admin
const createEmployee = async (req, res) => {
  try {
    const { name, phone, email, password, department, shift, role, startDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ và tên nhân viên.' });
    }

    // Validate tên hợp lệ (chữ cái tiếng Việt, số, khoảng trắng và ký tự thông dụng như (), -, .)
    const nameRegex = /^[\p{L}\p{M}\s0-9().,'"-]+$/u;
    if (!nameRegex.test(name.trim()) || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Họ và tên nhân viên phải có ít nhất 2 ký tự và không chứa ký tự đặc biệt!'
      });
    }

    // Validate SĐT 9-10 số bắt đầu bằng 0
    const phoneRegex = /^0[0-9]{8,9}$/;
    if (!phone || !phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số!'
      });
    }

    // Validate Email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Email không đúng định dạng (Ví dụ: nguyenvana@gmail.com)!'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Check duplicate email or phone
    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }]
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc số điện thoại này đã được sử dụng trong hệ thống!'
      });
    }

    // Sinh mã nhân viên NV-XXXX
    const count = await User.countDocuments({ role: { $in: ['staff', 'stock', 'accountant', 'admin'] } });
    const empCode = 'NV-' + String(count + 1).padStart(4, '0');

    const employee = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      password: password && password.trim().length >= 6 ? password.trim() : '123456',
      role: role && ['staff', 'stock', 'accountant', 'admin'].includes(role) ? role : 'staff',
      department: department || 'Bán hàng',
      shift: shift || 'Ca sáng (08:00 - 16:00)',
      employeeCode: empCode,
      startDate: startDate ? new Date(startDate) : new Date(),
      isActive: true
    });

    logActivity(req, {
      module: 'USERS',
      action: 'EMPLOYEE_CREATE',
      severity: 'INFO',
      targetId: String(employee._id),
      targetModel: 'User',
      targetLabel: `${employee.name} (${empCode})`,
      description: `Thêm nhân viên mới "${employee.name}" (${empCode}) - Phòng ban: ${employee.department}, Vai trò: ${employee.role}`
    });

    res.status(201).json({
      success: true,
      message: `Thêm nhân viên "${employee.name}" (${empCode}) thành công!`,
      data: employee
    });
  } catch (error) {
    console.error('Lỗi khi tạo nhân viên:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo nhân viên mới'
    });
  }
};

// @desc    Cập nhật hồ sơ nhân viên
// @route   PUT /api/users/employees/:id
// @access  Private/Admin
const updateEmployee = async (req, res) => {
  try {
    const { name, phone, email, department, shift, role, isActive } = req.body;
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    if (name) {
      const nameRegex = /^[\p{L}\p{M}\s0-9().,'"-]+$/u;
      if (!nameRegex.test(name.trim()) || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Họ và tên nhân viên phải có ít nhất 2 ký tự và không chứa ký tự đặc biệt!'
        });
      }
      employee.name = name.trim();
    }

    if (phone) {
      const phoneRegex = /^0[0-9]{8,9}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số!'
        });
      }
      // Check duplicate phone with other users
      const dupPhone = await User.findOne({ phone: phone.trim(), _id: { $ne: employee._id } });
      if (dupPhone) {
        return res.status(400).json({ success: false, message: 'Số điện thoại này đã được sử dụng bởi tài khoản khác!' });
      }
      employee.phone = phone.trim();
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Email không đúng định dạng!' });
      }
      const dupEmail = await User.findOne({ email: cleanEmail, _id: { $ne: employee._id } });
      if (dupEmail) {
        return res.status(400).json({ success: false, message: 'Email này đã được sử dụng bởi tài khoản khác!' });
      }
      employee.email = cleanEmail;
    }

    const oldDept = employee.department;
    const oldRole = employee.role;

    if (department) employee.department = department;
    if (shift) employee.shift = shift;
    if (role && ['staff', 'stock', 'accountant', 'admin'].includes(role)) employee.role = role;
    const willBlock = (typeof isActive === 'boolean' && !isActive) || req.body.status === 'blocked';
    if (willBlock && employee.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Không thể khóa tài khoản có quyền Quản trị viên (Admin)!'
      });
    }

    if (typeof isActive === 'boolean') {
      employee.isActive = isActive;
      employee.status = isActive ? 'active' : 'blocked';
    }
    if (req.body.status) {
      employee.status = req.body.status;
      employee.isActive = (req.body.status === 'active');
    }

    await employee.save();

    logActivity(req, {
      module: 'USERS',
      action: 'EMPLOYEE_UPDATE',
      severity: role && role !== oldRole ? 'CRITICAL' : 'INFO',
      targetId: String(employee._id),
      targetModel: 'User',
      targetLabel: `${employee.name} (${employee.employeeCode || ''})`,
      description: `Cập nhật hồ sơ nhân viên "${employee.name}": Phòng ban [${employee.department}], Vai trò [${employee.role}], Trạng thái [${employee.status}]`,
      diff: [
        ...(department && department !== oldDept ? [{ field: 'department', fieldLabel: 'Phòng ban', oldValue: oldDept, newValue: department }] : []),
        ...(role && role !== oldRole ? [{ field: 'role', fieldLabel: 'Vai trò', oldValue: oldRole, newValue: role }] : [])
      ]
    });

    res.status(200).json({
      success: true,
      message: `Cập nhật thông tin nhân viên ${employee.name} thành công!`,
      data: employee
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật nhân viên:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật nhân viên'
    });
  }
};

const buildVietnameseRegex = (str) => {
  if (!str) return '';
  const map = {
    a: '[aàáạảãâầấậẩẫăằắặẳẵ]',
    e: '[eèéẹẻẽêềếệểễ]',
    i: '[iìíịỉĩ]',
    o: '[oòóọỏõôồốộổỗơờớợởỡ]',
    u: '[uùúụủũưừứựửữ]',
    y: '[yỳýỵỷỹ]',
    d: '[dđ]'
  };
  return str
    .split('')
    .map(c => map[c.toLowerCase()] || c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('');
};

// @desc    Lấy danh sách khách hàng kèm tổng chi tiêu và số đơn
// @route   GET /api/users/customers
// @access  Private/Admin
const getCustomers = async (req, res) => {
  try {
    const { q, search } = req.query;
    const searchTerm = (q || search || '').trim();
    const conditions = [{
      $or: [
        { role: 'user' },
        { role: { $exists: false } },
        { role: { $nin: ['admin', 'staff', 'stock', 'accountant'] } }
      ]
    }];

    if (searchTerm) {
      const vnPattern = buildVietnameseRegex(searchTerm);
      const vnRegex = new RegExp(vnPattern, 'i');
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const directRegex = new RegExp(escaped, 'i');

      const orClauses = [
        { name: vnRegex },
        { name: directRegex },
        { email: directRegex },
        { phone: directRegex },
        { account: directRegex }
      ];
      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        orClauses.push({ _id: searchTerm });
      }
      conditions.push({ $or: orClauses });
    }

    const filter = conditions.length > 1 ? { $and: conditions } : conditions[0];
    const customers = await User.find(filter).select('-password').sort({ createdAt: -1 });

    // Aggregate purchase metrics from Invoice collection
    const customerIds = customers.map(c => c._id);
    const customerPhones = customers.map(c => c.phone).filter(Boolean);

    const invoices = await Invoice.find({
      $or: [
        { user: { $in: customerIds } },
        { customerPhone: { $in: customerPhones } }
      ]
    }).select('user customerPhone finalAmount totalAmount status createdAt paymentStatus');

    const customerStatsMap = {};
    for (const inv of invoices) {
      let key = inv.user ? inv.user.toString() : null;
      if (!key && inv.customerPhone) {
        const found = customers.find(c => c.phone === inv.customerPhone);
        if (found) key = found._id.toString();
      }
      if (!key) continue;

      if (!customerStatsMap[key]) {
        customerStatsMap[key] = {
          orderCount: 0,
          completedCount: 0,
          totalSpent: 0,
          lastOrderDate: null
        };
      }

      customerStatsMap[key].orderCount += 1;
      const isPaid = inv.paymentStatus === 'paid' || ['completed', 'paid'].includes(inv.status);
      if (isPaid) {
        customerStatsMap[key].completedCount += 1;
        customerStatsMap[key].totalSpent += (inv.finalAmount || inv.totalAmount || 0);
      }

      if (!customerStatsMap[key].lastOrderDate || new Date(inv.createdAt) > new Date(customerStatsMap[key].lastOrderDate)) {
        customerStatsMap[key].lastOrderDate = inv.createdAt;
      }
    }

    const result = customers.map(c => {
      const stats = customerStatsMap[c._id.toString()] || {
        orderCount: 0,
        completedCount: 0,
        totalSpent: 0,
        lastOrderDate: null
      };
      const defaultAddr = (c.addresses && c.addresses.find(a => a.isDefault)) || (c.addresses && c.addresses[0]) || null;
      return {
        _id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        gender: c.gender || 'Nam',
        birthday: c.birthday || '',
        status: c.status || (c.isActive !== false ? 'active' : 'blocked'),
        address: defaultAddr ? defaultAddr.detailAddress : '',
        avatar: c.avatar,
        isActive: c.isActive,
        createdAt: c.createdAt,
        addresses: c.addresses || [],
        orderCount: stats.orderCount,
        completedCount: stats.completedCount,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khách hàng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách khách hàng'
    });
  }
};

// @desc    Lấy lịch sử mua sắm của một khách hàng
// @route   GET /api/users/customers/:id/orders
// @access  Private/Admin
const getCustomerOrdersHistory = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    const orders = await Invoice.find({
      $or: [
        { user: customer._id },
        { customerPhone: customer.phone }
      ]
    })
      .populate('items.book', 'title author coverImage bookCode price')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      data: orders
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử đơn hàng của khách:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy lịch sử đơn hàng'
    });
  }
};

// @desc    Tạo khách hàng mới (CRM & Quản lý khách hàng)
// @route   POST /api/users/customers
// @access  Private (Admin, Staff)
const createCustomer = async (req, res) => {
  try {
    let { name, account, phone, email, password, gender, birthday, address, status, isActive } = req.body;
    let cleanPhone = (phone || '').trim();
    let cleanEmail = (email || '').trim().toLowerCase();

    // Nếu gửi trường account (tài khoản đăng nhập)
    if (account && typeof account === 'string') {
      const trimmedAcc = account.trim();
      if (/^0[0-9]{8,9}$/.test(trimmedAcc)) {
        if (!cleanPhone) cleanPhone = trimmedAcc;
      } else if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedAcc)) {
        if (!cleanEmail) cleanEmail = trimmedAcc.toLowerCase();
      } else if (!cleanPhone) {
        cleanPhone = trimmedAcc;
      }
    }

    // Kiểm tra họ và tên
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập họ và tên khách hàng (tối thiểu 2 ký tự)!'
      });
    }

    // Kiểm tra định dạng số điện thoại
    const phoneRegex = /^0[0-9]{8,9}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đăng nhập / Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số!'
      });
    }

    // Kiểm tra số điện thoại trùng lặp
    const existingPhone = await User.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã được sử dụng bởi khách hàng khác trong hệ thống!'
      });
    }

    // Xử lý email: Nếu có thì validate chuẩn Gmail/Email + check trùng, nếu không thì tự tạo email duy nhất
    if (cleanEmail) {
      const parts = cleanEmail.split('@');
      if (parts.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'Email không đúng định dạng (Ví dụ: nguyenvana@gmail.com)!'
        });
      }
      const [username, domain] = parts;
      if (username.length < 6 || username.length > 30) {
        return res.status(400).json({
          success: false,
          message: `Tên người dùng (Username) của email phải có độ dài từ 6 đến 30 ký tự (hiện có ${username.length} ký tự)!`
        });
      }
      if (!/^[a-zA-Z0-9.]+$/.test(username)) {
        return res.status(400).json({
          success: false,
          message: 'Tên người dùng chỉ được dùng chữ cái (a-z), chữ số (0-9) và dấu chấm (.). Không dùng ký tự đặc biệt như dấu gạch dưới _, dấu cách hay dấu phẩy!'
        });
      }
      if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
        return res.status(400).json({
          success: false,
          message: 'Tên người dùng không được bắt đầu, kết thúc bằng dấu chấm (.) hoặc chứa 2 dấu chấm liên tiếp!'
        });
      }
      if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
        return res.status(400).json({
          success: false,
          message: 'Tên miền email không hợp lệ (Ví dụ: @gmail.com)!'
        });
      }

      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng bởi tài khoản khác trong hệ thống!'
        });
      }
    } else {
      cleanEmail = `${cleanPhone}@khachhang.lamour.vn`;
      const existingAutoEmail = await User.findOne({ email: cleanEmail });
      if (existingAutoEmail) {
        cleanEmail = `${cleanPhone}_${Date.now()}@khachhang.lamour.vn`;
      }
    }

    // Mật khẩu mặc định là 123456 nếu để trống hoặc ngắn hơn 6 ký tự
    const cleanPassword = (password && password.trim().length >= 6) ? password.trim() : '123456';

    // Tạo địa chỉ mặc định nếu có nhập địa chỉ
    const addresses = [];
    if (address && address.trim()) {
      addresses.push({
        fullName: name.trim(),
        phone: cleanPhone,
        detailAddress: address.trim(),
        isDefault: true
      });
    }

    const userStatus = status === 'blocked' ? 'blocked' : 'active';
    const isUserActive = typeof isActive === 'boolean' ? isActive : (userStatus === 'active');

    const customer = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      password: cleanPassword,
      role: 'user',
      gender: ['Nam', 'Nữ', 'Khác'].includes(gender) ? gender : 'Nam',
      birthday: birthday || '',
      addresses,
      status: userStatus,
      isActive: isUserActive
    });

    logActivity(req, {
      module: 'USERS',
      action: 'CUSTOMER_CREATE',
      severity: 'INFO',
      targetId: String(customer._id),
      targetModel: 'User',
      targetLabel: `${customer.name} (${customer.phone || customer.email})`,
      description: `Thêm khách hàng thành viên mới "${customer.name}" - SĐT: ${customer.phone || 'Chưa có'}, Email: ${customer.email}`,
      metadata: {
        customerId: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        gender: customer.gender
      }
    });

    res.status(201).json({
      success: true,
      message: `Đã thêm khách hàng "${customer.name}" thành công!`,
      data: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        role: customer.role,
        status: customer.status,
        isActive: customer.isActive,
        createdAt: customer.createdAt
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo khách hàng:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc số điện thoại này đã tồn tại trong hệ thống!'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo khách hàng mới'
    });
  }
};

// @desc    Lấy chi tiết một khách hàng
// @route   GET /api/users/customers/:id
// @access  Private (Admin, Staff, Accountant)
const getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select('-password');
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng'
      });
    }

    const defaultAddr = (customer.addresses && customer.addresses.find(a => a.isDefault)) || (customer.addresses && customer.addresses[0]) || null;
    res.status(200).json({
      success: true,
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        gender: customer.gender || 'Nam',
        birthday: customer.birthday || '',
        status: customer.status || (customer.isActive !== false ? 'active' : 'blocked'),
        address: defaultAddr ? defaultAddr.detailAddress : '',
        avatar: customer.avatar,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        addresses: customer.addresses || []
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin khách hàng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin khách hàng'
    });
  }
};

// @desc    Cập nhật thông tin khách hàng (CRM & Quản lý khách hàng)
// @route   PUT /api/users/customers/:id
// @access  Private (Admin, Staff)
const updateCustomer = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng'
      });
    }

    let { name, phone, email, password, gender, birthday, address, status, isActive } = req.body;
    let cleanPhone = (phone || '').trim();
    let cleanEmail = (email || '').trim().toLowerCase();

    // Kiểm tra họ và tên
    if (name) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Họ và tên khách hàng phải có tối thiểu 2 ký tự!'
        });
      }
      customer.name = name.trim();
    }

    // Kiểm tra định dạng số điện thoại và trùng lặp
    if (cleanPhone) {
      const phoneRegex = /^0[0-9]{8,9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại phải bắt đầu bằng số 0 và có 9 hoặc 10 chữ số!'
        });
      }
      const existingPhone = await User.findOne({ phone: cleanPhone, _id: { $ne: customer._id } });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại này đã được sử dụng bởi khách hàng khác!'
        });
      }
      customer.phone = cleanPhone;
    }

    // Xử lý email nếu được cung cấp
    if (cleanEmail) {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Email không đúng định dạng (Ví dụ: nguyenvana@gmail.com)!'
        });
      }
      const existingEmail = await User.findOne({ email: cleanEmail, _id: { $ne: customer._id } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng bởi tài khoản khác trong hệ thống!'
        });
      }
      customer.email = cleanEmail;
    }

    // Mật khẩu mới nếu muốn đổi
    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự!'
        });
      }
      customer.password = password.trim();
    }

    // Giới tính
    if (gender && ['Nam', 'Nữ', 'Khác'].includes(gender)) {
      customer.gender = gender;
    }

    // Ngày sinh
    if (birthday !== undefined) {
      customer.birthday = birthday || '';
    }

    // Địa chỉ liên hệ
    if (address !== undefined && typeof address === 'string') {
      const trimAddr = address.trim();
      if (!customer.addresses) customer.addresses = [];
      const defaultIndex = customer.addresses.findIndex(a => a.isDefault);
      if (trimAddr) {
        if (defaultIndex >= 0) {
          customer.addresses[defaultIndex].detailAddress = trimAddr;
          customer.addresses[defaultIndex].fullName = customer.name;
          customer.addresses[defaultIndex].phone = customer.phone;
        } else if (customer.addresses.length > 0) {
          customer.addresses[0].detailAddress = trimAddr;
          customer.addresses[0].isDefault = true;
        } else {
          customer.addresses.push({
            fullName: customer.name,
            phone: customer.phone,
            detailAddress: trimAddr,
            isDefault: true
          });
        }
      }
    }

    // Trạng thái tài khoản
    if (status) {
      customer.status = status === 'blocked' ? 'blocked' : 'active';
      customer.isActive = (customer.status === 'active');
    } else if (typeof isActive === 'boolean') {
      customer.isActive = isActive;
      customer.status = isActive ? 'active' : 'blocked';
    }

    await customer.save();

    logActivity(req, {
      module: 'USERS',
      action: 'CUSTOMER_UPDATE',
      severity: 'INFO',
      targetId: String(customer._id),
      targetModel: 'User',
      targetLabel: `${customer.name} (${customer.phone || customer.email})`,
      description: `Cập nhật thông tin khách hàng "${customer.name}" - SĐT: ${customer.phone}, Email: ${customer.email}`,
      metadata: {
        customerId: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        gender: customer.gender,
        status: customer.status
      }
    });

    res.status(200).json({
      success: true,
      message: `Đã cập nhật thông tin khách hàng "${customer.name}" thành công!`,
      data: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        gender: customer.gender,
        birthday: customer.birthday,
        role: customer.role,
        status: customer.status,
        isActive: customer.isActive,
        updatedAt: customer.updatedAt
      }
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật khách hàng:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc số điện thoại này đã tồn tại trong hệ thống!'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật thông tin khách hàng'
    });
  }
};

module.exports = {
  getUsersByRole,
  toggleUserLock,
  createUser,
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  addUserBank,
  setDefaultUserBank,
  deleteUserBank,
  updateUserIdentity,
  changeUserPassword,
  getAllAccounts,
  updateUserRole,
  adminResetPassword,
  getEmployees,
  createEmployee,
  updateEmployee,
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  getCustomerOrdersHistory
};
