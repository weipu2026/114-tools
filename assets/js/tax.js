// ===== 纯函数：个税/工资计算（可在 node 中直接测试） =====
// 标准依据：《个人所得税法》2018修订版，起征点5000元/月
// 专项附加扣除标准：2023年8月提高后标准（3岁以下/子女教育各2000、赡养独生3000）

// 7级超额累进税率表（全年应纳税所得额）
const TAX_BRACKETS = [
  { max: 36000, rate: 0.03, deduct: 0 },
  { max: 144000, rate: 0.10, deduct: 2520 },
  { max: 300000, rate: 0.20, deduct: 16920 },
  { max: 420000, rate: 0.25, deduct: 31920 },
  { max: 660000, rate: 0.30, deduct: 52920 },
  { max: 960000, rate: 0.35, deduct: 85920 },
  { max: Infinity, rate: 0.45, deduct: 181920 },
];

// 五险一金默认比例（个人缴纳部分）
const DEFAULT_SOCIAL_RATIOS = {
  pension: 0.08,       // 养老
  medical: 0.02,       // 医疗
  unemployment: 0.005, // 失业
  housingFund: 0.12,   // 公积金（5%-12%，默认12%）
};

// 月度免征额
const THRESHOLD = 5000;

// 计算五险一金（个人部分）
function calcSocialInsurance(base, ratios) {
  const r = ratios || DEFAULT_SOCIAL_RATIOS;
  const items = {
    pension: Math.round(base * r.pension * 100) / 100,
    medical: Math.round(base * r.medical * 100) / 100,
    unemployment: Math.round(base * r.unemployment * 100) / 100,
    housingFund: Math.round(base * r.housingFund * 100) / 100,
  };
  items.total = Math.round((items.pension + items.medical + items.unemployment + items.housingFund) * 100) / 100;
  return items;
}

// 计算全年应纳税额（累计预扣法）
function calcAnnualTax(annualIncome, annualSocialIns, annualDeduction) {
  const taxable = Math.max(0, annualIncome - annualSocialIns - THRESHOLD * 12 - annualDeduction);
  const bracket = TAX_BRACKETS.find(b => taxable <= b.max);
  const tax = Math.max(0, Math.round((taxable * bracket.rate - bracket.deduct) * 100) / 100);
  return { taxable, tax, bracket };
}

// 月度税率表（按月换算后的综合所得税率表，用于年终奖单独计税）
// https://www.gov.cn/zhengce/zhengceku/202401/content_6925685.htm
const MONTHLY_TAX_BRACKETS = [
  { max: 3000, rate: 0.03, deduct: 0 },
  { max: 12000, rate: 0.10, deduct: 210 },
  { max: 25000, rate: 0.20, deduct: 1410 },
  { max: 35000, rate: 0.25, deduct: 2660 },
  { max: 55000, rate: 0.30, deduct: 4410 },
  { max: 80000, rate: 0.35, deduct: 7160 },
  { max: Infinity, rate: 0.45, deduct: 15160 },
];

// 年终奖单独计税（除以12找税率，用全额累进）
function calcBonusTax(bonus) {
  if (bonus <= 0) return { tax: 0, afterTax: bonus };
  const monthlyAvg = bonus / 12;
  const bracket = MONTHLY_TAX_BRACKETS.find(b => monthlyAvg <= b.max);
  const tax = Math.max(0, Math.round((bonus * bracket.rate - bracket.deduct) * 100) / 100);
  return { tax, afterTax: Math.round((bonus - tax) * 100) / 100, rate: bracket.rate };
}

