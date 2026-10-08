const fs = require('fs');
const path = require('path');
const { startTunnel } = require('untun');

// Ngăn chặn unhandled rejection từ tiến trình untun/cloudflared làm crash toàn bộ Server Node.js
if (!global.__tunnelRejectionHandlerRegistered) {
  global.__tunnelRejectionHandlerRegistered = true;
  process.on('unhandledRejection', (reason) => {
    const msg = (reason && (reason.message || String(reason))) || '';
    if (
      msg.includes('cloudflared') ||
      msg.includes('QuickTunnel') ||
      msg.includes('trycloudflare') ||
      msg.includes('untun')
    ) {
      // Dập tắt unhandled rejection từ thư viện untun khi cloudflared exit
      return;
    }
  });
}

const COOLDOWN_FILE = path.join(__dirname, '..', 'node_modules', '.cache', 'tunnel_cooldown.json');

function getRateLimitedUntil() {
  try {
    if (fs.existsSync(COOLDOWN_FILE)) {
      const data = JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
      return data.until || 0;
    }
  } catch (_) {}
  return 0;
}

function setRateLimitedUntil(durationMs = 5 * 60 * 1000) {
  try {
    const dir = path.dirname(COOLDOWN_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify({ until: Date.now() + durationMs }), 'utf8');
  } catch (_) {}
}

function clearRateLimit() {
  try {
    if (fs.existsSync(COOLDOWN_FILE)) fs.unlinkSync(COOLDOWN_FILE);
  } catch (_) {}
}

class TunnelService {
  constructor() {
    this.tunnel = null;
    this.tunnelUrl = null;
    this.connectingPromise = null;
  }

  printBanner(port = 4000, tunnelUrl = null, statusNotice = null) {
    const c = {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      gray: '\x1b[90m',
      cyan: '\x1b[36m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      white: '\x1b[97m',
      bgCyan: '\x1b[46m\x1b[30m\x1b[1m',
    };

    const hr = `${c.gray}────────────────────────────────────────────────────────────────────────────${c.reset}`;

    const lines = [
      '',
      `  ${c.bgCyan}  L'AMOUR BOOKSTORE  ${c.reset}  ${c.bold}HỆ THỐNG QUẢN LÝ & BÁN HÀNG POS${c.reset}  ${c.gray}v1.0.0${c.reset}`,
      `  ${hr}`,
      `  ${c.bold}${c.cyan}➜  Trang chủ web:${c.reset}          ${c.cyan}${c.bold}http://localhost:${port}/${c.reset}`,
    ];

    if (tunnelUrl) {
      lines.push(`  ${c.bold}${c.green}➜  Truy cập toàn bộ web:${c.reset}   ${c.green}${c.bold}${tunnelUrl}/${c.reset}`);
    } else if (statusNotice) {
      lines.push(`  ${c.bold}${c.gray}➜  Chế độ kết nối:${c.reset}        ${c.yellow}${statusNotice}${c.reset}`);
    } else {
      lines.push(`  ${c.bold}${c.yellow}➜  Truy cập toàn bộ web:${c.reset}   ${c.yellow}Đang khởi tạo đường truyền HTTPS...${c.reset}`);
    }

    lines.push(`  ${hr}`);
    lines.push(`  ${c.gray}✨ Trạng thái: Máy chủ Node.js & Socket.IO sẵn sàng hoạt động!${c.reset}`);
    lines.push('');

    console.log(lines.join('\n'));
  }

  async init(port = 4000) {
    if (this.tunnelUrl) {
      this.printBanner(port, this.tunnelUrl);
      return this.tunnelUrl;
    }
    if (this.connectingPromise) return this.connectingPromise;

    // Kiểm tra nếu người dùng chủ động tắt Tunnel qua .env
    const isTunnelDisabled =
      process.env.ENABLE_TUNNEL === 'false' ||
      process.env.DISABLE_TUNNEL === 'true' ||
      process.env.USE_TUNNEL === 'false';

    if (isTunnelDisabled) {
      this.printBanner(port, null, 'Chỉ dùng Localhost (Đã tắt Cloudflare Tunnel trong cấu hình)');
      return null;
    }

    // Kiểm tra nếu Cloudflare đang bị Rate Limit 429 trong thời gian chờ
    const rateLimitedUntil = getRateLimitedUntil();
    if (Date.now() < rateLimitedUntil) {
      const remainingSec = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      console.log(`\n  \x1b[33m⚡ [Cloudflare] Dịch vụ trycloudflare.com tạm thời bị giới hạn tần suất (429 Rate Limit).\x1b[0m`);
      console.log(`  \x1b[90m➜ Hệ thống tự động chuyển sang chế độ Localhost (thử lại sau ${remainingSec}s).\x1b[0m`);
      this.printBanner(port, null, 'Chế độ Localhost (Cloudflare Tunnel tạm ngắt do 429 Too Many Requests)');
      return null;
    }

    console.log(`\n  \x1b[33m⏳ Đang khởi động hệ thống và kết nối Cloudflare HTTPS...\x1b[0m`);

    this.connectingPromise = (async () => {
      const originalLog = console.log;
      console.log = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Starting cloudflared tunnel')) {
          return;
        }
        originalLog.apply(console, args);
      };

      try {
        this.tunnel = await startTunnel({ port, acceptCloudflareNotice: true });
        const rawUrl = await this.tunnel.getURL();
        this.tunnelUrl = rawUrl.replace(/\/$/, '');
        clearRateLimit();
        console.log = originalLog;
        this.printBanner(port, this.tunnelUrl);
        return this.tunnelUrl;
      } catch (err) {
        console.log = originalLog;
        const errMsg = err?.message || '';
        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('1015') ||
          errMsg.includes('Too Many Requests') ||
          errMsg.includes('invalid character');

        if (isRateLimit) {
          setRateLimitedUntil(5 * 60 * 1000); // 5 phút cooldown
          console.warn(`\n  \x1b[33m⚡ [Cloudflare Tunnel] Bị giới hạn tần suất (429 Too Many Requests). Hệ thống chạy bình thường trên Localhost: http://localhost:${port}/\x1b[0m`);
          this.printBanner(port, null, 'Chế độ Localhost (Cloudflare Tunnel tạm ngắt do 429 Too Many Requests)');
        } else {
          console.warn(`\n  \x1b[33m⚡ [Cloudflare Tunnel] Không thể tạo Tunnel (${errMsg.split('\n')[0]}). Hệ thống sẽ dùng Localhost: http://localhost:${port}/\x1b[0m`);
          this.printBanner(port, null, 'Chế độ Localhost');
        }
        return null;
      } finally {
        console.log = originalLog;
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  getTunnelUrl() {
    return this.tunnelUrl;
  }

  async getOrWaitForTunnelUrl(timeoutMs = 4000) {
    if (this.tunnelUrl) return this.tunnelUrl;
    if (this.connectingPromise) {
      try {
        const result = await Promise.race([
          this.connectingPromise,
          new Promise(resolve => setTimeout(() => resolve(null), timeoutMs))
        ]);
        if (result) return result;
      } catch (_) {}
    }
    return this.tunnelUrl;
  }

  async close() {
    if (this.tunnel) {
      try {
        await this.tunnel.close();
      } catch (_) {}
      this.tunnel = null;
      this.tunnelUrl = null;
    }
  }
}

module.exports = new TunnelService();
