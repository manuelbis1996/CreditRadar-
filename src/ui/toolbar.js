import { SCRIPT_VERSION } from '../config/constants.js';
import { makeDraggable } from '../utils/dom.js';
import { saveConfig } from '../core/storage.js';

export function setButtonAnimation(status) {
  const btn = document.getElementById('clasificadorBTN');
  if (!btn) return;

  btn.classList.remove('clasificador-glow', 'clasificador-pulse', 'clasificador-success');

  if (status === 'pulse') {
    btn.classList.add('clasificador-pulse');
    btn.style.cursor = 'not-allowed';
    btn.disabled = true;
  } else if (status === 'success') {
    btn.classList.add('clasificador-success');
    setTimeout(() => {
      btn.classList.remove('clasificador-success');
      btn.classList.add('clasificador-glow');
      btn.style.cursor = 'pointer';
      btn.disabled = false;
    }, 600);
  } else if (status === 'idle') {
    btn.classList.add('clasificador-glow');
    btn.style.cursor = 'pointer';
    btn.disabled = false;
  }
}

function clampToolbar() {
  const toolbar = document.getElementById('crToolbar');
  if (!toolbar) return;
  const rect = toolbar.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = parseFloat(toolbar.style.left);
  let top = parseFloat(toolbar.style.top);
  if (isNaN(left)) left = rect.left;
  if (isNaN(top)) top = rect.top;
  left = Math.min(Math.max(left, 0), vw - rect.width);
  top = Math.min(Math.max(top, 0), vh - rect.height);
  toolbar.style.left = left + 'px';
  toolbar.style.right = 'auto';
  toolbar.style.top = top + 'px';
}

export function addButton(config, runFn, openConfigFn, showHistoryFn) {
  if (document.getElementById('crToolbar')) return;
  const toolbar = document.createElement('div');
  toolbar.id = 'crToolbar';

  const tPos = config.toolbarPos || { top: "120px", left: "calc(100vw - 80px)" };
  toolbar.style.top = tPos.top;
  if (tPos.left) toolbar.style.left = tPos.left;
  else toolbar.style.right = "20px";

  toolbar.innerHTML = `
    <div id="crToolbarGrip" title="Púlsame para arrastrar">⠿</div>
    <button id="clasificadorBTN" aria-label="Ejecutar clasificador (v${SCRIPT_VERSION})">
      📋<span class="cr-ver">v${SCRIPT_VERSION}</span>
    </button>
    <button id="crHistoryBtn" aria-label="Historial" title="Historial">🕐</button>
    <button id="crSettingsBtn" aria-label="Configuración" title="Configuración">⚙️</button>
  `;
  document.body.appendChild(toolbar);

  makeDraggable(toolbar, document.getElementById('crToolbarGrip'), (left, top) => {
    config.toolbarPos = { left, top };
    saveConfig(config);
  });

  document.getElementById('clasificadorBTN').onclick = runFn;
  document.getElementById('crHistoryBtn').onclick = showHistoryFn;
  document.getElementById('crSettingsBtn').onclick = openConfigFn;
  setButtonAnimation('idle');

  setTimeout(clampToolbar, 0);
  let _resizeTid;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTid);
    _resizeTid = setTimeout(clampToolbar, 100);
  });
}

export function showToast(message, color = "#5eead4", duration = 5000) {
  document.getElementById("clasificadorToast")?.remove();
  const toast = document.createElement("div");
  toast.id = "clasificadorToast";
  Object.assign(toast.style, {
    position: "fixed", bottom: "30px", right: "30px",
    background: "#1a1a1a", color: "#fff", padding: "14px 20px",
    borderRadius: "8px", zIndex: "999999", fontSize: "14px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    border: `1px solid ${color}`,
    transition: "opacity 0.5s ease",
    maxWidth: "320px"
  });
  toast.innerHTML = message;
  toast.setAttribute("role", "alert");
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, duration);
}

export function createProgressPanel() {
  const panel = document.createElement("div");
  panel.id = "clasificadorProgress";
  Object.assign(panel.style, {
    position: "fixed", top: "200px", right: "20px",
    background: "#111", color: "#fff", padding: "15px",
    borderRadius: "8px", zIndex: "99999", fontSize: "14px",
    minWidth: "200px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
  });
  panel.innerHTML = `<b>Procesando...</b><br><br><span id="progressText">Iniciando...</span>`;
  document.body.appendChild(panel);
}

export function updateProgress(current, total, name) {
  const el = document.getElementById("progressText");
  const escapeHtml = str => (str||"").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  if (el) el.innerHTML = `Dispute ${current} / ${total}<br><span style="color:#aaa;font-size:12px">${escapeHtml(name)}</span>`;
}

export function removeProgressPanel() {
  document.getElementById("clasificadorProgress")?.remove();
}
