import { CF_RECORDS_KEY, CF_LOG_KEY, CF_STATUSES_KEY, CF_TEMPLATES_KEY, CF_DEFAULT_STATUSES, CF_DEFAULT_TEMPLATES } from '../config/constants.js';
import { loadCFData, saveCFData } from '../core/storage.js';

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700;800&display=swap');
:root{--bg:#0B0F1A;--surface:#131825;--surface-2:#1A2035;--border:#2A3150;--text:#E8ECF4;--text-2:#8B95B0;--text-3:#5A6580;--accent:#4F7CFF;--accent-glow:#4F7CFF33;--green:#34D399;--red:#F87171;--red-bg:#F8717118;--purple:#A78BFA;--orange:#FB923C;--wa:#25D366}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.hidden{display:none}
.cf-app{display:flex;min-height:100vh}
.cf-sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:24px 0;position:fixed;top:0;left:0;bottom:0;z-index:10;display:flex;flex-direction:column}
.cf-brand{padding:0 20px 24px;border-bottom:1px solid var(--border);margin-bottom:12px}
.cf-brand h1{font-family:'Playfair Display',serif;font-size:21px;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.cf-brand p{font-size:10px;color:var(--text-3);margin-top:3px;text-transform:uppercase;letter-spacing:1.5px}
.cf-nav-item{display:flex;align-items:center;gap:11px;padding:10px 20px;color:var(--text-2);cursor:pointer;transition:all .2s;font-size:13.5px;border-left:3px solid transparent}
.cf-nav-item:hover{color:var(--text);background:var(--surface-2)}
.cf-nav-item.active{color:var(--accent);background:var(--accent-glow);border-left-color:var(--accent);font-weight:500}
.cf-sidebar-footer{margin-top:auto;padding:16px 20px;border-top:1px solid var(--border)}
.cf-sidebar-footer p{font-size:11px;color:var(--text-3)}
.cf-main{margin-left:220px;flex:1;padding:28px 36px}
.cf-page-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.cf-page-hdr h2{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;letter-spacing:-.5px}
.cf-subtitle{font-size:13px;color:var(--text-3)}
.cf-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .2s;font-family:'DM Sans',sans-serif}
.cf-btn-primary{background:var(--accent);color:#fff;box-shadow:0 4px 12px var(--accent-glow)}
.cf-btn-primary:hover{filter:brightness(1.15);transform:translateY(-1px)}
.cf-btn-ghost{background:var(--surface-2);color:var(--text-2);border:1px solid var(--border)}
.cf-btn-ghost:hover{color:var(--text);border-color:var(--text-3)}
.cf-btn-danger{background:var(--red-bg);color:var(--red);border:none}
.cf-btn-danger:hover{background:var(--red);color:#fff}
.cf-btn-sm{padding:5px 11px;font-size:12px;border-radius:7px}
.cf-btn-export{background:#34D39918;color:var(--green);border:none}
.cf-btn-export:hover{background:var(--green);color:#fff}
.cf-btn-wa{background:#25D36618;color:var(--wa);border:none}
.cf-btn-wa:hover{background:var(--wa);color:#fff}
.cf-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px}
.cf-stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px;margin-bottom:24px}
.cf-stat-card{text-align:center}
.cf-stat-val{font-family:'Playfair Display',serif;font-size:32px;font-weight:800;margin-bottom:2px}
.cf-stat-lbl{font-size:11px;color:var(--text-2);text-transform:uppercase;letter-spacing:1px}
.cf-tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:10px 14px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:12px 14px;font-size:13.5px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:hover td{background:var(--surface-2)}
tr:last-child td{border-bottom:none}
.cf-chk-cell{text-align:center}
.cf-chk{width:20px;height:20px;border-radius:6px;border:2px solid var(--border);background:var(--surface-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .15s}
.cf-chk.checked{background:var(--green);border-color:var(--green)}
.cf-chk.checked::after{content:'✓';color:#fff;font-size:13px;font-weight:700}
.cf-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;animation:cfFadeIn .15s}
.cf-modal{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:28px;width:520px;max-width:92vw;max-height:85vh;overflow-y:auto;animation:cfSlideUp .2s}
.cf-modal-wide{width:620px}
.cf-modal h3{font-family:'Playfair Display',serif;font-size:20px;margin-bottom:18px}
@keyframes cfFadeIn{from{opacity:0}to{opacity:1}}
@keyframes cfSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.cf-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cf-fg{display:flex;flex-direction:column;gap:5px}
.cf-full{grid-column:1/-1}
.cf-fl{font-size:11px;font-weight:500;color:var(--text-2);text-transform:uppercase;letter-spacing:.7px}
.cf-fi,.cf-fs,.cf-ft{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:9px 13px;color:var(--text);font-size:13.5px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;width:100%}
.cf-fi:focus,.cf-fs:focus,.cf-ft:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.cf-fs{cursor:pointer}.cf-fs option{background:var(--surface-2)}
.cf-ft{resize:vertical;min-height:70px}
.cf-f-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;grid-column:1/-1}
.cf-act-item{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)}
.cf-act-item:last-child{border-bottom:none}
.cf-act-dot{width:7px;height:7px;border-radius:50%;margin-top:6px;flex-shrink:0}
.cf-act-time{font-size:11px;color:var(--text-3);margin-top:2px}
.cf-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:16px;font-size:11.5px;font-weight:500;white-space:nowrap}
.cf-status-select{border-radius:16px;padding:4px 10px;font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;outline:none;-webkit-appearance:none;text-align:center;min-width:110px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)}
.cf-empty{text-align:center;padding:50px 20px;color:var(--text-3)}
.cf-empty p{font-size:14px;margin-bottom:14px}
.cf-inline-actions{display:flex;gap:5px}
.cf-search-box{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:8px 14px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;width:200px}
.cf-search-box:focus{border-color:var(--accent)}
.cf-date-filter{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:7px 12px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
.cf-report-box{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:20px 24px;font-size:14px;line-height:1.8;white-space:pre-wrap;color:var(--text);max-height:55vh;overflow-y:auto;margin-bottom:16px}
.cf-rpt-section{margin-bottom:10px}
.cf-rpt-title{font-weight:700;margin-bottom:2px}
.cf-copy-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:500;z-index:200;animation:cfSlideUp .2s}
.cf-status-list-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.cf-status-list-item:last-child{border-bottom:none}
.cf-status-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}
.cf-status-name{flex:1;font-size:14px;font-weight:500}
.cf-color-input{width:36px;height:28px;border:none;border-radius:6px;cursor:pointer;background:none;padding:0}
.cf-add-status-row{display:flex;gap:10px;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)}
.cf-add-status-input{flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:8px 12px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
.cf-add-status-input:focus{border-color:var(--accent)}
.cf-filter-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.cf-filter-pill{padding:5px 14px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);transition:all .2s}
.cf-filter-pill:hover{border-color:var(--text-3);color:var(--text)}
.cf-bulk-preview{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin:12px 0;max-height:180px;overflow-y:auto;font-size:13px;line-height:1.6}
.cf-bp-item{display:flex;align-items:center;gap:8px;padding:3px 0}
.cf-bp-num{color:var(--text-3);font-size:11px;min-width:20px}
.cf-tpl-card{background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px}
.cf-tpl-card-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.cf-tpl-card-hdr span{font-size:13px;font-weight:600}
.cf-tpl-preview{font-size:12.5px;color:var(--text-2);line-height:1.5;white-space:pre-wrap;max-height:60px;overflow:hidden}
@media(max-width:768px){
  .cf-sidebar{width:58px}.cf-brand h1{font-size:0}.cf-brand p{display:none}
  .cf-nav-item span{display:none}.cf-nav-item{justify-content:center;padding:12px;border-left:none}
  .cf-main{margin-left:58px;padding:16px 12px}
  .cf-stat-grid{grid-template-columns:repeat(2,1fr)}
  .cf-form-grid{grid-template-columns:1fr}.cf-page-hdr h2{font-size:20px}.cf-sidebar-footer{display:none}
}
`;

// ─── STATE ────────────────────────────────────────────────────────────────────

let S = null;

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
function fmtDateShort(ts) { if (!ts) return ''; const d = new Date(ts + 'T12:00:00'); return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); }
function fmtLong() { return new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function actColor(t) {
  return t.includes('add') || t.includes('bulk') ? 'var(--accent)'
    : t.includes('carta') ? 'var(--purple)'
    : t.includes('cfbp') ? 'var(--green)'
    : t.includes('delete') ? 'var(--red)'
    : t.includes('estatus') ? 'var(--orange)'
    : 'var(--text-3)';
}

function initState() {
  const records = loadCFData(CF_RECORDS_KEY, []);
  records.forEach(r => { if (!r.estatus) r.estatus = ''; });
  return {
    records,
    log: loadCFData(CF_LOG_KEY, []),
    statuses: loadCFData(CF_STATUSES_KEY, null) || JSON.parse(JSON.stringify(CF_DEFAULT_STATUSES)),
    templates: loadCFData(CF_TEMPLATES_KEY, null) || JSON.parse(JSON.stringify(CF_DEFAULT_TEMPLATES)),
    view: 'dashboard',
    search: '',
    filterStatus: 'all',
    reportDate: '',
    reportResp: '',
  };
}

function save() {
  saveCFData(CF_RECORDS_KEY, S.records);
  saveCFData(CF_LOG_KEY, S.log);
  saveCFData(CF_STATUSES_KEY, S.statuses);
  saveCFData(CF_TEMPLATES_KEY, S.templates);
}

function addLog(type, desc) {
  S.log.push({ id: Date.now() + 'l', type, desc, ts: new Date().toISOString() });
}

function getStatus(id)    { return S.statuses.find(s => s.id === id) || null; }
function statusLabel(id)  { const s = getStatus(id); return s ? s.label : 'Sin estatus'; }
function statusColor(id)  { const s = getStatus(id); return s ? s.color : '#5A6580'; }

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

function nav(v) {
  S.view = v;
  document.querySelectorAll('.cf-nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.view === v)
  );
  ['dashboard', 'reparacion', 'reportes', 'plantillas', 'activity'].forEach(x =>
    document.getElementById('cf-v-' + x)?.classList.toggle('hidden', x !== v)
  );
  render();
}

function closeModal() { document.getElementById('cf-modal-root').innerHTML = ''; }

function cfToast(msg) {
  const el = document.getElementById('cf-toast-root');
  if (!el) return;
  el.innerHTML = `<div class="cf-copy-toast">${msg}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 2500);
}

