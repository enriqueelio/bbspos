# Proposal

## Why

La cocina prepara cantidades limitadas cada día (hoy, por ejemplo, 40 Queperi y 25 Arroz chaufa) pero el POS no las conoce: el cajero vende hasta que se acaba la mercadería y la cocina se queda corta, o el cajero promete lo que no habrá. Además el admin activa el almuerzo del día sin que exista una cifra de unidades disponibles, y cuando el cálculo de la cocina falla no hay forma de corregirlo: nadie lleva la cuenta y el número queda desactualizado al primer pedido.

## What Changes

- **Cantidad controlada por jornada** para los platos del Menú del Día: el **cajero** define en el POS cuántos se harán ("programado"), lo ajusta manualmente cuando hizo mal la cuenta y el sistema descuenta solo lo vendido.
- El "vendido" **se deriva de los pedidos** (`OrderItem` de pedidos no anulados de la jornada), por lo que el restante siempre refleja la realidad y **vuelve a subir solo cuando se anula un pedido**.
- **Apartado de cupo: el que primero agarró el plato, gana.** Mientras un almuerzo está en el ticket en curso de una caja, esa caja deja una reserva viva (20 min, renovada sola) y las demás ven el número ya descontado. Si dos cajas chocan, el servidor rechaza el que llegó tarde y su línea no entra al ticket; al confirmar el pedido la reserva se convierte en venta y al quitarla del ticket se libera.
- La tarjeta de cada almuerzo en la grilla del POS del cajero muestra el restante en la **esquina superior derecha**, con el **mismo lenguaje visual que los badges de atajo**: `—` si todavía no tiene cantidad, el número **neutro** mientras hay unidades y **rojo cuando llega a las cinco unidades**. Cuando lo que queda ya está en el ticket de esa caja se marca "En tu ticket": no se agotó, el cajero ya lo tiene todo.
- **Un almuerzo no se vende hasta que se le asigna una cantidad.** Recién activado por el admin aparece con guion y bloqueado; igual que cuando ya no queda ninguna unidad, la tarjeta queda en gris, marcada como "sin cantidad" o "agotado" según el caso, y **sin agregar el plato al ticket**.
- **Clic en el número → popover** con una sola operación: **sumar o restar** unidades, con pasos rápidos (`−10 −5 −1 | +1 +5 +10`) o escribiendo la cantidad. La primera suma es la que deja al plato con cantidad. **Cada corrección queda registrada** con usuario, fecha y hora. Sumar unidades sobre una tarjeta agotada la **rehabilita de inmediato**, sin esperar el refresco.
- El **admin solo activa** el almuerzo del día: la activación **no pide monto ni cantidad**. El precio se define al crear el plato y no lo modifica el cajero.
- El admin ve el estado del día en **solo lectura** en la tabla de Almuerzos: Programado · Vendido · Apartado · Disponible, más un **histórico por jornada** para comparar qué se cocinó contra qué se vendió y cuánto hay tomado en los tickets en curso.
- Fuera de alcance en esta iteración: la terminal del mesero (no muestra el contador ni permite ajustar), la tienda pública (no vende almuerzos) y la actualización en tiempo real por canal de eventos (los cambios llegan a las demás cajas con el refresco de 15 s ya existente). Tampoco el cupo de almuerzos en jornadas futuras: el admin solo programa el Menú del Día vigente, así que una reserva pactada para otro día no aparta unidades y se valida contra esa fecha al guardar.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `lunch-menu`: la entrega de los platos del Menú del Día a las terminales incluye el restante de la jornada, el total apartado y el apartado propio de la caja; la activación diaria no requiere monto ni cantidad; la cantidad se programa y ajusta desde el POS del cajero y arrastra al cambio de jornada; el cupo se aparta por caja mientras el plato está en el ticket.
- `pos-terminal`: la tarjeta de almuerzo en la grilla del día muestra el contador de restante con sus estados visuales y un popover interactivo para programarlo o ajustarlo; apartar al agregar al ticket es parte del clic en la tarjeta.
- `ordering`: todo pedido que contenga un plato del Menú del Día consume una unidad de la jornada (y la anulación terminal la devuelve), y el pedido se rechaza si al guardarlo el cupo ya no alcanza.

## Impact

- `packages/db`: migración SQL escrita a mano (convención del repo) para los modelos de cantidad por jornada, sus índices por plato y fecha, y la tabla de apartados con su unicidad por (plato, jornada, caja); `prisma generate`.
- `packages/db/src/menu-day.ts`: consulta agregada de unidades restantes y apartadas por jornada para los almuerzos del día.
- `packages/db/src/lunch-holds.ts`: ciclo de vida del apartado (tomar, soltar, renovar, reconciliar, consumir al cobrar y la barrera final de capacidad).
- `packages/types`: el catálogo (`MenuItemView`/`Catalog`) transporta el estado de cantidad de cada almuerzo del día.
- `apps/cajero`: `getPosCatalog` entrega el estado de cantidad ya descontando los apartados ajenos; la grilla de almuerzos pinta el badge y el popover; nuevas server actions para programar, ajustar, apartar, soltar y reconciliar.
- `apps/admin`: columnas de solo lectura en la tabla de Almuerzos, incluido el apartado.
- Sin impacto en la tienda (no ofrece almuerzos) ni en el POS del mesero en esta iteración.
- Sin dependencias nuevas; el POS ya refresca el catálogo por polling, por lo que el número llega solo a los ~15 s. Ese mismo refresco es lo que renueva el apartado de la caja.
