# Proposal: add-customer-loyalty

## Why

Hoy el POS no identifica al cliente: el campo NOMBRE del terminal es texto libre que solo se guarda denormalizado en `Order.customerName`. No existe forma de saber quién compra más, cuántas veces ha comprado ni premiar la recurrencia, y la base de clientes solo sirve para pensionados (prepago/postpago con saldo). Dos propuestas (`indicaciones/cG.txt` y `indicaciones/cM.txt`) proponen un CRM; este cambio toma la arquitectura ligera de cG (que ya se alinea con `Customer`, `Order.customerId` y `CustomerLedger` existentes) y le incorpora el sistema de puntos, niveles y ranking por período de cM.

## What Changes

- **Modelo de lealtad**: extender `Customer` con `totalVisits`, `totalSpent`, `lastVisitAt` y `points` (acumulados); `phone` pasa a opcional `@unique` (hoy es obligatorio y no único). Nuevas tablas `CustomerBenefitRule` (reglas de niveles configurables) y `CustomerReward` (otorgos/canjes con bitácora). `balance`/`creditLimit`/`pensionType` quedan solo para pensionados.
- **Identificación en el POS**: el campo NOMBRE del terminal se convierte en autocompletado en tiempo real por nombre o teléfono; seleccionar un cliente existente vincula `Order.customerId`; un nombre nuevo hace alta automática (`upsert`) al enviar a caja, conservando `customerName` denormalizado para historial.
- **Métricas automáticas al cobrar**: al registrar `paidAt`, incrementar `totalVisits` (+1), sumar `total` a `totalSpent`, actualizar `lastVisitAt` y sumar `points` (1 Bs = 1 punto) en la misma transacción Prisma.
- **Niveles y beneficios**: reglas por umbral de Bs al mes, visitas al mes o puntos (ej. nivel por gasto mensual); alerta en el terminal cuando el cliente alcanza un nivel.
- **Canje de puntos**: acción de canje en Admin/caja que descuenta `points` y registra `CustomerReward` con referencia opcional al pedido; saldo insuficiente bloquea el canje.
- **Ranking en Admin**: pestaña/sección con Top 10 de clientes por período (mes actual / últimos 30 días / histórico) con columnas de visitas, gastado y puntos, y botón de canje.

## Capabilities

### New Capabilities

- `customer-loyalty`: identificación de clientes, acumulación de métricas y puntos al cobrar, reglas de niveles, canje y ranking de clientes frecuentes.

### Modified Capabilities

- `pos-terminal`: el campo NOMBRE pasa a autocompletado con vínculo a `customerId` y alta automática de cliente nuevo al enviar.

## Impact

- **packages/db**: esquema Prisma (`Customer` ampliado, `CustomerBenefitRule`, `CustomerReward`) + migración SQL manual con `prisma migrate deploy` (NO `migrate dev`: interactivo y falla en este entorno).
- **packages/types**: tipos de reglas de beneficio, sugerencias de cliente y payload de ranking.
- **apps/cajero**: `pos-terminal` (autocompletado), server action de creación/cobro de pedido (acumulación de métricas), alerta de nivel.
- **apps/admin**: nueva sección/pestaña de Ranking de clientes.
