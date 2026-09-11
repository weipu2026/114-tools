// ===== 纯函数：日期计算（可在 node 中直接测试） =====

// 解析日期字符串为 {y, m, d}，支持 2026-8-14 / 2026/08/14 / 2026.8.14 / 2026年8月14日
function parseDate(str) {
  const s = String(str || '').trim();
  const m = s.match(/^(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})日?$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  // 校验日期真实存在（如 2023-02-30 非法）
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

// 日期加 / 减 n 天（n 可为负），返回 {y, m, d}
function shiftDate(date, n) {
  const dt = new Date(date.y, date.m - 1, date.d + n);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

// 两个日期相差的天数（b - a），用 UTC 对齐避免时区 / 夏令时误差
function diffDays(a, b) {
  const ta = Date.UTC(a.y, a.m - 1, a.d);
  const tb = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((tb - ta) / 86400000);
}

// 星期几文字
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
function weekText(date) {
  const w = WEEK[new Date(date.y, date.m - 1, date.d).getDay()];
  return w ? '星期' + w : '星期—'; // 日期非法时 getDay() 为 NaN，避免输出「星期undefined」
}

function fmt(date) {
  return date.y + ' 年 ' + date.m + ' 月 ' + date.d + ' 日';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseDate, shiftDate, diffDays, weekText, fmt };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const FORMAT_HINT = '日期格式示例：2026-08-14（也支持 2026/8/14、2026年8月14日）';
  // 日期平移的实用上限（天）：JS Date 上限约 ±1e8 天，且 1e8 本身已越界成 Invalid Date
  const MAX_SHIFT_DAYS = 1000000; // 约 2738 年

  function out(el, rows) {
    el.innerHTML = rows.map((r) => `<div class="out-row"><span>${r[0]}</span><span class="v">${r[1]}</span></div>`).join('');
  }

  // ---- 日期推算 ----
  function renderShift() {
    const el = document.getElementById('s_out');
    const raw = document.getElementById('s_date').value;
    if (!raw.trim()) { out(el, []); return; }
    const a = parseDate(raw);
    if (!a) { out(el, [['输入有误', FORMAT_HINT]]); return; }
    const days = Number(document.getElementById('s_days').value);
    if (!Number.isInteger(days) || days < 0) {
      out(el, [['基准日期', fmt(a) + '（' + weekText(a) + '）'], ['提示', '天数请输入非负整数']]);
      return;
    }
    // 上限保护：JS Date 的表示上限约 ±1e8 天（±273790 年）就会被溢出成 Invalid Date，
    // 而 1e8 天本身已越界（2026 年往后加 1e8 天必然 Invalid），所以取一个远小于该值的实用上限。
    if (days > MAX_SHIFT_DAYS) {
      out(el, [['基准日期', fmt(a) + '（' + weekText(a) + '）'], ['提示', '天数过大，请输入不超过 ' + MAX_SHIFT_DAYS + ' 的天数（约 ' + Math.round(MAX_SHIFT_DAYS / 365.25) + ' 年）']]);
      return;
    }
    const dir = document.getElementById('s_dir').value === 'after' ? 1 : -1;
    const res = shiftDate(a, dir * days);
    if (!Number.isFinite(res.y)) { // 兜底：万一仍越界，给出提示而不是「NaN 年 NaN 月」
      out(el, [['基准日期', fmt(a) + '（' + weekText(a) + '）'], ['提示', '该天数超出可计算范围，请减小天数']]);
      return;
    }
    out(el, [
      ['基准日期', fmt(a) + '（' + weekText(a) + '）'],
      [days === 0 ? '计算结果' : (dir === 1 ? days + ' 天后' : days + ' 天前'), fmt(res) + '（' + weekText(res) + '）'],
    ]);
  }

  ['s_date', 's_days', 's_dir'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener(id === 's_dir' ? 'change' : 'input', renderShift);
  });

  // ---- 日期间隔 ----
  function renderDiff() {
    const el = document.getElementById('d_out');
    const ra = document.getElementById('d_a').value;
    const rb = document.getElementById('d_b').value;
    if (!ra.trim() || !rb.trim()) { out(el, []); return; }
    const a = parseDate(ra);
    const b = parseDate(rb);
    if (!a || !b) {
      out(el, [['输入有误', FORMAT_HINT]]);
      return;
    }
    const diff = diffDays(a, b);
    let label;
    if (diff > 0) label = 'B 比 A 晚 ' + diff + ' 天';
    else if (diff < 0) label = 'B 比 A 早 ' + (-diff) + ' 天';
    else label = '两个日期是同一天';
    out(el, [
      ['日期 A', fmt(a) + '（' + weekText(a) + '）'],
      ['日期 B', fmt(b) + '（' + weekText(b) + '）'],
      ['相差', label],
    ]);
  }

  ['d_a', 'd_b'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderDiff);
  });
}
