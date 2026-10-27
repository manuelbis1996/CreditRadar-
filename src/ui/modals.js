import { SCRIPT_VERSION, VERSION_NOTES } from '../config/constants.js';
import { bindClose } from '../utils/dom.js';

export function createOverlay(id) {
  document.getElementById(id)?.remove();
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999998;animation:crFadeIn 0.2s ease';
  document.body.appendChild(overlay);
  return overlay;
}

export function createModal(id, cssText) {
  document.getElementById(id)?.remove();
  const modal = document.createElement('div');
  modal.id = id;
  if (cssText) modal.style.cssText = cssText;
  document.body.appendChild(modal);
  return modal;
}

export function showVersionModal() {
  const overlay = createOverlay('crVersionOverlay');
  const modal = createModal('crVersionModal');

  const entriesHTML = Object.entries(VERSION_NOTES).map(([ver, note]) => `
  <div class="cr-vm-entry${ver === SCRIPT_VERSION ? ' current' : ''}">
    <span class="cr-vm-ver">v${ver}</span>
    <span class="cr-vm-note">${note}</span>
  </div>`).join('');

  modal.innerHTML = `
  <div class="cr-vm-header">
    <div class="cr-vm-badge">📶 CreditRadar</div>
    <div class="cr-vm-title">¿Qué hay de nuevo?</div>
    <div class="cr-vm-subtitle">Versión actual — v${SCRIPT_VERSION}</div>
    <button class="cr-vm-close" id="crVmClose">✕</button>
  </div>
  <div class="cr-vm-body">${entriesHTML}</div>
  <div class="cr-vm-footer">
    <button class="cr-vm-btn" id="crVmOk">Entendido</button>
  </div>
`;

  const close = () => { overlay.remove(); modal.remove(); };
  bindClose(close, overlay, document.getElementById('crVmClose'), document.getElementById('crVmOk'));
}

export function checkVersionUpdate() {
  const versionKey = "clasificador_lastVersion";
  const lastVersion = GM_getValue(versionKey, null);

  if (lastVersion !== SCRIPT_VERSION) {
    GM_setValue(versionKey, SCRIPT_VERSION);
    setTimeout(showVersionModal, 1200);
  }
}

export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

export function showUpdateAvailableModal(latestVer) {
  const overlay = createOverlay('crUpdateOverlay');
  const modal = createModal('crUpdateModal', 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#161616;color:#fff;border-radius:12px;z-index:9999999;width:400px;max-width:94vw;border:1px solid #2a2a2a;box-shadow:0 16px 48px rgba(0,0,0,0.55);animation:crScaleIn 0.28s cubic-bezier(.16,1,.3,1);overflow:hidden;');

  modal.innerHTML = `
  <div class="cr-vm-header" style="background:#111;border-top:2px solid #60a5fa;">
    <div class="cr-vm-badge" style="background:#60a5fa18;border-color:#60a5fa40;color:#60a5fa;">Actualización Disponible</div>
    <div class="cr-vm-title">¡Nueva versión encontrada!</div>
    <div class="cr-vm-subtitle">La versión v${latestVer} está lista. (Actual: v${SCRIPT_VERSION})</div>
    <button class="cr-vm-close" id="crUpClose">✕</button>
  </div>
  <div class="cr-vm-body" style="text-align:center;padding:34px 20px;">
    <div style="font-size:36px;border-radius:8px;width:64px;height:64px;line-height:64px;margin:0 auto 18px;background:#1a1a1a;box-shadow:0 2px 8px rgba(0,0,0,0.3);">↑</div>
    <p style="color:#ddd;font-size:14px;line-height:1.6;margin-bottom:0;">Da clic en el botón de abajo para instalar la nueva versión.<br><span style="color:#888;font-size:12px;display:block;margin-top:8px;">(Tampermonkey te pedirá confirmación)</span></p>
  </div>
  <div class="cr-vm-footer" style="display:flex;gap:12px;">
    <button class="cr-vm-btn" id="crUpInstall" style="background:#60a5fa;color:#fff;flex:2;box-shadow:0 4px 15px #60a5fa40;">Instalar v${latestVer}</button>
    <button class="cr-vm-btn" id="crUpLater" style="background:#1e1e1e;color:#888;border:1px solid #2a2a2a;flex:1;">Más tarde</button>
  </div>
`;

  const close = () => { overlay.remove(); modal.remove(); };
  bindClose(close, overlay, document.getElementById('crUpClose'), document.getElementById('crUpLater'));
  document.getElementById('crUpInstall').onclick = () => {
    window.location.href = "https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js";
    close();
  };
}

export function checkForUpdates() {
  const GITHUB_URL = "https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js";

  if (typeof GM_xmlhttpRequest !== "undefined") {
    GM_xmlhttpRequest({
      method: "GET",
      url: GITHUB_URL + "?t=" + Date.now(),
      onload: function (response) {
        if (response.status === 200) {
          const match = response.responseText.match(/@version\s+([0-9.]+)/);
          if (match && match[1]) {
            if (compareVersions(match[1], SCRIPT_VERSION) > 0) {
              setTimeout(() => showUpdateAvailableModal(match[1]), 2500);
            }
          }
        }
      }
    });
  } else {
    fetch(GITHUB_URL + "?t=" + Date.now())
      .then(res => res.text())
      .then(text => {
        const match = text.match(/@version\s+([0-9.]+)/);
        if (match && match[1]) {
          if (compareVersions(match[1], SCRIPT_VERSION) > 0) {
            setTimeout(() => showUpdateAvailableModal(match[1]), 2500);
          }
        }
      }).catch(e => console.warn("[Clasificador] Error verificando update en github", e));
  }
}
