// ==UserScript==
// @name         CreditRadar 
// @namespace    http://tampermonkey.net/
// @version      18.2
// @description  Organizador inteligente de disputes - clasifica colecciones, acreedores, inquiries e información personal automáticamente
// @author       
// @match        https://pulse.disputeprocess.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js
// @downloadURL  https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js
// ==/UserScript==

const SCRIPT_VERSION = "18.1";

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
  fieldOrder: ["name", "number", "balance", "dateOpened"],
  aliases: DEFAULT_ALIASES
};

/* ===================== CONFIG STORAGE ===================== */

function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.fieldOrder) parsed.fieldOrder = DEFAULT_CONFIG.fieldOrder;
      if (parsed.aliases === undefined) parsed.aliases = DEFAULT_ALIASES;
      return parsed;
    }
  } catch (e) {
    console.error("[Clasificador] Error loading config:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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
    email: "#customer-side-panel-ssn-right-email"
  },
  sections: {
    disputed: "#append-dispute-item-div-disputed",
    positive: "#append-dispute-item-div-positive"
  },
  disputeType: 'input[id^="dispute-item-dispute-type-for-move"]'
};

/* ===================== CONFIG PANEL ===================== */

const CONFIG_FIELDS = [
  { id: "agencies", label: "🏦 Agencias Colectoras", color: "#ffcc00", key: "agencies", height: 120, hint: "Una agencia por línea" },
  { id: "closedStatuses", label: "📋 Account Status (Cerrada Positiva)", color: "#00aaff", key: "closedStatuses", height: 80, hint: "Un estado por línea" },
  { id: "paymentStatuses", label: "💳 Payment Status (Cerrada Positiva)", color: "#00aaff", key: "paymentStatuses", height: 60, hint: "Un estado por línea" },
  { id: "negativeStatuses", label: "🚫 Estados Negativos", color: "#ff4444", key: "negativeStatuses", height: 80, hint: "Si cualquier buró tiene este estado → no es positiva" },
];

function buildFieldOrderHTML() {
  const current = CONFIG.fieldOrder;
  return `
    <div style="margin-bottom:15px">
      <b style="color:#aaffaa">📝 Orden de Campos</b>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
        ${ACCOUNT_FIELDS.map(f => `
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:#ccc">${f.label}</span>
            <select id="fieldOrder_${f.key}" style="background:#111;color:#fff;border:1px solid #333;border-radius:4px;padding:4px 8px;font-size:12px;cursor:pointer">
              ${[1, 2, 3, 4].map(pos => `
                <option value="${pos}" ${current.indexOf(f.key) + 1 === pos ? "selected" : ""}>Posición ${pos}</option>
              `).join("")}
            </select>
          </div>`).join("")}
      </div>
      <small style="color:#aaa">Elige la posición de cada campo en el output</small>
    </div>`;
}

function buildAliasHTML() {
  return `
    <div style="margin-bottom:15px">
      <b style="color:#ff99ff">🔗 Diccionario de Alias</b>
      <textarea id="cfg_aliases" style="width:100%;margin-top:8px;background:#111;color:#fff;
        border:1px solid #333;border-radius:6px;padding:8px;font-size:11px;
        height:120px;box-sizing:border-box;resize:vertical;font-family:monospace"
      >${CONFIG.aliases || ""}</textarea>
      <small style="color:#aaa">
        Formato: <b style="color:#ff99ff">nombre = alias1, alias2</b><br>
        Ejemplo: westlake = westlake fin, westlake service
      </small>
    </div>`;
}

