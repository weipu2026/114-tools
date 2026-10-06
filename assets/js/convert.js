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

  // ===== 词库按「方向」懒加载 =====
  // 完整版 full.js 有 545.8KB（gzip），而本工具只有「简→繁」和「繁→简」两个方向。
  // opencc-js 官方提供了按方向拆分的包，首屏 0 字节、点哪个方向下哪个包：
  //   繁→简 t2cn.js  50.5KB（比 full.js 省 91%）
  //   简→繁 cn2t.js 508.8KB（省 7%，因为中文→繁体词典本身就大）
  // 两个方向都用时合计 559.3KB，与 full.js 基本持平，但首屏不再付这笔钱。
  //
  // 两个分包都会注册全局 OpenCC（后加载的覆盖先加载的），因此：
  //   · 每个方向的转换器在建好后即被 converters 缓存，内部持有自己的字典，
  //     实测在全局被覆盖后仍可反复正常使用；
  //   · 但仍要按方向分别记录 Promise，避免重复下载。
  const BUNDLES = {
    s2t: { file: 'cn2t.js', label: '简转繁' },
    t2s: { file: 't2cn.js', label: '繁转简' },
  };
  const CDN_HOSTS = ['https://cdn.jsdelivr.net/npm', 'https://unpkg.com'];
  const VERSION = 'opencc-js@1.4.1/dist/umd/';
  const loadedBundles = {};
  const loadingPromises = {};

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => { s.remove(); reject(new Error('load failed: ' + url)); };
      document.head.appendChild(s);
    });
  }

  function ensureBundle(dir) {
    if (loadedBundles[dir]) return Promise.resolve(true);
    if (loadingPromises[dir]) return loadingPromises[dir];
    loadingPromises[dir] = (async () => {
      for (const host of CDN_HOSTS) {
        try {
          await loadScript(host + '/' + VERSION + BUNDLES[dir].file);
          if (typeof OpenCC !== 'undefined') {
            loadedBundles[dir] = true;
            return true;
          }
        } catch (e) { /* 换下一个 CDN */ }
      }
      return false;
    })();
    return loadingPromises[dir];
  }

  async function run(dir) {
    if (!src.value) {
      status.textContent = '请先输入要转换的文字';
      return;
    }
    if (!loadedBundles[dir]) status.textContent = '加载词库中（' + BUNDLES[dir].label + '，仅首次需要）...';
    if (!(await ensureBundle(dir))) {
      status.textContent = '词库加载失败，请检查网络连接后刷新重试';
      return;
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
