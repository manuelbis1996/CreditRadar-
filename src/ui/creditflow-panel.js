import { CF_RECORDS_KEY, CF_LOG_KEY } from '../config/constants.js';
import { loadCFData, saveCFData } from '../core/storage.js';

/** Devuelve la fecha actual en formato ISO YYYY-MM-DD. */
function todayStr() { return new Date().toISOString().split('T')[0]; }

/**
 * Guarda en CreditFlow un cliente encontrado en el output de CreditRadar.
 * Devuelve true si lo agregó o false si ya existía.
 */
export function saveToCreditFlow(nombre, nombreResp, phone) {
  if (!nombre) return false;
  const records = loadCFData(CF_RECORDS_KEY, []);
  if (records.some(r => r.nombre.toLowerCase() === nombre.toLowerCase())) return false;
  records.push({
    id: Date.now().toString(),
    nombre,
    nombreResp: nombreResp || 'Manuelbis',
    phone: (phone || '').replace(/\D/g,''),
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
 * Guarda un cliente y marca la carta y CFPB como completos.
 * Devuelve `added`, `updated` o `already_complete` según el resultado.
 */
export function saveAndComplete(nombre, nombreResp, phone) {
  if (!nombre) return 'error';
  const records = loadCFData(CF_RECORDS_KEY, []);
  const idx = records.findIndex(r => r.nombre.toLowerCase() === nombre.toLowerCase());
  if (idx > -1) {
    if (records[idx].carta && records[idx].cfbp) return 'already_complete';
    records[idx].carta = true;
    records[idx].cfbp  = true;
    records[idx].cartaFecha = records[idx].cartaFecha || todayStr();
    records[idx].cfbpFecha  = todayStr();
    if (phone && !records[idx].phone) records[idx].phone = phone.replace(/\D/g,'');
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
    phone: (phone || '').replace(/\D/g,''),
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
 * Inicializa el puente de almacenamiento cuando el userscript está en CreditFlow.
 * Expone las funciones GM al contexto de la página para evitar localStorage.
 */
export function initCreditFlow() {
  try {
    /* global unsafeWindow */
    unsafeWindow.GM_getValue = GM_getValue;
    unsafeWindow.GM_setValue = GM_setValue;
    unsafeWindow.GM_addValueChangeListener = GM_addValueChangeListener;
    unsafeWindow.dispatchEvent(new CustomEvent('cr-gm-ready'));
  } catch(e) {
    console.warn('[CreditFlow] No se pudo exponer GM storage al contexto de página:', e);
  }

  const label = document.getElementById('storage-label');
  if (label) label.textContent = 'Datos en Tampermonkey (GM)';
}
