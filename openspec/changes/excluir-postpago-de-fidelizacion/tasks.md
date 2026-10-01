# Tasks

## 1. Regla central compartida

- [x] 1.1 `isFidelizable(cliente, metodo?)` en `@bbspos/types`: mira `isPension` primero, luego `pensionType`, y para POSTPAGO exige un método distinto de `PENSION`
- [x] 1.2 Tipo de entrada mínimo `FidelizableCliente` (`isPension` + `pensionType` opcional), client-safe
- [x] 1.3 `fidelizableCustomerWhere()`: filtro de **características** del cliente (no es pensionado, o es pensionado no POSTPAGO)
- [x] 1.4 `fidelizableOrderWhere()`: filtro de **pedidos que puntúan** (cliente no pensionado **o** método distinto de `PENSION`), con tipo de retorno explícito
- [x] 1.5 Documentar que `pensionType` por defecto (`PREPAGO`) no significa que el cliente sea pensionado

## 2. Guard en la acumulación

- [x] 2.1 `accumulateCustomerLoyalty` recibe el método de pago y relee al cliente dentro de `tx`
- [x] 2.2 No-op silencioso si el cliente no existe o el movimiento no fideliza
- [x] 2.3 `acceptOrder` pasa el método elegido por el usuario
- [x] 2.4 `acceptPensionOrder` pasa `PaymentMethod.PENSION` y comenta por qué no puntúa
- [x] 2.5 Ningún call site duplica el criterio; ambos apuntan al guard

## 3. Nivel y canje

- [x] 3.1 `levelNameOf` incluye `fidelizableOrderWhere()` en el aggregate del mes
- [x] 3.2 Se elimina el retorno temprano por elegibilidad de cliente (ya no aplica: la elegibilidad es por movimiento)
- [x] 3.3 `redeemCustomerPoints` valida solo el saldo de puntos: sin rechazo por tipo de cuenta

## 4. Ranking

- [x] 4.1 `getCustomerRanking` usa `fidelizableOrderWhere()` en el `groupBy`, antes del `take: 10`
- [x] 4.2 `status: { not: "ANULADO" }` en el filtro del ranking
- [x] 4.3 El buscador deja de filtrar por tipo de cuenta, para que un POSTPAGO con compras en efectivo se encuentre
- [x] 4.4 Verificar que un POSTPAGO solo con consumo a cuenta no aparece en el ranking

## 5. Cuenta corriente

- [x] 5.1 `addCustomerFunds` decide `RECARGA` vs `PAGO_DEUDA` por `isPension` antes que `pensionType`
- [x] 5.2 Confirmar que ni la recarga ni el pago de deuda generan puntos, visitas ni gasto

## 6. Limpieza de datos

- [x] 6.1 `fix-postpago-loyalty.ts`: recalcular los cuatro campos de lealtad de cada cliente desde sus pedidos que generaron lealtad (replicando la regla, dry-run por defecto, `--apply` para escribir)
- [x] 6.2 Dry-run sobre `dev.db`: revisar la lista antes de escribir
- [x] 6.3 Aplicar con autorización del usuario y verificar idempotencia (segunda corrida sin cambios)

## 7. Verificación

- [x] 7.1 Tests de `@bbspos/types` con `vitest` (script `test` + dependencia local)
- [x] 7.2 Matriz cubierta: POSTPAGO a cuenta, POSTPAGO en efectivo/QR, PREPAGO en ambos métodos, mostrador, mostrador con `pensionType = PREPAGO`, `customerId` huérfano, `fidelizableOrderWhere`
- [x] 7.3 `corepack pnpm -r typecheck`
- [x] 7.4 `corepack pnpm -r lint`
- [x] 7.5 Verificación runtime contra `dev.db` con clientes temporales: guard, ranking (excluye consumo a cuenta, incluye compra en efectivo, excluye anulados), buscador y limpieza de los datos de prueba
- [x] 7.6 Actualizar `proposal.md`, delta spec y `design.md` a la regla por movimiento
- [x] 7.7 Actualizar `INFORME-CLIENTES-PENSIONADOS.txt` y `PROPUESTA-CONSOLIDADA-PENSIONADOS.txt`
- [x] 7.8 `openspec.cmd validate` limpio

## 8. Fuera de alcance (fases posteriores)

- [ ] 8.1 Definir el tratamiento de lealtad en pagos divididos (`PENSION` + efectivo/QR)
- [ ] 8.2 Semántica del canje (qué se puede canjear, caducidad, valor por punto)
- [ ] 8.3 Saldo positivo en POSTPAGO (prepago desde una cuenta postpago)
- [ ] 8.4 Política de mora y vencimiento de la deuda del pensionado
- [ ] 8.5 Transición PREPAGO → POSTPAGO y qué pasa con los puntos acumulados
- [ ] 8.6 Hacer `pensionType` nullable (o quitarle el default `PREPAGO`) para eliminar la trampa
