import { BUROS, IGNORE_VALUES, SELECTORS } from '../config/constants.js';
import { cleanName, normalizeForMatch, getWords, getPrefixes, jaccardSimilarity } from '../utils/string.js';
import { queryOne } from '../utils/dom.js';

/** Crea un índice normalizado de alias a acreedor usando los grupos configurados. */
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

/** Reemplaza un alias conocido por el nombre canónico del acreedor. */
export function resolveAlias(name, aliasMap) {
  const clean = cleanName(name);
  const normalized = normalizeForMatch(clean);
  return aliasMap.get(normalized) || clean;
}

/** Busca la primera cuenta positiva que coincida posiblemente con el acreedor del inquiry. */
export function getLinkedAccount(name, map, aliasMap) {
  if (!name || !map.size) return null;
  const resolvedInquiry = resolveAlias(name, aliasMap);
  const normalizedInquiry = normalizeForMatch(resolvedInquiry);

  const wordsI = getWords(resolvedInquiry);
  const wordsSetI = new Set(wordsI);
  const prefixesI = getPrefixes(resolvedInquiry);
  const prefixSetI = new Set(prefixesI);

  for (const [positiveName, item] of map) {
    const creditor = positiveName.split(" - ")[0].trim();
    const resolvedCreditor = resolveAlias(creditor, aliasMap);
    const normalizedCreditor = normalizeForMatch(resolvedCreditor);

    if (normalizedInquiry === normalizedCreditor) return item;

    const isVeryShort = resolvedInquiry.length < 6 || resolvedCreditor.length < 6;
    if (isVeryShort && !normalizedInquiry.includes(normalizedCreditor) && !normalizedCreditor.includes(normalizedInquiry)) {
      continue;
    }

    const wordsC = getWords(resolvedCreditor);
    const wordsSetC = new Set(wordsC);

    const exact = wordsI.filter(w => wordsSetC.has(w));
    if (exact.length >= 2) return item;
    // Caso 3: ambos nombres tienen una sola palabra igual de al menos cinco caracteres.
    if (exact.length === 1 && wordsI.length === 1 && wordsC.length === 1 && exact[0].length >= 5) return item;
    // Caso 3.5: el inquiry tiene una palabra larga que aparece dentro del nombre del acreedor.
    if (exact.length === 1 && wordsI.length === 1 && exact[0].length >= 6) return item;

    const prefixesC = new Set(getPrefixes(resolvedCreditor));
    const pfx = [...prefixSetI].filter(p => prefixesC.has(p));
    if (pfx.length >= 2) return item;

    if (resolvedInquiry.length >= 6 && resolvedCreditor.includes(resolvedInquiry)) return item;
    if (resolvedCreditor.length >= 6 && resolvedInquiry.includes(resolvedCreditor)) return item;

    // Compara la proporción de palabras significativas compartidas.
    const sim = jaccardSimilarity(wordsI.join(" "), wordsC.join(" "));
    if (sim >= 0.7) return item;
  }
  return null;
}

/** Busca por nombre completo normalizado y, como alternativa, por acreedor. */
export function getLinkedPositiveAccounts(name, map, aliasMap) {
  if (!name || !map.size) return [];
  const getNameParts = value => {
    const separatorIndex = value.indexOf(" - ");
    return separatorIndex === -1
      ? [value.trim(), ""]
      : [value.slice(0, separatorIndex).trim(), value.slice(separatorIndex + 3).trim()];
  };
  const getNormalizedFullName = value => {
    const [creditor, details] = getNameParts(value);
    return `${normalizeForMatch(resolveAlias(creditor, aliasMap))}|${normalizeForMatch(details)}`;
  };
  const normalizedName = getNormalizedFullName(name);
  const matchingNames = [...map].filter(([positiveName]) =>
    getNormalizedFullName(positiveName) === normalizedName
  );
  if (matchingNames.length) return matchingNames.map(([, item]) => item);

  // Si el número difiere o está enmascarado de otra forma, devuelve todas las cuentas de ese acreedor.
  const [creditor] = getNameParts(name);
  const normalizedCreditor = normalizeForMatch(resolveAlias(creditor, aliasMap));
  return [...map].filter(([positiveName]) => {
    const [positiveCreditor] = getNameParts(positiveName);
    return normalizeForMatch(resolveAlias(positiveCreditor, aliasMap)) === normalizedCreditor;
  }).map(([, item]) => item);
}

/** Lee los estados seleccionados para un buró en la fila compacta del reporte. */
export function getBuroStatus(item, buro) {
  return {
    indispute: !!queryOne(SELECTORS.compact.indispute(buro), item),
    negative: !!queryOne(SELECTORS.compact.negative(buro), item),
    positive: !!queryOne(SELECTORS.compact.positive(buro), item),
    deleted: !!queryOne(SELECTORS.compact.deleted(buro), item),
    none: !!queryOne(SELECTORS.compact.noneText(buro), item)
  };
}

/** Marca los burós con estado disputado o negativo para procesar sus datos. */
export function getActiveColumns(item) {
  return BUROS.map(b => {
    const status = getBuroStatus(item, b);
    return (status.indispute || status.negative) && !status.positive && !status.deleted;
  });
}

/** Comprueba si algún buró o el indicador general marca el elemento como disputado. */
export function hasInDispute(item) {
  return BUROS.some(b => {
    const status = getBuroStatus(item, b);
    return status.indispute || status.negative;
  }) || !!queryOne(".disputes-tab-compact-indispute-text-CTN", item);
}

/** Evita expandir detalles si todos los burós están positivos, eliminados o sin estado. */
export function quickDetectStatus(item) {
  const isAllPositive = BUROS.every(b => {
    const status = getBuroStatus(item, b);
    return status.positive || status.deleted || status.none || (!status.indispute && !status.negative);
  });
  return { skip: isAllPositive };
}
