import { REMOVE_PREFIXES, REMOVE_SUFFIXES, EXPAND_MAP, STOP_WORDS, IGNORE_VALUES } from '../config/constants.js';

/** Limpia nombres de acreedores, expande abreviaturas y quita términos irrelevantes. */
export function cleanName(name) {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  for (const p of REMOVE_PREFIXES) {
    if (n.startsWith(p)) n = n.slice(p.length);
  }
  n = n.split(/\s+/).map(w => EXPAND_MAP[w] || w).join(" ");
  const parts = n.split(/\s+/);
  while (parts.length > 1 && REMOVE_SUFFIXES.includes(parts[parts.length - 1])) parts.pop();
  return parts.join(" ").replace(/'/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Genera una clave sin puntuación para comparaciones exactas. */
export function normalizeForMatch(name) {
  return cleanName(name).replace(/[^a-z0-9]/g, "");
}

/** Escapa texto antes de insertarlo en HTML. */
export function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Devuelve palabras relevantes, excluyendo términos cortos y palabras vacías. */
export function getWords(s) {
  return s.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/** Devuelve prefijos de palabras para la búsqueda aproximada de nombres. */
export function getPrefixes(s, len = 4) {
  return s.split(/\s+/).map(w => w.slice(0, len)).filter(p => p.length >= 3);
}

/** Calcula cuánto se superponen dos conjuntos de palabras. */
export function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}
