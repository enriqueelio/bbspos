## 1. Modelo y migración

- [x] 1.1 Ampliar `Customer` en `packages/db/prisma/schema.prisma`: `totalVisits Int @default(0)`, `totalSpent Int @default(0)`, `lastVisitAt DateTime?`, `points Int @default(0)`; `phone` a `String? @unique`
- [x] 1.2 Agregar modelos `CustomerBenefitRule` (name, description, metric, threshold, active) y `CustomerReward` (customerId, ruleId?, type, pointsUsed, description, redeemedById?, orderId?, createdAt) con índices
- [x] 1.3 Escribir migración SQL manual `20260922xxxxxx_customer_loyalty` (ALTER Customer + CREATE TABLE de las reglas/recompensas + índices; normalizar `phone` con `NULLIF(TRIM(phone),'')` antes del unique)
- [x] 1.4 Aplicar con `npx prisma migrate deploy` (NO `migrate dev`)
- [x] 1.5 Matar procesos Node y ejecutar `npx prisma generate` (evitar EPERM)
- [x] 1.6 Seed de `CustomerBenefitRule` con reglas iniciales por defecto (gasto/mes, visitas/mes, puntos)

## 2. Server actions y acumulación

- [x] 2.1 `getCustomerSuggestions(term)` en `apps/cajero/app/actions` (o actions compartidas): `contains` por `name`/`phone`, tope 8, orden por `lastVisitAt` desc
- [x] 2.2 `upsertCustomerForOrder(text, phone?)`: vincula por `phone` exacto si existe, si no crea cliente con nombre en mayúsculas y `phone` opcional
- [x] 2.3 `redeemCustomerPoints(customerId, points)`: valida saldo, descuenta `points`, crea `CustomerReward` tipo CANJE en la misma transacción (rechaza saldo insuficiente con error claro)
- [x] 2.4 Hook de acumulación en la transacción que registra `paidAt` del pedido: `totalVisits +1`, `totalSpent += total`, `lastVisitAt = now`, `points += total` (solo si `customerId` no es null; usar `total` final con descuento ya aplicado)
- [x] 2.5 Helper de nivel vigente: consulta reglas activas vs gasto/visitas del mes (`America/La_Paz`, `date(...,'-4 hours')`) o puntos acumulados

## 3. Terminal POS (autocompletado)

- [x] 3.1 Estado `customerId` en `pos-cart-store.ts` (persistido como el resto del carrito)
- [x] 3.2 Input NOMBRE de `pos-terminal.tsx` con dropdown de coincidencias (`getCustomerSuggestions` con debounce), mostrar nombre + teléfono; al elegir, completar campo y fijar `customerId`
- [x] 3.3 Al enviar (`submit`): si hay `customerId` seleccionado, pasarlo a `createPosOrder`; si es texto libre, llamar `upsertCustomerForOrder` y usar el id resultante
- [x] 3.4 Mantener validación de nombre obligatorio y envío en mayúsculas (sin regresiones)
- [x] 3.5 Alerta visual cuando el cliente vinculado alcanza un nivel de lealtad (mensaje no bloqueante)

## 4. Ranking y canje en Admin

- [x] 4.1 Server action `getCustomerRanking(periodo, search?)`: mes actual / últimos 30 días / histórico sobre `Order.paidAt` con zona `-4 hours`, agregando visitas y gastado por cliente
- [x] 4.2 Vista "Clientes" en `apps/admin` con selector de periodo, Top 10, columnas visitas/gastado/puntos, buscador por nombre/teléfono
- [x] 4.3 Botón "Canjear" que llama `redeemCustomerPoints` y refresca el ranking
- [x] 4.4 Listado/edición de `CustomerBenefitRule` (umbrales configurables) en Admin

## 5. Verificación

- [x] 5.1 `pnpm -r typecheck` y `pnpm -r lint` verdes
- [ ] 5.2 Flujo manual: crear pedido con cliente nuevo y con existente desde el terminal, cobrar y verificar `totalVisits`/`totalSpent`/`points`/`lastVisitAt`
- [ ] 5.3 Verificar ranking por mes/30 días/histórico en Admin con zona horaria correcta y canje con saldo insuficiente rechazado
- [ ] 5.4 Verificar que pensionados (`balance`/`creditLimit`/`CustomerLedger`) siguen funcionando sin regresiones
