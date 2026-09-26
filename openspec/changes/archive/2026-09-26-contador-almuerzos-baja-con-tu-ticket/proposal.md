## Why

En el POS del cajero el número de la tarjeta de almuerzo no baja nunca cuando el cajero agrega unidades a su propio ticket: `remaining` excluye deliberadamente el apartado de la caja que consulta, así que una tarjeta con 5 disponibles sigue marcando 5 mientras el ticket ya lleva 5 líneas. Para el cajero eso se lee como "el contador no funciona" y como "puedo vender lo que no hay": tiene que apretar hasta que el servidor lo rechaza, y cuando lo hace el mensaje dice *"otra caja se lo llevó"*, cuando en realidad las unidades están en su propio ticket. El bloqueo de sobreventa funciona (verificado con `verify:lunch-holds`), pero la señal que ve el cajero es contraria a la realidad.

## What Changes

- El número de la tarjeta pasa a mostrar lo que la caja Todavía puede agregar: la cantidad disponible menos la que esa caja ya tiene apartada en su ticket. Al agregar una unidad, el número baja en uno; al quitar una línea del ticket, sube en uno.
- La tarjeta se bloquea en cuanto ese número llega a cero, sin depender de que el poll de 15 s le traiga el dato.
- El rechazo del servidor distingue los dos casos: "ya lo tenés todo en tu ticket" cuando el cupo lo cubre el apartado propio, y "otra caja se lo llevó" cuando lo tomó otra caja.
- **BREAKING** (spec): el número de la tarjeta deja de ser invariante para la caja que consulta. Las demás cajas siguen viendo el mismo número que antes (el disponible menos lo apartado por las demás), así que la regla "el primero que agarró gana" no cambia.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pos-terminal`: el contador de unidades de la tarjeta de almuerzo muestra el disponible neto de lo que la caja ya tiene en su ticket, y el estado "todo-apartado" aparece sin esperar el refresco. Se agrega el escenario del rechazo por cupo propio.
- `lunch-menu`: el requisito de cantidad por jornada deja de exigir que el número no se mueva al sumar líneas propias y aclara que cada caja ve el disponible descontando su propio apartado.

## Impact

- `packages/db/src/menu-day.ts`: la fila de stock expone el disponible neto para la caja que consulta (o el POS lo calcula con `heldByMe`, que ya está en el payload).
- `apps/cajero/components/pos/pos-terminal.tsx`: `lunchBlock` y el número de la tarjeta pasan a usar el valor neto; `tapMenuDayItem` aplica el estado devuelto por la acción en vez de dejar el número como estaba.
- `apps/cajero/components/pos/lunch-stock-badge.tsx`: el número y los colores se calculan sobre el valor neto.
- `packages/db/src/lunch-holds.ts`: `acquireLunchHold` diferencia el mensaje de "cupo cubierto por tu propio ticket" del de "otra caja lo tomó".
- Sin cambios de base de datos ni de migraciones: `LunchHold` ya guarda el apartado por caja.
- El POS del cajero y el admin: el admin no muestra cantidades, así que no le afecta.
