// ==UserScript==
// @name         CreditRadar 📶
// @namespace    http://tampermonkey.net/
// @version      19.7
// @description  Organizador inteligente de disputes - clasifica colecciones, acreedores, inquiries e información personal automáticamente
// @author       MAnuelbis Encarnacion Abreu  
// @match        https://pulse.disputeprocess.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js
// @downloadURL  https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js
// ==/UserScript==

const SCRIPT_VERSION = "19.7";

const VERSION_NOTES = {
  "19.7": "🚀 Notificación automática de actualizaciones con modal interactivo",
  "19.6": "✨ Modal de actualizaciones moderno y centrado con changelog completo",
  "19.5": "✨ Modal de actualizaciones moderno y centrado con changelog completo",
  "19.4": "🏷️ Toggle de etiqueta individual por campo en Campos",
  "19.3": "🏷️ Toggle etiquetas en Campos y Personal | Fix toggle UI",
  "19.2": "🔖 Etiquetas opcionales en info personal | SSN últimos 4 dígitos",
  "19.1": "💾 Config persistente con GM_setValue | No se borra al cerrar el navegador",
  "19.0": "👤 Formato de info personal configurable | Campos on/off y reordenables",
  "18.9": "🎨 UI interactiva | Tabs, tag chips, drag & drop, output preview",
  "18.8": "🎬 Animaciones en botón | Brillo, pulso y destello",
  "18.7": "✨ Nueva función de clasificación | Mejoras en el rendimiento",
  "18.6": "🔧 Optimizaciones de rendimiento",
  "18.5": "✨ Versión debajo del botón | Interfaz mejorada",
  "18.4": "🔧 Optimizaciones de rendimiento",
  "18.3": "🎨 Mejoras visuales",
  "18.2": "🚀 Sistema de alertas",
  "18.1": "📋 Versión visible en botón"
};

