// ===== 纯函数（可在 node 中直接测试） =====
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGIT = '0123456789';
const SYMBOL = '!@#$%^&*()-_=+[]{};:,.<>?/';
const AMBIG = 'O0oIl1|`';

// 加密级均匀随机整数 [0, max)
// 拒绝采样：limit 取 2^32 的最大倍数，接受 x < limit，避免取模偏差
function secureRandomInt(max) {
  max = Math.floor(max);
  if (max <= 0) return 0;
  const c = (typeof window !== 'undefined' && window.crypto)
    ? window.crypto
    : (typeof self !== 'undefined' && self.crypto ? self.crypto : null);
  if (c && c.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = 0x100000000 - (0x100000000 % max);
    let x;
    do { c.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % max;
  }
  // node 回退（浏览器无 getRandomValues 时不会走到这里）
  // eslint-disable-next-line
  const nodeCrypto = require('crypto');
  const limit = 256 - (256 % max);
  let x;
  do { x = nodeCrypto.randomBytes(1)[0]; } while (x >= limit);
  return x % max;
}

function buildSets(opt) {
  let sets = [];
  if (opt.upper) sets.push(UPPER);
  if (opt.lower) sets.push(LOWER);
  if (opt.digit) sets.push(DIGIT);
  if (opt.symbol) sets.push(SYMBOL);
  if (opt.excludeAmbiguous) {
    sets = sets.map((s) => s.split('').filter((ch) => !AMBIG.includes(ch)).join(''));
  }
  return sets.filter((s) => s.length > 0);
}

function generatePassword(opt) {
  const sets = buildSets(opt);
  const pool = sets.join('');
  if (!pool) return { ok: false, msg: '请至少选择一种字符类型' };
  const len = Math.max(1, opt.length | 0);
  const chars = [];
  // 每种被选中的字符集至少出现一次（长度允许时）
  const guaranteed = Math.min(sets.length, len);
  for (let i = 0; i < guaranteed; i++) {
    const s = sets[i % sets.length];
    chars.push(s[secureRandomInt(s.length)]);
  }
  for (let i = chars.length; i < len; i++) {
    chars.push(pool[secureRandomInt(pool.length)]);
  }
  // Fisher-Yates 洗牌
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp;
  }
  return { ok: true, pwd: chars.join(''), poolSize: pool.length };
}

function passwordStrength(pwd, poolSize) {
  if (!pwd || !poolSize) return { bits: 0, label: '—', cls: '' };
  const bits = pwd.length * (Math.log(poolSize) / Math.log(2));
  let label, cls;
  if (bits < 28) { label = '弱'; cls = 'weak'; }
  else if (bits < 50) { label = '中'; cls = 'mid'; }
  else if (bits < 70) { label = '强'; cls = 'strong'; }
  else { label = '非常强'; cls = 'vstrong'; }
  return { bits, label, cls };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generatePassword, passwordStrength, secureRandomInt, buildSets };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const out = document.getElementById('out');
  const lenEl = document.getElementById('len');
  const lenVal = document.getElementById('lenVal');
  const strength = document.getElementById('strength');

  function opts() {
    return {
      length: +lenEl.value,
      upper: document.getElementById('upper').checked,
      lower: document.getElementById('lower').checked,
      digit: document.getElementById('digit').checked,
      symbol: document.getElementById('symbol').checked,
      excludeAmbiguous: document.getElementById('amb').checked,
    };
  }

  function render() {
    lenVal.textContent = lenEl.value;
    const o = opts();
    const r = generatePassword(o);
    if (!r.ok) {
      out.textContent = r.msg;
      strength.textContent = '强度：—';
      strength.className = 'hint';
      return;
    }
    out.textContent = r.pwd;
    const s = passwordStrength(r.pwd, r.poolSize);
    strength.textContent = `强度：${s.label}（约 ${s.bits.toFixed(0)} bit 熵）`;
    strength.className = 'hint ' + s.cls;
  }

  document.getElementById('gen').addEventListener('click', render);
  lenEl.addEventListener('input', render);
  ['upper', 'lower', 'digit', 'symbol', 'amb'].forEach((id) => {
    document.getElementById(id).addEventListener('change', render);
  });
  // 复制文本：使用 ui.js 共享的 window.copyText（Clipboard API + 回退）
  document.getElementById('copy').addEventListener('click', async () => {
    if (!out.textContent || out.textContent === '点击下方按钮生成密码') return;
    const ok = await window.copyText(out.textContent);
    showToast(ok ? '已复制' : '复制失败，请手动复制');
  });
  render();
}
