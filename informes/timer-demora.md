# Informe: timer de pedidos demorados

Fecha: 2026-09-11 · Proyecto: bbspos
Última actualización: refactor "tiempo por producto" (2026-09-11)

## Resumen

Hay **un solo reloj** (fuente única de verdad) y **dos alertas** que lo usan,
visual (POS cajero) y push (Telegram):

| Sistema | Cuándo salta | Qué hace | Dónde se ve |
|---|---|---|---|
| **Badge visual** (cajero) | Demora ≥ 1 min | Color del texto según gravedad (verde/amarillo/rojo pulsante) + puntito rojo en vista colapsada | Cola del POS |
| **Alerta Telegram** (daemon) | Demora ≥ 1 min | Mensaje "PEDIDO ATRASADO" con transcurrido y estimado | Chat de Telegram |

**Reloj unificado:** `startTime = acceptedAt ?? createdAt`
(`apps/cajero/lib/time.ts`, `getStartTime`).

**Demora:** `demora = tiempoTranscurrido - tiempoEstimado`.
El `tiempoEstimado` de un pedido = `max(tiempoProduccion)` de sus productos
(`data/productos-tiempo.json`). Nivel visual: `ok` ≤ 0, `warning` < 5,
`critical` ≥ 5 (`orderDelayVariants`).

## 1. Reloj unificado

- `getStartTime(order)` = `acceptedAt ?? createdAt` (`apps/cajero/lib/time.ts`).
- `acceptQueueOrder` ya seteaba `acceptedAt`; ahora también lo hacen
  `acceptOrder` y `acceptPensionOrder` (`apps/cajero/app/actions/orders.ts`),
  de modo que cualquier pedido que pase a producción arranca el reloj.
- `deliverOrder` marca `deliveredAt` (tiempo fijo para entregados).

## 2. Tiempo estimado por producto

- `data/productos-tiempo.json`: minutos por producto (menú a la carta, bebidas
  de té bajo la clave "Bubble Tea", extras). Regenerable con
  `packages/db/scripts-gen/generate-productos-tiempo.ts`.
- Al crear un pedido (cajero, mesero y store) cada `OrderItem` guarda su
  `tiempoProduccion` y el pedido su `tiempoEstimado = max(items)`.
- Schema: `Order.tiempoEstimado Int @default(10)`,
  `OrderItem.tiempoProduccion Int @default(5)`
  (migración `20260911120000_add_product_timer`).

## 3. Badge visual (cajero)

- `AgeBadge` (`apps/cajero/components/queue-view.tsx`) usa el reloj unificado y
  pinta el texto con `orderDelayVariants` según la demora
  (`apps/cajero/components/orders/statusVariants.ts`).
- En la vista colapsada, junto al #pedido aparece un punto rojo pulsante
  cuando `demora > 0`.
- El reloj de UI se actualiza cada 30 s y la cola se refresca cada 15 s.

## 4. Alerta por Telegram

- Daemon `packages/db/scripts/telegram-alert-worker.ts` revisa cada 15 s:
  1. Resetea `delayNotified=false` para pedidos ya cobrados (`paidAt != null`).
  2. Consulta pedidos activos no notificados (`COALESCE(acceptedAt, createdAt)`,
     SQL raw en `telegram-alert.ts`).
  3. Si `demora > 0` reclamación atómica + envío; si falla, libera el flag.

Variables de entorno: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (requeridos).
Se eliminó el umbral fijo `DELAY_ALERT_MINUTES`.

## 5. Archivos clave

```
apps/cajero/lib/time.ts                                  getStartTime, delayMinutes, delayLevelOf
apps/cajero/app/actions/orders.ts                        acceptedAt en acceptOrder/acceptPensionOrder
apps/cajero/actions/pos.ts                               createPosOrder -> tiempoProduccion/tiempoEstimado
apps/mesero/actions/pos.ts                               idem
apps/store/app/actions/order.ts                          idem (solo Bubble Tea)
apps/cajero/components/orders/statusVariants.ts         orderDelayVariants (sin AGE_CRITICAL_MINUTES)
apps/cajero/components/queue-view.tsx                    AgeBadge + puntito en vista colapsada
packages/db/src/telegram-alert.ts                        COALESCE + demora + reset delayNotified
packages/db/scripts/telegram-alert-worker.ts             bucle 15s
data/productos-tiempo.json                               minutos por producto
packages/db/prisma/schema.prisma                         Order.tiempoEstimado, OrderItem.tiempoProduccion
packages/db/prisma/migrations/20260911120000_add_product_timer
```