(function () {
'use strict';

/* ===================== CONSTANTS ===================== */

const SLEEP = ms => new Promise(r => setTimeout(r, ms));
const STORAGE_KEY = "pulse_clasificador_config";
const BUROS = ["equifax", "experian", "transunion"];
const STOP_WORDS = new Set(["the", "of", "and", "for", "inc", "llc", "na", "bank", "usa", "corp", "co", "ltd"]);
const IGNORE_VALUES = new Set(["na", "n/a", "unknown", "null", "undefined", "notreported", "-", ""]);

/* ===================== NAME CLEANING ===================== */

const REMOVE_SUFFIXES = [
  "financial", "funding", "services", "service", "svcs", "svc",
  "group", "solutions", "recovery", "management", "associates",
  "inc", "llc", "corp", "ltd", "na", "usa", "fin"
];

const REMOVE_PREFIXES = ["cb/", "syncb/", "td/", "wf/", "cof/", "jpm/", "thd/", "kohls/", "comenity/"];

const EXPAND_MAP = {
  "fin": "financial", "svc": "service", "svcs": "service",
  "natl": "national", "fed": "federal", "intl": "international",
  "mgmt": "management", "assoc": "associates", "grp": "group",
  "sol": "solutions", "cap": "capital", "fncl": "financial",
  "mtg": "mortgage", "auto": "automotive"
};

function cleanName(name) {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  for (const p of REMOVE_PREFIXES) {
    if (n.startsWith(p)) n = n.slice(p.length);
  }
  n = n.split(/\s+/).map(w => EXPAND_MAP[w] || w).join(" ");
  const parts = n.split(/\s+/);
  while (parts.length > 1 && REMOVE_SUFFIXES.includes(parts[parts.length - 1])) parts.pop();
  return parts.join(" ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(name) {
  return cleanName(name).replace(/[^a-z0-9]/g, "");
}

/* ===================== ACCOUNT FIELDS ===================== */

const ACCOUNT_FIELDS = [
  { key: "name", label: "Account Name" },
  { key: "number", label: "Account Number" },
  { key: "balance", label: "Balance" },
  { key: "dateOpened", label: "Date Opened" }
];

/* ===================== DEFAULT ALIASES ===================== */

const DEFAULT_ALIASES = `
capital one = cap one, cap1, capone, cof, capital one bank, capital one na
chase = jpmcb, jpmcb card, jp morgan, jpmorgan chase, chase bank
synchrony = syncb, syncb jcp, syncb amazon, syncb paypal, syncb lowes, syncb walmart, syncb carecredit, syncb tjx, syncb gap, syncb amazon plcc, syncb ppc, syncb ppmc, syncb wgdc, syncb ntwk, syncb ondc, syncb brdc, gecrb, gemb, ge capital retail
wells fargo = wf, wf bank, wfds, wells fargo bank, wells fargo financial
bank of america = boa, bac, bofa, bank of amer, bk of america
citibank = citi, citibank na, citicards, cbna, citifinancial
american express = amex, american express bank, american express centurion
discover = discover bank, discover financial, dfs, dfs webbank
td bank = td, td bank na, td auto, td bank target
us bank = usbank, us bank na, us bancorp
ally financial = ally, ally bank, ally auto
navy federal = navy fcu, navy federal credit union, nfcu
usaa = usaa bank, usaa federal savings
pnc bank = pnc, pnc bank na
regions bank = regions, regions financial
suntrust = suntrust bank, truist, truist bank
bb&t = bbt, branch banking, truist
fifth third = fifth third bank, 53 bank
huntington = huntington bank, huntington national
citizens bank = citizens, citizens financial, rbs citizens
santander = santander bank, santander consumer, santander auto
barclays = barclays bank, barclays bank delaware, barclay
comenity = comenity bank, comenity capital, comen, wfnnb, world financial
kohls = kohls capone, kohls charge, kohls department
home depot = thd, thd cbna, home depot credit
target = td bank target, target red card, target national
walmart = walmart stores, walmart credit, syncb walmart
amazon = amazon store card, syncb amazon, amazon visa
paypal = syncb ppc, syncb paypal, paypal credit
carecredit = syncb carecredit, syncb carecr, ge carecredit
lowes = syncb lowes, lowes companies, lowes credit
tjx = syncb tjx, tjx rewards, tjmaxx, marshalls, homegoods
gap = syncb gap, gap inc, gap visa, syncb gapdc
apple = apple bank, apple card, goldman sachs apple
best buy = best buy credit, bestbuy, bby, cbna best buy
macys = macys credit, macys retail, macys department
nordstrom = nordstrom credit, nordstrom bank
sears = sears credit, sears holdings, citibank sears
jcpenney = jcp, jcpenney credit, syncb jcp, gecrb jcp
victoria secret = vctr scrt, victoria secret credit, comenity victoria
westlake = westlake financial, westlake fin, westlake service, wlake
onemain = onemain financial, onemain fin, springleaf, springleaf financial
first premier = first premier bank, first premier credit
credit one = credit one bank, credit one financial
affirm = affirm inc, affirm loan
klarna = klarna bank, klarna financial
afterpay = afterpay us, afterpay financial
sofi = sofi bank, sofi lending, social finance
marcus = marcus goldman, marcus by goldman sachs
upgrade = upgrade bank, upgrade lending
`.trim();

/* ===================== DEFAULT CONFIG ===================== */

const DEFAULT_CONFIG = {
  agencies: [
    "lvnv", "midland", "portfolio", "cavalry", "jefferson",
    "ic system", "nca", "enhanced recovery", "credit collection",
    "national credit", "synergy", "afni", "convergent", "radius",
    "allied interstate", "credence", "sequium"
  ],
  closedStatuses: ["closed", "paid", "paid in full", "paid satisfactorily"],
  paymentStatuses: ["current"],
  negativeStatuses: [
    "derog", "chargeoff", "charge off", "coll/chargeoff",
    "collection", "delinquent", "past due", "late"
  ],
  colors: {
    open: "#00ff88",
    closedPositive: "#00aaff",
    inquiryLinked: "#ffcc00"
  },
  fieldOrder: [
    { key: "name",       showLabel: true },
    { key: "number",     showLabel: true },
    { key: "balance",    showLabel: true },
    { key: "dateOpened", showLabel: true }
  ],
  showPersonalLabels: true,
  personalFields: [
    { key: "name",    label: "Name",    enabled: true  },
    { key: "address", label: "Address", enabled: true  },
    { key: "ssn",     label: "SSN",     enabled: true  },
    { key: "dob",     label: "DOB",     enabled: true  },
    { key: "cell",    label: "Cell",    enabled: true  },
    { key: "home",    label: "Home",    enabled: false },
    { key: "email",   label: "Email",   enabled: true  },
    { key: "started", label: "Started", enabled: false },
    { key: "id",      label: "ID",      enabled: false }
  ],
  aliases: DEFAULT_ALIASES
};

/* ===================== CONFIG STORAGE ===================== */

function loadConfig() {
  try {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (saved) {
      const parsed = typeof saved === "string" ? JSON.parse(saved) : saved;
      if (!parsed.fieldOrder) {
        parsed.fieldOrder = DEFAULT_CONFIG.fieldOrder;
      } else if (parsed.fieldOrder.length && typeof parsed.fieldOrder[0] === "string") {
        parsed.fieldOrder = parsed.fieldOrder.map(key => ({ key, showLabel: true }));
      }
      if (!parsed.personalFields) parsed.personalFields = DEFAULT_CONFIG.personalFields;
      if (parsed.aliases === undefined) parsed.aliases = DEFAULT_ALIASES;
      if (parsed.showPersonalLabels === undefined) parsed.showPersonalLabels = DEFAULT_CONFIG.showPersonalLabels;
      return parsed;
    }
  } catch (e) {
    console.error("[Clasificador] Error loading config:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(config) {
  try {
    GM_setValue(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("[Clasificador] Error saving config:", e);
  }
}

let CONFIG = loadConfig();

/* ===================== ALIAS MAP ===================== */

/**
 * @typedef {Map<string, string>} AliasMap
 */

/**
 * @returns {AliasMap}
 */
function buildAliasMap() {
  const map = new Map();
  if (!CONFIG.aliases) return map;
  CONFIG.aliases.split("\n").forEach(line => {
    line = line.trim();
    if (!line || !line.includes("=")) return;
    const [main, ...rest] = line.split("=");
    const mainClean = cleanName(main.trim());
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

/**
 * @param {string} name
 * @param {AliasMap} aliasMap
 * @returns {string}
 */
function resolveAlias(name, aliasMap) {
  const clean = cleanName(name);
  const normalized = normalizeForMatch(clean);
  return aliasMap.get(normalized) || clean;
}

/* ===================== CSS SELECTOR REGISTRY ===================== */

const SELECTORS = {
  compact: {
    container: ".dispute-outer-sample-container",
    name: ".disputes-tab-compact-name-CTN",
    disputeLink: ".disputes-tab-compact-dispute-yes-CTN",
    expandBtn: ".disputes-tab-expandItem",
    deletedHeader: "disputes-tab-compact-dispute-deleted-header-CTN",
    positive: (buro) => `.disputes-tab-compact-${buro}-positive-CTN`,
    negative: (buro) => `.disputes-tab-compact-${buro}-negative-CTN`,
    indispute: (buro) => `.disputes-tab-compact-${buro}-indispute-CTN`,
    deleted: (buro) => `.disputes-tab-compact-${buro}-deleted-CTN`,
    noneText: (buro) => `.disputes-tab-compact-${buro}-CTN .disputes-tab-compact-none-text-CTN`
  },
  detail: {
    left: ".dispute-expose-detail-left",
    right: ".dispute-expose-details-right",
    blocks: ".dispute-expose-table-blocks",
    sideTitles: "expose-side-titles"
  },
  compactRow: {
    label: ".disputes-tab-compact-exposed-text-left-CTN",
    value: ".disputes-tab-compact-exposed-text-right-CTN"
  },
  client: {
    name: ".client_card_info_name",
    address: ".client_card_info_address",
    ssn: "#customer-side-panel-ssn-right",
    dob: "#customer-side-panel-ssn-right-dob",
    cell: "#customer-side-panel-ssn-right-cellnumber",
    home: "#customer-side-panel-ssn-right-home-phone-number",
    email: "#customer-side-panel-ssn-right-email",
    started: "#customer-side-panel-ssn-right-started",
    id: "#customer-side-panel-client-id-right-started"
  },
  sections: {
    disputed: "#append-dispute-item-div-disputed",
    positive: "#append-dispute-item-div-positive"
  },
  disputeType: 'input[id^="dispute-item-dispute-type-for-move"]'
};

/* ===================== UI HELPERS — TAG CHIPS ===================== */

function getTagValues(container) {
  return [...container.querySelectorAll('.cr-chip-del')].map(b => b.dataset.val);
}

function setupTagInput(container, initialValues) {
  const input = container.querySelector('.cr-tags-in');
  initialValues.forEach(val => {
    const chip = document.createElement('span');
    chip.className = 'cr-chip';
    chip.innerHTML = `${val}<button class="cr-chip-del" data-val="${val}">×</button>`;
    chip.querySelector('.cr-chip-del').onclick = () => chip.remove();
    container.insertBefore(chip, input);
  });
  input.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, '').toLowerCase();
      if (val && !getTagValues(container).includes(val)) {
        const chip = document.createElement('span');
        chip.className = 'cr-chip';
        chip.innerHTML = `${val}<button class="cr-chip-del" data-val="${val}">×</button>`;
        chip.querySelector('.cr-chip-del').onclick = () => chip.remove();
        container.insertBefore(chip, input);
      }
      input.value = '';
    } else if (e.key === 'Backspace' && !input.value) {
      const chips = container.querySelectorAll('.cr-chip');
      if (chips.length) chips[chips.length - 1].remove();
    }
  });
  container.addEventListener('click', () => input.focus());
}

/* ===================== UI HELPERS — DRAG & DROP ===================== */

function setupFieldDrag(list) {
  let dragged = null;
  list.querySelectorAll('.cr-fitem').forEach(item => {
    item.setAttribute('draggable', 'true');
    item.addEventListener('dragstart', () => {
      dragged = item;
      setTimeout(() => item.classList.add('cr-dragging'), 0);
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('cr-dragging');
      list.querySelectorAll('.cr-fitem').forEach(i => i.classList.remove('cr-dragover'));
      list.querySelectorAll('.cr-fitem-num').forEach((num, i) => { num.textContent = `#${i + 1}`; });
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (dragged === item) return;
      list.querySelectorAll('.cr-fitem').forEach(i => i.classList.remove('cr-dragover'));
      item.classList.add('cr-dragover');
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragged || dragged === item) return;
      const items = [...list.querySelectorAll('.cr-fitem')];
      const dragIdx = items.indexOf(dragged);
      const dropIdx = items.indexOf(item);
      if (dragIdx < dropIdx) item.after(dragged);
      else item.before(dragged);
    });
  });
}

function makeDraggable(panel, handle) {
  let ox = 0, oy = 0, mx = 0, my = 0;
  handle.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    ox = rect.left; oy = rect.top; mx = e.clientX; my = e.clientY;
    panel.style.right = 'auto';
    panel.style.left = ox + 'px';
    panel.style.top = oy + 'px';
    const move = e2 => {
      panel.style.top = (oy + e2.clientY - my) + 'px';
      panel.style.left = (ox + e2.clientX - mx) + 'px';
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

/* ===================== ALIAS UI ===================== */

function parseAliasGroups(text) {
  if (!text) return [];
  return text.split('\n').map(l => l.trim()).filter(l => l && l.includes('=')).map(l => {
    const eqIdx = l.indexOf('=');
    const main = l.slice(0, eqIdx).trim();
    const aliases = l.slice(eqIdx + 1).split(',').map(a => a.trim()).filter(Boolean);
    return { main, aliases };
  });
}

function serializeAliasGroups(groups) {
  return groups.map(g => `${g.main} = ${g.aliases.join(', ')}`).join('\n');
}

function buildAliasCard(group) {
  const card = document.createElement('div');
  card.className = 'cr-alias-card';

  const chipsHTML = group.aliases.map(a => `<span class="cr-chip-xs">${a}</span>`).join('');
  const editChipsHTML = group.aliases.map(a =>
    `<span class="cr-chip">${a}<button class="cr-chip-del" data-val="${a}">×</button></span>`
  ).join('');

  card.innerHTML = `
    <div class="cr-alias-head">
      <span class="cr-alias-main">${group.main || '<sin nombre>'}</span>
      <span class="cr-alias-count">${group.aliases.length} alias</span>
      <div class="cr-alias-actions">
        <button class="cr-alias-toggle" title="Editar">✏️</button>
        <button class="cr-alias-remove" title="Eliminar">✕</button>
      </div>
    </div>
    <div class="cr-alias-chips-row">${chipsHTML}</div>
    <div class="cr-alias-edit-form">
      <div class="cr-alias-label-sm">Nombre principal</div>
      <input class="cr-alias-main-input" value="${group.main}" placeholder="ej: capital one">
      <div class="cr-alias-label-sm">Aliases — Enter o coma para agregar</div>
      <div class="cr-tags cr-alias-chips-edit">${editChipsHTML}<input class="cr-tags-in" placeholder="alias..."></div>
    </div>
  `;

  const editContainer = card.querySelector('.cr-alias-chips-edit');
  editContainer.querySelectorAll('.cr-chip-del').forEach(btn => {
    btn.onclick = () => btn.closest('.cr-chip').remove();
  });
  const editInput = editContainer.querySelector('.cr-tags-in');
  editInput.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && editInput.value.trim()) {
      e.preventDefault();
      const val = editInput.value.trim().replace(/,$/, '').toLowerCase();
      if (val && !getTagValues(editContainer).includes(val)) {
        const chip = document.createElement('span');
        chip.className = 'cr-chip';
        chip.innerHTML = `${val}<button class="cr-chip-del" data-val="${val}">×</button>`;
        chip.querySelector('.cr-chip-del').onclick = () => chip.remove();
        editContainer.insertBefore(chip, editInput);
      }
      editInput.value = '';
    } else if (e.key === 'Backspace' && !editInput.value) {
      const chips = editContainer.querySelectorAll('.cr-chip');
      if (chips.length) chips[chips.length - 1].remove();
    }
  });
  editContainer.addEventListener('click', () => editInput.focus());

  card.querySelector('.cr-alias-toggle').onclick = () => {
    const form = card.querySelector('.cr-alias-edit-form');
    const isOpen = form.classList.toggle('open');
    card.classList.toggle('expanded', isOpen);
    if (!isOpen) {
      const mainVal = card.querySelector('.cr-alias-main-input').value.trim();
      const aliases = getTagValues(editContainer);
      card.querySelector('.cr-alias-main').textContent = mainVal || '<sin nombre>';
      card.querySelector('.cr-alias-count').textContent = `${aliases.length} alias`;
      card.querySelector('.cr-alias-chips-row').innerHTML = aliases.map(a => `<span class="cr-chip-xs">${a}</span>`).join('');
    }
  };

  card.querySelector('.cr-alias-remove').onclick = () => card.remove();

  return card;
}

function setupAliasPane(pane, initialText) {
  const list = pane.querySelector('#crAliasList');
  const search = pane.querySelector('#crAliasSearch');
  const addBtn = pane.querySelector('#crAliasAddBtn');

  parseAliasGroups(initialText).forEach(g => list.appendChild(buildAliasCard(g)));

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    list.querySelectorAll('.cr-alias-card').forEach(card => {
      const main = card.querySelector('.cr-alias-main-input').value.toLowerCase();
      const aliases = getTagValues(card.querySelector('.cr-alias-chips-edit')).join(' ').toLowerCase();
      card.style.display = (!q || main.includes(q) || aliases.includes(q)) ? '' : 'none';
    });
    list.querySelector('.cr-alias-empty')?.remove();
    const visible = [...list.querySelectorAll('.cr-alias-card')].filter(c => c.style.display !== 'none');
    if (q && !visible.length) {
      const empty = document.createElement('div');
      empty.className = 'cr-alias-empty';
      empty.textContent = `Sin resultados para "${search.value}"`;
      list.appendChild(empty);
    }
  });

  addBtn.onclick = () => {
    search.value = '';
    list.querySelectorAll('.cr-alias-card').forEach(c => c.style.display = '');
    list.querySelector('.cr-alias-empty')?.remove();
    const card = buildAliasCard({ main: '', aliases: [] });
    list.insertBefore(card, list.firstChild);
    card.querySelector('.cr-alias-toggle').click();
    card.querySelector('.cr-alias-main-input').focus();
  };
}

function getAliasesText(pane) {
  return serializeAliasGroups(
    [...pane.querySelectorAll('.cr-alias-card')].map(card => ({
      main: card.querySelector('.cr-alias-main-input').value.trim(),
      aliases: getTagValues(card.querySelector('.cr-alias-chips-edit'))
    })).filter(g => g.main)
  );
}

/* ===================== CONFIG PANEL ===================== */

function openConfigPanel() {
  document.getElementById('clasificadorConfigPanel')?.remove();
  const panel = document.createElement('div');
  panel.id = 'clasificadorConfigPanel';

  const sortedFields = [...ACCOUNT_FIELDS].sort((a, b) => {
    const ia = CONFIG.fieldOrder.findIndex(f => f.key === a.key);
    const ib = CONFIG.fieldOrder.findIndex(f => f.key === b.key);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const fieldItemsHTML = sortedFields.map((f, i) => {
    const fc = CONFIG.fieldOrder.find(o => o.key === f.key) || { showLabel: true };
    return `
    <div class="cr-fitem" data-key="${f.key}">
      <span class="cr-fitem-grip">⠿</span>
      <label class="cr-toggle-wrap" title="Mostrar etiqueta">
        <input type="checkbox" class="cr-fitem-label-toggle" ${fc.showLabel !== false ? 'checked' : ''}>
        <span class="cr-toggle-ui"></span>
      </label>
      <span class="cr-fitem-name">${f.label}</span>
      <span class="cr-fitem-num">#${i + 1}</span>
    </div>`;
  }).join('');

  const personalFields = CONFIG.personalFields || DEFAULT_CONFIG.personalFields;
  const personalItemsHTML = personalFields.map(f => `
    <div class="cr-fitem" data-key="${f.key}" data-label="${f.label}">
      <span class="cr-fitem-grip">⠿</span>
      <label class="cr-toggle-wrap">
        <input type="checkbox" class="cr-fitem-toggle" ${f.enabled ? 'checked' : ''}>
        <span class="cr-toggle-ui"></span>
      </label>
      <span class="cr-fitem-name">${f.label}</span>
    </div>`).join('');

  panel.innerHTML = `
    <div class="cr-ph" id="crCfgHandle">
      <div class="cr-ph-title">⚙️ Configuraciones</div>
      <button class="cr-x" id="crCfgClose">✕</button>
    </div>
    <div class="cr-tabs">
      <button class="cr-tab active" data-tab="agencies">Agencias</button>
      <button class="cr-tab" data-tab="statuses">Estados</button>
      <button class="cr-tab" data-tab="colors">Colores</button>
      <button class="cr-tab" data-tab="fields">Campos</button>
      <button class="cr-tab" data-tab="aliases">Aliases</button>
      <button class="cr-tab" data-tab="personal">Personal</button>
    </div>
    <div class="cr-body">
      <div class="cr-pane active" id="cr-pane-agencies">
        <div class="cr-lbl">Agencias Colectoras — Enter o coma para agregar</div>
        <div class="cr-tags" id="crTagsAgencies"><input class="cr-tags-in" placeholder="ej: lvnv, midland..."></div>
        <div class="cr-tag-hint">Backspace para eliminar el último</div>
      </div>
      <div class="cr-pane" id="cr-pane-statuses">
        <div class="cr-lbl">Account Status — Cerrada Positiva</div>
        <textarea class="cr-ta" id="cfg_closedStatuses" rows="3">${CONFIG.closedStatuses.join('\n')}</textarea>
        <div class="cr-lbl">Payment Status — Cerrada Positiva</div>
        <textarea class="cr-ta" id="cfg_paymentStatuses" rows="2">${CONFIG.paymentStatuses.join('\n')}</textarea>
        <div class="cr-lbl">Estados Negativos</div>
        <textarea class="cr-ta" id="cfg_negativeStatuses" rows="4">${CONFIG.negativeStatuses.join('\n')}</textarea>
      </div>
      <div class="cr-pane" id="cr-pane-colors">
        <div class="cr-lbl">Colores de Resaltado</div>
        <div class="cr-colors">
          <div class="cr-clr"><input type="color" id="cfg_colorOpen" value="${CONFIG.colors.open}"><span>Open</span></div>
          <div class="cr-clr"><input type="color" id="cfg_colorClosed" value="${CONFIG.colors.closedPositive}"><span>Closed+</span></div>
          <div class="cr-clr"><input type="color" id="cfg_colorInquiry" value="${CONFIG.colors.inquiryLinked || '#ffcc00'}"><span>Inquiry</span></div>
        </div>
      </div>
      <div class="cr-pane" id="cr-pane-fields">
        <div class="cr-lbl">Toggle para mostrar/ocultar etiqueta por campo — Arrastrá para reordenar</div>
        <div class="cr-fields" id="crFieldList">${fieldItemsHTML}</div>
      </div>
      <div class="cr-pane" id="cr-pane-aliases">
        <div class="cr-alias-search-row">
          <input id="crAliasSearch" placeholder="Buscar acreedor o alias...">
          <button class="cr-alias-add-btn" id="crAliasAddBtn">+ Agregar</button>
        </div>
        <div id="crAliasList"></div>
      </div>
      <div class="cr-pane" id="cr-pane-personal">
        <div class="cr-lbl">Opciones</div>
        <div class="cr-fitem" style="margin-bottom:6px">
          <label class="cr-toggle-wrap">
            <input type="checkbox" class="cr-fitem-toggle" id="cfg_showPersonalLabels" ${CONFIG.showPersonalLabels ? 'checked' : ''}>
            <span class="cr-toggle-ui"></span>
          </label>
          <span class="cr-fitem-name" style="margin-left:8px">Mostrar etiquetas (ej: Name: John)</span>
        </div>
        <div class="cr-lbl">Activá y reordenná los campos del cliente en el output</div>
        <div class="cr-fields" id="crPersonalList">${personalItemsHTML}</div>
      </div>
    </div>
    <div class="cr-footer">
      <button class="cr-btn cr-btn-ok" id="crCfgSave">💾 Guardar</button>
      <button class="cr-btn cr-btn-rst" id="crCfgReset">🔄 Restaurar</button>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelectorAll('.cr-tab').forEach(tab => {
    tab.onclick = () => {
      panel.querySelectorAll('.cr-tab').forEach(t => t.classList.remove('active'));
      panel.querySelectorAll('.cr-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      panel.querySelector(`#cr-pane-${tab.dataset.tab}`)?.classList.add('active');
    };
  });

  setupTagInput(document.getElementById('crTagsAgencies'), CONFIG.agencies);
  setupFieldDrag(document.getElementById('crFieldList'));
  setupFieldDrag(document.getElementById('crPersonalList'));
  setupAliasPane(panel.querySelector('#cr-pane-aliases'), CONFIG.aliases || '');
  makeDraggable(panel, panel.querySelector('#crCfgHandle'));

  document.getElementById('crCfgClose').onclick = () => panel.remove();

  document.getElementById('crCfgSave').onclick = () => {
    CONFIG.agencies = getTagValues(document.getElementById('crTagsAgencies'));
    CONFIG.closedStatuses = document.getElementById('cfg_closedStatuses').value
      .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
    CONFIG.paymentStatuses = document.getElementById('cfg_paymentStatuses').value
      .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
    CONFIG.negativeStatuses = document.getElementById('cfg_negativeStatuses').value
      .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
    CONFIG.colors.open = document.getElementById('cfg_colorOpen').value;
    CONFIG.colors.closedPositive = document.getElementById('cfg_colorClosed').value;
    CONFIG.colors.inquiryLinked = document.getElementById('cfg_colorInquiry').value;
    CONFIG.aliases = getAliasesText(panel.querySelector('#cr-pane-aliases'));
    CONFIG.fieldOrder = [...document.getElementById('crFieldList').querySelectorAll('.cr-fitem')]
      .map(item => ({
        key: item.dataset.key,
        showLabel: item.querySelector('.cr-fitem-label-toggle').checked
      }));
    CONFIG.showPersonalLabels = document.getElementById('cfg_showPersonalLabels').checked;
    CONFIG.personalFields = [...document.getElementById('crPersonalList').querySelectorAll('.cr-fitem')]
      .map(item => ({
        key: item.dataset.key,
        label: item.dataset.label,
        enabled: item.querySelector('.cr-fitem-toggle').checked
      }));
    saveConfig(CONFIG);
    panel.remove();
    showToast('✅ Configuración guardada', '#00ff88');
  };

  document.getElementById('crCfgReset').onclick = () => {
    if (confirm('¿Restaurar configuración por defecto?')) {
      CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      saveConfig(CONFIG);
      panel.remove();
      showToast('🔄 Configuración restaurada', '#ffcc00');
    }
  };
}

