// ===== 纯函数：房贷计算（可在 node 中直接测试） =====
// 2026年8月最新：5年期以上LPR 3.5%，首套首付最低15%
// 金额单位与入参一致：本站页面统一按「元」传参，返回值也是「元」，内部四舍五入到「分」。
// 注意：不要在「万元」量级上做两位小数四舍五入——那等于把金额量化到 100 元档。

function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

// 等额本息
function calcEqualInstallment(principal, annualRate, years) {
  const mr = annualRate / 100 / 12;
  const n = Math.max(1, Math.round((years || 0) * 12)); // 按「月」计算，避免 8.33 年这类零头被截断
  if (mr === 0) {
    return { monthlyPayment: round2(principal / n), totalPayment: round2(principal), totalInterest: 0, months: n };
  }
  const mp = principal * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
  const total = mp * n;
  const interest = total - principal;
  return {
    monthlyPayment: round2(mp),
    totalPayment: round2(total),
    totalInterest: round2(interest),
    months: n,
  };
}

// 等额本金（返回首月/末月月供 + 总利息 + 还款表）
function calcEqualPrincipal(principal, annualRate, years) {
  const mr = annualRate / 100 / 12;
  const n = Math.max(1, Math.round((years || 0) * 12)); // 同 calcEqualInstallment，按「月」计算
  const mp = principal / n;
  let totalInterest = 0;
  const schedule = [];
  for (let i = 1; i <= n; i++) {
    const interest = (principal - (i - 1) * mp) * mr;
    totalInterest += interest;
    schedule.push({
      month: i,
      principal: round2(mp),
      interest: round2(interest),
      total: round2(mp + interest),
    });
  }
  const total = principal + totalInterest;
  return {
    monthlyPrincipal: round2(mp),
    firstPayment: schedule[0].total,
    lastPayment: schedule[n - 1].total,
    totalPayment: round2(total),
    totalInterest: round2(totalInterest),
    months: n,
    schedule,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcEqualInstallment, calcEqualPrincipal };
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
    const downRatio = Math.max(0, Math.min(1, (parseFloat(downEl.value) || 0) / 100));
    const years = Math.max(1, parseInt(yearsEl.value, 10) || 30);
    const rate = parseFloat(rateEl.value) || 3.5;
    const mode = modeEl.value;

    if (price <= 0) {
      out.innerHTML = '<div class="hint">请输入房屋总价</div>';
      detail.innerHTML = '';
      status.textContent = '';
      return;
    }

    const down = price * downRatio;
    const principal = price - down;            // 万元，仅用于展示
    const principalYuan = principal * 10000;   // 元，用于计算（纯函数内部精确到「分」）

    let result;
    if (mode === 'ep') {
      result = calcEqualPrincipal(principalYuan, rate, years);
    } else {
      result = calcEqualInstallment(principalYuan, rate, years);
    }

    let html = '<div class="tx-summary">';
    html += '<div class="tx-row"><span>房屋总价</span><b>' + fmt(price) + ' 万元</b></div>';
    html += '<div class="tx-row"><span>首付 (' + (downRatio * 100) + '%)</span><b>' + fmt(down) + ' 万元</b></div>';
    html += '<div class="tx-row"><span>贷款金额</span><b>' + fmt(principal) + ' 万元</b></div>';
    html += '<div class="tx-row"><span>贷款年限</span><b>' + years + ' 年（' + result.months + '期）</b></div>';
    html += '<div class="tx-row"><span>年利率</span><b>' + rate + '%</b></div>';
    html += '<div class="tx-row emph"><span>月供</span><b>' + (mode === 'ep' ? fmt(result.firstPayment) + ' → ' + fmt(result.lastPayment) : fmt(result.monthlyPayment)) + ' 元</b></div>';
    html += '<div class="tx-row"><span>利息总额</span><b>' + fmt(result.totalInterest) + ' 元</b></div>';
    html += '<div class="tx-row emph"><span>还款总额</span><b>' + fmt(result.totalPayment) + ' 元</b></div>';
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
        dhtml += '<tr><td colspan="4" style="text-align:center;color:var(--muted)">… 中间省略 ' + (result.schedule.length - 13) + ' 期 …</td></tr>';
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