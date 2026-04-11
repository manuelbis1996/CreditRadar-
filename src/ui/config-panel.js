import { ACCOUNT_FIELDS, DEFAULT_CONFIG } from '../config/constants.js';
import { escapeHtml } from '../utils/string.js';
import { makeDraggable } from '../utils/dom.js';
import { saveConfig } from '../core/storage.js';
import { showToast } from './toolbar.js';
import { parseAliasGroups, serializeAliasGroups } from '../utils/aliases.js';

export function getTagValues(container) {
  return [...container.querySelectorAll('.cr-chip-del')].map(b => b.dataset.val);
}

export function createChip(val) {
  const chip = document.createElement('span');
  chip.className = 'cr-chip';
  const safeVal = escapeHtml(val);
  chip.innerHTML = `${safeVal}<button class="cr-chip-del" data-val="${safeVal}">×</button>`;
  chip.querySelector('.cr-chip-del').onclick = () => chip.remove();
  return chip;
}

export function setupTagInput(container, initialValues) {
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

export function setupFieldDrag(list) {
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

export function openConfigPanel(config, onConfigSaved) {
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
