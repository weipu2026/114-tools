/* 全站共享 UI：Toast / 品牌 Logo / 页脚 / 相关工具 / 首页搜索过滤 / 无障碍。
   零依赖、幂等注入，所有工具页统一引用此文件。 */
(function () {
  'use strict';

  /* ---- 1. Toast 统一反馈 ---- */
  function showToast(msg, type) {
    if (!msg) return;
    var box = document.getElementById('ui-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ui-toast';
      document.body.appendChild(box);
    }
    var t = document.createElement('div');
    t.className = 'ui-toast' + (type ? ' ui-toast-' + type : '');
    t.textContent = msg;
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 250);
    }, 2200);
  }
  window.showToast = showToast;

  /* ---- 1.5 复制到剪贴板（Clipboard API + textarea/execCommand 回退） ---- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function () { return true; })
        .catch(function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  window.copyText = copyText;

  /* ---- 2. 品牌 Logo（仅注入到页头 .brand） ---- */
  function logoHTML() {
    return '<svg class="logo" viewBox="26 46 506 100" aria-hidden="true">' +
      '<circle cx="72" cy="92" r="32" fill="none" stroke="#F97316" stroke-width="12"/>' +
      '<rect x="72" y="86" width="72" height="12" rx="3" fill="#F97316"/>' +
      '<rect x="112" y="98" width="9" height="20" rx="2" fill="#F97316"/>' +
      '<rect x="126" y="98" width="9" height="15" rx="2" fill="#F97316"/>' +
      '<text x="72" y="102" text-anchor="middle" font-family="\'PingFang SC\',\'Microsoft YaHei\',sans-serif" font-size="34" font-weight="800" fill="#F97316">工</text>' +
      '<text x="158" y="124" font-family="\'PingFang SC\',\'Microsoft YaHei\',sans-serif" font-size="70" font-weight="800"><tspan fill="#F97316">114</tspan><tspan fill="var(--text)">工具箱</tspan></text>' +
      '</svg>';
  }
  function injectLogo() {
    var html = logoHTML();
    var brand = document.querySelector('.brand');
    if (brand && !brand.querySelector('.logo')) brand.insertAdjacentHTML('afterbegin', html);
  }

  /* ---- 3. 页脚信任文案 ---- */
  function injectFooter() {
    if (document.getElementById('ui-foot')) return;
    var f = document.createElement('footer');
    f.id = 'ui-foot';
    f.className = 'ui-foot';
    var text = document.createElement('span');
    text.textContent = '所有数据均在浏览器本地处理，不会上传 · ';
    var link = document.createElement('a');
    link.href = 'https://github.com/weipu2026/114-tools';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = '114工具箱';
    f.appendChild(text);
    f.appendChild(link);
    document.body.appendChild(f);
  }

  /* ---- 4. 相关工具推荐（按当前页面映射） ---- */
  var TOOL_MAP = {
    scientific: { title: '科学计算器', related: ['trig', 'compound', 'circle'] },
    calc: { title: '房地产计算器', related: ['limit', 'compound'] },
    limit: { title: '股票涨跌停板计算器', related: ['calc', 'compound'] },
    compound: { title: '复利计算器', related: ['calc', 'scientific'] },
    trig: { title: '三角函数计算器', related: ['scientific', 'circle'] },
    circle: { title: '圆要素转换器', related: ['trig', 'calc'] },
    retirement: { title: '退休年龄计算器', related: ['datecalc', 'calc'] },
    datecalc: { title: '日期计算器', related: ['retirement', 'countdown'] },
    photosize: { title: '证件照尺寸计算器', related: ['calc', 'imgcomp'] },
    imgcomp: { title: '图片压缩工具', related: ['photosize', 'qr'] },
    password: { title: '随机密码生成器', related: ['qr'] },
    qr: { title: '二维码生成器', related: ['password'] },
    rmb: { title: '人民币大写转换工具', related: ['convert', 'halfwidth'] },
    convert: { title: '汉字简繁转换工具', related: ['halfwidth', 'format'] },
    halfwidth: { title: '半角转全角工具', related: ['convert', 'format'] },
    markdown: { title: 'Markdown 编辑器', related: ['format', 'halfwidth'] },
    format: { title: '文字一键排版工具', related: ['halfwidth', 'convert'] },
    countdown: { title: '倒计时器', related: ['datecalc', 'retirement'] },
    keyboard: { title: '键盘按键检测工具', related: ['wakelock'] },
    wakelock: { title: '屏幕常亮工具', related: ['keyboard', 'countdown'] }
  };
  function injectRelated() {
    if (document.getElementById('ui-related')) return;
    var page = location.pathname.split('/').pop().replace(/\.html$/, '');
    var cur = TOOL_MAP[page];
    if (!cur || !cur.related || !cur.related.length) return;
    var links = cur.related.map(function (k) {
      var t = TOOL_MAP[k];
      return t ? '<a class="chip" href="' + k + '.html">' + t.title + '</a>' : '';
    }).join('');
    if (!links) return;
    var sec = document.createElement('div');
    sec.id = 'ui-related';
    sec.className = 'ui-related';
    sec.innerHTML = '<span class="ui-related-label">相关工具</span>' + links;
    document.body.insertBefore(sec, document.getElementById('ui-foot'));
  }

  /* ---- 5. 首页搜索 + 分类过滤（仅当 #tool-search 存在时绑定） ---- */
  function setupSearch() {
    var input = document.getElementById('tool-search');
    if (!input) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll('.grid .card'));
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.cat-tabs button'));
    var cat = 'all';
    var kw = '';
    var empty = document.getElementById('no-match');
    function apply() {
      var vis = 0;
      cards.forEach(function (c) {
        var okCat = cat === 'all' || c.getAttribute('data-cat') === cat;
        var okKw = !kw || (c.textContent || '').toLowerCase().indexOf(kw) !== -1;
        var show = okCat && okKw;
        c.style.display = show ? '' : 'none';
        if (show) vis++;
      });
      if (empty) empty.hidden = vis > 0;
    }
    input.addEventListener('input', function () { kw = input.value.trim().toLowerCase(); apply(); });
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        tabs.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        cat = b.getAttribute('data-cat') || 'all';
        apply();
      });
    });
  }

  /* ---- 6. 无障碍：结果区供屏幕阅读器朗读 ---- */
  function enhanceA11y() {
    document.querySelectorAll('.out, .result, .preview').forEach(function (el) {
      if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
    });
  }

  function init() {
    injectLogo();
    injectFooter();
    injectRelated();
    setupSearch();
    enhanceA11y();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
