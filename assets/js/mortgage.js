// ===== 纯函数：房贷计算（可在 node 中直接测试） =====
// 2026年8月最新：5年期以上LPR 3.5%，首套首付最低15%

// 等额本息
function calcEqualInstallment(principal, annualRate, years) {
  const mr = annualRate / 100 / 12;
  const n = years * 12;
  if (mr === 0) {
    const mp = principal / n;
    return { monthlyPayment: mp, totalPayment: principal, totalInterest: 0, months: n };
  }
  const mp = principal * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
  const total = mp * n;
  const interest = total - principal;
  return {
    monthlyPayment: Math.round(mp * 100) / 100,
    totalPayment: Math.round(total * 100) / 100,
    totalInterest: Math.round(interest * 100) / 100,
    months: n,
  };
}

// 等额本金（返回首月/末月月供 + 总利息 + 还款表）
function calcEqualPrincipal(principal, annualRate, years) {
  const mr = annualRate / 100 / 12;
  const n = years * 12;
  const mp = principal / n;
  let totalInterest = 0;
  const schedule = [];
  for (let i = 1; i <= n; i++) {
    const interest = (principal - (i - 1) * mp) * mr;
    totalInterest += interest;
    schedule.push({
      month: i,
      principal: Math.round(mp * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      total: Math.round((mp + interest) * 100) / 100,
    });
  }
  const total = principal + totalInterest;
  return {
    monthlyPrincipal: Math.round(mp * 100) / 100,
    firstPayment: schedule[0].total,
    lastPayment: schedule[n - 1].total,
    totalPayment: Math.round(total * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    months: n,
    schedule,
  };
}

// 提前还款：部分提前还款后选择"缩短年限"或"减少月供"
function calcPrepayment(remainingPrincipal, annualRate, remainingMonths, prepayAmount, mode) {
  const newPrincipal = Math.max(0, remainingPrincipal - prepayAmount);
  if (newPrincipal <= 0) return { newPrincipal: 0, newMonths: 0, newMonthly: 0, savedInterest: 0, mode };

  const mr = annualRate / 100 / 12;
  if (mode === 'shorten') {
    // 缩短年限：月供不变
    const oldMonthly = calcEqualInstallment(remainingPrincipal, annualRate, remainingMonths / 12).monthlyPayment;
    // 用新本金+旧月供反求剩余月数
    let newMonths = Math.ceil(Math.log(oldMonthly / (oldMonthly - newPrincipal * mr)) / Math.log(1 + mr));
    if (!isFinite(newMonths) || newMonths < 1) newMonths = 1;
    const newResult = calcEqualInstallment(newPrincipal, annualRate, newMonths / 12);
    const oldResult = calcEqualInstallment(remainingPrincipal, annualRate, remainingMonths / 12);
    const saved = oldResult.totalPayment - newResult.totalPayment - prepayAmount;
    return { newPrincipal, newMonths, newMonthly: newResult.monthlyPayment, savedInterest: Math.round(saved * 100) / 100, mode };
  } else {
    // 减少月供：年限不变
    const newMonths = remainingMonths;
    const newResult = calcEqualInstallment(newPrincipal, annualRate, newMonths / 12);
    const oldResult = calcEqualInstallment(remainingPrincipal, annualRate, remainingMonths / 12);
    const saved = oldResult.totalPayment - newResult.totalPayment - prepayAmount;
    return { newPrincipal, newMonths, newMonthly: newResult.monthlyPayment, savedInterest: Math.round(saved * 100) / 100, mode };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcEqualInstallment, calcEqualPrincipal, calcPrepayment };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  function $(id) { return document.getElementById(id); }

  const priceEl = $('price');
  const downEl = $('down');
  const yearsEl = $('years');
  const rateEl = $('rate');
  const modeEl = $('mode');
  const out = $('out');
  const detail = $('detail');
  const status = $('status');

  function fmt(n) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function render() {
    const price = parseFloat(priceEl.value) || 0;
    const downRatio = parseFloat(downEl.value) / 100;
    const years = parseInt(yearsEl.value, 10) || 30;
    const rate = parseFloat(rateEl.value) || 3.5;
    const mode = modeEl.value;

    if (price <= 0) {
      out.innerHTML = '<div class="hint">请输入房屋总价</div>';
      detail.innerHTML = '';
      status.textContent = '';
      return;
    }

    const down = price * downRatio;
    const principal = price - down;

    let result;
    if (mode === 'ep') {
      result = calcEqualPrincipal(principal, rate, years);
    } else {
      result = calcEqualInstallment(principal, rate, years);
    }

    let html = '<div class="tx-summary">';
    html += '<div class="tx-row"><span>房屋总价</span><b>' + fmt(price) + ' 万元</b></div>';
    html += '<div class="tx-row"><span>首付 (' + (downRatio * 100) + '%)</span><b>' + fmt(down) + ' 万元</b></div>';
    html += '<div class="tx-row"><span>贷款金额</span><b>' + fmt(principal) + ' 万元</b></div>';
    html += '<div class="tx-row"><span>贷款年限</span><b>' + years + ' 年（' + result.months + '期）</b></div>';
    html += '<div class="tx-row"><span>年利率</span><b>' + rate + '%</b></div>';
    html += '<div class="tx-row emph"><span>月供</span><b>' + (mode === 'ep' ? fmt(result.firstPayment * 10000) + ' → ' + fmt(result.lastPayment * 10000) : fmt(result.monthlyPayment * 10000)) + ' 元</b></div>';
    html += '<div class="tx-row"><span>利息总额</span><b>' + fmt(result.totalInterest * 10000) + ' 元</b></div>';
    html += '<div class="tx-row emph"><span>还款总额</span><b>' + fmt(result.totalPayment * 10000) + ' 元</b></div>';
    html += '</div>';
    out.innerHTML = html;

    // 还款明细（前12期 + 摘要）
    if (mode === 'ep' && result.schedule) {
      let dhtml = '<table class="tx-tbl"><thead><tr><th>期数</th><th>本金</th><th>利息</th><th>月供</th></tr></thead><tbody>';
      const max = Math.min(12, result.schedule.length);
      for (let i = 0; i < max; i++) {
        const s = result.schedule[i];
        dhtml += '<tr><td>' + s.month + '</td><td>' + fmt(s.principal) + '</td><td>' + fmt(s.interest) + '</td><td>' + fmt(s.total) + '</td></tr>';
      }
      if (result.schedule.length > 12) {
        dhtml += '<tr><td colspan="4" style="text-align:center;color:var(--muted)">… 中间省略 ' + (result.schedule.length - 12) + ' 期 …</td></tr>';
        const last = result.schedule[result.schedule.length - 1];
        dhtml += '<tr><td>' + last.month + '</td><td>' + fmt(last.principal) + '</td><td>' + fmt(last.interest) + '</td><td>' + fmt(last.total) + '</td></tr>';
      }
      dhtml += '</tbody></table>';
      detail.innerHTML = dhtml;
    } else {
      detail.innerHTML = '';
    }

    status.textContent = '计算依据：' + (mode === 'ei' ? '等额本息' : '等额本金') + ' · 年利率' + rate + '% · 2026年8月5年期以上LPR为3.5%（实际利率以银行审批为准）';
  }

  priceEl.addEventListener('input', render);
  downEl.addEventListener('input', render);
  yearsEl.addEventListener('input', render);
  rateEl.addEventListener('input', render);
  modeEl.addEventListener('change', render);
  render();
}