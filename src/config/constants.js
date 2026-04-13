export const SCRIPT_VERSION = "20.33";

export const VERSION_NOTES = {
  "20.33": "🚀 8 nuevas funciones: días, notas, export/import, badge estatus, hover, 3 formatos copia, cuentas nuevas",
  "20.32": "📲 Teléfono se captura en todos los puntos de guardado — copiar, historial y completo",
  "20.31": "📲 WhatsApp: teléfono del cliente se guarda automáticamente desde Pulse",
  "20.30": "🔗 Botón CreditFlow sin texto — solo ícono",
  "20.29": "🔗 Botón CreditFlow prominente en toolbar — siempre visible como el botón principal",
  "20.28": "🔧 fix: CreditFlow carga datos al abrir sin necesidad de cambiar de ventana",
  "20.27": "✅ Guardar y marcar completo: ejecuta Save Changes + marca carta y CFBP en CreditFlow",
  "20.26": "✅ Botón 'Guardar y marcar como completo' al lado de Save Changes en Pulse",
  "20.25": "⚡ CreditFlow: sync instantáneo con GM_addValueChangeListener — sin polling",
  "20.24": "🔗 CreditFlow: guarda link de Pulse automáticamente al agregar cliente",
  "20.23": "🔧 fix: exponer GM storage a creditflow.html vía unsafeWindow",
  "20.22": "🔗 Botón CreditFlow en cada entrada del Historial",
  "20.21": "🔗 Botón CreditFlow en toolbar + toast confirmación al guardar",
  "20.20": "⚡ Auto-guardar en CreditFlow al copiar el reporte",
  "20.19": "🔗 CreditFlow: página independiente, sin conflicto con Tampermonkey",
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

export const STORAGE_KEY = "pulse_clasificador_config";
export const BUROS = ["equifax", "experian", "transunion"];
export const STOP_WORDS = new Set(["the", "of", "and", "for", "inc", "llc", "na", "bank", "usa", "corp", "co", "ltd"]);
export const IGNORE_VALUES = new Set(["na", "n/a", "unknown", "null", "undefined", "notreported", "-", ""]);

export const REMOVE_SUFFIXES = [
  "financial", "funding", "services", "service", "svcs", "svc",
  "group", "solutions", "recovery", "management", "associates",
  "inc", "llc", "corp", "ltd", "na", "usa", "fin"
];

export const REMOVE_PREFIXES = [
  "cb/", "syncb/", "td/", "wf/", "cof/", "jpm/", "thd/", "kohls/", "comenity/",
  "amex/", "disc/", "fnb/", "bk/", "usb/", "pnc/", "hsbc/", "cbna/", "1st/",
  "ftnb/", "fnbo/", "bnb/", "ncu/"
];

export const EXPAND_MAP = {
  "fin": "financial", "svc": "service", "svcs": "service",
  "natl": "national", "fed": "federal", "intl": "international",
  "mgmt": "management", "assoc": "associates", "grp": "group",
  "sol": "solutions", "cap": "capital", "fncl": "financial",
  "mtg": "mortgage", "auto": "automotive"
};

export const ACCOUNT_FIELDS = [
  { key: "name", label: "Account Name" },
  { key: "number", label: "Account Number" },
  { key: "balance", label: "Balance" },
  { key: "dateOpened", label: "Date Opened" }
];

export const DEFAULT_ALIASES = `
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

export const DEFAULT_CONFIG = {
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

export const HISTORY_KEY = "cr_history";
export const HISTORY_MAX = 50;

// CreditFlow CRM storage keys
export const CF_RECORDS_KEY = "cf_records";
export const CF_LOG_KEY = "cf_log";
export const CF_STATUSES_KEY = "cf_statuses";
export const CF_TEMPLATES_KEY = "cf_templates";

export const CF_DEFAULT_STATUSES = [
  { id: 'carta',      label: 'Carta',       color: '#34D399', numbered: true  },
  { id: 'espera',     label: 'En espera',   color: '#FBBF24', numbered: false },
  { id: 'nocontesta', label: 'No contesta', color: '#F87171', numbered: false },
  { id: 'cfpb_ftc',   label: 'CFPB y FTC',  color: '#818CF8', numbered: false },
];

export const CF_DEFAULT_TEMPLATES = [
  { id: 't1', statusId: 'nocontesta', label: 'Seguimiento',   msg: 'Hola {nombre}, le escribo de parte del equipo de reparación de crédito. Hemos intentado comunicarnos con usted. ¿Podría confirmarnos un buen horario para contactarle? Gracias.' },
  { id: 't2', statusId: 'espera',     label: 'Actualización', msg: 'Hola {nombre}, le informamos que su caso sigue en proceso. Estamos esperando respuesta del buró. Le mantendremos informado. Cualquier duda estamos a la orden.' },
  { id: 't3', statusId: 'carta',      label: 'Carta enviada', msg: 'Hola {nombre}, le confirmamos que su carta de disputa ha sido enviada exitosamente. El proceso puede tomar de 30 a 45 días. Le avisaremos cuando tengamos respuesta.' },
];

export const SELECTORS = {
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
