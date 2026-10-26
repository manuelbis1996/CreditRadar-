# CreditRadar Changelog

## v20.45 (2026-10-26)
🛡️ **Confirmación previa a la actualización** — Al elegir instalar desde el aviso de nueva versión, se presenta el descargo y la cuenta regresiva de 60 segundos antes de continuar. Se puede cancelar la instalación sin aceptar.

---

## v20.44 (2026-10-26)
⏱️ **Cuenta regresiva de un minuto** — La aceptación del aviso de responsabilidad se habilita después de 60 segundos.

---

## v20.43 (2026-10-26)
⚠️ **Aviso al actualizar** — Al iniciar una nueva versión, muestra primero un descargo de responsabilidad con una cuenta regresiva animada. La aceptación habilita las notas de versión.

---

## v20.42 (2026-10-26)
🔔 **Aviso modal prioritario** — El aviso cubre toda la pantalla con fondo oscurecido, bloquea el panel de resultados y requiere que el usuario lo cierre o verifique una detección para continuar.

---

## v20.41 (2026-10-26)
🔔 **Aviso prioritario centrado** — El aviso interactivo aparece en el centro de la pantalla, por encima del panel de resultados.

---

## v20.40 (2026-10-26)
🔎 **Aviso interactivo** — Permite recorrer detecciones con anterior/siguiente y verificar cada elemento en la página, conservando el panel de resultados para volver a él.

---

## v20.39 (2026-10-26)
🔔 **Orden del aviso** — El resumen se muestra antes de abrir el panel de resultados y permanece visible por encima del menú.

---

## v20.38 (2026-10-26)
🔔 **Avisos de detección** — Al terminar el análisis, muestra un resumen de cuentas positivas detectadas, inquiries protegidas, cuentas omitidas y elementos que requieren revisión manual.

---

## v20.37 (2026-10-26)
🔵 **Cuentas positivas en This Round** — Si una cuenta positiva aparece seleccionada para esta ronda, se detecta y se marca en azul tanto en la lista seleccionada como en Positive Items; no se agrega al output de disputa.

---

## v20.36 (2026-10-26)
🔵 **Fix color en Positive Items** — Al detectar una cuenta cerrada positiva, el borde azul también se aplica a la cuenta correspondiente en la sección Positive Items.

---

## v20.35 (2026-10-26)
🔧 **Fix Positive Items** — Las cuentas positivas se conservan aunque otro buró indique “deleted” o “none”.

---

## v20.34 (2026-05-21)
🔘 **Toggle por cuenta** — Incluye/excluye cuentas individuales antes de copiar | ✅ Open + Collection/Charge ahora se procesan correctamente

### Cambios implementados:
1. **Toggle en cada cuenta** — Círculo (●/○) para activar/desactivar cuentas antes de copiar
   - Archivos: `src/ui/output-editor.js`, `src/ui/styles.js`
   - Al hacer clic en ●, cambia a ○ y la cuenta se excluye (opacity 0.4)
   - Solo se copian las cuentas con ● activo

2. **Open + Collection/Charge** — Ahora se procesan correctamente
   - Archivos: `src/main.js`, `src/core/parser.js`
   - Si Account Status = Open Y Payment Status = Collection/Charge → se copia
   - Anteriormente se saltaba por ser "Open"

### Lógica de decisión de cuentas:
| Account Status | Payment Status | Resultado |
|----------------|----------------|-----------|
| Open | Collection/Charge | ✅ Se copia |
| Open | Current / Paid | ❌ Se omite |
| Closed | Collection/Charge | ✅ Se copia |
| Closed | Paid | ❌ Se omite |

---

## v20.33
🚀 8 nuevas funciones: días, notas, export/import, badge estatus, hover, 3 formatos copia, cuentas nuevas

## v20.32
📲 Teléfono se captura en todos los puntos de guardado — copiar, historial y completo

## v20.31
📲 WhatsApp: teléfono del cliente se guarda automáticamente desde Pulse

## v20.30
🔗 Botón CreditFlow sin texto — solo ícono

## v20.29
🔗 Botón CreditFlow prominente en toolbar — siempre visible como el botón principal

## v20.28
🔧 fix: CreditFlow carga datos al abrir sin necesidad de cambiar de ventana

## v20.27
✅ Guardar y marcar completo: ejecuta Save Changes + marca carta y CFBP en CreditFlow

## v20.26
✅ Botón 'Guardar y marcar como completo' al lado de Save Changes en Pulse

## v20.25
⚡ CreditFlow: sync instantáneo con GM_addValueChangeListener — sin polling

## v20.24
🔗 CreditFlow: guarda link de Pulse automáticamente al agregar cliente

## v20.23
🔧 fix: exponer GM storage a creditflow.html vía unsafeWindow

## v20.22
🔗 Botón CreditFlow en cada entrada del Historial

## v20.21
🔗 Botón CreditFlow en toolbar + toast confirmación al guardar

## v20.20
⚡ Auto-guardar en CreditFlow al copiar el reporte

## v20.19
🔗 CreditFlow: página independiente, sin conflicto con Tampermonkey

## v20.18
🔗 CreditFlow: CRM integrado para gestionar clientes de reparación de crédito

## v20.17
📊 Reporte diario ahora muestra el estado asignado a cada cliente

## v20.16
🏷️ Estados de cliente: asigna estados con colores a cada entrada del historial

## v20.15
📊 Reporte diario: genera resumen del día desde Historial con copia y WhatsApp

## v20.14
🛡 Vincular manual: enlaza inquiries no detectadas a cuentas positivas y guarda el alias

## v20.13
📌 Toolbar al tope del sidebar + botón Copiar Info Personal

## v20.12
📌 Toolbar integrada al sidebar de comunicaciones

## v20.11
🛡️ Escudo mejorado: menos falsos negativos en detección de inquiries vinculadas

## v20.10
🔧 Fix: dirección del cliente se copia con salto de línea correcto

## v20.9
⚠️ Fix: cuentas lentas ya no se saltan silenciosamente — retry automático + aviso en output

## v20.8
🎯 Toolbar colapsable: solo muestra el botón principal, expande al hacer hover

## v20.7
⚡ Optimizaciones: matching O(n) con Sets, pre-cómputo de status, timeouts reducidos

## v20.6
🎨 Rediseño minimalista: sin glow, paleta teal suave, paneles limpios

## v20.5
🛡️ Correcciones: clipboard, historial corrupto, XSS y filtros de fecha

## v20.4
📐 El menú ya no se oculta al cambiar el tamaño de la ventana

## v20.3
📚 Historial de clientes: revisa, re-copia y filtra por rango de fechas

## v20.2
✏️ Panel de output interactivo: edita, reordena y elimina cuentas antes de copiar

## v20.1
🛡️ Escudo Anti-Disputas: Exclusión automática de Inquiries vinculadas a cuentas positivas

## v20.0
⚡ Turbocarga con MutationObservers y botonera flotante de cristal arrastrable
