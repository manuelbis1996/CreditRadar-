import { CF_RECORDS_KEY, CF_LOG_KEY } from '../config/constants.js';
import { loadCFData, saveCFData } from '../core/storage.js';

function todayStr() { return new Date().toISOString().split('T')[0]; }

/**
 * Saves a client from CreditRadar output directly into CreditFlow GM storage.
 * Returns true if added, false if already existed.
 */
export function saveToCreditFlow(nombre, nombreResp) {
  if (!nombre) return false;
  const records = loadCFData(CF_RECORDS_KEY, []);
  if (records.some(r => r.nombre.toLowerCase() === nombre.toLowerCase())) return false;
  records.push({
    id: Date.now().toString(),
    nombre,
    nombreResp: nombreResp || 'Manuelbis',
    estatus: 'carta',
    carta: false, cfbp: false,
    cartaFecha: todayStr(), cfbpFecha: '',
    comentario: '',
    link: window.location.href,
    createdAt: new Date().toISOString(),
  });
  saveCFData(CF_RECORDS_KEY, records);
  const log = loadCFData(CF_LOG_KEY, []);
  log.push({ id: Date.now() + 'l', type: 'add', desc: 'Guardado desde CreditRadar: ' + nombre, ts: new Date().toISOString() });
  saveCFData(CF_LOG_KEY, log);
  return true;
}

/**
 * Saves a client and marks carta as complete (carta: true).
 * If the client already exists, just marks carta = true.
 * Returns 'added' | 'updated' | 'already_complete'
 */
export function saveAndComplete(nombre, nombreResp) {
  if (!nombre) return 'error';
  const records = loadCFData(CF_RECORDS_KEY, []);
  const idx = records.findIndex(r => r.nombre.toLowerCase() === nombre.toLowerCase());
  if (idx > -1) {
    if (records[idx].carta && records[idx].cfbp) return 'already_complete';
    records[idx].carta = true;
    records[idx].cfbp  = true;
    records[idx].cartaFecha = records[idx].cartaFecha || todayStr();
    records[idx].cfbpFecha  = todayStr();
    saveCFData(CF_RECORDS_KEY, records);
    const log = loadCFData(CF_LOG_KEY, []);
    log.push({ id: Date.now() + 'l', type: 'edit', desc: 'Completado (carta + CFBP): ' + nombre, ts: new Date().toISOString() });
    saveCFData(CF_LOG_KEY, log);
    return 'updated';
  }
  records.push({
    id: Date.now().toString(),
    nombre,
    nombreResp: nombreResp || 'Manuelbis',
    estatus: 'carta',
    carta: true, cfbp: true,
    cartaFecha: todayStr(), cfbpFecha: todayStr(),
    comentario: '',
    link: window.location.href,
    createdAt: new Date().toISOString(),
  });
  saveCFData(CF_RECORDS_KEY, records);
  const log = loadCFData(CF_LOG_KEY, []);
  log.push({ id: Date.now() + 'l', type: 'add', desc: 'Guardado y completado: ' + nombre, ts: new Date().toISOString() });
  saveCFData(CF_LOG_KEY, log);
  return 'added';
}

/**
 * Entry point when userscript detects it's on the CreditFlow GitHub Pages.
 * Exposes GM_getValue/GM_setValue to the page context via unsafeWindow so
 * creditflow.html's storage bridge can use GM storage instead of localStorage.
 */
export function initCreditFlow() {
  try {
    /* global unsafeWindow */
    unsafeWindow.GM_getValue = GM_getValue;
    unsafeWindow.GM_setValue = GM_setValue;
    unsafeWindow.GM_addValueChangeListener = GM_addValueChangeListener;
    window.dispatchEvent(new CustomEvent('cr-gm-ready'));
  } catch(e) {
    console.warn('[CreditFlow] No se pudo exponer GM storage al contexto de página:', e);
  }

  const label = document.getElementById('storage-label');
  if (label) label.textContent = 'Datos en Tampermonkey (GM)';
}
