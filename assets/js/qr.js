// 依赖 CDN：qrcode-generator（全局 qrcode）。支持 UTF-8 中文。
if (typeof document !== 'undefined') {
  const qrWrap = document.getElementById('qr');
  const status = document.getElementById('status');
  const dlBtn = document.getElementById('download');
  const copyBtn = document.getElementById('copy');
  let lastCanvas = null;

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
  let qrcodePromise = null;
  function ensureQrcode() {
    if (typeof qrcode !== 'undefined') return Promise.resolve(true);
    if (qrcodePromise) return qrcodePromise;
    qrcodePromise = (async () => {
      const urls = [
        'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
        'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js'
      ];
      for (const u of urls) {
        try {
          await loadScript(u);
          if (typeof qrcode !== 'undefined') return true;
        } catch (e) { /* 尝试下一个 CDN */ }
      }
      return false;
    })();
    return qrcodePromise;
  }

  async function render() {
    // 两个 CDN 都未加载成功时给出明确提示
    if (!(await ensureQrcode())) {
      status.textContent = '二维码库加载失败，请检查网络后刷新重试。';
      return;
    }
    const text = document.getElementById('text').value;
    const ecl = document.getElementById('ecl').value;
    const cell = parseInt(document.getElementById('size').value, 10);

    if (!text) {
      qrWrap.innerHTML = '';
      status.textContent = '请输入要生成二维码的内容。';
      dlBtn.disabled = true;
      copyBtn.disabled = true;
      return;
    }
    try {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      const qr = qrcode(0, ecl); // type 0 = 自动选择版本
      qr.addData(text);
      qr.make();

      const count = qr.getModuleCount();
      const margin = 4;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = (count + margin * 2) * cell;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
          }
        }
      }
      qrWrap.innerHTML = '';
      canvas.style.maxWidth = '100%';
      qrWrap.appendChild(canvas);
      lastCanvas = canvas;
      dlBtn.disabled = false;
      copyBtn.disabled = false;
      status.textContent = `生成成功（${count} × ${count} 模块）。`;
    } catch (e) {
      qrWrap.innerHTML = '';
      status.textContent = '生成失败：' + e.message;
      dlBtn.disabled = true;
      copyBtn.disabled = true;
    }
  }

  const textEl = document.getElementById('text');

  document.getElementById('gen').addEventListener('click', render);
  textEl.addEventListener('input', () => { if (textEl.value) render(); });
  // 尺寸、容错级别变更即时重绘（与文本输入行为一致）
  document.getElementById('size').addEventListener('change', () => { if (textEl.value) render(); });
  document.getElementById('ecl').addEventListener('change', () => { if (textEl.value) render(); });

  dlBtn.addEventListener('click', () => {
    if (!lastCanvas) return;
    const a = document.createElement('a');
    a.href = lastCanvas.toDataURL('image/png');
    a.download = 'qrcode.png';
    a.click();
  });

  copyBtn.addEventListener('click', () => {
    if (!lastCanvas) return;
    // Firefox 等不支持 ClipboardItem 的浏览器直接提示改用下载，避免误报
    if (typeof ClipboardItem === 'undefined') {
      status.textContent = '当前浏览器不支持复制图片，请改用「下载 PNG」';
      return;
    }
    lastCanvas.toBlob(async (blob) => {
      if (!blob) { status.textContent = '生成图片失败，请改用「下载 PNG」'; return; }
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('图片已复制到剪贴板');
      } catch (e) {
        status.textContent = '复制失败，请改用「下载 PNG」';
      }
    }, 'image/png');
  });
}
