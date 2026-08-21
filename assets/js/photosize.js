// ===== 纯函数：照片 / 证件照尺寸计算（可在 node 中直接测试） =====

// 证件照特殊规格（名称 → 宽×高 mm）
const ID_PHOTOS = [
  ['小一寸', 22, 32],
  ['一寸', 25, 35],
  ['大一寸', 33, 48],
  ['小二寸', 35, 45],
  ['二寸', 35, 49],
  ['大二寸', 35, 53],
  ['三寸证件照', 55, 84],
];

// 冲印照片标准规格（寸 → 宽×高 mm），寸指长边英寸
const PHOTO_STD = {
  3:  [55, 84],
  5:  [89, 127],
  6:  [102, 152],
  7:  [127, 178],
  8:  [152, 203],
  10: [203, 254],
  12: [254, 305],
  14: [279, 356],
  15: [305, 381],
  16: [305, 406],
  18: [356, 457],
  20: [406, 508],
  24: [508, 610],
  30: [610, 762],
  36: [610, 914],
  40: [762, 1016],
  48: [1016, 1219],
  60: [1016, 1524],
};

const INCH_MM = 25.4;

// 计算某寸照片尺寸：查表优先，未列入的按「长边 = 寸 × 25.4」+ 指定宽高比推算
// 返回 { w, h }（mm）与是否精确
function photoCalc(inch, ratio) {
  const n = Number(inch);
  if (!isFinite(n) || n <= 0) return null;
  const std = PHOTO_STD[n];
  if (std) return { w: std[0], h: std[1], exact: true };
  const r = Number(ratio);
  const safeRatio = isFinite(r) && r > 0 ? r : 1.5;
  const longSide = n * INCH_MM;
  const shortSide = longSide / safeRatio;
  return { w: Math.round(shortSide), h: Math.round(longSide), exact: false, ratio: safeRatio };
}

// 毫米换算为像素
function mmToPx(mm, dpi) {
  const d = Number(dpi);
  return Math.round(mm / INCH_MM * (isFinite(d) && d > 0 ? d : 300));
}

function fmtNum(n) {
  return String(parseFloat(n.toFixed(1)));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ID_PHOTOS, PHOTO_STD, photoCalc, mmToPx, fmtNum };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const out = document.getElementById('out');
  const status = document.getElementById('status');

  function row(label, val) {
    return `<div class="out-row"><span>${label}</span><span class="v">${val}</span></div>`;
  }

  function render() {
    const inch = parseFloat(document.getElementById('inch').value);
    const ratio = parseFloat(document.getElementById('ratio').value);
    const dpi = parseInt(document.getElementById('dpi').value, 10) || 300;
    const r = photoCalc(inch, ratio);
    if (!r) {
      out.innerHTML = '';
      status.textContent = '请输入有效的正数尺寸';
      return;
    }
    const pxW = mmToPx(r.w, dpi);
    const pxH = mmToPx(r.h, dpi);
    out.innerHTML =
      row('尺寸', inch + ' 寸' + (r.exact ? '（标准规格）' : '（按 ' + r.ratio + ':1 比例推算）')) +
      row('宽 × 高', fmtNum(r.w) + ' × ' + fmtNum(r.h) + ' mm') +
      row('换算厘米', fmtNum(r.w / 10) + ' × ' + fmtNum(r.h / 10) + ' cm') +
      row('像素 @' + dpi + ' DPI', pxW + ' × ' + pxH + ' px');
    status.textContent = r.exact ? '该规格为标准冲印 / 证件照尺寸，查表得出。' : '非标准规格，按长边 = 寸 × 25.4 mm 推算，仅供参考。';
  }

  // 渲染证件照速查表
  (function renderIdTable() {
    document.getElementById('tbl_id').innerHTML =
      '<table><thead><tr><th>规格</th><th>宽 mm</th><th>高 mm</th><th>宽 × 高 px（300dpi）</th></tr></thead><tbody>' +
      ID_PHOTOS.map(([name, w, h]) =>
        `<tr><td>${name}</td><td>${w}</td><td>${h}</td><td>${mmToPx(w, 300)} × ${mmToPx(h, 300)}</td></tr>`
      ).join('') + '</tbody></table>';
  })();

  // 渲染 1–60 寸冲印速查表（标准尺寸查表，未列入的按 3:2 推算）
  (function renderPhotoTable() {
    const rows = [];
    for (let i = 1; i <= 60; i++) {
      const r = photoCalc(i, 1.5);
      if (!r) continue;
      rows.push(`<tr><td>${i} 寸</td><td>${fmtNum(r.w)} × ${fmtNum(r.h)}</td><td>${r.exact ? '标准' : '推算'}</td></tr>`);
    }
    document.getElementById('tbl_photo').innerHTML =
      '<table><thead><tr><th>尺寸</th><th>宽 × 高 mm</th><th>来源</th></tr></thead><tbody>' +
      rows.join('') + '</tbody></table>';
  })();

  document.getElementById('inch').addEventListener('input', render);
  document.getElementById('ratio').addEventListener('change', render);
  document.getElementById('dpi').addEventListener('change', render);
  render();
}