// 月度明细（简化版：假设月薪恒定，用平均法，非严格的累计预扣逐月）
// 返回12个月明细数组
function monthlyBreakdown(monthlySalary, monthlySocialIns, monthlyDeduction) {
  const months = [];
  let cumulativeIncome = 0;
  let cumulativeSocialIns = 0;
  let cumulativeDeduction = 0;
  let cumulativeTaxPaid = 0;

  for (let m = 1; m <= 12; m++) {
    cumulativeIncome += monthlySalary;
    cumulativeSocialIns += monthlySocialIns;
    cumulativeDeduction += THRESHOLD + monthlyDeduction;
    const taxable = Math.max(0, cumulativeIncome - cumulativeSocialIns - cumulativeDeduction);
    const bracket = TAX_BRACKETS.find(b => taxable <= b.max);
    const cumulativeTax = Math.max(0, Math.round((taxable * bracket.rate - bracket.deduct) * 100) / 100);
    const monthlyTax = Math.round((cumulativeTax - cumulativeTaxPaid) * 100) / 100;
    cumulativeTaxPaid = cumulativeTax;

    months.push({
      month: m,
      taxable: Math.round(taxable * 100) / 100,
      tax: monthlyTax,
      cumulativeTax,
      afterTax: Math.round((monthlySalary - monthlySocialIns - monthlyTax) * 100) / 100,
    });
  }
  return months;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAX_BRACKETS, MONTHLY_TAX_BRACKETS, DEFAULT_SOCIAL_RATIOS, THRESHOLD, calcSocialInsurance, calcAnnualTax, calcBonusTax, monthlyBreakdown };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  function $(id) { return document.getElementById(id); }

  const salaryEl = $('salary');
  const baseEl = $('base');
  const hfEl = $('hf');
  const deductionEl = $('deduction');
  const bonusEl = $('bonus');
  const out = $('out');
  const detail = $('detail');
  const status = $('status');

  function fmt(n) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function render() {
    const salary = parseFloat(salaryEl.value) || 0;
    const base = parseFloat(baseEl.value) || salary;
    const hfRatio = parseFloat(hfEl.value) / 100;
    const deduction = parseFloat(deductionEl.value) || 0;
    const bonus = parseFloat(bonusEl.value) || 0;

    if (salary <= 0) {
      out.innerHTML = '<div class="hint">请输入税前月薪</div>';
      detail.innerHTML = '';
      status.textContent = '';
      return;
    }

    const ratios = {
      pension: DEFAULT_SOCIAL_RATIOS.pension,
      medical: DEFAULT_SOCIAL_RATIOS.medical,
      unemployment: DEFAULT_SOCIAL_RATIOS.unemployment,
      housingFund: hfRatio,
    };
    const si = calcSocialInsurance(base, ratios);
    const annual = calcAnnualTax(salary * 12, si.total * 12, deduction * 12);
    const bonusResult = bonus > 0 ? calcBonusTax(bonus) : null;

    // 月度到手
    const monthlyTax = Math.round(annual.tax / 12 * 100) / 100;
    const monthlyNet = Math.round((salary - si.total - monthlyTax) * 100) / 100;

    let html = '<div class="tx-summary">';
    html += '<div class="tx-row"><span>税前月薪</span><b>' + fmt(salary) + ' 元</b></div>';
    html += '<div class="tx-row"><span>养老 (' + (ratios.pension * 100) + '%)</span><b>-' + fmt(si.pension) + '</b></div>';
    html += '<div class="tx-row"><span>医疗 (' + (ratios.medical * 100) + '%)</span><b>-' + fmt(si.medical) + '</b></div>';
    html += '<div class="tx-row"><span>失业 (' + (ratios.unemployment * 100) + '%)</span><b>-' + fmt(si.unemployment) + '</b></div>';
    html += '<div class="tx-row"><span>公积金 (' + (hfRatio * 100) + '%)</span><b>-' + fmt(si.housingFund) + '</b></div>';
    html += '<div class="tx-row sep"><span>五险一金合计</span><b>-' + fmt(si.total) + '</b></div>';
    html += '<div class="tx-row"><span>应纳税所得额（月均）</span><b>' + fmt(annual.taxable / 12) + '</b></div>';
    html += '<div class="tx-row"><span>个人所得税（月均）</span><b>-' + fmt(monthlyTax) + '</b></div>';
    html += '<div class="tx-row emph"><span>税后月收入</span><b>' + fmt(monthlyNet) + ' 元</b></div>';
    if (bonusResult) {
      html += '<div class="tx-row sep"><span>年终奖（单独计税）</span><b>' + fmt(bonus) + '</b></div>';
      html += '<div class="tx-row"><span>年终奖个税（' + (bonusResult.rate * 100) + '%）</span><b>-' + fmt(bonusResult.tax) + '</b></div>';
      html += '<div class="tx-row emph"><span>年终奖到手</span><b>' + fmt(bonusResult.afterTax) + ' 元</b></div>';
    }
    html += '<div class="tx-row emph sep"><span>年度税后总收入</span><b>' + fmt(monthlyNet * 12 + (bonusResult ? bonusResult.afterTax : 0)) + ' 元</b></div>';
    html += '</div>';
    out.innerHTML = html;

    // 12个月明细
    const breakdown = monthlyBreakdown(salary, si.total, deduction);
    let dhtml = '<table class="tx-tbl"><thead><tr><th>月份</th><th>累计应税所得</th><th>当月个税</th><th>当月到手</th></tr></thead><tbody>';
    breakdown.forEach(m => {
      dhtml += '<tr><td>' + m.month + '月</td><td>' + fmt(m.taxable) + '</td><td>' + fmt(m.tax) + '</td><td>' + fmt(m.afterTax) + '</td></tr>';
    });
    dhtml += '</tbody></table>';
    detail.innerHTML = dhtml;

    status.textContent = '计算依据：起征点5000元/月 · 7级超额累进税率 · 专项附加扣除' + deduction + '元/月 · 公积金' + (hfRatio * 100) + '%';
  }

  salaryEl.addEventListener('input', render);
  baseEl.addEventListener('input', render);
  hfEl.addEventListener('input', render);
  deductionEl.addEventListener('input', render);
  bonusEl.addEventListener('input', render);
  render();
}