// ===== 纯函数：渐进式延迟法定退休年龄计算（可在 node 中直接测试） =====
// 政策依据：《全国人大常委会关于实施渐进式延迟法定退休年龄的决定》(2025-01-01 起施行)
// 1) 男职工：原 60 岁，每 4 个月延迟 1 个月，逐步至 63 岁
// 2) 女职工（工人）：原 50 岁，每 2 个月延迟 1 个月，逐步至 55 岁
// 3) 女职工（干部/技术）：原 55 岁，每 4 个月延迟 1 个月，逐步至 58 岁
// 弹性退休：《实施弹性退休制度暂行办法》——提前最长 3 年且不得低于原退休年龄；延迟最长 3 年。

const RETIRE_RULES = {
  male:     { original: 60, startY: 1965, startM: 1, step: 4, maxDelay: 36, label: '男职工' },
  female50: { original: 50, startY: 1975, startM: 1, step: 2, maxDelay: 60, label: '女职工 · 工人' },
  female55: { original: 55, startY: 1970, startM: 1, step: 4, maxDelay: 36, label: '女职工 · 干部 / 技术' },
};

function monthIndex(y, m) { return y * 12 + (m - 1); }

// 按出生年月推算应延迟的月数
function computeDelay(type, y, m) {
  const rule = RETIRE_RULES[type];
  const diff = monthIndex(y, m) - monthIndex(rule.startY, rule.startM);
  if (diff < 0) return 0; // 政策实施前已到原退休年龄，不再延迟
  return Math.min(Math.floor(diff / rule.step) + 1, rule.maxDelay);
}

function addMonths(y, m, n) {
  const total = monthIndex(y, m) + n;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

// 核心计算：返回法定退休、原退休、弹性提前最早、弹性延迟最晚（均为 {y, m}）
function calcRetirement(type, y, m) {
  const rule = RETIRE_RULES[type];
  if (!rule || !Number.isInteger(m) || m < 1 || m > 12) throw new Error('参数无效');
  const delay = computeDelay(type, y, m);
  const legal = addMonths(y, m, rule.original * 12 + delay); // 法定退休年月
  const original = addMonths(y, m, rule.original * 12);      // 原法定退休年月
  const earlyMin = addMonths(legal.y, legal.m, -36);         // 弹性提前：法定 - 3 年
  const early = monthIndex(earlyMin.y, earlyMin.m) < monthIndex(original.y, original.m)
    ? original : earlyMin;                                   // 但不得低于原退休年龄
  const late = addMonths(legal.y, legal.m, 36);              // 弹性延迟：法定 + 3 年
  return { type, delay, legal, original, early, late, rule };
}

// 退休年龄的文字表示（如 60 岁 1 个月）
function ageText(original, delay) {
  const total = original * 12 + delay;
  const y = Math.floor(total / 12);
  const m = total % 12;
  return m === 0 ? y + ' 周岁' : y + ' 岁 ' + m + ' 个月';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RETIRE_RULES, computeDelay, addMonths, calcRetirement, ageText, monthIndex };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const out = document.getElementById('out');
  const status = document.getElementById('status');

  function row(label, val) {
    return `<div class="out-row"><span>${label}</span><span class="v">${val}</span></div>`;
  }
  function ym(d) { return d.y + ' 年 ' + d.m + ' 月'; }

  function render() {
    const type = document.getElementById('type').value;
    const year = parseInt(document.getElementById('year').value, 10);
    const month = parseInt(document.getElementById('month').value, 10);
    if (!Number.isInteger(year) || year < 1945 || year > 2015) {
      out.innerHTML = '';
      status.textContent = '请输入有效的出生年份（1945–2015）。';
      return;
    }
    const r = calcRetirement(type, year, month);
    out.innerHTML =
      row('参保人群', r.rule.label) +
      row('原法定退休年龄', r.rule.original + ' 周岁') +
      row('法定退休年龄', ageText(r.rule.original, r.delay)) +
      row('法定退休日期', ym(r.legal)) +
      row('弹性提前最早', ym(r.early)) +
      row('弹性延迟最晚', ym(r.late));
    status.textContent = '弹性提前不得低于原退休年龄；弹性延迟需与单位协商一致（公务员及国企管理人员不适用）。测算结果供参考，以社保经办核定为准。';
  }

  document.getElementById('calc').addEventListener('click', render);
  document.getElementById('clear').addEventListener('click', () => {
    document.getElementById('year').value = '';
    out.innerHTML = '';
    showToast('已清空');
  });
  document.getElementById('type').addEventListener('change', render);
  document.getElementById('year').addEventListener('input', render);
  document.getElementById('month').addEventListener('change', render);
}
