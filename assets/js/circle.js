// ===== 纯函数：圆要素转换（可在 node 中直接测试） =====
// 关系：d = 2r，C = 2πr，A = πr²
// 输入四要素之一（r/d/c/a），反推半径，再算出其余三个。

function circleSolve(known, value) {
  const v = Number(value);
  if (String(value).trim() === '' || !isFinite(v) || v < 0) return { ok: false, msg: '请输入有效的非负数值' };

  let r;
  switch (known) {
    case 'r': r = v; break;
    case 'd': r = v / 2; break;
    case 'c': r = v / (2 * Math.PI); break;
    case 'a': r = Math.sqrt(v / Math.PI); break;
    default: return { ok: false, msg: '未知输入类型' };
  }

  return {
    ok: true,
    out: {
      r,
      d: 2 * r,
      c: 2 * Math.PI * r,
      a: Math.PI * r * r,
    },
  };
}

// 数值格式化：最多 10 位有效数字，去掉多余尾零
function fmt(n) {
  if (!isFinite(n)) return '—';
  return String(parseFloat(n.toPrecision(10)));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { circleSolve, fmt };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const ids = ['r', 'd', 'c', 'a'];
  const status = document.getElementById('status');

  function render(kind) {
    const el = document.getElementById(kind);
    const res = circleSolve(kind, el.value);
    if (!res.ok) {
      if (el.value === '') return; // 清空时静默
      status.textContent = res.msg;
      return;
    }
    ids.forEach((id) => {
      if (id === kind) return;
      document.getElementById(id).value = fmt(res.out[id]);
    });
    status.textContent = '已按「' + { r: '半径', d: '直径', c: '周长', a: '面积' }[kind] + '」推算其余三项';
  }

  ids.forEach((id) => {
    document.getElementById(id).addEventListener('input', () => render(id));
  });

  document.getElementById('clear').addEventListener('click', () => {
    ids.forEach((id) => (document.getElementById(id).value = ''));
    showToast('已清空');
  });
}
