// ===== 键盘按键检测工具：纯 DOM 交互，无纯函数可测（依赖浏览器事件） =====
if (typeof document !== 'undefined') {
  (function () {
    const big = document.getElementById('big');
    const out = document.getElementById('out');
    const status = document.getElementById('status');

    // 当前按下的键（用 e.code 识别物理键，避免 Shift 组合时 key 变化）
    const pressed = new Map(); // 物理键 code -> 友好显示名
    // 最近一次按下事件的详情
    let last = null;

    // 键名美化（仅改写需要映射的键；其余直接返回原值）
    const KEY_MAP = {
      ' ': 'Space',
      Escape: 'Esc',
      Control: 'Ctrl',
      Meta: 'Win / ⌘',
      ArrowUp: '↑ Up',
      ArrowDown: '↓ Down',
      ArrowLeft: '← Left',
      ArrowRight: '→ Right',
    };
    function keyName(e) {
      return KEY_MAP[e.key] || e.key;
    }

    // 修饰键在组合中显示靠前（非修饰键排后）
    const MODIFIERS_ORDER = ['Ctrl', 'Alt', 'Shift', 'Win / ⌘'];
    function modifierRank(name) {
      const i = MODIFIERS_ORDER.indexOf(name);
      return i === -1 ? 10 : i;
    }

    // 转义，防止按键字符（如 Shift+, 得到 < > &）破坏 HTML
    function esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function row(label, val) {
      return `<div class="out-row"><span>${esc(label)}</span><span class="v">${esc(val)}</span></div>`;
    }

    function render() {
      // 大号显示：当前按住的组合键
      if (pressed.size > 0) {
        const combo = Array.from(pressed.values())
          .sort((a, b) => modifierRank(a) - modifierRank(b))
          .join(' + ');
        big.textContent = combo;
      } else {
        big.textContent = last ? '已松开 · 继续按键' : '⌨️ 点击此处后按下任意键';
      }

      // 详情信息行（基于最近一次按下）
      if (!last) {
        out.innerHTML = '';
        return;
      }
      const e = last;
      out.innerHTML =
        row('按键字符', keyName(e)) +
        row('物理键 code', e.code) +
        row('键码 keyCode', String(e.keyCode)) +
        row('修饰键', ((e.ctrlKey ? 'Ctrl ' : '') + (e.altKey ? 'Alt ' : '') + (e.shiftKey ? 'Shift ' : '') + (e.metaKey ? 'Win/⌘ ' : '')).trim() || '无') +
        row('是否按住重复', e.repeat ? '是' : '否');
    }

    function handleDown(e) {
      // Tab 放行，避免键盘用户焦点被锁死在页内
      if (e.key === 'Tab') { last = e; render(); return; }
      // 聚焦在链接/按钮等可交互元素上时放行 Enter/Space，避免键盘用户无法激活
      const tag = (e.target && e.target.tagName) || '';
      if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(tag) && (e.key === 'Enter' || e.key === ' ')) return;
      e.preventDefault(); // 拦截 F5 刷新、Ctrl+W 关页等
      if (!e.repeat) pressed.set(e.code, keyName(e)); // code 去重键、value 存显示名，避免 Shift 组合 key 变化导致卡键
      last = e;
      render();
    }

    function handleUp(e) {
      if (e.key === 'Tab') return;
      e.preventDefault();
      pressed.delete(e.code);
      render();
    }

    // 焦点离开窗口时清空，避免卡住
    window.addEventListener('blur', () => {
      pressed.clear();
      last = null;
      render();
    });

    // 点击页面任意处获得焦点后再监听按键，避免误触浏览器快捷键
    document.addEventListener('click', () => {
      if (typeof window.focus === 'function') window.focus();
    });

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);

    render();
  })();
}
