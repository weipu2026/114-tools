// ===== 屏幕常亮工具：基于浏览器原生 Screen Wake Lock API（零依赖） =====
if (typeof document !== 'undefined') {
  (function () {
    const btn = document.getElementById('toggle');
    const stateEl = document.getElementById('state');
    const status = document.getElementById('status');

    let lock = null;
    let desired = false; // 用户意图：是否期望常亮（与当前实际锁状态分离）
    let busy = false;    // 请求进行中，避免快速点击重复发锁

    const supported = 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function';

    function updateUI() {
      const active = desired && !!lock;
      stateEl.textContent = active ? '屏幕当前状态：常亮中 🔆' : '屏幕当前状态：待机';
      stateEl.style.color = active ? 'var(--primary)' : '';
      btn.textContent = active ? '关闭常亮' : '开启常亮';
    }

    async function requestLock() {
      if (busy) return;
      busy = true;
      try {
        lock = await navigator.wakeLock.request('screen');
        // 监听系统主动释放（如标签页隐藏后被浏览器回收），更新锁状态
        lock.addEventListener('release', () => {
          lock = null;
          updateUI();
          if (desired) {
            status.textContent = '常亮已暂停（标签页隐藏或系统省电），回到本页后会自动恢复。';
          }
        });
        status.textContent = '已开启，屏幕将保持常亮。切换标签页后会自动恢复。';
      } catch (e) {
        lock = null;
        status.textContent = '开启失败：' + (e && e.message ? e.message : e);
      }
      busy = false;
      updateUI();
    }

    async function releaseLock() {
      desired = false;
      if (lock) {
        try { await lock.release(); } catch (_) {}
        lock = null;
      }
      status.textContent = '已关闭，屏幕将按系统设定休眠。';
      updateUI();
    }

    btn.addEventListener('click', () => {
      if (desired) { releaseLock(); return; }
      desired = true;
      updateUI();
      requestLock();
    });

    // 页面回到前台时，若用户仍期望常亮但锁已被释放，则重新申请
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && desired && !lock) {
        requestLock();
      }
    });

    if (!supported) {
      status.textContent = '当前浏览器不支持 Wake Lock API，请使用 Chrome / Edge / Safari 新版，并确保在 HTTPS 或 localhost 下访问。';
    }

    updateUI();
  })();
}