// ─── STATUS MANAGER ──────────────────────────────────────────────────────────

function renderStatusModal() {
  const items = S.statuses.map((s, i) => `
    <div class="cf-status-list-item">
      <span class="cf-status-dot" style="background:${s.color}"></span>
      <span class="cf-status-name">${s.label}</span>
      <label style="font-size:11px;color:var(--text-3);display:flex;align-items:center;gap:4px;cursor:pointer">
        <input type="checkbox" ${s.numbered ? 'checked' : ''} onchange="CF.toggleNumbered(${i});CF.renderStatusModal()"> Num.
      </label>
      <input type="color" class="cf-color-input" value="${s.color}" onchange="CF.updateStatusColor(${i},this.value);CF.renderStatusModal()">
      <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.promptEditStatus(${i})">✏️</button>
      <button class="cf-btn cf-btn-danger cf-btn-sm" onclick="CF.removeStatus(${i});CF.renderStatusModal()">🗑️</button>
    </div>`).join('');
  document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()">
    <div class="cf-modal" onclick="event.stopPropagation()">
      <h3>Gestionar Estatus</h3>
      <div>${items}</div>
      <div class="cf-add-status-row">
        <input class="cf-add-status-input" id="cf-new-status-name" placeholder="Nuevo estatus..." onkeydown="if(event.key==='Enter')CF.addNewStatus()">
        <input type="color" class="cf-color-input" id="cf-new-status-color" value="#A78BFA">
        <button class="cf-btn cf-btn-primary cf-btn-sm" onclick="CF.addNewStatus()">+ Agregar</button>
      </div>
    </div>
  </div>`;
}

function addNewStatus() {
  const name = document.getElementById('cf-new-status-name').value.trim();
  if (!name) return;
  S.statuses.push({ id: 'custom_' + Date.now(), label: name, color: document.getElementById('cf-new-status-color').value, numbered: false });
  save(); renderStatusModal(); render();
}

function removeStatus(i) {
  if (!confirm('¿Eliminar "' + S.statuses[i].label + '"?')) return;
  const rid = S.statuses[i].id;
  S.statuses.splice(i, 1);
  S.records.forEach(r => { if (r.estatus === rid) r.estatus = ''; });
  save(); render();
}

function updateStatusColor(i, c) { S.statuses[i].color = c; save(); render(); }
function toggleNumbered(i) { S.statuses[i].numbered = !S.statuses[i].numbered; save(); render(); }
function promptEditStatus(i) {
  const n = prompt('Nuevo nombre:', S.statuses[i].label);
  if (n && n.trim()) { S.statuses[i].label = n.trim(); save(); renderStatusModal(); render(); }
}

// ─── RECORD MODAL ────────────────────────────────────────────────────────────

function showRecordModal(existing) {
  const r = existing || { nombre: '', nombreResp: 'Manuelbis', carta: false, cartaFecha: todayStr(), cfbp: false, cfbpFecha: '', estatus: 'carta', comentario: '' };
  const sOpts = S.statuses.map(s => `<option value="${s.id}" ${r.estatus === s.id ? 'selected' : ''}>${s.label}</option>`).join('')
    + `<option value="" ${!r.estatus ? 'selected' : ''}>Sin estatus</option>`;
  document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()"><div class="cf-modal" onclick="event.stopPropagation()">
    <h3>${existing ? 'Editar Registro' : 'Nuevo Registro'}</h3>
    <div class="cf-form-grid">
      <div class="cf-fg cf-full"><label class="cf-fl">Nombre</label><input class="cf-fi" id="cf-r-nombre" value="${r.nombre}" placeholder="Nombre completo"></div>
      <div class="cf-fg"><label class="cf-fl">Responsable</label><input class="cf-fi" id="cf-r-resp" value="${r.nombreResp || 'Manuelbis'}"></div>
      <div class="cf-fg"><label class="cf-fl">Estatus</label><select class="cf-fs" id="cf-r-estatus">${sOpts}</select></div>
      <div class="cf-fg"><label class="cf-fl">Fecha Carta</label><input class="cf-fi" id="cf-r-cartaFecha" type="date" value="${r.cartaFecha || todayStr()}"></div>
      <div class="cf-fg"><label class="cf-fl">Fecha CFBP</label><input class="cf-fi" id="cf-r-cfbpFecha" type="date" value="${r.cfbpFecha || ''}"></div>
      <div class="cf-fg cf-full"><label class="cf-fl">Comentario</label><textarea class="cf-ft" id="cf-r-comentario">${r.comentario || ''}</textarea></div>
      <div class="cf-f-actions">
        <button class="cf-btn cf-btn-ghost" onclick="CF.closeModal()">Cancelar</button>
        <button class="cf-btn cf-btn-primary" onclick="CF.saveRecord('${existing ? r.id : ''}')">${existing ? 'Guardar' : 'Agregar'}</button>
      </div>
    </div>
  </div></div>`;
}

