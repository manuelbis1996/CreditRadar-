import { REMOVE_PREFIXES, REMOVE_SUFFIXES, EXPAND_MAP, STOP_WORDS, IGNORE_VALUES } from '../config/constants.js';

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

export function normalizeForMatch(name) {
  return cleanName(name).replace(/[^a-z0-9]/g, "");
}

export function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function getWords(s) {
  return s.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

export function getPrefixes(s, len = 4) {
  return s.split(/\s+/).map(w => w.slice(0, len)).filter(p => p.length >= 3);
}

export function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}
