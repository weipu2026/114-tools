(function () {
  const md = document.getElementById('md');
  const preview = document.getElementById('md-preview');
  let timer = null;

  // ===== CDN 容错：主 CDN 未加载成功时，依次尝试备用 CDN 动态加载（与 convert.js 同模式） =====
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => { s.remove(); reject(new Error('load failed: ' + url)); };
      document.head.appendChild(s);
    });
  }
  let markedPromise = null;
  function ensureMarked() {
    if (typeof marked !== 'undefined') return Promise.resolve(true);
    if (markedPromise) return markedPromise;
    markedPromise = (async () => {
      const urls = [
        'https://cdn.jsdelivr.net/npm/marked@12/marked.min.js',
        'https://unpkg.com/marked@12/marked.min.js'
      ];
      for (const u of urls) {
        try {
          await loadScript(u);
          if (typeof marked !== 'undefined') return true;
        } catch (e) { /* 尝试下一个 CDN */ }
      }
      return false;
    })();
    return markedPromise;
  }
  let dompurifyPromise = null;
  function ensureDOMPurify() {
    if (typeof DOMPurify !== 'undefined') return Promise.resolve(true);
    if (dompurifyPromise) return dompurifyPromise;
    dompurifyPromise = (async () => {
      const urls = [
        'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
        'https://unpkg.com/dompurify@3/dist/purify.min.js'
      ];
      for (const u of urls) {
        try {
          await loadScript(u);
          if (typeof DOMPurify !== 'undefined') return true;
        } catch (e) { /* 尝试下一个 CDN */ }
      }
      return false;
    })();
    return dompurifyPromise;
  }

  async function render() {
    // marked 未能加载（含备用 CDN）：给出提示而非静默失效
    if (!(await ensureMarked())) {
      preview.textContent = 'Markdown 解析库加载失败，请检查网络后刷新。';
      return;
    }
    const raw = marked.parse(md.value);
    // DOMPurify 加载失败时绝不回退到未净化的 innerHTML（否则粘贴 HTML 会执行脚本）
    if (!(await ensureDOMPurify())) {
      preview.textContent = md.value;
      return;
    }
    preview.innerHTML = DOMPurify.sanitize(raw);
  }

  md.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 200);
  });

  // ===== 工具栏 =====
  function surround(before, after) {
    const s = md.selectionStart, e = md.selectionEnd;
    const sel = md.value.slice(s, e) || '示例';
    md.setRangeText(before + sel + after, s, e, 'end');
    md.focus();
    render();
  }
  function linePrefix(prefix) {
    const s = md.selectionStart;
    const lineStart = md.value.lastIndexOf('\n', s - 1) + 1;
    md.setRangeText(prefix, lineStart, lineStart, 'end');
    md.focus();
    render();
  }
  function insertBlock(text) {
    const s = md.selectionStart;
    const needNl = s > 0 && md.value[s - 1] !== '\n' ? '\n' : '';
    md.setRangeText(needNl + text + '\n', s, md.selectionEnd, 'end');
    md.focus();
    render();
  }
  function apply(act) {
    switch (act) {
      case 'h1': linePrefix('# '); break;
      case 'h2': linePrefix('## '); break;
      case 'bold': surround('**', '**'); break;
      case 'italic': surround('*', '*'); break;
      case 'strike': surround('~~', '~~'); break;
      case 'quote': linePrefix('> '); break;
      case 'code': surround('`', '`'); break;
      case 'codeblock': insertBlock('```\n代码\n```'); break;
      case 'link': surround('[', '](https://)'); break;
      case 'ul': linePrefix('- '); break;
      case 'ol': linePrefix('1. '); break;
      case 'hr': insertBlock('---'); break;
    }
  }
  document.querySelectorAll('#md-toolbar button').forEach((b) => {
    b.addEventListener('click', () => apply(b.dataset.act));
  });
  // 键盘快捷键：Ctrl/⌘ + B / I / K
  md.addEventListener('keydown', (ev) => {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    const k = ev.key.toLowerCase();
    if (k === 'b') { ev.preventDefault(); surround('**', '**'); }
    else if (k === 'i') { ev.preventDefault(); surround('*', '*'); }
    else if (k === 'k') { ev.preventDefault(); surround('[', '](https://)'); }
  });

  render();
})();
