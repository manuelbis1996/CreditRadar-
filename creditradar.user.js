// ==UserScript==
// @name         CreditRadar 📶
// @namespace    http://tampermonkey.net/
// @version      20.18
// @description  Organizador inteligente de disputes - clasifica colecciones, acreedores, inquiries e información personal automáticamente
// @author       MAnuelbis Encarnacion Abreu  
// @match        https://pulse.disputeprocess.com/*
// @match        https://manuelbis1996.github.io/CreditRadar-/*
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

  const SCRIPT_VERSION = "20.18";

  const VERSION_NOTES = {
    "20.18": "🔗 CreditFlow: CRM integrado para gestionar clientes de reparación de crédito",
    "20.17": "📊 Reporte diario ahora muestra el estado asignado a cada cliente",
    "20.16": "🏷️ Estados de cliente: asigna estados con colores a cada entrada del historial",
    "20.15": "📊 Reporte diario: genera resumen del día desde Historial con copia y WhatsApp",
    "20.14": "🛡 Vincular manual: enlaza inquiries no detectadas a cuentas positivas y guarda el alias",
    "20.13": "📌 Toolbar al tope del sidebar + botón Copiar Info Personal",
    "20.12": "📌 Toolbar integrada al sidebar de comunicaciones",
    "20.11": "🛡️ Escudo mejorado: menos falsos negativos en detección de inquiries vinculadas",
    "20.10": "🔧 Fix: dirección del cliente se copia con salto de línea correcto",
    "20.9": "⚠️ Fix: cuentas lentas ya no se saltan silenciosamente — retry automático + aviso en output",
    "20.8": "🎯 Toolbar colapsable: solo muestra el botón principal, expande al hacer hover",
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

  const REMOVE_PREFIXES = [
    "cb/", "syncb/", "td/", "wf/", "cof/", "jpm/", "thd/", "kohls/", "comenity/",
    "amex/", "disc/", "fnb/", "bk/", "usb/", "pnc/", "hsbc/", "cbna/", "1st/",
    "ftnb/", "fnbo/", "bnb/", "ncu/"
  ];

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
    toolbarPos: { top: "120px", left: "calc(100vw - 80px)" },
    clientStatuses: [
      { name: "CFPB y FTC", color: "#f59e0b" },
      { name: "En espera", color: "#60a5fa" },
      { name: "No reimporta", color: "#f87171" },
      { name: "No contesta", color: "#a78bfa" }
    ]
  };

  const HISTORY_KEY = "cr_history";
  const HISTORY_MAX = 50;

  // CreditFlow CRM storage keys
  const CF_RECORDS_KEY = "cf_records";
  const CF_LOG_KEY = "cf_log";
  const CF_STATUSES_KEY = "cf_statuses";
  const CF_TEMPLATES_KEY = "cf_templates";

  const CF_DEFAULT_STATUSES = [
    { id: 'carta',      label: 'Carta',       color: '#34D399', numbered: true  },
    { id: 'espera',     label: 'En espera',   color: '#FBBF24', numbered: false },
    { id: 'nocontesta', label: 'No contesta', color: '#F87171', numbered: false },
  ];

  const CF_DEFAULT_TEMPLATES = [
    { id: 't1', statusId: 'nocontesta', label: 'Seguimiento',   msg: 'Hola {nombre}, le escribo de parte del equipo de reparación de crédito. Hemos intentado comunicarnos con usted. ¿Podría confirmarnos un buen horario para contactarle? Gracias.' },
    { id: 't2', statusId: 'espera',     label: 'Actualización', msg: 'Hola {nombre}, le informamos que su caso sigue en proceso. Estamos esperando respuesta del buró. Le mantendremos informado. Cualquier duda estamos a la orden.' },
    { id: 't3', statusId: 'carta',      label: 'Carta enviada', msg: 'Hola {nombre}, le confirmamos que su carta de disputa ha sido enviada exitosamente. El proceso puede tomar de 30 a 45 días. Le avisaremos cuando tengamos respuesta.' },
  ];

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
        if (!parsed.clientStatuses) parsed.clientStatuses = DEFAULT_CONFIG.clientStatuses;
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

  function loadCFData(key, def) {
    try {
      const v = GM_getValue(key, null);
      return v ? (typeof v === 'string' ? JSON.parse(v) : v) : def;
    } catch(e) { return def; }
  }

  function saveCFData(key, val) {
    try { GM_setValue(key, JSON.stringify(val)); } catch(e) {}
  }

  function addHistoryEntry(output, stats, personalHeader) {
    const firstLine = (personalHeader || '').split('\n').map(l => l.trim()).find(l => l) || 'Cliente';
    const clientName = firstLine.replace(/^Name:\s*/i, '').replace(/^Nombre:\s*/i, '').trim() || 'Cliente';
    const entries = loadHistory();
    entries.unshift({ id: Date.now(), clientName, output, stats });
    if (entries.length > HISTORY_MAX) entries.length = HISTORY_MAX;
    saveHistory(entries);
  }

  // ─── CSS ─────────────────────────────────────────────────────────────────────

  const CF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700;800&display=swap');
