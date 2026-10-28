import { SCRIPT_VERSION } from '../config/constants.js';
import { waitForElement } from '../utils/dom.js';

/** Cambia el estado visual y la disponibilidad del botón principal. */
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

/** Inserta la barra de herramientas y conecta sus acciones a los controles. */
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
    <button id="crCFBtn" aria-label="CreditFlow CRM" title="Abrir CreditFlow">🔗</button>
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

/** Presenta un aviso temporal en la esquina de la página. */
export function showToast(message, color = "#5eead4", duration = 5000) {
  document.getElementById("clasificadorToast")?.remove();
  const toast = document.createElement("div");
  toast.id = "clasificadorToast";
  Object.assign(toast.style, {
    position: "fixed", bottom: "30px", right: "30px",
    background: "#1a1a1a", color: "#fff", padding: "14px 20px",
    borderRadius: "8px", zIndex: "1000000", fontSize: "14px",
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

/** Permite recorrer detecciones, abrir sus filas en Pulse y volver al editor. */
export function showDetectionNotice(detections, summary) {
  document.getElementById("crDetectionNotice")?.remove();
  document.getElementById("crDetectionReturn")?.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "crDetectionNotice";
  Object.assign(backdrop.style, {
    position: "fixed", inset: "0", display: "grid", placeItems: "center",
    padding: "16px", boxSizing: "border-box", zIndex: "1000001",
    background: "rgba(0, 0, 0, 0.82)", backdropFilter: "blur(4px)"
  });

  const notice = document.createElement("section");
  notice.setAttribute("role", "dialog");
  notice.setAttribute("aria-modal", "true");
  notice.setAttribute("aria-labelledby", "crDetectionHeading");
  Object.assign(notice.style, {
    width: "480px", maxWidth: "100%", maxHeight: "100%", overflowY: "auto",
    background: "#161616", color: "#fff", padding: "24px",
    borderRadius: "14px", border: "2px solid #60a5fa",
    boxShadow: "0 16px 56px rgba(0,0,0,0.8)",
    fontSize: "14px", lineHeight: "1.6", boxSizing: "border-box"
  });

  const heading = document.createElement("strong");
  heading.id = "crDetectionHeading";
  heading.textContent = "🔔 Aviso del análisis";
  heading.style.display = "block";
  heading.style.marginBottom = "6px";

  const summaryText = document.createElement("div");
  summaryText.textContent = summary;
  summaryText.style.color = "#cbd5e1";

  const detectionText = document.createElement("div");
  detectionText.style.marginTop = "8px";
  detectionText.style.color = "#93c5fd";
  detectionText.setAttribute("aria-live", "polite");

  const controls = document.createElement("div");
  Object.assign(controls.style, {
    display: "flex", alignItems: "center", gap: "6px", marginTop: "12px",
    flexWrap: "wrap"
  });

  const makeButton = (label, title) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    Object.assign(button.style, {
      padding: "6px 9px", border: "1px solid #3a3a3a", borderRadius: "6px",
      background: "#222", color: "#fff", cursor: "pointer", fontSize: "12px"
    });
    return button;
  };

  const previousButton = makeButton("‹ Anterior", "Detección anterior");
  const verifyButton = makeButton("Verificar", "Ir a la detección seleccionada");
  verifyButton.style.background = "#1d4ed8";
  verifyButton.style.borderColor = "#3b82f6";
  const nextButton = makeButton("Siguiente ›", "Siguiente detección");
  const closeButton = makeButton("Entendido y continuar", "Cerrar aviso y continuar");
  closeButton.style.marginLeft = "auto";

  const returnButton = makeButton("↩ Volver al panel de resultados", "Volver al panel sin perder los cambios");
  returnButton.id = "crDetectionReturn";
  Object.assign(returnButton.style, {
    display: "none", position: "fixed", top: "16px", right: "16px",
    zIndex: "1000002", padding: "10px 14px", background: "#1d4ed8",
    borderColor: "#3b82f6", fontSize: "13px", boxShadow: "0 4px 16px rgba(0,0,0,0.5)"
  });

  let currentIndex = 0;
  let editorHidden = false;
  const restoreResults = () => {
    const panel = document.getElementById("crOutputPanel");
    const overlay = document.getElementById("crOverlay");
    if (!panel || !overlay) {
      detectionText.textContent = "El panel de resultados ya no está disponible.";
      return;
    }
    panel.style.visibility = "";
    overlay.style.display = "";
    backdrop.style.display = "grid";
    returnButton.style.display = "none";
    editorHidden = false;
    verifyButton.textContent = "Verificar";
    verifyButton.focus();
  };

  returnButton.onclick = restoreResults;

  const updateDetection = () => {
    const hasDetections = detections.length > 0;
    previousButton.disabled = !hasDetections;
    nextButton.disabled = !hasDetections;
    verifyButton.disabled = !hasDetections;
    [previousButton, nextButton, verifyButton].forEach(button => {
      button.style.opacity = hasDetections ? "1" : "0.45";
      button.style.cursor = hasDetections ? "pointer" : "not-allowed";
    });
    detectionText.textContent = hasDetections
      ? `${currentIndex + 1}/${detections.length} · ${detections[currentIndex].label}: ${detections[currentIndex].name}`
      : "No hay elementos que se puedan abrir para verificar.";
  };

  previousButton.onclick = () => {
    currentIndex = (currentIndex - 1 + detections.length) % detections.length;
    updateDetection();
  };
  nextButton.onclick = () => {
    currentIndex = (currentIndex + 1) % detections.length;
    updateDetection();
  };
  verifyButton.onclick = () => {
    if (editorHidden) {
      restoreResults();
      return;
    }

    const target = detections[currentIndex]?.target;
    if (!target?.isConnected) {
      detectionText.textContent = "Ese elemento ya no está disponible en la página.";
      return;
    }
    const panel = document.getElementById("crOutputPanel");
    const overlay = document.getElementById("crOverlay");
    if (!panel || !overlay) {
      detectionText.textContent = "El panel de resultados ya no está disponible para verificar esta cuenta.";
      return;
    }
    panel.style.visibility = "hidden";
    overlay.style.display = "none";
    editorHidden = true;
    backdrop.style.display = "none";
    returnButton.style.display = "block";
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  closeButton.onclick = () => {
    backdrop.remove();
    returnButton.remove();
  };

  controls.append(previousButton, verifyButton, nextButton, closeButton);
  notice.append(heading, summaryText, detectionText, controls);
  backdrop.appendChild(notice);
  document.body.appendChild(backdrop);
  document.body.appendChild(returnButton);
  updateDetection();
  closeButton.focus();
}

/** Crea el indicador flotante que muestra el avance del análisis. */
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

/** Actualiza el texto y contador del indicador de avance. */
export function updateProgress(current, total, name, label = "Procesando") {
  const escapeHtml = str => (str||"").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lEl = document.getElementById("progressLabel");
  const cEl = document.getElementById("progressCount");
  const nEl = document.getElementById("progressName");
  if (lEl) lEl.textContent = label;
  if (cEl) cEl.textContent = total === "?" ? "Cargando..." : `${current} de ${total}`;
  if (nEl) nEl.innerHTML = escapeHtml(name);
}

/** Quita del documento el indicador de avance. */
export function removeProgressPanel() {
  document.getElementById("clasificadorProgress")?.remove();
}
