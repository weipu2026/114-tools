// ===== 纯函数：表达式求值（调度场算法 Shunting-yard） =====
const SCI_FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  log: Math.log10, ln: Math.log, sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
};
const SCI_CONSTS = { pi: Math.PI, e: Math.E };

function sciTokenize(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      let dot = 0;
      while (j < str.length && /[0-9.]/.test(str[j])) { if (str[j] === '.') dot++; j++; }
      if (dot > 1) throw new Error('无效数字');
      tokens.push({ t: 'num', v: parseFloat(str.slice(i, j)) });
      i = j; continue;
    }
    if (/[a-z]/i.test(c)) {
      let j = i;
      while (j < str.length && /[a-z]/i.test(str[j])) j++;
      const id = str.slice(i, j).toLowerCase();
      if (SCI_CONSTS[id] !== undefined) tokens.push({ t: 'const', v: SCI_CONSTS[id] });
      else if (SCI_FUNCS[id] !== undefined) tokens.push({ t: 'func', v: SCI_FUNCS[id], name: id });
      else throw new Error('未知标识符: ' + id);
      i = j; continue;
    }
    if ('+-*/^()!%'.includes(c)) {
      if (c === '(') tokens.push({ t: 'lp' });
      else if (c === ')') tokens.push({ t: 'rp' });
      else if (c === '!') tokens.push({ t: 'op', v: '!', prec: 5, assoc: 'L' });
      else if (c === '%') tokens.push({ t: 'op', v: '%', prec: 5, assoc: 'L' });
      else if (c === '^') tokens.push({ t: 'op', v: '^', prec: 4, assoc: 'R' });
      else if (c === '*' || c === '/') tokens.push({ t: 'op', v: c, prec: 3, assoc: 'L' });
      else tokens.push({ t: 'op', v: c, prec: 2, assoc: 'L' });
      i++; continue;
    }
    throw new Error('非法字符: ' + c);
  }
  return tokens;
}

function sciMarkUnary(tokens) {
  const res = [];
  for (const tk of tokens) {
    if (tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
      const prev = res[res.length - 1];
      // 后缀运算符（! %）之后的 +/- 为二元；其余（开头、左括号、函数、中缀运算符）之后为一元
      const prevIsPostfix = prev && prev.t === 'op' && (prev.v === '!' || prev.v === '%');
      const needsUnary = !prev || prev.t === 'lp' || prev.t === 'func' || (prev.t === 'op' && !prevIsPostfix);
      if (needsUnary) {
        if (tk.v === '-') res.push({ t: 'op', v: 'u-', prec: 3.5, assoc: 'R' });
        // 一元 + 直接忽略，不进栈
      } else {
        res.push(tk); // 二元 + / - 原样保留
      }
    } else {
      res.push(tk);
    }
  }
  return res;
}

function sciToRPN(tokens) {
  const out = [];
  const st = [];
  for (const tk of tokens) {
    if (tk.t === 'num' || tk.t === 'const') out.push(tk);
    else if (tk.t === 'func') st.push(tk);
    else if (tk.t === 'lp') st.push(tk);
    else if (tk.t === 'op') {
      while (st.length) {
        const top = st[st.length - 1];
        if (top.t === 'lp') break;
        if (top.t === 'func') { out.push(st.pop()); continue; }
        if (tk.v === 'u-') {
          // 一元负号（右结合）：栈顶为 ^ 时不弹出，使其作为 ^ 的右操作数（如 2^-3 = 2^(-3)）
          if (top.v === '^') break;
          if (top.prec > tk.prec) { out.push(st.pop()); continue; }
          break;
        }
        if ((top.prec > tk.prec) || (top.prec === tk.prec && top.assoc === 'L')) out.push(st.pop());
        else break;
      }
      st.push(tk);
    } else if (tk.t === 'rp') {
      while (st.length && st[st.length - 1].t !== 'lp') out.push(st.pop());
      if (!st.length) throw new Error('括号不匹配');
      st.pop();
      if (st.length && st[st.length - 1].t === 'func') out.push(st.pop());
    }
  }
  while (st.length) {
    const top = st.pop();
    if (top.t === 'lp') throw new Error('括号不匹配');
    out.push(top);
  }
  return out;
}

