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
import { clearAllHighlights, highlight, queryOne, queryAll } from './utils/dom.js';

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
