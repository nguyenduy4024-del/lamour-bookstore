const express = require('express');
const compression = require('compression');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const selfsigned = require('selfsigned');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const authorRoutes = require('./routes/authorRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const userRoutes = require('./routes/userRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const settingRoutes = require('./routes/settingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const couponRoutes = require('./routes/couponRoutes');
const backupRoutes = require('./routes/backupRoutes');
const posScannerRoutes = require('./routes/posScannerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { initBackupScheduler } = require('./services/backupScheduler');
const { protect } = require('./middleware/authMiddleware');
const { authorizeRoles } = require('./middleware/roleMiddleware');

dotenv.config();

connectDB();

const app = express();

app.use(compression({
  filter: (req, res) => {
    // Không nén luồng Server-Sent Events (SSE) để tránh đệm dữ liệu (buffering) làm chậm/treo kết nối realtime
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      return false;
    }
    if (req.path && req.path.includes('/api/pos-scanner/stream')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// Tự động tìm ảnh dự phòng giữa /images/covers và /uploads/products
app.get('/images/covers/:filename', (req, res, next) => {
  const primary = path.join(__dirname, 'public', 'images', 'covers', req.params.filename);
  if (fs.existsSync(primary)) return res.sendFile(primary);
  const alt = path.join(__dirname, 'public', 'uploads', 'products', req.params.filename);
  if (fs.existsSync(alt)) return res.sendFile(alt);
  next();
});

app.get('/uploads/products/:filename', (req, res, next) => {
  const primary = path.join(__dirname, 'public', 'uploads', 'products', req.params.filename);
  if (fs.existsSync(primary)) return res.sendFile(primary);
  const alt = path.join(__dirname, 'public', 'images', 'covers', req.params.filename);
  if (fs.existsSync(alt)) return res.sendFile(alt);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/orders', invoiceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', invoiceRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin/backups', backupRoutes);
app.use('/api/pos-scanner', posScannerRoutes);
app.use('/api/payments', paymentRoutes);

app.get(['/checkout/momo-return'], (req, res) => {
  const { orderId, resultCode } = req.query;
  res.redirect(`/user-dashboard.html?tab=orders&subtab=pending_confirmation&momoOrderId=${orderId || ''}&momoResult=${resultCode || 0}`);
});

app.get(['/pos-scanner', '/pos-scanner.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'pos-scanner.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'products.html'));
});

app.get('/collections', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'collections.html'));
});

app.get('/authors', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'authors.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cart.html'));
});

app.get('/policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'policy.html'));
});

app.get('/book/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'book-detail.html'));
});

app.get('/login', (req, res) => {
  const loginPath = path.join(__dirname, 'views', 'login.html');
  if (fs.existsSync(loginPath)) {
    res.sendFile(loginPath);
  } else {
    res.redirect('/');
  }
});

app.get(['/forgot-password', '/forgot-password.html'], (req, res) => {
  res.redirect('/login?mode=forgot');
});

// Middleware bảo vệ các trang giao diện Web (HTML) - chuyển hướng về /login nếu chưa đăng nhập hoặc phân quyền phù hợp
const protectWebRole = (...allowedRoles) => (req, res, next) => {
  const token = req.cookies && req.cookies.jwt;
  const originalUrl = req.originalUrl || '/';
  if (!token) {
    return res.redirect(`/login?redirect=${encodeURIComponent(originalUrl)}`);
  }
  protect(req, res, (err) => {
    if (res.headersSent) return;
    if (err || !req.user) {
      return res.redirect(`/login?redirect=${encodeURIComponent(originalUrl)}`);
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      if (req.user.role === 'admin') return res.redirect('/admin-dashboard');
      if (req.user.role === 'staff') return res.redirect('/staff-dashboard');
      if (req.user.role === 'stock') return res.redirect('/stock-dashboard');
      if (req.user.role === 'accountant') return res.redirect('/accountant-dashboard');
      return res.redirect('/user-dashboard');
    }
    next();
  });
};

app.get(['/checkout', '/checkout.html'], protectWebRole('user', 'staff', 'admin', 'stock', 'accountant'), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

app.get(['/user-dashboard', '/user-dashboard.html'], protectWebRole('user', 'staff', 'admin', 'stock', 'accountant'), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'user-dashboard.html'));
});