function saveRecord(eid) {
  const nombre = document.getElementById('cf-r-nombre').value.trim();
  if (!nombre) return;
  const data = {
    nombre,
    nombreResp: document.getElementById('cf-r-resp').value.trim() || 'Manuelbis',
    estatus: document.getElementById('cf-r-estatus').value,
    cartaFecha: document.getElementById('cf-r-cartaFecha').value,
    cfbpFecha: document.getElementById('cf-r-cfbpFecha').value,
    comentario: document.getElementById('cf-r-comentario').value.trim(),
  };
  if (eid) {
    const idx = S.records.findIndex(r => r.id === eid);
    if (idx > -1) S.records[idx] = { ...S.records[idx], ...data };
    addLog('edit', 'Editado: ' + data.nombre);
  } else {
    data.id = Date.now().toString();
    data.carta = false; data.cfbp = false;
    data.createdAt = new Date().toISOString();
    S.records.push(data);
    addLog('add', 'Nuevo: ' + data.nombre);
  }
  save(); closeModal(); render();
}

// ─── BULK ADD ────────────────────────────────────────────────────────────────

function showBulkModal() {
  const sOpts = S.statuses.map(s => `<option value="${s.id}">${s.label}</option>`).join('') + '<option value="">Sin estatus</option>';
  document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()"><div class="cf-modal cf-modal-wide" onclick="event.stopPropagation()">
    <h3>Agregar Clientes en Lote</h3>
    <p style="font-size:13px;color:var(--text-2);margin-bottom:14px">Pega una lista de nombres, uno por línea.</p>
    <div class="cf-form-grid">
      <div class="cf-fg"><label class="cf-fl">Responsable</label><input class="cf-fi" id="cf-b-resp" value="Manuelbis"></div>
      <div class="cf-fg"><label class="cf-fl">Estatus</label><select class="cf-fs" id="cf-b-estatus">${sOpts}</select></div>
      <div class="cf-fg"><label class="cf-fl">Fecha Carta</label><input class="cf-fi" id="cf-b-fecha" type="date" value="${todayStr()}"></div>
      <div class="cf-fg"></div>
      <div class="cf-fg cf-full">
        <label class="cf-fl">Lista de Nombres (uno por línea)</label>
        <textarea class="cf-ft" id="cf-b-names" style="min-height:150px" placeholder="Mary Marlyn Duarte Castillo&#10;Aneurys G Polanco" oninput="CF.previewBulk()"></textarea>
      </div>
      <div class="cf-fg cf-full" id="cf-b-preview"></div>
      <div class="cf-f-actions">
        <button class="cf-btn cf-btn-ghost" onclick="CF.closeModal()">Cancelar</button>
        <button class="cf-btn cf-btn-primary" onclick="CF.executeBulk()">Agregar Todos</button>
      </div>
    </div>
  </div></div>`;
}

function previewBulk() {
  const names = document.getElementById('cf-b-names').value.split('\n').map(n => n.trim()).filter(Boolean);
  const el = document.getElementById('cf-b-preview');
  if (!el) return;
  if (!names.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="cf-bulk-preview">${names.map((n, i) => `<div class="cf-bp-item"><span class="cf-bp-num">${i + 1}.</span> ${n}</div>`).join('')}</div>
    <div style="font-size:12px;color:var(--text-2)">${names.length} cliente${names.length > 1 ? 's' : ''} se agregarán</div>`;
}

