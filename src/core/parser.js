import { SELECTORS, IGNORE_VALUES, BUROS, DEFAULT_CONFIG } from '../config/constants.js';
import { queryOne, queryAll, waitForElement } from '../utils/dom.js';
import { quickDetectStatus } from './matcher.js';

export function getDisputeType(item) {
  const input = queryOne(SELECTORS.disputeType, item);
  return input?.value?.toLowerCase() || "";
}

export function getClientData() {
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

export function getBestValue(row, activeCols) {
  for (let i = 0; i < 3; i++) {
    if (!activeCols[i]) continue;
    const v = row[i + 1]?.innerText.trim() || "";
    const clean = v.replace(/\s+/g, "").replace(/[-*]/g, "").toLowerCase();
    if (clean && !IGNORE_VALUES.has(clean)) return v;
  }
  return "";
}

export function getValues(blocks, index, activeCols) {
  return activeCols
    .map((active, i) => active ? (blocks[index + 1 + i]?.innerText || "").toLowerCase().trim() : null)
    .filter(v => v !== null);
}

export function parseAccountBlocks(blocks, activeCols, config) {
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

export function buildPositiveAccountsMap() {
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

export function isAgency(name, config) {
  if (!name) return false;
  const clean = name.toLowerCase();
  return config.agencies.some(a => clean.includes(a));
}

export function formatAccount(a, NL, config) {
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

export async function expandDisputeItem(link, item) {
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

export async function loadRoundDisputes() {
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
