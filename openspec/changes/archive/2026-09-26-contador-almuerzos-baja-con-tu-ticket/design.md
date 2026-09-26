## Context

`lunchStockRows` (`packages/db/src/menu-day.ts`) calcula `remaining` como `programada + ajustes − vendidas − apartado de las OTRAS cajas`, y en la misma fila expone `heldByMe`, el apartado vigente de la caja que consulta. Esa asimetría es deliberada: `acquireLunchHold` y `assertLunchCapacity` la necesitan para_NO descontarse a sí mismos y comparar contra el cupo real.

La capa de presentación hereda el mismo número. `badgeTone` y `lunchBlock` ya calculan `remaining - heldByMe` para detectar el estado "todo-apartado", pero el número que se muestra es `remaining`. O sea: el dato para el número correcto ya viaja al cliente y se desperdicia.

El mesero no muestra contadores (`lunchStock: null` en `apps/mesero/actions/pos.ts:102`) y solo valida cupo al guardar, así que el cambio es exclusivo del POS del cajero.

## Goals / Non-Goals

**Goals:**

- Que el número de la tarjeta sea accionable: lo que la caja todavía puede agregar.
- Que baje y suba de inmediato al agregar o quitar líneas, sin esperar el poll de 15 s.
- Que el rechazo del servidor diga la verdad sobre quién tomó las unidades.

**Non-Goals:**

- No se cambia la semántica de `remaining` en la capa de datos: es la base de la aritmética de apartados y de la barrera de cupo, y tocarla arriesga la sobreventa.
- No se cambia el behavior del mesero ni del admin.
- No se agrega un contador nuevo ni una vista nueva: solo se corrige el número existente.

## Decisions

**1. Calcular el número en la terminal, no en la base.** El número mostrado será `remaining - heldByMe`, calculado en un helper compartido por el terminal y el badge. Alternativa considerada: agregar un campo `addable` a `LunchStockState` en `@bbspos/types`, calculado en `lunchStockRows`. Descartada porque `remaining` es la entrada de las reglas de apartado: duplicar el valor en el tipo invita a que alguien use el equivocado, y el nombre `remaining` seguiría significando dos cosas distintas según dónde se lea. Con el helper, la regla queda en un solo archivo y el tipo de transporte no crece.

**2. El estado "en tu ticket" pasa a ser `addable === 0`.** `lunchBlock` ya usaba `remaining - heldByMe <= 0`; la diferencia es que ahora esa resta es la misma que muestra el número, así que el cajero ve por qué la tarjeta se apagó. El bloqueo por "agotada" (`remaining <= 0`, sin apartado propio) se mantiene aparte: significa que no queda nada para nadie.

**3. El clic en la tarjeta aplica el estado que devuelve la acción.** `holdLunchUnits` ya devuelve la fila recalculada, con `heldByMe` incrementado. `tapMenuDayItem` la estaba ignorando y por eso el número no se movía. Se pasa por `applyStockOverride`, que existe y hoy solo usa el badge. Con eso el número baja en el acto, sin esperar el `router.refresh()`.

**4. Distinguir los dos rechazos en el servidor.** En `acquireLunchHold`, cuando `free <= 0` la causa se decide con los mismos datos que ya se tienen: si `myHeld >= remaining`, el cupo lo cubre el apartado propio ("ya las tenés todas en tu ticket"); si no, fue otra caja. La aritmética no cambia, solo el texto. Se corrige también el caso intermedio (`free > 0` pero insuficiente), que hoy dice "solo le quedan N", que ya es correcto y se deja como está.

**5. El helper va en `apps/cajero/lib/lunch-stock.ts`.** El cajero ya tiene `lib/cart-id.ts` con el otro concepto de dominio del cupo (`cartId`). Lo nuevo es del POS del cajero y no de `packages/*`, porque el mesero no lo necesita y no tiene sentido pagarlo en un paquete compartido.

## Risks / Trade-offs

- **El número de la tarjeta deja de ser el mismo dato que ven las otras cajas.** Es exactamente lo pedido, pero significa que un cajero con 3 unidades en el ticket ve "2" mientras otra caja ve "5". → Mitigación: el label del badge lo dice ("Las 2 que quedan ya están en tu ticket"), y el estado "en tu ticket" lo distingue de "agotada".
- **Un número que baja puede leerse como "se está vendiendo solo".** → Mitigación: baja solo como reacción a una acción del cajero (agregar o quitar), que es la causa visible.
- **La barrera de cupo no se toca**, así que un error de cálculo en el helper no podría sobrevender, solo mostrar mal un número. → La red de seguridad es `acquireLunchHold` + `assertLunchCapacity`, y se verifica con `pnpm --filter @bbspos/db verify:lunch-holds`, que debe seguir dando 40/40.
- **Cambia el contrato de dos specs** (`lunch-menu` y `pos-terminal`), que hasta ahora decían que el número no se movía. → Se actualizan en el mismo change y el `validate --strict` falla si se olvida un scenario.
