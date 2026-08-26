// 纯函数：文字排版整理。opt 为各清洗项开关；可在 node 中直接测试。
function formatText(text, opt) {
  const getOpt = (k) => !!(opt && opt[k]);
  let t = String(text == null ? '' : text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (getOpt('html')) {
    t = t.replace(/<[^>]+>/g, '');
  }
  if (getOpt('hidden')) {
    t = t.replace(/\u00A0/g, ' '); // 不间断空格(NBSP) -> 普通空格
    // 零宽/不可见字符（零宽空格、连接符、BOM、词连接符、方向控制、软连字符、窄不换行空格、各类排版空格）
    t = t.replace(/[ -‏‪-‮ ⁠-⁤­﻿]/g, '');
    t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // 其它控制字符
  }
  if (getOpt('sup')) {
    t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, ''); // 上标数字
    t = t.replace(/\[\d+\]/g, ''); // 脚注 [1]
  }
  if (getOpt('fakeblank')) {
    t = t.replace(/^[ \t]+$/gm, ''); // 仅含空白的"假空行"
  }
  if (getOpt('trim')) {
    t = t.split('\n').map((l) => l.trim()).join('\n');
  }
  if (getOpt('multispace')) {
    t = t.replace(/[ \t]{2,}/g, ' ');
  }
  if (getOpt('blank')) {
    t = t.replace(/\n{3,}/g, '\n\n'); // 连续空行压成 1 个
  }
  if (getOpt('merge')) {
    // 行尾不是句末标点的，与下一行合并（修复被折断的行）
    t = t.replace(/([^。！？!?；;：:，,、）)"'”’」』…》~\n])\n([^\n])/g, '$1$2');
  }
  if (getOpt('quan')) {
    t = t.replace(/,/g, '，')
         .replace(/;/g, '；')
         .replace(/:/g, '：')
         .replace(/\?/g, '？')
         .replace(/!/g, '！')
         .replace(/\(/g, '（')
         .replace(/\)/g, '）')
         .replace(/\./g, (dot, offset, str) => {
           // 句末句号：保留小数点/版本号（两侧都是数字）；其余后接中文/换行/结尾时转中文句号
           const prev = offset > 0 ? str[offset - 1] : '';
           const next = offset < str.length - 1 ? str[offset + 1] : '';
           if (/[0-9]/.test(prev) && /[0-9]/.test(next)) return dot; // 3.14 / 1.2.3
           if (/[一-鿿\n]/.test(next) || next === '') return '。'; // 句末句号
           return dot;
         });
  }
  if (getOpt('space')) {
    t = t.replace(/([一-鿿])([a-zA-Z0-9])/g, '$1 $2');
    t = t.replace(/([a-zA-Z0-9])([一-鿿])/g, '$1 $2');
  }
  return t;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatText };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const src = document.getElementById('src');
  const dst = document.getElementById('dst');
  const opts = document.getElementById('opts');
  const status = document.getElementById('status');

  function currentOpts() {
    const o = {};
    opts.querySelectorAll('input[data-key]').forEach((el) => {
      o[el.dataset.key] = el.checked;
    });
    return o;
  }

  function run() {
    if (!src.value) {
      status.textContent = '请先粘贴需要整理的文字';
      return;
    }
    dst.value = formatText(src.value, currentOpts());
    status.textContent = '整理完成，共 ' + dst.value.length + ' 字';
  }

  document.getElementById('run').addEventListener('click', run);

  document.getElementById('copy').addEventListener('click', async () => {
    if (!dst.value) return;
    const ok = await window.copyText(dst.value);
    showToast(ok ? '已复制到剪贴板' : '复制失败，请手动复制');
  });

  document.getElementById('clear').addEventListener('click', () => {
    src.value = '';
    dst.value = '';
    showToast('已清空');
    src.focus();
  });
}
