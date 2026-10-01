# Design: add-customer-loyalty

## Context

El POS ya tiene `Customer` (con `ci`, `phone` obligatorio, `pensionType`, `balance`, `creditLimit`), `Order.customerId` y `CustomerLedger` (RECARGA / PAGO_DEUDA / CONSUMO) para pensionados prepago/postpago. El campo NOMBRE del terminal es texto libre que solo persiste en `Order.customerName`. No hay autocompletado, ni métricas de compra, ni sistema de puntos/niveles. Las propuestas `indicaciones/cG.txt` (CRM ligero con autocompletado + ranking) y `indicaciones/cM.txt` (esquema normalizado completo con puntos y niveles de pollería, asumiendo PHP/MySQL) difieren en alcance: cG encaja con la arquitectura real; cM aporta la lógica de lealtad pero duplicaría `Order`/`OrderItem`.

## Goals / Non-Goals

**Goals**

- Identificar al cliente desde el terminal sin fricción (autocompletado por nombre/teléfono + alta automática).
- Acumular visitas, gasto y puntos de forma automática y auditable al cobrar.
- Ofrecer niveles de lealtad configurables y canje de puntos con bitácora.
- Ranking de clientes en Admin por período (mes/30 días/histórico) respetando la zona horaria del negocio.

**Non-Goals**

- Cambiar el sistema de pensionados (prepago/postpago y `CustomerLedger` se conservan intactos).
- Migrar pedidos históricos a clientes (solo pedidos nuevos quedan vinculados).
- Descuento automático aplicado al total (el canje es un registro con sus propios puntos; el descuento en `Order` sigue siendo manual).
- Integración externa (WhatsApp, marketing, fidelización multi-local).

## Decisions

### D1. Extender `Customer` en lugar de un nuevo modelo

Se agregan a `Customer`: `totalVisits Int @default(0)`, `totalSpent Int @default(0)`, `lastVisitAt DateTime?`, `points Int @default(0)`; `phone` pasa a `String? @unique` (opcional porque muchos clientes de mostrador solo dan nombre). `ci`, `pensionType`, `balance`, `creditLimit`, `ledger` y `orders` se mantienen: la misma fila representa tanto al cliente frecuente como al pensionado; los campos de pensión simplemente no se usan para clientes comunes. Razón: evitar una segunda tabla de clientes que obligaría a duplicar/normalizar lo que `Order.customerId` ya resuelve.

### D2. Métricas como caché, `Order` como fuente de verdad

Los acumulados en `Customer` son caché para rankings rápidos; la fuente de verdad sigue siendo `Order` con `paidAt` no nulo. Para el ranking por período se consulta `Order` agregando sobre `paidAt` con la zona horaria fija: en SQLite `date("paidAt"/1000,'unixepoch','-4 hours') >= date('now','-4 hours','start of month')`. Esto permite recalcular/auditar sin confiar solo en contadores.

### D3. Acumulación en la transacción de cobro

La actualización (+1 visita, `totalSpent += total`, `lastVisitAt`, `points += total`) ocurre en la misma transacción Prisma que registra `paidAt`, solo si `customerId` no es null, y usa el total final (con `discountAmount` ya aplicado, que en este POS es el valor guardado en `Order.total`). Si el pedido se anula después, los puntos no se descuentan automáticamente (fuera de alcance; se puede corregir manualmente desde Admin).

### D4. Puntos y reglas en tablas propias

- `CustomerBenefitRule`: `id`, `name`, `description`, `metric` (`SPEND_MONTH` | `VISITS_MONTH` | `POINTS`), `threshold Int`, `active Boolean`, `createdAt`. Se sembran con defaults editables.
- `CustomerReward`: `id`, `customerId`, `ruleId?`, `type` (`CANJE` | `OTORGADO`), `pointsUsed Int`, `description`, `redeemedById?`, `orderId?`, `createdAt`. Bitácora de canjes/otorgos (patrón análogo a `CustomerLedger`).
- El nivel vigente se deriva consultando reglas activas contra el gasto/visitas del mes o los puntos, sin recalcular histórico.

### D5. Autocompletado con server action

`getCustomerSuggestions(term)` (server action, rol cajero/admin) busca `name` o `phone` con `contains` insensible a mayúsculas, tope 8, ordenado por `lastVisitAt` desc. El terminal mantiene el texto en `cart.customerName` y agrega `cart.customerId`; al enviar, `createPosOrder(..., customerId)` recibe el id o hace `upsert` (si el texto parece teléfono y coincide con `phone` existente, vincula ese cliente; si no, crea con nombre en mayúsculas). Se conserva `customerName` denormalizado para que el historial de pedidos no dependa del cliente.

### D6. Zona horaria fija para períodos

Como el resto del sistema, el mes/30 días del negocio se calcula en `America/La_Paz` (UTC-4) aplicando `-4 hours` sobre `paidAt` en SQLite, consistente con `date("createdAt"/1000,'unixepoch','-4 hours')` ya usado en reportes.

### D7. Admin: ranking como pestaña de reportes

Se agrega una vista "Clientes" en `apps/admin` (junto a reportes existentes) con selector de periodo, Top 10, buscador, columnas visitas/gastado/puntos y botón "Canjear" que llama a `redeemCustomerPoints(customerId, points)` (server action que valida saldo y registra `CustomerReward` + ajusta `points` en transacción).

## Risks / Trade-offs

- [`phone` `@unique` opcional puede chocar con datos existentes duplicados] → la migración normaliza (`NULLIF(TRIM(phone),'')`) y, ante duplicados, conserva el más reciente; `phone` deja de ser obligatorio en la UI.
- [Acumulación duplicada si un pedido se cobra dos veces] → `paidAt` solo se registra una vez (transición única de estado), por lo que el hook es idempotente por pedido.
- [Caché desincronizada tras anulación] → aceptado; se documenta como recálculo manual/auditoría desde Admin.
- [Autocompletado en mostrador con clientes homónimos] → se muestra teléfono desenmascarado en la lista para diferenciar; si no hay teléfono, se vincula solo por nombre exacto.

## Migration Plan

1. Esquema Prisma: ampliar `Customer`, crear `CustomerBenefitRule` y `CustomerReward`.
2. Migración SQL manual (`npx prisma migrate deploy`, NO `migrate dev`): `ALTER TABLE Customer` (nuevas columnas, `phone` nullable + unique con normalización), `CREATE TABLE` de las dos tablas nuevas e índices.
3. `prisma generate` matando todos los procesos Node primero (falla con EPERM si quedan workers/dev servers).
4. Seed de `CustomerBenefitRule` con defaults editables.
5. Verificar: crear pedido con cliente nuevo y existente desde el terminal, cobrar y revisar acumulados, canjear puntos, ver ranking por período en Admin.

## Open Questions

- Umbrales exactos de los niveles iniciales (se dejan configurables; el seed trae valores de partida editables).
- Si el canje debe aplicar también descuento en `Order.total` o solo registrar puntos (decisión operativa pendiente; por defecto solo registra).
