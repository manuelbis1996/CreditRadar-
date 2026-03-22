# CreditRadar — Contexto del Proyecto

## Qué es

Userscript de **Tampermonkey** usado internamente en una empresa de reparación de crédito. Corre sobre **DisputeFox** en https://pulse.disputeprocess.com/.

Automatiza el trabajo de los agentes: escanea la página de un cliente, clasifica sus cuentas disputadas y genera un output formateado listo para copiar/pegar.

## Archivo principal

- **`creditradar.user.js`** — un solo archivo JS (~1500 líneas), versión actual **19.0**
- Sin build system. Se edita directamente.
- Se auto-actualiza desde GitHub: `manuelbis1996/CreditRadar-`

## Flujo del agente

1. Abre un cliente en DisputeFox
2. Clic en el botón CreditRadar (📋, esquina superior derecha)
3. El script expande y escanea todas las disputas "This Round"
4. Genera output clasificado → modal con "Copiar al Clipboard"
5. El agente pega el output en el proceso de disputa

## Qué clasifica

| Categoría | Descripción |
|---|---|
| **Collection Agencies** | Agencias colectoras (LVNV, Midland, etc.) |
| **Original Creditors** | Acreedores originales (Chase, Amex, etc.) |
| **Inquiries** | Consultas de crédito, con linking a cuentas open relacionadas |
| **Personal Information** | Nombre, dirección, SSN, DOB, etc. del cliente |

Cuentas **Open** y **Closed Positive** se saltean y se resaltan visualmente.

## Arquitectura del código (secciones en orden)

| Sección | Descripción |
|---|---|
| `CONSTANTS` | SLEEP, STORAGE_KEY, BUROS, STOP_WORDS, IGNORE_VALUES |
| `NAME CLEANING` | cleanName(), normalizeForMatch(), REMOVE_PREFIXES, EXPAND_MAP |
| `DEFAULT_ALIASES` | 130+ aliases de instituciones financieras |
| `DEFAULT_CONFIG` | Agencias, estados negativos/positivos, colores, campos |
| `CONFIG STORAGE` | loadConfig() / saveConfig() → localStorage key: `pulse_clasificador_config` |
| `ALIAS MAP` | buildAliasMap(), resolveAlias() |
| `CSS SELECTOR REGISTRY` | Todos los selectores de DisputeFox en objeto `SELECTORS` |
| `UI — TAG CHIPS` | Input con chips para agregar keywords |
| `UI — DRAG & DROP` | Reordenar campos con drag |
| `ALIAS UI` | Cards editables por acreedor con búsqueda |
| `CONFIG PANEL` | Panel con 6 tabs: Agencias, Estados, Colores, Campos, Aliases, Personal |
| `STYLES` | CSS completo embebido (dark theme) |
| `BUTTON ANIMATIONS` | glow (idle), pulse (processing), success |
| `DOM HELPERS` | waitForElement(), queryAll(), queryOne() |
| `BURO DETECTION` | getBuroStatus(), getActiveColumns(), hasInDispute() |
| `BLOCK PARSING` | parseAccountBlocks() → extrae name/number/balance/dateOpened/status |
| `AGENCY DETECTION` | isAgency() → compara contra lista de agencias en config |
| `INQUIRY MATCHING` | getLinkedAccount() → fuzzy match + Jaccard similarity |
| `DISPUTE LOADER` | expandDisputeItem(), loadRoundDisputes() |
| `OUTPUT FORMATTER` | formatAccount(), formatAccountList() |
| `CLIENT DATA` | getClientData() → lee info del panel lateral del cliente |
| `MAIN run()` | Orquesta todo el flujo |

## Config panel (6 tabs)

- **Agencias** — keywords para detectar collection agencies (tag chips)
- **Estados** — closed / payment / negative statuses (textarea)
- **Colores** — color picker para Open, Closed+, Inquiry linked
- **Campos** — drag & drop para reordenar fields del output
- **Aliases** — cards editables por acreedor con búsqueda
- **Personal** — toggle on/off y reorden de campos del cliente

## Notas importantes

- Los selectores CSS dependen de la UI de DisputeFox — si la plataforma actualiza su HTML, pueden romperse
- Las mejoras deben ser retrocompatibles con configs guardadas en localStorage
- Prioridades del negocio: **velocidad**, **claridad visual** y **precisión** en la clasificación

## Mejoras pendientes

1. Bureaus por cuenta en output (EQ / EX / TU por cada cuenta)
2. Historial de ejecuciones en localStorage
3. Ordenar cuentas por nombre, balance o fecha
4. Exportar output a .txt
5. Detección de cuentas duplicadas
6. Atajo de teclado (Alt+R para ejecutar)
7. Múltiples perfiles de configuración
8. Resumen por buró en el stats panel (EQ: 5 | EX: 4 | TU: 6)