// ===== 纯函数：JWT 密钥生成（可在 node 中直接测试） =====

// 生成 n 字节加密级随机数（浏览器用 crypto.getRandomValues，node 用 crypto.randomBytes）
function randomBytes(n) {
  n = Math.max(1, n | 0);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(n);
    crypto.getRandomValues(buf);
    return buf;
  }
  // node 环境（浏览器无 getRandomValues 时不会走到这里）
  // eslint-disable-next-line
  return require('crypto').randomBytes(n);
}

// 字节数组 → Base64（标准，含 + / =）
function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// 字节数组 → Base64URL（URL 安全，去 + / 和 =）
function bytesToBase64URL(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 字节数组 → Hex
function bytesToHex(bytes) {
  let h = '';
  for (let i = 0; i < bytes.length; i++) h += bytes[i].toString(16).padStart(2, '0');
  return h;
}

// 纯字母数字（仅 [A-Za-z0-9]，无 + - / = _ & 等符号）；length 按等熵换算
function randomAlnum(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  while (s.length < length) {
    const buf = randomBytes(length);
    for (let i = 0; i < buf.length && s.length < length; i++) {
      if (buf[i] < 248) s += chars[buf[i] % 62]; // 248 = 62×4，消除模偏差
    }
  }
  return s;
}

// 主入口：按指定编码生成 n 字节密钥
function generateJWTSecret(n, enc) {
  if (enc === 'alnum') {
    // 纯字母数字：62 进制约 5.95 位/字符，按等熵换算所需字符数
    const length = Math.ceil(n * 8 / Math.log2(62));
    return { ok: true, bytes: n, enc, secret: randomAlnum(length) };
  }
  const bytes = randomBytes(n);
  const map = { base64: bytesToBase64, base64url: bytesToBase64URL, hex: bytesToHex };
  const fn = map[enc] || bytesToBase64;
  return { ok: true, bytes: n, enc, secret: fn(bytes) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { randomBytes, bytesToBase64, bytesToBase64URL, bytesToHex, randomAlnum, generateJWTSecret };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const out = document.getElementById('out');
  const status = document.getElementById('status');
  let lastSecret = '';

  function render() {
    const n = parseInt(document.getElementById('bytes').value, 10) || 32;
    if (n < 16 || n > 256) {
      out.textContent = '请输入 16–256 字节';
      lastSecret = '';
      return;
    }
    const enc = document.getElementById('enc').value;
    const r = generateJWTSecret(n, enc);
    lastSecret = r.secret;
    out.textContent = r.secret;
    // Base64 补全说明：Hex 长度 = 字节数×2，Base64 长度 ≈ 字节数×1.37
    const encLabel = { base64: 'Base64', base64url: 'Base64URL', hex: 'Hex', alnum: '纯字母数字' }[enc] || enc;
    status.textContent = '已生成 ' + n + ' 字节（' + (n * 8) + ' 位）· ' + encLabel + ' 编码 · 共 ' + r.secret.length + ' 字符';
  }

  document.getElementById('gen').addEventListener('click', render);
  document.getElementById('bytes').addEventListener('input', render);
  document.getElementById('enc').addEventListener('change', render);
  document.getElementById('copy').addEventListener('click', async () => {
    if (!lastSecret) { render(); }
    const ok = await window.copyText(lastSecret);
    showToast(ok ? '已复制' : '复制失败，请手动复制');
  });
  render();
}
