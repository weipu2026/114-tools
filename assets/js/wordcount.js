// ===== 纯函数：字数统计（可在 node 中直接测试） =====

// 统计一段文本的各项指标
// 返回 { hanzi, words, punct, digit, letter, chars, noSpace, lines }
function countText(text) {
  const s = String(text == null ? '' : text);

  // 汉字：CJK 统一表意文字 + 扩展A + 兼容汉字
  const hanzi = (s.match(/[㐀-䶿一-鿿豈-﫿]/g) || []).length;

  // 英文单词数：连续字母/数字算 1 个词（如 hello、2026、abc123）
  const words = (s.match(/[A-Za-z0-9]+/g) || []).length;

  // 标点：中英文常见标点符号
  const punct = (s.match(/[，。！？；：、“”‘’（）《》〈〉【】〔〕…—·～,.!?;:'"()\[\]{}<>\/\\@#$%^&*_+=|~`-]/g) || []).length;

  // 数字：0-9
  const digit = (s.match(/[0-9]/g) || []).length;

  // 字母：a-z A-Z
  const letter = (s.match(/[A-Za-z]/g) || []).length;

  // 总字符数（含空格、换行、一切字符）
  const chars = s.length;

  // 不含空白的字符数
  const noSpace = s.replace(/\s/g, '').length;

  // 行数
  const lines = s === '' ? 0 : s.split('\n').length;

  return { hanzi, words, punct, digit, letter, chars, noSpace, lines };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { countText };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const textEl = document.getElementById('text');
  const out = document.getElementById('out');
  const status = document.getElementById('status');
  let timer = null;

  function render() {
    const r = countText(textEl.value);
    const items = [
      ['总字数', r.hanzi + r.words],
      ['汉字', r.hanzi],
      ['英文单词', r.words],
      ['标点', r.punct],
      ['数字', r.digit],
      ['字母', r.letter],
      ['字符（含空格）', r.chars],
      ['字符（不含空格）', r.noSpace],
      ['行数', r.lines],
    ];
    out.innerHTML = items.map(([label, val]) =>
      `<span class="stat-item">${label}<b>${val}</b></span>`
    ).join('');
    status.textContent = '共 ' + r.chars + ' 个字符 · ' + (r.hanzi + r.words) + ' 字 · ' + r.lines + ' 行';
  }

  // 输入防抖，避免大文本卡顿
  textEl.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 120);
  });

  document.getElementById('clear').addEventListener('click', () => {
    textEl.value = '';
    render();
    textEl.focus();
    showToast('已清空');
  });

  render();
}
