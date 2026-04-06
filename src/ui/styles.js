export const buttonAnimationStyles = `
  @keyframes crSlideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes crFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes crScaleIn { from{opacity:0;transform:translate(-50%,-50%) scale(0.93)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }

  /* Toolbar */
  #crToolbar { position:fixed; z-index:99999; display:flex; flex-direction:column; align-items:center; gap:6px; background:rgba(20,20,20,0.85); backdrop-filter:blur(8px); padding:10px 8px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 4px 16px rgba(0,0,0,0.4); transition: opacity 0.2s ease; }
  #crToolbarGrip { width:100%; height:12px; cursor:grab; display:flex; justify-content:center; align-items:center; color:#555; font-size:10px; margin-bottom:2px; user-select:none; }
  #crToolbarGrip:active { cursor:grabbing; color:#5eead4; }
  #clasificadorBTN { width:48px; height:48px; background:#111; color:#fff; border:1px solid #2a2a2a; border-radius:8px; cursor:pointer; font-size:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; transition:all 0.25s ease; line-height:1; }
  #clasificadorBTN:hover:not(:disabled) { background:#1a1a1a; border-color:#5eead4; }
  #clasificadorBTN:disabled { cursor:not-allowed; opacity:0.8; }
  #clasificadorBTN .cr-ver { font-size:9px; color:#555; font-family:monospace; margin-top:2px; }
  #crSettingsBtn { width:36px; height:36px; background:#111; color:#555; border:1px solid #222; border-radius:8px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all 0.25s ease; }
  #crSettingsBtn:hover { color:#fff; border-color:#444; background:#1a1a1a; transform:rotate(45deg); }
  .clasificador-glow { border-color:#5eead4 !important; }
  .clasificador-pulse { opacity:0.7; }
  .clasificador-success { border-color:#5eead4 !important; }

  /* Config Panel */
  #clasificadorConfigPanel { position:fixed; top:70px; right:70px; z-index:999999; background:#161616; color:#fff; border-radius:12px; width:440px; max-height:88vh; display:flex; flex-direction:column; border:1px solid #2a2a2a; box-shadow:0 8px 32px rgba(0,0,0,0.45); animation:crSlideIn 0.25s ease; overflow:hidden; }
  .cr-ph { padding:15px 16px 0; display:flex; justify-content:space-between; align-items:center; cursor:grab; flex-shrink:0; }
  .cr-ph:active { cursor:grabbing; }
  .cr-ph-title { font-size:14px; font-weight:bold; }
  .cr-x { width:26px; height:26px; border-radius:50%; background:#222; border:none; color:#666; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .cr-x:hover { background:#f87171; color:#fff; }
  .cr-tabs { display:flex; gap:2px; padding:12px 16px 0; border-bottom:1px solid #222; margin-top:10px; overflow-x:auto; flex-shrink:0; }
  .cr-tabs::-webkit-scrollbar { height:0; }
  .cr-tab { padding:6px 12px; border:none; background:transparent; color:#555; cursor:pointer; font-size:12px; border-radius:6px 6px 0 0; transition:all 0.2s; white-space:nowrap; position:relative; bottom:-1px; flex:0 0 auto; }
  .cr-tab:hover { color:#bbb; background:#1c1c1c; }
  .cr-tab.active { color:#fff; background:#1c1c1c; border-bottom:2px solid #5eead4; }
  .cr-body { flex:1; overflow-y:auto; padding:14px 16px; min-height:0; }
  .cr-body::-webkit-scrollbar { width:3px; }
  .cr-body::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
  .cr-pane { display:none; animation:crFadeIn 0.18s ease; }
  .cr-pane.active { display:block; }
  .cr-lbl { font-size:11px; color:#666; margin-bottom:5px; margin-top:12px; }
  .cr-lbl:first-child { margin-top:0; }
  .cr-ta { width:100%; background:#111; color:#ddd; border:1px solid #222; border-radius:7px; padding:9px; font-size:12px; box-sizing:border-box; resize:vertical; font-family:monospace; transition:border-color 0.2s; }
  .cr-ta:focus { outline:none; border-color:#333; }
  .cr-tags { background:#111; border:1px solid #222; border-radius:7px; padding:7px; display:flex; flex-wrap:wrap; gap:5px; min-height:52px; cursor:text; transition:border-color 0.2s; }
  .cr-tags:focus-within { border-color:#333; }
  .cr-chip { background:#1d1d1d; border:1px solid #2a2a2a; color:#ccc; padding:3px 8px 3px 9px; border-radius:20px; font-size:11px; display:flex; align-items:center; gap:5px; animation:crFadeIn 0.15s; }
  .cr-chip-del { cursor:pointer; color:#444; line-height:1; background:none; border:none; padding:0; font-size:13px; transition:color 0.15s; }
  .cr-chip-del:hover { color:#f87171; }
  .cr-tags-in { background:transparent; border:none; outline:none; color:#ccc; font-size:11px; flex:1; min-width:80px; padding:2px 3px; }
  .cr-tag-hint { font-size:10px; color:#444; margin-top:4px; }
  .cr-colors { display:flex; gap:14px; flex-wrap:wrap; margin-top:4px; }
  .cr-clr { display:flex; flex-direction:column; align-items:center; gap:5px; }
  .cr-clr span { font-size:10px; color:#666; }
  .cr-clr input[type=color] { width:42px; height:34px; border-radius:7px; border:1px solid #2a2a2a; cursor:pointer; background:none; padding:2px; }
  .cr-fields { display:flex; flex-direction:column; gap:6px; margin-top:4px; }
  .cr-fitem { background:#1a1a1a; border:1px solid #222; border-radius:8px; padding:9px 12px; display:flex; align-items:center; gap:9px; cursor:grab; font-size:12px; transition:all 0.2s; user-select:none; }
  .cr-fitem:active { cursor:grabbing; }
  .cr-fitem.cr-dragging { opacity:0.35; }
  .cr-fitem.cr-dragover { border-color:#5eead4; background:#0d1e1d; }
  .cr-fitem-grip { color:#444; transition:color 0.2s; }
  .cr-fitem:hover .cr-fitem-grip { color:#666; }
  .cr-fitem-name { flex:1; color:#bbb; }
  .cr-fitem-num { font-size:10px; color:#444; font-family:monospace; }
  .cr-toggle-wrap { display:flex; align-items:center; flex-shrink:0; cursor:pointer; }
  .cr-fitem-toggle { display:none; }
  .cr-toggle-ui { width:28px; height:16px; background:#222; border:1px solid #2a2a2a; border-radius:8px; position:relative; transition:background 0.2s; }
  .cr-toggle-ui::after { content:''; position:absolute; width:10px; height:10px; background:#444; border-radius:50%; top:2px; left:2px; transition:all 0.2s; }
  .cr-fitem-toggle:checked + .cr-toggle-ui { background:#0d1e1d; border-color:#5eead455; }
  .cr-fitem-toggle:checked + .cr-toggle-ui::after { left:14px; background:#5eead4; }
  .cr-footer { padding:12px 16px; border-top:1px solid #1e1e1e; display:flex; gap:9px; flex-shrink:0; }
  .cr-btn { flex:1; padding:10px; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:5px; }
  .cr-btn-ok { background:#5eead4; color:#0f172a; }
  .cr-btn-ok:hover { background:#2dd4bf; }
  .cr-btn-rst { background:transparent; color:#555; border:1px solid #2a2a2a; flex:0 0 auto; padding:10px 18px; }
  .cr-btn-rst:hover { background:#1e1e1e; color:#ccc; }

  /* Version Modal */
  #crVersionModal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#161616; color:#fff; border-radius:12px; z-index:9999999; width:420px; max-width:94vw; max-height:85vh; display:flex; flex-direction:column; border:1px solid #2a2a2a; box-shadow:0 16px 48px rgba(0,0,0,0.55); animation:crScaleIn 0.28s cubic-bezier(.16,1,.3,1); overflow:hidden; }
  .cr-vm-header { padding:28px 26px 20px; background:#111; border-top:2px solid #5eead4; border-bottom:1px solid #1e1e1e; position:relative; }
  .cr-vm-badge { display:inline-flex; align-items:center; gap:6px; background:#5eead418; border:1px solid #5eead440; color:#5eead4; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; margin-bottom:10px; }
  .cr-vm-title { font-size:22px; font-weight:700; letter-spacing:-0.5px; }
  .cr-vm-subtitle { font-size:12px; color:#555; margin-top:4px; }
  .cr-vm-close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:50%; background:#222; border:none; color:#666; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .cr-vm-close:hover { background:#f87171; color:#fff; }
  .cr-vm-body { flex:1; overflow-y:auto; padding:18px 26px; }
  .cr-vm-body::-webkit-scrollbar { width:3px; }
  .cr-vm-body::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
  .cr-vm-entry { display:flex; gap:14px; padding:12px 0; border-bottom:1px solid #1a1a1a; }
  .cr-vm-entry:last-child { border-bottom:none; }
  .cr-vm-entry.current .cr-vm-ver { color:#5eead4; border-color:#5eead440; background:#5eead410; }
  .cr-vm-ver { font-size:10px; font-family:monospace; font-weight:700; color:#444; border:1px solid #2a2a2a; border-radius:6px; padding:2px 7px; white-space:nowrap; align-self:flex-start; margin-top:1px; min-width:38px; text-align:center; }
  .cr-vm-note { font-size:13px; color:#bbb; line-height:1.5; flex:1; }
  .cr-vm-entry.current .cr-vm-note { color:#fff; }
  .cr-vm-footer { padding:16px 26px; border-top:1px solid #1e1e1e; }
  .cr-vm-btn { width:100%; padding:12px; background:#5eead4; color:#0f172a; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:14px; transition:all 0.2s; letter-spacing:0.2px; }
  .cr-vm-btn:hover { background:#2dd4bf; }

  /* Output Preview */
  #crOverlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999997; animation:crFadeIn 0.2s ease; }
  #crOutputPanel { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#161616; color:#fff; border-radius:12px; z-index:999999; width:540px; max-width:92vw; max-height:90vh; border:1px solid #2a2a2a; box-shadow:0 8px 32px rgba(0,0,0,0.5); display:flex; flex-direction:column; animation:crScaleIn 0.22s ease; }
  .cr-out-head { padding:15px 18px; border-bottom:1px solid #1e1e1e; display:flex; justify-content:space-between; align-items:center; }
  .cr-out-stats { padding:10px 18px; border-bottom:1px solid #1a1a1a; display:flex; gap:8px; flex-wrap:wrap; }
  .cr-stat { background:#1a1a1a; border:1px solid #222; border-radius:20px; padding:3px 10px; font-size:11px; color:#888; }
  .cr-stat b { color:#ddd; }
  #crOutputPanel textarea { flex:1; background:#0d0d0d; color:#aaa; border:none; padding:14px 18px; font-family:monospace; font-size:12px; resize:none; outline:none; line-height:1.7; min-height:220px; }
  #crOutputPanel textarea::-webkit-scrollbar { width:3px; }
  #crOutputPanel textarea::-webkit-scrollbar-thumb { background:#2a2a2a; }
  .cr-out-foot { padding:12px 18px; border-top:1px solid #1e1e1e; display:flex; gap:9px; }
  .cr-copy-btn { flex:1; padding:11px; background:#5eead4; color:#0f172a; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:7px; }
  .cr-copy-btn:hover { background:#2dd4bf; }
  .cr-copy-btn.copied { background:#60a5fa; color:#fff; }
  .cr-dismiss-btn { padding:11px 16px; background:#1e1e1e; color:#666; border:1px solid #2a2a2a; border-radius:9px; cursor:pointer; font-size:13px; transition:all 0.2s; }
  .cr-dismiss-btn:hover { background:#252525; color:#ccc; }

  /* Alias Cards */
  .cr-alias-card { background:#1a1a1a; border:1px solid #222; border-radius:9px; margin-bottom:7px; overflow:hidden; transition:border-color 0.2s; }
  .cr-alias-card.expanded { border-color:#2e2e2e; }
  .cr-alias-head { display:flex; align-items:center; gap:8px; padding:9px 12px; }
  .cr-alias-main { flex:1; font-size:12px; color:#ccc; font-weight:600; }
  .cr-alias-count { font-size:10px; color:#444; font-family:monospace; white-space:nowrap; }
  .cr-alias-actions { display:flex; gap:4px; }
  .cr-alias-toggle, .cr-alias-remove { width:26px; height:26px; border-radius:5px; border:none; cursor:pointer; font-size:14px; line-height:1; display:flex; align-items:center; justify-content:center; transition:all 0.15s; padding:0; }
  .cr-alias-toggle:active, .cr-alias-remove:active { transform:scale(0.9); }
  .cr-alias-toggle { background:#222; color:#666; }
  .cr-alias-toggle:hover { background:#2a2a2a; color:#ccc; }
  .cr-alias-remove { background:#1e1e1e; color:#555; }
  .cr-alias-remove:hover { background:#f87171; color:#fff; }
  .cr-alias-chips-row { padding:0 12px 8px; display:flex; flex-wrap:wrap; gap:4px; }
  .cr-chip-xs { background:#111; border:1px solid #222; color:#777; padding:2px 7px; border-radius:20px; font-size:10px; }
  .cr-alias-edit-form { border-top:1px solid #1e1e1e; padding:10px 12px; display:none; background:#141414; }
  .cr-alias-edit-form.open { display:block; animation:crFadeIn 0.15s ease; }
  .cr-alias-label-sm { font-size:10px; color:#555; margin-bottom:4px; margin-top:8px; }
  .cr-alias-label-sm:first-child { margin-top:0; }
  .cr-alias-main-input { width:100%; background:#111; color:#ddd; border:1px solid #222; border-radius:6px; padding:6px 8px; font-size:12px; box-sizing:border-box; outline:none; transition:border-color 0.2s; margin-bottom:6px; }
  .cr-alias-main-input:focus { border-color:#333; }
  .cr-alias-search-row { display:flex; gap:7px; margin-bottom:10px; }
  .cr-alias-search-row input { flex:1; background:#111; color:#ccc; border:1px solid #222; border-radius:7px; padding:7px 10px; font-size:12px; outline:none; transition:border-color 0.2s; }
  .cr-alias-search-row input:focus { border-color:#333; }
  .cr-alias-add-btn { background:#5eead4; color:#000; border:none; border-radius:7px; padding:7px 12px; font-size:12px; font-weight:bold; cursor:pointer; white-space:nowrap; transition:background 0.2s; }
  .cr-alias-add-btn:hover { background:#2dd4bf; }
  .cr-alias-empty { text-align:center; color:#444; font-size:12px; padding:20px 0; }

  /* Output Editor */
  .cr-editor-section { margin-bottom:16px; }
  .cr-editor-section-head { display:flex; align-items:center; gap:8px; margin-bottom:7px; padding-bottom:6px; border-bottom:1px solid #1e1e1e; }
  .cr-editor-section-title { font-size:11px; color:#555; text-transform:uppercase; letter-spacing:0.5px; flex:1; }
  .cr-editor-section-badge { background:#1a1a1a; border:1px solid #222; color:#555; font-size:10px; font-family:monospace; padding:1px 7px; border-radius:10px; }
  .cr-editor-card { background:#1a1a1a; border:1px solid #222; border-radius:8px; margin-bottom:4px; overflow:hidden; transition:border-color 0.15s; }
  .cr-editor-card:hover { border-color:#2e2e2e; }
  .cr-editor-card-head { display:flex; align-items:center; gap:7px; padding:8px 10px; cursor:grab; user-select:none; }
  .cr-editor-card-head:active { cursor:grabbing; }
  .cr-editor-grip { color:#444; font-size:10px; flex-shrink:0; }
  .cr-editor-card:hover .cr-editor-grip { color:#666; }
  .cr-editor-name { flex:1; font-size:12px; color:#ccc; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
  .cr-editor-meta { font-size:10px; color:#444; font-family:monospace; white-space:nowrap; flex-shrink:0; }
  .cr-editor-actions { display:flex; gap:4px; flex-shrink:0; }
  .cr-editor-edit-btn, .cr-editor-del-btn { width:24px; height:24px; border-radius:5px; border:none; cursor:pointer; font-size:13px; line-height:1; display:flex; align-items:center; justify-content:center; transition:all 0.15s; padding:0; }
  .cr-editor-edit-btn:active, .cr-editor-del-btn:active { transform:scale(0.9); }
  .cr-editor-edit-btn { background:#222; color:#666; }
  .cr-editor-edit-btn:hover { background:#2a2a2a; color:#ccc; }
  .cr-editor-del-btn { background:#1e1e1e; color:#555; }
  .cr-editor-del-btn:hover { background:#f87171; color:#fff; }
  .cr-editor-form { border-top:1px solid #1e1e1e; padding:8px 10px; background:#141414; display:none; animation:crFadeIn 0.15s; }
  .cr-editor-form.open { display:block; }
  .cr-editor-field { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
  .cr-editor-field:last-child { margin-bottom:0; }
  .cr-editor-field-lbl { font-size:10px; color:#555; width:82px; flex-shrink:0; }
  .cr-editor-field-in { flex:1; background:#111; border:1px solid #222; border-radius:5px; padding:4px 7px; color:#ddd; font-size:12px; outline:none; transition:border-color 0.2s; }
  .cr-editor-field-in:focus { border-color:#333; }
  .cr-editor-str-item { display:flex; align-items:center; gap:8px; padding:6px 10px; background:#1a1a1a; border:1px solid #222; border-radius:7px; margin-bottom:4px; }
  .cr-editor-str-val { flex:1; font-size:12px; color:#ccc; }
  .cr-editor-str-del { width:22px; height:22px; border-radius:4px; border:none; background:#1e1e1e; color:#555; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .cr-editor-str-del:hover { background:#f87171; color:#fff; }
  .cr-editor-dragging { opacity:0.35; }
  .cr-editor-dragover { border-color:#5eead4 !important; background:#0d1e1d; }

  /* History Panel */
  #crHistoryPanel { position:fixed; top:70px; right:130px; z-index:999999; background:#161616; color:#fff; border-radius:12px; width:440px; max-height:88vh; display:flex; flex-direction:column; border:1px solid #2a2a2a; box-shadow:0 8px 32px rgba(0,0,0,0.45); animation:crSlideIn 0.25s ease; overflow:hidden; }
  #crHistoryBtn { width:36px; height:36px; background:#111; color:#555; border:1px solid #222; border-radius:8px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all 0.25s ease; }
  #crHistoryBtn:hover { color:#fff; border-color:#444; background:#1a1a1a; }
  .cr-hist-filter { display:flex; gap:6px; align-items:center; flex-wrap:wrap; padding:10px 16px; border-bottom:1px solid #1e1e1e; flex-shrink:0; }
  .cr-hist-date-in { background:#111; border:1px solid #222; border-radius:6px; padding:5px 8px; color:#ddd; font-size:11px; outline:none; transition:border-color 0.2s; width:110px; }
  .cr-hist-date-in:focus { border-color:#333; }
  .cr-hist-chips { display:flex; gap:5px; }
  .cr-hist-chip { padding:3px 10px; border-radius:20px; border:1px solid #222; background:#1a1a1a; color:#555; font-size:11px; cursor:pointer; transition:all 0.15s; }
  .cr-hist-chip.active { background:#0d1e1d; border-color:#5eead455; color:#5eead4; }
  .cr-hist-count { font-size:10px; color:#444; margin-left:auto; font-family:monospace; }
  .cr-hist-body { flex:1; overflow-y:auto; padding:12px 16px; min-height:0; }
  .cr-hist-body::-webkit-scrollbar { width:3px; }
  .cr-hist-body::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
  .cr-hist-entry { background:#1a1a1a; border:1px solid #222; border-radius:9px; margin-bottom:7px; padding:10px 12px; transition:border-color 0.2s; }
  .cr-hist-entry:hover { border-color:#2a2a2a; }
  .cr-hist-row { display:flex; align-items:baseline; gap:8px; margin-bottom:5px; }
  .cr-hist-name { flex:1; font-size:13px; color:#ccc; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .cr-hist-date { font-size:10px; color:#444; font-family:monospace; white-space:nowrap; flex-shrink:0; }
  .cr-hist-stats { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
  .cr-hist-actions { display:flex; gap:5px; justify-content:flex-end; }
  .cr-hist-btn { padding:4px 10px; border-radius:6px; border:none; cursor:pointer; font-size:11px; font-weight:bold; transition:all 0.15s; }
  .cr-hist-btn-view { background:#222; color:#888; }
  .cr-hist-btn-view:hover { background:#2a2a2a; color:#fff; }
  .cr-hist-btn-copy { background:#0d1e1d; color:#5eead4; border:1px solid #5eead430; }
  .cr-hist-btn-copy:hover { background:#5eead4; color:#000; }
  .cr-hist-btn-del { background:#1e1e1e; color:#555; }
  .cr-hist-btn-del:hover { background:#f87171; color:#fff; }
  .cr-hist-empty { text-align:center; color:#444; font-size:12px; padding:40px 0; }
  .cr-hist-footer { padding:12px 16px; border-top:1px solid #1e1e1e; flex-shrink:0; }
  .cr-hist-clear-btn { width:100%; padding:9px; background:transparent; color:#555; border:1px solid #2a2a2a; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold; transition:all 0.2s; }
  .cr-hist-clear-btn:hover { background:#f8717122; color:#f87171; border-color:#f8717144; }
`;

export function injectStyles() {
  if (document.getElementById('cr-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'cr-styles';
  styleEl.textContent = buttonAnimationStyles;
  document.head.appendChild(styleEl);
}