/* ===================== STYLES ===================== */

const buttonAnimationStyles = `
  @keyframes crGlow { 0%,100%{box-shadow:0 0 10px #00ff88,0 0 20px #00ff8844} 50%{box-shadow:0 0 20px #00ff88,0 0 30px #00ff8866} }
  @keyframes crPulse { 0%,100%{transform:scale(1);box-shadow:0 0 5px #ff6600,0 0 15px #ff660044} 50%{transform:scale(1.05);box-shadow:0 0 15px #ff6600,0 0 25px #ff660066} }
  @keyframes crSuccessAnim { 0%{transform:scale(1)} 50%{transform:scale(1.1)} 100%{transform:scale(1)} }
  @keyframes crSlideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes crFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes crScaleIn { from{opacity:0;transform:translate(-50%,-50%) scale(0.93)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }

  /* Toolbar */
  #crToolbar { position:fixed; top:120px; right:20px; z-index:99999; display:flex; flex-direction:column; align-items:center; gap:5px; }
  #clasificadorBTN { width:48px; height:48px; background:#111; color:#fff; border:2px solid #00ff8844; border-radius:12px; cursor:pointer; font-size:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; transition:all 0.25s ease; line-height:1; }
  #clasificadorBTN:hover:not(:disabled) { background:#1a1a1a; border-color:#00ff88; }
  #clasificadorBTN:disabled { cursor:not-allowed; opacity:0.8; }
  #clasificadorBTN .cr-ver { font-size:9px; color:#555; font-family:monospace; margin-top:2px; }
  #crSettingsBtn { width:36px; height:36px; background:#111; color:#555; border:1px solid #222; border-radius:8px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all 0.25s ease; }
  #crSettingsBtn:hover { color:#fff; border-color:#444; background:#1a1a1a; transform:rotate(45deg); }
  .clasificador-glow { animation:crGlow 2s ease-in-out infinite; }
  .clasificador-pulse { animation:crPulse 0.8s ease-in-out infinite; }
  .clasificador-success { animation:crSuccessAnim 0.6s ease-in-out; }

  /* Config Panel */
  #clasificadorConfigPanel { position:fixed; top:70px; right:70px; z-index:999999; background:#161616; color:#fff; border-radius:14px; width:440px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 0 0 1px #2a2a2a,0 20px 50px rgba(0,0,0,0.75); animation:crSlideIn 0.25s ease; overflow:hidden; }
  .cr-ph { padding:15px 16px 0; display:flex; justify-content:space-between; align-items:center; cursor:grab; flex-shrink:0; }
  .cr-ph:active { cursor:grabbing; }
  .cr-ph-title { font-size:14px; font-weight:bold; }
  .cr-x { width:26px; height:26px; border-radius:50%; background:#222; border:none; color:#666; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .cr-x:hover { background:#ff4444; color:#fff; }
  .cr-tabs { display:flex; gap:2px; padding:12px 16px 0; border-bottom:1px solid #222; margin-top:10px; overflow-x:auto; flex-shrink:0; }
  .cr-tabs::-webkit-scrollbar { height:0; }
  .cr-tab { padding:6px 10px; border:none; background:transparent; color:#555; cursor:pointer; font-size:12px; border-radius:6px 6px 0 0; transition:all 0.2s; white-space:nowrap; position:relative; bottom:-1px; flex:1; text-align:center; }
  .cr-tab:hover { color:#bbb; background:#1c1c1c; }
  .cr-tab.active { color:#fff; background:#1c1c1c; border-bottom:2px solid #00ff88; }
  .cr-body { flex:1; overflow-y:auto; padding:14px 16px; min-height:0; }
  .cr-body::-webkit-scrollbar { width:3px; }
  .cr-body::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
  .cr-pane { display:none; animation:crFadeIn 0.18s ease; }
  .cr-pane.active { display:block; }
  .cr-lbl { font-size:11px; color:#666; margin-bottom:5px; margin-top:12px; }
  .cr-lbl:first-child { margin-top:0; }
  .cr-ta { width:100%; background:#111; color:#ddd; border:1px solid #222; border-radius:7px; padding:9px; font-size:12px; box-sizing:border-box; resize:vertical; font-family:monospace; transition:border-color 0.2s; }
  .cr-ta:focus { outline:none; border-color:#333; }
  .cr-tags { background:#111; border:1px solid #222; border-radius:7px; padding:7px; display:flex; flex-wrap:wrap; gap:5px; min-height:52px; cursor:text; transition:border-color 0.2s; }
  .cr-tags:focus-within { border-color:#333; }
  .cr-chip { background:#1d1d1d; border:1px solid #2a2a2a; color:#ccc; padding:3px 8px 3px 9px; border-radius:20px; font-size:11px; display:flex; align-items:center; gap:5px; animation:crFadeIn 0.15s; }
  .cr-chip-del { cursor:pointer; color:#444; line-height:1; background:none; border:none; padding:0; font-size:13px; transition:color 0.15s; }
  .cr-chip-del:hover { color:#ff4444; }
  .cr-tags-in { background:transparent; border:none; outline:none; color:#ccc; font-size:11px; flex:1; min-width:80px; padding:2px 3px; }
  .cr-tag-hint { font-size:10px; color:#444; margin-top:4px; }
  .cr-colors { display:flex; gap:14px; flex-wrap:wrap; margin-top:4px; }
  .cr-clr { display:flex; flex-direction:column; align-items:center; gap:5px; }
  .cr-clr span { font-size:10px; color:#666; }
  .cr-clr input[type=color] { width:42px; height:34px; border-radius:7px; border:1px solid #2a2a2a; cursor:pointer; background:none; padding:2px; }
  .cr-fields { display:flex; flex-direction:column; gap:6px; margin-top:4px; }
  .cr-fitem { background:#1a1a1a; border:1px solid #222; border-radius:8px; padding:9px 12px; display:flex; align-items:center; gap:9px; cursor:grab; font-size:12px; transition:all 0.2s; user-select:none; }
  .cr-fitem:active { cursor:grabbing; }
  .cr-fitem.cr-dragging { opacity:0.35; }
  .cr-fitem.cr-dragover { border-color:#00ff88; background:#121f15; }
  .cr-fitem-grip { color:#333; }
  .cr-fitem-name { flex:1; color:#bbb; }
  .cr-fitem-num { font-size:10px; color:#444; font-family:monospace; }
  .cr-toggle-wrap { display:flex; align-items:center; flex-shrink:0; cursor:pointer; }
  .cr-fitem-toggle { display:none; }
  .cr-toggle-ui { width:28px; height:16px; background:#222; border:1px solid #2a2a2a; border-radius:8px; position:relative; transition:background 0.2s; }
  .cr-toggle-ui::after { content:''; position:absolute; width:10px; height:10px; background:#444; border-radius:50%; top:2px; left:2px; transition:all 0.2s; }
  .cr-fitem-toggle:checked + .cr-toggle-ui { background:#003a20; border-color:#00ff8855; }
  .cr-fitem-toggle:checked + .cr-toggle-ui::after { left:14px; background:#00ff88; }
  .cr-footer { padding:12px 16px; border-top:1px solid #1e1e1e; display:flex; gap:9px; flex-shrink:0; }
  .cr-btn { flex:1; padding:10px; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:5px; }
  .cr-btn-ok { background:#00ff88; color:#000; }
  .cr-btn-ok:hover { background:#00d970; }
  .cr-btn-rst { background:#1e1e1e; color:#666; border:1px solid #2a2a2a; }
  .cr-btn-rst:hover { background:#252525; color:#ccc; }

  /* Version Modal */
  #crVersionModal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#161616; color:#fff; border-radius:18px; z-index:9999999; width:420px; max-width:94vw; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 0 0 1px #2a2a2a,0 30px 80px rgba(0,0,0,0.9); animation:crScaleIn 0.28s cubic-bezier(.16,1,.3,1); overflow:hidden; }
  .cr-vm-header { padding:28px 26px 20px; background:linear-gradient(135deg,#0d1f12 0%,#111 60%); border-bottom:1px solid #1e1e1e; position:relative; }
  .cr-vm-badge { display:inline-flex; align-items:center; gap:6px; background:#00ff8818; border:1px solid #00ff8840; color:#00ff88; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; margin-bottom:10px; }
  .cr-vm-title { font-size:22px; font-weight:700; letter-spacing:-0.5px; }
  .cr-vm-subtitle { font-size:12px; color:#555; margin-top:4px; }
  .cr-vm-close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:50%; background:#222; border:none; color:#666; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .cr-vm-close:hover { background:#ff4444; color:#fff; }
  .cr-vm-body { flex:1; overflow-y:auto; padding:18px 26px; }
  .cr-vm-body::-webkit-scrollbar { width:3px; }
  .cr-vm-body::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
  .cr-vm-entry { display:flex; gap:14px; padding:12px 0; border-bottom:1px solid #1a1a1a; }
  .cr-vm-entry:last-child { border-bottom:none; }
  .cr-vm-entry.current .cr-vm-ver { color:#00ff88; border-color:#00ff8840; background:#00ff8810; }
  .cr-vm-ver { font-size:10px; font-family:monospace; font-weight:700; color:#444; border:1px solid #2a2a2a; border-radius:6px; padding:2px 7px; white-space:nowrap; align-self:flex-start; margin-top:1px; min-width:38px; text-align:center; }
  .cr-vm-note { font-size:13px; color:#bbb; line-height:1.5; flex:1; }
  .cr-vm-entry.current .cr-vm-note { color:#fff; }
  .cr-vm-footer { padding:16px 26px; border-top:1px solid #1e1e1e; }
  .cr-vm-btn { width:100%; padding:12px; background:#00ff88; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:700; font-size:14px; transition:all 0.2s; letter-spacing:0.2px; }
  .cr-vm-btn:hover { background:#00d970; transform:translateY(-1px); box-shadow:0 4px 20px #00ff8840; }

  /* Output Preview */
  #crOverlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999997; animation:crFadeIn 0.2s ease; }
  #crOutputPanel { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#161616; color:#fff; border-radius:14px; z-index:999999; width:540px; max-width:92vw; max-height:82vh; box-shadow:0 0 0 1px #2a2a2a,0 20px 60px rgba(0,0,0,0.8); display:flex; flex-direction:column; animation:crScaleIn 0.22s ease; }
  .cr-out-head { padding:15px 18px; border-bottom:1px solid #1e1e1e; display:flex; justify-content:space-between; align-items:center; }
  .cr-out-stats { padding:10px 18px; border-bottom:1px solid #1a1a1a; display:flex; gap:8px; flex-wrap:wrap; }
  .cr-stat { background:#1a1a1a; border:1px solid #222; border-radius:20px; padding:3px 10px; font-size:11px; color:#888; }
  .cr-stat b { color:#ddd; }
  #crOutputPanel textarea { flex:1; background:#0d0d0d; color:#aaa; border:none; padding:14px 18px; font-family:monospace; font-size:12px; resize:none; outline:none; line-height:1.7; min-height:220px; }
  #crOutputPanel textarea::-webkit-scrollbar { width:3px; }
  #crOutputPanel textarea::-webkit-scrollbar-thumb { background:#2a2a2a; }
  .cr-out-foot { padding:12px 18px; border-top:1px solid #1e1e1e; display:flex; gap:9px; }
  .cr-copy-btn { flex:1; padding:11px; background:#00ff88; color:#000; border:none; border-radius:9px; cursor:pointer; font-weight:bold; font-size:13px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:7px; }
  .cr-copy-btn:hover { background:#00d970; }
  .cr-copy-btn.copied { background:#00aaff; color:#fff; }
  .cr-dismiss-btn { padding:11px 16px; background:#1e1e1e; color:#666; border:1px solid #2a2a2a; border-radius:9px; cursor:pointer; font-size:13px; transition:all 0.2s; }
  .cr-dismiss-btn:hover { background:#252525; color:#ccc; }

  /* Alias Cards */
  .cr-alias-card { background:#1a1a1a; border:1px solid #222; border-radius:9px; margin-bottom:7px; overflow:hidden; transition:border-color 0.2s; }
  .cr-alias-card.expanded { border-color:#2e2e2e; }
  .cr-alias-head { display:flex; align-items:center; gap:8px; padding:9px 12px; }
  .cr-alias-main { flex:1; font-size:12px; color:#ccc; font-weight:600; }
  .cr-alias-count { font-size:10px; color:#444; font-family:monospace; white-space:nowrap; }
  .cr-alias-actions { display:flex; gap:4px; }
  .cr-alias-toggle, .cr-alias-remove { width:22px; height:22px; border-radius:5px; border:none; cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; padding:0; }
  .cr-alias-toggle { background:#222; color:#666; }
  .cr-alias-toggle:hover { background:#2a2a2a; color:#ccc; }
  .cr-alias-remove { background:#1e1e1e; color:#555; }
  .cr-alias-remove:hover { background:#ff4444; color:#fff; }
  .cr-alias-chips-row { padding:0 12px 8px; display:flex; flex-wrap:wrap; gap:4px; }
  .cr-chip-xs { background:#111; border:1px solid #222; color:#777; padding:2px 7px; border-radius:20px; font-size:10px; }
  .cr-alias-edit-form { border-top:1px solid #1e1e1e; padding:10px 12px; display:none; background:#141414; }
  .cr-alias-edit-form.open { display:block; animation:crFadeIn 0.15s ease; }
  .cr-alias-label-sm { font-size:10px; color:#555; margin-bottom:4px; margin-top:8px; }
  .cr-alias-label-sm:first-child { margin-top:0; }
  .cr-alias-main-input { width:100%; background:#111; color:#ddd; border:1px solid #222; border-radius:6px; padding:6px 8px; font-size:12px; box-sizing:border-box; outline:none; transition:border-color 0.2s; margin-bottom:6px; }
  .cr-alias-main-input:focus { border-color:#333; }
  .cr-alias-search-row { display:flex; gap:7px; margin-bottom:10px; }
  .cr-alias-search-row input { flex:1; background:#111; color:#ccc; border:1px solid #222; border-radius:7px; padding:7px 10px; font-size:12px; outline:none; transition:border-color 0.2s; }
  .cr-alias-search-row input:focus { border-color:#333; }
  .cr-alias-add-btn { background:#00ff88; color:#000; border:none; border-radius:7px; padding:7px 12px; font-size:11px; font-weight:bold; cursor:pointer; white-space:nowrap; transition:background 0.2s; }
  .cr-alias-add-btn:hover { background:#00d970; }
  .cr-alias-empty { text-align:center; color:#444; font-size:12px; padding:20px 0; }
`;