function openConfigPanel() {
  document.getElementById("clasificadorConfigPanel")?.remove();
  const panel = document.createElement("div");
  panel.id = "clasificadorConfigPanel";
  Object.assign(panel.style, {
    position: "fixed", top: "80px", right: "60px",
    background: "#1a1a1a", color: "#fff", padding: "20px",
    borderRadius: "12px", zIndex: "999999", fontSize: "13px",
    width: "340px", boxShadow: "0 0 20px rgba(0,0,0,0.7)",
    maxHeight: "80vh", overflowY: "auto"
  });

  const header = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
      <b style="font-size:15px">⚙️ Configuraciones</b>
      <span id="configCloseBtn" style="cursor:pointer;font-size:18px;color:#aaa" role="button" aria-label="Cerrar">✕</span>
    </div>`;

  const fields = CONFIG_FIELDS.map(f => `
    <div style="margin-bottom:15px">
      <b style="color:${f.color}">${f.label}</b>
      <textarea id="cfg_${f.id}" style="width:100%;margin-top:8px;background:#111;color:#fff;
        border:1px solid #333;border-radius:6px;padding:8px;font-size:12px;
        height:${f.height}px;box-sizing:border-box;resize:vertical"
      >${CONFIG[f.key].join("\n")}</textarea>
      <small style="color:#aaa">${f.hint}</small>
    </div>`).join("");

  const colorPickers = `
    <div style="margin-bottom:15px">
      <b style="color:#00ff88">🎨 Colores de Resaltado</b>
      <div style="margin-top:8px;display:flex;gap:15px;align-items:center;flex-wrap:wrap">
        <label>Open<br><input type="color" id="cfg_colorOpen" value="${CONFIG.colors.open}" style="margin-top:4px;cursor:pointer"></label>
        <label>Closed Positive<br><input type="color" id="cfg_colorClosed" value="${CONFIG.colors.closedPositive}" style="margin-top:4px;cursor:pointer"></label>
        <label>Inquiry Linked<br><input type="color" id="cfg_colorInquiry" value="${CONFIG.colors.inquiryLinked || '#ffcc00'}" style="margin-top:4px;cursor:pointer"></label>
      </div>
    </div>`;

  const buttons = `
    <div style="display:flex;gap:10px;margin-top:10px">
      <button id="configSaveBtn" style="flex:1;padding:10px;background:#00ff88;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:bold">💾 Guardar</button>
      <button id="configResetBtn" style="flex:1;padding:10px;background:#333;color:#fff;border:none;border-radius:8px;cursor:pointer">🔄 Restaurar</button>
    </div>`;

  panel.innerHTML = header + fields + colorPickers + buildFieldOrderHTML() + buildAliasHTML() + buttons;
  document.body.appendChild(panel);

  document.getElementById("configCloseBtn").onclick = () => panel.remove();
  document.getElementById("configSaveBtn").onclick = () => {
    CONFIG_FIELDS.forEach(f => {
      CONFIG[f.key] = document.getElementById(`cfg_${f.id}`).value
        .split("\n").map(s => s.trim().toLowerCase()).filter(Boolean);
    });
    CONFIG.colors.open = document.getElementById("cfg_colorOpen").value;
    CONFIG.colors.closedPositive = document.getElementById("cfg_colorClosed").value;
    CONFIG.colors.inquiryLinked = document.getElementById("cfg_colorInquiry").value;
    const order = new Array(4);
    ACCOUNT_FIELDS.forEach(f => {
      const pos = parseInt(document.getElementById(`fieldOrder_${f.key}`).value) - 1;
      order[pos] = f.key;
    });
    CONFIG.fieldOrder = order.filter(Boolean);
    ACCOUNT_FIELDS.forEach(f => { if (!CONFIG.fieldOrder.includes(f.key)) CONFIG.fieldOrder.push(f.key); });
    CONFIG.aliases = document.getElementById("cfg_aliases").value.trim();
    saveConfig(CONFIG);
    panel.remove();
    showToast("✅ Configuración guardada", "#00ff88");
  };

  document.getElementById("configResetBtn").onclick = () => {
    if (confirm("¿Restaurar configuración por defecto?")) {
      CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      saveConfig(CONFIG);
      panel.remove();
      showToast("🔄 Configuración restaurada", "#ffcc00");
    }
  };
}

/* ===================== UI HELPERS ===================== */

function addButton() {
  if (document.getElementById("clasificadorBTN")) return;
  const btn = document.createElement("button");
  btn.id = "clasificadorBTN";
  btn.innerHTML = `📋<br><span style="font-size:10px">${SCRIPT_VERSION}</span>`;
  btn.setAttribute("aria-label", `Ejecutar clasificador (v${SCRIPT_VERSION})`);
  Object.assign(btn.style, {
    position: "fixed", top: "120px", right: "20px", zIndex: "99999",
    padding: "12px", background: "#111", color: "#fff", borderRadius: "8px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: "1.2"
  });
  btn.onclick = run;
  btn.addEventListener("contextmenu", e => { e.preventDefault(); openConfigPanel(); });
  document.body.appendChild(btn);
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

function showStats({ accounts, inquiries, personal, skippedOpen, skippedClosed, linkedInquiries }) {
  const panel = document.createElement("div");
  Object.assign(panel.style, {
    position: "fixed", top: "200px", right: "20px",
    background: "#111", color: "#fff", padding: "15px",
    borderRadius: "10px", zIndex: "99999", fontSize: "14px",
    boxShadow: "0 0 10px rgba(0,0,0,0.4)"
  });
  panel.innerHTML = `
    <b>📊 Pulse Stats</b><br><br>
    Accounts: ${accounts}<br>
    Inquiries: ${inquiries}<br>
    Personal Info: ${personal}<br>
    <span style="color:${CONFIG.colors.open}">Skipped (Open): ${skippedOpen}</span><br>
    <span style="color:${CONFIG.colors.closedPositive}">Skipped (Closed Positive): ${skippedClosed}</span><br>
    <span style="color:${CONFIG.colors.inquiryLinked || '#ffcc00'}">Inquiries (Linked Open): ${linkedInquiries}</span>
  `;
  document.body.appendChild(panel);
  setTimeout(() => panel.remove(), 8000);
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
  const fieldMap = {
    name: `Account Name: ${a.name}`,
    number: `Account Number: ${a.number || ""}`,
    balance: `Balance: ${a.balance || ""}`,
    dateOpened: `Date Opened: ${a.dateOpened || ""}`
  };
  const order = CONFIG.fieldOrder || DEFAULT_CONFIG.fieldOrder;
  let out = order.map(key => fieldMap[key]).filter(Boolean).join(NL) + NL;
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
    name: queryOne(SELECTORS.client.name)?.innerText.trim() || "",
    address: queryOne(SELECTORS.client.address)?.innerText.replace(/\n/g, ", ").trim() || "",
    ssn: queryOne(SELECTORS.client.ssn)?.innerText.trim() || "",
    dob: queryOne(SELECTORS.client.dob)?.innerText.trim() || "",
    cell: queryOne(SELECTORS.client.cell)?.innerText.trim() || "",
    email: queryOne(SELECTORS.client.email)?.innerText.trim() || ""
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
    output += `Name: ${CLIENT.name}` + NL;
    output += `Address: ${CLIENT.address}` + NL;
    output += `SSN: ${CLIENT.ssn}` + NL;
    output += `DOB: ${CLIENT.dob}` + NL;
    output += `Cell: ${CLIENT.cell}` + NL;
    output += `Email: ${CLIENT.email}` + NL + NL;
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

    showStats({
      accounts: COLLECTION_ACCOUNTS.length + ORIGINAL_ACCOUNTS.length,
      inquiries: INQUIRIES.length,
      personal: PERSONAL.length,
      skippedOpen: SKIPPED_OPEN,
      skippedClosed: SKIPPED_CLOSED,
      linkedInquiries: LINKED_INQUIRIES
    });

    await navigator.clipboard.writeText(output);
    console.log(output);

    const col = COLLECTION_ACCOUNTS.length;
    const orig = ORIGINAL_ACCOUNTS.length;
    const inq = INQUIRIES.length;
    showToast(`📋 Copiado — ${col} Collections, ${orig} Creditors, ${inq} Inquiries`, "#00ff88", 5000);

    queryOne(".disputes-tab-choose-viewCompact")?.click();

  } catch (error) {
    console.error("[Clasificador] Error fatal:", error);
    removeProgressPanel();
    showToast(`❌ Error: ${error.message}`, "#ff4444", 8000);
  }
}

window.addEventListener("load", () => setTimeout(addButton, 3000));

})();