function sciFact(a) {
  if (a < 0) throw new Error('负数无阶乘');
  const n = Math.round(a);
  if (Math.abs(n - a) > 1e-9) throw new Error('阶乘仅支持整数');
  if (n > 170) throw new Error('数值过大');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function sciEvalRPN(rpn, mode) {
  const st = [];
  for (const tk of rpn) {
    if (tk.t === 'num' || tk.t === 'const') st.push(tk.v);
    else if (tk.t === 'func') {
      const a = st.pop();
      if (a === undefined) throw new Error('函数缺少参数');
      const nm = tk.name;
      // 角度模式下：sin/cos/tan 入参按角度→弧度；asin/acos/atan 结果按弧度→角度
      if (mode === 'deg' && (nm === 'sin' || nm === 'cos' || nm === 'tan')) st.push(tk.v(a * Math.PI / 180));
      else if (mode === 'deg' && (nm === 'asin' || nm === 'acos' || nm === 'atan')) st.push(tk.v(a) * 180 / Math.PI);
      else st.push(tk.v(a));
    } else if (tk.t === 'op') {
      if (tk.v === 'u-') { const a = st.pop(); st.push(-a); }
      else if (tk.v === '!') { const a = st.pop(); st.push(sciFact(a)); }
      else if (tk.v === '%') { const a = st.pop(); st.push(a / 100); }
      else {
        const b = st.pop(), a = st.pop();
        if (a === undefined || b === undefined) throw new Error('运算数不足');
        let r;
        switch (tk.v) {
          case '+': r = a + b; break;
          case '-': r = a - b; break;
          case '*': r = a * b; break;
          case '/': if (b === 0) throw new Error('除以零'); r = a / b; break;
          case '^': if (a === 0 && b < 0) throw new Error('零的负次幂未定义'); r = Math.pow(a, b); break;
          default: throw new Error('未知运算符');
        }
        st.push(r);
      }
    }
  }
  if (st.length !== 1) throw new Error('表达式错误');
  return st[0];
}

function sciEvaluate(expr, mode) {
  let e = String(expr || '').trim();
  const open = (e.match(/\(/g) || []).length;
  const close = (e.match(/\)/g) || []).length;
  e = e + ')'.repeat(Math.max(0, open - close));
  const toks = sciMarkUnary(sciTokenize(e));
  const rpn = sciToRPN(toks);
  return sciEvalRPN(rpn, mode === 'deg' ? 'deg' : 'rad');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sciEvaluate, sciTokenize, sciToRPN, sciEvalRPN };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const exprEl = document.getElementById('expr');
  const resEl = document.getElementById('res');
  let expr = '';
  let justEval = false;
  let angleMode = 'rad';

  function fmtNum(x) {
    if (typeof x !== 'number' || !isFinite(x)) return '';
    if (Number.isInteger(x)) return String(x);
    return parseFloat(x.toPrecision(12)).toString();
  }

  function refresh() {
    if (expr === '') {
      exprEl.textContent = '';
      resEl.textContent = '';
      return;
    }
    exprEl.textContent = expr;
    try {
      const v = sciEvaluate(expr, angleMode);
      resEl.textContent = (typeof v === 'number' && isFinite(v)) ? '= ' + fmtNum(v) : '';
    } catch (e) {
      resEl.textContent = '';
    }
  }

  function appendText(t) {
    if (justEval) { expr = ''; justEval = false; }
    expr += t;
    refresh();
  }

  function clearAll() {
    expr = '';
    justEval = false;
    refresh();
  }

  function backspace() {
    if (justEval) justEval = false;
    expr = expr.slice(0, -1);
    refresh();
  }

  const SCI_FUNC_RE = /^(sin|cos|tan|asin|acos|atan|log|ln|sqrt|abs|exp)$/;

  function clearEntry() {
    if (justEval) { expr = ''; justEval = false; refresh(); return; }
    expr = expr.replace(/\s+$/, '');
    // 删除末尾一个"条目"：括号块（含嵌套）连同前导函数名、数字、运算符
    let i = expr.length - 1;
    if (expr[i] === ')') {
      // 从末尾回溯匹配平衡括号
      let depth = 0, j = i;
      for (; j >= 0; j--) {
        if (expr[j] === ')') depth++;
        else if (expr[j] === '(' && --depth === 0) break;
      }
      if (j >= 0) {
        // 吸收括号块前的函数名（如 sin(cos(30)) 整个删除）
        let k = j - 1;
        while (k >= 0 && /[a-z]/i.test(expr[k])) k--;
        const fn = expr.slice(k + 1, j).toLowerCase();
        expr = SCI_FUNC_RE.test(fn) ? expr.slice(0, k + 1) : expr.slice(0, j);
        refresh();
        return;
      }
    }
    expr = expr.replace(/[0-9.]+$/, '');
    expr = expr.replace(/[+\-*/^!%]$/, '');
    refresh();
  }

  function flip() {
    if (justEval) justEval = false;
    const m = expr.match(/-?(\d+\.?\d*|\.\d+)$/);
    if (m) {
      const num = m[0];
      const f = num.startsWith('-') ? num.slice(1) : '-' + num;
      expr = expr.slice(0, expr.length - num.length) + f;
    } else {
      expr += '-';
    }
    refresh();
  }

  function calc() {
    if (expr === '') return;
    try {
      const v = sciEvaluate(expr, angleMode);
      if (typeof v !== 'number' || !isFinite(v)) throw new Error('无效结果');
      resEl.textContent = '= ' + fmtNum(v);
      justEval = true;
    } catch (e) {
      resEl.textContent = '错误';
    }
  }

  // 角度 / 弧度 模式切换
  document.querySelectorAll('.calc-modes button').forEach((b) => {
    b.addEventListener('click', () => {
      angleMode = b.dataset.mode;
      document.querySelectorAll('.calc-modes button').forEach((x) => x.classList.toggle('on', x === b));
      refresh();
    });
  });

  document.querySelectorAll('.calc-grid button').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.dataset.k;
      if (k === 'C') return clearAll();
      if (k === 'CE') return clearEntry();
      if (k === 'back') return backspace();
      if (k === '±') return flip();
      if (k === '=') return calc();
      appendText(k);
    });
  });

  refresh();
}
