"use server";

import { revalidatePath } from "next/cache";
import {
  prisma,
  acquireLunchHold,
  adjustLunchStockForDay,
  lunchStockByItem,
  reconcileCartLunchHolds,
  releaseCartLunchHolds,
  releaseLunchHold,
  zonedDateKey,
} from "@bbspos/db";
import type { LunchStockState } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";

/** Usuario de la sesión, para la bitácora de ajustes. Se valida contra la BD
 *  porque cada ajuste exige un responsable registrado. */
async function requireUserId() {
  const session = await getRequiredSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!user) {
    throw new Error("Tu usuario ya no existe. Vuelve a iniciar sesión.");
  }
  return user.id;
}

/** Corrige la cantidad disponible de la jornada con un delta, dejando registro
 *  de quién lo hizo, cuándo y con qué nota. Si el plato no tiene cantidad
 *  programada, una reposición positiva la establece como base. */
export async function adjustLunchStock(
  menuItemId: string,
  delta: number,
  note?: string | null,
  cartId?: string | null,
): Promise<LunchStockState> {
  await getRequiredSession();
  const state = await adjustLunchStockForDay(
    menuItemId,
    delta,
    await requireUserId(),
    note,
    cartId,
  );
  revalidatePath("/");
  return state;
}

/** ¿Este ticket cuenta contra el cupo de HOY? Un pedido pactado para otro día no
 *  aparta nada: las cantidades de mañana todavía no están programadas (el admin
 *  solo programa el Menú del Día vigente) y el cupo de esa fecha se revisa al
 *  guardar, contra la fecha pactada. Apartar hoy sí lo haría, y le robaría el
 *  almuerzo de hoy a las demás cajas. */
function countsForToday(scheduledFor?: string | null): boolean {
  if (!scheduledFor) return true;
  return zonedDateKey(new Date(scheduledFor)) === zonedDateKey();
}

/** Aparta unidades para el ticket en curso: el cajero metió el almuerzo al
 *  ticket y desde ese momento es suyo, otra caja lo ve descontado y no puede
 *  venderlo. Falla si ya no queda, y en ese caso el cajero no agrega la línea.
 *  Devuelve null sin apartar nada si el ticket es una reserva para otro día. */
export async function holdLunchUnits(
  cartId: string,
  menuItemId: string,
  quantity?: number,
  scheduledFor?: string | null,
): Promise<LunchStockState | null> {
  await getRequiredSession();
  if (!countsForToday(scheduledFor)) return null;
  const state = await acquireLunchHold(cartId, menuItemId, quantity ?? 1);
  revalidatePath("/");
  return state;
}

/** Estado de la jornada de un plato tal como lo ve esta caja: el disponible
 *  descuenta lo apartado por las demás, no lo propio. Es lo que deja al número
 *  de la tarjeta subir en el acto cuando el cajero suelta una línea. */
async function stockForThisCart(
  cartId: string,
  menuItemId: string,
): Promise<LunchStockState | null> {
  const item = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { id: true, name: true },
  });
  if (!item) return null;
  const rows = await lunchStockByItem(
    [{ id: item.id, name: item.name }],
    zonedDateKey(),
    { excludeCartId: cartId || null },
  );
  return rows.get(item.id) ?? null;
}

/** Devuelve unidades al común: el cajero quitó la línea o bajó la cantidad.
 *  Devuelve el estado recalculado para que el contador de la tarjeta suba sin
 *  esperar el refresco del catálogo. */
export async function unholdLunchUnits(
  cartId: string,
  menuItemId: string,
  quantity?: number,
): Promise<LunchStockState | null> {
  await getRequiredSession();
  await releaseLunchHold(cartId, menuItemId, quantity ?? 1);
  revalidatePath("/");
  return stockForThisCart(cartId, menuItemId);
}

/** Reclava los apartados con las líneas que tiene el ticket ahora mismo. Se
 *  llama al abrir el POS y al cargar una reserva para editar, porque el carrito
 *  se restaura del navegador y sus apartados pueden haber vencido o haberse
 *  quedado en otra caja. `lost` son los platos que otra caja se llevó mientras
 *  tanto. Con un carrito vacío suelta lo que quedara apartado. */
export async function syncLunchHolds(
  cartId: string,
  lines: { menuItemId: string; quantity: number }[],
  scheduledFor?: string | null,
): Promise<{ lost: string[] }> {
  await getRequiredSession();
  if (!countsForToday(scheduledFor)) {
    // El ticket pasó a ser de otro día: lo apartado hoy ya no le corresponde.
    await releaseCartLunchHolds(cartId);
    return { lost: [] };
  }
  const result = await reconcileCartLunchHolds(cartId, lines);
  revalidatePath("/");
  return { lost: result.lost };
}
