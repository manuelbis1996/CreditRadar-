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
    createdAt: new Date().toISOString(),
  });
  saveCFData(CF_RECORDS_KEY, records);
  const log = loadCFData(CF_LOG_KEY, []);
  log.push({ id: Date.now() + 'l', type: 'add', desc: 'Guardado desde CreditRadar: ' + nombre, ts: new Date().toISOString() });
  saveCFData(CF_LOG_KEY, log);
  return true;
}

/**
 * Entry point when userscript detects it's on the CreditFlow GitHub Pages.
 * creditflow.html handles the full UI and auto-detects GM storage via its
 * own storage bridge — no body rewrite needed here.
 */
export function initCreditFlow() {
  // Update the footer label once the DOM is ready
  const label = document.getElementById('storage-label');
  if (label) label.textContent = 'Datos en Tampermonkey (GM)';
}
