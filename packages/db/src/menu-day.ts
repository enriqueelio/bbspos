// Menú del Día: vigencia por jornada (America/La_Paz) sin procesos en segundo
// plano. Un plato figura en el Menú del Día solo cuando `enMenuDelDia = true`
// Y `menuDelDiaDate = zonedDateKey()`. Al cambiar la fecha, la bandera deja de
// aplicar por sí sola; el admin la vuelve a activar cuando la necesite.
import { prisma } from "./index";
import { zonedDateKey } from "./daily-report";

/** Platos del Menú del Día vigente: disponibles y activados para hoy. */
export async function todayMenuItems() {
  const today = zonedDateKey();
  return prisma.menuItem.findMany({
    where: { available: true, enMenuDelDia: true, menuDelDiaDate: today },
    orderBy: { name: "asc" },
  });
}

/** Carta fija: todos los platillos disponibles de categorías distintas de
 *  ALMUERZO (Sandwiches, Milanesas, etc.) con sus variantes de precio. */
export async function cartaMenuItems() {
  return prisma.menuItem.findMany({
    where: {
      available: true,
      category: { not: "ALMUERZO" },
    },
    include: { options: { orderBy: { name: "asc" } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

/** Activa (ON) o desactiva (OFF) el Menú del Día de un plato para hoy. */
export async function setMenuDelDiaForToday(id: string, on: boolean) {
  return prisma.menuItem.update({
    where: { id },
    data: on
      ? { enMenuDelDia: true, menuDelDiaDate: zonedDateKey() }
      : { enMenuDelDia: false, menuDelDiaDate: null },
  });
}