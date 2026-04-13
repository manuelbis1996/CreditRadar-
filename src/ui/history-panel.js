import { escapeHtml } from '../utils/string.js';
import { makeDraggable, bindClose } from '../utils/dom.js';
import { loadConfig, loadHistory, saveHistory } from '../core/storage.js';
import { createOverlay, createModal } from './modals.js';
import { showToast } from './toolbar.js';
import { saveToCreditFlow } from './creditflow-panel.js';

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

    return { text, count: dayEntries.length, dateLabel, dayEntries };
  }

  function renderReport(dateStr) {
    const { text, count, dateLabel, dayEntries } = generateReport(dateStr);

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
          <button class="cr-hist-btn cr-hist-btn-cf">🔗 CreditFlow</button>
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

      el.querySelector('.cr-hist-btn-cf').onclick = () => {
        const saved = saveToCreditFlow(entry.clientName);
        showToast(
          saved ? `🔗 "${entry.clientName}" guardado en CreditFlow` : `🔗 "${entry.clientName}" ya está en CreditFlow`,
          saved ? '#34D399' : '#fbbf24', 3500
        );
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
