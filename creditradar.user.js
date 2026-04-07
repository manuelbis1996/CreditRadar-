// ==UserScript==
// @name         CreditRadar 📶
// @namespace    http://tampermonkey.net/
// @version      20.7
// @description  Organizador inteligente de disputes - clasifica colecciones, acreedores, inquiries e información personal automáticamente
// @author       MAnuelbis Encarnacion Abreu  
// @match        https://pulse.disputeprocess.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js
// @downloadURL  https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_VERSION = "20.7";

  const VERSION_NOTES = {
    "20.7": "⚡ Optimizaciones: matching O(n) con Sets, pre-cómputo de status, timeouts reducidos",
    "20.6": "🎨 Rediseño minimalista: sin glow, paleta teal suave, paneles limpios",
    "20.5": "🛡️ Correcciones: clipboard, historial corrupto, XSS y filtros de fecha",
    "20.4": "📐 El menú ya no se oculta al cambiar el tamaño de la ventana",
    "20.3": "📚 Historial de clientes: revisa, re-copia y filtra por rango de fechas",
    "20.2": "✏️ Panel de output interactivo: edita, reordena y elimina cuentas antes de copiar",
    "20.1": "🛡️ Escudo Anti-Disputas: Exclusión automática de Inquiries vinculadas a cuentas positivas",
    "20.0": "⚡ Turbocarga con MutationObservers y botonera flotante de cristal arrastrable",
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

  const STORAGE_KEY = "pulse_clasificador_config";
  const BUROS = ["equifax", "experian", "transunion"];
  const STOP_WORDS = new Set(["the", "of", "and", "for", "inc", "llc", "na", "bank", "usa", "corp", "co", "ltd"]);
  const IGNORE_VALUES = new Set(["na", "n/a", "unknown", "null", "undefined", "notreported", "-", ""]);

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

  const ACCOUNT_FIELDS = [
    { key: "name", label: "Account Name" },
    { key: "number", label: "Account Number" },
    { key: "balance", label: "Balance" },
    { key: "dateOpened", label: "Date Opened" }
  ];

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
      open: "#5eead4",
      closedPositive: "#60a5fa",
      inquiryLinked: "#fbbf24"
    },
    fieldOrder: [
      { key: "name", showLabel: true },
      { key: "number", showLabel: true },
      { key: "balance", showLabel: true },
      { key: "dateOpened", showLabel: true }
    ],
    showPersonalLabels: true,
    personalFields: [
      { key: "name", label: "Name", enabled: true },
      { key: "address", label: "Address", enabled: true },
      { key: "ssn", label: "SSN", enabled: true },
      { key: "dob", label: "DOB", enabled: true },
      { key: "cell", label: "Cell", enabled: true },
      { key: "home", label: "Home", enabled: false },
      { key: "email", label: "Email", enabled: true },
      { key: "started", label: "Started", enabled: false },
      { key: "id", label: "ID", enabled: false }
    ],
    aliases: DEFAULT_ALIASES,
    toolbarPos: { top: "120px", left: "calc(100vw - 80px)" }
  };

  const HISTORY_KEY = "cr_history";
  const HISTORY_MAX = 50;

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

  function loadConfig() {
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

  function loadHistory() {
    try {
      const raw = GM_getValue(HISTORY_KEY, '[]');
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error('[CreditRadar] Historial corrupto, limpiando...', e);
      GM_deleteValue(HISTORY_KEY);
      return [];
    }
  }

  function saveHistory(entries) {
    try {
      GM_setValue(HISTORY_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('[CreditRadar] Error guardando historial:', e);
    }
  }

  function addHistoryEntry(output, stats, personalHeader) {
    const firstLine = (personalHeader || '').split('\n').map(l => l.trim()).find(l => l) || 'Cliente';
    const clientName = firstLine.replace(/^Name:\s*/i, '').replace(/^Nombre:\s*/i, '').trim() || 'Cliente';
    const entries = loadHistory();
    entries.unshift({ id: Date.now(), clientName, output, stats });
    if (entries.length > HISTORY_MAX) entries.length = HISTORY_MAX;
    saveHistory(entries);
  }

  const buttonAnimationStyles = `
  @keyframes crSlideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes crFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes crScaleIn { from{opacity:0;transform:translate(-50%,-50%) scale(0.93)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }

  /* Toolbar */
  #crToolbar { position:fixed; z-index:99999; display:flex; flex-direction:column; align-items:center; gap:0; background:rgba(20,20,20,0.85); backdrop-filter:blur(8px); padding:8px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 4px 16px rgba(0,0,0,0.4); transition:padding 0.2s ease, opacity 0.2s ease; }
  #crToolbar:hover { padding:10px 8px; }
  #crToolbarGrip { width:100%; height:12px; cursor:grab; display:flex; justify-content:center; align-items:center; color:#555; font-size:10px; user-select:none; max-height:0; overflow:hidden; opacity:0; margin-bottom:0; transition:max-height 0.2s ease 0.4s, opacity 0.15s ease 0.4s, margin-bottom 0.2s ease 0.4s; }
  #crToolbar:hover #crToolbarGrip { max-height:18px; opacity:1; margin-bottom:6px; transition:max-height 0.2s ease 0s, opacity 0.15s ease 0s, margin-bottom 0.2s ease 0s; }
  #crToolbarGrip:active { cursor:grabbing; color:#5eead4; }
  #clasificadorBTN { width:48px; height:48px; background:#111; color:#fff; border:1px solid #2a2a2a; border-radius:8px; cursor:pointer; font-size:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; transition:all 0.25s ease; line-height:1; }
  #clasificadorBTN:hover:not(:disabled) { background:#1a1a1a; border-color:#5eead4; }
  #clasificadorBTN:disabled { cursor:not-allowed; opacity:0.8; }
  #clasificadorBTN .cr-ver { font-size:9px; color:#555; font-family:monospace; margin-top:2px; }
  .cr-tb-extras { display:flex; flex-direction:column; align-items:center; gap:6px; max-height:0; overflow:hidden; opacity:0; margin-top:0; transition:max-height 0.25s ease 0.4s, opacity 0.2s ease 0.4s, margin-top 0.2s ease 0.4s; }
  #crToolbar:hover .cr-tb-extras { max-height:120px; opacity:1; margin-top:6px; transition:max-height 0.25s ease 0s, opacity 0.2s ease 0s, margin-top 0.2s ease 0s; }
  #crSettingsBtn { width:36px; height:36px; background:#111; color:#555; border:1px solid #222; border-radius:8px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all 0.25s ease; }
  #crSettingsBtn:hover { color:#fff; border-color:#444; background:#1a1a1a; transform:rotate(45deg); }
  .clasificador-glow { border-color:#5eead4 !important; }
  .clasificador-pulse { opacity:0.7; }
  .clasificador-success { border-color:#5eead4 !important; }

  /* Config Panel */
  #clasificadorConfigPanel { position:fixed; top:70px; right:70px; z-index:999999; background:#161616; color:#fff; border-radius:12px; width:440px; max-height:88vh; display:flex; flex-direction:column; border:1px solid #2a2a2a; box-shadow:0 8px 32px rgba(0,0,0,0.45); animation:crSlideIn 0.25s ease; overflow:hidden; }
  .cr-ph { padding:15px 16px 0; display:flex; justify-content:space-between; align-items:center; cursor:grab; flex-shrink:0; }
  .cr-ph:active { cursor:grabbing; }
  .cr-ph-title { font-size:14px; font-weight:bold; }
  .cr-x { width:26px; height:26px; border-radius:50%; background:#222; border:none; color:#666; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .cr-x:hover { background:#f87171; color:#fff; }
  .cr-tabs { display:flex; gap:2px; padding:12px 16px 0; border-bottom:1px solid #222; margin-top:10px; overflow-x:auto; flex-shrink:0; }
  .cr-tabs::-webkit-scrollbar { height:0; }
  .cr-tab { padding:6px 12px; border:none; background:transparent; color:#555; cursor:pointer; font-size:12px; border-radius:6px 6px 0 0; transition:all 0.2s; white-space:nowrap; position:relative; bottom:-1px; flex:0 0 auto; }
  .cr-tab:hover { color:#bbb; background:#1c1c1c; }
  .cr-tab.active { color:#fff; background:#1c1c1c; border-bottom:2px solid #5eead4; }
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
  .cr-chip-del:hover { color:#f87171; }
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
  .cr-fitem.cr-dragover { border-color:#5eead4; background:#0d1e1d; }
  .cr-fitem-grip { color:#444; transition:color 0.2s; }
  .cr-fitem:hover .cr-fitem-grip { color:#666; }
  .cr-fitem-name { flex:1; color:#bbb; }
  .cr-fitem-num { font-size:10px; color:#444; font-family:monospace; }
  .cr-toggle-wrap { display:flex; align-items:center; flex-shrink:0; cursor:pointer; }
  .cr-fitem-toggle { display:none; }
  .cr-toggle-ui { width:28px; height:16px; background:#222; border:1px solid #2a2a2a; border-radius:8px; position:relative; transition:background 0.2s; }
  .cr-toggle-ui::after { content:''; position:absolute; width:10px; height:10px; background:#444; border-radius:50%; top:2px; left:2px; transition:all 0.2s; }
  .cr-fitem-toggle:checked + .cr-toggle-ui { background:#0d1e1d; border-color:#5eead455; }
  .cr-fitem-toggle:checked + .cr-toggle-ui::after { left:14px; background:#5eead4; }
  .cr-footer { padding:12px 16px; border-top:1px solid #1e1e1e; display:flex; gap:9px; flex-shrink:0; }
  .cr-btn { flex:1; padding:10px; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:5px; }
  .cr-btn-ok { background:#5eead4; color:#0f172a; }
  .cr-btn-ok:hover { background:#2dd4bf; }
  .cr-btn-rst { background:transparent; color:#555; border:1px solid #2a2a2a; flex:0 0 auto; padding:10px 18px; }
  .cr-btn-rst:hover { background:#1e1e1e; color:#ccc; }

  /* Version Modal */
  #crVersionModal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#161616; color:#fff; border-radius:12px; z-index:9999999; width:420px; max-width:94vw; max-height:85vh; display:flex; flex-direction:column; border:1px solid #2a2a2a; box-shadow:0 16px 48px rgba(0,0,0,0.55); animation:crScaleIn 0.28s cubic-bezier(.16,1,.3,1); overflow:hidden; }
  .cr-vm-header { padding:28px 26px 20px; background:#111; border-top:2px solid #5eead4; border-bottom:1px solid #1e1e1e; position:relative; }
  .cr-vm-badge { display:inline-flex; align-items:center; gap:6px; background:#5eead418; border:1px solid #5eead440; color:#5eead4; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; margin-bottom:10px; }
  .cr-vm-title { font-size:22px; font-weight:700; letter-spacing:-0.5px; }
  .cr-vm-subtitle { font-size:12px; color:#555; margin-top:4px; }
  .cr-vm-close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:50%; background:#222; border:none; color:#666; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .cr-vm-close:hover { background:#f87171; color:#fff; }
  .cr-vm-body { flex:1; overflow-y:auto; padding:18px 26px; }
  .cr-vm-body::-webkit-scrollbar { width:3px; }
  .cr-vm-body::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
  .cr-vm-entry { display:flex; gap:14px; padding:12px 0; border-bottom:1px solid #1a1a1a; }
  .cr-vm-entry:last-child { border-bottom:none; }
  .cr-vm-entry.current .cr-vm-ver { color:#5eead4; border-color:#5eead440; background:#5eead410; }
  .cr-vm-ver { font-size:10px; font-family:monospace; font-weight:700; color:#444; border:1px solid #2a2a2a; border-radius:6px; padding:2px 7px; white-space:nowrap; align-self:flex-start; margin-top:1px; min-width:38px; text-align:center; }
  .cr-vm-note { font-size:13px; color:#bbb; line-height:1.5; flex:1; }
  .cr-vm-entry.current .cr-vm-note { color:#fff; }
  .cr-vm-footer { padding:16px 26px; border-top:1px solid #1e1e1e; }
  .cr-vm-btn { width:100%; padding:12px; background:#5eead4; color:#0f172a; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:14px; transition:all 0.2s; letter-spacing:0.2px; }
  .cr-vm-btn:hover { background:#2dd4bf; }

  /* Output Preview */
  #crOverlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999997; animation:crFadeIn 0.2s ease; }
  #crOutputPanel { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#161616; color:#fff; border-radius:12px; z-index:999999; width:540px; max-width:92vw; max-height:90vh; border:1px solid #2a2a2a; box-shadow:0 8px 32px rgba(0,0,0,0.5); display:flex; flex-direction:column; animation:crScaleIn 0.22s ease; }
  .cr-out-head { padding:15px 18px; border-bottom:1px solid #1e1e1e; display:flex; justify-content:space-between; align-items:center; }
  .cr-out-stats { padding:10px 18px; border-bottom:1px solid #1a1a1a; display:flex; gap:8px; flex-wrap:wrap; }
  .cr-stat { background:#1a1a1a; border:1px solid #222; border-radius:20px; padding:3px 10px; font-size:11px; color:#888; }
  .cr-stat b { color:#ddd; }
  #crOutputPanel textarea { flex:1; background:#0d0d0d; color:#aaa; border:none; padding:14px 18px; font-family:monospace; font-size:12px; resize:none; outline:none; line-height:1.7; min-height:220px; }
  #crOutputPanel textarea::-webkit-scrollbar { width:3px; }
  #crOutputPanel textarea::-webkit-scrollbar-thumb { background:#2a2a2a; }
  .cr-out-foot { padding:12px 18px; border-top:1px solid #1e1e1e; display:flex; gap:9px; }
  .cr-copy-btn { flex:1; padding:11px; background:#5eead4; color:#0f172a; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:7px; }
  .cr-copy-btn:hover { background:#2dd4bf; }
  .cr-copy-btn.copied { background:#60a5fa; color:#fff; }
  .cr-dismiss-btn { padding:11px 16px; background:#1e1e1e; color:#666; border:1px solid #2a2a2a; border-radius:9px; cursor:pointer; font-size:13px; transition:all 0.2s; }
  .cr-dismiss-btn:hover { background:#252525; color:#ccc; }

  /* Alias Cards */
  .cr-alias-card { background:#1a1a1a; border:1px solid #222; border-radius:9px; margin-bottom:7px; overflow:hidden; transition:border-color 0.2s; }
  .cr-alias-card.expanded { border-color:#2e2e2e; }
  .cr-alias-head { display:flex; align-items:center; gap:8px; padding:9px 12px; }
  .cr-alias-main { flex:1; font-size:12px; color:#ccc; font-weight:600; }
  .cr-alias-count { font-size:10px; color:#444; font-family:monospace; white-space:nowrap; }
  .cr-alias-actions { display:flex; gap:4px; }
  .cr-alias-toggle, .cr-alias-remove { width:26px; height:26px; border-radius:5px; border:none; cursor:pointer; font-size:14px; line-height:1; display:flex; align-items:center; justify-content:center; transition:all 0.15s; padding:0; }
  .cr-alias-toggle:active, .cr-alias-remove:active { transform:scale(0.9); }
  .cr-alias-toggle { background:#222; color:#666; }
  .cr-alias-toggle:hover { background:#2a2a2a; color:#ccc; }
  .cr-alias-remove { background:#1e1e1e; color:#555; }
  .cr-alias-remove:hover { background:#f87171; color:#fff; }
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
  .cr-alias-add-btn { background:#5eead4; color:#000; border:none; border-radius:7px; padding:7px 12px; font-size:12px; font-weight:bold; cursor:pointer; white-space:nowrap; transition:background 0.2s; }
  .cr-alias-add-btn:hover { background:#2dd4bf; }
  .cr-alias-empty { text-align:center; color:#444; font-size:12px; padding:20px 0; }

  /* Output Editor */
  .cr-editor-section { margin-bottom:16px; }
  .cr-editor-section-head { display:flex; align-items:center; gap:8px; margin-bottom:7px; padding-bottom:6px; border-bottom:1px solid #1e1e1e; }
  .cr-editor-section-title { font-size:11px; color:#555; text-transform:uppercase; letter-spacing:0.5px; flex:1; }
  .cr-editor-section-badge { background:#1a1a1a; border:1px solid #222; color:#555; font-size:10px; font-family:monospace; padding:1px 7px; border-radius:10px; }
  .cr-editor-card { background:#1a1a1a; border:1px solid #222; border-radius:8px; margin-bottom:4px; overflow:hidden; transition:border-color 0.15s; }
  .cr-editor-card:hover { border-color:#2e2e2e; }
  .cr-editor-card-head { display:flex; align-items:center; gap:7px; padding:8px 10px; cursor:grab; user-select:none; }
  .cr-editor-card-head:active { cursor:grabbing; }
  .cr-editor-grip { color:#444; font-size:10px; flex-shrink:0; }
  .cr-editor-card:hover .cr-editor-grip { color:#666; }
  .cr-editor-name { flex:1; font-size:12px; color:#ccc; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
  .cr-editor-meta { font-size:10px; color:#444; font-family:monospace; white-space:nowrap; flex-shrink:0; }
  .cr-editor-actions { display:flex; gap:4px; flex-shrink:0; }
  .cr-editor-edit-btn, .cr-editor-del-btn { width:24px; height:24px; border-radius:5px; border:none; cursor:pointer; font-size:13px; line-height:1; display:flex; align-items:center; justify-content:center; transition:all 0.15s; padding:0; }
  .cr-editor-edit-btn:active, .cr-editor-del-btn:active { transform:scale(0.9); }
  .cr-editor-edit-btn { background:#222; color:#666; }
  .cr-editor-edit-btn:hover { background:#2a2a2a; color:#ccc; }
  .cr-editor-del-btn { background:#1e1e1e; color:#555; }
  .cr-editor-del-btn:hover { background:#f87171; color:#fff; }
  .cr-editor-form { border-top:1px solid #1e1e1e; padding:8px 10px; background:#141414; display:none; animation:crFadeIn 0.15s; }
  .cr-editor-form.open { display:block; }
  .cr-editor-field { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
  .cr-editor-field:last-child { margin-bottom:0; }
  .cr-editor-field-lbl { font-size:10px; color:#555; width:82px; flex-shrink:0; }
  .cr-editor-field-in { flex:1; background:#111; border:1px solid #222; border-radius:5px; padding:4px 7px; color:#ddd; font-size:12px; outline:none; transition:border-color 0.2s; }
  .cr-editor-field-in:focus { border-color:#333; }
  .cr-editor-str-item { display:flex; align-items:center; gap:8px; padding:6px 10px; background:#1a1a1a; border:1px solid #222; border-radius:7px; margin-bottom:4px; }
  .cr-editor-str-val { flex:1; font-size:12px; color:#ccc; }
  .cr-editor-str-del { width:22px; height:22px; border-radius:4px; border:none; background:#1e1e1e; color:#555; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .cr-editor-str-del:hover { background:#f87171; color:#fff; }
  .cr-editor-dragging { opacity:0.35; }
  .cr-editor-dragover { border-color:#5eead4 !important; background:#0d1e1d; }

  /* History Panel */
  #crHistoryPanel { position:fixed; top:70px; right:130px; z-index:999999; background:#161616; color:#fff; border-radius:12px; width:440px; max-height:88vh; display:flex; flex-direction:column; border:1px solid #2a2a2a; box-shadow:0 8px 32px rgba(0,0,0,0.45); animation:crSlideIn 0.25s ease; overflow:hidden; }
  #crHistoryBtn { width:36px; height:36px; background:#111; color:#555; border:1px solid #222; border-radius:8px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all 0.25s ease; }
  #crHistoryBtn:hover { color:#fff; border-color:#444; background:#1a1a1a; }
  .cr-hist-filter { display:flex; gap:6px; align-items:center; flex-wrap:wrap; padding:10px 16px; border-bottom:1px solid #1e1e1e; flex-shrink:0; }
  .cr-hist-date-in { background:#111; border:1px solid #222; border-radius:6px; padding:5px 8px; color:#ddd; font-size:11px; outline:none; transition:border-color 0.2s; width:110px; }
  .cr-hist-date-in:focus { border-color:#333; }
  .cr-hist-chips { display:flex; gap:5px; }
  .cr-hist-chip { padding:3px 10px; border-radius:20px; border:1px solid #222; background:#1a1a1a; color:#555; font-size:11px; cursor:pointer; transition:all 0.15s; }
  .cr-hist-chip.active { background:#0d1e1d; border-color:#5eead455; color:#5eead4; }
  .cr-hist-count { font-size:10px; color:#444; margin-left:auto; font-family:monospace; }
  .cr-hist-body { flex:1; overflow-y:auto; padding:12px 16px; min-height:0; }
  .cr-hist-body::-webkit-scrollbar { width:3px; }
  .cr-hist-body::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
  .cr-hist-entry { background:#1a1a1a; border:1px solid #222; border-radius:9px; margin-bottom:7px; padding:10px 12px; transition:border-color 0.2s; }
  .cr-hist-entry:hover { border-color:#2a2a2a; }
  .cr-hist-row { display:flex; align-items:baseline; gap:8px; margin-bottom:5px; }
  .cr-hist-name { flex:1; font-size:13px; color:#ccc; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .cr-hist-date { font-size:10px; color:#444; font-family:monospace; white-space:nowrap; flex-shrink:0; }
  .cr-hist-stats { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
  .cr-hist-actions { display:flex; gap:5px; justify-content:flex-end; }
  .cr-hist-btn { padding:4px 10px; border-radius:6px; border:none; cursor:pointer; font-size:11px; font-weight:bold; transition:all 0.15s; }
  .cr-hist-btn-view { background:#222; color:#888; }
  .cr-hist-btn-view:hover { background:#2a2a2a; color:#fff; }
  .cr-hist-btn-copy { background:#0d1e1d; color:#5eead4; border:1px solid #5eead430; }
  .cr-hist-btn-copy:hover { background:#5eead4; color:#000; }
  .cr-hist-btn-del { background:#1e1e1e; color:#555; }
  .cr-hist-btn-del:hover { background:#f87171; color:#fff; }
  .cr-hist-empty { text-align:center; color:#444; font-size:12px; padding:40px 0; }
  .cr-hist-footer { padding:12px 16px; border-top:1px solid #1e1e1e; flex-shrink:0; }
  .cr-hist-clear-btn { width:100%; padding:9px; background:transparent; color:#555; border:1px solid #2a2a2a; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold; transition:all 0.2s; }
  .cr-hist-clear-btn:hover { background:#f8717122; color:#f87171; border-color:#f8717144; }
`;

  function injectStyles() {
    if (document.getElementById('cr-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'cr-styles';
    styleEl.textContent = buttonAnimationStyles;
    document.head.appendChild(styleEl);
  }

  function waitForElement(selector, parent = document, timeout = 8000) {
    return new Promise(resolve => {
      try {
        const el = parent.querySelector(selector);
        if (el) return resolve(el);

        let settled = false;
        const finish = (el) => { if (!settled) { settled = true; observer.disconnect(); resolve(el); } };
        const observer = new MutationObserver(() => {
          const found = parent.querySelector(selector);
          if (found) finish(found);
        });
        observer.observe(parent, { childList: true, subtree: true });

        setTimeout(() => finish(parent.querySelector(selector)), timeout);
      } catch (e) {
        console.warn("[Clasificador] Query error:", e);
        resolve(null);
      }
    });
  }

  function queryAll(selector, parent = document) {
    try {
      return [...parent.querySelectorAll(selector)];
    } catch (e) {
      console.warn(`[Clasificador] QueryAll error for ${selector}:`, e);
      return [];
    }
  }

  function queryOne(selector, parent = document) {
    try {
      return parent.querySelector(selector);
    } catch (e) {
      console.warn(`[Clasificador] QueryOne error for ${selector}:`, e);
      return null;
    }
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

  function makeDraggable(panel, handle, onDragEnd) {
    let ox = 0, oy = 0, mx = 0, my = 0;
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button') && e.target !== handle) return;
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
        if (onDragEnd) onDragEnd(panel.style.left, panel.style.top);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  function bindClose(closeFn, ...elements) {
    elements.forEach(el => { if (el) el.onclick = closeFn; });
  }

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

  function clampToolbar() {
    const toolbar = document.getElementById('crToolbar');
    if (!toolbar) return;
    const rect = toolbar.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = parseFloat(toolbar.style.left);
    let top = parseFloat(toolbar.style.top);
    if (isNaN(left)) left = rect.left;
    if (isNaN(top)) top = rect.top;
    left = Math.min(Math.max(left, 0), vw - rect.width);
    top = Math.min(Math.max(top, 0), vh - rect.height);
    toolbar.style.left = left + 'px';
    toolbar.style.right = 'auto';
    toolbar.style.top = top + 'px';
  }

  function addButton(config, runFn, openConfigFn, showHistoryFn) {
    if (document.getElementById('crToolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.id = 'crToolbar';

    const tPos = config.toolbarPos || { top: "120px", left: "calc(100vw - 80px)" };
    toolbar.style.top = tPos.top;
    if (tPos.left) toolbar.style.left = tPos.left;
    else toolbar.style.right = "20px";

    toolbar.innerHTML = `
    <div id="crToolbarGrip" title="Arrastrar">⠿</div>
    <button id="clasificadorBTN" aria-label="Ejecutar clasificador (v${SCRIPT_VERSION})">
      📋<span class="cr-ver">v${SCRIPT_VERSION}</span>
    </button>
    <div class="cr-tb-extras">
      <button id="crHistoryBtn" aria-label="Historial" title="Historial">🕐</button>
      <button id="crSettingsBtn" aria-label="Configuración" title="Configuración">⚙️</button>
    </div>
  `;
    document.body.appendChild(toolbar);

    makeDraggable(toolbar, document.getElementById('crToolbarGrip'), (left, top) => {
      config.toolbarPos = { left, top };
      saveConfig(config);
    });

    document.getElementById('clasificadorBTN').onclick = runFn;
    document.getElementById('crHistoryBtn').onclick = showHistoryFn;
    document.getElementById('crSettingsBtn').onclick = openConfigFn;
    setButtonAnimation('idle');

    setTimeout(clampToolbar, 0);
    let _resizeTid;
    window.addEventListener('resize', () => {
      clearTimeout(_resizeTid);
      _resizeTid = setTimeout(clampToolbar, 100);
    });
  }

  function showToast(message, color = "#5eead4", duration = 5000) {
    document.getElementById("clasificadorToast")?.remove();
    const toast = document.createElement("div");
    toast.id = "clasificadorToast";
    Object.assign(toast.style, {
      position: "fixed", bottom: "30px", right: "30px",
      background: "#1a1a1a", color: "#fff", padding: "14px 20px",
      borderRadius: "8px", zIndex: "999999", fontSize: "14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      border: `1px solid ${color}`,
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
      borderRadius: "8px", zIndex: "99999", fontSize: "14px",
      minWidth: "200px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
    });
    panel.innerHTML = `<b>Procesando...</b><br><br><span id="progressText">Iniciando...</span>`;
    document.body.appendChild(panel);
  }

  function updateProgress(current, total, name) {
    const el = document.getElementById("progressText");
    const escapeHtml = str => (str||"").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    if (el) el.innerHTML = `Dispute ${current} / ${total}<br><span style="color:#aaa;font-size:12px">${escapeHtml(name)}</span>`;
  }

  function removeProgressPanel() {
    document.getElementById("clasificadorProgress")?.remove();
  }

  function createOverlay(id) {
    document.getElementById(id)?.remove();
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999998;animation:crFadeIn 0.2s ease';
    document.body.appendChild(overlay);
    return overlay;
  }

  function createModal(id, cssText) {
    document.getElementById(id)?.remove();
    const modal = document.createElement('div');
    modal.id = id;
    if (cssText) modal.style.cssText = cssText;
    document.body.appendChild(modal);
    return modal;
  }

  function showVersionModal() {
    const overlay = createOverlay('crVersionOverlay');
    const modal = createModal('crVersionModal');

    const entriesHTML = Object.entries(VERSION_NOTES).map(([ver, note]) => `
  <div class="cr-vm-entry${ver === SCRIPT_VERSION ? ' current' : ''}">
    <span class="cr-vm-ver">v${ver}</span>
    <span class="cr-vm-note">${note}</span>
  </div>`).join('');

    modal.innerHTML = `
  <div class="cr-vm-header">
    <div class="cr-vm-badge">📶 CreditRadar</div>
    <div class="cr-vm-title">¿Qué hay de nuevo?</div>
    <div class="cr-vm-subtitle">Versión actual — v${SCRIPT_VERSION}</div>
    <button class="cr-vm-close" id="crVmClose">✕</button>
  </div>
  <div class="cr-vm-body">${entriesHTML}</div>
  <div class="cr-vm-footer">
    <button class="cr-vm-btn" id="crVmOk">Entendido</button>
  </div>
`;

    const close = () => { overlay.remove(); modal.remove(); };
    bindClose(close, overlay, document.getElementById('crVmClose'), document.getElementById('crVmOk'));
  }

  function checkVersionUpdate() {
    const versionKey = "clasificador_lastVersion";
    const lastVersion = GM_getValue(versionKey, null);

    if (lastVersion !== SCRIPT_VERSION) {
      GM_setValue(versionKey, SCRIPT_VERSION);
      setTimeout(showVersionModal, 1200);
    }
  }

  function compareVersions(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const na = pa[i] ?? 0;
      const nb = pb[i] ?? 0;
      if (na !== nb) return na - nb;
    }
    return 0;
  }

  function showUpdateAvailableModal(latestVer) {
    const overlay = createOverlay('crUpdateOverlay');
    const modal = createModal('crUpdateModal', 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#161616;color:#fff;border-radius:12px;z-index:9999999;width:400px;max-width:94vw;border:1px solid #2a2a2a;box-shadow:0 16px 48px rgba(0,0,0,0.55);animation:crScaleIn 0.28s cubic-bezier(.16,1,.3,1);overflow:hidden;');

    modal.innerHTML = `
  <div class="cr-vm-header" style="background:#111;border-top:2px solid #60a5fa;">
    <div class="cr-vm-badge" style="background:#60a5fa18;border-color:#60a5fa40;color:#60a5fa;">Actualización Disponible</div>
    <div class="cr-vm-title">¡Nueva versión encontrada!</div>
    <div class="cr-vm-subtitle">La versión v${latestVer} está lista. (Actual: v${SCRIPT_VERSION})</div>
    <button class="cr-vm-close" id="crUpClose">✕</button>
  </div>
  <div class="cr-vm-body" style="text-align:center;padding:34px 20px;">
    <div style="font-size:36px;border-radius:8px;width:64px;height:64px;line-height:64px;margin:0 auto 18px;background:#1a1a1a;box-shadow:0 2px 8px rgba(0,0,0,0.3);">↑</div>
    <p style="color:#ddd;font-size:14px;line-height:1.6;margin-bottom:0;">Da clic en el botón de abajo para instalar la nueva versión.<br><span style="color:#888;font-size:12px;display:block;margin-top:8px;">(Tampermonkey te pedirá confirmación)</span></p>
  </div>
  <div class="cr-vm-footer" style="display:flex;gap:12px;">
    <button class="cr-vm-btn" id="crUpInstall" style="background:#60a5fa;color:#fff;flex:2;box-shadow:0 4px 15px #60a5fa40;">Instalar v${latestVer}</button>
    <button class="cr-vm-btn" id="crUpLater" style="background:#1e1e1e;color:#888;border:1px solid #2a2a2a;flex:1;">Más tarde</button>
  </div>
`;

    const close = () => { overlay.remove(); modal.remove(); };
    bindClose(close, overlay, document.getElementById('crUpClose'), document.getElementById('crUpLater'));
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
        onload: function (response) {
          if (response.status === 200) {
            const match = response.responseText.match(/@version\s+([0-9.]+)/);
            if (match && match[1]) {
              if (compareVersions(match[1], SCRIPT_VERSION) > 0) {
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
          const match = text.match(/@version\s+([0-9.]+)/);
          if (match && match[1]) {
            if (compareVersions(match[1], SCRIPT_VERSION) > 0) {
              setTimeout(() => showUpdateAvailableModal(match[1]), 2500);
            }
          }
        }).catch(e => console.warn("[Clasificador] Error verificando update en github", e));
    }
  }

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

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getWords(s) {
    return s.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  function getPrefixes(s, len = 4) {
    return s.split(/\s+/).map(w => w.slice(0, len)).filter(p => p.length >= 3);
  }

  function jaccardSimilarity(a, b) {
    const setA = new Set(a.split(/\s+/));
    const setB = new Set(b.split(/\s+/));
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  function getTagValues(container) {
    return [...container.querySelectorAll('.cr-chip-del')].map(b => b.dataset.val);
  }

  function createChip(val) {
    const chip = document.createElement('span');
    chip.className = 'cr-chip';
    const safeVal = escapeHtml(val);
    chip.innerHTML = `${safeVal}<button class="cr-chip-del" data-val="${safeVal}">×</button>`;
    chip.querySelector('.cr-chip-del').onclick = () => chip.remove();
    return chip;
  }

  function setupTagInput(container, initialValues) {
    const input = container.querySelector('.cr-tags-in');
    initialValues.forEach(val => {
      container.insertBefore(createChip(val), input);
    });
    input.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
        e.preventDefault();
        const val = input.value.trim().replace(/,$/, '').toLowerCase();
        if (val && !getTagValues(container).includes(val)) {
          container.insertBefore(createChip(val), input);
        }
        input.value = '';
      } else if (e.key === 'Backspace' && !input.value) {
        const chips = container.querySelectorAll('.cr-chip');
        if (chips.length) chips[chips.length - 1].remove();
      }
    });
    container.addEventListener('click', () => input.focus());
  }

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

    const safeMain = escapeHtml(group.main || '');
    const chipsHTML = group.aliases.map(a => `<span class="cr-chip-xs">${escapeHtml(a)}</span>`).join('');

    card.innerHTML = `
    <div class="cr-alias-head">
      <span class="cr-alias-main">${safeMain || '&lt;sin nombre&gt;'}</span>
      <span class="cr-alias-count">${group.aliases.length} alias</span>
      <div class="cr-alias-actions">
        <button class="cr-alias-toggle" title="Editar">✏️</button>
        <button class="cr-alias-remove" title="Eliminar">✕</button>
      </div>
    </div>
    <div class="cr-alias-chips-row">${chipsHTML}</div>
    <div class="cr-alias-edit-form">
      <div class="cr-alias-label-sm">Nombre principal</div>
      <input class="cr-alias-main-input" value="${safeMain}" placeholder="ej: capital one">
      <div class="cr-alias-label-sm">Aliases — Enter o coma para agregar</div>
      <div class="cr-tags cr-alias-chips-edit"><input class="cr-tags-in" placeholder="alias..."></div>
    </div>
  `;

    const editContainer = card.querySelector('.cr-alias-chips-edit');
    const editInput = editContainer.querySelector('.cr-tags-in');
    group.aliases.forEach(a => editContainer.insertBefore(createChip(a), editInput));
    editInput.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ',') && editInput.value.trim()) {
        e.preventDefault();
        const val = editInput.value.trim().replace(/,$/, '').toLowerCase();
        if (val && !getTagValues(editContainer).includes(val)) {
          editContainer.insertBefore(createChip(val), editInput);
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
        card.querySelector('.cr-alias-chips-row').innerHTML = aliases.map(a => `<span class="cr-chip-xs">${escapeHtml(a)}</span>`).join('');
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

  function openConfigPanel(config, onConfigSaved) {
    document.getElementById('clasificadorConfigPanel')?.remove();
    const panel = document.createElement('div');
    panel.id = 'clasificadorConfigPanel';

    const sortedFields = [...ACCOUNT_FIELDS].sort((a, b) => {
      const ia = config.fieldOrder.findIndex(f => f.key === a.key);
      const ib = config.fieldOrder.findIndex(f => f.key === b.key);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    const fieldItemsHTML = sortedFields.map((f, i) => {
      const fc = config.fieldOrder.find(o => o.key === f.key) || { showLabel: true };
      return `
    <div class="cr-fitem" data-key="${f.key}">
      <span class="cr-fitem-grip">⠿</span>
      <label class="cr-toggle-wrap" title="Mostrar etiqueta">
        <input type="checkbox" class="cr-fitem-toggle cr-fitem-label-toggle" ${fc.showLabel !== false ? 'checked' : ''}>
        <span class="cr-toggle-ui"></span>
      </label>
      <span class="cr-fitem-name">${f.label}</span>
      <span class="cr-fitem-num">#${i + 1}</span>
    </div>`;
    }).join('');

    const personalFields = config.personalFields || DEFAULT_CONFIG.personalFields;
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
      <div class="cr-ph-title">Configuración</div>
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
        <textarea class="cr-ta" id="cfg_closedStatuses" rows="3">${config.closedStatuses.join('\n')}</textarea>
        <div class="cr-lbl">Payment Status — Cerrada Positiva</div>
        <textarea class="cr-ta" id="cfg_paymentStatuses" rows="2">${config.paymentStatuses.join('\n')}</textarea>
        <div class="cr-lbl">Estados Negativos</div>
        <textarea class="cr-ta" id="cfg_negativeStatuses" rows="4">${config.negativeStatuses.join('\n')}</textarea>
      </div>
      <div class="cr-pane" id="cr-pane-colors">
        <div class="cr-lbl">Colores de Resaltado</div>
        <div class="cr-colors">
          <div class="cr-clr"><input type="color" id="cfg_colorOpen" value="${config.colors.open}"><span>Open</span></div>
          <div class="cr-clr"><input type="color" id="cfg_colorClosed" value="${config.colors.closedPositive}"><span>Closed+</span></div>
          <div class="cr-clr"><input type="color" id="cfg_colorInquiry" value="${config.colors.inquiryLinked || '#fbbf24'}"><span>Inquiry</span></div>
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
        <div class="cr-fitem" style="margin-bottom:6px;cursor:default">
          <label class="cr-toggle-wrap">
            <input type="checkbox" class="cr-fitem-toggle" id="cfg_showPersonalLabels" ${config.showPersonalLabels ? 'checked' : ''}>
            <span class="cr-toggle-ui"></span>
          </label>
          <span class="cr-fitem-name" style="margin-left:8px">Mostrar etiquetas (ej: Name: John)</span>
        </div>
        <div class="cr-lbl">Activá y reordenná los campos del cliente en el output</div>
        <div class="cr-fields" id="crPersonalList">${personalItemsHTML}</div>
      </div>
    </div>
    <div class="cr-footer">
      <button class="cr-btn cr-btn-ok" id="crCfgSave">Guardar</button>
      <button class="cr-btn cr-btn-rst" id="crCfgReset">Restaurar</button>
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

    setupTagInput(document.getElementById('crTagsAgencies'), config.agencies);
    setupFieldDrag(document.getElementById('crFieldList'));
    setupFieldDrag(document.getElementById('crPersonalList'));
    setupAliasPane(panel.querySelector('#cr-pane-aliases'), config.aliases || '');
    makeDraggable(panel, panel.querySelector('#crCfgHandle'));

    document.getElementById('crCfgClose').onclick = () => panel.remove();

    document.getElementById('crCfgSave').onclick = () => {
      config.agencies = getTagValues(document.getElementById('crTagsAgencies'));
      config.closedStatuses = document.getElementById('cfg_closedStatuses').value
        .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
      config.paymentStatuses = document.getElementById('cfg_paymentStatuses').value
        .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
      config.negativeStatuses = document.getElementById('cfg_negativeStatuses').value
        .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
      config.colors.open = document.getElementById('cfg_colorOpen').value;
      config.colors.closedPositive = document.getElementById('cfg_colorClosed').value;
      config.colors.inquiryLinked = document.getElementById('cfg_colorInquiry').value;
      config.aliases = getAliasesText(panel.querySelector('#cr-pane-aliases'));
      config.fieldOrder = [...document.getElementById('crFieldList').querySelectorAll('.cr-fitem')]
        .map(item => ({
          key: item.dataset.key,
          showLabel: item.querySelector('.cr-fitem-toggle').checked
        }));
      config.showPersonalLabels = document.getElementById('cfg_showPersonalLabels').checked;
      config.personalFields = [...document.getElementById('crPersonalList').querySelectorAll('.cr-fitem')]
        .map(item => ({
          key: item.dataset.key,
          label: item.dataset.label,
          enabled: item.querySelector('.cr-fitem-toggle').checked
        }));
      saveConfig(config);
      panel.remove();
      showToast('✅ Configuración guardada', '#5eead4');
      if (onConfigSaved) onConfigSaved(config);
    };

    document.getElementById('crCfgReset').onclick = () => {
      if (confirm('¿Restaurar configuración por defecto?')) {
        const resetConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        saveConfig(resetConfig);
        panel.remove();
        showToast('🔄 Configuración restaurada', '#fbbf24');
        if (onConfigSaved) onConfigSaved(resetConfig);
      }
    };
  }

  function buildAliasMap(config) {
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

  function resolveAlias(name, aliasMap) {
    const clean = cleanName(name);
    const normalized = normalizeForMatch(clean);
    return aliasMap.get(normalized) || clean;
  }

  function getLinkedAccount(name, map, aliasMap) {
    if (!name || !map.size) return null;
    const resolvedInquiry = resolveAlias(name, aliasMap);
    const normalizedInquiry = normalizeForMatch(resolvedInquiry);

    const wordsI = getWords(resolvedInquiry);
    new Set(wordsI);
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
      if (exact.length === 1 && wordsI.length === 1 && wordsC.length === 1 && exact[0].length >= 7) return item;

      const prefixesC = new Set(getPrefixes(resolvedCreditor));
      const pfx = [...prefixSetI].filter(p => prefixesC.has(p));
      if (pfx.length >= 2) return item;

      if (resolvedInquiry.length >= 6 && resolvedCreditor.includes(resolvedInquiry)) return item;
      if (resolvedCreditor.length >= 6 && resolvedInquiry.includes(resolvedCreditor)) return item;

      const sim = jaccardSimilarity(resolvedInquiry, resolvedCreditor);
      if (sim >= 0.7) return item;
    }
    return null;
  }

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

  function getDisputeType(item) {
    const input = queryOne(SELECTORS.disputeType, item);
    return input?.value?.toLowerCase() || "";
  }

  function getClientData() {
    return {
      name: queryOne(SELECTORS.client.name)?.innerText.trim() || "",
      address: queryOne(SELECTORS.client.address)?.innerText.trim() || "",
      ssn: queryOne(SELECTORS.client.ssn)?.innerText.trim() || "",
      dob: queryOne(SELECTORS.client.dob)?.innerText.trim() || "",
      cell: queryOne(SELECTORS.client.cell)?.innerText.trim() || "",
      home: queryOne(SELECTORS.client.home)?.innerText.trim() || "",
      email: queryOne(SELECTORS.client.email)?.innerText.trim() || "",
      started: queryOne(SELECTORS.client.started)?.innerText.trim() || "",
      id: queryOne(SELECTORS.client.id)?.innerText.trim() || ""
    };
  }

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

  function parseAccountBlocks(blocks, activeCols, config) {
    const result = {
      name: "", number: "", balance: "", dateOpened: "",
      isOpen: false, isClosedPositive: false, isCollection: false,
      addresses: []
    };
    let hasNegative = false;
    let accountStatusMatch = false;
    let paymentStatusMatch = false;
    const addrParts = [{}, {}, {}];

    const closedStatuses = config.closedStatuses;
    const negativeStatuses = config.negativeStatuses;
    const paymentStatuses = config.paymentStatuses;
    const matchesAny = (vals, list) => vals.some(v => list.some(s => v.includes(s)));

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
          accountStatusMatch = matchesAny(vals, closedStatuses);
          if (matchesAny(vals, negativeStatuses)) hasNegative = true;
          break;
        case "payment status":
          paymentStatusMatch = matchesAny(vals, paymentStatuses);
          if (matchesAny(vals, negativeStatuses)) hasNegative = true;
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

  function buildPositiveAccountsMap() {
    const map = new Map();
    const section = queryOne(SELECTORS.sections.positive);
    if (!section) return map;

    const items = queryAll(SELECTORS.compact.container, section);
    for (const item of items) {
      const fullName = queryOne(SELECTORS.compact.name, item)?.innerText.trim().toLowerCase() || "";
      const creditor = fullName.split(" - ")[0].trim();
      if (creditor) map.set(creditor, item);
    }
    return map;
  }

  function isAgency(name, config) {
    if (!name) return false;
    const clean = name.toLowerCase();
    return config.agencies.some(a => clean.includes(a));
  }

  function formatAccount(a, NL, config) {
    const order = config.fieldOrder || DEFAULT_CONFIG.fieldOrder;
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

    const detailPanel = await waitForElement(`#dispute-view-details-${id}`, document, 3000);
    if (!detailPanel?.offsetParent) return false;

    const fullBtn = queryOne(`#dispute-view-details-${id}`);
    if (fullBtn?.offsetParent) {
      fullBtn.click();
      await waitForElement(SELECTORS.detail.blocks, item, 4000);
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

  function buildAccountEditorCard(acc, onRemove) {
    const card = document.createElement('div');
    card.className = 'cr-editor-card';
    card.dataset.addresses = JSON.stringify(acc.addresses || []);

    const meta = [acc.number ? `#${acc.number}` : '', acc.balance || ''].filter(Boolean).join(' · ');

    card.innerHTML = `
    <div class="cr-editor-card-head">
      <span class="cr-editor-grip">⠿</span>
      <span class="cr-editor-name">${escapeHtml(acc.name || '')}</span>
      <span class="cr-editor-meta">${escapeHtml(meta)}</span>
      <div class="cr-editor-actions">
        <button class="cr-editor-edit-btn" title="Editar">✏️</button>
        <button class="cr-editor-del-btn" title="Eliminar">✕</button>
      </div>
    </div>
    <div class="cr-editor-form">
      <div class="cr-editor-field">
        <span class="cr-editor-field-lbl">Account Name</span>
        <input class="cr-editor-field-in" data-field="name" value="${escapeHtml(acc.name || '')}">
      </div>
      <div class="cr-editor-field">
        <span class="cr-editor-field-lbl">Acct Number</span>
        <input class="cr-editor-field-in" data-field="number" value="${escapeHtml(acc.number || '')}">
      </div>
      <div class="cr-editor-field">
        <span class="cr-editor-field-lbl">Balance</span>
        <input class="cr-editor-field-in" data-field="balance" value="${escapeHtml(acc.balance || '')}">
      </div>
      <div class="cr-editor-field">
        <span class="cr-editor-field-lbl">Date Opened</span>
        <input class="cr-editor-field-in" data-field="dateOpened" value="${escapeHtml(acc.dateOpened || '')}">
      </div>
    </div>
  `;

    card.querySelector('.cr-editor-edit-btn').onclick = () => {
      const form = card.querySelector('.cr-editor-form');
      const opening = !form.classList.contains('open');
      form.classList.toggle('open');
      if (!opening) {
        const name = card.querySelector('[data-field="name"]').value;
        const number = card.querySelector('[data-field="number"]').value;
        const balance = card.querySelector('[data-field="balance"]').value;
        card.querySelector('.cr-editor-name').textContent = name;
        card.querySelector('.cr-editor-meta').textContent =
          [number ? `#${number}` : '', balance || ''].filter(Boolean).join(' · ');
      }
    };

    card.querySelector('.cr-editor-del-btn').onclick = () => {
      card.remove();
      if (onRemove) onRemove();
    };

    return card;
  }

  function setupEditorDrag(list) {
    let dragged = null;
    list.addEventListener('dragstart', e => {
      dragged = e.target.closest('.cr-editor-card');
      if (dragged) setTimeout(() => dragged.classList.add('cr-editor-dragging'), 0);
    });
    list.addEventListener('dragend', () => {
      if (dragged) dragged.classList.remove('cr-editor-dragging');
      list.querySelectorAll('.cr-editor-card').forEach(c => c.classList.remove('cr-editor-dragover'));
      dragged = null;
    });
    list.addEventListener('dragover', e => {
      e.preventDefault();
      const target = e.target.closest('.cr-editor-card');
      if (!target || target === dragged) return;
      list.querySelectorAll('.cr-editor-card').forEach(c => c.classList.remove('cr-editor-dragover'));
      target.classList.add('cr-editor-dragover');
    });
    list.addEventListener('drop', e => {
      e.preventDefault();
      const target = e.target.closest('.cr-editor-card');
      if (!target || !dragged || target === dragged) return;
      const cards = [...list.querySelectorAll('.cr-editor-card')];
      if (cards.indexOf(dragged) < cards.indexOf(target)) target.after(dragged);
      else target.before(dragged);
      list.querySelectorAll('.cr-editor-card').forEach(c => c.classList.remove('cr-editor-dragover'));
    });
  }

  function buildCompactStats(stats) {
    const chips = [];
    if (stats.accounts) chips.push(`<span class="cr-stat"><b>${stats.accounts}</b> cuentas</span>`);
    if (stats.collections) chips.push(`<span class="cr-stat" style="border-color:#ff664433"><b>${stats.collections}</b> colecciones</span>`);
    if (stats.originals) chips.push(`<span class="cr-stat" style="border-color:#60a5fa33"><b>${stats.originals}</b> originales</span>`);
    if (stats.inquiries) chips.push(`<span class="cr-stat"><b>${stats.inquiries}</b> inquiries</span>`);
    if (stats.personal) chips.push(`<span class="cr-stat"><b>${stats.personal}</b> personal</span>`);
    const skipped = (stats.skippedOpen || 0) + (stats.skippedClosed || 0);
    if (skipped) chips.push(`<span class="cr-stat" style="color:#555"><b>${skipped}</b> saltadas</span>`);
    if (stats.linkedInquiries) chips.push(`<span class="cr-stat" style="border-color:#fbbf2433;color:#fbbf24"><b>${stats.linkedInquiries}</b> 🛡</span>`);
    return `<div class="cr-out-stats">${chips.join('')}</div>`;
  }

  function showOutputEditor(data, stats, config) {
    document.getElementById('crOverlay')?.remove();
    document.getElementById('crOutputPanel')?.remove();

    // No se usa createOverlay() aquí — ese helper aplica z-index:9999998 inline
    // que quedaría por encima del panel (z-index:999999).
    const overlay = document.createElement('div');
    overlay.id = 'crOverlay';
    document.body.appendChild(overlay);

    const panel = document.createElement('div');
    panel.id = 'crOutputPanel';
    panel.innerHTML = `
    <div class="cr-out-head">
      <b>✏️ Revisar Output</b>
      <button class="cr-x" id="crOutClose">✕</button>
    </div>
    ${buildCompactStats(stats)}
    <div id="crEditorBody" style="flex:1;overflow-y:auto;padding:14px 16px;min-height:0;"></div>
    <div class="cr-out-foot">
      <button class="cr-copy-btn" id="crCopyBtn">📋 Generar y Copiar</button>
      <button class="cr-dismiss-btn" id="crOutDismiss">Cerrar</button>
    </div>
  `;
    document.body.appendChild(panel);

    const body = panel.querySelector('#crEditorBody');

    function buildAccountSection(title, accounts) {
      const section = document.createElement('div');
      section.className = 'cr-editor-section';
      section.dataset.sectionType = 'accounts';
      section.dataset.sectionTitle = title;

      const badge = document.createElement('span');
      badge.className = 'cr-editor-section-badge';
      const head = document.createElement('div');
      head.className = 'cr-editor-section-head';
      head.innerHTML = `<span class="cr-editor-section-title">${title}</span>`;
      head.appendChild(badge);
      section.appendChild(head);

      const list = document.createElement('div');
      list.className = 'cr-editor-list';
      section.appendChild(list);

      const updateBadge = () => {
        badge.textContent = list.querySelectorAll('.cr-editor-card').length;
      };
      accounts.forEach(acc => {
        const card = buildAccountEditorCard(acc, updateBadge);
        card.setAttribute('draggable', 'true');
        list.appendChild(card);
      });
      updateBadge();
      setupEditorDrag(list);
      return section;
    }

    function buildStringSection(title, items) {
      const section = document.createElement('div');
      section.className = 'cr-editor-section';
      section.dataset.sectionType = 'strings';
      section.dataset.sectionTitle = title;

      const badge = document.createElement('span');
      badge.className = 'cr-editor-section-badge';
      const head = document.createElement('div');
      head.className = 'cr-editor-section-head';
      head.innerHTML = `<span class="cr-editor-section-title">${title}</span>`;
      head.appendChild(badge);
      section.appendChild(head);

      const list = document.createElement('div');
      list.className = 'cr-editor-list';
      section.appendChild(list);

      const updateBadge = () => {
        badge.textContent = list.querySelectorAll('.cr-editor-str-item').length;
      };
      items.forEach(val => {
        const item = document.createElement('div');
        item.className = 'cr-editor-str-item';
        item.innerHTML = `<span class="cr-editor-str-val">${escapeHtml(val)}</span>
        <button class="cr-editor-str-del" title="Eliminar">✕</button>`;
        item.querySelector('.cr-editor-str-del').onclick = () => { item.remove(); updateBadge(); };
        list.appendChild(item);
      });
      updateBadge();
      return section;
    }

    if (data.collections.length) body.appendChild(buildAccountSection('COLLECTION AGENCIES', data.collections));
    if (data.originals.length) body.appendChild(buildAccountSection('ORIGINAL CREDITORS', data.originals));
    if (data.inquiries.length) body.appendChild(buildStringSection('INQUIRIES', data.inquiries));
    if (data.personal.length) body.appendChild(buildStringSection('PERSONAL INFORMATION', data.personal));

    const close = () => { overlay.remove(); panel.remove(); };
    bindClose(close, overlay, document.getElementById('crOutClose'), document.getElementById('crOutDismiss'));

    document.getElementById('crCopyBtn').onclick = async () => {
      const NL = "\r\n";
      let output = data.personalHeader || '';

      body.querySelectorAll('.cr-editor-section').forEach(section => {
        const type = section.dataset.sectionType;
        const title = section.dataset.sectionTitle;

        if (type === 'accounts') {
          const cards = [...section.querySelectorAll('.cr-editor-card')];
          if (!cards.length) return;
          output += `${title} (${cards.length})${NL}${NL}`;
          cards.forEach(card => {
            const acc = {
              name: card.querySelector('[data-field="name"]').value,
              number: card.querySelector('[data-field="number"]').value,
              balance: card.querySelector('[data-field="balance"]').value,
              dateOpened: card.querySelector('[data-field="dateOpened"]').value,
              addresses: JSON.parse(card.dataset.addresses || '[]')
            };
            output += formatAccount(acc, NL, config);
          });
        } else {
          const items = [...section.querySelectorAll('.cr-editor-str-val')];
          if (!items.length) return;
          output += `${title} (${items.length})${NL}${NL}`;
          items.forEach(el => { output += el.textContent + NL; });
          output += NL + NL;
        }
      });

      addHistoryEntry(output, stats, data.personalHeader);
      try {
        await navigator.clipboard.writeText(output);
        const btn = document.getElementById('crCopyBtn');
        btn.textContent = '✓ Copiado';
        btn.classList.add('copied');
        setTimeout(() => close(), 800);
      } catch (e) {
        console.error('[CreditRadar] Clipboard error:', e);
        showToast('⚠️ No se pudo copiar al portapapeles', '#f87171', 3000);
      }
    };
  }

  function showHistoryPanel() {
    document.getElementById('crHistoryPanel')?.remove();
    const panel = document.createElement('div');
    panel.id = 'crHistoryPanel';

    panel.innerHTML = `
    <div class="cr-ph" id="crHistHandle">
      <div class="cr-ph-title">Historial</div>
      <button class="cr-x" id="crHistClose">✕</button>
    </div>
    <div class="cr-hist-filter">
      <input type="date" class="cr-hist-date-in" id="crHistFrom" title="Desde">
      <input type="date" class="cr-hist-date-in" id="crHistTo" title="Hasta">
      <div class="cr-hist-chips">
        <button class="cr-hist-chip active" data-range="all">Todo</button>
        <button class="cr-hist-chip" data-range="7">7 días</button>
        <button class="cr-hist-chip" data-range="today">Hoy</button>
      </div>
      <span class="cr-hist-count" id="crHistCount"></span>
    </div>
    <div class="cr-hist-body" id="crHistBody"></div>
    <div class="cr-hist-footer">
      <button class="cr-hist-clear-btn" id="crHistClear">🗑 Limpiar historial</button>
    </div>
  `;
    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('#crHistHandle'));
    document.getElementById('crHistClose').onclick = () => panel.remove();

    let entries = loadHistory();

    function formatDate(ts) {
      const d = new Date(ts);
      return d.toLocaleDateString('es-US', { month: 'short', day: 'numeric', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-US', { hour: '2-digit', minute: '2-digit' });
    }

    function renderList(filtered) {
      const body = document.getElementById('crHistBody');
      document.getElementById('crHistCount').textContent = `${filtered.length} entrada${filtered.length !== 1 ? 's' : ''}`;
      body.innerHTML = '';
      if (!filtered.length) {
        body.innerHTML = '<div class="cr-hist-empty">Sin entradas en este rango</div>';
        return;
      }
      filtered.forEach(entry => {
        const el = document.createElement('div');
        el.className = 'cr-hist-entry';
        const s = entry.stats || {};
        el.innerHTML = `
        <div class="cr-hist-row">
          <span class="cr-hist-name">${escapeHtml(entry.clientName || 'Cliente')}</span>
          <span class="cr-hist-date">${formatDate(entry.id)}</span>
        </div>
        <div class="cr-hist-stats">
          ${s.collections ? `<span class="cr-stat"><b>${s.collections}</b> colecciones</span>` : ''}
          ${s.originals ? `<span class="cr-stat"><b>${s.originals}</b> originales</span>` : ''}
          ${s.inquiries ? `<span class="cr-stat"><b>${s.inquiries}</b> inquiries</span>` : ''}
        </div>
        <div class="cr-hist-actions">
          <button class="cr-hist-btn cr-hist-btn-view">👁 Ver</button>
          <button class="cr-hist-btn cr-hist-btn-copy">📋 Copiar</button>
          <button class="cr-hist-btn cr-hist-btn-del">🗑</button>
        </div>
      `;

        el.querySelector('.cr-hist-btn-view').onclick = () => {
          const overlay = createOverlay('crHistDetailOverlay');
          const modal = createModal('crHistDetailModal',
            'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#161616;color:#fff;border-radius:14px;z-index:9999999;width:500px;max-width:92vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 0 0 1px #2a2a2a,0 20px 60px rgba(0,0,0,0.8);animation:crScaleIn 0.22s ease;');
          modal.innerHTML = `
          <div class="cr-out-head">
            <div>
              <b>${escapeHtml(entry.clientName || 'Cliente')}</b>
              <span style="font-size:10px;color:#444;margin-left:8px;font-family:monospace">${formatDate(entry.id)}</span>
            </div>
            <button class="cr-x" id="crHistDetClose">✕</button>
          </div>
          <textarea readonly style="flex:1;background:#0d0d0d;color:#aaa;border:none;padding:14px 18px;font-family:monospace;font-size:12px;resize:none;outline:none;line-height:1.7;min-height:200px;">${escapeHtml(entry.output)}</textarea>
          <div class="cr-out-foot">
            <button class="cr-copy-btn" id="crHistDetCopy">📋 Copiar</button>
            <button class="cr-dismiss-btn" id="crHistDetClose2">Cerrar</button>
          </div>
        `;
          const closeDetail = () => { overlay.remove(); modal.remove(); };
          bindClose(closeDetail, overlay,
            document.getElementById('crHistDetClose'),
            document.getElementById('crHistDetClose2'));
          document.getElementById('crHistDetCopy').onclick = async () => {
            try {
              await navigator.clipboard.writeText(entry.output);
              showToast('📋 Copiado del historial', '#60a5fa', 2500);
              closeDetail();
            } catch (e) {
              console.error('[CreditRadar] Clipboard error:', e);
              showToast('⚠️ No se pudo copiar al portapapeles', '#f87171', 3000);
            }
          };
        };

        el.querySelector('.cr-hist-btn-copy').onclick = async () => {
          try {
            await navigator.clipboard.writeText(entry.output);
            showToast('📋 Copiado del historial', '#60a5fa', 2500);
          } catch (e) {
            console.error('[CreditRadar] Clipboard error:', e);
            showToast('⚠️ No se pudo copiar al portapapeles', '#f87171', 3000);
          }
        };

        el.querySelector('.cr-hist-btn-del').onclick = () => {
          entries = entries.filter(e => e.id !== entry.id);
          saveHistory(entries);
          applyFilter();
        };

        body.appendChild(el);
      });
    }

    function applyFilter() {
      const from = document.getElementById('crHistFrom').value;
      const to = document.getElementById('crHistTo').value;
      const fromTs = from ? (new Date(from).getTime() || 0) : 0;
      const toTs = to ? ((new Date(to).getTime() || Infinity) + 86399999) : Infinity;
      renderList(entries.filter(e => e.id >= fromTs && e.id <= toTs));
    }

    const histChips = panel.querySelectorAll('.cr-hist-chip');
    const clearChipActive = () => histChips.forEach(c => c.classList.remove('active'));

    histChips.forEach(chip => {
      chip.onclick = () => {
        clearChipActive();
        chip.classList.add('active');
        const range = chip.dataset.range;
        const now = Date.now();
        const fromIn = document.getElementById('crHistFrom');
        const toIn = document.getElementById('crHistTo');
        if (range === 'today') {
          const today = new Date().toISOString().slice(0, 10);
          fromIn.value = today; toIn.value = today;
        } else if (range === '7') {
          const d = new Date(now - 6 * 86400000).toISOString().slice(0, 10);
          fromIn.value = d; toIn.value = '';
        } else {
          fromIn.value = ''; toIn.value = '';
        }
        applyFilter();
      };
    });

    document.getElementById('crHistFrom').onchange = () => { clearChipActive(); applyFilter(); };
    document.getElementById('crHistTo').onchange = () => { clearChipActive(); applyFilter(); };

    document.getElementById('crHistClear').onclick = () => {
      if (confirm('¿Eliminar todo el historial?')) {
        entries = [];
        saveHistory(entries);
        applyFilter();
      }
    };

    renderList(entries);
  }

  let CONFIG = loadConfig();

  async function run() {
    console.clear();
    console.log("🚀 CLASIFICADOR V" + SCRIPT_VERSION);
    setButtonAnimation('pulse');

    try {
      CONFIG = loadConfig();
      clearAllHighlights();
      createProgressPanel();

      const NL = "\r\n";
      const CLIENT = getClientData();

      const aliasMap = buildAliasMap(CONFIG);
      const positiveAccountsMap = buildPositiveAccountsMap();
      console.log(`✅ Aliases: ${aliasMap.size} | Positive accounts: ${positiveAccountsMap.size}`);

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

          const linkedItem = getLinkedAccount(compactName, positiveAccountsMap, aliasMap);
          if (linkedItem) {
            console.log(`🛡️ Escudo Protector: Inquiry omitido por estar ligado a cuenta positiva: ${compactName}`);
            const color = "#f87171";
            highlight(item, color);
            highlight(linkedItem, color);
            LINKED_INQUIRIES++;
          } else {
            INQUIRIES.push(compactName);
          }
          continue;
        }

        if (compactName.includes("Incorrect") || compactName.includes("addresses") || compactName.includes("Dobs")) {
          const blocks = [
            ...queryAll(SELECTORS.detail.blocks, queryOne(SELECTORS.detail.left, item)),
            ...queryAll(SELECTORS.detail.blocks, queryOne(SELECTORS.detail.right, item))
          ];
          const parsed = parseAccountBlocks(blocks, activeCols, CONFIG);
          if (parsed.addresses.length) parsed.addresses.forEach(a => PERSONAL.push(a));
          else PERSONAL.push(compactName.replace(/\s+/g, " ").replace("- Incorrect", "").trim());
          continue;
        }

        const blocks = [
          ...queryAll(SELECTORS.detail.blocks, queryOne(SELECTORS.detail.left, item)),
          ...queryAll(SELECTORS.detail.blocks, queryOne(SELECTORS.detail.right, item))
        ];
        if (!blocks.length) continue;

        const parsed = parseAccountBlocks(blocks, activeCols, CONFIG);
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

        if (parsed.isCollection || isAgency(finalName, CONFIG)) {
          COLLECTION_ACCOUNTS.push(accountData);
        } else {
          ORIGINAL_ACCOUNTS.push(accountData);
        }
      }

      removeProgressPanel();

      let personalHeader = "";
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
        personalHeader += showLabels ? `${f.label}: ${val}` + NL : val + NL;
      });
      personalHeader += NL;

      showOutputEditor({
        collections: COLLECTION_ACCOUNTS,
        originals: ORIGINAL_ACCOUNTS,
        inquiries: INQUIRIES,
        personal: PERSONAL,
        personalHeader
      }, {
        accounts: COLLECTION_ACCOUNTS.length + ORIGINAL_ACCOUNTS.length,
        collections: COLLECTION_ACCOUNTS.length,
        originals: ORIGINAL_ACCOUNTS.length,
        inquiries: INQUIRIES.length,
        personal: PERSONAL.length,
        skippedOpen: SKIPPED_OPEN,
        skippedClosed: SKIPPED_CLOSED,
        linkedInquiries: LINKED_INQUIRIES
      }, CONFIG);

      setButtonAnimation('success');
      queryOne(".disputes-tab-choose-viewCompact")?.click();

    } catch (error) {
      console.error("[Clasificador] Error fatal:", error);
      removeProgressPanel();
      showToast(`❌ Error: ${error.message}`, "#f87171", 8000);
      setButtonAnimation('idle');
    }
  }

  function initClasificador() {
    injectStyles();
    checkVersionUpdate();
    setTimeout(checkForUpdates, 2000);
    setTimeout(() => addButton(
      CONFIG,
      run,
      () => openConfigPanel(CONFIG, newConfig => { CONFIG = newConfig; }),
      showHistoryPanel
    ), 3000);
  }

  if (document.readyState === 'complete') {
    initClasificador();
  } else {
    window.addEventListener("load", initClasificador);
  }

})();