const styleEl = document.createElement('style');
styleEl.textContent = buttonAnimationStyles;
document.head.appendChild(styleEl);

function setButtonAnimation(status) {
  const btn = document.getElementById('clasificadorBTN');
  if (!btn) return;
  
  btn.classList.remove('clasificador-glow', 'clasificador-pulse', 'clasificador-success');
  
  if (status === 'pulse') {
    btn.classList.add('clasificador-pulse');
    btn.style.cursor = 'not-allowed';
    btn.disabled = true;
  } else if (status === 'success') {
    btn.classList.add('clasificador-success');
    setTimeout(() => {
      btn.classList.remove('clasificador-success');
      btn.classList.add('clasificador-glow');
      btn.style.cursor = 'pointer';
      btn.disabled = false;
    }, 600);
  } else if (status === 'idle') {
    btn.classList.add('clasificador-glow');
    btn.style.cursor = 'pointer';
    btn.disabled = false;
  }
}

/* ===================== UI HELPERS ===================== */

function addButton() {
  if (document.getElementById('crToolbar')) return;
  const toolbar = document.createElement('div');
  toolbar.id = 'crToolbar';
  toolbar.innerHTML = `
    <button id="clasificadorBTN" aria-label="Ejecutar clasificador (v${SCRIPT_VERSION})">
      📋<span class="cr-ver">v${SCRIPT_VERSION}</span>
    </button>
    <button id="crSettingsBtn" aria-label="Configuración" title="Configuración">⚙️</button>
  `;
  document.body.appendChild(toolbar);
  document.getElementById('clasificadorBTN').onclick = run;
  document.getElementById('crSettingsBtn').onclick = openConfigPanel;
  setButtonAnimation('idle');
}

