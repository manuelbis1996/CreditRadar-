import { escapeHtml } from '../utils/string.js';
import { bindClose } from '../utils/dom.js';
import { addHistoryEntry } from '../core/storage.js';
import { formatAccount } from '../core/parser.js';
import { showToast } from './toolbar.js';

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
