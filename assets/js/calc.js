// ===== 纯函数（可在 node 中直接测试） =====
const MU = 666.6666667; // 1 亩 = 666.667 平方米

function convertUnits(value, from) {
  const f = { mu: MU, m2: 1, ha: 10000, km2: 1000000 };
  const sqm = value * f[from];
  return { mu: sqm / MU, m2: sqm, ha: sqm / 10000, km2: sqm / 1000000 };
}

function buildingArea(mu, far) {
  return { land: mu * MU, floor: mu * MU * far };
}

function floorPrice(priceWan, far) { // 楼面地价 元/㎡
  if (!far) return NaN;
  return (priceWan * 10000) / (MU * far);
}

function farOf(floorArea, landMu) {
  if (!landMu) return NaN;
  return floorArea / (landMu * MU);
}

function deal(mu, priceWan, far) {
  const b = buildingArea(mu, far);
  return {
    land: b.land,
    floor: b.floor,
    total: mu * priceWan, // 万元
    floorUnit: floorPrice(priceWan, far), // 元/㎡
    groundUnit: priceWan * 10000 / MU, // 元/㎡
  };
}

function fmt(n, d = 2) {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('zh-CN', { maximumFractionDigits: d });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { convertUnits, buildingArea, floorPrice, farOf, deal, MU };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const tabs = document.getElementById('tabs');
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    const name = btn.dataset.tab;
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tabpane').forEach((p) => p.classList.toggle('active', p.dataset.pane === name));
  });

  const $ = (id) => document.getElementById(id);

  function row(label, val) {
    return `<div class="out-row"><span>${label}</span><span class="v">${val}</span></div>`;
  }

  function renderUnit() {
    const v = parseFloat($('u_val').value);
    if (!isFinite(v) || v < 0) { $('u_out').innerHTML = row('请输入有效的非负数值', ''); return; }
    const r = convertUnits(v, $('u_unit').value);
    $('u_out').innerHTML =
      row('亩', fmt(r.mu) + ' 亩') +
      row('平方米', fmt(r.m2) + ' ㎡') +
      row('公顷', fmt(r.ha) + ' 公顷') +
      row('平方公里', fmt(r.km2) + ' km²');
  }

  function renderArea() {
    const mu = parseFloat($('a_mu').value), far = parseFloat($('a_far').value);
    if (!isFinite(mu) || !isFinite(far) || mu < 0 || far < 0) { $('a_out').innerHTML = ''; return; }
    const r = buildingArea(mu, far);
    $('a_out').innerHTML =
      row('土地面积', fmt(r.land) + ' ㎡') +
      row('建筑面积', fmt(r.floor) + ' ㎡');
  }

  function renderFloor() {
    const p = parseFloat($('f_price').value), far = parseFloat($('f_far').value);
    if (!isFinite(p) || !isFinite(far) || far <= 0 || p < 0) { $('f_out').innerHTML = ''; return; }
    $('f_out').innerHTML = row('楼面地价', fmt(floorPrice(p, far)) + ' 元/㎡');
  }

  function renderFar() {
    const fl = parseFloat($('r_floor').value), land = parseFloat($('r_land').value);
    const unit = $('r_unit').value;
    if (!isFinite(fl) || !isFinite(land) || land <= 0 || fl < 0) { $('r_out').innerHTML = ''; return; }
    const landMu = unit === 'mu' ? land : land / MU;
    $('r_out').innerHTML = row('容积率', fmt(farOf(fl, landMu), 3));
  }

  function renderDeal() {
    const mu = parseFloat($('d_mu').value), p = parseFloat($('d_price').value), far = parseFloat($('d_far').value);
    if (!isFinite(mu) || !isFinite(p) || !isFinite(far) || far <= 0 || mu < 0 || p < 0) { $('d_out').innerHTML = ''; return; }
    const r = deal(mu, p, far);
    $('d_out').innerHTML =
      row('土地面积', fmt(r.land) + ' ㎡') +
      row('土地总价', fmt(r.total) + ' 万元') +
      row('楼面地价', fmt(r.floorUnit) + ' 元/㎡') +
      row('地面单价', fmt(r.groundUnit) + ' 元/㎡') +
      row('总建筑面积', fmt(r.floor) + ' ㎡');
  }

  ['u_val', 'u_unit'].forEach((id) => $(id).addEventListener('input', renderUnit));
  ['a_mu', 'a_far'].forEach((id) => $(id).addEventListener('input', renderArea));
  ['f_price', 'f_far'].forEach((id) => $(id).addEventListener('input', renderFloor));
  ['r_floor', 'r_land', 'r_unit'].forEach((id) => $(id).addEventListener('input', renderFar));
  ['d_mu', 'd_price', 'd_far'].forEach((id) => $(id).addEventListener('input', renderDeal));

  renderUnit();
}
