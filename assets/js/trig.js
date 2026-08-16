// ===== 纯函数：三角函数计算（可在 node 中直接测试） =====
// 无需外部依赖，基于 JS 内置 Math。

// 度 → 弧度
function toRad(deg) {
  return deg * Math.PI / 180;
}

// 计算六种三角函数，返回 { sin, cos, tan, cot, sec, csc }
// 当 tan/cot/sec/csc 无定义时返回 null
function trigCalc(deg) {
  if (!isFinite(deg)) return { sin: null, cos: null, tan: null, cot: null, sec: null, csc: null };
  const rad = toRad(deg);
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  // 分母趋近 0 时视为无定义
  const ZERO = 1e-12;
  const t = Math.abs(c) < ZERO ? null : s / c;
  const cot = Math.abs(s) < ZERO ? null : c / s;
  const sec = Math.abs(c) < ZERO ? null : 1 / c;
  const csc = Math.abs(s) < ZERO ? null : 1 / s;
  return { sin: s, cos: c, tan: t, cot, sec, csc };
}

// 按有效位数格式化；null → 「未定义」，接近 0 的浮点噪声 → 「0」
function fmtVal(v, sig) {
  if (v === null) return '未定义';
  if (!isFinite(v)) return '未定义';
  if (Math.abs(v) < 1e-12) return '0';
  const n = Math.min(Math.max(sig | 0, 1), 15);
  return String(parseFloat(v.toPrecision(n)));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { toRad, trigCalc, fmtVal };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const out = document.getElementById('out');
  const status = document.getElementById('status');
  const LABELS = [
    ['sin', '正弦 sin'],
    ['cos', '余弦 cos'],
    ['tan', '正切 tan'],
    ['cot', '余切 cot'],
    ['sec', '正割 sec'],
    ['csc', '余割 csc'],
  ];

  function render() {
    const deg = parseFloat(document.getElementById('deg').value);
    const sig = parseInt(document.getElementById('sig').value, 10) || 6;
    if (!isFinite(deg)) {
      out.innerHTML = '';
      status.textContent = '请输入有效的角度数值';
      return;
    }
    const r = trigCalc(deg);
    out.innerHTML = LABELS.map(([key, label]) =>
      `<div class="out-row"><span>${label}</span><span class="v">${fmtVal(r[key], sig)}</span></div>`
    ).join('');
    status.textContent = '以 ' + Math.min(Math.max(sig, 1), 15) + ' 位有效数字显示';
  }

  document.getElementById('deg').addEventListener('input', render);
  document.getElementById('sig').addEventListener('input', render);
  render();
}
