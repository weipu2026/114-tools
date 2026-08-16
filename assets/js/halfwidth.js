// ===== 纯函数：半角转全角工具 / 文本整理（可在 node 中直接测试） =====
// 处理顺序固定为：英文标点转中文 → 去多余空格 → 去引用角标
// 以便标点转换产生的空格能一并被后续的「去空格」规则清理。
// 代码块、行内代码、URL 全程用占位符保护，还原时保持原样。

// 是否中文字符（含全角标点：，。！？：；（）等）
function isCJK(ch) {
  if (!ch) return false;
  const c = ch.codePointAt(0);
  return (c >= 0x3000 && c <= 0x303f) ||   // CJK 符号与标点 、。『』等
         (c >= 0x3400 && c <= 0x4dbf) ||   // 汉字扩展 A
         (c >= 0x4e00 && c <= 0x9fff) ||   // 常用汉字
         (c >= 0xf900 && c <= 0xfaff) ||   // 兼容汉字
         (c >= 0xff00 && c <= 0xffef) ||   // 全角标点/全角字母数字 ，。！？：；（）“”
         (c >= 0x2018 && c <= 0x201f);     // 中文引号 “”‘’
}

// ===== 保护 Markdown 代码块 / 行内代码 =====
function protectCode(text) {
  const list = [];
  let t = String(text == null ? '' : text);
  t = t.replace(/```[\s\S]*?```/g, (m) => { list.push(m); return '' + (list.length - 1) + ''; });
  t = t.replace(/`[^`\n]+`/g, (m) => { list.push(m); return '' + (list.length - 1) + ''; });
  return { text: t, list };
}
function restoreCode(text, list) {
  return text.replace(/(\d+)/g, (m, i) => list[+i]);
}

// ===== 功能一：去除多余空格 =====
function removeExtraSpaces(text) {
  const prot = protectCode(text);
  let t = prot.text;
  // 行首行尾空格
  t = t.replace(/^[ \t]+|[ \t]+$/gm, '');
  // 中文与中文 / 中文与英文 / 中文与数字 之间的空格删除；
  // 英文单词之间、英文与数字之间保留单个空格（连续空格压成 1 个）。
  t = t.replace(/[ \t]+/g, (sp, offset, str) => {
    const prev = offset > 0 ? str[offset - 1] : '';
    const next = offset + sp.length < str.length ? str[offset + sp.length] : '';
    const prevIsCJK = isCJK(prev);
    const nextIsCJK = isCJK(next);
    return (!prevIsCJK && !nextIsCJK) ? ' ' : '';
  });
  return restoreCode(t, prot.list);
}

// ===== 功能二：英文标点转中文标点 =====
function toFullWidthPunct(text) {
  const prot = protectCode(text);
  let t = prot.text;

    // 保护 URL，避免其内部标点（: / ? & . 等）被转换；尾随 ASCII 标点剥离出来参与转换
  const urls = [];
  t = t.replace(/https?:\/\/[^\s\x00-\x1f'"<>，。！？；：、]+/g, (m) => {
    const core = m.replace(/[^a-zA-Z0-9/]+$/, ''); // 去掉尾随标点（如 , ; ) ），使其参与标点转换
    urls.push(core);
    return '\x02' + (urls.length - 1) + '\x02' + m.slice(core.length);
  });
  // 省略号 ... → ……
  t = t.replace(/\.{3,}/g, '……');

  // 成对括号：左括号前是字母/数字/数学运算符时视为公式/函数，整对保留
  t = (function convertParens(str) {
    const keep = new Array(str.length).fill(false);
    const stack = [];
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '(') stack.push(i);
      else if (str[i] === ')') {
        if (stack.length) {
          const open = stack.pop();
          const prevCh = open > 0 ? str[open - 1] : '';
          if (/[0-9a-zA-Z×*÷/^+=<>\-]/.test(prevCh)) { keep[open] = true; keep[i] = true; }
        }
      }
    }
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      out += c === '(' ? (keep[i] ? '(' : '（')
           : c === ')' ? (keep[i] ? ')' : '）')
           : c;
    }
    return out;
  })(t);

  // 其余单个标点
  t = t
    .replace(/,/g, '，')
    .replace(/;/g, '；')
    .replace(/:/g, '：')
    .replace(/!/g, '！')
    .replace(/\?/g, '？')
    // 句号：数字两侧或「数字后接空格/行尾」视为小数/序号，保留；其余转中文句号
    .replace(/\./g, (d, offset, str) => {
      const prev = offset > 0 ? str[offset - 1] : '';
      const next = offset + 1 < str.length ? str[offset + 1] : '';
      const prevDigit = /[0-9]/.test(prev);
      const nextDigit = /[0-9]/.test(next);
      const nextSpace = next === '' || /\s/.test(next);
      return (prevDigit && (nextDigit || nextSpace)) ? '.' : '。';
    });

  // 双引号：成对替换为 中文引号 “”
  {
    let open = false;
    t = t.replace(/"/g, () => { open = !open; return open ? '“' : '”'; });
  }

  t = t.replace(/(\d+)/g, (m, i) => urls[+i]);
  return restoreCode(t, prot.list);
}

// ===== 功能三：去除引用角标 =====
function removeRefMarks(text) {
  const prot = protectCode(text);
  let t = prot.text;
  // 先删上标角标 ^[1] / ^[注]，避免被 [1] 规则拆解成残留 ^
  t = t.replace(/\^\[[^\]]*\]/g, '');
  // 数字角标 [1] / [2,3] / [4-6]（支持中文逗号、全半角连字符）
  t = t.replace(/\[\s*\d+(?:\s*[,，]\s*\d+|\s*[-–—]\s*\d+)*\s*\]/g, '');
  // 圆圈数字 ①-⑳(U+2460-73) ㉑-㉟(U+3251-5F) ㊱-㊿(U+32B1-BF)
  // 注意不能写成 [①-㉟]，中间隔着大量无关符号（会把中文句号误删）
  t = t.replace(/[①-⑳㉑-㉟㊱-㊿]/g, '');
  return restoreCode(t, prot.list);
}

// ===== 主入口 =====
function halfWidth(text, opt) {
  const get = (k) => !!(opt && opt[k]);
  let t = String(text == null ? '' : text);
  if (get('punct')) t = toFullWidthPunct(t);
  if (get('space')) t = removeExtraSpaces(t);
  if (get('ref')) t = removeRefMarks(t);
  return t;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isCJK, removeExtraSpaces, toFullWidthPunct, removeRefMarks, halfWidth };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const src = document.getElementById('src');
  const dst = document.getElementById('dst');
  const opts = document.getElementById('opts');
  const status = document.getElementById('status');

  function currentOpts() {
    const o = {};
    opts.querySelectorAll('input[data-key]').forEach((el) => (o[el.dataset.key] = el.checked));
    return o;
  }

  function run() {
    if (!src.value) {
      status.textContent = '请先粘贴需要整理的文本';
      return;
    }
    dst.value = halfWidth(src.value, currentOpts());
    status.textContent = '整理完成，共 ' + dst.value.length + ' 字';
  }

  document.getElementById('run').addEventListener('click', run);
  document.getElementById('clear').addEventListener('click', () => {
    src.value = '';
    dst.value = '';
    showToast('已清空');
    src.focus();
  });
  document.getElementById('copy').addEventListener('click', async () => {
    if (!dst.value) return;
    const ok = await window.copyText(dst.value);
    showToast(ok ? '已复制' : '复制失败，请手动复制');
  });
}