function highlight(item, color) {
  item.style.border = `3px solid ${color}`;
  item.style.borderRadius = "8px";
  item.style.boxShadow = `0 0 10px ${color}66`;
}

function clearHighlight(item) {
  item.style.border = "";
  item.style.borderRadius = "";
  item.style.boxShadow = "";
}

function clearAllHighlights() {
  document.querySelectorAll(".dispute-outer-sample-container").forEach(clearHighlight);
}

function showToast(message, color = "#00ff88", duration = 5000) {
  document.getElementById("clasificadorToast")?.remove();
  const toast = document.createElement("div");
  toast.id = "clasificadorToast";
  Object.assign(toast.style, {
    position: "fixed", bottom: "30px", right: "30px",
    background: "#1a1a1a", color: "#fff", padding: "14px 20px",
    borderRadius: "10px", zIndex: "999999", fontSize: "14px",
    boxShadow: `0 0 15px ${color}66`,
    border: `2px solid ${color}`,
    transition: "opacity 0.5s ease",
    maxWidth: "320px"
  });
  toast.innerHTML = message;
  toast.setAttribute("role", "alert");
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, duration);
}

function showVersionModal() {
  document.getElementById('crVersionOverlay')?.remove();
  document.getElementById('crVersionModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'crVersionOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999998;animation:crFadeIn 0.2s ease';
  document.body.appendChild(overlay);

  const entriesHTML = Object.entries(VERSION_NOTES).map(([ver, note]) => `
    <div class="cr-vm-entry${ver === SCRIPT_VERSION ? ' current' : ''}">
      <span class="cr-vm-ver">v${ver}</span>
      <span class="cr-vm-note">${note}</span>
    </div>`).join('');

  const modal = document.createElement('div');
  modal.id = 'crVersionModal';
  modal.innerHTML = `
    <div class="cr-vm-header">
      <div class="cr-vm-badge">📶 CreditRadar</div>
      <div class="cr-vm-title">¿Qué hay de nuevo?</div>
      <div class="cr-vm-subtitle">Versión actual — v${SCRIPT_VERSION}</div>
      <button class="cr-vm-close" id="crVmClose">✕</button>
    </div>
    <div class="cr-vm-body">${entriesHTML}</div>
    <div class="cr-vm-footer">
      <button class="cr-vm-btn" id="crVmOk">Entendido 🚀</button>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => { overlay.remove(); modal.remove(); };
  overlay.onclick = close;
  document.getElementById('crVmClose').onclick = close;
  document.getElementById('crVmOk').onclick = close;
}

function checkVersionUpdate() {
  const versionKey = "clasificador_lastVersion";
  const lastVersion = GM_getValue(versionKey, null);

  if (lastVersion !== SCRIPT_VERSION) {
    GM_setValue(versionKey, SCRIPT_VERSION);
    setTimeout(showVersionModal, 1200);
  }
}

function showUpdateAvailableModal(latestVer) {
  document.getElementById('crUpdateOverlay')?.remove();
  document.getElementById('crUpdateModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'crUpdateOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999998;animation:crFadeIn 0.2s ease';
  document.body.appendChild(overlay);

  const modal = document.createElement('div');
  modal.id = 'crUpdateModal';
  modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#161616;color:#fff;border-radius:18px;z-index:9999999;width:400px;max-width:94vw;box-shadow:0 0 0 1px #2a2a2a,0 30px 80px rgba(0,0,0,0.9);animation:crScaleIn 0.28s cubic-bezier(.16,1,.3,1);overflow:hidden;';
  
  modal.innerHTML = `
    <div class="cr-vm-header" style="background:linear-gradient(135deg,#021426 0%,#111 60%);">
      <div class="cr-vm-badge" style="background:#00aaff18;border-color:#00aaff40;color:#00aaff;">🚀 Actualización Disponible</div>
      <div class="cr-vm-title">¡Nueva versión encontrada!</div>
      <div class="cr-vm-subtitle">La versión v\${latestVer} está lista. (Actual: v\${SCRIPT_VERSION})</div>
      <button class="cr-vm-close" id="crUpClose">✕</button>
    </div>
    <div class="cr-vm-body" style="text-align:center;padding:34px 20px;">
      <div style="font-size:48px;margin-bottom:18px;animation:crPulse 2s infinite;border-radius:50%;width:80px;height:80px;line-height:80px;margin:0 auto 18px;background:#1a1a1a;box-shadow: 0 0 20px #00aaff33;">✨</div>
      <p style="color:#ddd;font-size:14px;line-height:1.6;margin-bottom:0;">Da clic en el botón de abajo para instalar la nueva versión.<br><span style="color:#888;font-size:12px;display:block;margin-top:8px;">(Tampermonkey te pedirá confirmación)</span></p>
    </div>
    <div class="cr-vm-footer" style="display:flex;gap:12px;">
      <button class="cr-vm-btn" id="crUpInstall" style="background:#00aaff;color:#fff;flex:2;box-shadow:0 4px 15px #00aaff40;">Instalar v\${latestVer}</button>
      <button class="cr-vm-btn" id="crUpLater" style="background:#1e1e1e;color:#888;border:1px solid #2a2a2a;flex:1;">Más tarde</button>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => { overlay.remove(); modal.remove(); };
  overlay.onclick = close;
  document.getElementById('crUpClose').onclick = close;
  document.getElementById('crUpLater').onclick = close;
  document.getElementById('crUpInstall').onclick = () => {
    window.location.href = "https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js";
    close();
  };
}

function checkForUpdates() {
  const GITHUB_URL = "https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js";
  
  if (typeof GM_xmlhttpRequest !== "undefined") {
    GM_xmlhttpRequest({
      method: "GET",
      url: GITHUB_URL + "?t=" + Date.now(),
      onload: function(response) {
        if (response.status === 200) {
          const match = response.responseText.match(/@version\\s+([0-9.]+)/);
          if (match && match[1]) {
            const remoteVersion = parseFloat(match[1]);
            const currentVersion = parseFloat(SCRIPT_VERSION);
            if (remoteVersion > currentVersion) {
              setTimeout(() => showUpdateAvailableModal(match[1]), 2500);
            }
          }
        }
      }
    });
  } else {
    fetch(GITHUB_URL + "?t=" + Date.now())
      .then(res => res.text())
      .then(text => {
        const match = text.match(/@version\\s+([0-9.]+)/);
        if (match && match[1]) {
          const remoteVersion = parseFloat(match[1]);
          const currentVersion = parseFloat(SCRIPT_VERSION);
          if (remoteVersion > currentVersion) {
            setTimeout(() => showUpdateAvailableModal(match[1]), 2500);
          }
        }
      }).catch(e => console.warn("[Clasificador] Error verificando update en github", e));
  }
}

function createProgressPanel() {
  const panel = document.createElement("div");
  panel.id = "clasificadorProgress";
  Object.assign(panel.style, {
    position: "fixed", top: "200px", right: "20px",
    background: "#111", color: "#fff", padding: "15px",
    borderRadius: "10px", zIndex: "99999", fontSize: "14px",
    minWidth: "200px", boxShadow: "0 0 10px rgba(0,0,0,0.5)"
  });
  panel.innerHTML = `<b>⚡ Procesando...</b><br><br><span id="progressText">Iniciando...</span>`;
  document.body.appendChild(panel);
}

function updateProgress(current, total, name) {
  const el = document.getElementById("progressText");
  if (el) el.innerHTML = `Dispute ${current} / ${total}<br><span style="color:#aaa;font-size:12px">${name || ""}</span>`;
}

function removeProgressPanel() {
  document.getElementById("clasificadorProgress")?.remove();
}

function showOutputPreview(output, stats) {
  document.getElementById('crOverlay')?.remove();
  document.getElementById('crOutputPanel')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'crOverlay';
  document.body.appendChild(overlay);

  const { accounts, inquiries, personal, skippedOpen, skippedClosed, linkedInquiries } = stats;
  const panel = document.createElement('div');
  panel.id = 'crOutputPanel';
  panel.innerHTML = `
    <div class="cr-out-head">
      <b>📋 Resultado</b>
      <button class="cr-x" id="crOutClose">✕</button>
    </div>
    <div class="cr-out-stats">
      <span class="cr-stat"><b>${accounts}</b> cuentas</span>
      <span class="cr-stat"><b>${inquiries}</b> inquiries</span>
      <span class="cr-stat"><b>${personal}</b> personal</span>
      <span class="cr-stat" style="color:${CONFIG.colors.open}"><b>${skippedOpen}</b> open</span>
      <span class="cr-stat" style="color:${CONFIG.colors.closedPositive}"><b>${skippedClosed}</b> closed+</span>
      <span class="cr-stat" style="color:${CONFIG.colors.inquiryLinked || '#ffcc00'}"><b>${linkedInquiries}</b> linked</span>
    </div>
    <textarea readonly>${output}</textarea>
    <div class="cr-out-foot">
      <button class="cr-copy-btn" id="crCopyBtn">📋 Copiar al Clipboard</button>
      <button class="cr-dismiss-btn" id="crOutDismiss">Cerrar</button>
    </div>
  `;
  document.body.appendChild(panel);

  const close = () => { overlay.remove(); panel.remove(); };
  overlay.onclick = close;
  document.getElementById('crOutClose').onclick = close;
  document.getElementById('crOutDismiss').onclick = close;
  document.getElementById('crCopyBtn').onclick = async () => {
    await navigator.clipboard.writeText(output);
    const btn = document.getElementById('crCopyBtn');
    btn.textContent = '✅ Copiado!';
    btn.classList.add('copied');
    setTimeout(() => close(), 800);
  };
}

/* ===================== DOM HELPERS ===================== */

/**
 * @template T
 * @param {string} selector
 * @param {ParentNode} parent
 * @param {number} timeout
 * @returns {Promise<T|null>}
 */
async function waitForElement(selector, parent = document, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const el = parent.querySelector(selector);
      if (el) return el;
    } catch (e) {
      console.warn("[Clasificador] Query error:", e);
    }
    await SLEEP(120);
  }
  console.warn(`[Clasificador] Timeout waiting for: ${selector}`);
  return null;
}

