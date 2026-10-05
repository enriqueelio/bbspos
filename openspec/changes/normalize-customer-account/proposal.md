# Proposal

## Why

El modelo `Customer` actual mezcla tres dominios distintos: identidad (nombre, CI, teléfono), fidelidad (puntos, visitas, gasto) y cuenta corriente (balance, creditLimit, pensionType, isPension). Esto satura la UI `/customers` del Admin mostrando columnas financieras para clientes de mostrador que no las usan, y usa `isPension` como flag booleano suelto en lugar de una relación relacional explícita. La normalización separa la cuenta corriente en su propio modelo `CustomerAccount` (1:1 opcional) y divide la gestión en dos rutas dedicadas: `/customers` (fidelidad) y `/pensionados` (cuentas corrientes).

## What Changes

- **BREAKING**: Schema Prisma: nuevo modelo `CustomerAccount` con `customerId @unique`, campos `pensionType`, `balance`, `creditLimit`, `ledger[]`; `Customer` pierde campos financieros y `isPension`; `CustomerLedger` apunta a `accountId`; `Order` gana `accountId` opcional para consumos a cuenta.
- Migración SQL manual: crea `CustomerAccount` solo para clientes con `isPension=true`, migra `ledger` y `Order.paymentMethod=PENSION` a `accountId`.
- Server Actions: `createClient` (solo identidad), `createPensionado` (identidad + cuenta), `convertToPensionado`, `removePensionadoStatus`, `updatePensionadoAccount`.
- Admin UI: nueva ruta `/pensionados` con tabla dedicada (modalidad, saldo, límite, recargar/pagar, movimientos); `/customers` simplificado (identidad, visitas, gasto, puntos, botón "Convertir en pensionado").
- POS Cajero: consulta `customer.account` en lugar de `customer.isPension` para listar pensionados en cobro a cuenta.
- Types: actualiza `CustomerView`, `CustomerLedgerView`, `FidelizableCliente` para reflejar nueva estructura.

## Capabilities

### New Capabilities
- `customer-account`: Gestión de cuentas corrientes de pensionados (crear, recargar, pagar deuda, consultar movimientos, límites de crédito Postpago). Cubre el dominio financiero separado de la fidelidad.

### Modified Capabilities
- `customer-loyalty`: Requisitos de acumulación de puntos/visitas/gasto y ranking siguen igual, pero la fuente `Customer` ya no tiene campos financieros; la elegibilidad `isFidelizable` se basa en `customer.account?.pensionType` (existencia de cuenta = pensionado).
- `cashier`: El cobro a cuenta (`PENSION`) ahora valida existencia de `CustomerAccount` en lugar de flag `isPension`; el cierre de caja sigue igual (consumos no entran, recargas/pagos sí).
- `ordering`: Pedidos con `paymentMethod=PENSION` ahora referencian `accountId` explícito en `Order`.

## Impact

**Código afectado:**
- `packages/db/prisma/schema.prisma` (modelos)
- `packages/db/prisma/migrations/` (migración SQL manual + `migrate deploy`)
- `packages/types/src/index.ts` (types `CustomerView`, `CustomerLedgerView`, `FidelizableCliente`, helpers)
- `apps/admin/app/actions/customers.ts` (server actions nuevas y modificadas)
- `apps/admin/app/(dashboard)/customers/` (simplificar)
- `apps/admin/app/(dashboard)/pensionados/` (nueva ruta completa)
- `apps/admin/components/` (componentes compartidos)
- `apps/cajero/components/pos/pos-terminal.tsx` (consulta pensionados)
- `apps/cajero/components/pos/pos-cart-store.ts` (si usa customer.isPension)
- Tests y scripts de verificación

**APIs/Contratos:**
- Server Actions de clientes cambian firma (nuevas, algunas deprecadas)
- Prisma Client: nuevo modelo `CustomerAccount`, campos eliminados en `Customer`

**Sistemas:**
- Base de datos: migración de datos existentes (solo pensionados actuales)
- Admin UI: dos vistas separadas en sidebar
- Cierre de caja: sin cambios funcionales, solo consulta a `CustomerAccount`