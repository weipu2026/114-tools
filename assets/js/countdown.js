if (typeof document !== 'undefined') {
  const h = document.getElementById('h');
  const m = document.getElementById('m');
  const s = document.getElementById('s');
  const disp = document.getElementById('disp');
  const status = document.getElementById('status');

  let remaining = 0;   // 剩余秒数（用于显示与暂停时的快照）
  let endTime = 0;     // 目标结束时间戳（毫秒）
  let timer = null;

  function pad(x) { return String(x).padStart(2, '0'); }
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    return pad(hh) + ':' + pad(mm) + ':' + pad(ss);
  }
  function setDisp() { disp.textContent = fmt(remaining); }

  function inputSeconds() {
    const H = Math.max(0, parseInt(h.value || '0', 10) || 0);
    const M = Math.max(0, parseInt(m.value || '0', 10) || 0);
    const S = Math.max(0, parseInt(s.value || '0', 10) || 0);
    return H * 3600 + M * 60 + S;
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // 基于结束时间戳计算剩余秒数，避免浏览器节流导致的计时漂移
  function tick() {
    const diff = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    if (diff !== remaining) { remaining = diff; setDisp(); }
    if (diff <= 0) {
      stop();
      status.textContent = '⏰ 时间到！';
      disp.classList.add('done');
    }
  }

  function start() {
    if (timer) return;
    if (remaining <= 0) remaining = inputSeconds();
    if (remaining <= 0) {
      status.textContent = '请先设置倒计时长';
      return;
    }
    disp.classList.remove('done');
    endTime = Date.now() + remaining * 1000;
    status.textContent = '倒计时进行中…';
    setDisp();
    timer = setInterval(tick, 200);
  }

  function pause() {
    if (timer) {
      remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      stop();
      setDisp();
      status.textContent = '已暂停';
    }
  }

  function reset() {
    stop();
    remaining = inputSeconds();
    disp.classList.remove('done');
    setDisp();
    status.textContent = '已重置';
  }

  document.getElementById('start').addEventListener('click', start);
  document.getElementById('pause').addEventListener('click', pause);
  document.getElementById('reset').addEventListener('click', reset);

  // 预设按钮
  document.querySelectorAll('.cd-presets .chip').forEach((b) => {
    b.addEventListener('click', () => {
      stop();
      h.value = '0';
      m.value = b.dataset.min;
      s.value = '0';
      remaining = inputSeconds();
      disp.classList.remove('done');
      setDisp();
      status.textContent = '已设为 ' + b.dataset.min + ' 分钟';
    });
  });

  // 未运行时，修改输入即时预览
  [h, m, s].forEach((el) => {
    el.addEventListener('input', () => {
      if (!timer) {
        remaining = inputSeconds();
        disp.classList.remove('done'); // 解除结束后的红色闪烁
        setDisp();
        status.textContent = '就绪';
      }
    });
  });

  setDisp();
}