app.get(['/staff-dashboard', '/staff-dashboard.html'], protectWebRole('staff', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'staff-dashboard.html'));
});

app.get(['/stock-dashboard', '/stock-dashboard.html'], protectWebRole('stock', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'stock-dashboard.html'));
});

app.get(['/accountant-dashboard', '/accountant-dashboard.html'], protectWebRole('accountant', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'accountant-dashboard.html'));
});

app.get(['/admin-dashboard', '/admin-dashboard.html'], protectWebRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.use('*', (req, res) => {
  const notFoundPath = path.join(__dirname, 'views', '404.html');
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath);
  } else {
    res.status(404).send('<h1>404 - Không tìm thấy trang</h1>');
  }
});

const PORT = process.env.PORT || 4000;
const HTTPS_PORT = process.env.HTTPS_PORT || 4443;

app.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

  if (!isProduction) {
    // Khởi động Cloudflare Tunnel cấp HTTPS bảo mật chuẩn quốc tế và hiển thị banner terminal (chỉ khi chạy Local)
    try {
      const tunnelService = require('./services/tunnelService');
      tunnelService.init(PORT).catch(e => console.warn('[Tunnel] Lỗi khởi động tunnel:', e.message));

      process.once('SIGINT', async () => {
        await tunnelService.close();
        process.exit(0);
      });
      process.once('SIGTERM', async () => {
        await tunnelService.close();
        process.exit(0);
      });
      process.once('SIGUSR2', async () => {
        await tunnelService.close();
        process.kill(process.pid, 'SIGUSR2');
      });
    } catch (err) {
      console.warn('[Tunnel] Init error:', err.message);
    }
  } else {
    console.log(`[Production] Server L'Amour Bookstore đang chạy trên cổng ${PORT}`);
  }

  // Khởi động tiến trình sao lưu định kỳ tự động
  initBackupScheduler();

  // Tự động chuẩn hóa orderType cho các hóa đơn cũ trong CSDL
  setTimeout(async () => {
    try {
      const Invoice = require('./models/Invoice');
      await Invoice.updateMany({ $or: [{ orderType: { $exists: false } }, { orderType: null }], invoiceCode: { $regex: '^HD-OL', $options: 'i' } }, { $set: { orderType: 'online' } });
      await Invoice.updateMany({ $or: [{ orderType: { $exists: false } }, { orderType: null }] }, { $set: { orderType: 'offline' } });
    } catch (err) {
      console.warn('[Database] Lỗi chuẩn hóa orderType hóa đơn:', err.message);
    }
  }, 2000);

  // Khởi động HTTPS server async (dành riêng cho điện thoại mở camera khi chạy local)
  if (!isProduction) {
    (async () => {
      try {
        const certDir = path.join(__dirname, '.ssl');
        const certFile = path.join(certDir, 'cert.pem');
        const keyFile = path.join(certDir, 'key.pem');

        let certPem, keyPem;

        // Tái sử dụng cert cũ nếu có
        if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
          certPem = fs.readFileSync(certFile, 'utf8');
          keyPem  = fs.readFileSync(keyFile, 'utf8');
        } else {
          // Tạo mới (selfsigned v3 là async)
          const os_mod = require('os');
          const nets = os_mod.networkInterfaces();
          const altNames = ['localhost', '127.0.0.1'];
          for (const arr of Object.values(nets)) {
            for (const iface of arr) {
              if (iface.family === 'IPv4' && !iface.internal) altNames.push(iface.address);
            }
          }
          const pems = await selfsigned.generate(
            [{ name: 'commonName', value: "L'Amour POS" }],
            {
              keySize: 2048, days: 365, algorithm: 'sha256',
              extensions: [{ name: 'subjectAltName', altNames: altNames.map(ip => /^[\d.]+$/.test(ip) ? { type: 7, ip } : { type: 2, value: ip }) }]
            }
          );
          certPem = pems.cert;
          keyPem  = pems.private;
          if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
          fs.writeFileSync(certFile, certPem);
          fs.writeFileSync(keyFile, keyPem);
        }

        https.createServer({ cert: certPem, key: keyPem }, app).listen(HTTPS_PORT);
      } catch (e) {
        console.warn('[HTTPS] Không thể khởi động HTTPS server:', e.message);
      }
    })();
  }
}); 