function executeBulk() {
  const names = document.getElementById('cf-b-names').value.split('\n').map(n => n.trim()).filter(Boolean);
  if (!names.length) return;
  const resp   = document.getElementById('cf-b-resp').value.trim() || 'Manuelbis';
  const estatus = document.getElementById('cf-b-estatus').value;
  const fecha  = document.getElementById('cf-b-fecha').value;
  names.forEach((nombre, i) => {
    S.records.push({ id: (Date.now() + i).toString(), nombre, nombreResp: resp, estatus, carta: false, cfbp: false, cartaFecha: fecha, cfbpFecha: '', comentario: '', createdAt: new Date().toISOString() });
  });
  addLog('bulk', `${names.length} clientes agregados en lote`);
  save(); closeModal(); render();
  cfToast(`✓ ${names.length} clientes agregados`);
}

// ─── RECORD ACTIONS ──────────────────────────────────────────────────────────

function deleteRecord(id) {
  if (!confirm('¿Eliminar?')) return;
  const r = S.records.find(x => x.id === id);
  S.records = S.records.filter(x => x.id !== id);
  addLog('delete', 'Eliminado: ' + (r?.nombre || ''));
  save(); render();
}

function toggleCarta(id) {
  const r = S.records.find(x => x.id === id); if (!r) return;
  r.carta = !r.carta;
  if (r.carta && !r.cartaFecha) r.cartaFecha = todayStr();
  addLog('carta', r.carta ? 'Carta ✓: ' + r.nombre : 'Carta desmarcada: ' + r.nombre);
  save(); render();
}

function toggleCfbp(id) {
  const r = S.records.find(x => x.id === id); if (!r) return;
  r.cfbp = !r.cfbp;
  if (r.cfbp && !r.cfbpFecha) r.cfbpFecha = todayStr();
  addLog('cfbp', r.cfbp ? 'CFBP ✓: ' + r.nombre : 'CFBP desmarcado: ' + r.nombre);
  save(); render();
}

function changeEstatus(id, val) {
  const r = S.records.find(x => x.id === id); if (!r) return;
  r.estatus = val;
  addLog('estatus', 'Estatus → ' + statusLabel(val) + ': ' + r.nombre);
  save(); render();
}

