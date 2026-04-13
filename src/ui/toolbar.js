import { SCRIPT_VERSION } from '../config/constants.js';
import { waitForElement } from '../utils/dom.js';

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

export async function addButton(config, runFn, openConfigFn, showHistoryFn) {
  if (document.getElementById('crToolbar')) return;

  const container = await waitForElement('#CommunicationSideBarContainer');
  if (!container) {
    console.warn('[Clasificador] No se encontró #CommunicationSideBarContainer');
    return;
  }

  const toolbar = document.createElement('div');
  toolbar.id = 'crToolbar';
  toolbar.innerHTML = `
    <button id="clasificadorBTN" aria-label="Ejecutar clasificador (v${SCRIPT_VERSION})">
      📋<span class="cr-ver">v${SCRIPT_VERSION}</span>
    </button>
    <button id="crCFBtn" aria-label="CreditFlow CRM" title="Abrir CreditFlow">
      🔗<span class="cr-ver" style="color:#34d399">CreditFlow</span>
    </button>
    <div class="cr-tb-extras">
      <button id="crHistoryBtn" aria-label="Historial" title="Historial">🕐</button>
      <button id="crSettingsBtn" aria-label="Configuración" title="Configuración">⚙️</button>
    </div>
  `;
  container.prepend(toolbar);

  document.getElementById('clasificadorBTN').onclick = runFn;
  document.getElementById('crHistoryBtn').onclick = showHistoryFn;
  document.getElementById('crCFBtn').onclick = () => window.open('https://manuelbis1996.github.io/CreditRadar-/creditflow.html', '_blank');
  document.getElementById('crSettingsBtn').onclick = openConfigFn;
  setButtonAnimation('idle');
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
    background: "#111", color: "#fff", padding: "15px 18px",
    borderRadius: "10px", zIndex: "99999", fontSize: "14px",
    minWidth: "220px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    border: "1px solid #2a2a2a"
  });
  panel.innerHTML = `
    <div id="progressLabel" style="font-size:11px;color:#5eead4;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Iniciando...</div>
    <div id="progressCount" style="font-size:18px;font-weight:bold;margin-bottom:4px">—</div>
    <div id="progressName" style="color:#aaa;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px"></div>
  `;
  document.body.appendChild(panel);
}

export function updateProgress(current, total, name, label = "Procesando") {
  const escapeHtml = str => (str||"").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lEl = document.getElementById("progressLabel");
  const cEl = document.getElementById("progressCount");
  const nEl = document.getElementById("progressName");
  if (lEl) lEl.textContent = label;
  if (cEl) cEl.textContent = total === "?" ? "Cargando..." : `${current} de ${total}`;
  if (nEl) nEl.innerHTML = escapeHtml(name);
}

export function removeProgressPanel() {
  document.getElementById("clasificadorProgress")?.remove();
}
