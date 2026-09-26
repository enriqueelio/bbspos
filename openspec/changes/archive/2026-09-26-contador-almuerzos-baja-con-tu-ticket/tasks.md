## 1. Número de la tarjeta

- [x] 1.1 Crear `apps/cajero/lib/lunch-stock.ts` con el helper `addableUnits(state)` que devuelve `remaining - heldByMe` (y `null` cuando no hay cantidad controlada)
- [x] 1.2 Usar el helper en `lunchBlock` (`pos-terminal.tsx`) para que "todo-apartado" sea exactamente `addableUnits === 0`, sin cambiar el resto de los estados
- [x] 1.3 Recalcular `badgeTone` y el número de `lunch-stock-badge.tsx` sobre el valor neto, manteniendo la distinción entre "agotada" y "en tu ticket"

## 2. Reacción inmediata

- [x] 2.1 En `tapMenuDayItem`, aplicar con `applyStockOverride` el estado devuelto por `holdLunchUnits` para que el número baje en el acto
- [x] 2.2 Propagar el estado devuelto desde el panel del ticket: nueva prop `onLunchStock` que se llama en `changeQuantity` (subir y bajar) y en `removeLine`
- [x] 2.3 Hacer que `unholdLunchUnits` devuelva el estado recalculado (era `Promise<void>`), para que quitar una línea suba el número sin esperar el refresco
- [x] 2.4 Verificar que `stockOverrides` se siga limpiando cuando cambia el catálogo (`pos-terminal.tsx:298`) y que no tape el dato fresco

## 3. Mensajes del servidor

- [x] 3.1 En `acquireLunchHold`, distinguir el rechazo con `remaining > 0 && myHeld >= remaining` ("ya lo tenés todo apartado en tu ticket") del rechazo por cupo tomado por otra caja
- [x] 3.2 Dejar intacto el mensaje del caso intermedio (`free > 0` pero insuficiente) y el de `planned == null`
- [x] 3.3 En `packages/db/scripts/verify-lunch-holds.ts`, hacer que `rejects` acepte el texto esperado y cubrir los tres motivos, incluido el pedido de 20 unidades

## 4. Verificación

- [x] 4.1 `pnpm --filter @bbspos/db verify:lunch-holds` → 43/43 OK
- [x] 4.2 `pnpm -r typecheck` y `pnpm -r lint` sin errores
- [ ] 4.3 En el POS: agregar unidades de un almuerzo y ver el número bajar de a uno; quitar la línea y verlo subir
- [ ] 4.4 En el POS: llegar al tope del cupo propio y comprobar que la tarjeta se apaga como "en tu ticket" y que el aviso dice que ya las tiene en el ticket, no que otra caja se las llevó
- [ ] 4.5 En el POS: con dos cajas abiertas, comprobar que la otra caja sigue viendo el número completo menos lo apartado por ella
