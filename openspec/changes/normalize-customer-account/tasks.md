# Tasks

## 1. Database Schema & Migration

- [x] 1.1 Escribir script SQL de migración (`scripts/migrate-customer-account.sql`) siguiendo diseño: CREATE TABLE CustomerAccount, INSERT pensionados actuales, UPDATE CustomerLedger, UPDATE Order, ADD CONSTRAINTS. Verificar: script ejecutable contra `dev.db` sin errores.
- [x] 1.2 Actualizar `packages/db/prisma/schema.prisma`: añadir modelo `CustomerAccount`, quitar `isPension`, `pensionType`, `balance`, `creditLimit` de `Customer`, cambiar `CustomerLedger.customerId` → `accountId`, añadir `Order.accountId?`. Verificar: `npx prisma validate` pasa.
- [x] 1.3 Ejecutar migración: `npx prisma migrate deploy && npx prisma generate`. Verificar: cliente Prisma genera sin errores, modelos nuevos accesibles.
- [x] 1.4 Script de verificación post-migración (`scripts/verify-migration.ts`): comprobar que todo pensionado actual tiene `CustomerAccount`, ledger apunta a `accountId`, orders PENSION tienen `accountId`, clientes sin cuenta no tienen datos financieros. Verificar: script reporta 0 inconsistencias.

## 2. Types Package (`packages/types`)

- [x] 2.1 Actualizar `CustomerView`: quitar `balance`, `creditLimit`, `pensionType`; añadir `hasAccount: boolean`, `account?: { pensionType, balance, creditLimit }`. Verificar: `pnpm --filter @bbspos/types typecheck` pasa.
- [x] 2.2 Actualizar `CustomerLedgerView`: cambiar `customerId` → `accountId`. Verificar: typecheck pasa.
- [x] 2.3 Actualizar `FidelizableCliente`: `isPension` → `hasAccount`, `pensionType` → `account?.pensionType`. Verificar: typecheck pasa.
- [x] 2.4 Actualizar helpers `isFidelizable`, `fidelizableCustomerWhere`, `fidelizableOrderWhere` para usar `account` en lugar de `isPension`/`pensionType` directo. Verificar: typecheck pasa, tests unitarios existentes pasan.
- [x] 2.5 Exportar nuevos types `CustomerAccountView`, `CreatePensionadoInput`, `UpdatePensionadoAccountInput` para server actions. Verificar: typecheck pasa.

## 3. Server Actions - Admin (`apps/admin/app/actions/customers.ts`)

- [x] 3.1 Crear `createClient(input: {name, ci?, phone})`: crea solo `Customer`. Verificar: typecheck, acción crea cliente sin cuenta, aparece en `/customers`.
- [x] 3.2 Crear `createPensionado(input: {name, ci?, phone, pensionType, creditLimit?})`: transacción `Customer` + `CustomerAccount`. Verificar: typecheck, crea ambos, aparece en `/pensionados`.
- [x] 3.3 Crear `convertToPensionado(customerId, pensionType, creditLimit?)`: crea `CustomerAccount` para cliente existente. Verificar: typecheck, cliente de mostrador pasa a pensionado, aparece en `/pensionados`.
- [x] 3.4 Crear `removePensionadoStatus(customerId)`: valida `balance=0`, borra `CustomerAccount` (cascade). Verificar: typecheck, error si balance ≠ 0, éxito si balance=0, cliente queda en `/customers`.
- [x] 3.5 Crear `updatePensionadoAccount(accountId, {pensionType, creditLimit})`: actualiza solo cuenta. Verificar: typecheck, cambios persisten, UI refleja.
- [x] 3.6 Actualizar `addCustomerFunds`: validar `customer.account` existe (no `customer.isPension`), usar `account.pensionType` para tipo ledger. Verificar: typecheck, recarga/pago funciona, ledger correcto.
- [x] 3.7 Actualizar `updateCustomer`: quitar lógica de `isPension`/`pensionType`/`creditLimit` (ahora en account actions). Verificar: typecheck, editar identidad funciona, no toca cuenta.

