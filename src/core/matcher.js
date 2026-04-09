import { BUROS, IGNORE_VALUES, SELECTORS } from '../config/constants.js';
import { cleanName, normalizeForMatch, getWords, getPrefixes, jaccardSimilarity } from '../utils/string.js';
import { queryOne } from '../utils/dom.js';

export function buildAliasMap(config) {
  const map = new Map();
  if (!config.aliases) return map;
  config.aliases.split("\n").forEach(line => {
    line = line.trim();
    if (!line || !line.includes("=")) return;
    const [main, ...rest] = line.split("=");
    const mainClean = cleanName(main.trim());
    if (!mainClean) return;
    const mainNormalized = normalizeForMatch(mainClean);
    map.set(mainNormalized, mainClean);
    rest.join("=").split(",").forEach(alias => {
      const aliasClean = cleanName(alias.trim());
      if (aliasClean && aliasClean !== mainClean) {
        map.set(normalizeForMatch(aliasClean), mainClean);
      }
    });
  });
  return map;
}

export function resolveAlias(name, aliasMap) {
  const clean = cleanName(name);
  const normalized = normalizeForMatch(clean);
  return aliasMap.get(normalized) || clean;
}

export function getLinkedAccount(name, map, aliasMap) {
  if (!name || !map.size) return null;
  const resolvedInquiry = resolveAlias(name, aliasMap);
  const normalizedInquiry = normalizeForMatch(resolvedInquiry);

  const wordsI = getWords(resolvedInquiry);
  const wordsSetI = new Set(wordsI);
  const prefixesI = getPrefixes(resolvedInquiry);
  const prefixSetI = new Set(prefixesI);

  for (const [creditor, item] of map) {
    const resolvedCreditor = resolveAlias(creditor, aliasMap);
    const normalizedCreditor = normalizeForMatch(resolvedCreditor);

    if (normalizedInquiry === normalizedCreditor) return item;

    const wordsC = getWords(resolvedCreditor);
    const wordsSetC = new Set(wordsC);

    const exact = wordsI.filter(w => wordsSetC.has(w));
    if (exact.length >= 2) return item;
    // Strategy 3: ambos reducen a 1 sola palabra y coinciden (umbral 5 chars)
    if (exact.length === 1 && wordsI.length === 1 && wordsC.length === 1 && exact[0].length >= 5) return item;
    // Strategy 3.5: inquiry tiene 1 sola palabra de 6+ chars que aparece en el acreedor
    if (exact.length === 1 && wordsI.length === 1 && exact[0].length >= 6) return item;

    const prefixesC = new Set(getPrefixes(resolvedCreditor));
    const pfx = [...prefixSetI].filter(p => prefixesC.has(p));
    if (pfx.length >= 2) return item;

    if (resolvedInquiry.length >= 6 && resolvedCreditor.includes(resolvedInquiry)) return item;
    if (resolvedCreditor.length >= 6 && resolvedInquiry.includes(resolvedCreditor)) return item;

    // Jaccard sobre palabras significativas (sin stop words)
    const sim = jaccardSimilarity(wordsI.join(" "), wordsC.join(" "));
    if (sim >= 0.7) return item;
  }
  return null;
}

export function getBuroStatus(item, buro) {
  return {
    indispute: !!queryOne(SELECTORS.compact.indispute(buro), item),
    negative: !!queryOne(SELECTORS.compact.negative(buro), item),
    positive: !!queryOne(SELECTORS.compact.positive(buro), item),
    deleted: !!queryOne(SELECTORS.compact.deleted(buro), item),
    none: !!queryOne(SELECTORS.compact.noneText(buro), item)
  };
}

export function getActiveColumns(item) {
  return BUROS.map(b => {
    const status = getBuroStatus(item, b);
    return (status.indispute || status.negative) && !status.positive && !status.deleted;
  });
}

export function hasInDispute(item) {
  return BUROS.some(b => {
    const status = getBuroStatus(item, b);
    return status.indispute || status.negative;
  }) || !!queryOne(".disputes-tab-compact-indispute-text-CTN", item);
}

export function quickDetectStatus(item) {
  const isAllPositive = BUROS.every(b => {
    const status = getBuroStatus(item, b);
    return status.positive || status.deleted || status.none || (!status.indispute && !status.negative);
  });
  return { skip: isAllPositive };
}