/**
 * @param {string} selector
 * @param {ParentNode} parent
 * @returns {Element[]}
 */
function queryAll(selector, parent = document) {
  try {
    return [...parent.querySelectorAll(selector)];
  } catch (e) {
    console.warn(`[Clasificador] QueryAll error for ${selector}:`, e);
    return [];
  }
}

/**
 * @param {string} selector
 * @param {ParentNode} parent
 * @returns {Element|null}
 */
function queryOne(selector, parent = document) {
  try {
    return parent.querySelector(selector);
  } catch (e) {
    console.warn(`[Clasificador] QueryOne error for ${selector}:`, e);
    return null;
  }
}

/* ===================== BURO COLUMN DETECTION ===================== */

function getBuroStatus(item, buro) {
  return {
    indispute: !!queryOne(SELECTORS.compact.indispute(buro), item),
    negative: !!queryOne(SELECTORS.compact.negative(buro), item),
    positive: !!queryOne(SELECTORS.compact.positive(buro), item),
    deleted: !!queryOne(SELECTORS.compact.deleted(buro), item),
    none: !!queryOne(SELECTORS.compact.noneText(buro), item)
  };
}

function getActiveColumns(item) {
  return BUROS.map(b => {
    const status = getBuroStatus(item, b);
    return (status.indispute || status.negative) && !status.positive && !status.deleted;
  });
}

