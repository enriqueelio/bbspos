# Design

## Context

Ver `proposal.md` - Why. Estado actual: modelo `Customer` único con 18 campos mezclando identidad, fidelidad y cuenta corriente. UI `/customers` muestra todo junto. Cajero filtra por `customer.isPension` booleano.

## Goals / Non-Goals

**Goals:**
- Separar cuenta corriente en modelo `CustomerAccount` (1:1 opcional con `Customer`)
- Eliminar `isPension` y campos financieros de `Customer`
- Dos rutas Admin dedicadas: `/customers` (fidelidad) y `/pensionados` (cuentas corrientes)
- Migración de datos sin pérdida: solo pensionados actuales (`isPension=true`) obtienen `CustomerAccount`
- Cajero consulta `customer.account` en lugar de `customer.isPension`
- Cierre de caja y reportes funcionan igual (fuente: `CustomerLedger` + `CustomerAccount`)

**Non-Goals:**
- Cambiar reglas de fidelidad (puntos, visitas, ranking) - solo cambia la fuente de `isPension`
- Cambiar flujo de pedidos, estados, comanda, mesero
- Cambiar impresión, QR, pagos divididos, descuentos, almuerzos
- Touch POS store, mesero, store apps

## Decisions

### 1. Modelo relacional: `CustomerAccount` 1:1 opcional

**Decisión:** Nuevo modelo `CustomerAccount` con `customerId @unique`, FK `onDelete: Cascade`. `Customer` pierde `isPension`, `pensionType`, `balance`, `creditLimit`. `CustomerLedger` cambia `customerId` → `accountId`. `Order` gana `accountId?` para pagos PENSION.

**Rationale:**
- Existencia de `CustomerAccount` = es pensionado (semánticamente correcto, no flag booleano)
- `pensionType` y `creditLimit` solo tienen sentido si hay cuenta
- `onDelete: Cascade` evita cuentas huérfanas al borrar cliente
- `creditLimit = 0` = sin límite (convención actual mantenida)

**Alternativas consideradas:**
- Tabla `PensionData` separada sin FK: rechazado (integridad referencial)
- Mantener `isPension` en Customer + mover campos a tabla: rechazado (duplicidad semántica)
- Herencia Prisma (multi-table): rechazado (SQLite no lo soporta bien, complejidad innecesaria)

### 2. Migración SQL manual (no `migrate dev`)

**Decisión:** Escribir SQL a mano, aplicar con `npx prisma migrate deploy`. Prisma `migrate dev` es interactivo y falla en este entorno.

**Pasos:**
1. `CREATE TABLE CustomerAccount` con columnas + FK a Customer
2. `INSERT INTO CustomerAccount` SELECT de `Customer WHERE isPension=1`
3. `UPDATE CustomerLedger SET accountId = (SELECT id FROM CustomerAccount WHERE customerId = CustomerLedger.customerId) WHERE customerId IN (SELECT customerId FROM CustomerAccount)`
4. `UPDATE Order SET accountId = (SELECT id FROM CustomerAccount WHERE customerId = Order.customerId) WHERE paymentMethod = 'PENSION' AND customerId IN (SELECT customerId FROM CustomerAccount)`
5. `ALTER TABLE CustomerLedger ADD CONSTRAINT ... FOREIGN KEY (accountId) REFERENCES CustomerAccount(id)`
6. `ALTER TABLE Order ADD CONSTRAINT ... FOREIGN KEY (accountId) REFERENCES CustomerAccount(id)`
7. Actualizar `schema.prisma` (quitar campos, añadir modelos/relaciones)
8. `npx prisma migrate deploy && npx prisma generate`

**Rationale:** Control total sobre migración de datos existentes, evita problemas de `migrate dev` en entorno sin TTY.

### 3. Server Actions: separar creación de cliente vs pensionado

**Decisión:** 
- `createClient(input)`: crea solo `Customer` (identidad)
- `createPensionado(input)`: crea `Customer` + `CustomerAccount` en transacción
- `convertToPensionado(customerId, pensionType, creditLimit?)`: crea `CustomerAccount` para cliente existente
- `removePensionadoStatus(customerId)`: valida `balance=0`, borra `CustomerAccount` (cascade → ledger)
- `updatePensionadoAccount(accountId, {pensionType, creditLimit})`: actualiza solo cuenta

**Rationale:** API explícita por caso de uso, evita lógica condicional compleja en una sola acción. Transacción atómica en `createPensionado`.

### 4. Admin UI: dos rutas independientes

**Decisión:** 
- `/customers`: `page.tsx` filtra `Customer` SIN `account` (`where: { account: null }`). Tabla: Nombre, CI, Tel, Visitas, Gasto, Puntos, Última visita. Acciones: Editar, Ver Lealtad, **Convertir en pensionado**.
- `/pensionados`: `page.tsx` filtra `Customer` CON `account` (`where: { account: { isNot: null } }`, `include: { account: { include: { ledger: true } } }`). Tabla: Nombre, Tel, Modalidad, Saldo, Límite. Acciones: Editar, Recargar/Pagar, Movimientos.

