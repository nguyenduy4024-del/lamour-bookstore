const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

require('dotenv').config();
const { diagnoseEmailService, sendInvoiceEmail } = require('../utils/emailService');

async function main() {
  console.log('====================================================');
  console.log('   BỘ CÔNG CỤ KIỂM TRA & CHẨN ĐOÁN KẾT NỐI EMAIL');
  console.log('            L\'AMOUR BOOKSTORE SYSTEM');
  console.log('====================================================\n');

  console.log('1. Đang kiểm tra cấu hình biến môi trường & cổng SMTP...');
  const report = await diagnoseEmailService();
  console.log('----------------------------------------------------');
  console.log('Tài khoản gửi (SMTP_USER):', report.smtpUser);
  console.log('Máy chủ gửi (SMTP_HOST):', report.smtpHost);
  console.log('Mật khẩu ứng dụng hợp lệ:', report.hasPassword ? `Đã cấu hình (${report.passwordLength} ký tự)` : 'Chưa cấu hình!');
  console.log('Môi trường Render Cloud:', report.isRender ? 'Có (Render Free Tier chặn các cổng SMTP)' : 'Không (Localhost / VPS)');
  console.log('Kênh gửi ưu tiên:', report.activeHttpProvider ? `🚀 ${report.activeHttpProvider} (HTTPS Port 443)` : '📡 SMTP Direct');
  console.log('Cấu hình Resend API:', report.hasResendApiKey ? 'Đã kích hoạt' : 'Chưa cấu hình');
  console.log('Cấu hình Brevo API:', report.hasBrevoApiKey ? 'Đã kích hoạt' : 'Chưa cấu hình');
  console.log('Cấu hình SendGrid API:', report.hasSendGridApiKey ? 'Đã kích hoạt' : 'Chưa cấu hình');
  console.log('Cấu hình Mailgun API:', report.hasMailgunApiKey ? 'Đã kích hoạt' : 'Chưa cấu hình');
  console.log('💡 Khuyến nghị:', report.recommendation);
  console.log('----------------------------------------------------');

  console.log('\n2. Kết quả kiểm tra kết nối các cổng SMTP:');
  for (const [portName, check] of Object.entries(report.checks)) {
    const icon = check.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} [${portName.toUpperCase()}]: ${check.message} (Độ trễ: ${check.latencyMs} ms)`);
  }

  const targetEmail = process.argv[2] || process.env.SMTP_USER;
  if (targetEmail) {
    console.log(`\n3. Gửi thử nghiệm một hóa đơn mẫu tới email: ${targetEmail}...`);
    const mockInvoice = {
      _id: '65f000000000000000000001',
      invoiceCode: 'HD-TEST-' + Math.floor(1000 + Math.random() * 9000),
      customerName: 'Khách hàng Kiểm tra Hệ thống',
      customerPhone: '0901234567',
      customerAddress: 'Địa chỉ thử nghiệm, TP. Hồ Chí Minh',
      customerEmail: targetEmail,
      orderType: 'online',
      paymentMethod: 'transfer',
      createdAt: new Date(),
      totalAmount: 185000,
      discount: 15000,
      finalAmount: 170000,
      items: [
        {
          book: {
            title: '21 Bài Học Cho Thế Kỷ 21',
            author: 'Yuval Noah Harari',
            bookCode: 'BK-TEST-21'
          },
          quantity: 1,
          price: 185000
        }
      ]
    };

    const start = Date.now();
    const result = await sendInvoiceEmail(mockInvoice, targetEmail);
    console.log('----------------------------------------------------');
    if (result.success) {
      console.log(`🎉 GỬI THÀNH CÔNG sau ${Date.now() - start} ms!`);
      console.log('Thông báo:', result.message);
      console.log('Phương thức sử dụng:', result.provider);
      console.log('Message ID:', result.messageId);
    } else {
      console.log(`⚠️ GỬI THẤT BẠI sau ${Date.now() - start} ms!`);
      console.log('Chi tiết lỗi:', result.message);
      if (result.rawError) console.log('Mã lỗi kỹ thuật:', result.rawError);
    }
    console.log('----------------------------------------------------');
  }

  console.log('\nHoàn tất quá trình kiểm tra!\n');
}

main().catch(console.error);