function hasInDispute(item) {
  return BUROS.some(b => {
    const status = getBuroStatus(item, b);
    return status.indispute || status.negative;
  }) || !!queryOne(".disputes-tab-compact-indispute-text-CTN", item);
}

function quickDetectStatus(item) {
  const isAllPositive = BUROS.every(b => {
    const status = getBuroStatus(item, b);
    return status.positive || status.deleted || status.none || (!status.indispute && !status.negative);
  });
  return { skip: isAllPositive };
}

/* ===================== BLOCK PARSING ===================== */

function getBestValue(row, activeCols) {
  for (let i = 0; i < 3; i++) {
    if (!activeCols[i]) continue;
    const v = row[i + 1]?.innerText.trim() || "";
    const clean = v.replace(/\s+/g, "").replace(/[-*]/g, "").toLowerCase();
    if (clean && !IGNORE_VALUES.has(clean)) return v;
  }
  return "";
}

function getValues(blocks, index, activeCols) {
  return activeCols
    .map((active, i) => active ? (blocks[index + 1 + i]?.innerText || "").toLowerCase().trim() : null)
    .filter(v => v !== null);
}

/**
 * @typedef {Object} ParsedAccount
 * @property {string} name
 * @property {string} number
 * @property {string} balance
 * @property {string} dateOpened
 * @property {boolean} isOpen
 * @property {boolean} isClosedPositive
 * @property {boolean} isCollection
 * @property {string[]} addresses
 */

/**
 * @param {Element[]} blocks
 * @param {boolean[]} activeCols
 * @returns {ParsedAccount}
 */
