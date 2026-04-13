import { SCRIPT_VERSION, SELECTORS, DEFAULT_CONFIG } from './config/constants.js';
import { initCreditFlow, saveAndComplete } from './ui/creditflow-panel.js';
import { loadConfig } from './core/storage.js';
import { injectStyles } from './ui/styles.js';
import { addButton, setButtonAnimation, showToast, createProgressPanel, updateProgress, removeProgressPanel } from './ui/toolbar.js';
import { checkVersionUpdate, checkForUpdates } from './ui/modals.js';
import { openConfigPanel } from './ui/config-panel.js';
import { showOutputEditor } from './ui/output-editor.js';
import { showHistoryPanel } from './ui/history-panel.js';
import { buildAliasMap, getLinkedAccount } from './core/matcher.js';
import { getDisputeType, getClientData, parseAccountBlocks, buildPositiveAccountsMap, isAgency, loadRoundDisputes } from './core/parser.js';
import { getActiveColumns, hasInDispute } from './core/matcher.js';
import { clearAllHighlights, highlight, queryOne, queryAll, waitForElement } from './utils/dom.js';

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

async function injectSaveCompleteButton() {
  const addDiv = await waitForElement('#addBtn');
  if (!addDiv || document.getElementById('crSaveCompleteBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'crSaveCompleteBtn';
  btn.type = 'button';
  btn.textContent = '✅ Guardar y marcar como completo';
  Object.assign(btn.style, {
    marginLeft: '10px', padding: '9px 16px',
    background: '#0d1e1d', color: '#34d399',
    border: '1px solid #34d39940', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    verticalAlign: 'middle'
  });

  btn.onclick = () => {
    const CLIENT = getClientData();
    const nombre = CLIENT.name;
    if (!nombre) { showToast('⚠️ No se detectó nombre del cliente', '#f87171', 3000); return; }
    const result = saveAndComplete(nombre, undefined, CLIENT.cell);
    const msgs = {
      added:            `✅ "${nombre}" guardado — carta + CFBP marcados`,
      updated:          `✅ "${nombre}" — carta + CFBP marcados`,
      already_complete: `✓ "${nombre}" ya estaba completo`
    };
    const colors = { added: '#34d399', updated: '#34d399', already_complete: '#fbbf24' };
    showToast(msgs[result] || '⚠️ Error', colors[result] || '#f87171', 3500);
    document.getElementById('addClientBTN')?.click();
  };

  addDiv.appendChild(btn);
}

// F4: Auto-sync phone from current Pulse page to existing CF record
function syncPhoneToRecord() {
  const CLIENT = getClientData();
  if (!CLIENT.name || !CLIENT.cell) return;
  const phone = CLIENT.cell.replace(/\D/g,'');
  if (!phone) return;
  try {
    const raw = GM_getValue('cf_records', null);
    const records = raw ? JSON.parse(raw) : [];
    const idx = records.findIndex(r => r.nombre.toLowerCase() === CLIENT.name.toLowerCase());
    if (idx > -1 && !records[idx].phone) {
      records[idx].phone = phone;
      GM_setValue('cf_records', JSON.stringify(records));
    }
  } catch(e) {}
}

// F5: Status badge — shows CF status inline, click to change
async function injectStatusBadge() {
  const container = await waitForElement('.client-dash-side-top');
  if (!container) return;

  function readCFRecord(name) {
    try {
      const raw = GM_getValue('cf_records', null);
      const records = raw ? JSON.parse(raw) : [];
      return records.find(r => r.nombre.toLowerCase() === name.toLowerCase()) || null;
    } catch(e) { return null; }
  }
  function readCFStatuses() {
    try {
      const raw = GM_getValue('cf_statuses', null);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function renderBadge() {
    document.getElementById('crStatusBadge')?.remove();
    const CLIENT = getClientData();
    if (!CLIENT.name) return;
    const record = readCFRecord(CLIENT.name);
    const statuses = readCFStatuses();
    const badge = document.createElement('div');
    badge.id = 'crStatusBadge';
    if (!record) {
      Object.assign(badge.style, { marginTop:'8px', fontSize:'11px', color:'#555', cursor:'default' });
      badge.textContent = 'No está en CreditFlow';
      container.appendChild(badge);
      return;
    }
    const st = statuses.find(s => s.id === record.estatus);
    const color = st ? st.color : '#5A6580';
    const label = st ? st.label : 'Sin estatus';
    badge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px;background:${color}18;color:${color};border:1px solid ${color}40;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer" id="crStatusBadgeInner">
      <span style="width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0"></span>${label}
    </span>`;
    Object.assign(badge.style, { marginTop:'8px', position:'relative' });
    badge.querySelector('#crStatusBadgeInner').onclick = (e) => {
      e.stopPropagation();
      document.getElementById('crStatusDd')?.remove();
      const dd = document.createElement('div');
      dd.id = 'crStatusDd';
      Object.assign(dd.style, { position:'absolute', top:'100%', left:'0', background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'8px', padding:'6px', zIndex:'999999', minWidth:'150px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', marginTop:'4px' });
      statuses.forEach(s => {
        const opt = document.createElement('div');
        opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:${s.color}`;
        opt.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${s.color}"></span>${s.label}`;
        opt.onmouseenter = () => opt.style.background = s.color+'22';
        opt.onmouseleave = () => opt.style.background = '';
        opt.onclick = () => {
          try {
            const raw2 = GM_getValue('cf_records', null);
            const recs2 = raw2 ? JSON.parse(raw2) : [];
            const i2 = recs2.findIndex(r => r.nombre.toLowerCase() === CLIENT.name.toLowerCase());
            if (i2 > -1) { recs2[i2].estatus = s.id; GM_setValue('cf_records', JSON.stringify(recs2)); }
          } catch(e) {}
          dd.remove();
          renderBadge();
          showToast(`Estatus → ${s.label}`, s.color, 2500);
        };
        dd.appendChild(opt);
      });
      badge.appendChild(dd);
      setTimeout(() => document.addEventListener('click', function h(){ dd.remove(); document.removeEventListener('click',h); }), 0);
    };
    container.appendChild(badge);
  }

  renderBadge();
  // Re-render when client changes
  const observer = new MutationObserver(() => { setTimeout(renderBadge, 300); });
  const nameEl = document.querySelector('.client_card_info_name');
  if (nameEl) observer.observe(nameEl, { childList:true, subtree:true, characterData:true });
}

// F6: Hover summary tooltip
async function injectHoverSummary() {
  const nameEl = await waitForElement('.client_card_info_name');
  if (!nameEl) return;

  let tooltip = null;
  nameEl.addEventListener('mouseenter', () => {
    const CLIENT = getClientData();
    if (!CLIENT.name) return;
    try {
      const raw = GM_getValue('cf_records', null);
      const records = raw ? JSON.parse(raw) : [];
      const r = records.find(rec => rec.nombre.toLowerCase() === CLIENT.name.toLowerCase());
      if (!r) return;
      const raw2 = GM_getValue('cf_statuses', null);
      const statuses = raw2 ? JSON.parse(raw2) : [];
      const st = statuses.find(s => s.id === r.estatus);
      const days = r.createdAt ? Math.floor((Date.now()-new Date(r.createdAt).getTime())/86400000) : '—';
      tooltip = document.createElement('div');
      tooltip.id = 'crHoverTooltip';
      tooltip.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#fff;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #2a2a2a">📊 CreditFlow</div>
        <div style="display:grid;gap:5px;font-size:11px">
          <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#666">Estatus</span><span style="color:${st?st.color:'#aaa'};font-weight:600">${st?st.label:'—'}</span></div>
          <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#666">Carta</span><span style="color:${r.carta?'#34d399':'#f87171'}">${r.carta?'✅ Sí':'❌ No'}</span></div>
          <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#666">CFBP</span><span style="color:${r.cfbp?'#34d399':'#f87171'}">${r.cfbp?'✅ Sí':'❌ No'}</span></div>
          <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#666">Teléfono</span><span style="color:#ccc">${r.phone||'—'}</span></div>
          <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#666">Días</span><span style="color:${days>60?'#f87171':days>30?'#fbbf24':'#aaa'}">${days === '—' ? '—' : days+'d'}</span></div>
        </div>`;
      Object.assign(tooltip.style, { position:'fixed', background:'#111', border:'1px solid #2a2a2a', borderRadius:'10px', padding:'12px 14px', zIndex:'9999999', minWidth:'180px', boxShadow:'0 8px 24px rgba(0,0,0,0.6)', pointerEvents:'none' });
      document.body.appendChild(tooltip);
      const rect = nameEl.getBoundingClientRect();
      tooltip.style.top = (rect.bottom + 8) + 'px';
      tooltip.style.left = rect.left + 'px';
    } catch(e) {}
  });
  nameEl.addEventListener('mouseleave', () => { tooltip?.remove(); tooltip = null; });
}

// F7: Copy personal info with 3 formats
async function injectPersonalCopyButton() {
  const container = await waitForElement('.client-dash-side-top');
  if (!container || document.getElementById('crCopyPersonalBtn')) return;

  const wrap = document.createElement('div');
  wrap.id = 'crCopyPersonalBtn';
  Object.assign(wrap.style, { marginTop:'10px', display:'flex', gap:'4px', boxSizing:'border-box' });

  const formats = [
    { id:'std',   label:'📋 Copiar',   title:'Formato estándar' },
    { id:'cfpb',  label:'CFPB',        title:'Solo Name + SSN4 + DOB' },
    { id:'wa',    label:'WhatsApp',    title:'Formato mensaje WhatsApp' },
  ];

  formats.forEach(fmt => {
    const btn = document.createElement('button');
    btn.title = fmt.title;
    btn.textContent = fmt.label;
    Object.assign(btn.style, {
      flex: fmt.id === 'std' ? '2' : '1',
      padding:'7px 4px', background:'#0d1e1d', color:'#5eead4',
      border:'1px solid #5eead430', borderRadius:'8px',
      cursor:'pointer', fontSize:'11px', fontWeight:'bold'
    });
    btn.onclick = async () => {
      const CLIENT = getClientData();
      const NL = "\r\n";
      let text = '';
      if (fmt.id === 'std') {
        const pFields = CONFIG.personalFields || DEFAULT_CONFIG.personalFields;
        const showLabels = CONFIG.showPersonalLabels !== false;
        pFields.filter(f => f.enabled).forEach(f => {
          let val = CLIENT[f.key];
          if (!val) return;
          if (f.key === 'ssn') val = val.replace(/\D/g, '').slice(-4);
          val = val.replace(/\n/g, NL);
          text += showLabels ? `${f.label}: ${val}${NL}` : val + NL;
        });
      } else if (fmt.id === 'cfpb') {
        const ssn4 = CLIENT.ssn ? CLIENT.ssn.replace(/\D/g,'').slice(-4) : '';
        text = [CLIENT.name, ssn4 ? 'SSN: '+ssn4 : '', CLIENT.dob ? 'DOB: '+CLIENT.dob : ''].filter(Boolean).join(NL);
      } else if (fmt.id === 'wa') {
        text = `Hola, le contactamos sobre el caso de ${CLIENT.name}.`;
        if (CLIENT.cell) text += NL + `Tel: ${CLIENT.cell}`;
        if (CLIENT.dob)  text += NL + `DOB: ${CLIENT.dob}`;
      }
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = '#5eead4';
        btn.style.color = '#0f172a';
        setTimeout(() => { btn.textContent = orig; btn.style.background = '#0d1e1d'; btn.style.color = '#5eead4'; }, 1500);
      } catch(e) { showToast('⚠️ No se pudo copiar', '#f87171', 3000); }
    };
    wrap.appendChild(btn);
  });

  const addressDiv = container.querySelector('.client_card_info_address');
  if (addressDiv) addressDiv.after(wrap);
  else container.prepend(wrap);
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
  injectSaveCompleteButton();
  syncPhoneToRecord();
  injectStatusBadge();
  injectHoverSummary();
}

const IS_CREDITFLOW = window.location.hostname.includes('github.io');
const init = IS_CREDITFLOW ? initCreditFlow : initClasificador;

if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
