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

/** Activa (ON) o desactiva (OFF) el Menú del Día de un plato para hoy.
 *  Para los almuerzos el estado "activo" es equivalente a estar disponible hoy:
 *  al activar se marca como disponible y al desactivar deja de estarlo, de modo
 *  que ningún almuerzo permanece activo más allá de la jornada. */
export async function setMenuDelDiaForToday(id: string, on: boolean) {
  return prisma.menuItem.update({
    where: { id },
    data: on
      ? { available: true, enMenuDelDia: true, menuDelDiaDate: zonedDateKey() }
      : { available: false, enMenuDelDia: false, menuDelDiaDate: null },
  });
}

/** Deja en blanco la selección de almuerzos de jornadas anteriores: desactiva
 *  la disponibilidad y la bandera del Menú del Día de los platos que quedaron
 *  marcados con una fecha distinta a la actual, de modo que al arrancar el día
 *  la lista quede limpia y el admin elija manualmente los nuevos platos. */
export async function resetStaleMenuDelDia() {
  const today = zonedDateKey();
  const result = await prisma.menuItem.updateMany({
    where: {
      category: "ALMUERZO",
      enMenuDelDia: true,
      menuDelDiaDate: { not: today },
    },
    data: { available: false, enMenuDelDia: false, menuDelDiaDate: null },
  });
  return result.count;
}