**Componentes compartidos:** `ClientFormDialog` (identidad), `PensionadoFormDialog` (identidad + modalidad + límite), `FundDialog`, `LedgerDialog`, `LoyaltyDialog`.

**Rationale:** Separación total de preocupaciones. `/customers` es ligero (solo identidad + métricas caché). `/pensionados` carga ledger solo cuando se abre el diálogo.

### 5. POS Cajero: consulta `customer.account`

**Decisión:** En `pos-terminal.tsx`, al construir lista de pensionados para selector "Cuenta Pensionado":
```ts
const pensionados = await prisma.customer.findMany({
  where: { account: { isNot: null } },
  include: { account: true },
  orderBy: { name: 'asc' }
});
```
En `acceptPensionOrder`: validar `customer.account` existe, chequear límite si POSTPAGO, crear `Order` con `accountId` y `paidAt=now()`, actualizar `account.balance`.

**Rationale:** Elimina ambigüedad del flag `isPension`. Fuente única de verdad: existencia de `CustomerAccount`.

### 6. Types (`packages/types/src/index.ts`)

**Decisión:** 
- `CustomerView`: quitar `balance`, `creditLimit`, `pensionType`; añadir `hasAccount: boolean`, `account?: { pensionType, balance, creditLimit }`
- `CustomerLedgerView`: cambiar `customerId` → `accountId`
- `FidelizableCliente`: `isPension` → `hasAccount`, `pensionType` → `account?.pensionType`
- Helpers `isFidelizable`, `fidelizableCustomerWhere`, `fidelizableOrderWhere` actualizados para usar `account`

**Rationale:** Types reflejan nueva estructura. `hasAccount` reemplaza `isPension` semánticamente.

### 7. Cierre de caja: sin cambios funcionales

**Decisión:** Consulta `CustomerLedger` filtrado por fecha (ya tiene `createdAt`) para recargas/pagos. Consumos a cuenta = `Order` con `paymentMethod=PENSION` y `accountId` en la fecha. No hay migración de lógica.

**Rationale:** La lógica de negocio del cierre ya separa consumos (no entran) vs recargas/pagos (sí entran). Solo cambia el join interno.

## Risks / Trade-offs

| Riesgo | Mitigación |
|--------|------------|
| Migración SQL falla a mitad | Transacciones implícitas por statement; script de verificación post-migración; backup de `dev.db` antes |
| `CustomerLedger` huérfanos si `accountId` null | `UPDATE` con subquery garantiza match 1:1; `WHERE customerId IN (SELECT customerId FROM CustomerAccount)` filtra solo pensionados |
| `Order` existentes con `paymentMethod=PENSION` sin `accountId` | `UPDATE Order SET accountId = ... WHERE paymentMethod='PENSION' AND customerId IN (...)` cubre histórico |
| Cajero rompe al no encontrar `customer.isPension` | Actualizar `pos-terminal.tsx` y `pos-cart-store.ts` en mismo PR; typecheck fallará si queda referencia |
| Admin UI `/customers` lento si muchos clientes | `where: { account: null }` usa índice; paginación futura si >1000 |
| `creditLimit = 0` semántica "sin límite" vs "límite cero" | Convención actual mantenida; documentar en código y UI ("Sin límite" si 0) |
| TypeScript errors en `packages/types` tras cambios | Ejecutar `pnpm -r typecheck` tras cada paso; corregir imports rotos |

## Migration Plan

### Pre-deploy (local)
1. Backup `packages/db/prisma/dev.db`
2. Ejecutar script SQL de migración (ver Decisión 2)
3. Actualizar `schema.prisma`
4. `npx prisma migrate deploy && npx prisma generate`
5. `pnpm -r typecheck` → corregir errores
6. `pnpm -r lint` → corregir warnings

### Código (orden sugerido)
1. `packages/db/prisma/schema.prisma` + migración
2. `packages/types/src/index.ts` (types nuevos)
3. `apps/admin/app/actions/customers.ts` (server actions)
4. `apps/admin/app/(dashboard)/pensionados/` (nueva ruta completa)
5. `apps/admin/app/(dashboard)/customers/` (simplificar)
6. `apps/cajero/components/pos/pos-terminal.tsx` (consulta pensionados)
7. `apps/cajero/components/pos/pos-cart-store.ts` (si usa isPension)
8. Tests manuales: crear cliente, convertir, recargar, pagar deuda, cobrar a cuenta, cierre de caja

### Rollback
- Restaurar `dev.db` desde backup
- Revertir `schema.prisma` y `npx prisma migrate deploy`
- Revertir código (git)

## Open Questions

1. ¿Índice compuesto en `CustomerAccount(customerId, pensionType)` útil para consultas frecuentes? → Decidir tras medir.
2. ¿Paginación en `/pensionados` y `/customers` desde ya o cuando supere 500 filas? → Dejar para después (YAGNI).
3. ¿Soft-delete de `CustomerAccount` (campo `deletedAt`) en lugar de borrado duro al desmarcar pensionado? → Por ahora borrado duro con validación `balance=0`; si hay auditoría futura, añadir `deletedAt`.