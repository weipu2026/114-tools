// ===== 纯函数（可在 node 中直接测试） =====
// A = P * (1 + r/m)^(m*n)，r 为年化百分比
// 参数 A 为「已知目标金额」，反求 r / n / P 时使用
function compoundSolve(target, P, r, n, m, A) {
  const rd = Number.isFinite(r) ? r / 100 : NaN;
  // 复利底数须 > 0（即 rd > -m），否则 Math.pow 会产生 NaN 或荒谬结果
  const baseValid = (m) => rd > -m;
  if (target === 'A') {
    if (!(P > 0) || !(n > 0) || !(m > 0)) return { ok: false, msg: '请填写有效的本金、年数、复利次数' };
    if (!Number.isFinite(r)) return { ok: false, msg: '请填写年化增长率（求最终金额需要增长率）' };
    if (!baseValid(m)) return { ok: false, msg: '增长率过低，复利计算无意义（须大于 -' + (m * 100) + '%）' };
    const Aout = P * Math.pow(1 + rd / m, m * n);
    return { ok: true, out: { A: Aout, interest: Aout - P } };
  }
  if (target === 'r') {
    if (!(P > 0) || !(A > 0) || !(n > 0) || !(m > 0)) return { ok: false, msg: '请填写有效的本金、目标金额、年数、复利次数' };
    const rr = m * (Math.pow(A / P, 1 / (m * n)) - 1);
    return { ok: true, out: { r: rr * 100 } };
  }
  if (target === 'n') {
    if (!(P > 0) || !(A > 0) || !(m > 0)) return { ok: false, msg: '请填写有效的本金、目标金额、增长率、复利次数' };
    if (!Number.isFinite(r)) return { ok: false, msg: '请填写年化增长率（求年数需要增长率）' };
    if (!baseValid(m)) return { ok: false, msg: '增长率过低，复利计算无意义（须大于 -' + (m * 100) + '%）' };
    const nn = Math.log(A / P) / (m * Math.log(1 + rd / m));
    if (!isFinite(nn) || !(nn > 0)) return { ok: false, msg: '该条件下无法达到目标金额（增长率为 0% 时需目标等于本金，负增长时需目标低于本金）' };
    return { ok: true, out: { n: nn } };
  }
  if (target === 'P') {
    if (!(A > 0) || !(n > 0) || !(m > 0)) return { ok: false, msg: '请填写有效的目标金额、年数、复利次数' };
    if (!Number.isFinite(r)) return { ok: false, msg: '请填写年化增长率（求本金需要增长率）' };
    if (!baseValid(m)) return { ok: false, msg: '增长率过低，复利计算无意义（须大于 -' + (m * 100) + '%）' };
    const PP = A / Math.pow(1 + rd / m, m * n);
    return { ok: true, out: { P: PP } };
  }
  return { ok: false, msg: '未知计算目标' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compoundSolve };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const target = document.getElementById('target');
  const P = document.getElementById('P');
  const r = document.getElementById('r');
  const n = document.getElementById('n');
  const m = document.getElementById('m');
  const A = document.getElementById('A');
  const out = document.getElementById('out');
  const status = document.getElementById('status');

  function syncDisable() {
    [P, r, n, m, A].forEach((el) => (el.disabled = false));
    if (target.value === 'A') A.disabled = true;
    if (target.value === 'r') r.disabled = true;
    if (target.value === 'n') n.disabled = true;
    if (target.value === 'P') P.disabled = true;
  }

  function fmt(x) {
    return Number(x).toLocaleString('zh-CN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }

  function run() {
    const p = parseFloat(P.value);
    const rr = parseFloat(r.value);
    const nn = parseFloat(n.value);
    const mm = parseFloat(m.value);
    const aa = parseFloat(A.value);
    const res = compoundSolve(target.value, p, rr, nn, mm, aa);
    if (!res.ok) {
      status.textContent = res.msg;
      out.textContent = '';
      return;
    }
    const o = res.out;
    if (target.value === 'A') {
      out.textContent = `最终金额：${fmt(o.A)} 元\n累计收益：${fmt(o.interest)} 元`;
    } else if (target.value === 'r') {
      out.textContent = `年化增长率：${o.r.toFixed(4)} %`;
    } else if (target.value === 'n') {
      out.textContent = `所需年数：${o.n.toFixed(2)} 年`;
    } else if (target.value === 'P') {
      out.textContent = `所需本金：${fmt(o.P)} 元`;
    }
    status.textContent = '计算完成';
  }

  target.addEventListener('change', syncDisable);
  document.getElementById('calc').addEventListener('click', run);
  document.getElementById('clear').addEventListener('click', () => {
    P.value = '';
    r.value = '';
    n.value = '';
    m.value = '1';
    A.value = '';
    out.textContent = '';
    showToast('已清空');
  });
  syncDisable();
}
