const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads/products');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép tải lên định dạng hình ảnh (jpg, jpeg, png, webp, gif)!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB / file
  fileFilter: fileFilter
});

const uploadUsersDir = path.join(__dirname, '../public/uploads/users');
if (!fs.existsSync(uploadUsersDir)) {
  fs.mkdirSync(uploadUsersDir, { recursive: true });
}

const userAvatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadUsersDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadAvatar = multer({
  storage: userAvatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Tối đa 2MB
  fileFilter: fileFilter
});

const coversDir = path.join(__dirname, '../public/images/covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const coverStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, coversDir);
  },
  filename: function (req, file, cb) {
    const cleanName = path.parse(file.originalname).name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const uniqueSuffix = Date.now();
    cb(null, `${cleanName}_${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Tối đa 10MB
  fileFilter: fileFilter
});

const uploadSettingsDir = path.join(__dirname, '../public/uploads/settings');
if (!fs.existsSync(uploadSettingsDir)) {
  fs.mkdirSync(uploadSettingsDir, { recursive: true });
}

const settingsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadSettingsDir);
  },
  filename: function (req, file, cb) {
    const cleanName = path.parse(file.originalname).name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const uniqueSuffix = Date.now();
    cb(null, `${cleanName}_${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const uploadSettings = multer({
  storage: settingsStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Tối đa 10MB cho banner chất lượng cao
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|avif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên định dạng hình ảnh (.jpg, .jpeg, .png, .webp, .gif, .avif)!'), false);
    }
  }
});

const uploadPaymentsDir = path.join(__dirname, '../public/uploads/payments');
if (!fs.existsSync(uploadPaymentsDir)) {
  fs.mkdirSync(uploadPaymentsDir, { recursive: true });
}

const paymentProofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPaymentsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Tối đa 10MB
  fileFilter: fileFilter
});

const uploadTempDir = path.join(__dirname, '../backups/temp');
if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}
const backupZipStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadTempDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'uploaded_restore_' + Date.now() + '.zip');
  }
});

const uploadBackupZip = multer({
  storage: backupZipStorage,
  limits: { fileSize: 250 * 1024 * 1024 }, // Tối đa 250MB
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận tệp sao lưu định dạng .zip!'), false);
    }
  }
});

upload.uploadAvatar = uploadAvatar;
upload.uploadCover = uploadCover;
upload.uploadSettings = uploadSettings;
upload.uploadPaymentProof = uploadPaymentProof;
upload.uploadBackupZip = uploadBackupZip;

module.exports = upload;
module.exports.uploadAvatar = uploadAvatar;
module.exports.uploadCover = uploadCover;
module.exports.uploadSettings = uploadSettings;
module.exports.uploadPaymentProof = uploadPaymentProof;
module.exports.uploadBackupZip = uploadBackupZip;


