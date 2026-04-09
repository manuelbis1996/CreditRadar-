import { saveConfig } from '../core/storage.js';

export function parseAliasGroups(text) {
  if (!text) return [];
  return text.split('\n').map(l => l.trim()).filter(l => l && l.includes('=')).map(l => {
    const eqIdx = l.indexOf('=');
    const main = l.slice(0, eqIdx).trim();
    const aliases = l.slice(eqIdx + 1).split(',').map(a => a.trim()).filter(Boolean);
    return { main, aliases };
  });
}

export function serializeAliasGroups(groups) {
  return groups.map(g => `${g.main} = ${g.aliases.join(', ')}`).join('\n');
}

export function addInquiryAlias(config, inquiryName, accountName) {
  const groups = parseAliasGroups(config.aliases || '');
  const accLower = accountName.trim().toLowerCase();
  const inqLower = inquiryName.trim().toLowerCase();
  const group = groups.find(g => g.main.toLowerCase() === accLower);
  if (group) {
    if (!group.aliases.includes(inqLower)) group.aliases.push(inqLower);
  } else {
    groups.push({ main: accLower, aliases: [inqLower] });
  }
  config.aliases = serializeAliasGroups(groups);
  saveConfig(config);
}
