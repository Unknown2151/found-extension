// src/utils/hotkeys.js
import hotkeys from 'hotkeys-js';

export function initHotkeys(map = {}) {
  // map: { 'ctrl+n': () => ..., 'ctrl+f': () => ... }
  hotkeys.filter = (e) => {
    const target = /** @type {any} */ (e.target) || {};
    const tag = target.tagName ?? '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) return true;
      return false;
    }
    return true;
  };

  Object.entries(map).forEach(([k, fn]) => {
    hotkeys(k, (e) => {
      e.preventDefault();
      try {
        fn(e);
      } catch (err) {
        console.error('hotkey handler failed', err);
      }
    });
  });
}

export function destroyHotkeys() {
  hotkeys.unbind();
}
