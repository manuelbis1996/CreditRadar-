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

function showDisclaimerModal(onAccept, version = SCRIPT_VERSION) {
  const overlay = createOverlay('crDisclaimerOverlay');
  overlay.style.zIndex = '10000000';
  overlay.style.background = 'rgba(0,0,0,0.88)';

  const modal = createModal(
    'crDisclaimerModal',
    'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#161616;color:#fff;border-radius:14px;z-index:10000001;width:520px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;border:1px solid #fbbf24;box-shadow:0 18px 56px rgba(0,0,0,0.7);animation:crScaleIn 0.3s cubic-bezier(.16,1,.3,1);'
  );

  modal.innerHTML = `
    <div style="padding:24px 24px 18px;background:#111;border-top:3px solid #fbbf24;">
      <div style="display:inline-block;padding:5px 9px;border:1px solid #fbbf2440;border-radius:20px;background:#fbbf2412;color:#fbbf24;font-size:11px;font-weight:700;letter-spacing:.06em;">AVISO IMPORTANTE</div>
      <div style="margin-top:12px;font-size:21px;font-weight:700;">Antes de continuar</div>
      <div style="margin-top:5px;color:#9ca3af;font-size:12px;">CreditRadar v${version}</div>
    </div>
    <div style="padding:22px 24px 16px;color:#d1d5db;font-size:14px;line-height:1.7;">
      <p style="margin:0 0 12px;">CreditRadar es una herramienta de apoyo y se proporciona “tal cual”. No garantiza que la información detectada sea completa o exacta, ni que su uso produzca un resultado específico.</p>
      <p style="margin:0 0 12px;">El usuario es responsable de revisar y confirmar los datos, y de decidir qué acciones tomar antes de usar, enviar o compartir cualquier resultado.</p>
      <p style="margin:0;">En la medida permitida por la ley, el creador no asume responsabilidad por consecuencias derivadas del uso de la herramienta, errores u omisiones en los datos, o decisiones tomadas con base en sus resultados. CreditRadar no sustituye asesoría profesional, legal ni financiera.</p>
    </div>
    <div style="padding:4px 24px 24px;">
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;color:#9ca3af;font-size:12px;">
        <span id="crDisclaimerCountdown">Lee el aviso para continuar</span>
        <span id="crDisclaimerSeconds">60 s</span>
      </div>
      <div style="height:5px;overflow:hidden;border-radius:5px;background:#2a2a2a;">
        <div id="crDisclaimerProgress" style="width:0;height:100%;background:#fbbf24;transition:width 60s linear;"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:18px;">
        <button id="crDisclaimerCancel" type="button" style="flex:1;padding:12px;border:1px solid #3a3a3a;border-radius:8px;background:#222;color:#bbb;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button id="crDisclaimerAccept" type="button" disabled style="flex:2;padding:12px;border:0;border-radius:8px;background:#3a3525;color:#9ca3af;font-size:14px;font-weight:700;cursor:not-allowed;transition:background .2s,color .2s,transform .2s;">Acepto y continuar (60)</button>
      </div>
    </div>
  `;

  const acceptButton = modal.querySelector('#crDisclaimerAccept');
  const cancelButton = modal.querySelector('#crDisclaimerCancel');
  const countdown = modal.querySelector('#crDisclaimerCountdown');
  const secondsText = modal.querySelector('#crDisclaimerSeconds');
  const progress = modal.querySelector('#crDisclaimerProgress');
  const startedAt = Date.now();
  const duration = 60000;
  requestAnimationFrame(() => { progress.style.width = '100%'; });

  const countdownTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((duration - (Date.now() - startedAt)) / 1000));
    secondsText.textContent = `${remaining} s`;
    acceptButton.textContent = remaining
      ? `Acepto y continuar (${remaining})`
      : 'Acepto y continuar';

    if (!remaining) {
      clearInterval(countdownTimer);
      countdown.textContent = 'Ya puedes aceptar y continuar';
      acceptButton.disabled = false;
      acceptButton.style.background = '#fbbf24';
      acceptButton.style.color = '#111';
      acceptButton.style.cursor = 'pointer';
    }
  }, 200);

  cancelButton.onclick = () => {
    clearInterval(countdownTimer);
    overlay.remove();
    modal.remove();
  };

  acceptButton.onclick = () => {
    if (acceptButton.disabled) return;
    clearInterval(countdownTimer);
    overlay.remove();
    modal.remove();
    onAccept();
  };
}

export function checkVersionUpdate() {
  const versionKey = "clasificador_lastVersion";
  const acceptedVersionKey = "clasificador_disclaimerAcceptedVersion";
  const lastVersion = GM_getValue(versionKey, null);

  if (lastVersion !== SCRIPT_VERSION) {
    if (GM_getValue(acceptedVersionKey, null) === SCRIPT_VERSION) {
      GM_deleteValue(acceptedVersionKey);
      GM_setValue(versionKey, SCRIPT_VERSION);
      setTimeout(showVersionModal, 1200);
      return;
    }

    setTimeout(() => showDisclaimerModal(() => {
      GM_setValue(versionKey, SCRIPT_VERSION);
      showVersionModal();
    }), 1200);
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
    showDisclaimerModal(() => {
      GM_setValue("clasificador_disclaimerAcceptedVersion", latestVer);
      close();
      window.location.href = "https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js";
    }, latestVer);
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
