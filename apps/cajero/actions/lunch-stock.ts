"use server";

import { revalidatePath } from "next/cache";
import {
  prisma,
  acquireLunchHold,
  adjustLunchStockForDay,
  reconcileCartLunchHolds,
  releaseCartLunchHolds,
  releaseLunchHold,
  setLunchLowThresholdForDay,
  setLunchPlannedForDay,
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

/** Programa la cantidad de unidades que la cocina prepara hoy para un plato.
 *  Devuelve el estado recalculado para que la tarjeta se actualice en el acto.
 *  Exige sesión; el rango y la pertenencia al Menú del Día de hoy se validan en
 *  la capa de base de datos. */
export async function setLunchPlanned(
  menuItemId: string,
  planned: number,
  cartId?: string | null,
): Promise<LunchStockState> {
  await getRequiredSession();
  const state = await setLunchPlannedForDay(menuItemId, planned, cartId);
  revalidatePath("/");
  return state;
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

/** Cambia el umbral de aviso de stock bajo del plato en la jornada, sin tocar la
 *  cantidad: el aviso de "pocas unidades" no habilita ni bloquea la venta. */
export async function setLunchLowThreshold(
  menuItemId: string,
  lowThreshold: number,
  cartId?: string | null,
): Promise<LunchStockState> {
  await getRequiredSession();
  const state = await setLunchLowThresholdForDay(
    menuItemId,
    lowThreshold,
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

/** Devuelve unidades al común: el cajero quitó la línea o bajó la cantidad. */
export async function unholdLunchUnits(
  cartId: string,
  menuItemId: string,
  quantity?: number,
): Promise<void> {
  await getRequiredSession();
  await releaseLunchHold(cartId, menuItemId, quantity ?? 1);
  revalidatePath("/");
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
