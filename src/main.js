import { SCRIPT_VERSION, SELECTORS, DEFAULT_CONFIG } from './config/constants.js';
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

if (document.readyState === 'complete') {
  initClasificador();
} else {
  window.addEventListener("load", initClasificador);
}
