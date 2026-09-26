// Lo que el número del contador de almuerzos tiene que mostrar.
//
// `remaining` viene calculado como "programada + ajustes − vendidas − apartado de
// las OTRAS cajas", porque es la base con la que el servidor decide si una caja
// puede apartar unidades. Para el cajero ese número no sirve tal cual: si no le
// resta su propio apartado, una tarjeta con 5 disponibles sigue marcando 5
// mientras el ticket ya lleva 5 líneas, y el cajero lee que el contador no
// funciona. El número que ve la caja es lo que todavía puede agregar, y eso baja
// y sube con cada línea que toca.
import type { LunchStockState } from "@bbspos/types";

/** Unidades que esta caja todavía puede agregar al ticket. `null` cuando el
 *  plato no tiene cantidad programada, en cuyo caso no hay nada que contar. */
export function addableUnits(state: LunchStockState | null): number | null {
  if (!state) return null;
  if (state.remaining == null) return null;
  return state.remaining - state.heldByMe;
}
