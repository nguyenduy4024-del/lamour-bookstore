const { startTunnel } = require('untun');

class TunnelService {
  constructor() {
    this.tunnel = null;
    this.tunnelUrl = null;
    this.connectingPromise = null;
  }

  printBanner(port = 4000, tunnelUrl = null) {
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
        console.log = originalLog;
        this.printBanner(port, this.tunnelUrl);
        return this.tunnelUrl;
      } catch (err) {
        console.log = originalLog;
        console.warn(`\n  \x1b[33m[Cloudflare] Không thể tạo Tunnel (${err.message}). Hệ thống sẽ dùng Localhost.\x1b[0m`);
        this.printBanner(port, null);
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
