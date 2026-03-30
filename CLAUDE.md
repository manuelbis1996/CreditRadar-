# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Two Tampermonkey userscripts for credit dispute automation:

- **`creditradar.user.js`** — Main script (v20.x). Runs on `pulse.disputeprocess.com`. Classifies collections, creditors, inquiries, and personal info from credit reports, then generates a formatted dispute output.
- **`cfpb_helper.user.js`** — Helper script (v1.x). Runs on `portal.consumerfinance.gov`. Automates adding the three bureaus (Equifax, Experian, TransUnion) to CFPB complaint forms.

## Deployment

No build step. Install directly via Tampermonkey:
- Edit the script in Tampermonkey's editor, or
- Push to GitHub — the scripts auto-update via `@updateURL` / `@downloadURL` pointing to `raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/`.

To trigger an update check in the browser: Tampermonkey Dashboard → script → "Check for updates".

## Architecture of `creditradar.user.js`

The file is a single IIFE (`(function(){ 'use strict'; ... })()`). Sections in order:

1. **Constants** — `BUROS`, `STOP_WORDS`, `IGNORE_VALUES`, `REMOVE_SUFFIXES/PREFIXES`, `EXPAND_MAP`
2. **Name cleaning** — `cleanName()`, `normalizeForMatch()`, `jaccardSimilarity()`
3. **Config** — `DEFAULT_CONFIG`, `loadConfig()`, `saveConfig()` (persisted via `GM_getValue`/`GM_setValue` under key `pulse_clasificador_config`)
4. **CSS injection** — `GM_addStyle(...)` injects all UI styles at startup
5. **Component helpers** — `createChip()`, `escapeHtml()`, `createOverlay()`, `createModal()`, `bindClose()`
6. **Version check** — `compareVersions()`, `checkForUpdates()` via `GM_xmlhttpRequest` to GitHub raw, `showVersionModal()`
7. **DOM scraping** — `waitForElement()` (MutationObserver), `expandAllDisputes()` (Promise.allSettled), `scrapeReport()`
8. **Classification logic** — `getLinkedAccount()` (inquiry→account matching), `buildOutput()` (assembles the dispute text + stats object)
9. **UI** — `buildStatsDashboard()`, `showOutputPreview()`, `showSettingsPanel()`, `buildAliasCard()`, `buildPersonalCard()`, `buildAgenciesCard()`, `buildFieldsCard()`
10. **Toolbar** — floating draggable button panel injected via `waitForElement()`

## Key Design Decisions

**z-index layering** — Three layers exist in the CSS:
- `#crOverlay` (CSS rule): `z-index: 999997` — backdrop for output panel
- `#crOutputPanel`: `z-index: 999999` — output/result panel
- `createOverlay()` helper sets `z-index: 9999998` **inline** — used only for settings/version modals, NOT for the output panel overlay (inline styles override CSS rules, so `showOutputPreview` must create its overlay manually without inline z-index)

**Version comparison** — Use `compareVersions(a, b)` (segment-by-segment numeric), never `parseFloat()`. `parseFloat("19.10") === 19.1 < 19.9` causes wrong comparisons.

**Inquiry matching** (`getLinkedAccount`) — Uses a pipeline: exact word overlap ≥ 2, then single long-word exact, then substring containment (min 6 chars), then Jaccard similarity ≥ 0.7. Threshold was intentionally tightened from 0.6 to avoid false positives with positive accounts.

**Config persistence** — All user settings stored via `GM_getValue/GM_setValue`. `loadConfig()` merges saved config with `DEFAULT_CONFIG` to handle new keys added in updates.

**Chip components** — `createChip(val)` is the single source of truth for tag chips. It includes HTML escaping. Do not duplicate chip creation inline.

## Version Numbering

`SCRIPT_VERSION` constant at the top of the file + `@version` in the UserScript header must always match. `VERSION_NOTES` object should have an entry for the new version.
