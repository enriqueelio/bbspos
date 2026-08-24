# Design: add-aceptado-order-state

## Context

El modelo actual (`INGRESADO`/`ENTREGADO`/`ANULADO`) nació del cambio `add-cashier-app`; el flujo real de mostrador exige un paso intermedio donde el cajero registra el método de pago (ver proposal.md). Existen ~600 pedidos de prueba en `ENTREGADO`/`ANULADO` que deben sobrevivir a la migración.

## Goals / Non-Goals

**Goals**

- Tres estados con pago obligatorio antes de entrega; trazabilidad de quién/cuándo aceptó.
- Migración segura del dato existente (INGRESADO→RECIBIDO, ENTREGADO/ANULADO sin cambios).

**Non-Goals**

- Pagos en línea ni conciliación bancaria: el registro es declarativo (el cajero informa lo cobrado).
- Tarjeta como opción de aceptación (decisión del usuario); el valor TARJETA permanece en el enum por datos históricos pero no se ofrece en la UI.
- Cambios en reportes: siguen contando no anulados y entregas por `deliveredAt`.

## Decisions

### D1. Enum de 4 valores con remapeo por UPDATE

SQLite guarda enums como TEXT: la migración agrega `ACEPTADO` al CHECK, ejecuta `UPDATE ... SET status='RECIBIDO' WHERE status='INGRESADO'` y añade columna `paidAt DateTime?`. Prisma generará reconstrucción de tabla; se edita el SQL para incluir los UPDATE antes del INSERT...SELECT final.

### D2. `acceptOrder(orderId, method)` reemplaza a `markOrderPaid`

Nueva acción compartida por admin y cajero: valida estado RECIBIDO, método ∈ {EFECTIVO, QR}, setea `status=ACEPTADO`, `paymentMethod`, `paidAt=new Date()`, `userId`. `deliverOrder` pasa a exigir ACEPTADO (error si RECIBIDO). Se elimina el comportamiento antiguo de "pagar entrega directo".

### D3. Opciones de aceptación acotadas en tipos

`AcceptablePayment = [EFECTIVO, QR]` exportado desde packages/types para que admin y cajero rendericen exactamente esas dos opciones sin duplicar listas. TARJETA sigue existiendo en PaymentMethod (histórico) fuera de esta lista.

### D4. Cola del cajero en dos secciones

La pestaña "Preparar" muestra "Por cobrar" (RECIBIDO del día, con botones Efectivo/QR inline y confirmación) encima de "Por entregar" (ACEPTADO, botón Entregar con badge de urgencia ≥15 min). El polling de 15 s se mantiene.

### D5. Admin con filtro y acción por estado

Filtros: Todos / Recibidos / Aceptados / Entregados / Anulados. En cada fila: RECIBIDO → "Registrar pago" (selector Efectivo|QR); ACEPTADO → "Entregar". El dashboard cuenta `RECIBIDO` como "Pedidos por cobrar".

## Risks / Trade-offs

- [Cambios OpenSpec pendientes de archivar] → `add-cashier-app` modificó "Estados de pedido" con la secuencia anterior; al archivar debe ir ANTES que este cambio para que el spec principal quede con la secuencia definitiva.
- [Pedidos RECIBIDO de días anteriores visibles en cola] → La cola ya filtra por fecha del día; pedidos viejos en RECIBIDO solo aparecen en el listado del admin.
- [TARJETA huérfano en UI] → Datos históricos conservan el método en reportes; nuevas aceptaciones no lo ofrecen.

## Migration Plan

1. Migración única: enum + UPDATE de remapeo + columna paidAt.
2. Regenerar cliente Prisma con servidores detenidos (evita EPERM en Windows).
3. Sin backfill adicional: pedidos entregados conservan deliveredAt; paidAt queda null en históricos.

## Open Questions

- Ninguna pendiente que afecte specs o tareas.
