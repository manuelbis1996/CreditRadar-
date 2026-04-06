import { escapeHtml } from '../utils/string.js';
import { makeDraggable, bindClose } from '../utils/dom.js';
import { loadHistory, saveHistory } from '../core/storage.js';
import { createOverlay, createModal } from './modals.js';
import { showToast } from './toolbar.js';

export function showHistoryPanel() {
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
