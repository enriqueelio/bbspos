# Informe: timer de pedidos demorados

Fecha: 2026-09-11 · Proyecto: bbspos

## Resumen

Hay **dos sistemas independientes** que monitorean cuánto tarda un pedido en
prepararse/entregarse:

| Sistema | Umbral | Qué hace | Dónde se ve | Visible fuera del local |
|---|---|---|---|---|
| **AgeBadge** (cajero) | 30 min | Cambia el texto de antigüedad de gris a rojo | Badge en la tarjeta de la cola del POS | No |
| **Alerta Telegram** (daemon) | 10 min (configurable) | Envía mensaje "PEDIDO ATRASADO" a un chat | App de Telegram | Sí (push) |

Umbrales: `AGE_CRITICAL_MINUTES = 30` (`apps/cajero/components/orders/statusVariants.ts:69`)
y `DELAY_ALERT_MINUTES` default 10 (`packages/db/src/telegram-alert.ts:18-23`).

## 1. Badge visual de antigüedad (cajero)

- Se calcula en el navegador con `Date.now()` y `acceptedAt ?? createdAt` como
  inicio (`apps/cajero/components/queue-view.tsx:206-250`).
- Se actualiza cada **30 s** (reloj local) y la cola se refresca con
  `router.refresh()` cada **15 s** (`queue-view.tsx:126,133`).
- A los **30+ min** el texto pasa de `text-slate-400` a `text-red-500`
  (`ageTextVariants`, `statusVariants.ts:71-79`).
- Pedidos **RECIBIDO** no muestran antigüedad (el reloj arranca al aceptar).
- Pedidos entregados muestran "Tardó X min" fijo (`deliveredAt - inicio`).

## 2. Alerta por Telegram (el "timer" real del negocio)

- Daemon `packages/db/scripts/telegram-alert-worker.ts` corre en Docker cada
  **15 s** (`docker-entrypoint.sh:21`).
- Revisa pedidos con: `delayNotified=false`, `paidAt=null`, `createdAt` mayor al
  umbral, y estado `ACEPTADO` o `ENTREGADO` (entregado sin cobrar = "fuga").
- Usa **reclamo atómico** con `updateMany({ count })` para que solo una
  instancia notifique (`telegram-alert.ts:106-110`).
- Si el envío falla, revierte `delayNotified` para reintentar
  (`telegram-alert.ts:119-128`).
- Mensaje: número de pedido, duración, estado y nombre del cliente.

Variables de entorno: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`DELAY_ALERT_MINUTES` (opcional, default 10).

## 3. Hallazgos / problemas detectados

1. **`delayNotified` nunca se resetea**: tras notificar, el flag queda en `true`
   para siempre; no se limpia al entregar/cobrar.
2. **Discrepancia de reloj**: Telegram mide desde `createdAt`; el badge visual
   desde `acceptedAt ?? createdAt`. Pedidos cobrados desde RECIBIDO con
   `acceptOrder`/`acceptPensionOrder` **no setean `acceptedAt`** (solo lo hace
   `acceptQueueOrder`, `apps/cajero/app/actions/orders.ts:45`).
3. **RECIBIDO sin reloj**: los pedidos de la web que nadie acepta no "tardan"
   nunca para el badge (aunque Telegram sí los mide desde `createdAt`).
4. **Solo visual / bajo alcance**: no hay sonido, vibración, `Notification` ni
   título de pestaña. El badge rojo solo se ve con la tarjeta **expandida**;
   en vista colapsada no hay indicador de demora.
5. **Admin/Mesero/Store**: no muestran ningún estado de demora; el color del
   badge en admin responde al estado del pedido, no a la antigüedad
   (`apps/admin/app/(dashboard)/orders/orders-client.tsx:50-63`).

## 4. Archivos clave

```
apps/cajero/components/orders/statusVariants.ts:69,71-79   AGE_CRITICAL_MINUTES + ageTextVariants
apps/cajero/components/queue-view.tsx:206-250              AgeBadge (cálculo de antigüedad)
apps/cajero/components/queue-view.tsx:126,133              Refresco 30s / 15s
apps/cajero/app/actions/orders.ts:45                       acceptedAt (acceptQueueOrder)
packages/db/src/telegram-alert.ts:18-128                   checkDelayedOrders + rollback
packages/db/scripts/telegram-alert-worker.ts:15            LOOP_MS = 15s
packages/db/prisma/schema.prisma:182                       Order.delayNotified
packages/db/prisma/migrations/20260827223134_add_order_delay_notified
docker-entrypoint.sh:21                                    Lanzamiento del worker
apps/cajero/app/globals.css:86-178                         Glows por estado (no por demora)
```

## 5. Recomendaciones (opcionales)

- Resetear `delayNotified` al cobrar/entregar el pedido para poder alertar
  nuevamente si se revuelve a impago (lo llama la FK de flujo).
- Unificar el origen del reloj (usar `acceptedAt ?? createdAt` también en
  Telegram) para que badge y alerta coincidan.
- Mostrar un indicador de demora en la tarjeta **colapsada** de la cola y en la
  app del mesero.