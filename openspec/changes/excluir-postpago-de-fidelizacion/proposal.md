# Proposal

## Why

La lealtad se acumula hoy a partir del simple hecho de que el pedido tenga `customerId`, sin considerar **ni el tipo de cuenta ni cómo paga el cliente**. Eso hace que el consumo a cuenta de un pensionado **POSTPAGO** (pago diferido) sume visitas, gasto y puntos igual que una compra de mostrador. El pago diferido ya *es* su beneficio, así que la lealtad duplica la recompensa: infla el ranking, distorsiona los niveles y acumula puntos que el cliente no puede aprovechar.

El defecto es triple:

1. **No existe una regla única de elegibilidad**: cada call site decide por su cuenta, y el guard del cobro a cuenta solo cubre una de las dos rutas de acumulación.
2. **Se confunde "no es pensionado" con "es pensionado PREPAGO"**. El esquema asigna `pensionType = "PREPAGO"` por defecto, así que los clientes de mostrador también lo tienen almacenado. Cualquier regla que mire `pensionType` sin mirar antes `isPension` va a tratar a un cliente normal como pensionado prepago.
3. **No se distingue gastar de mover la cuenta corriente**. Recargar saldo (PREPAGO) y pagar deuda (POSTPAGO) son movimientos de plata, pero no son compras: no pasaron por caja como venta y no deben dar puntos.

## What Changes

- **Regla central única por movimiento**: introduce un predicado compartido `isFidelizable(cliente, metodo)` en `@bbspos/types` que decide si **ese** cobro genera lealtad, mirando `isPension` primero y `pensionType`/`paymentMethod` solo si corresponde. La regla resultante:
  - Cliente no pensionado (`isPension = false`): fideliza con cualquier método, sea cual sea su `pensionType` almacenado.
  - Pensionado PREPAGO: fideliza con cualquier método, incluido el consumo de su saldo adelantado.
  - Pensionado POSTPAGO: **no** fideliza al consumir a cuenta (`paymentMethod = "PENSION"`), pero **sí** al comprar y pagar en efectivo, QR o tarjeta.
- **Los puntos se ganan al comprar, nunca al mover la cuenta**: `addCustomerFunds` (recarga de PREPAGO y pago de deuda de POSTPAGO) queda explícitamente fuera del programa de lealtad, con o sin plata real de por medio. No se toca el saldo de la cuenta corriente ni se registra `CustomerReward`.
- **Guard dentro de `accumulateCustomerLoyalty`**: la función vuelve a leer al cliente y hace no-op si ese movimiento no genera lealtad, en lugar de confiar en que el llamador ya filtró. Recibe el método de pago para poder evaluar la regla completa, y se pasa desde las dos rutas de cobro (`acceptOrder` y `acceptPensionOrder`) para que ninguna la omita.
- **Filtro a nivel de pedido, no de cliente**: se agrega `fidelizableOrderWhere()` para el ranking y el nivel, que incluye un pedido si su cliente no es pensionado **o** si el pedido no se cobró a cuenta. Filtra "cuál pedido puntúa" en vez de "qué cliente existe", que es lo que hace falta: el POSTPAGO tiene que seguir apareciendo cuando compró de verdad, y desaparecer cuando solo consumió a cuenta.
- **El buscador del ranking ya no excluye al POSTPAGO**: antes se filtraban los clientes antes de agrupar, lo que escondía a un POSTPAGO que sí tenía compras en efectivo. Ahora el buscador devuelve a cualquiera y es el `groupBy` sobre pedidos fidelizables el que decide si tiene filas.
- **`levelNameOf` cuenta solo pedidos fidelizables**: el consumo a cuenta ya no le sube de nivel a nadie, porque tampoco le sumó puntos. El `aggregate` incluye el mismo filtro del ranking.
- **Canje desbloqueado**: `redeemCustomerPoints` deja de rechazar al POSTPAGO y valida únicamente el saldo de puntos. Tiene puntos válidos, así que restringirle el canje sería arbitrario.
- **`addCustomerFunds` decide el tipo de movimiento por `isPension`**: hoy mira solo `pensionType`, que por defecto es `PREPAGO` para todos, así que un cliente de mostrador sin deuda terminaba con un `RECARGA` de saldo.
- **Script de recalculo genérico**: `fix-postpago-loyalty.ts` pasa de "POSTPAGO a cero" a "recalcular cada cliente desde los pedidos que generaron lealtad", replicando la regla en SQL crudo para no depender de `@bbspos/types`.
- **Sin cambios de esquema**: no hay migraciones. `Customer.points`/`totalVisits`/`totalSpent` siguen siendo caché; la elegibilidad se deriva de `isPension` + `pensionType` + `paymentMethod`.
- **Fuera de alcance (fases posteriores)**: pagos divididos entre `PENSION` y efectivo/QR, semántica del canje, saldo positivo en POSTPAGO, política de mora/vencimiento, transición PREPAGO→POSTPAGO y cambios de UI. Se documentan como pendientes para no mezclarlos con el arreglo de la regla.

## Capabilities

### New Capabilities
- (ninguna)

### Modified Capabilities
- `customer-loyalty`: se agrega el requisito transversal de elegibilidad por tipo de cuenta y método de pago (incluida la exclusión de recargas y pagos de deuda), y la acumulación, los niveles, el canje y el ranking se rigen por esa regla en lugar de por el tipo de cuenta del cliente.

## Impact

- **`packages/types`**: predicados `isFidelizable(cliente, metodo?)`, `fidelizableCustomerWhere()` (características del cliente) y `fidelizableOrderWhere()` (pedidos que puntúan), más el tipo de entrada mínima que necesitan.
- **`apps/cajero/app/actions/customers.ts`**: `accumulateCustomerLoyalty` recibe el método de pago y aplica el guard; `levelNameOf` agrega `fidelizableOrderWhere()` al aggregate.
- **`apps/cajero/app/actions/orders.ts`**: `acceptOrder` y `acceptPensionOrder` pasan el método de pago a la acumulación; el criterio ya no se duplica en el call site.
- **`apps/admin/app/actions/loyalty.ts`**: el ranking usa `fidelizableOrderWhere()` y el buscador deja de filtrar por tipo de cuenta; `redeemCustomerPoints` valida solo el saldo.
- **`apps/admin/app/actions/customers.ts`**: `addCustomerFunds` decide `RECARGA` vs `PAGO_DEUDA` mirando `isPension` antes que `pensionType`.
- **`packages/db/scripts/fix-postpago-loyalty.ts`**: recalcula los cuatro campos de lealtad de cada cliente desde sus pedidos fidelizables, en vez de poner a cero a los POSTPAGO.
- **UI**: sin cambios de componentes; el ranking muestra al POSTPAGO cuando compró en efectivo y lo oculta cuando solo consumió a cuenta.
- **Datos existentes**: el script de limpieza se ejecuta en dry-run por defecto y ya se aplicó sobre `dev.db` con autorización del usuario. Los acumulados previos de POSTPAGO no se tocan solos: requieren esa ejecución explícita.
- **Tests**: matriz de acumulación, nivel, ranking y canje para POSTPAGO (a cuenta y en efectivo), PREPAGO y mostrador, más el caso del cliente no pensionado con `pensionType = "PREPAGO"` y el `customerId` huérfano.