## 4. Admin UI - Pensionados (Nueva Ruta)

- [x] 4.1 Crear `apps/admin/app/(dashboard)/pensionados/page.tsx`: Server Component que filtra `Customer` con `account` e incluye `account.ledger`. Verificar: compila, carga lista de pensionados.
- [x] 4.2 Crear `apps/admin/app/(dashboard)/pensionados/pensionados-client.tsx`: Client Component con tabla (Nombre, Tel, Modalidad, Saldo, Límite, Acciones). Verificar: typecheck, render sin errores.
- [x] 4.3 Componentes: `PensionadoFormDialog` (editar modalidad/límite), reutilizar `FundDialog`, `LedgerDialog` adaptados a `accountId`. Verificar: typecheck, diálogos funcionales.
- [x] 4.4 Añadir ruta `/pensionados` al sidebar de navegación admin. Verificar: navega correctamente.

## 5. Admin UI - Customers (Simplificar)

- [x] 5.1 Modificar `apps/admin/app/(dashboard)/customers/page.tsx`: filtro `where: { account: null }`, select sin campos financieros. Verificar: solo muestra clientes sin cuenta.
- [x] 5.2 Modificar `customers-client.tsx`: tabla sin columnas Saldo/Límite/Modalidad; añadir botón "Convertir en pensionado" que abre `PensionadoFormDialog` (modo conversión). Verificar: typecheck, UI limpia, conversión funciona.
- [x] 5.3 Simplificar `CustomerFormDialog`: solo identidad (nombre, CI, teléfono). Verificar: typecheck, crear/editar cliente funciona.

## 6. POS Cajero - Integración

- [x] 6.1 Actualizar `apps/cajero/components/pos/pos-terminal.tsx`: 
  - `pensionados` query usa `where: { account: { isNot: null } } include: { account: true }`
  - Selector "Cuenta Pensionado" muestra `customer.account.balance`, `customer.account.pensionType`
  - `acceptPensionOrder` valida `customer.account`, chequea límite POSTPAGO, crea `Order` con `accountId`, `paidAt=now()`, actualiza `account.balance`
  Verificar: typecheck, cobro a cuenta funciona, límite respetado.
- [x] 6.2 Revisar `apps/cajero/components/pos/pos-cart-store.ts` y `pos-bubas-builder.tsx` por referencias a `customer.isPension` / `customer.balance` → migrar a `customer.account`. Verificar: typecheck, sin referencias rotas.
- [x] 6.3 Actualizar cierre de caja (`apps/admin/app/actions/cash-close.ts` si existe, o `pos-cart-store`): consultas de recargas/pagos usan `CustomerLedger` filtrado por fecha (ya funciona), consumos a cuenta usan `Order.paymentMethod=PENSION` + `accountId`. Verificar: cierre de caja cuadra.

## 7. Verificación End-to-End

- [x] 7.1 `pnpm -r typecheck` en todo el monorepo. Verificar: 0 errores TypeScript.
- [x] 7.2 `pnpm -r lint` en todo el monorepo. Verificar: 0 errores, solo warnings preexistentes.
- [ ] 7.3 Test manual: crear cliente mostrador → verificar en `/customers` → convertir a pensionado PREPAGO → verificar en `/pensionados` → recargar saldo 100 → verificar saldo → cobrar bebida a cuenta → verificar saldo baja → pagar deuda Postpago → verificar límite → desmarcar pensionado (con saldo 0) → verificar vuelve a `/customers`.
- [ ] 7.4 Test manual: cierre de caja con consumos a cuenta, recargas, pagos de deuda → verificar contrastes correctos.
- [ ] 7.5 Test manual: ranking fidelidad excluye consumos a cuenta Postpago → verificar columnas visitas/gasto/puntos correctas.

## 8. Limpieza y Documentación

- [x] 8.1 Eliminar `apps/cajero/components/pos/pos-bubas-builder.tsx.backup` (archivo residual). Verificar: `git status` limpio.
- [x] 8.2 Actualizar `AGENTS.md` si hay nuevos comandos de migración/verificación. Verificar: documentación al día.