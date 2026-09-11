# Proposal: cierre-de-caja-y-cola-pulida

## Why

El cajero no contaba con un módulo de cierre de caja: al final del turno no había forma de conciliar el efectivo físico contado por denominación contra lo registrado por el sistema, ni de registrar el sobrante/faltante con trazabilidad. Además, la tarjeta de la cola mostraba el método de pago como texto inflado, el monto de pago con espacio doble en montos grandes y sin iconos que permitieran identificar rápido el tipo de pago o entrega, y el botón del terminal POS mostraba una fila "Total" redundante sobre el propio botón.

## What Changes

- **Cierre de caja**: nueva pestaña "Cierre" en la app del cajero que muestra el contraste del sistema (ventas entregadas del día por método de pago, prorrateando pagos divididos; cuentas de pensionados con consumos fuera de caja y recargas dentro de caja), permite completar el arqueo de efectivo por denominación, registrar sobrante/faltante, notas y guardar el cierre con historial y ticket resumen imprimible.
- **Arqueo tipo Excel**: grilla con denominaciones de Bs 200 a 0,50, entrada de cantidad navegable por teclado (↑/↓/Enter), autofocus en la denominación mayor, filas zebra por `cva` y total contado en vivo.
- **Cola: pedidos completados al final**: los pedidos entregados con pago o anulados quedan después de los pendientes.
- **Tarjeta de cola con iconos**: el tipo de entrega se muestra como icono (moto/cubiertos/bolsa) con color y tooltip; el método de pago se muestra como icono en la tarjeta expandida y en la fila de monto compacta; el monto aparece en un solo bloque sin espacio doble ("45 Bs").
- **Botón del terminal sin fila Total redundante**: el total vive únicamente dentro del botón de envío.

## Capabilities

### New Capabilities

- (ninguna nueva)

### Modified Capabilities

- `cashier`: cierre de caja, arqueo de efectivo por denominación con moneda de 0,50 y grilla tipo Excel, pedidos completados al final de la cola, iconos de método de pago y tipo de entrega en la tarjeta.
- `pos-terminal`: botón de envío sin fila "Total" redundante.

## Impact

- **packages/types**: `CashDenominations` ampliado con `0.5`; helpers de moneda.
- **packages/db**: columnas monetarias de `CashClose` cambiadas a `Float`; migración `20260911140000_cash_close_money_float`.
- **apps/cajero**: `cash-close-view` (pestaña Cierre, arqueo Excel, historial, impresión), `queue-view` (iconos, footer compacto, monto nowrap), `pos-terminal` (botón sin fila Total).
