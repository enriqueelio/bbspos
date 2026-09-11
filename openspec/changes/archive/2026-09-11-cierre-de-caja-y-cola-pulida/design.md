# Design: cierre-de-caja-y-cola-pulida

## Context

La app del cajero ya tenía un reporte del día (`/reporte`) y una cola de preparación funcional, pero no existía cierre de caja. La cola usaba texto (`Pago: EFECTIVO`, tipo de entrega como badge) en lugar de iconos, y el monto del total a veces se partía en dos spans. El terminal POS mostraba una fila "Total" separada del botón de envío, duplicando información.

## Goals / Non-Goals

**Goals**

- Conciliar el efectivo contado por denominación contra lo que el sistema espera según los pedidos entregados del día.
- Dar al cajero un registro persistente de cada cierre (historial del día, reimprimible).
- Reducir el ruido visual en las tarjetas de la cola: iconos compactos, monto en un solo bloque, sin texto redundante de pago.
- Eliminar la fila Total redundante del botón del terminal.

**Non-Goals**

- Cálculo automático de sobrante/faltante en moneda física (el cajero ingresa las cantidades; el sistema calcula).
- Control de apertura de turno (queda fuera de alcance).
- Cierre por turno de múltiples usuarios simultáneos.

## Decisions

### D1. Moneda 0,50 en el arqueo

`CashDenominations` se amplía de `200,100,50,20,10,5,2,1` a `200,100,50,20,10,5,2,1,0.5`. Las columnas monetarias de `CashClose` (`countedCash`, `systemCash`, `systemQr`, `systemCard`, etc.) cambian de `Int` a `Float` (migración `20260911140000_cash_close_money_float`). El helper `fmtBs` muestra 2 decimales solo cuando la fracción lo requiere (p. ej. `25` → "25" y `25.5` → "25.50").

### D2. Cierre de caja como pestaña del cajero

`cash-close-view` se integra como pestaña "Cierre" en el menú de la app del cajero (mismo patrón que Reportes). El componente carga el reporte del día (`getCashCloseStats`) y el historial de cierres (`getCashCloses`); al guardar llama a `createCashClose` (server action) y muestra el ticket resumen imprimible.

### D3. Arqueo tipo Excel con cva

El formulario de denominaciones usa una tabla con `thead`/`tfoot` sticky, `cva` (`arqueoRow`) para filas zebra (colores `even:bg-slate-700/30`, `focus-within:bg-sky-900/40`), `inputRefs` con navegación por teclado (↓/Enter avanza, ↑ retrocede), autofocus en `Bs 200` al montar, y filas emerald cuando la cantidad es > 0.

### D4. Pedidos completados al fondo de la cola

La función `visualStateOf` ya clasificaba el estado; el ordenamiento en `queue-view` ahora concatena primero `PENDING` (RECIBIDO sin pagar, RECIBIDO pagado, ENTREGADO sin pagar) y después `DONE` (ENTREGADO pagado, ANULADO) — sin cambiar la lógica de negocio de la cola.

### D5. Iconos de método de pago y tipo de entrega

`PAYMENT_ICONS` mapea cada `PaymentMethod` a un componente lucide (o el SVG embebido `PaperBag` para LLEVAR) con color `cva`. `DELIVERY_TYPES` hace lo mismo para los tipos de entrega. Los iconos se muestran con `aria-hidden` y tooltip vía `<title>` como hijo del SVG (necesario porque lucide v0.468 no tipa `title`).

### D6. Monto sin espacio doble

Cada monto se renderiza en un solo `<span>` con `formatPrice(order.total)` (produce "45 Bs" en un string), en lugar de dos spans separados para el número y "Bs". El resultado: sin doble espacio en montos grandes.

### D7. Botón del terminal sin fila Total

La fila `Total` del ticket en curso (`pos-terminal.tsx`) se elimina. El botón muestra el total (o "COMPLETAR PEDIDO" si no hay total). Se agrega `mt-2` al botón para conservar la separación visual que antes daba la fila eliminada.

## Risks / Trade-offs

- [Migración de Int a Float en CashClose puede causar pérdida de decimales] → Se recrea la tabla con `REAL`; no hay datos previos en la tabla de cierre, por lo que no hay pérdida.
- [Iconos lucide v0.468 no incluyen PaperBag] → Se usa SVG embebido oficial con soporte de `aria-label` y `<title>` para tooltip.
- [Pedidos completados al fondo aumentan la distancia de scroll] → Aceptado: son un grupo pequeño en comparación con los pendientes.

## Migration Plan

1. Migración SQL `20260911140000_cash_close_money_float`: recrea `CashClose` con columnas `REAL`, conservando índices `date` y `closedAt`.
2. `prisma generate` tras kill de procesos Node (requerido por EPERM).
3. Verificar: abrir pestaña Cierre, completar arqueo con moneda 0,50, guardar, imprimir; verificar cola con pedidos completados al fondo; verificar tarjetas con iconos; verificar botón del terminal sin fila Total.

## Open Questions

- Ninguna pendiente.
