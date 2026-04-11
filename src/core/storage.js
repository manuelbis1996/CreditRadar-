import { STORAGE_KEY, DEFAULT_CONFIG, HISTORY_KEY, HISTORY_MAX } from '../config/constants.js';

export function loadConfig() {
  try {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (saved) {
      const parsed = typeof saved === "string" ? JSON.parse(saved) : saved;
      if (!parsed.fieldOrder) parsed.fieldOrder = DEFAULT_CONFIG.fieldOrder;
      else if (parsed.fieldOrder.length && typeof parsed.fieldOrder[0] === "string") {
        parsed.fieldOrder = parsed.fieldOrder.map(key => ({ key, showLabel: true }));
      }
      if (!parsed.personalFields) parsed.personalFields = DEFAULT_CONFIG.personalFields;
      if (parsed.aliases === undefined) parsed.aliases = DEFAULT_CONFIG.aliases;
      if (parsed.showPersonalLabels === undefined) parsed.showPersonalLabels = DEFAULT_CONFIG.showPersonalLabels;
      if (!parsed.toolbarPos) parsed.toolbarPos = DEFAULT_CONFIG.toolbarPos;
      if (!parsed.clientStatuses) parsed.clientStatuses = DEFAULT_CONFIG.clientStatuses;
      return parsed;
    }
  } catch (e) {
    console.error("[Clasificador] Error loading config:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export function saveConfig(config) {
  try {
    GM_setValue(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("[Clasificador] Error saving config:", e);
  }
}

export function loadHistory() {
  try {
    const raw = GM_getValue(HISTORY_KEY, '[]');
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    console.error('[CreditRadar] Historial corrupto, limpiando...', e);
    GM_deleteValue(HISTORY_KEY);
    return [];
  }
}

export function saveHistory(entries) {
  try {
    GM_setValue(HISTORY_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('[CreditRadar] Error guardando historial:', e);
  }
}

export function loadCFData(key, def) {
  try {
    const v = GM_getValue(key, null);
    return v ? (typeof v === 'string' ? JSON.parse(v) : v) : def;
  } catch(e) { return def; }
}

export function saveCFData(key, val) {
  try { GM_setValue(key, JSON.stringify(val)); } catch(e) {}
}

export function addHistoryEntry(output, stats, personalHeader) {
  const firstLine = (personalHeader || '').split('\n').map(l => l.trim()).find(l => l) || 'Cliente';
  const clientName = firstLine.replace(/^Name:\s*/i, '').replace(/^Nombre:\s*/i, '').trim() || 'Cliente';
  const entries = loadHistory();
  entries.unshift({ id: Date.now(), clientName, output, stats });
  if (entries.length > HISTORY_MAX) entries.length = HISTORY_MAX;
  saveHistory(entries);
}
