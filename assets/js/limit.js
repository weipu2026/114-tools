// ===== 纯函数（可在 node 中直接测试） =====
function detectBoard(raw, forceSt) {
  let code = String(raw || '').trim().toUpperCase();
  let st = !!forceSt;
  if (code.startsWith('*ST')) { st = true; code = code.slice(3); }
  else if (code.startsWith('ST')) { st = true; code = code.slice(2); }
  code = code.replace(/[^0-9]/g, '');
  if (!/^\d{6}$/.test(code)) return null;

  const p2 = code.slice(0, 2);
  const p3 = code.slice(0, 3);
  let exchange, board, pct;

  if (p2 === '60' || p2 === '68' || p2 === '90') {
    exchange = '上交所';
    if (p3 === '688' || p3 === '689') { board = '科创板'; pct = 0.20; }
    else if (p2 === '60') { board = '主板'; pct = 0.10; }
    else { board = '沪市B股'; pct = 0.10; }
  } else if (p2 === '00' || p2 === '30' || p2 === '20') {
    exchange = '深交所';
    if (p3 === '300' || p3 === '301') { board = '创业板'; pct = 0.20; }
    else if (p2 === '00') { board = '主板'; pct = 0.10; }
    else { board = '深市B股'; pct = 0.10; }
  } else if (code[0] === '8' || code.startsWith('92')) {
    exchange = '北交所（京交所）';
    board = '北京证券交易所';
    pct = 0.30;
  } else {
    return null;
  }
  return { code, exchange, board, pct, st };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeLimit(price, pct) {
  const up = round2(price * (1 + pct));
  const down = round2(price * (1 - pct));
  return {
    up, down,
    upAmt: round2(up - price),
    downAmt: round2(price - down),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectBoard, computeLimit };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const out = document.getElementById('out');
  const status = document.getElementById('status');

  function render() {
    const code = document.getElementById('code').value;
    const price = parseFloat(document.getElementById('price').value);
    const info = detectBoard(code);
    if (!info) {
      out.innerHTML = '';
      status.textContent = '无法识别该股票代码，请输入 6 位数字代码（如 600519、830799）。';
      return;
    }
    if (!(price > 0)) {
      out.innerHTML = '';
      status.textContent = '请输入有效的昨收价（大于 0）。';
      return;
    }
    const r = computeLimit(price, info.pct);
    const pctText = (info.pct * 100).toFixed(0) + '%';
    out.innerHTML =
      `<div class="out-row"><span>交易所</span><span class="v">${info.exchange}</span></div>` +
      `<div class="out-row"><span>板块</span><span class="v">${info.board}${info.st ? '（ST）' : ''}</span></div>` +
      `<div class="out-row"><span>涨跌幅限制</span><span class="v">±${pctText}</span></div>` +
      `<div class="out-row"><span>涨停价</span><span class="v">${r.up.toFixed(2)} 元　（+${r.upAmt.toFixed(2)}）</span></div>` +
      `<div class="out-row"><span>跌停价</span><span class="v">${r.down.toFixed(2)} 元　（-${r.downAmt.toFixed(2)}）</span></div>`;
    status.textContent = `已按「${info.exchange} · ${info.board}」规则计算（±${pctText}）。`;
  }

  document.getElementById('calc').addEventListener('click', render);
  document.getElementById('clear').addEventListener('click', () => {
    document.getElementById('code').value = '';
    document.getElementById('price').value = '';
    out.innerHTML = '';
    showToast('已清空');
  });
  document.getElementById('code').addEventListener('input', render);
  document.getElementById('price').addEventListener('input', render);
}
