// 纯函数：去除 Markdown 标记（去标记、留正文）。opt 用来判断是否需要保护块级边界。
// 约定：链接只留锚文本 · 图片整段删除 · 代码块去围栏留代码 ·
//      列表/引用/表格行统一用「· 」打头（有序列表保留序号为「N、」、任务列表转 ☑/☐）·
//      标题去掉 # 后单独成行（若同时开着「合并被折断的行」，补一个空行把它隔开）
// 为什么块级行都要带「· 」：formatText 里「合并被折断的行」会把上一行结尾不是句末标点的行
// 和下一行粘起来。给块级行一个统一的行首符号，merge 就能认出并跳过，列表/表格才不会被压成一段。
function stripTables(text) {
  // GFM 表格：| 表头 | + |---|---| + | 数据 | → 去竖线，单元格之间用空格连接
  const lines = String(text).split('\n');
  const isRow = (s) => /^[ \t]*\|.*\|[ \t]*$/.test(s);
  const isSep = (s) => /^[ \t]*\|[ \t]*-[ \t:|-]*\|[ \t]*$/.test(s);
  const cells = (s) => '· ' + s.replace(/^[ \t]*\|/, '').replace(/\|[ \t]*$/, '')
    .split('|').map((c) => c.trim()).filter((c) => c !== '').join(' ');
  const out = [];
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    // 必须有「表头 + |---|---| 分隔行」才算表格，避免把 |x| 这类竖线文本误判
    if (!inTable && isRow(ln) && isSep(lines[i + 1] || '')) {
      out.push(cells(ln));
      inTable = true;
      i++; // 跳过分隔行
      continue;
    }
    if (inTable && isRow(ln)) { out.push(cells(ln)); continue; }
    inTable = false;
    out.push(ln);
  }
  return out.join('\n');
}

function stripMarkdown(text, opt) {
  const guard = !!(opt && opt.merge); // 开着「合并被折断的行」时，标题必须与下一行隔离
  let t = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1) 先把转义字符摘出来保护（\* \_ \[ 等），否则会被后面的强调/链接规则误吃
  const esc = [];
  t = t.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, (m, ch) => {
    esc.push(ch);
    return '\x01' + (esc.length - 1) + '\x01';
  });

  // 2) 围栏代码块：只删上下 ``` 行（含语言标识），代码正文保留
  t = t.replace(/^[ \t]*`{3,}[^\n]*\n([\s\S]*?)\n[ \t]*`{3,}[ \t]*$/gm, '$1');
  t = t.replace(/^[ \t]*`{3,}[^\n]*$/gm, ''); // 未闭合的围栏只删围栏行
  // 3) 行内代码 `code` → code
  t = t.replace(/`([^`\n]+)`/g, '$1');

  // 4) 表格
  t = stripTables(t);

  // 5) 分隔线整行删除（必须在列表规则之前，否则 "- - -" 会被当成列表项）
  t = t.replace(/^[ \t]{0,3}(?:[-*_][ \t]*){3,}$/gm, '');

  // 6) 标题：两个以上 # 即使不跟空格也认（AI 输出常见「##标题」）；单个 # 必须跟空格，
  //    这样「#1 问题」「#话题#」不会被误伤
  t = t.replace(/^[ \t]{0,3}(?:#{2,6}(?!#)[ \t]*|#[ \t]+)(.*?)[ \t]*$/gm, (m, title, offset, str) => {
    const after = str.slice(offset + m.length);
    if (!guard || after === '' || /^\n[ \t]*\n/.test(after)) return title;
    return title + '\n'; // 补一个空行，免得被「合并被折断的行」粘到正文上
  });

  // 7) 图片 ![说明](图址) → 整段删除（必须在链接之前，否则会留下一个孤立的 !）
  t = t.replace(/!\[[^\]]*\]\([^)\n]*\)/g, '');
  // 8) 链接 [文字](网址) → 只留文字
  t = t.replace(/\[([^\]]*)\]\([^)\n]*\)/g, '$1');
  // 9) 引用式链接定义行 [ref]: 网址 → 整行删除；引用式链接 [文字][ref] → 文字
  t = t.replace(/^[ \t]*\[[^\]]+\]:[ \t]*\S.*$/gm, '');
  t = t.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1');
  // 10) 自动链接 <https://x> → https://x
  t = t.replace(/<(?:https?|mailto):[^>\n]+>/g, (m) => m.slice(1, -1));

  // 11) 块级前缀：任务列表 → ☑/☐；有序列表 → 保留序号「N、」；无序列表 / 引用 → 「· 」
  t = t.replace(/^[ \t]{0,3}(?:[-*+][ \t]+)?\[([ xX])\][ \t]+/gm, (m, mark) => (mark === ' ' ? '☐ ' : '☑ '));
  t = t.replace(/^[ \t]{0,3}(\d{1,9})[.)][ \t]+/gm, '$1、');
  t = t.replace(/^[ \t]{0,3}[-*+][ \t]+/gm, '· ');
  t = t.replace(/^[ \t]{0,3}(?:>[ \t]?)+/gm, '· ');

  // 12) 强调：先长后短（** → ~~ → * → _）
  t = t.replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g, '$1');
  t = t.replace(/~~(\S(?:[\s\S]*?\S)?)~~/g, '$1');
  // 单个 * ：两侧不能紧挨字母/数字，否则 2*3*4 会被当成斜体
  t = t.replace(/(^|[^0-9A-Za-z])\*(\S(?:[^*\n]*?\S)?)\*(?![0-9A-Za-z])/g, '$1$2');
  // 单个 _ ：两侧还不能紧挨汉字，否则 文件名_with_下划线 这类标识符会被误吃。
  //（__粗体__ 故意不处理：__init__ / __name__ 更常见，误伤代价比漏处理更大）
  t = t.replace(/(^|[^0-9A-Za-z_\u4e00-\u9fff])_([^_\n]+)_(?![0-9A-Za-z_\u4e00-\u9fff])/g, '$1$2');

  // 13) 还原转义字符
  t = t.replace(/\x01(\d+)\x01/g, (m, i) => esc[+i]);

  return t;
}

// 纯函数：文字排版整理。opt 为各清洗项开关；可在 node 中直接测试。
function formatText(text, opt) {
  const getOpt = (k) => !!(opt && opt[k]);
  let t = String(text == null ? '' : text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // 去 Markdown 标记必须放在最前面：后面的「合并被折断的行」会把标题粘到正文上，
  // 「半角→全角」会把链接里的括号变成全角，再去标记就不好认了
  if (getOpt('md')) {
    t = stripMarkdown(t, opt);
  }
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
    // 例外：下一行是 Markdown 块级行时不合并 —— 「· 」「☑ 」「☐ 」开头，或「1、」这类有序列表序号。
    // 否则列表项 / 表格行会被粘成「1、步骤一2、步骤二」这样的一段
    t = t.replace(/([^。！？!?；;：:，,、）)"'”’」』…》~\n])\n(?!\d{1,9}、)([^\n·☑☐])/g, '$1$2');
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
           // 句号后是空白、且空白之后是中文或行尾时，同样算句末（如「结束. 下一句」）
           if (next !== '' && /\s/.test(next)) {
             let k = offset + 1;
             while (k < str.length && /\s/.test(str[k])) k++;
             if (k >= str.length || /[一-鿿]/.test(str[k])) return '。';
           }
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
  module.exports = { formatText, stripMarkdown, stripTables };
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
