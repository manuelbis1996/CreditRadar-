export function waitForElement(selector, parent = document, timeout = 8000) {
  return new Promise(resolve => {
    try {
      const el = parent.querySelector(selector);
      if (el) return resolve(el);

      let settled = false;
      const finish = (el) => { if (!settled) { settled = true; observer.disconnect(); resolve(el); } };
      const observer = new MutationObserver(() => {
        const found = parent.querySelector(selector);
        if (found) finish(found);
      });
      observer.observe(parent, { childList: true, subtree: true });

      setTimeout(() => finish(parent.querySelector(selector)), timeout);
    } catch (e) {
      console.warn("[Clasificador] Query error:", e);
      resolve(null);
    }
  });
}

export function queryAll(selector, parent = document) {
  try {
    return [...parent.querySelectorAll(selector)];
  } catch (e) {
    console.warn(`[Clasificador] QueryAll error for ${selector}:`, e);
    return [];
  }
}

export function queryOne(selector, parent = document) {
  try {
    return parent.querySelector(selector);
  } catch (e) {
    console.warn(`[Clasificador] QueryOne error for ${selector}:`, e);
    return null;
  }
}

export function highlight(item, color) {
  item.style.border = `3px solid ${color}`;
  item.style.borderRadius = "8px";
  item.style.boxShadow = `0 0 10px ${color}66`;
}

export function clearHighlight(item) {
  item.style.border = "";
  item.style.borderRadius = "";
  item.style.boxShadow = "";
}

export function clearAllHighlights() {
  document.querySelectorAll(".dispute-outer-sample-container").forEach(clearHighlight);
}

export function makeDraggable(panel, handle, onDragEnd) {
  let ox = 0, oy = 0, mx = 0, my = 0;
  handle.addEventListener('mousedown', e => {
    if (e.target.closest('button') && e.target !== handle) return;
    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    ox = rect.left; oy = rect.top; mx = e.clientX; my = e.clientY;
    panel.style.right = 'auto';
    panel.style.left = ox + 'px';
    panel.style.top = oy + 'px';
    const move = e2 => {
      panel.style.top = (oy + e2.clientY - my) + 'px';
      panel.style.left = (ox + e2.clientX - mx) + 'px';
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (onDragEnd) onDragEnd(panel.style.left, panel.style.top);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

export function bindClose(closeFn, ...elements) {
  elements.forEach(el => { if (el) el.onclick = closeFn; });
}