function exportCSV() {
  const h = ['Nombre', 'Responsable', 'Estatus', 'Carta', 'Fecha Carta', 'CFBP', 'Fecha CFBP', 'Comentario'];
  const rows = S.records.map(r => [r.nombre, r.nombreResp, statusLabel(r.estatus), r.carta ? 'Sí' : 'No', r.cartaFecha || '', r.cfbp ? 'Sí' : 'No', r.cfbpFecha || '', r.comentario || '']);
  const csv = [h, ...rows].map(row => row.map(c => '"' + (c || '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reparacion_' + todayStr() + '.csv'; a.click();
}

// ─── WHATSAPP ────────────────────────────────────────────────────────────────

function sendWhatsAppReport() {
  const date = document.getElementById('cf-rpt-date')?.value || '';
  const resp = document.getElementById('cf-rpt-resp')?.value || '';
  window.open('https://wa.me/?text=' + encodeURIComponent(generateReportText(date, resp)), '_blank');
}

function sendWhatsAppToClient(recordId, templateId) {
  const r   = S.records.find(x => x.id === recordId);
  const tpl = S.templates.find(x => x.id === templateId);
  if (!r || !tpl) return;
  const msg = tpl.msg
    .replace(/\{nombre\}/g, r.nombre)
    .replace(/\{responsable\}/g, r.nombreResp)
    .replace(/\{fecha\}/g, r.cartaFecha || '');
  const phone = r.phone ? r.phone.replace(/\D/g, '') : '';
  window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function showWhatsAppModal(recordId) {
  const r = S.records.find(x => x.id === recordId); if (!r) return;
  const items = S.templates.map(t => {
    const preview = t.msg.replace(/\{nombre\}/g, r.nombre).replace(/\{responsable\}/g, r.nombreResp).replace(/\{fecha\}/g, r.cartaFecha || '');
    const match = !t.statusId || t.statusId === r.estatus;
    const sc = t.statusId ? statusColor(t.statusId) : 'var(--text-3)';
    const badge = t.statusId ? `<span class="cf-badge" style="background:${sc}18;color:${sc}">${statusLabel(t.statusId)}</span>` : '';
    return `<div class="cf-tpl-card" style="${match ? '' : 'opacity:.55'}">
      <div class="cf-tpl-card-hdr">
        <span>${t.label} ${badge}</span>
        <button class="cf-btn cf-btn-wa cf-btn-sm" onclick="CF.sendWhatsAppToClient('${r.id}','${t.id}')">📲 Enviar</button>
      </div>
      <div class="cf-tpl-preview">${preview}</div>
    </div>`;
  }).join('');
  document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()"><div class="cf-modal cf-modal-wide" onclick="event.stopPropagation()">
    <h3>Enviar WhatsApp a ${r.nombre}</h3>
    ${items || '<p style="color:var(--text-3);text-align:center;padding:20px">No hay plantillas. Crea una en la sección Plantillas.</p>'}
  </div></div>`;
}

// ─── TEMPLATES ───────────────────────────────────────────────────────────────

function showTemplateModal(existing) {
  const t = existing || { id: '', statusId: '', label: '', msg: '' };
  const sOpts = S.statuses.map(s => `<option value="${s.id}" ${t.statusId === s.id ? 'selected' : ''}>${s.label}</option>`).join('');
  document.getElementById('cf-modal-root').innerHTML = `
  <div class="cf-modal-overlay" onclick="CF.closeModal()"><div class="cf-modal cf-modal-wide" onclick="event.stopPropagation()">
    <h3>${existing ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
    <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">Usa <strong>{nombre}</strong>, <strong>{responsable}</strong> y <strong>{fecha}</strong> como variables.</p>
    <div class="cf-form-grid">
      <div class="cf-fg"><label class="cf-fl">Nombre de Plantilla</label><input class="cf-fi" id="cf-tpl-label" value="${t.label}" placeholder="Ej: Seguimiento"></div>
      <div class="cf-fg"><label class="cf-fl">Estatus Asociado</label>
        <select class="cf-fs" id="cf-tpl-status"><option value="">Todos los estatus</option>${sOpts}</select>
      </div>
      <div class="cf-fg cf-full"><label class="cf-fl">Mensaje</label>
        <textarea class="cf-ft" id="cf-tpl-msg" style="min-height:120px">${t.msg}</textarea>
      </div>
      <div class="cf-f-actions">
        <button class="cf-btn cf-btn-ghost" onclick="CF.closeModal()">Cancelar</button>
        <button class="cf-btn cf-btn-primary" onclick="CF.saveTemplate('${existing ? t.id : ''}')">${existing ? 'Guardar' : 'Crear'}</button>
      </div>
    </div>
  </div></div>`;
}

function saveTemplate(eid) {
  const label = document.getElementById('cf-tpl-label').value.trim();
  const msg   = document.getElementById('cf-tpl-msg').value.trim();
  if (!label || !msg) return;
  const data = { label, statusId: document.getElementById('cf-tpl-status').value, msg };
  if (eid) {
    const idx = S.templates.findIndex(t => t.id === eid);
    if (idx > -1) S.templates[idx] = { ...S.templates[idx], ...data };
  } else {
    data.id = 'tpl_' + Date.now();
    S.templates.push(data);
  }
  save(); closeModal(); render();
}

function deleteTemplate(id) {
  if (!confirm('¿Eliminar esta plantilla?')) return;
  S.templates = S.templates.filter(t => t.id !== id);
  save(); render();
}

// ─── REPORT ──────────────────────────────────────────────────────────────────

function getFilteredForReport(date, resp) {
  return S.records.filter(r => {
    const mD = !date || r.cartaFecha === date;
    const mR = !resp || r.nombreResp.toLowerCase().includes(resp.toLowerCase());
    return mD && mR;
  });
}

function generateReportText(date, resp) {
  const f = getFilteredForReport(date, resp);
  let t = (resp || 'Manuelbis') + '\n' + fmtDateShort(date || todayStr()) + '\n';
  S.statuses.forEach(st => {
    const g = f.filter(r => r.estatus === st.id);
    if (!g.length) return;
    t += '\n' + st.label + ':\n';
    g.forEach((r, i) => { t += st.numbered ? (i + 1) + '. ' + r.nombre + '\n' : r.nombre + '\n'; });
  });
  const ns = f.filter(r => !r.estatus || !getStatus(r.estatus));
  if (ns.length) { t += '\nSin estatus:\n'; ns.forEach(r => { t += r.nombre + '\n'; }); }
  if (!f.length) t += '\nSin registros para esta fecha.\n';
  return t.trim();
}

function generateReportHTML(date, resp) {
  const f = getFilteredForReport(date, resp);
  let h = `<div style="font-weight:700;font-size:16px">${resp || 'Manuelbis'}</div>
           <div style="color:var(--text-2);margin-bottom:14px">${fmtDateShort(date || todayStr())}</div>`;
  S.statuses.forEach(st => {
    const g = f.filter(r => r.estatus === st.id);
    if (!g.length) return;
    h += `<div class="cf-rpt-section"><div class="cf-rpt-title" style="color:${st.color}">${st.label}:</div>`;
    g.forEach((r, i) => { h += `<div>${st.numbered ? (i + 1) + '. ' + r.nombre : r.nombre}</div>`; });
    h += '</div>';
  });
  const ns = f.filter(r => !r.estatus || !getStatus(r.estatus));
  if (ns.length) {
    h += '<div class="cf-rpt-section"><div class="cf-rpt-title" style="color:var(--text-3)">Sin estatus:</div>';
    ns.forEach(r => { h += `<div>${r.nombre}</div>`; });
    h += '</div>';
  }
  if (!f.length) h += '<div style="color:var(--text-3);text-align:center;padding:20px">Sin registros para estos filtros.</div>';
  return h;
}

function copyReport() {
  const text = generateReportText(
    document.getElementById('cf-rpt-date')?.value || '',
    document.getElementById('cf-rpt-resp')?.value || ''
  );
  navigator.clipboard.writeText(text)
    .then(() => cfToast('✓ Copiado'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      cfToast('✓ Copiado');
    });
}

// ─── RENDER ──────────────────────────────────────────────────────────────────

function render() {
  const t = todayStr();
  const statusCounts = {};
  S.statuses.forEach(st => { statusCounts[st.id] = S.records.filter(r => r.estatus === st.id).length; });
  const todayCount = S.log.filter(l => l.ts.startsWith(t)).length;

  // ── DASHBOARD ──
  const recentActs = S.log.filter(l => l.ts.startsWith(t)).slice(-8).reverse()
    .map(l => `<div class="cf-act-item">
      <span class="cf-act-dot" style="background:${actColor(l.type)}"></span>
      <div style="flex:1"><div style="font-size:13px">${l.desc}</div><div class="cf-act-time">${fmtTime(l.ts)}</div></div>
    </div>`).join('') || '<p style="color:var(--text-3);font-size:13px;padding:20px;text-align:center">Sin actividad hoy.</p>';

  const recentRows = S.records.slice(-5).reverse().map(r => {
    const c = statusColor(r.estatus);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
      <div><div style="font-size:13.5px;font-weight:500">${r.nombre}</div>
      <div style="font-size:11px;color:var(--text-3)">${r.nombreResp} · ${r.cartaFecha || '—'}</div></div>
      <span class="cf-badge" style="background:${c}18;color:${c}">${statusLabel(r.estatus)}</span>
    </div>`;
  }).join('') || '<p style="color:var(--text-3);font-size:13px">Sin registros.</p>';

  document.getElementById('cf-v-dashboard').innerHTML = `
    <div class="cf-page-hdr"><h2>Dashboard</h2><span class="cf-subtitle">${fmtLong()}</span></div>
    <div class="cf-stat-grid">
      <div class="cf-card cf-stat-card"><div class="cf-stat-val" style="color:var(--accent)">${S.records.length}</div><div class="cf-stat-lbl">Total</div></div>
      ${S.statuses.map(st => `<div class="cf-card cf-stat-card"><div class="cf-stat-val" style="color:${st.color}">${statusCounts[st.id] || 0}</div><div class="cf-stat-lbl">${st.label}</div></div>`).join('')}
      <div class="cf-card cf-stat-card"><div class="cf-stat-val" style="color:var(--text-2)">${todayCount}</div><div class="cf-stat-lbl">Acciones Hoy</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="cf-card"><div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--text-2)">Últimos Registros</div>${recentRows}</div>
      <div class="cf-card"><div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--text-2)">Actividad Hoy</div>${recentActs}</div>
    </div>`;

  // ── REPARACIÓN ──
  const sv = document.getElementById('cf-search-input')?.value ?? S.search;
  S.search = sv;
  let fil = S.records.filter(r => r.nombre.toLowerCase().includes(sv.toLowerCase()));
  if (S.filterStatus !== 'all') {
    fil = fil.filter(r => S.filterStatus === 'none' ? !r.estatus : r.estatus === S.filterStatus);
  }

  const tRows = fil.map(r => {
    const opts = S.statuses.map(s => `<option value="${s.id}" ${r.estatus === s.id ? 'selected' : ''}>${s.label}</option>`).join('')
      + `<option value="" ${!r.estatus ? 'selected' : ''}>—</option>`;
    const sc = statusColor(r.estatus);
    return `<tr>
      <td style="font-weight:500;min-width:180px">${r.nombre}</td>
      <td>${r.nombreResp}</td>
      <td><select class="cf-status-select" style="background:${sc}18;color:${sc};border-color:${sc}" onchange="CF.changeEstatus('${r.id}',this.value)">${opts}</select></td>
      <td class="cf-chk-cell"><div class="cf-chk ${r.carta ? 'checked' : ''}" onclick="CF.toggleCarta('${r.id}')"></div></td>
      <td style="color:var(--text-2);font-size:12.5px;white-space:nowrap">${r.cartaFecha || '—'}</td>
      <td class="cf-chk-cell"><div class="cf-chk ${r.cfbp ? 'checked' : ''}" onclick="CF.toggleCfbp('${r.id}')"></div></td>
      <td style="color:var(--text-2);font-size:12.5px;white-space:nowrap">${r.cfbpFecha || '—'}</td>
      <td style="color:var(--text-2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.comentario || '—'}</td>
      <td><div class="cf-inline-actions">
        <button class="cf-btn cf-btn-wa cf-btn-sm" onclick="CF.showWhatsAppModal('${r.id}')" title="WhatsApp">📲</button>
        <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.showRecordModal(CF.getRecord('${r.id}'))">✏️</button>
        <button class="cf-btn cf-btn-danger cf-btn-sm" onclick="CF.deleteRecord('${r.id}')">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');

  const pills = `<div class="cf-filter-bar">
    <span style="font-size:11px;color:var(--text-3);margin-right:4px">Filtrar:</span>
    <span class="cf-filter-pill" style="${S.filterStatus === 'all' ? 'background:var(--accent);color:#fff;border-color:var(--accent)' : ''}" onclick="CF.setFilter('all')">Todos (${S.records.length})</span>
    ${S.statuses.map(st => `<span class="cf-filter-pill" style="${S.filterStatus === st.id ? 'background:' + st.color + ';color:#fff;border-color:' + st.color : ''}" onclick="CF.setFilter('${st.id}')">${st.label} (${statusCounts[st.id] || 0})</span>`).join('')}
    <span class="cf-filter-pill" style="${S.filterStatus === 'none' ? 'background:var(--text-3);color:#fff;border-color:var(--text-3)' : ''}" onclick="CF.setFilter('none')">Sin estatus</span>
  </div>`;

  document.getElementById('cf-v-reparacion').innerHTML = `
    <div class="cf-page-hdr"><h2>Reparación</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input class="cf-search-box" id="cf-search-input" placeholder="Buscar..." value="${S.search}" oninput="CF.setSearch(this.value)">
        <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.renderStatusModal()">⚙️ Estatus</button>
        <button class="cf-btn cf-btn-export cf-btn-sm" onclick="CF.exportCSV()">📥 CSV</button>
        <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.showBulkModal()">📋 Lote</button>
        <button class="cf-btn cf-btn-primary" onclick="CF.showRecordModal()">+ Nuevo</button>
      </div>
    </div>
    ${pills}
    ${!S.records.length
      ? '<div class="cf-card cf-empty"><p>No hay registros</p><button class="cf-btn cf-btn-primary" onclick="CF.showRecordModal()">+ Agregar</button></div>'
      : `<div class="cf-card"><div class="cf-tbl-wrap"><table><thead><tr>
          <th>Nombre</th><th>Resp.</th><th>Estatus</th><th>Carta</th><th>F. Carta</th><th>CFBP</th><th>F. CFBP</th><th>Comentario</th><th></th>
        </tr></thead><tbody>${tRows}</tbody></table></div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:12px;color:var(--text-3)">
          <span>Mostrando ${fil.length} de ${S.records.length}</span>
          <span>${S.statuses.map(s => `${s.label}: ${statusCounts[s.id] || 0}`).join(' · ')}</span>
        </div></div>`}`;

  // ── REPORTES ──
  const rDate = document.getElementById('cf-rpt-date')?.value || S.reportDate || t;
  const rResp = document.getElementById('cf-rpt-resp')?.value || S.reportResp || '';
  S.reportDate = rDate; S.reportResp = rResp;
  const resps   = [...new Set(S.records.map(r => r.nombreResp).filter(Boolean))];
  const respOpts = resps.map(r => `<option value="${r}" ${r === rResp ? 'selected' : ''}>${r}</option>`).join('');
  const rptFil  = getFilteredForReport(rDate, rResp);
  const summaryCards = S.statuses.map(st => {
    const cnt = rptFil.filter(r => r.estatus === st.id).length;
    return `<div style="text-align:center;padding:16px;background:${st.color}18;border-radius:10px">
      <div style="font-size:28px;font-weight:800;color:${st.color};font-family:'Playfair Display',serif">${cnt}</div>
      <div style="font-size:11px;color:${st.color};text-transform:uppercase;letter-spacing:1px">${st.label}</div>
    </div>`;
  }).join('');

  document.getElementById('cf-v-reportes').innerHTML = `
    <div class="cf-page-hdr"><h2>Reportes</h2>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label style="font-size:12px;color:var(--text-2)">Fecha:</label>
        <input type="date" class="cf-date-filter" id="cf-rpt-date" value="${rDate}" onchange="CF.setReportDate(this.value)">
        <label style="font-size:12px;color:var(--text-2)">Resp:</label>
        <select class="cf-fs" id="cf-rpt-resp" style="width:150px;padding:7px 12px;font-size:13px;border-radius:9px" onchange="CF.setReportResp(this.value)">
          <option value="">Todos</option>${respOpts}
        </select>
      </div>
    </div>
    <div class="cf-card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:14px;font-weight:600;color:var(--text-2)">Vista Previa</div>
        <div style="display:flex;gap:8px">
          <button class="cf-btn cf-btn-primary cf-btn-sm" onclick="CF.copyReport()">📋 Copiar</button>
          <button class="cf-btn cf-btn-wa cf-btn-sm" onclick="CF.sendWhatsAppReport()">📲 WhatsApp</button>
        </div>
      </div>
      <div class="cf-report-box">${generateReportHTML(rDate, rResp)}</div>
    </div>
    <div class="cf-card">
      <div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--text-2)">Resumen</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px">${summaryCards}</div>
    </div>`;

  // ── PLANTILLAS ──
  const tplItems = S.templates.map(tpl => {
    const sc  = tpl.statusId ? statusColor(tpl.statusId) : 'var(--text-3)';
    const lbl = tpl.statusId ? statusLabel(tpl.statusId) : 'Todos';
    return `<div class="cf-tpl-card">
      <div class="cf-tpl-card-hdr">
        <span>${tpl.label} <span class="cf-badge" style="background:${sc}18;color:${sc}">${lbl}</span></span>
        <div style="display:flex;gap:6px">
          <button class="cf-btn cf-btn-ghost cf-btn-sm" onclick="CF.showTemplateModal(CF.getTemplate('${tpl.id}'))">✏️</button>
          <button class="cf-btn cf-btn-danger cf-btn-sm" onclick="CF.deleteTemplate('${tpl.id}')">🗑️</button>
        </div>
      </div>
      <div class="cf-tpl-preview">${tpl.msg}</div>
    </div>`;
  }).join('');

  document.getElementById('cf-v-plantillas').innerHTML = `
    <div class="cf-page-hdr"><h2>Plantillas de WhatsApp</h2>
      <button class="cf-btn cf-btn-primary" onclick="CF.showTemplateModal()">+ Nueva Plantilla</button>
    </div>
    <div class="cf-card">
      <p style="font-size:13px;color:var(--text-2);margin-bottom:16px">Usa <strong>{nombre}</strong>, <strong>{responsable}</strong> y <strong>{fecha}</strong> como variables.</p>
      ${tplItems || '<div class="cf-empty" style="padding:30px"><p>No hay plantillas creadas</p></div>'}
    </div>`;

  // ── ACTIVIDAD ──
  const aEl   = document.getElementById('cf-act-date');
  const aDate = aEl ? aEl.value : t;
  const aLogs = S.log.filter(l => l.ts.startsWith(aDate));
  const aLabel = aDate === t ? 'Hoy' : new Date(aDate + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  document.getElementById('cf-v-activity').innerHTML = `
    <div class="cf-page-hdr"><h2>Actividad</h2>
      <div style="display:flex;align-items:center;gap:10px">
        <label style="font-size:12px;color:var(--text-2)">Fecha:</label>
        <input type="date" class="cf-date-filter" id="cf-act-date" value="${aDate}" onchange="CF.render()">
      </div>
    </div>
    <div class="cf-card">
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:var(--text-2)">${aLabel}
        <span style="margin-left:8px;font-size:12px;color:var(--text-3)">${aLogs.length} acciones</span>
      </div>
      ${aLogs.slice().reverse().map(l => `<div class="cf-act-item">
        <span class="cf-act-dot" style="background:${actColor(l.type)}"></span>
        <div style="flex:1"><div style="font-size:13.5px">${l.desc}</div><div class="cf-act-time">${fmtTime(l.ts)}</div></div>
      </div>`).join('') || '<div class="cf-empty" style="padding:30px"><p>Sin actividad</p></div>'}
    </div>`;
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

/**
 * Saves a client from CreditRadar output directly into CreditFlow.
 * Returns true if added, false if already existed.
 */
export function saveToCreditFlow(nombre, nombreResp) {
  if (!nombre) return false;
  const records = loadCFData(CF_RECORDS_KEY, []);
  if (records.some(r => r.nombre.toLowerCase() === nombre.toLowerCase())) return false;
  records.push({
    id: Date.now().toString(),
    nombre,
    nombreResp: nombreResp || 'Manuelbis',
    estatus: 'carta',
    carta: false, cfbp: false,
    cartaFecha: todayStr(), cfbpFecha: '',
    comentario: '',
    createdAt: new Date().toISOString(),
  });
  saveCFData(CF_RECORDS_KEY, records);
  const log = loadCFData(CF_LOG_KEY, []);
  log.push({ id: Date.now() + 'l', type: 'add', desc: 'Guardado desde CreditRadar: ' + nombre, ts: new Date().toISOString() });
  saveCFData(CF_LOG_KEY, log);
  return true;
}

/** Entry point — called when the userscript detects it's on the CreditFlow page. */
export function initCreditFlow() {
  const style = document.createElement('style');
  style.textContent = CF_CSS;
  document.head.appendChild(style);

  document.title = 'CreditFlow — Reparación de Crédito';

  document.body.innerHTML = `
  <div class="cf-app">
    <nav class="cf-sidebar">
      <div class="cf-brand"><h1>CreditFlow</h1><p>Reparación</p></div>
      <div class="cf-nav-item active" data-view="dashboard" onclick="CF.nav('dashboard')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Dashboard</span>
      </div>
      <div class="cf-nav-item" data-view="reparacion" onclick="CF.nav('reparacion')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
        <span>Reparación</span>
      </div>
      <div class="cf-nav-item" data-view="reportes" onclick="CF.nav('reportes')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        <span>Reportes</span>
      </div>
      <div class="cf-nav-item" data-view="plantillas" onclick="CF.nav('plantillas')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span>Plantillas</span>
      </div>
      <div class="cf-nav-item" data-view="activity" onclick="CF.nav('activity')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span>Actividad</span>
      </div>
      <div class="cf-sidebar-footer"><p>Datos en Tampermonkey</p></div>
    </nav>
    <main class="cf-main">
      <div id="cf-v-dashboard"></div>
      <div id="cf-v-reparacion" class="hidden"></div>
      <div id="cf-v-reportes" class="hidden"></div>
      <div id="cf-v-plantillas" class="hidden"></div>
      <div id="cf-v-activity" class="hidden"></div>
    </main>
  </div>
  <div id="cf-modal-root"></div>
  <div id="cf-toast-root"></div>`;

  S = initState();

  window.CF = {
    nav, closeModal, render,
    renderStatusModal, addNewStatus, removeStatus, updateStatusColor, toggleNumbered, promptEditStatus,
    showRecordModal, saveRecord,
    showBulkModal, previewBulk, executeBulk,
    deleteRecord, toggleCarta, toggleCfbp, changeEstatus, exportCSV,
    showWhatsAppModal, sendWhatsAppToClient, sendWhatsAppReport,
    showTemplateModal, saveTemplate, deleteTemplate,
    copyReport,
    setFilter:      v  => { S.filterStatus = v;    render(); },
    setSearch:      v  => { S.search = v;           render(); },
    setReportDate:  v  => { S.reportDate = v;       render(); },
    setReportResp:  v  => { S.reportResp = v;       render(); },
    getRecord:      id => S.records.find(x => x.id === id),
    getTemplate:    id => S.templates.find(x => x.id === id),
  };

  render();
}
