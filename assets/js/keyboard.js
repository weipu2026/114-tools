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

    // 是否拦截浏览器快捷键（会 preventDefault）。
    // 默认放行：只记录、不拦截，浏览器的 Ctrl+C/V/A/F/P、Alt+← 等照常可用。
    // 需要测试「按下会不会触发刷新/关页」时才勾选，此时行为与旧版一致。
    let interceptShortcuts = false;

    // 勾选「拦截」后也不拦这些键 —— 否则用户会被困在页里出不来：
//   Esc      退出输入框 / 关闭对话框
//   Tab      键盘用户的焦点移动（无障碍必需）
//   纯字符   页面上任何输入框都要能打字
//   Shift/Ctrl/Alt/Meta  单独按下（组合键的中间态，拦了会导致组合键记录不全）
const NEVER_INTERCEPT = /^(Escape|Tab|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Meta(Left|Right))$/;
    // 会被拦截的键：带修饰键的组合，或 F1–F12 这类功能键
    const INTERCEPTABLE_FN = /^F([1-9]|1[0-2])$/;

    // 返回「本次是否应当拦截」
    function shouldIntercept(e) {
      if (!interceptShortcuts) return false;
      if (NEVER_INTERCEPT.test(e.key)) return false;
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      return hasModifier || INTERCEPTABLE_FN.test(e.key);
    }

    function handleDown(e) {
      // Tab 放行，避免键盘用户焦点被锁死在页内
      if (e.key === 'Tab') { last = e; render(); return; }
      // 聚焦在链接/按钮等可交互元素上时放行 Enter/Space，避免键盘用户无法激活
      const tag = (e.target && e.target.tagName) || '';
      if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(tag) && (e.key === 'Enter' || e.key === ' ')) return;

      // 决定是否拦截。注意：放行不等于不记录 —— 下面无论拦不拦都会更新显示，
      // 这是这个工具的核心功能，不能因为「让用户能用快捷键」而丢掉。
      if (shouldIntercept(e)) e.preventDefault();

      if (!e.repeat) pressed.set(e.code, keyName(e)); // code 去重键、value 存显示名，避免 Shift 组合 key 变化导致卡键
      last = e;
      render();
    }

    function handleUp(e) {
      if (e.key === 'Tab') return;
      // keyup 侧与 keydown 用同一个判据，否则会出现「按下拦了、松开没拦」
      if (shouldIntercept(e)) e.preventDefault();
      pressed.delete(e.code);
      render();
    }

    // 拦截开关
    const interceptBox = document.getElementById('intercept');
    if (interceptBox) {
      interceptShortcuts = interceptBox.checked;
      interceptBox.addEventListener('change', () => {
        interceptShortcuts = interceptBox.checked;
        status.textContent = interceptShortcuts
          ? '已开启拦截：F5、Ctrl+R、Alt+← 等浏览器快捷键在本页失效（Esc 仍可用于退出输入框）'
          : '已放行浏览器快捷键：本页只记录按键，不阻止 Ctrl+C / Ctrl+V / Alt+← 等操作';
      });
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
