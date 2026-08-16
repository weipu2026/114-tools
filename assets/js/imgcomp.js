// ===== 纯函数（可在 node 中直接测试） =====
function formatBytes(n) {
  if (!(n > 0)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return v >= 100 ? v.toFixed(0) + ' ' + units[i] : v.toFixed(1) + ' ' + units[i];
}
function calcScale(w, h, maxEdge) {
  const m = Math.max(w, h);
  return (maxEdge > 0 && m > maxEdge) ? maxEdge / m : 1;
}
function chooseType(srcType, want) {
  if (want && want !== 'auto') return want;
  return srcType === 'image/png' ? 'image/png' : 'image/jpeg';
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatBytes, calcScale, chooseType };
}

// ===== DOM 交互（浏览器环境） =====
if (typeof document !== 'undefined') {
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const preview = document.getElementById('preview');
  const ctrl = document.getElementById('ctrl');
  const quality = document.getElementById('quality');
  const qText = document.getElementById('qText');
  const maxEdge = document.getElementById('maxEdge');
  const formatSel = document.getElementById('format');
  const out = document.getElementById('out');
  const status = document.getElementById('status');
  const dlBtn = document.getElementById('download');

  let img = null;        // 已加载的原图
  let objectUrl = '';
  let lastFile = null;
  let lastSize = 0;
  let lastBlob = null;
  let timer = null;

  function compress() {
    if (!img) return;
    const q = parseInt(quality.value, 10) / 100;
    qText.textContent = quality.value + '%';
    const scale = calcScale(img.naturalWidth, img.naturalHeight, parseInt(maxEdge.value, 10));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const type = chooseType(lastFile && lastFile.type, formatSel.value);
    status.textContent = '压缩中...';
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) { status.textContent = '压缩失败，请重试'; return; }
      lastBlob = blob;
      const ratio = lastSize > 0 ? Math.round(100 * (1 - blob.size / lastSize)) : 0;
      out.innerHTML =
        '<div class="out-row"><span>原大小</span><span class="v">' + formatBytes(lastSize) + '</span></div>' +
        '<div class="out-row"><span>压缩后</span><span class="v">' + formatBytes(blob.size) + '　（-' + ratio + '%）</span></div>' +
        '<div class="out-row"><span>尺寸</span><span class="v">' + w + ' × ' + h + 'px</span></div>';
      dlBtn.disabled = false;
      status.textContent = '压缩完成';
    }, type, q);
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(compress, 200); }

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { status.textContent = '请选择图片文件'; return; }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    lastBlob = null;
    dlBtn.disabled = true;
    objectUrl = URL.createObjectURL(file);
    img = new Image();
    img.onload = () => {
      preview.src = objectUrl;
      preview.hidden = false;
      ctrl.hidden = false;
      lastSize = file.size;
      out.innerHTML = '';
      if (file.type === 'image/png' && chooseType(file.type, formatSel.value) === 'image/jpeg') {
        status.textContent = '注意：PNG 透明区域转成 JPEG 后将变为黑色';
      }
      schedule();
    };
    img.onerror = () => { status.textContent = '图片加载失败，请换一张试试'; };
    img.src = objectUrl;
  }

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => {
    lastFile = fileInput.files[0] || null;
    loadFile(lastFile);
  });
  ['dragover', 'dragenter'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { lastFile = f; loadFile(f); }
  });

  quality.addEventListener('input', schedule);
  maxEdge.addEventListener('change', schedule);
  formatSel.addEventListener('change', schedule);

  dlBtn.addEventListener('click', () => {
    if (!lastBlob) return;
    const ext = lastBlob.type.split('/')[1] === 'jpeg' ? 'jpg' : lastBlob.type.split('/')[1];
    const base = lastFile ? lastFile.name.replace(/\.[^.]+$/, '') : 'image';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(lastBlob);
    a.download = base + '-compressed.' + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}
