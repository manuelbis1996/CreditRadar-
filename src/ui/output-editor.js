import { escapeHtml } from '../utils/string.js';
import { bindClose } from '../utils/dom.js';
import { addHistoryEntry } from '../core/storage.js';
import { formatAccount } from '../core/parser.js';
import { showToast } from './toolbar.js';
import { addInquiryAlias } from '../utils/aliases.js';
import { saveToCreditFlow } from './creditflow-panel.js';

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

export function showOutputEditor(data, stats, config) {
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

    // Auto-save to CreditFlow on copy
    const firstLine = (data.personalHeader || '').split(/[\r\n]+/).map(l => l.trim()).find(l => l) || '';
    const nombre = firstLine.replace(/^Name:\s*/i, '').replace(/^Nombre:\s*/i, '').trim();
    if (nombre) saveToCreditFlow(nombre);

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
