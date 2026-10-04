const nodemailer = require('nodemailer');
const Invoice = require('../models/Invoice');
require('../models/Book');
require('../models/User');
const { logActivity } = require('./auditLogger');

// Làm sạch mật khẩu ứng dụng (loại bỏ khoảng trắng thừa nếu người dùng copy từ Google)
const cleanSmtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

// Khởi tạo Transporter cho Nodemailer (Tạo phiên động mỗi lần gửi để chống lỗi rớt socket của Gmail)
function createSmtpTransporter() {
  const cleanPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  
  // Nếu là Gmail, dùng service 'gmail' với pool: false để luôn mở phiên gửi độc lập, chống rớt socket
  if ((process.env.SMTP_HOST || '').includes('gmail') || (process.env.SMTP_USER || '').endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: cleanPass
      },
      pool: false,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }

  // Tùy chỉnh với host và port thông thường
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: cleanPass
    },
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Format tiền tệ VNĐ
function formatVND(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('vi-VN') + ' ₫';
}

// Format ngày giờ Việt Nam
function formatDateTime(date) {
  if (!date) return new Date().toLocaleString('vi-VN');
  const d = new Date(date);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Lấy nhãn phương thức thanh toán
function getPaymentMethodLabel(method, orderType = 'online') {
  const m = String(method || '').toLowerCase();
  if (['transfer', 'banking', 'ck', 'vietqr'].includes(m)) {
    return 'Chuyển khoản Ngân hàng (VietQR)';
  }
  if (['pos', 'card', 'momo', 'atm'].includes(m)) {
    return 'Ví điện tử / Thẻ thanh toán';
  }
  if (orderType === 'offline') {
    return 'Tiền mặt tại quầy';
  }
  return 'Thanh toán khi nhận hàng (COD)';
}

// Tạo giao diện HTML Email hóa đơn cao cấp chuẩn thương hiệu L'Amour Bookstore
function generateInvoiceEmailHtml(invoice, appUrl = 'http://localhost:4000') {
  const code = invoice.invoiceCode || invoice._id.toString().slice(-6).toUpperCase();
  const customerName = invoice.customerName || 'Quý khách';
  const customerPhone = invoice.customerPhone || 'Chưa cung cấp';
  const customerAddress = invoice.customerAddress || 'Nhận trực tiếp tại quầy';
  const orderType = invoice.orderType === 'offline' ? 'Mua trực tiếp tại Quầy POS' : 'Đơn hàng mua Online';
  const paymentMethodText = getPaymentMethodLabel(invoice.paymentMethod, invoice.orderType);
  const createdAtText = formatDateTime(invoice.createdAt);

  const subtotal = invoice.totalAmount || 0;
  const discount = (invoice.discount || 0) + (invoice.couponDiscount || 0);
  const finalAmount = invoice.finalAmount !== undefined ? invoice.finalAmount : Math.max(0, subtotal - discount);

  // Tạo danh sách sản phẩm sách
  const itemsHtml = (invoice.items || []).map((item, index) => {
    const bookTitle = (item.book && item.book.title) ? item.book.title : (item.title || 'Sách L\'Amour');
    const bookAuthor = (item.book && item.book.author) ? item.book.author : '';
    const bookCode = (item.book && item.book.bookCode) ? item.book.bookCode : '';
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.price || 0);
    const lineTotal = quantity * unitPrice;

    return `
      <tr style="border-bottom: 1px solid #EAE4D8;">
        <td style="padding: 14px 10px; font-size: 13.5px; color: #1E293B; vertical-align: middle;">
          <div style="font-weight: 700; color: #0A1930; font-size: 14px; line-height: 1.4;">${bookTitle}</div>
          ${bookAuthor ? `<div style="font-size: 12px; color: #64748B; margin-top: 2px;">Tác giả: ${bookAuthor}</div>` : ''}
          ${bookCode ? `<div style="font-size: 11px; font-family: monospace; color: #8A6B32; margin-top: 2px;">Mã sách: ${bookCode}</div>` : ''}
        </td>
        <td style="padding: 14px 10px; font-size: 13.5px; color: #475569; text-align: center; vertical-align: middle; font-weight: 600;">
          ${quantity}
        </td>
        <td style="padding: 14px 10px; font-size: 13.5px; color: #475569; text-align: right; vertical-align: middle; white-space: nowrap;">
          ${formatVND(unitPrice)}
        </td>
        <td style="padding: 14px 10px; font-size: 14px; color: #0A1930; text-align: right; vertical-align: middle; font-weight: 700; white-space: nowrap;">
          ${formatVND(lineTotal)}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hóa Đơn Điện Tử - L'Amour Bookstore</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1EA; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F4F1EA; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- KHUNG CHÍNH EMAIL -->
        <table role="presentation" width="100%" max-width="640" style="max-width: 640px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px rgba(10, 25, 48, 0.08); border: 1px solid #E2DBD0;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- BANNER HEADER ĐẲNG CẤP VÀNG KIM & XANH NAVY -->
          <tr>
            <td style="background: linear-gradient(135deg, #060E1B 0%, #0A1930 60%, #102444 100%); padding: 36px 32px 30px; text-align: center; border-bottom: 4px solid #C7A15A;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="font-family: 'Georgia', serif; font-size: 26px; font-weight: 700; color: #FAF7F1; letter-spacing: 0.05em; text-transform: uppercase;">
                      L'Amour <span style="color: #C7A15A; font-style: italic; font-weight: 400;">Bookstore</span>
                    </div>
                    <div style="font-size: 11px; color: #A0B3CC; letter-spacing: 0.22em; text-transform: uppercase; margin-top: 4px; font-family: monospace;">
                      Thế Giới Tri Thức & Nghệ Thuật Sách
                    </div>
                    <div style="margin-top: 22px; display: inline-block; background: rgba(199, 161, 90, 0.15); border: 1px solid #C7A15A; border-radius: 999px; padding: 6px 18px; color: #FAF7F1; font-size: 13px; font-weight: 600;">
                      ✨ HÓA ĐƠN XÁC NHẬN MUA HÀNG THÀNH CÔNG
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- LỜI CHÀO & TỔNG QUAN ĐƠN HÀNG -->
          <tr>
            <td style="padding: 32px 32px 20px;">
              <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #334155;">
                Xin chào <strong style="color: #0A1930; font-size: 16px;">${customerName}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                Cảm ơn bạn đã lựa chọn mua sách tại <strong>L'Amour Bookstore</strong>. Đơn hàng của bạn đã được hệ thống tiếp nhận và ghi nhận thành công với thông tin chi tiết dưới đây:
              </p>

              <!-- THẺ THÔNG TIN ĐƠN HÀNG -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF8F5; border: 1px solid #EBE4D8; border-radius: 12px; margin-bottom: 24px; padding: 16px 20px;">
                <tr>
                  <td width="50%" style="vertical-align: top; padding-right: 10px;">
                    <div style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #8A6B32; font-weight: 700; margin-bottom: 4px;">MÃ HÓA ĐƠN</div>
                    <div style="font-size: 16px; font-weight: 700; color: #0A1930; font-family: monospace;">#${code}</div>
                    
                    <div style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #8A6B32; font-weight: 700; margin-top: 12px; margin-bottom: 4px;">LOẠI ĐƠN HÀNG</div>
                    <div style="font-size: 13.5px; color: #334155; font-weight: 600;">${orderType}</div>
                  </td>
                  <td width="50%" style="vertical-align: top; padding-left: 10px;">
                    <div style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #8A6B32; font-weight: 700; margin-bottom: 4px;">THỜI GIAN MUA</div>
                    <div style="font-size: 13.5px; color: #334155; font-weight: 600;">${createdAtText}</div>

                    <div style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #8A6B32; font-weight: 700; margin-top: 12px; margin-bottom: 4px;">PHƯƠNG THỨC THANH TOÁN</div>
                    <div style="font-size: 13.5px; color: #0D8253; font-weight: 700;">${paymentMethodText}</div>
                  </td>
                </tr>
              </table>

              <!-- THÔNG TIN NGƯỜI NHẬN -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E2DBD0; border-radius: 12px; margin-bottom: 28px; padding: 16px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 700; color: #0A1930; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #EFEAE1; padding-bottom: 6px;">
                      📍 Thông Tin Nhận Hàng
                    </div>
                    <div style="font-size: 13.5px; color: #334155; margin-bottom: 4px;">
                      <strong>Người nhận:</strong> ${customerName} &bull; ${customerPhone}
                    </div>
                    <div style="font-size: 13.5px; color: #334155; line-height: 1.5;">
                      <strong>Địa chỉ giao:</strong> ${customerAddress}
                    </div>
                    ${invoice.paymentNote ? `<div style="font-size: 12.5px; color: #64748B; margin-top: 6px; font-style: italic;"><strong>Ghi chú:</strong> ${invoice.paymentNote}</div>` : ''}
                  </td>
                </tr>
              </table>

              <!-- BẢNG DANH SÁCH SÁCH ĐÃ MUA -->
              <div style="font-size: 14px; font-weight: 700; color: #0A1930; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;">
                📚 Danh Sách Tác Phẩm Đã Mua
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; margin-bottom: 24px; border: 1px solid #E2DBD0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #0A1930; color: #FAF7F1;">
                    <th align="left" style="padding: 12px 10px; font-size: 12.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Tên Sách</th>
                    <th align="center" style="padding: 12px 10px; font-size: 12.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; width: 60px;">SL</th>
                    <th align="right" style="padding: 12px 10px; font-size: 12.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; width: 100px;">Đơn Giá</th>
                    <th align="right" style="padding: 12px 10px; font-size: 12.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; width: 110px;">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- BẢNG TỔNG KẾT TÀI CHÍNH -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF8F5; border-radius: 12px; padding: 18px 20px; border: 1px solid #EAE4D8; margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 14px; color: #64748B; padding: 4px 0;">Tạm tính tiền hàng:</td>
                  <td align="right" style="font-size: 14px; color: #1E293B; font-weight: 600; padding: 4px 0;">${formatVND(subtotal)}</td>
                </tr>
                ${discount > 0 ? `
                <tr>
                  <td style="font-size: 14px; color: #C7A15A; padding: 4px 0;">
                    Giảm giá voucher ${invoice.couponCode ? `(Mã: <strong>${invoice.couponCode}</strong>)` : ''}:
                  </td>
                  <td align="right" style="font-size: 14px; color: #C7A15A; font-weight: 700; padding: 4px 0;">-${formatVND(discount)}</td>
                </tr>` : ''}
                <tr>
                  <td style="font-size: 14px; color: #64748B; padding: 4px 0;">Phí vận chuyển:</td>
                  <td align="right" style="font-size: 14px; color: #0D8253; font-weight: 600; padding: 4px 0;">Miễn phí toàn quốc</td>
                </tr>
                <tr style="border-top: 1px dashed #CBD5E1;">
                  <td style="font-size: 16px; font-weight: 700; color: #0A1930; padding: 12px 0 4px;">Tổng số tiền thanh toán:</td>
                  <td align="right" style="font-size: 20px; font-weight: 800; color: #9C7C3B; padding: 12px 0 4px; font-family: 'Segoe UI', sans-serif;">
                    ${formatVND(finalAmount)}
                  </td>
                </tr>
              </table>

              <!-- NÚT THEO DÕI ĐƠN HÀNG -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/user-dashboard.html?tab=orders" target="_blank" style="display: inline-block; background-color: #0A1930; color: #FAF7F1; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 999px; border: 2px solid #C7A15A; letter-spacing: 0.04em;">
                      📦 THEO DÕI ĐƠN HÀNG TRÊN HỆ THỐNG
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- CHÂN TRANG (FOOTER) -->
          <tr>
            <td style="background-color: #0A1930; padding: 26px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <div style="color: #FAF7F1; font-size: 13.5px; font-weight: 600; margin-bottom: 6px;">
                L'AMOUR BOOKSTORE — TINH HOA TRI THỨC
              </div>
              <div style="color: #94A3B8; font-size: 12px; line-height: 1.6; margin-bottom: 12px;">
                📍 Địa chỉ: Tầng 1, Tòa nhà Tri Thức, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh<br>
                ☎️ Hotline hỗ trợ khách hàng: <strong>1900 6868</strong> | ✉️ Email: <strong>${process.env.SMTP_USER || 'support@lamourbookstore.vn'}</strong>
              </div>
              <div style="color: #64748B; font-size: 11px;">
                © 2026 L'Amour Bookstore. Mọi quyền được bảo lưu. Email này được gửi tự động, vui lòng không trả lời trực tiếp.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Gửi email hóa đơn tự động cho khách hàng
 * @param {Object|String} invoiceOrId - Object hóa đơn hoặc ID hóa đơn
 * @param {String} [overrideEmail] - Email người nhận ghi đè (nếu có)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendInvoiceEmail(invoiceOrId, overrideEmail = null) {
  try {
    let invoice = invoiceOrId;
    if (typeof invoiceOrId === 'string' || (invoiceOrId && invoiceOrId._id && !invoiceOrId.items?.[0]?.book?.title)) {
      const invId = invoiceOrId._id || invoiceOrId;
      invoice = await Invoice.findById(invId)
        .populate('items.book', 'title author price bookCode coverImage')
        .populate('user', 'email name phone');
    }

    if (!invoice) {
      console.warn('⚠️ [EmailService] Không tìm thấy dữ liệu hóa đơn để gửi email');
      return { success: false, message: 'Không tìm thấy hóa đơn' };
    }

    // Xác định email người nhận: Ưu tiên override -> customerEmail -> user.email
    const recipientEmail = (overrideEmail || invoice.customerEmail || (invoice.user && invoice.user.email) || '').trim();

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      console.log(`ℹ️ [EmailService] Đơn hàng #${invoice.invoiceCode || invoice._id} không có địa chỉ email hợp lệ để gửi.`);
      return { success: false, message: 'Đơn hàng không có email hợp lệ' };
    }

    const fromAddress = process.env.EMAIL_FROM || `"L'Amour Bookstore" <${process.env.SMTP_USER}>`;
    const invoiceCode = invoice.invoiceCode || invoice._id.toString().slice(-6).toUpperCase();
    const subject = `[L'Amour Bookstore] Xác nhận đơn hàng & Hóa đơn điện tử #${invoiceCode}`;

    const htmlContent = generateInvoiceEmailHtml(invoice);

    const mailOptions = {
      from: fromAddress,
      to: recipientEmail,
      subject: subject,
      html: htmlContent
    };

    let info = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const activeTransporter = createSmtpTransporter();
        info = await activeTransporter.sendMail(mailOptions);
        break;
      } catch (sendErr) {
        lastError = sendErr;
        console.warn(`⚠️ [EmailService] Lần gửi ${attempt} thất bại: ${sendErr.message}. ${attempt < 2 ? 'Đang thử lại...' : ''}`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    if (!info) {
      throw lastError || new Error('Không thể gửi email hóa đơn qua SMTP');
    }

    console.log(`✅ [EmailService] Đã gửi thành công email hóa đơn #${invoiceCode} tới: ${recipientEmail} (MessageId: ${info.messageId})`);

    // Cập nhật trạng thái gửi email vào DB nếu có kết nối Mongoose và có _id hợp lệ
    const mongoose = require('mongoose');
    if (invoice._id && mongoose.connection.readyState === 1) {
      try {
        await Invoice.findByIdAndUpdate(invoice._id, {
          customerEmail: recipientEmail,
          emailSent: true,
          emailSentAt: new Date()
        });
      } catch (dbErr) {
        console.warn('⚠️ [EmailService] Không thể cập nhật trạng thái email vào DB:', dbErr.message);
      }
    }

    try {
      await logActivity(null, {
        action: 'SEND_INVOICE_EMAIL',
        entity: 'Invoice',
        entityId: invoice._id,
        details: `Đã gửi email hóa đơn điện tử #${invoiceCode} tới khách hàng ${recipientEmail}`,
        performedBy: invoice.user ? (invoice.user._id || invoice.user) : null,
        performerName: 'Hệ thống Email'
      });
    } catch (e) {}

    return {
      success: true,
      message: `Đã gửi hóa đơn điện tử tới email ${recipientEmail}`,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ [EmailService] Lỗi khi gửi email hóa đơn:', error.message);
    return {
      success: false,
      message: error.message || 'Lỗi kết nối máy chủ gửi mail'
    };
  }
}

/**
 * Gửi email bất đồng bộ không chặn luồng chính (Fire and Forget)
 */
function sendInvoiceEmailAsync(invoiceOrId, overrideEmail = null) {
  setImmediate(async () => {
    try {
      await sendInvoiceEmail(invoiceOrId, overrideEmail);
    } catch (err) {
      console.error('Lỗi khi gửi email hóa đơn ngầm:', err.message);
    }
  });
}

/**
 * Tạo nội dung HTML email cấp mật khẩu ngẫu nhiên mới chuẩn thương hiệu L'Amour Bookstore
 */
function generateResetPasswordEmailHtml(user, newPassword, appUrl = 'http://localhost:4000') {
  const customerName = user.name || 'Quý khách';
  const customerEmail = user.email || '';
  const loginUrl = `${appUrl}/login.html`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khôi phục mật khẩu - L'Amour Bookstore</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1EA; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F4F1EA; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- KHUNG CHÍNH EMAIL -->
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px rgba(10, 25, 48, 0.08); border: 1px solid #E2DBD0;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- BANNER HEADER ĐẲNG CẤP VÀNG KIM & XANH NAVY -->
          <tr>
            <td style="background: linear-gradient(135deg, #060E1B 0%, #0A1930 60%, #102444 100%); padding: 36px 32px 30px; text-align: center; border-bottom: 4px solid #C7A15A;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="font-family: 'Georgia', serif; font-size: 26px; font-weight: 700; color: #FAF7F1; letter-spacing: 0.05em; text-transform: uppercase;">
                      L'Amour <span style="color: #C7A15A; font-style: italic; font-weight: 400;">Bookstore</span>
                    </div>
                    <div style="font-size: 11px; color: #A0B3CC; letter-spacing: 0.22em; text-transform: uppercase; margin-top: 4px; font-family: monospace;">
                      Thế Giới Tri Thức & Nghệ Thuật Sách
                    </div>
                    <div style="margin-top: 20px; display: inline-block; background: rgba(199, 161, 90, 0.15); border: 1px solid #C7A15A; border-radius: 999px; padding: 6px 20px; color: #FAF7F1; font-size: 13px; font-weight: 600;">
                      🔐 CẤP LẠI MẬT KHẨU TÀI KHOẢN
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- LỜI CHÀO & NỘI DUNG CHÍNH -->
          <tr>
            <td style="padding: 32px 32px 20px;">
              <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #334155;">
                Xin chào <strong style="color: #0A1930; font-size: 16px;">${customerName}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                Hệ thống <strong>L'Amour Bookstore</strong> đã tiếp nhận yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email: <strong style="color: #0A1930;">${customerEmail}</strong>.
              </p>

              <!-- HỘP HIỂN THỊ MẬT KHẨU MỚI -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF8F5; border: 2px dashed #C7A15A; border-radius: 12px; margin-bottom: 24px; padding: 22px 20px; text-align: center;">
                <tr>
                  <td align="center">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #8A6B32; font-weight: 700; margin-bottom: 10px;">
                      MẬT KHẨU ĐĂNG NHẬP MỚI CỦA BẠN
                    </div>
                    <div style="font-family: 'Courier New', Consolas, monospace; font-size: 26px; font-weight: 800; color: #0A1930; letter-spacing: 3px; background-color: #FFFFFF; border: 1.5px solid #C7A15A; border-radius: 8px; padding: 12px 28px; display: inline-block; margin: 4px 0; box-shadow: 0 4px 12px rgba(10,25,48,0.06);">
                      ${newPassword}
                    </div>
                    <div style="font-size: 12px; color: #64748B; margin-top: 10px;">
                      (Mật khẩu có phân biệt chữ hoa, chữ thường, số và ký tự đặc biệt)
                    </div>
                  </td>
                </tr>
              </table>

              <!-- HỘP LƯU Ý BẢO MẬT -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; margin-bottom: 26px; padding: 16px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 13.5px; font-weight: 700; color: #92400E; margin-bottom: 8px;">
                      🛡️ Hướng dẫn bảo mật tài khoản:
                    </div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #78350F; line-height: 1.6;">
                      <li style="margin-bottom: 4px;">Sử dụng mật khẩu trên để đăng nhập ngay vào hệ thống L'Amour Bookstore.</li>
                      <li style="margin-bottom: 4px;">Để đảm bảo an toàn tuyệt đối, sau khi đăng nhập hãy vào <strong>Hồ sơ cá nhân &gt; Đổi mật khẩu</strong> để cập nhật mật khẩu mới của riêng bạn.</li>
                      <li>Nếu bạn <strong>không yêu cầu</strong> hành động này, vui lòng liên hệ ngay với Hotline hỗ trợ <strong>1900 6868</strong> để được kiểm tra và khóa tài khoản tạm thời.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- NÚT ĐĂNG NHẬP NGAY -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #0A1930; color: #FAF7F1; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 999px; border: 2px solid #C7A15A; letter-spacing: 0.04em;">
                      👉 ĐĂNG NHẬP VÀO HỆ THỐNG NGAY
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- CHÂN TRANG FOOTER -->
          <tr>
            <td style="background-color: #0A1930; padding: 26px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <div style="color: #FAF7F1; font-size: 13.5px; font-weight: 600; margin-bottom: 6px;">
                L'AMOUR BOOKSTORE — TINH HOA TRI THỨC
              </div>
              <div style="color: #94A3B8; font-size: 12px; line-height: 1.6; margin-bottom: 12px;">
                📍 Tầng 1, Tòa nhà Tri Thức, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh<br>
                ☎️ Hotline hỗ trợ: <strong>1900 6868</strong> | ✉️ Email hỗ trợ: <strong>${process.env.SMTP_USER || 'support@lamourbookstore.vn'}</strong>
              </div>
              <div style="color: #64748B; font-size: 11px;">
                © 2026 L'Amour Bookstore. Mọi quyền được bảo lưu. Email này được gửi tự động từ hệ thống quản lý.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Gửi email mật khẩu ngẫu nhiên mới về Gmail của người dùng
 * @param {Object|String} userOrEmail - Object User hoặc chuỗi email
 * @param {String} newPassword - Mật khẩu mới vừa tạo
 * @returns {Promise<{success: boolean, message: string, messageId?: string}>}
 */
async function sendResetPasswordEmail(userOrEmail, newPassword) {
  try {
    let email = '';
    let name = 'Quý khách';

    if (typeof userOrEmail === 'string') {
      email = userOrEmail.trim();
    } else if (userOrEmail && typeof userOrEmail === 'object') {
      email = (userOrEmail.email || '').trim();
      name = userOrEmail.name || 'Quý khách';
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn(`⚠️ [EmailService] Địa chỉ email "${email}" không hợp lệ để gửi mật khẩu.`);
      return { success: false, message: 'Địa chỉ email không đúng định dạng' };
    }

    const fromAddress = process.env.EMAIL_FROM || `"L'Amour Bookstore" <${process.env.SMTP_USER}>`;
    const subject = `[L'Amour Bookstore] 🔐 Khôi phục mật khẩu - Mật khẩu đăng nhập mới của bạn`;
    const htmlContent = generateResetPasswordEmailHtml({ name, email }, newPassword);

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: subject,
      html: htmlContent
    };

    let info = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const activeTransporter = createSmtpTransporter();
        info = await activeTransporter.sendMail(mailOptions);
        break;
      } catch (sendErr) {
        lastError = sendErr;
        console.warn(`⚠️ [EmailService] Gửi mật khẩu tới ${email} lần ${attempt} thất bại: ${sendErr.message}. ${attempt < 2 ? 'Đang thử lại...' : ''}`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    if (!info) {
      throw lastError || new Error('Không thể kết nối máy chủ email để gửi mật khẩu');
    }

    console.log(`✅ [EmailService] Đã gửi mật khẩu mới thành công tới Gmail: ${email} (MessageId: ${info.messageId})`);

    return {
      success: true,
      message: `Đã gửi mật khẩu mới về email ${email}`,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ [EmailService] Lỗi khi gửi email mật khẩu mới:', error.message);
    return {
      success: false,
      message: error.message || 'Lỗi kết nối máy chủ gửi mail'
    };
  }
}

module.exports = {
  createSmtpTransporter,
  generateInvoiceEmailHtml,
  sendInvoiceEmail,
  sendInvoiceEmailAsync,
  generateResetPasswordEmailHtml,
  sendResetPasswordEmail
};
