import { CF_RECORDS_KEY, CF_LOG_KEY } from '../config/constants.js';
import { loadCFData, saveCFData } from '../core/storage.js';

/** Devuelve la fecha actual en formato ISO YYYY-MM-DD. */
function todayStr() { return new Date().toISOString().split('T')[0]; }

/**
 * Registra en CreditFlow un cliente encontrado en el output de CreditRadar sin marcar una carta.
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
    estatus: '',
    carta: false, cfbp: false,
    cartaFecha: '', cfbpFecha: '',
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
 * Marca como hecha hoy la carta del proceso abierto más reciente del cliente.
 * Si no hay un proceso abierto, crea uno nuevo ya marcado con la carta.
 */
export function markLetterInCreditFlow(nombre, nombreResp, phone) {
  if (!nombre) return 'error';
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const records = loadCFData(CF_RECORDS_KEY, []);
  if (!Array.isArray(records)) {
    console.error('[CreditFlow] Los registros no tienen el formato esperado; no se marcó la carta.');
    return 'error';
  }
  const nameKey = normalize(nombre);
  const openCases = records
    .map((record, index) => ({record, index}))
    .filter(({record}) =>
      !record.archived && normalize(record.nombre) === nameKey && !(record.carta && record.cfbp)
    )
    .sort((a, b) => {
      const aTime = Date.parse(a.record.createdAt || '') || 0;
      const bTime = Date.parse(b.record.createdAt || '') || 0;
      return bTime - aTime || b.index - a.index;
    });

  if (openCases.length) {
    const record = openCases[0].record;
    const letterDate = todayStr();
    const alreadyMarked = record.carta && record.cartaFecha === letterDate && record.estatus === 'carta';
    const phoneAdded = Boolean(phone && !record.phone);
    record.carta = true;
    record.cartaFecha = letterDate;
    record.estatus = 'carta';
    if (phoneAdded) record.phone = phone.replace(/\D/g, '');
    if (alreadyMarked && !phoneAdded) return 'already_marked';
    if (!saveCFData(CF_RECORDS_KEY, records)) return 'error';
    const log = loadCFData(CF_LOG_KEY, []);
    log.push({
      id: `${Date.now()}l`,
      type: 'carta',
      desc: 'Carta hecha tras reimportación: ' + record.nombre,
      ts: new Date().toISOString()
    });
    if (!saveCFData(CF_LOG_KEY, log)) return 'marked_log_failed';
    return 'marked';
  }

  const now = new Date();
  records.push({
    id: now.getTime().toString(),
    nombre,
    nombreResp: nombreResp || 'Manuelbis',
    phone: (phone || '').replace(/\D/g, ''),
    estatus: 'carta',
    carta: true,
    cfbp: false,
    cartaFecha: todayStr(),
    cfbpFecha: '',
    comentario: '',
    link: window.location.href,
    createdAt: now.toISOString()
  });
  if (!saveCFData(CF_RECORDS_KEY, records)) return 'error';
  const log = loadCFData(CF_LOG_KEY, []);
  log.push({
    id: `${now.getTime()}l`,
    type: 'carta',
    desc: 'Reimportación registrada como carta: ' + nombre,
    ts: now.toISOString()
  });
  if (!saveCFData(CF_LOG_KEY, log)) return 'added_log_failed';
  return 'added';
}

function normalizeClientName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

function findLatestCase(records, nombre) {
  const nameKey = normalizeClientName(nombre);
  return records
    .map((record, index) => ({record, index}))
    .filter(({record}) => !record.archived && normalizeClientName(record.nombre) === nameKey)
    .sort((a, b) => {
      const aTime = Date.parse(a.record.createdAt || '') || 0;
      const bTime = Date.parse(b.record.createdAt || '') || 0;
      return bTime - aTime || b.index - a.index;
    })[0]?.record;
}

/**
 * Guarda un cliente y marca la carta y CFPB como completos.
 * Devuelve `added`, `updated` o `already_complete` según el resultado.
 */
export function saveAndComplete(nombre, nombreResp, phone) {
  if (!nombre) return 'error';
  const records = loadCFData(CF_RECORDS_KEY, []);
  if (!Array.isArray(records)) {
    console.error('[CreditFlow] Los registros no tienen el formato esperado; no se marcó el cliente como completo.');
    return 'error';
  }
  const record = findLatestCase(records, nombre);
  if (record) {
    if (record.carta && record.cfbp) return 'already_complete';
    if (!record.carta || !record.cartaFecha) record.cartaFecha = todayStr();
    record.carta = true;
    record.cfbp = true;
    record.cfbpFecha = todayStr();
    record.estatus = 'cfpb_ftc';
    if (phone && !record.phone) record.phone = phone.replace(/\D/g,'');
    if (!saveCFData(CF_RECORDS_KEY, records)) return 'error';
    const log = loadCFData(CF_LOG_KEY, []);
    log.push({ id: Date.now() + 'l', type: 'edit', desc: 'Completado (carta + CFBP): ' + record.nombre, ts: new Date().toISOString() });
    if (!saveCFData(CF_LOG_KEY, log)) return 'updated_log_failed';
    return 'updated';
  }
  records.push({
    id: Date.now().toString(),
    nombre,
    nombreResp: nombreResp || 'Manuelbis',
    phone: (phone || '').replace(/\D/g,''),
    estatus: 'cfpb_ftc',
    carta: true, cfbp: true,
    cartaFecha: todayStr(), cfbpFecha: todayStr(),
    comentario: '',
    link: window.location.href,
    createdAt: new Date().toISOString(),
  });
  if (!saveCFData(CF_RECORDS_KEY, records)) return 'error';
  const log = loadCFData(CF_LOG_KEY, []);
  log.push({ id: Date.now() + 'l', type: 'add', desc: 'Guardado y completado: ' + nombre, ts: new Date().toISOString() });
  if (!saveCFData(CF_LOG_KEY, log)) return 'added_log_failed';
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
    unsafeWindow.CreditFlowCheckLatest = () => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditflow.html?t=${Date.now()}`,
        onload(response) {
          if (response.status !== 200) {
            console.warn('[CreditFlow] No se pudo comprobar la versión publicada:', response.status);
            return;
          }
          const match = response.responseText.match(/const CREDITFLOW_VERSION\s*=\s*['"]([0-9.]+)['"]/);
          if (!match) {
            console.warn('[CreditFlow] La página publicada no contiene una versión válida.');
            return;
          }
          unsafeWindow.dispatchEvent(new CustomEvent('cr-creditflow-update-check', {
            detail: {version: match[1]}
          }));
        },
        onerror(error) {
          console.warn('[CreditFlow] Error al consultar actualizaciones:', error);
        }
      });
    };
    unsafeWindow.dispatchEvent(new CustomEvent('cr-gm-ready'));
  } catch(e) {
    console.warn('[CreditFlow] No se pudo exponer GM storage al contexto de página:', e);
  }

  const label = document.getElementById('storage-label');
  if (label) label.textContent = 'Datos en Tampermonkey (GM)';
}
