(function () {
  const src = document.getElementById('src');
  const dst = document.getElementById('dst');
  const status = document.getElementById('status');
  const converters = {};

  function getConverter(dir) {
    if (!converters[dir]) {
      const opt = dir === 's2t'
        ? { from: 'cn', to: 'tw' }   // 简体 -> 繁体（台湾标准）
        : { from: 'tw', to: 'cn' };  // 繁体 -> 简体
      converters[dir] = OpenCC.Converter(opt);
    }
    return converters[dir];
  }

  // 主 CDN 未连上时，依次尝试备用 CDN 动态加载；用模块级 Promise 去重，避免并发重复注入
  let openccPromise = null;
  function ensureOpenCC() {
    if (typeof OpenCC !== 'undefined') return Promise.resolve(true);
    if (openccPromise) return openccPromise;
    openccPromise = (async () => {
      const urls = [
        'https://cdn.jsdelivr.net/npm/opencc-js@1.4.1/dist/umd/full.js',
        'https://unpkg.com/opencc-js@1.4.1/dist/umd/full.js'
      ];
      for (const u of urls) {
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = u;
            s.onload = () => resolve();
            s.onerror = () => { s.remove(); reject(new Error('load failed: ' + u)); };
            document.head.appendChild(s);
          });
          if (typeof OpenCC !== 'undefined') return true;
        } catch (e) { /* 尝试下一个 CDN */ }
      }
      return false;
    })();
    return openccPromise;
  }

  async function run(dir) {
    if (!src.value) {
      status.textContent = '请先输入要转换的文字';
      return;
    }
    status.textContent = '加载词库中...';
    if (typeof OpenCC === 'undefined') {
      const ok = await ensureOpenCC();
      if (!ok) {
        status.textContent = '词库加载失败，请检查网络连接后刷新重试';
        return;
      }
    }
    try {
      const conv = getConverter(dir);
      const r = conv(src.value);
      dst.value = (r && typeof r.then === 'function') ? await r : r;
      status.textContent = '转换完成';
    } catch (e) {
      status.textContent = '转换失败：' + (e && e.message ? e.message : e);
    }
  }

  document.querySelectorAll('button[data-dir]').forEach((b) => {
    b.addEventListener('click', () => run(b.dataset.dir));
  });

  document.getElementById('copy').addEventListener('click', async () => {
    if (!dst.value) return;
    const ok = await window.copyText(dst.value);
    showToast(ok ? '已复制到剪贴板' : '复制失败，请手动复制');
  });

  document.getElementById('clear').addEventListener('click', () => {
    src.value = '';
    dst.value = '';
    status.textContent = '';
    src.focus();
  });
})();