function parseAccountBlocks(blocks, activeCols) {
  const result = {
    name: "", number: "", balance: "", dateOpened: "",
    isOpen: false, isClosedPositive: false, isCollection: false,
    addresses: []
  };
  let hasNegative = false;
  let accountStatusMatch = false;
  let paymentStatusMatch = false;
  const addrParts = [{}, {}, {}];

  for (let i = 0; i < blocks.length; i++) {
    if (!blocks[i].classList.contains(SELECTORS.detail.sideTitles)) continue;
    const title = blocks[i].innerText.trim().toLowerCase();
    const row = [blocks[i], blocks[i + 1], blocks[i + 2], blocks[i + 3]];
    const vals = getValues(blocks, i, activeCols);

    switch (title) {
      case "account name":
        result.name = getBestValue(row, activeCols);
        break;
      case "account number":
        result.number = getBestValue(row, activeCols);
        break;
      case "balance":
        result.balance = getBestValue(row, activeCols);
        break;
      case "date opened":
        result.dateOpened = getBestValue(row, activeCols);
        break;
      case "account status":
        result.isOpen = vals.some(v => v === "open");
        accountStatusMatch = vals.some(v => CONFIG.closedStatuses.some(s => v.includes(s)));
        if (vals.some(v => CONFIG.negativeStatuses.some(n => v.includes(n)))) hasNegative = true;
        break;
      case "payment status":
        paymentStatusMatch = vals.some(v => CONFIG.paymentStatuses.some(s => v.includes(s)));
        if (vals.some(v => CONFIG.negativeStatuses.some(n => v.includes(n)))) hasNegative = true;
        break;
      case "account type":
      case "account type detail":
        if (!result.isCollection) result.isCollection = vals.some(v => v.includes("collection"));
        break;
      case "address":
      case "city":
      case "state":
      case "zip":
        activeCols.forEach((active, idx) => {
          if (!active) return;
          const val = (blocks[i + 1 + idx]?.innerText || "").replace(/\s+/g, " ").replace(/[-*]/g, "").trim();
          if (val && val !== "-") addrParts[idx][title] = val;
        });
        break;
    }
  }

  if (!hasNegative && (accountStatusMatch || paymentStatusMatch)) result.isClosedPositive = true;

  result.addresses = [...new Set(
    activeCols.map((active, i) => {
      if (!active) return null;
      const p = addrParts[i];
      return [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");
    }).filter(Boolean)
  )];

  return result;
}

/* ===================== AGENCY DETECTION ===================== */

function isAgency(name) {
  if (!name) return false;
  const clean = name.toLowerCase();
  return CONFIG.agencies.some(a => clean.includes(a));
}

/* ===================== POSITIVE OPEN MAP ===================== */

/**
 * @returns {Map<string, Element>}
 */
function buildPositiveOpenMap() {
  const map = new Map();
  const section = queryOne(SELECTORS.sections.positive);
  if (!section) return map;
  
  const items = queryAll(SELECTORS.compact.container, section);
  for (const item of items) {
    const rows = queryAll(SELECTORS.compactRow.label, item);
    const hasOpen = rows.some(row => {
      const label = row.innerText.trim().toLowerCase();
      const value = row.nextElementSibling?.innerText.trim().toLowerCase();
      return label === "open" && value === "yes";
    });
    if (!hasOpen) continue;
    const fullName = queryOne(SELECTORS.compact.name, item)?.innerText.trim().toLowerCase() || "";
    const creditor = fullName.split(" - ")[0].trim();
    if (creditor) map.set(creditor, item);
  }
  return map;
}

/* ===================== STRING SIMILARITY ===================== */

/**
 * @param {string} s
 * @returns {string[]}
 */
function getWords(s) {
  return s.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * @param {string} s
 * @returns {string[]}
 */
function getPrefixes(s, len = 4) {
  return s.split(/\s+/).map(w => w.slice(0, len)).filter(p => p.length >= 3);
}

/**
 * Calculates Jaccard similarity between two strings
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/* ===================== INQUIRY MATCHING ===================== */

/**
 * @param {string} name
 * @param {Map<string, Element>} map
 * @param {AliasMap} aliasMap
 * @returns {Element|null}
 */
function getLinkedAccount(name, map, aliasMap) {
  if (!name || !map.size) return null;
  const resolvedInquiry = resolveAlias(name, aliasMap);
  const normalizedInquiry = normalizeForMatch(resolvedInquiry);

  for (const [creditor, item] of map) {
    const resolvedCreditor = resolveAlias(creditor, aliasMap);
    const normalizedCreditor = normalizeForMatch(resolvedCreditor);

    if (normalizedInquiry === normalizedCreditor) return item;

    const wordsI = getWords(resolvedInquiry);
    const wordsC = getWords(resolvedCreditor);

    const exact = wordsI.filter(w => wordsC.includes(w));
    if (exact.length >= 2) return item;
    if (exact.length === 1 && wordsI.length === 1) return item;
    if (exact.length === 1 && exact[0].length > 5) return item;

    const prefixesI = getPrefixes(resolvedInquiry);
    const prefixesC = getPrefixes(resolvedCreditor);
    const pfx = prefixesI.filter(p => prefixesC.includes(p));
    if (pfx.length >= 2) return item;
    if (pfx.length === 1 && wordsI.length === 1 && prefixesI[0].length >= 4) return item;
    if (pfx.length === 1 && wordsI[prefixesI.indexOf(pfx[0])]?.length > 5) return item;

    if (resolvedInquiry.length >= 4 && resolvedCreditor.includes(resolvedInquiry)) return item;
    if (resolvedCreditor.length >= 4 && resolvedInquiry.includes(resolvedCreditor)) return item;

    const sim = jaccardSimilarity(resolvedInquiry, resolvedCreditor);
    if (sim >= 0.6) return item;
  }
  return null;
}

/* ===================== DISPUTE LOADER ===================== */

async function expandDisputeItem(link, item) {
  if (link.classList.contains(SELECTORS.compact.deletedHeader)) return false;
  if (!item) return false;

  const { skip } = quickDetectStatus(item);
  if (skip) return false;

  const expand = queryOne(SELECTORS.compact.expandBtn, item);
  if (!expand) return false;
  
  const match = expand.getAttribute("onclick")?.match(/'([^']+)'/);
  if (!match) return false;
  
  const id = match[1];
  expand.click();
  
  const detailPanel = await waitForElement(`#dispute-view-details-${id}`, document, 5000);
  if (!detailPanel?.offsetParent) return false;
  
  const fullBtn = queryOne(`#dispute-view-details-${id}`);
  if (fullBtn?.offsetParent) {
    fullBtn.click();
    await waitForElement(SELECTORS.detail.blocks, item, 7000);
  }
  
  return true;
}

async function loadRoundDisputes() {
  const section = queryOne(SELECTORS.sections.disputed);
  if (!section) return [];

  const allLinks = queryAll(SELECTORS.compact.disputeLink, section);
  const links = allLinks.filter(l => 
    l.innerText.trim() === "This Round" && l.offsetParent !== null
  );

  const results = await Promise.allSettled(
    links.map(async link => {
      const item = link.closest(SELECTORS.compact.container);
      const expanded = await expandDisputeItem(link, item);
      return { link, item, expanded };
    })
  );

  const expandedLinks = results
    .filter(r => r.status === "fulfilled" && r.value.expanded)
    .map(r => r.value.link);

  return [...links.filter(l => !expandedLinks.includes(l)), ...expandedLinks];
}

/* ===================== OUTPUT FORMATTER ===================== */

function formatAccount(a, NL) {
  const order = CONFIG.fieldOrder || DEFAULT_CONFIG.fieldOrder;
  const fieldValues = {
    name: a.name,
    number: a.number || "",
    balance: a.balance || "",
    dateOpened: a.dateOpened || ""
  };
  const fieldLabels = {
    name: "Account Name",
    number: "Account Number",
    balance: "Balance",
    dateOpened: "Date Opened"
  };
  let out = order.map(f => {
    const val = fieldValues[f.key];
    if (!val) return null;
    return f.showLabel !== false ? `${fieldLabels[f.key]}: ${val}` : val;
  }).filter(Boolean).join(NL) + NL;
  if (a.addresses?.length === 1) out += `Address: ${a.addresses[0]}${NL}`;
  else if (a.addresses?.length > 1) a.addresses.forEach((addr, i) => { out += `Address ${i + 1}: ${addr}${NL}`; });
  return out + NL;
}

function formatAccountList(label, accounts, NL) {
  if (!accounts.length) return "";
  return `${label} (${accounts.length})${NL}${NL}` + accounts.map(a => formatAccount(a, NL)).join("");
}

/* ===================== CLIENT DATA ===================== */

/**
 * @returns {Object}
 */
function getClientData() {
  return {
    name:    queryOne(SELECTORS.client.name)?.innerText.trim() || "",
    address: queryOne(SELECTORS.client.address)?.innerText.trim() || "",
    ssn:     queryOne(SELECTORS.client.ssn)?.innerText.trim() || "",
    dob:     queryOne(SELECTORS.client.dob)?.innerText.trim() || "",
    cell:    queryOne(SELECTORS.client.cell)?.innerText.trim() || "",
    home:    queryOne(SELECTORS.client.home)?.innerText.trim() || "",
    email:   queryOne(SELECTORS.client.email)?.innerText.trim() || "",
    started: queryOne(SELECTORS.client.started)?.innerText.trim() || "",
    id:      queryOne(SELECTORS.client.id)?.innerText.trim() || ""
  };
}

/* ===================== DISPUTE TYPE DETECTION ===================== */

/**
 * @param {Element} item
 * @returns {string}
 */
function getDisputeType(item) {
  const input = queryOne(SELECTORS.disputeType, item);
  return input?.value?.toLowerCase() || "";
}

/* ===================== MAIN ===================== */

async function run() {
  console.clear();
  console.log("🚀 CLASIFICADOR V18.0");
  setButtonAnimation('pulse');

  try {
    CONFIG = loadConfig();
    clearAllHighlights();
    createProgressPanel();

    const NL = "\r\n";
    const CLIENT = getClientData();

    const aliasMap = buildAliasMap();
    const positiveOpenMap = buildPositiveOpenMap();
    console.log(`✅ Aliases: ${aliasMap.size} | Positive open: ${positiveOpenMap.size}`);

    updateProgress(0, "?", "Cargando disputes...");
    const links = await loadRoundDisputes();
    const total = links.length;

    const COLLECTION_ACCOUNTS = [];
    const ORIGINAL_ACCOUNTS = [];
    const INQUIRIES = [];
    const PERSONAL = [];
    let SKIPPED_OPEN = 0;
    let SKIPPED_CLOSED = 0;
    let LINKED_INQUIRIES = 0;

    for (let idx = 0; idx < links.length; idx++) {
      const link = links[idx];
      if (link.classList.contains(SELECTORS.compact.deletedHeader)) continue;
      const item = link.closest(SELECTORS.compact.container);
      if (!item || !hasInDispute(item)) continue;

      const compactName = queryOne(SELECTORS.compact.name, item)?.innerText.trim() || "";
      updateProgress(idx + 1, total, compactName);

      const realType = getDisputeType(item);
      const activeCols = getActiveColumns(item);
      const hasActive = activeCols.some(Boolean);

      if (realType === "inquiry") {
        if (!hasActive) {
          console.log(`⏭️ Inquiry skipped: ${compactName}`);
          continue;
        }

        const linkedItem = getLinkedAccount(compactName, positiveOpenMap, aliasMap);
        if (linkedItem) {
          const color = CONFIG.colors.inquiryLinked || "#ffcc00";
          highlight(item, color);
          highlight(linkedItem, color);
          LINKED_INQUIRIES++;
        }
        INQUIRIES.push(compactName);
        continue;
      }

      if (compactName.includes("Incorrect") || compactName.includes("addresses") || compactName.includes("Dobs")) {
        const blocks = [
          ...queryAll(SELECTORS.detail.blocks, queryOne(SELECTORS.detail.left, item)),
          ...queryAll(SELECTORS.detail.blocks, queryOne(SELECTORS.detail.right, item))
        ];
        const parsed = parseAccountBlocks(blocks, activeCols);
        if (parsed.addresses.length) parsed.addresses.forEach(a => PERSONAL.push(a));
        else PERSONAL.push(compactName.replace(/\s+/g, " ").replace("- Incorrect", "").trim());
        continue;
      }

      const blocks = [
        ...queryAll(SELECTORS.detail.blocks, queryOne(SELECTORS.detail.left, item)),
        ...queryAll(SELECTORS.detail.blocks, queryOne(SELECTORS.detail.right, item))
      ];
      if (!blocks.length) continue;

      const parsed = parseAccountBlocks(blocks, activeCols);
      const finalName = parsed.name || compactName;

      if (parsed.isOpen) {
        console.log(`⏭️ Skipped (Open): ${finalName}`);
        highlight(item, CONFIG.colors.open);
        SKIPPED_OPEN++;
        continue;
      }

      if (parsed.isClosedPositive) {
        console.log(`⏭️ Skipped (Closed Positive): ${finalName}`);
        highlight(item, CONFIG.colors.closedPositive);
        SKIPPED_CLOSED++;
        continue;
      }

      const accountData = {
        name: finalName, number: parsed.number,
        balance: parsed.balance, dateOpened: parsed.dateOpened,
        addresses: parsed.addresses
      };

      if (parsed.isCollection || isAgency(finalName)) {
        COLLECTION_ACCOUNTS.push(accountData);
      } else {
        ORIGINAL_ACCOUNTS.push(accountData);
      }
    }

    removeProgressPanel();

    let output = "";
    const pFields = CONFIG.personalFields || DEFAULT_CONFIG.personalFields;
    const showLabels = CONFIG.showPersonalLabels !== false;
    pFields.filter(f => f.enabled).forEach(f => {
      let val = CLIENT[f.key];
      if (!val) return;
      if (f.key === "ssn") {
        const digits = val.replace(/\D/g, "");
        val = digits.slice(-4);
      }
      val = val.replace(/\n/g, NL);
      output += showLabels ? `${f.label}: ${val}` + NL : val + NL;
    });
    output += NL;
    output += formatAccountList("COLLECTION AGENCIES", COLLECTION_ACCOUNTS, NL);
    output += formatAccountList("ORIGINAL CREDITORS", ORIGINAL_ACCOUNTS, NL);

    if (INQUIRIES.length) {
      output += `INQUIRIES (${INQUIRIES.length})` + NL + NL;
      INQUIRIES.forEach(i => output += i + NL);
      output += NL + NL;
    }

    if (PERSONAL.length) {
      output += `PERSONAL INFORMATION (${PERSONAL.length})` + NL + NL;
      PERSONAL.forEach(p => output += p + NL);
    }

    console.log(output);
    showOutputPreview(output, {
      accounts: COLLECTION_ACCOUNTS.length + ORIGINAL_ACCOUNTS.length,
      inquiries: INQUIRIES.length,
      personal: PERSONAL.length,
      skippedOpen: SKIPPED_OPEN,
      skippedClosed: SKIPPED_CLOSED,
      linkedInquiries: LINKED_INQUIRIES
    });
    setButtonAnimation('success');

    queryOne(".disputes-tab-choose-viewCompact")?.click();

  } catch (error) {
    console.error("[Clasificador] Error fatal:", error);
    removeProgressPanel();
    showToast(`❌ Error: ${error.message}`, "#ff4444", 8000);
    setButtonAnimation('idle');
  }
}

window.addEventListener("load", () => {
  checkVersionUpdate();
  setTimeout(checkForUpdates, 2000);
  setTimeout(addButton, 3000);
});

})();
