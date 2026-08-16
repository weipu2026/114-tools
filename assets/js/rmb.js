// 纯函数：数字金额 -> 中文大写。无 DOM 依赖，可在 node 中测试。
function rmbToChinese(input) {
  let str = String(input == null ? '' : input).trim();
  if (str === '') return { ok: true, text: '' };
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return { ok: false, msg: '请输入有效的数字金额（最多两位小数，且为非负数）' };
  }
  // 整数部分最多 16 位（单位表到「兆」，超出报错而非输出 undefined）
  if (str.split('.')[0].length > 16) {
    return { ok: false, msg: '金额过大，超出可转换范围（最大 9999 兆）' };
  }
  // 去掉前导零，避免 "007" → "零柒元"
  str = str.replace(/^0+(?=\d)/, '');

  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = ['', '拾', '佰', '仟'];
  const groupUnit = ['', '万', '亿', '兆'];

  let [intStr, decStr = ''] = str.split('.');

  // 整数部分
  const intText = intToChinese(intStr, digit, unit, groupUnit);
  let text = intText + '元';

  // 小数部分
  if (decStr === '') {
    text += '整';
  } else {
    const jiao = +decStr[0];
    const fen = decStr.length > 1 ? +decStr[1] : 0;
    let decText = '';
    if (jiao > 0) decText += digit[jiao] + '角';
    if (fen > 0) decText += digit[fen] + '分';
    if (jiao === 0 && fen > 0) decText = '零' + decText; // 0.05 -> 零伍分
    if (decText === '') decText = '整';
    text += decText;
  }
  return { ok: true, text };
}

function intToChinese(intStr, digit, unit, groupUnit) {
  if (intStr === '0') return '零';
  // 从右往左按 4 位分组
  const parts = [];
  let s = intStr;
  while (s.length) {
    parts.unshift(s.slice(-4));
    s = s.slice(0, -4);
  }
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const level = parts.length - 1 - i;
    let partStr = '';
    let innerZero = false;
    for (let j = 0; j < part.length; j++) {
      const n = +part[j];
      const pos = part.length - 1 - j;
      if (n === 0) {
        innerZero = true;
      } else {
        if (innerZero) partStr += '零';
        partStr += digit[n] + unit[pos];
        innerZero = false;
      }
    }
    if (partStr !== '') {
      // 该组高位为 0（如 0001）且前面已有内容，补一个零
      if (+part < 1000 && result !== '') result += '零';
      result += partStr + groupUnit[level];
    }
  }
  result = result.replace(/零+/g, '零').replace(/零$/, '');
  return result || '零';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rmbToChinese };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const amount = document.getElementById('amount');
  const output = document.getElementById('output');
  const clearBtn = document.getElementById('clear');

  function update() {
    const res = rmbToChinese(amount.value);
    if (!res.ok) {
      output.textContent = res.msg;
      output.style.color = '#a32d2d';
    } else {
      output.textContent = res.text || '结果将显示在这里';
      output.style.color = '';
    }
  }

  amount.addEventListener('input', update);
  clearBtn.addEventListener('click', () => {
    amount.value = '';
    update();
    amount.focus();
  });
  update();
}