:root{--bg:#0B0F1A;--surface:#131825;--surface-2:#1A2035;--border:#2A3150;--text:#E8ECF4;--text-2:#8B95B0;--text-3:#5A6580;--accent:#4F7CFF;--accent-glow:#4F7CFF33;--green:#34D399;--red:#F87171;--red-bg:#F8717118;--purple:#A78BFA;--orange:#FB923C;--wa:#25D366}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.hidden{display:none}
.cf-app{display:flex;min-height:100vh}
.cf-sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:24px 0;position:fixed;top:0;left:0;bottom:0;z-index:10;display:flex;flex-direction:column}
.cf-brand{padding:0 20px 24px;border-bottom:1px solid var(--border);margin-bottom:12px}
.cf-brand h1{font-family:'Playfair Display',serif;font-size:21px;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.cf-brand p{font-size:10px;color:var(--text-3);margin-top:3px;text-transform:uppercase;letter-spacing:1.5px}
.cf-nav-item{display:flex;align-items:center;gap:11px;padding:10px 20px;color:var(--text-2);cursor:pointer;transition:all .2s;font-size:13.5px;border-left:3px solid transparent}
.cf-nav-item:hover{color:var(--text);background:var(--surface-2)}
.cf-nav-item.active{color:var(--accent);background:var(--accent-glow);border-left-color:var(--accent);font-weight:500}
.cf-sidebar-footer{margin-top:auto;padding:16px 20px;border-top:1px solid var(--border)}
.cf-sidebar-footer p{font-size:11px;color:var(--text-3)}
.cf-main{margin-left:220px;flex:1;padding:28px 36px}
.cf-page-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.cf-page-hdr h2{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;letter-spacing:-.5px}
.cf-subtitle{font-size:13px;color:var(--text-3)}
.cf-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .2s;font-family:'DM Sans',sans-serif}
.cf-btn-primary{background:var(--accent);color:#fff;box-shadow:0 4px 12px var(--accent-glow)}
.cf-btn-primary:hover{filter:brightness(1.15);transform:translateY(-1px)}
.cf-btn-ghost{background:var(--surface-2);color:var(--text-2);border:1px solid var(--border)}
.cf-btn-ghost:hover{color:var(--text);border-color:var(--text-3)}
.cf-btn-danger{background:var(--red-bg);color:var(--red);border:none}
.cf-btn-danger:hover{background:var(--red);color:#fff}
.cf-btn-sm{padding:5px 11px;font-size:12px;border-radius:7px}
.cf-btn-export{background:#34D39918;color:var(--green);border:none}
.cf-btn-export:hover{background:var(--green);color:#fff}
.cf-btn-wa{background:#25D36618;color:var(--wa);border:none}
.cf-btn-wa:hover{background:var(--wa);color:#fff}
.cf-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px}
.cf-stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px;margin-bottom:24px}
.cf-stat-card{text-align:center}
.cf-stat-val{font-family:'Playfair Display',serif;font-size:32px;font-weight:800;margin-bottom:2px}
.cf-stat-lbl{font-size:11px;color:var(--text-2);text-transform:uppercase;letter-spacing:1px}
.cf-tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:10px 14px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:12px 14px;font-size:13.5px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:hover td{background:var(--surface-2)}
tr:last-child td{border-bottom:none}
.cf-chk-cell{text-align:center}
.cf-chk{width:20px;height:20px;border-radius:6px;border:2px solid var(--border);background:var(--surface-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .15s}
.cf-chk.checked{background:var(--green);border-color:var(--green)}
.cf-chk.checked::after{content:'✓';color:#fff;font-size:13px;font-weight:700}
.cf-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;animation:cfFadeIn .15s}
.cf-modal{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:28px;width:520px;max-width:92vw;max-height:85vh;overflow-y:auto;animation:cfSlideUp .2s}
.cf-modal-wide{width:620px}
.cf-modal h3{font-family:'Playfair Display',serif;font-size:20px;margin-bottom:18px}
@keyframes cfFadeIn{from{opacity:0}to{opacity:1}}
@keyframes cfSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.cf-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cf-fg{display:flex;flex-direction:column;gap:5px}
.cf-full{grid-column:1/-1}
.cf-fl{font-size:11px;font-weight:500;color:var(--text-2);text-transform:uppercase;letter-spacing:.7px}
.cf-fi,.cf-fs,.cf-ft{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:9px 13px;color:var(--text);font-size:13.5px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;width:100%}
.cf-fi:focus,.cf-fs:focus,.cf-ft:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.cf-fs{cursor:pointer}.cf-fs option{background:var(--surface-2)}
.cf-ft{resize:vertical;min-height:70px}
.cf-f-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;grid-column:1/-1}
.cf-act-item{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)}
.cf-act-item:last-child{border-bottom:none}
.cf-act-dot{width:7px;height:7px;border-radius:50%;margin-top:6px;flex-shrink:0}
.cf-act-time{font-size:11px;color:var(--text-3);margin-top:2px}
.cf-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:16px;font-size:11.5px;font-weight:500;white-space:nowrap}
.cf-status-select{border-radius:16px;padding:4px 10px;font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;outline:none;-webkit-appearance:none;text-align:center;min-width:110px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)}
.cf-empty{text-align:center;padding:50px 20px;color:var(--text-3)}
.cf-empty p{font-size:14px;margin-bottom:14px}
.cf-inline-actions{display:flex;gap:5px}
.cf-search-box{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:8px 14px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;width:200px}
.cf-search-box:focus{border-color:var(--accent)}
.cf-date-filter{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:7px 12px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
.cf-report-box{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:20px 24px;font-size:14px;line-height:1.8;white-space:pre-wrap;color:var(--text);max-height:55vh;overflow-y:auto;margin-bottom:16px}
.cf-rpt-section{margin-bottom:10px}
.cf-rpt-title{font-weight:700;margin-bottom:2px}
.cf-copy-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:500;z-index:200;animation:cfSlideUp .2s}
.cf-status-list-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.cf-status-list-item:last-child{border-bottom:none}
.cf-status-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}
.cf-status-name{flex:1;font-size:14px;font-weight:500}
.cf-color-input{width:36px;height:28px;border:none;border-radius:6px;cursor:pointer;background:none;padding:0}
.cf-add-status-row{display:flex;gap:10px;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)}
.cf-add-status-input{flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:8px 12px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
.cf-add-status-input:focus{border-color:var(--accent)}
.cf-filter-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.cf-filter-pill{padding:5px 14px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);transition:all .2s}
.cf-filter-pill:hover{border-color:var(--text-3);color:var(--text)}
.cf-bulk-preview{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin:12px 0;max-height:180px;overflow-y:auto;font-size:13px;line-height:1.6}
.cf-bp-item{display:flex;align-items:center;gap:8px;padding:3px 0}
.cf-bp-num{color:var(--text-3);font-size:11px;min-width:20px}
.cf-tpl-card{background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px}
.cf-tpl-card-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.cf-tpl-card-hdr span{font-size:13px;font-weight:600}
.cf-tpl-preview{font-size:12.5px;color:var(--text-2);line-height:1.5;white-space:pre-wrap;max-height:60px;overflow:hidden}
@media(max-width:768px){
  .cf-sidebar{width:58px}.cf-brand h1{font-size:0}.cf-brand p{display:none}
  .cf-nav-item span{display:none}.cf-nav-item{justify-content:center;padding:12px;border-left:none}
  .cf-main{margin-left:58px;padding:16px 12px}
  .cf-stat-grid{grid-template-columns:repeat(2,1fr)}
  .cf-form-grid{grid-template-columns:1fr}.cf-page-hdr h2{font-size:20px}.cf-sidebar-footer{display:none}
}
`;

  // ─── STATE ────────────────────────────────────────────────────────────────────

  let S = null;

  function todayStr() { return new Date().toISOString().split('T')[0]; }
  function fmtTime(ts) { return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
  function fmtDateShort(ts) { if (!ts) return ''; const d = new Date(ts + 'T12:00:00'); return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); }
  function fmtLong() { return new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function actColor(t) {
    return t.includes('add') || t.includes('bulk') ? 'var(--accent)'
      : t.includes('carta') ? 'var(--purple)'
      : t.includes('cfbp') ? 'var(--green)'
      : t.includes('delete') ? 'var(--red)'
      : t.includes('estatus') ? 'var(--orange)'
      : 'var(--text-3)';
  }

  function initState() {
    const records = loadCFData(CF_RECORDS_KEY, []);
    records.forEach(r => { if (!r.estatus) r.estatus = ''; });
    return {
      records,
      log: loadCFData(CF_LOG_KEY, []),
      statuses: loadCFData(CF_STATUSES_KEY, null) || JSON.parse(JSON.stringify(CF_DEFAULT_STATUSES)),
      templates: loadCFData(CF_TEMPLATES_KEY, null) || JSON.parse(JSON.stringify(CF_DEFAULT_TEMPLATES)),
      view: 'dashboard',
      search: '',
      filterStatus: 'all',
      reportDate: '',
      reportResp: '',
    };
  }

  function save() {
    saveCFData(CF_RECORDS_KEY, S.records);
    saveCFData(CF_LOG_KEY, S.log);
    saveCFData(CF_STATUSES_KEY, S.statuses);
    saveCFData(CF_TEMPLATES_KEY, S.templates);
  }

  function addLog(type, desc) {
    S.log.push({ id: Date.now() + 'l', type, desc, ts: new Date().toISOString() });
  }

  function getStatus(id)    { return S.statuses.find(s => s.id === id) || null; }
  function statusLabel(id)  { const s = getStatus(id); return s ? s.label : 'Sin estatus'; }
  function statusColor(id)  { const s = getStatus(id); return s ? s.color : '#5A6580'; }

  // ─── NAVIGATION ──────────────────────────────────────────────────────────────

  function nav(v) {
    S.view = v;
    document.querySelectorAll('.cf-nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.view === v)
    );
    ['dashboard', 'reparacion', 'reportes', 'plantillas', 'activity'].forEach(x =>
      document.getElementById('cf-v-' + x)?.classList.toggle('hidden', x !== v)
    );
    render();
  }

  function closeModal() { document.getElementById('cf-modal-root').innerHTML = ''; }

  function cfToast(msg) {
    const el = document.getElementById('cf-toast-root');
    if (!el) return;
    el.innerHTML = `<div class="cf-copy-toast">${msg}</div>`;
    setTimeout(() => { el.innerHTML = ''; }, 2500);
  }

  // ─── STATUS MANAGER ──────────────────────────────────────────────────────────

  function renderStatusModal() {
    const items = S.statuses.map((s, i) => `
    <div class="cf-status-list-item">
      <span class="cf-status-dot" style="background:${s.color}"></span>
      <span class="cf-status-name">${s.label}</span>
      <label style="font-size:11px;color:var(--text-3);display:flex;align-items:center;gap:4px;cursor:pointer">
        <input type="checkbox" ${s.numbered ? 'checked' : ''} onchange="CF.toggleNumbered(${i});CF.renderStatusModal()"> Num.
      </label>
      <input type="color" class="cf-color-input" value="${s.color}" onchange="CF.updateStatusColor(${i},this.value);CF.renderStatusModal()">
      <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.promptEditStatus(${i})">✏️</button>
      <button class="cf-btn cf-btn-danger cf-btn-sm" onclick="CF.removeStatus(${i});CF.renderStatusModal()">🗑️</button>
    </div>`).join('');
    document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()">
    <div class="cf-modal" onclick="event.stopPropagation()">
      <h3>Gestionar Estatus</h3>
      <div>${items}</div>
      <div class="cf-add-status-row">
        <input class="cf-add-status-input" id="cf-new-status-name" placeholder="Nuevo estatus..." onkeydown="if(event.key==='Enter')CF.addNewStatus()">
        <input type="color" class="cf-color-input" id="cf-new-status-color" value="#A78BFA">
        <button class="cf-btn cf-btn-primary cf-btn-sm" onclick="CF.addNewStatus()">+ Agregar</button>
      </div>
    </div>
  </div>`;
  }

  function addNewStatus() {
    const name = document.getElementById('cf-new-status-name').value.trim();
    if (!name) return;
    S.statuses.push({ id: 'custom_' + Date.now(), label: name, color: document.getElementById('cf-new-status-color').value, numbered: false });
    save(); renderStatusModal(); render();
  }

  function removeStatus(i) {
    if (!confirm('¿Eliminar "' + S.statuses[i].label + '"?')) return;
    const rid = S.statuses[i].id;
    S.statuses.splice(i, 1);
    S.records.forEach(r => { if (r.estatus === rid) r.estatus = ''; });
    save(); render();
  }

  function updateStatusColor(i, c) { S.statuses[i].color = c; save(); render(); }
  function toggleNumbered(i) { S.statuses[i].numbered = !S.statuses[i].numbered; save(); render(); }
  function promptEditStatus(i) {
    const n = prompt('Nuevo nombre:', S.statuses[i].label);
    if (n && n.trim()) { S.statuses[i].label = n.trim(); save(); renderStatusModal(); render(); }
  }

  // ─── RECORD MODAL ────────────────────────────────────────────────────────────

  function showRecordModal(existing) {
    const r = existing || { nombre: '', nombreResp: 'Manuelbis', cartaFecha: todayStr(), cfbpFecha: '', estatus: 'carta', comentario: '' };
    const sOpts = S.statuses.map(s => `<option value="${s.id}" ${r.estatus === s.id ? 'selected' : ''}>${s.label}</option>`).join('')
      + `<option value="" ${!r.estatus ? 'selected' : ''}>Sin estatus</option>`;
    document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()"><div class="cf-modal" onclick="event.stopPropagation()">
    <h3>${existing ? 'Editar Registro' : 'Nuevo Registro'}</h3>
    <div class="cf-form-grid">
      <div class="cf-fg cf-full"><label class="cf-fl">Nombre</label><input class="cf-fi" id="cf-r-nombre" value="${r.nombre}" placeholder="Nombre completo"></div>
      <div class="cf-fg"><label class="cf-fl">Responsable</label><input class="cf-fi" id="cf-r-resp" value="${r.nombreResp || 'Manuelbis'}"></div>
      <div class="cf-fg"><label class="cf-fl">Estatus</label><select class="cf-fs" id="cf-r-estatus">${sOpts}</select></div>
      <div class="cf-fg"><label class="cf-fl">Fecha Carta</label><input class="cf-fi" id="cf-r-cartaFecha" type="date" value="${r.cartaFecha || todayStr()}"></div>
      <div class="cf-fg"><label class="cf-fl">Fecha CFBP</label><input class="cf-fi" id="cf-r-cfbpFecha" type="date" value="${r.cfbpFecha || ''}"></div>
      <div class="cf-fg cf-full"><label class="cf-fl">Comentario</label><textarea class="cf-ft" id="cf-r-comentario">${r.comentario || ''}</textarea></div>
      <div class="cf-f-actions">
        <button class="cf-btn cf-btn-ghost" onclick="CF.closeModal()">Cancelar</button>
        <button class="cf-btn cf-btn-primary" onclick="CF.saveRecord('${existing ? r.id : ''}')">${existing ? 'Guardar' : 'Agregar'}</button>
      </div>
    </div>
  </div></div>`;
  }

  function saveRecord(eid) {
    const nombre = document.getElementById('cf-r-nombre').value.trim();
    if (!nombre) return;
    const data = {
      nombre,
      nombreResp: document.getElementById('cf-r-resp').value.trim() || 'Manuelbis',
      estatus: document.getElementById('cf-r-estatus').value,
      cartaFecha: document.getElementById('cf-r-cartaFecha').value,
      cfbpFecha: document.getElementById('cf-r-cfbpFecha').value,
      comentario: document.getElementById('cf-r-comentario').value.trim(),
    };
    if (eid) {
      const idx = S.records.findIndex(r => r.id === eid);
      if (idx > -1) S.records[idx] = { ...S.records[idx], ...data };
      addLog('edit', 'Editado: ' + data.nombre);
    } else {
      data.id = Date.now().toString();
      data.carta = false; data.cfbp = false;
      data.createdAt = new Date().toISOString();
      S.records.push(data);
      addLog('add', 'Nuevo: ' + data.nombre);
    }
    save(); closeModal(); render();
  }

  // ─── BULK ADD ────────────────────────────────────────────────────────────────

  function showBulkModal() {
    const sOpts = S.statuses.map(s => `<option value="${s.id}">${s.label}</option>`).join('') + '<option value="">Sin estatus</option>';
    document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()"><div class="cf-modal cf-modal-wide" onclick="event.stopPropagation()">
    <h3>Agregar Clientes en Lote</h3>
    <p style="font-size:13px;color:var(--text-2);margin-bottom:14px">Pega una lista de nombres, uno por línea.</p>
    <div class="cf-form-grid">
      <div class="cf-fg"><label class="cf-fl">Responsable</label><input class="cf-fi" id="cf-b-resp" value="Manuelbis"></div>
      <div class="cf-fg"><label class="cf-fl">Estatus</label><select class="cf-fs" id="cf-b-estatus">${sOpts}</select></div>
      <div class="cf-fg"><label class="cf-fl">Fecha Carta</label><input class="cf-fi" id="cf-b-fecha" type="date" value="${todayStr()}"></div>
      <div class="cf-fg"></div>
      <div class="cf-fg cf-full">
        <label class="cf-fl">Lista de Nombres (uno por línea)</label>
        <textarea class="cf-ft" id="cf-b-names" style="min-height:150px" placeholder="Mary Marlyn Duarte Castillo&#10;Aneurys G Polanco" oninput="CF.previewBulk()"></textarea>
      </div>
      <div class="cf-fg cf-full" id="cf-b-preview"></div>
      <div class="cf-f-actions">
        <button class="cf-btn cf-btn-ghost" onclick="CF.closeModal()">Cancelar</button>
        <button class="cf-btn cf-btn-primary" onclick="CF.executeBulk()">Agregar Todos</button>
      </div>
    </div>
  </div></div>`;
  }

  function previewBulk() {
    const names = document.getElementById('cf-b-names').value.split('\n').map(n => n.trim()).filter(Boolean);
    const el = document.getElementById('cf-b-preview');
    if (!el) return;
    if (!names.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="cf-bulk-preview">${names.map((n, i) => `<div class="cf-bp-item"><span class="cf-bp-num">${i + 1}.</span> ${n}</div>`).join('')}</div>
    <div style="font-size:12px;color:var(--text-2)">${names.length} cliente${names.length > 1 ? 's' : ''} se agregarán</div>`;
  }

  function executeBulk() {
    const names = document.getElementById('cf-b-names').value.split('\n').map(n => n.trim()).filter(Boolean);
    if (!names.length) return;
    const resp   = document.getElementById('cf-b-resp').value.trim() || 'Manuelbis';
    const estatus = document.getElementById('cf-b-estatus').value;
    const fecha  = document.getElementById('cf-b-fecha').value;
    names.forEach((nombre, i) => {
      S.records.push({ id: (Date.now() + i).toString(), nombre, nombreResp: resp, estatus, carta: false, cfbp: false, cartaFecha: fecha, cfbpFecha: '', comentario: '', createdAt: new Date().toISOString() });
    });
    addLog('bulk', `${names.length} clientes agregados en lote`);
    save(); closeModal(); render();
    cfToast(`✓ ${names.length} clientes agregados`);
  }

  // ─── RECORD ACTIONS ──────────────────────────────────────────────────────────

  function deleteRecord(id) {
    if (!confirm('¿Eliminar?')) return;
    const r = S.records.find(x => x.id === id);
    S.records = S.records.filter(x => x.id !== id);
    addLog('delete', 'Eliminado: ' + (r?.nombre || ''));
    save(); render();
  }

  function toggleCarta(id) {
    const r = S.records.find(x => x.id === id); if (!r) return;
    r.carta = !r.carta;
    if (r.carta && !r.cartaFecha) r.cartaFecha = todayStr();
    addLog('carta', r.carta ? 'Carta ✓: ' + r.nombre : 'Carta desmarcada: ' + r.nombre);
    save(); render();
  }

  function toggleCfbp(id) {
    const r = S.records.find(x => x.id === id); if (!r) return;
    r.cfbp = !r.cfbp;
    if (r.cfbp && !r.cfbpFecha) r.cfbpFecha = todayStr();
    addLog('cfbp', r.cfbp ? 'CFBP ✓: ' + r.nombre : 'CFBP desmarcado: ' + r.nombre);
    save(); render();
  }

  function changeEstatus(id, val) {
    const r = S.records.find(x => x.id === id); if (!r) return;
    r.estatus = val;
    addLog('estatus', 'Estatus → ' + statusLabel(val) + ': ' + r.nombre);
    save(); render();
  }

  function exportCSV() {
    const h = ['Nombre', 'Responsable', 'Estatus', 'Carta', 'Fecha Carta', 'CFBP', 'Fecha CFBP', 'Comentario'];
    const rows = S.records.map(r => [r.nombre, r.nombreResp, statusLabel(r.estatus), r.carta ? 'Sí' : 'No', r.cartaFecha || '', r.cfbp ? 'Sí' : 'No', r.cfbpFecha || '', r.comentario || '']);
    const csv = [h, ...rows].map(row => row.map(c => '"' + (c || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reparacion_' + todayStr() + '.csv'; a.click();
  }

  // ─── WHATSAPP ────────────────────────────────────────────────────────────────

  function sendWhatsAppReport() {
    const date = document.getElementById('cf-rpt-date')?.value || '';
    const resp = document.getElementById('cf-rpt-resp')?.value || '';
    window.open('https://wa.me/?text=' + encodeURIComponent(generateReportText(date, resp)), '_blank');
  }

  function sendWhatsAppToClient(recordId, templateId) {
    const r   = S.records.find(x => x.id === recordId);
    const tpl = S.templates.find(x => x.id === templateId);
    if (!r || !tpl) return;
    const msg = tpl.msg
      .replace(/\{nombre\}/g, r.nombre)
      .replace(/\{responsable\}/g, r.nombreResp)
      .replace(/\{fecha\}/g, r.cartaFecha || '');
    const phone = r.phone ? r.phone.replace(/\D/g, '') : '';
    window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function showWhatsAppModal(recordId) {
    const r = S.records.find(x => x.id === recordId); if (!r) return;
    const items = S.templates.map(t => {
      const preview = t.msg.replace(/\{nombre\}/g, r.nombre).replace(/\{responsable\}/g, r.nombreResp).replace(/\{fecha\}/g, r.cartaFecha || '');
      const match = !t.statusId || t.statusId === r.estatus;
      const sc = t.statusId ? statusColor(t.statusId) : 'var(--text-3)';
      const badge = t.statusId ? `<span class="cf-badge" style="background:${sc}18;color:${sc}">${statusLabel(t.statusId)}</span>` : '';
      return `<div class="cf-tpl-card" style="${match ? '' : 'opacity:.55'}">
      <div class="cf-tpl-card-hdr">
        <span>${t.label} ${badge}</span>
        <button class="cf-btn cf-btn-wa cf-btn-sm" onclick="CF.sendWhatsAppToClient('${r.id}','${t.id}')">📲 Enviar</button>
      </div>
      <div class="cf-tpl-preview">${preview}</div>
    </div>`;
    }).join('');
    document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()"><div class="cf-modal cf-modal-wide" onclick="event.stopPropagation()">
    <h3>Enviar WhatsApp a ${r.nombre}</h3>
    ${items || '<p style="color:var(--text-3);text-align:center;padding:20px">No hay plantillas. Crea una en la sección Plantillas.</p>'}
  </div></div>`;
  }

  // ─── TEMPLATES ───────────────────────────────────────────────────────────────

  function showTemplateModal(existing) {
    const t = existing || { id: '', statusId: '', label: '', msg: '' };
    const sOpts = S.statuses.map(s => `<option value="${s.id}" ${t.statusId === s.id ? 'selected' : ''}>${s.label}</option>`).join('');
    document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()"><div class="cf-modal cf-modal-wide" onclick="event.stopPropagation()">
    <h3>${existing ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
    <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">Usa <strong>{nombre}</strong>, <strong>{responsable}</strong> y <strong>{fecha}</strong> como variables.</p>
    <div class="cf-form-grid">
      <div class="cf-fg"><label class="cf-fl">Nombre de Plantilla</label><input class="cf-fi" id="cf-tpl-label" value="${t.label}" placeholder="Ej: Seguimiento"></div>
      <div class="cf-fg"><label class="cf-fl">Estatus Asociado</label>
        <select class="cf-fs" id="cf-tpl-status"><option value="">Todos los estatus</option>${sOpts}</select>
      </div>
      <div class="cf-fg cf-full"><label class="cf-fl">Mensaje</label>
        <textarea class="cf-ft" id="cf-tpl-msg" style="min-height:120px">${t.msg}</textarea>
      </div>
      <div class="cf-f-actions">
        <button class="cf-btn cf-btn-ghost" onclick="CF.closeModal()">Cancelar</button>
        <button class="cf-btn cf-btn-primary" onclick="CF.saveTemplate('${existing ? t.id : ''}')">${existing ? 'Guardar' : 'Crear'}</button>
      </div>
    </div>
  </div></div>`;
  }

  function saveTemplate(eid) {
    const label = document.getElementById('cf-tpl-label').value.trim();
    const msg   = document.getElementById('cf-tpl-msg').value.trim();
    if (!label || !msg) return;
    const data = { label, statusId: document.getElementById('cf-tpl-status').value, msg };
    if (eid) {
      const idx = S.templates.findIndex(t => t.id === eid);
      if (idx > -1) S.templates[idx] = { ...S.templates[idx], ...data };
    } else {
      data.id = 'tpl_' + Date.now();
      S.templates.push(data);
    }
    save(); closeModal(); render();
  }

  function deleteTemplate(id) {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    S.templates = S.templates.filter(t => t.id !== id);
    save(); render();
  }

  // ─── REPORT ──────────────────────────────────────────────────────────────────

  function getFilteredForReport(date, resp) {
    return S.records.filter(r => {
      const mD = !date || r.cartaFecha === date;
      const mR = !resp || r.nombreResp.toLowerCase().includes(resp.toLowerCase());
      return mD && mR;
    });
  }

  function generateReportText(date, resp) {
    const f = getFilteredForReport(date, resp);
    let t = (resp || 'Manuelbis') + '\n' + fmtDateShort(date || todayStr()) + '\n';
    S.statuses.forEach(st => {
      const g = f.filter(r => r.estatus === st.id);
      if (!g.length) return;
      t += '\n' + st.label + ':\n';
      g.forEach((r, i) => { t += st.numbered ? (i + 1) + '. ' + r.nombre + '\n' : r.nombre + '\n'; });
    });
    const ns = f.filter(r => !r.estatus || !getStatus(r.estatus));
    if (ns.length) { t += '\nSin estatus:\n'; ns.forEach(r => { t += r.nombre + '\n'; }); }
    if (!f.length) t += '\nSin registros para esta fecha.\n';
    return t.trim();
  }

  function generateReportHTML(date, resp) {
    const f = getFilteredForReport(date, resp);
    let h = `<div style="font-weight:700;font-size:16px">${resp || 'Manuelbis'}</div>
           <div style="color:var(--text-2);margin-bottom:14px">${fmtDateShort(date || todayStr())}</div>`;
    S.statuses.forEach(st => {
      const g = f.filter(r => r.estatus === st.id);
      if (!g.length) return;
      h += `<div class="cf-rpt-section"><div class="cf-rpt-title" style="color:${st.color}">${st.label}:</div>`;
      g.forEach((r, i) => { h += `<div>${st.numbered ? (i + 1) + '. ' + r.nombre : r.nombre}</div>`; });
      h += '</div>';
    });
    const ns = f.filter(r => !r.estatus || !getStatus(r.estatus));
    if (ns.length) {
      h += '<div class="cf-rpt-section"><div class="cf-rpt-title" style="color:var(--text-3)">Sin estatus:</div>';
      ns.forEach(r => { h += `<div>${r.nombre}</div>`; });
      h += '</div>';
    }
    if (!f.length) h += '<div style="color:var(--text-3);text-align:center;padding:20px">Sin registros para estos filtros.</div>';
    return h;
  }

  function copyReport() {
    const text = generateReportText(
      document.getElementById('cf-rpt-date')?.value || '',
      document.getElementById('cf-rpt-resp')?.value || ''
    );
    navigator.clipboard.writeText(text)
      .then(() => cfToast('✓ Copiado'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        cfToast('✓ Copiado');
      });
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  function render() {
    const t = todayStr();
    const statusCounts = {};
    S.statuses.forEach(st => { statusCounts[st.id] = S.records.filter(r => r.estatus === st.id).length; });
    const todayCount = S.log.filter(l => l.ts.startsWith(t)).length;

    // ── DASHBOARD ──
    const recentActs = S.log.filter(l => l.ts.startsWith(t)).slice(-8).reverse()
      .map(l => `<div class="cf-act-item">
      <span class="cf-act-dot" style="background:${actColor(l.type)}"></span>
      <div style="flex:1"><div style="font-size:13px">${l.desc}</div><div class="cf-act-time">${fmtTime(l.ts)}</div></div>
    </div>`).join('') || '<p style="color:var(--text-3);font-size:13px;padding:20px;text-align:center">Sin actividad hoy.</p>';

    const recentRows = S.records.slice(-5).reverse().map(r => {
      const c = statusColor(r.estatus);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
      <div><div style="font-size:13.5px;font-weight:500">${r.nombre}</div>
      <div style="font-size:11px;color:var(--text-3)">${r.nombreResp} · ${r.cartaFecha || '—'}</div></div>
      <span class="cf-badge" style="background:${c}18;color:${c}">${statusLabel(r.estatus)}</span>
    </div>`;
    }).join('') || '<p style="color:var(--text-3);font-size:13px">Sin registros.</p>';

    document.getElementById('cf-v-dashboard').innerHTML = `
    <div class="cf-page-hdr"><h2>Dashboard</h2><span class="cf-subtitle">${fmtLong()}</span></div>
    <div class="cf-stat-grid">
      <div class="cf-card cf-stat-card"><div class="cf-stat-val" style="color:var(--accent)">${S.records.length}</div><div class="cf-stat-lbl">Total</div></div>
      ${S.statuses.map(st => `<div class="cf-card cf-stat-card"><div class="cf-stat-val" style="color:${st.color}">${statusCounts[st.id] || 0}</div><div class="cf-stat-lbl">${st.label}</div></div>`).join('')}
      <div class="cf-card cf-stat-card"><div class="cf-stat-val" style="color:var(--text-2)">${todayCount}</div><div class="cf-stat-lbl">Acciones Hoy</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="cf-card"><div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--text-2)">Últimos Registros</div>${recentRows}</div>
      <div class="cf-card"><div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--text-2)">Actividad Hoy</div>${recentActs}</div>
    </div>`;

    // ── REPARACIÓN ──
    const sv = document.getElementById('cf-search-input')?.value ?? S.search;
    S.search = sv;
    let fil = S.records.filter(r => r.nombre.toLowerCase().includes(sv.toLowerCase()));
    if (S.filterStatus !== 'all') {
      fil = fil.filter(r => S.filterStatus === 'none' ? !r.estatus : r.estatus === S.filterStatus);
    }

    const tRows = fil.map(r => {
      const opts = S.statuses.map(s => `<option value="${s.id}" ${r.estatus === s.id ? 'selected' : ''}>${s.label}</option>`).join('')
        + `<option value="" ${!r.estatus ? 'selected' : ''}>—</option>`;
      const sc = statusColor(r.estatus);
      return `<tr>
      <td style="font-weight:500;min-width:180px">${r.nombre}</td>
      <td>${r.nombreResp}</td>
      <td><select class="cf-status-select" style="background:${sc}18;color:${sc};border-color:${sc}" onchange="CF.changeEstatus('${r.id}',this.value)">${opts}</select></td>
      <td class="cf-chk-cell"><div class="cf-chk ${r.carta ? 'checked' : ''}" onclick="CF.toggleCarta('${r.id}')"></div></td>
      <td style="color:var(--text-2);font-size:12.5px;white-space:nowrap">${r.cartaFecha || '—'}</td>
      <td class="cf-chk-cell"><div class="cf-chk ${r.cfbp ? 'checked' : ''}" onclick="CF.toggleCfbp('${r.id}')"></div></td>
      <td style="color:var(--text-2);font-size:12.5px;white-space:nowrap">${r.cfbpFecha || '—'}</td>
      <td style="color:var(--text-2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.comentario || '—'}</td>
      <td><div class="cf-inline-actions">
        <button class="cf-btn cf-btn-wa cf-btn-sm" onclick="CF.showWhatsAppModal('${r.id}')" title="WhatsApp">📲</button>
        <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.showRecordModal(CF.getRecord('${r.id}'))">✏️</button>
        <button class="cf-btn cf-btn-danger cf-btn-sm" onclick="CF.deleteRecord('${r.id}')">🗑️</button>
      </div></td>
    </tr>`;
    }).join('');

    const pills = `<div class="cf-filter-bar">
    <span style="font-size:11px;color:var(--text-3);margin-right:4px">Filtrar:</span>
    <span class="cf-filter-pill" style="${S.filterStatus === 'all' ? 'background:var(--accent);color:#fff;border-color:var(--accent)' : ''}" onclick="CF.setFilter('all')">Todos (${S.records.length})</span>
    ${S.statuses.map(st => `<span class="cf-filter-pill" style="${S.filterStatus === st.id ? 'background:' + st.color + ';color:#fff;border-color:' + st.color : ''}" onclick="CF.setFilter('${st.id}')">${st.label} (${statusCounts[st.id] || 0})</span>`).join('')}
    <span class="cf-filter-pill" style="${S.filterStatus === 'none' ? 'background:var(--text-3);color:#fff;border-color:var(--text-3)' : ''}" onclick="CF.setFilter('none')">Sin estatus</span>
  </div>`;

    document.getElementById('cf-v-reparacion').innerHTML = `
    <div class="cf-page-hdr"><h2>Reparación</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input class="cf-search-box" id="cf-search-input" placeholder="Buscar..." value="${S.search}" oninput="CF.setSearch(this.value)">
        <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.renderStatusModal()">⚙️ Estatus</button>
        <button class="cf-btn cf-btn-export cf-btn-sm" onclick="CF.exportCSV()">📥 CSV</button>
        <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.showBulkModal()">📋 Lote</button>
        <button class="cf-btn cf-btn-primary" onclick="CF.showRecordModal()">+ Nuevo</button>
      </div>
    </div>
    ${pills}
    ${!S.records.length
      ? '<div class="cf-card cf-empty"><p>No hay registros</p><button class="cf-btn cf-btn-primary" onclick="CF.showRecordModal()">+ Agregar</button></div>'
      : `<div class="cf-card"><div class="cf-tbl-wrap"><table><thead><tr>
          <th>Nombre</th><th>Resp.</th><th>Estatus</th><th>Carta</th><th>F. Carta</th><th>CFBP</th><th>F. CFBP</th><th>Comentario</th><th></th>
        </tr></thead><tbody>${tRows}</tbody></table></div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:12px;color:var(--text-3)">
          <span>Mostrando ${fil.length} de ${S.records.length}</span>
          <span>${S.statuses.map(s => `${s.label}: ${statusCounts[s.id] || 0}`).join(' · ')}</span>
        </div></div>`}`;

    // ── REPORTES ──
    const rDate = document.getElementById('cf-rpt-date')?.value || S.reportDate || t;
    const rResp = document.getElementById('cf-rpt-resp')?.value || S.reportResp || '';
    S.reportDate = rDate; S.reportResp = rResp;
    const resps   = [...new Set(S.records.map(r => r.nombreResp).filter(Boolean))];
    const respOpts = resps.map(r => `<option value="${r}" ${r === rResp ? 'selected' : ''}>${r}</option>`).join('');
    const rptFil  = getFilteredForReport(rDate, rResp);
    const summaryCards = S.statuses.map(st => {
      const cnt = rptFil.filter(r => r.estatus === st.id).length;
      return `<div style="text-align:center;padding:16px;background:${st.color}18;border-radius:10px">
      <div style="font-size:28px;font-weight:800;color:${st.color};font-family:'Playfair Display',serif">${cnt}</div>
      <div style="font-size:11px;color:${st.color};text-transform:uppercase;letter-spacing:1px">${st.label}</div>
    </div>`;
    }).join('');

    document.getElementById('cf-v-reportes').innerHTML = `
    <div class="cf-page-hdr"><h2>Reportes</h2>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label style="font-size:12px;color:var(--text-2)">Fecha:</label>
        <input type="date" class="cf-date-filter" id="cf-rpt-date" value="${rDate}" onchange="CF.setReportDate(this.value)">
        <label style="font-size:12px;color:var(--text-2)">Resp:</label>
        <select class="cf-fs" id="cf-rpt-resp" style="width:150px;padding:7px 12px;font-size:13px;border-radius:9px" onchange="CF.setReportResp(this.value)">
          <option value="">Todos</option>${respOpts}
        </select>
      </div>
    </div>
    <div class="cf-card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:14px;font-weight:600;color:var(--text-2)">Vista Previa</div>
        <div style="display:flex;gap:8px">
          <button class="cf-btn cf-btn-primary cf-btn-sm" onclick="CF.copyReport()">📋 Copiar</button>
          <button class="cf-btn cf-btn-wa cf-btn-sm" onclick="CF.sendWhatsAppReport()">📲 WhatsApp</button>
        </div>
      </div>
      <div class="cf-report-box">${generateReportHTML(rDate, rResp)}</div>
    </div>
    <div class="cf-card">
      <div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--text-2)">Resumen</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px">${summaryCards}</div>
    </div>`;

    // ── PLANTILLAS ──
    const tplItems = S.templates.map(tpl => {
      const sc  = tpl.statusId ? statusColor(tpl.statusId) : 'var(--text-3)';
      const lbl = tpl.statusId ? statusLabel(tpl.statusId) : 'Todos';
      return `<div class="cf-tpl-card">
      <div class="cf-tpl-card-hdr">
        <span>${tpl.label} <span class="cf-badge" style="background:${sc}18;color:${sc}">${lbl}</span></span>
        <div style="display:flex;gap:6px">
          <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.showTemplateModal(CF.getTemplate('${tpl.id}'))">✏️</button>
          <button class="cf-btn cf-btn-danger cf-btn-sm" onclick="CF.deleteTemplate('${tpl.id}')">🗑️</button>
        </div>
      </div>
      <div class="cf-tpl-preview">${tpl.msg}</div>
    </div>`;
    }).join('');

    document.getElementById('cf-v-plantillas').innerHTML = `
    <div class="cf-page-hdr"><h2>Plantillas de WhatsApp</h2>
      <button class="cf-btn cf-btn-primary" onclick="CF.showTemplateModal()">+ Nueva Plantilla</button>
    </div>
    <div class="cf-card">
      <p style="font-size:13px;color:var(--text-2);margin-bottom:16px">Usa <strong>{nombre}</strong>, <strong>{responsable}</strong> y <strong>{fecha}</strong> como variables.</p>
      ${tplItems || '<div class="cf-empty" style="padding:30px"><p>No hay plantillas creadas</p></div>'}
    </div>`;

    // ── ACTIVIDAD ──
    const aEl   = document.getElementById('cf-act-date');
    const aDate = aEl ? aEl.value : t;
    const aLogs = S.log.filter(l => l.ts.startsWith(aDate));
    const aLabel = aDate === t ? 'Hoy' : new Date(aDate + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById('cf-v-activity').innerHTML = `
    <div class="cf-page-hdr"><h2>Actividad</h2>
      <div style="display:flex;align-items:center;gap:10px">
        <label style="font-size:12px;color:var(--text-2)">Fecha:</label>
        <input type="date" class="cf-date-filter" id="cf-act-date" value="${aDate}" onchange="CF.render()">
      </div>
    </div>
    <div class="cf-card">
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:var(--text-2)">${aLabel}
        <span style="margin-left:8px;font-size:12px;color:var(--text-3)">${aLogs.length} acciones</span>
      </div>
      ${aLogs.slice().reverse().map(l => `<div class="cf-act-item">
        <span class="cf-act-dot" style="background:${actColor(l.type)}"></span>
        <div style="flex:1"><div style="font-size:13.5px">${l.desc}</div><div class="cf-act-time">${fmtTime(l.ts)}</div></div>
      </div>`).join('') || '<div class="cf-empty" style="padding:30px"><p>Sin actividad</p></div>'}
    </div>`;
  }

  // ─── EXPORTS ─────────────────────────────────────────────────────────────────

  /**
   * Saves a client from CreditRadar output directly into CreditFlow.
   * Returns true if added, false if already existed.
   */
  function saveToCreditFlow(nombre, nombreResp) {
    if (!nombre) return false;
    const records = loadCFData(CF_RECORDS_KEY, []);
    if (records.some(r => r.nombre.toLowerCase() === nombre.toLowerCase())) return false;
    records.push({
      id: Date.now().toString(),
      nombre,
      nombreResp: 'Manuelbis',
      estatus: 'carta',
      carta: false, cfbp: false,
      cartaFecha: todayStr(), cfbpFecha: '',
      comentario: '',
      createdAt: new Date().toISOString(),
    });
    saveCFData(CF_RECORDS_KEY, records);
    const log = loadCFData(CF_LOG_KEY, []);
    log.push({ id: Date.now() + 'l', type: 'add', desc: 'Guardado desde CreditRadar: ' + nombre, ts: new Date().toISOString() });
    saveCFData(CF_LOG_KEY, log);
    return true;
  }

  /** Entry point — called when the userscript detects it's on the CreditFlow page. */
  function initCreditFlow() {
    const style = document.createElement('style');
    style.textContent = CF_CSS;
    document.head.appendChild(style);

    document.title = 'CreditFlow — Reparación de Crédito';

    document.body.innerHTML = `
  <div class="cf-app">
    <nav class="cf-sidebar">
      <div class="cf-brand"><h1>CreditFlow</h1><p>Reparación</p></div>
      <div class="cf-nav-item active" data-view="dashboard" onclick="CF.nav('dashboard')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Dashboard</span>
      </div>
      <div class="cf-nav-item" data-view="reparacion" onclick="CF.nav('reparacion')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
        <span>Reparación</span>
      </div>
      <div class="cf-nav-item" data-view="reportes" onclick="CF.nav('reportes')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        <span>Reportes</span>
      </div>
      <div class="cf-nav-item" data-view="plantillas" onclick="CF.nav('plantillas')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span>Plantillas</span>
      </div>
      <div class="cf-nav-item" data-view="activity" onclick="CF.nav('activity')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span>Actividad</span>
      </div>
      <div class="cf-sidebar-footer"><p>Datos en Tampermonkey</p></div>
    </nav>
    <main class="cf-main">
      <div id="cf-v-dashboard"></div>
      <div id="cf-v-reparacion" class="hidden"></div>
      <div id="cf-v-reportes" class="hidden"></div>
      <div id="cf-v-plantillas" class="hidden"></div>
      <div id="cf-v-activity" class="hidden"></div>
    </main>
  </div>
  <div id="cf-modal-root"></div>
  <div id="cf-toast-root"></div>`;

    S = initState();

    window.CF = {
      nav, closeModal, render,
      renderStatusModal, addNewStatus, removeStatus, updateStatusColor, toggleNumbered, promptEditStatus,
      showRecordModal, saveRecord,
      showBulkModal, previewBulk, executeBulk,
      deleteRecord, toggleCarta, toggleCfbp, changeEstatus, exportCSV,
      showWhatsAppModal, sendWhatsAppToClient, sendWhatsAppReport,
      showTemplateModal, saveTemplate, deleteTemplate,
      copyReport,
      setFilter:      v  => { S.filterStatus = v;    render(); },
      setSearch:      v  => { S.search = v;           render(); },
      setReportDate:  v  => { S.reportDate = v;       render(); },
      setReportResp:  v  => { S.reportResp = v;       render(); },
      getRecord:      id => S.records.find(x => x.id === id),
      getTemplate:    id => S.templates.find(x => x.id === id),
    };

    render();
  }

  const buttonAnimationStyles = `
  @keyframes crSlideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes crFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes crScaleIn { from{opacity:0;transform:translate(-50%,-50%) scale(0.93)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }

  /* Toolbar */
  #crToolbar { display:flex; flex-direction:column; align-items:center; gap:0; background:rgba(20,20,20,0.85); backdrop-filter:blur(8px); padding:8px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 4px 16px rgba(0,0,0,0.4); transition:padding 0.2s ease, opacity 0.2s ease; margin:4px auto; }
  #crToolbar:hover { padding:10px 8px; }
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
  .cr-cf-btn { padding:11px 16px; background:#4F7CFF18; color:#4F7CFF; border:1px solid #4F7CFF33; border-radius:9px; cursor:pointer; font-size:13px; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
  .cr-cf-btn:hover { background:#4F7CFF; color:#fff; }

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
  .cr-inq-link-btn { width:28px; height:22px; border-radius:4px; border:none; background:#0d1e1d; color:#5eead4; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; margin-right:2px; flex-shrink:0; }
  .cr-inq-link-btn:hover { background:#5eead4; color:#000; }
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

  /* Daily Report */
  .cr-report-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:9999998; animation:crFadeIn 0.15s ease; }
  .cr-report-modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#161616; color:#fff; border-radius:14px; z-index:9999999; width:520px; max-width:92vw; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 0 0 1px #2a2a2a,0 20px 60px rgba(0,0,0,0.8); animation:crScaleIn 0.22s ease; overflow:hidden; }
  .cr-report-head { padding:18px 20px 14px; border-bottom:1px solid #1e1e1e; display:flex; justify-content:space-between; align-items:center; }
  .cr-report-head-left { display:flex; flex-direction:column; gap:2px; }
  .cr-report-title { font-size:16px; font-weight:700; letter-spacing:-0.3px; }
  .cr-report-subtitle { font-size:11px; color:#555; }
  .cr-report-filters { padding:12px 20px; border-bottom:1px solid #1e1e1e; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .cr-report-date { background:#111; border:1px solid #222; border-radius:7px; padding:6px 10px; color:#ddd; font-size:12px; outline:none; transition:border-color 0.2s; }
  .cr-report-date:focus { border-color:#5eead4; }
  .cr-report-body { flex:1; overflow-y:auto; padding:14px 20px; min-height:0; }
  .cr-report-body::-webkit-scrollbar { width:3px; }
  .cr-report-body::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
  .cr-report-box { background:#0d0d0d; border:1px solid #222; border-radius:8px; padding:16px 18px; font-family:monospace; font-size:12px; line-height:1.8; white-space:pre-wrap; color:#bbb; max-height:45vh; overflow-y:auto; }
  .cr-report-box::-webkit-scrollbar { width:3px; }
  .cr-report-box::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
  .cr-report-empty { text-align:center; color:#444; font-size:13px; padding:30px 0; }
  .cr-report-foot { padding:12px 20px; border-top:1px solid #1e1e1e; display:flex; gap:9px; }
  .cr-report-btn-copy { flex:1; padding:10px; background:#5eead4; color:#0f172a; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px; }
  .cr-report-btn-copy:hover { background:#2dd4bf; }
  .cr-report-btn-copy.copied { background:#60a5fa; color:#fff; }
  .cr-report-btn-wa { padding:10px 16px; background:#25D36622; color:#25D366; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px; }
  .cr-report-btn-wa:hover { background:#25D366; color:#fff; }
  .cr-report-btn-close { padding:10px 16px; background:#1e1e1e; color:#666; border:1px solid #2a2a2a; border-radius:8px; cursor:pointer; font-size:13px; transition:all 0.2s; }
  .cr-report-btn-close:hover { background:#252525; color:#ccc; }
  .cr-hist-report-btn { width:100%; padding:9px; background:#0d1e1d; color:#5eead4; border:1px solid #5eead430; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold; transition:all 0.2s; margin-bottom:8px; }
  .cr-hist-report-btn:hover { background:#5eead4; color:#0f172a; }

  /* Client Status */
  .cr-hist-status-row { position:relative; margin-bottom:6px; }
  .cr-hist-status-btn { padding:3px 10px; border-radius:20px; border:1px solid #2a2a2a; background:#1a1a1a; color:#555; font-size:11px; cursor:pointer; transition:all 0.15s; display:inline-flex; align-items:center; gap:5px; }
  .cr-hist-status-btn:hover { border-color:#444; color:#888; }
  .cr-status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; flex-shrink:0; }
  .cr-status-dropdown { position:absolute; top:100%; left:0; margin-top:4px; background:#1a1a1a; border:1px solid #2a2a2a; border-radius:8px; padding:4px; z-index:10; min-width:160px; box-shadow:0 8px 24px rgba(0,0,0,0.5); animation:crFadeIn 0.12s ease; }
  .cr-status-option { display:flex; align-items:center; gap:8px; width:100%; padding:6px 10px; border:none; background:transparent; color:#bbb; font-size:11px; cursor:pointer; border-radius:5px; transition:background 0.1s; text-align:left; }
  .cr-status-option:hover { background:#252525; color:#fff; }
  .cr-cstatus-item { display:flex; align-items:center; gap:8px; background:#1a1a1a; border:1px solid #222; border-radius:8px; padding:8px 10px; }
  .cr-cstatus-color { width:32px; height:28px; border-radius:6px; border:1px solid #2a2a2a; cursor:pointer; background:none; padding:1px; flex-shrink:0; }
  .cr-cstatus-name { flex:1; background:#111; color:#ddd; border:1px solid #222; border-radius:6px; padding:5px 8px; font-size:12px; outline:none; transition:border-color 0.2s; }
  .cr-cstatus-name:focus { border-color:#333; }
  .cr-cstatus-del { width:24px; height:24px; border-radius:5px; border:none; background:#1e1e1e; color:#555; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
  .cr-cstatus-del:hover { background:#f87171; color:#fff; }
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

  async function addButton(config, runFn, openConfigFn, showHistoryFn) {
    if (document.getElementById('crToolbar')) return;

    const container = await waitForElement('#CommunicationSideBarContainer');
    if (!container) {
      console.warn('[Clasificador] No se encontró #CommunicationSideBarContainer');
      return;
    }

    const toolbar = document.createElement('div');
    toolbar.id = 'crToolbar';
    toolbar.innerHTML = `
    <button id="clasificadorBTN" aria-label="Ejecutar clasificador (v${SCRIPT_VERSION})">
      📋<span class="cr-ver">v${SCRIPT_VERSION}</span>
    </button>
    <div class="cr-tb-extras">
      <button id="crHistoryBtn" aria-label="Historial" title="Historial">🕐</button>
      <button id="crSettingsBtn" aria-label="Configuración" title="Configuración">⚙️</button>
    </div>
  `;
    container.prepend(toolbar);

    document.getElementById('clasificadorBTN').onclick = runFn;
    document.getElementById('crHistoryBtn').onclick = showHistoryFn;
    document.getElementById('crSettingsBtn').onclick = openConfigFn;
    setButtonAnimation('idle');
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
      background: "#111", color: "#fff", padding: "15px 18px",
      borderRadius: "10px", zIndex: "99999", fontSize: "14px",
      minWidth: "220px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      border: "1px solid #2a2a2a"
    });
    panel.innerHTML = `
    <div id="progressLabel" style="font-size:11px;color:#5eead4;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Iniciando...</div>
    <div id="progressCount" style="font-size:18px;font-weight:bold;margin-bottom:4px">—</div>
    <div id="progressName" style="color:#aaa;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px"></div>
  `;
    document.body.appendChild(panel);
  }

  function updateProgress(current, total, name, label = "Procesando") {
    const escapeHtml = str => (str||"").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const lEl = document.getElementById("progressLabel");
    const cEl = document.getElementById("progressCount");
    const nEl = document.getElementById("progressName");
    if (lEl) lEl.textContent = label;
    if (cEl) cEl.textContent = total === "?" ? "Cargando..." : `${current} de ${total}`;
    if (nEl) nEl.innerHTML = escapeHtml(name);
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
    return parts.join(" ").replace(/'/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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

  function addInquiryAlias(config, inquiryName, accountName) {
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

  function buildClientStatusItem(st) {
    const item = document.createElement('div');
    item.className = 'cr-cstatus-item';
    item.innerHTML = `
    <input type="color" class="cr-cstatus-color" value="${st.color || '#5eead4'}">
    <input class="cr-cstatus-name" value="${escapeHtml(st.name || '')}" placeholder="Nombre del estado">
    <button class="cr-cstatus-del" title="Eliminar">✕</button>
  `;
    item.querySelector('.cr-cstatus-del').onclick = () => item.remove();
    return item;
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
      <button class="cr-tab" data-tab="clientstatus">Est. Cliente</button>
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
      <div class="cr-pane" id="cr-pane-clientstatus">
        <div class="cr-lbl">Estados disponibles para asignar a clientes en el historial</div>
        <div id="crClientStatusList" class="cr-fields"></div>
        <button class="cr-alias-add-btn" id="crClientStatusAdd" style="margin-top:8px;width:100%">+ Agregar estado</button>
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

    const csList = document.getElementById('crClientStatusList');
    (config.clientStatuses || []).forEach(st => csList.appendChild(buildClientStatusItem(st)));
    document.getElementById('crClientStatusAdd').onclick = () => {
      csList.appendChild(buildClientStatusItem({ name: '', color: '#5eead4' }));
      csList.lastElementChild.querySelector('.cr-cstatus-name').focus();
    };

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
      config.clientStatuses = [...document.getElementById('crClientStatusList').querySelectorAll('.cr-cstatus-item')]
        .map(item => ({
          name: item.querySelector('.cr-cstatus-name').value.trim(),
          color: item.querySelector('.cr-cstatus-color').value
        })).filter(g => g.name);
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
      address: (queryOne(SELECTORS.client.address)?.innerHTML || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim(),
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

    const detailPanel = await waitForElement(`#dispute-view-details-${id}`, document, 30000);
    if (!detailPanel?.offsetParent) return 'timeout';

    const fullBtn = queryOne(`#dispute-view-details-${id}`);
    if (fullBtn?.offsetParent) {
      fullBtn.click();
      await waitForElement(SELECTORS.detail.blocks, item, 30000);
    }

    return true;
  }

  async function loadRoundDisputes(onProgress) {
    const section = queryOne(SELECTORS.sections.disputed);
    if (!section) return [];

    const allLinks = queryAll(SELECTORS.compact.disputeLink, section);
    const links = allLinks.filter(l =>
      l.innerText.trim() === "This Round" && l.offsetParent !== null
    );

    const expandedLinks = [];
    const timedOutLinks = [];

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const item = link.closest(SELECTORS.compact.container);
      const name = queryOne(SELECTORS.compact.name, item)?.innerText.trim() || "";
      if (onProgress) onProgress(i + 1, links.length, name);
      const result = await expandDisputeItem(link, item);
      if (result === true) expandedLinks.push(link);
      else if (result === 'timeout') timedOutLinks.push(link);
    }

    return {
      links: [...links.filter(l => !expandedLinks.includes(l) && !timedOutLinks.includes(l)), ...expandedLinks],
      timedOut: timedOutLinks
    };
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
    if (stats.timedOut) chips.push(`<span class="cr-stat" style="border-color:#f8712433;color:#f87124"><b>${stats.timedOut}</b> ⚠️ no cargaron</span>`);
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
      <button class="cr-cf-btn" id="crSaveCFBtn">→ CreditFlow</button>
      <button class="cr-dismiss-btn" id="crOutDismiss">Cerrar</button>
    </div>
  `;
    document.body.appendChild(panel);

    const body = panel.querySelector('#crEditorBody');

    const onLinkInquiry = (inquiryName, accountName) => {
      addInquiryAlias(config, inquiryName, accountName);
      showToast(`🛡 "${inquiryName}" vinculada a "${accountName}" — alias guardado`, '#5eead4', 5000);
    };

    function toggleLinkForm(item, inquiryName, positiveAccounts, onLink, updateBadge) {
      if (item.dataset.linkFormId) {
        document.getElementById(item.dataset.linkFormId)?.remove();
        delete item.dataset.linkFormId;
        return;
      }
      const formId = 'crLinkForm_' + Date.now();
      item.dataset.linkFormId = formId;

      const form = document.createElement('div');
      form.id = formId;
      form.style.cssText = 'margin-bottom:4px;padding:8px 10px;background:#141414;border:1px solid #2a2a2a;border-radius:7px;';
      form.innerHTML = `
      <input class="cr-link-search" placeholder="Buscar cuenta positiva..."
        style="width:100%;box-sizing:border-box;background:#111;color:#ccc;border:1px solid #222;
               border-radius:6px;padding:6px 9px;font-size:11px;outline:none;margin-bottom:6px;">
      <div class="cr-link-list" style="max-height:130px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;"></div>
      <button style="margin-top:6px;font-size:11px;padding:3px 10px;background:#1e1e1e;color:#555;
                     border:1px solid #2a2a2a;border-radius:6px;cursor:pointer;" id="${formId}_cancel">Cancelar</button>`;

      const listEl = form.querySelector('.cr-link-list');

      const renderList = (accounts) => {
        listEl.innerHTML = '';
        if (!accounts.length) {
          listEl.innerHTML = '<div style="color:#444;font-size:11px;padding:6px 0;text-align:center;">Sin resultados</div>';
          return;
        }
        accounts.forEach(acc => {
          const btn = document.createElement('button');
          btn.style.cssText = 'width:100%;text-align:left;padding:5px 8px;font-size:11px;font-weight:bold;' +
            'background:#0d1e1d;color:#5eead4;border:1px solid #5eead430;border-radius:6px;cursor:pointer;';
          btn.textContent = acc;
          btn.onclick = () => {
            onLink(inquiryName, acc);
            form.remove();
            delete item.dataset.linkFormId;
            item.remove();
            updateBadge();
          };
          listEl.appendChild(btn);
        });
      };

      renderList(positiveAccounts);

      form.querySelector('.cr-link-search').addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        renderList(q ? positiveAccounts.filter(a => a.includes(q)) : positiveAccounts);
      });

      form.querySelector(`#${formId}_cancel`).onclick = () => {
        form.remove();
        delete item.dataset.linkFormId;
      };

      item.after(form);
      form.querySelector('.cr-link-search').focus();
    }

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

    function buildStringSection(title, items, options = {}) {
      const { isInquiries = false, positiveAccounts = [], onLink } = options;

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
        if (isInquiries) {
          item.innerHTML = `<span class="cr-editor-str-val">${escapeHtml(val)}</span>
          <button class="cr-inq-link-btn" title="Vincular a cuenta positiva">🛡</button>
          <button class="cr-editor-str-del" title="Eliminar">✕</button>`;
          item.querySelector('.cr-editor-str-del').onclick = () => {
            if (item.dataset.linkFormId) document.getElementById(item.dataset.linkFormId)?.remove();
            item.remove(); updateBadge();
          };
          item.querySelector('.cr-inq-link-btn').onclick = () =>
            toggleLinkForm(item, val, positiveAccounts, onLink, updateBadge);
        } else {
          item.innerHTML = `<span class="cr-editor-str-val">${escapeHtml(val)}</span>
          <button class="cr-editor-str-del" title="Eliminar">✕</button>`;
          item.querySelector('.cr-editor-str-del').onclick = () => { item.remove(); updateBadge(); };
        }
        list.appendChild(item);
      });
      updateBadge();
      return section;
    }

    if (data.collections.length) body.appendChild(buildAccountSection('COLLECTION AGENCIES', data.collections));
    if (data.originals.length) body.appendChild(buildAccountSection('ORIGINAL CREDITORS', data.originals));
    if (data.inquiries.length) body.appendChild(buildStringSection('INQUIRIES', data.inquiries, {
      isInquiries: true,
      positiveAccounts: data.positiveAccounts || [],
      onLink: onLinkInquiry
    }));
    if (data.personal.length) body.appendChild(buildStringSection('PERSONAL INFORMATION', data.personal));
    if (data.timedOut?.length) body.appendChild(buildStringSection('⚠️ NO CARGARON (REVISAR MANUALMENTE)', data.timedOut));

    const close = () => { overlay.remove(); panel.remove(); };
    bindClose(close, overlay, document.getElementById('crOutClose'), document.getElementById('crOutDismiss'));

    document.getElementById('crSaveCFBtn').onclick = () => {
      const firstLine = (data.personalHeader || '').split(/[\r\n]+/).map(l => l.trim()).find(l => l) || '';
      const nombre = firstLine.replace(/^Name:\s*/i, '').replace(/^Nombre:\s*/i, '').trim();
      if (!nombre) { showToast('⚠️ No se detectó nombre del cliente', '#fbbf24', 3000); return; }
      const saved = saveToCreditFlow(nombre);
      showToast(saved ? `✓ "${nombre}" guardado en CreditFlow` : `"${nombre}" ya existe en CreditFlow`, saved ? '#34D399' : '#fbbf24', 4000);
    };

    document.getElementById('crCopyBtn').onclick = async () => {
      const btn = document.getElementById('crCopyBtn');
      btn.disabled = true;
      const NL = "\r\n";
      let output = data.personalHeader || '';

      const sections = [...body.querySelectorAll('.cr-editor-section')];
      let total = 0;
      sections.forEach(s => {
        total += s.dataset.sectionType === 'accounts'
          ? s.querySelectorAll('.cr-editor-card').length
          : s.querySelectorAll('.cr-editor-str-val').length;
      });
      let done = 0;

      for (const section of sections) {
        const type = section.dataset.sectionType;
        const title = section.dataset.sectionTitle;

        if (type === 'accounts') {
          const cards = [...section.querySelectorAll('.cr-editor-card')];
          if (!cards.length) continue;
          output += `${title} (${cards.length})${NL}${NL}`;
          for (const card of cards) {
            done++;
            btn.textContent = `📋 ${done} de ${total} copiado`;
            const acc = {
              name: card.querySelector('[data-field="name"]').value,
              number: card.querySelector('[data-field="number"]').value,
              balance: card.querySelector('[data-field="balance"]').value,
              dateOpened: card.querySelector('[data-field="dateOpened"]').value,
              addresses: JSON.parse(card.dataset.addresses || '[]')
            };
            output += formatAccount(acc, NL, config);
            await new Promise(r => setTimeout(r, 40));
          }
        } else {
          const items = [...section.querySelectorAll('.cr-editor-str-val')];
          if (!items.length) continue;
          output += `${title} (${items.length})${NL}${NL}`;
          for (const el of items) {
            done++;
            btn.textContent = `📋 ${done} de ${total} copiado`;
            output += el.textContent + NL;
            await new Promise(r => setTimeout(r, 30));
          }
          output += NL + NL;
        }
      }

      addHistoryEntry(output, stats, data.personalHeader);
      try {
        await navigator.clipboard.writeText(output);
        btn.textContent = '✓ Listo';
        btn.classList.add('copied');
        setTimeout(() => close(), 800);
      } catch (e) {
        console.error('[CreditRadar] Clipboard error:', e);
        btn.disabled = false;
        btn.textContent = '📋 Generar y Copiar';
        showToast('⚠️ No se pudo copiar al portapapeles', '#f87171', 3000);
      }
    };
  }

  /* ── Daily Report ── */

  function showDailyReport() {
    const entries = loadHistory();
    const today = new Date().toISOString().slice(0, 10);

    // Remove existing
    document.getElementById('crReportOverlay')?.remove();
    document.getElementById('crReportModal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'crReportOverlay';
    overlay.className = 'cr-report-overlay';
    document.body.appendChild(overlay);

    const modal = document.createElement('div');
    modal.id = 'crReportModal';
    modal.className = 'cr-report-modal';
    document.body.appendChild(modal);

    function getEntriesForDate(dateStr) {
      const dayStart = new Date(dateStr + 'T00:00:00').getTime();
      const dayEnd = dayStart + 86400000;
      return entries.filter(e => e.id >= dayStart && e.id < dayEnd);
    }

    function fmtDateShort(dateStr) {
      const d = new Date(dateStr + 'T12:00:00');
      return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
    }

    function generateReport(dateStr) {
      const dayEntries = getEntriesForDate(dateStr).filter(e => !e.reported);
      const d = new Date(dateStr + 'T12:00:00');
      const dateLabel = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      let text = `Manuelbis\n${fmtDateShort(dateStr)}\n`;

      if (!dayEntries.length) {
        text += `\nSin clientes procesados.\n`;
      } else {
        // Group by status
        const groups = new Map();
        dayEntries.forEach(e => {
          const key = e.status || '';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(e);
        });

        // Statuses first, then "sin estado" at the end
        const sorted = [...groups.entries()].sort((a, b) => {
          if (!a[0]) return 1;
          if (!b[0]) return -1;
          return 0;
        });

        sorted.forEach(([status, items]) => {
          text += `\n${status || 'Sin estado'}\n`;
          items.forEach((e, i) => {
            text += `${i + 1}. ${e.clientName}\n`;
          });
        });
      }

      return { text, count: dayEntries.length, dateLabel };
    }

    function renderReport(dateStr) {
      const { text, count, dateLabel } = generateReport(dateStr);

      modal.innerHTML = `
      <div class="cr-report-head">
        <div class="cr-report-head-left">
          <div class="cr-report-title">Reporte Diario</div>
          <div class="cr-report-subtitle">${escapeHtml(dateLabel)} — ${count} cliente${count !== 1 ? 's' : ''}</div>
        </div>
        <button class="cr-x" id="crReportClose">✕</button>
      </div>
      <div class="cr-report-filters">
        <span style="font-size:11px;color:#666">Fecha:</span>
        <input type="date" class="cr-report-date" id="crReportDate" value="${dateStr}">
      </div>
      <div class="cr-report-body">
        ${count ? `<div class="cr-report-box">${escapeHtml(text)}</div>` : '<div class="cr-report-empty">Sin clientes procesados en esta fecha</div>'}
      </div>
      <div class="cr-report-foot">
        <button class="cr-report-btn-copy" id="crReportCopy">📋 Copiar</button>
        <button class="cr-report-btn-wa" id="crReportWA">📲 WhatsApp</button>
        <button class="cr-report-btn-close" id="crReportClose2">Cerrar</button>
      </div>
    `;

      const close = () => { overlay.remove(); modal.remove(); };
      overlay.onclick = close;
      document.getElementById('crReportClose').onclick = close;
      document.getElementById('crReportClose2').onclick = close;

      document.getElementById('crReportDate').onchange = (ev) => {
        renderReport(ev.target.value);
      };

      const markCfpbReported = () => {
        dayEntries.filter(e => e.status === 'CFPB y FTC').forEach(e => { e.reported = true; });
        saveHistory(entries);
      };

      document.getElementById('crReportCopy').onclick = async () => {
        const btn = document.getElementById('crReportCopy');
        try {
          await navigator.clipboard.writeText(text);
          markCfpbReported();
          btn.textContent = '✓ Copiado';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = '📋 Copiar'; btn.classList.remove('copied'); }, 2000);
        } catch (e) {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          markCfpbReported();
          btn.textContent = '✓ Copiado';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = '📋 Copiar'; btn.classList.remove('copied'); }, 2000);
        }
      };

      document.getElementById('crReportWA').onclick = () => {
        markCfpbReported();
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
      };
    }

    renderReport(today);
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
      <button class="cr-hist-report-btn" id="crHistReport">📊 Reporte del Día</button>
      <button class="cr-hist-clear-btn" id="crHistClear">🗑 Limpiar historial</button>
    </div>
  `;
    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('#crHistHandle'));
    document.getElementById('crHistClose').onclick = () => panel.remove();
    document.getElementById('crHistReport').onclick = () => showDailyReport();

    let entries = loadHistory();
    const clientStatuses = (loadConfig().clientStatuses || []);

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
        const statusObj = entry.status ? clientStatuses.find(st => st.name === entry.status) : null;
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
        <div class="cr-hist-status-row">
          <button class="cr-hist-status-btn"${statusObj ? ` style="border-color:${statusObj.color}40;background:${statusObj.color}15;color:${statusObj.color}"` : ''}>
            ${statusObj ? `<span class="cr-status-dot" style="background:${statusObj.color}"></span>` : ''}${entry.status ? escapeHtml(entry.status) : 'Sin estado'}
          </button>
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

        el.querySelector('.cr-hist-status-btn').onclick = (ev) => {
          ev.stopPropagation();
          document.querySelector('.cr-status-dropdown')?.remove();
          const btn = ev.currentTarget;
          const row = btn.closest('.cr-hist-status-row');
          const dd = document.createElement('div');
          dd.className = 'cr-status-dropdown';
          let ddHtml = `<button class="cr-status-option" data-status=""><span class="cr-status-dot" style="background:#555"></span>Sin estado</button>`;
          clientStatuses.forEach(st => {
            ddHtml += `<button class="cr-status-option" data-status="${escapeHtml(st.name)}"><span class="cr-status-dot" style="background:${st.color}"></span>${escapeHtml(st.name)}</button>`;
          });
          dd.innerHTML = ddHtml;
          row.appendChild(dd);
          dd.querySelectorAll('.cr-status-option').forEach(opt => {
            opt.onclick = (e) => {
              e.stopPropagation();
              entry.status = opt.dataset.status || '';
              saveHistory(entries);
              dd.remove();
              const stObj = entry.status ? clientStatuses.find(st => st.name === entry.status) : null;
              if (stObj) {
                btn.style.cssText = `border-color:${stObj.color}40;background:${stObj.color}15;color:${stObj.color}`;
                btn.innerHTML = `<span class="cr-status-dot" style="background:${stObj.color}"></span>${escapeHtml(stObj.name)}`;
              } else {
                btn.style.cssText = '';
                btn.innerHTML = 'Sin estado';
              }
            };
          });
          const closeDd = (e) => {
            if (!dd.contains(e.target) && e.target !== btn) {
              dd.remove();
              document.removeEventListener('click', closeDd);
            }
          };
          setTimeout(() => document.addEventListener('click', closeDd), 0);
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
      const positiveAccounts = [...positiveAccountsMap.keys()];
      console.log(`✅ Aliases: ${aliasMap.size} | Positive accounts: ${positiveAccountsMap.size}`);

      updateProgress(0, "?", "Cargando disputes...");
      const { links, timedOut } = await loadRoundDisputes((cur, total, name) => {
        updateProgress(cur, total, name, "Expandiendo");
      });
      const total = links.length;

      const COLLECTION_ACCOUNTS = [];
      const ORIGINAL_ACCOUNTS = [];
      const INQUIRIES = [];
      const PERSONAL = [];
      const TIMEOUT_SKIPPED = timedOut.map(l => {
        const item = l.closest(SELECTORS.compact.container);
        return queryOne(SELECTORS.compact.name, item)?.innerText.trim() || "Cuenta desconocida";
      });
      let SKIPPED_OPEN = 0;
      let SKIPPED_CLOSED = 0;
      let LINKED_INQUIRIES = 0;

      for (let idx = 0; idx < links.length; idx++) {
        const link = links[idx];
        if (link.classList.contains(SELECTORS.compact.deletedHeader)) continue;

        const item = link.closest(SELECTORS.compact.container);
        if (!item || !hasInDispute(item)) continue;

        const compactName = queryOne(SELECTORS.compact.name, item)?.innerText.trim() || "";
        updateProgress(idx + 1, total, compactName, "Procesando");

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
        if (!blocks.length) {
          TIMEOUT_SKIPPED.push(compactName);
          continue;
        }

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

      if (TIMEOUT_SKIPPED.length) {
        showToast(`⚠️ ${TIMEOUT_SKIPPED.length} cuenta(s) no cargaron y se omitieron. Revísalas manualmente.`, "#fbbf24", 10000);
      }

      showOutputEditor({
        collections: COLLECTION_ACCOUNTS,
        originals: ORIGINAL_ACCOUNTS,
        inquiries: INQUIRIES,
        personal: PERSONAL,
        personalHeader,
        timedOut: TIMEOUT_SKIPPED,
        positiveAccounts
      }, {
        accounts: COLLECTION_ACCOUNTS.length + ORIGINAL_ACCOUNTS.length,
        collections: COLLECTION_ACCOUNTS.length,
        originals: ORIGINAL_ACCOUNTS.length,
        inquiries: INQUIRIES.length,
        personal: PERSONAL.length,
        skippedOpen: SKIPPED_OPEN,
        skippedClosed: SKIPPED_CLOSED,
        linkedInquiries: LINKED_INQUIRIES,
        timedOut: TIMEOUT_SKIPPED.length
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

  async function injectPersonalCopyButton() {
    const container = await waitForElement('.client-dash-side-top');
    if (!container || document.getElementById('crCopyPersonalBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'crCopyPersonalBtn';
    btn.textContent = '📋 Copiar Info Personal';
    Object.assign(btn.style, {
      width: '100%', padding: '8px 0', marginTop: '10px',
      background: '#0d1e1d', color: '#5eead4',
      border: '1px solid #5eead430', borderRadius: '8px',
      cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
      display: 'block', boxSizing: 'border-box'
    });

    btn.onclick = async () => {
      const CLIENT = getClientData();
      const NL = "\r\n";
      const pFields = CONFIG.personalFields || DEFAULT_CONFIG.personalFields;
      const showLabels = CONFIG.showPersonalLabels !== false;
      let text = '';
      pFields.filter(f => f.enabled).forEach(f => {
        let val = CLIENT[f.key];
        if (!val) return;
        if (f.key === 'ssn') val = val.replace(/\D/g, '').slice(-4);
        val = val.replace(/\n/g, NL);
        text += showLabels ? `${f.label}: ${val}${NL}` : val + NL;
      });

      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '✓ Copiado';
        btn.style.background = '#5eead4';
        btn.style.color = '#0f172a';
        setTimeout(() => {
          btn.textContent = '📋 Copiar Info Personal';
          btn.style.background = '#0d1e1d';
          btn.style.color = '#5eead4';
        }, 1500);
      } catch (e) {
        showToast('⚠️ No se pudo copiar al portapapeles', '#f87171', 3000);
      }
    };

    const addressDiv = container.querySelector('.client_card_info_address');
    if (addressDiv) addressDiv.after(btn);
    else container.prepend(btn);
  }

  function initClasificador() {
    injectStyles();
    checkVersionUpdate();
    setTimeout(checkForUpdates, 2000);
    addButton(
      CONFIG,
      run,
      () => openConfigPanel(CONFIG, newConfig => { CONFIG = newConfig; }),
      showHistoryPanel
    );
    injectPersonalCopyButton();
  }

  const IS_CREDITFLOW = window.location.hostname.includes('github.io');
  const init = IS_CREDITFLOW ? initCreditFlow : initClasificador;

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }

})();
