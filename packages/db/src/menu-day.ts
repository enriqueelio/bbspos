// Menú del Día: vigencia por jornada (America/La_Paz) sin procesos en segundo
// plano. Un plato figura en el Menú del Día solo cuando `enMenuDelDia = true`
// Y `menuDelDiaDate = zonedDateKey()`. Al cambiar la fecha, la bandera deja de
// aplicar por sí sola; el admin la vuelve a activar cuando la necesite.
//
// Además lleva el cálculo de la cantidad diaria: `sold` se deriva de los
// pedidos no anulados de la jornada (reservas por scheduledFor, resto por
// createdAt) y `remaining = planned + Σ ajustes − sold`, de modo que el número
// nunca se desincroniza y anular un pedido lo restituye solo.
//
// Y el apartado de cupo: mientras un almuerzo está en el ticket en curso de una
// caja, esa caja reserva las unidades (LunchHold) y las demás ven el número ya
// descontado, así que el primero que las mete al ticket es el que las vende.
// Por eso el `remaining` de una caja resta SOLO los apartados de los demás: el
// número no baja cuando uno mismo suma líneas, pero baja en el acto en que otra
// caja se lleva unidades. Para el admin (que no es ninguna caja) `remaining` es
// el disponible para cualquiera y `held` muestra lo que está apartado.
import { Prisma } from "@prisma/client";
import { prisma } from "./index";
import { zonedDateKey, shiftDayKey, zonedDayBounds } from "./daily-report";

/** Cliente de Prisma: el singleton o el `tx` de una transacción. */
export type DbClient = Prisma.TransactionClient;

/** Umbral de aviso de stock bajo cuando el plato aún no tiene cuota propia. */
export const DEFAULT_LOW_THRESHOLD = 5;
/** Rango válido de la cantidad programada de una jornada. */
export const PLANNED_MIN = 0;
export const PLANNED_MAX = 999;
/** Rango válido del aviso de stock bajo. */
export const THRESHOLD_MIN = 1;
export const THRESHOLD_MAX = 50;
/** Minutos que vive un apartado sin que la caja lo renueve. */
export const HOLD_TTL_MIN = 20;

/** Cantidades de una jornada para un plato del Menú del Día. */
export interface LunchStockRow {
  /** Unidades que la cocina prepara (null = nadie lo programó). */
  planned: number | null;
  /** Unidades ya vendidas en la jornada. */
  sold: number;
  /** Unidades apartadas por alguna caja con el plato en su ticket en curso. */
  held: number;
  /** De esas, cuántas son de la caja que está leyendo (solo si se pasó
   *  `excludeCartId`): lo que el cajero ya se llevó a su propio ticket. */
  heldByMe: number;
  /** planned + Σ ajustes − sold − apartados ajenos; null cuando no hay
   *  cantidad programada. Es el disponible PARA QUIEN LO CONSULTA. */
  remaining: number | null;
  /** Aviso de stock bajo por debajo de este número de unidades. */
  lowThreshold: number;
}

/** Plato al que se le calcula la cantidad (id para la cuota, nombre para las
 *  ventas: `OrderItem` guarda una instantánea de nombres, no el menuItemId). */
export interface LunchStockTarget {
  id: string;
  name: string;
}

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

/** Unidades de un plato del Menú del Día que pertenecen a una jornada: los
 *  pedidos de la reserva cuentan en la fecha pactada y el resto en la de
 *  creación. Los anulados no cuentan (anular restituye solo). `excludeOrderId`
 *  deja fuera un pedido (el que se está editando: sus ítems viejos van a ser
 *  reemplazados y si no, se contarían dos veces). */
function lunchSaleWhere(
  names: string[],
  bounds: { gte: Date; lt: Date },
  excludeOrderId?: string | null,
) {
  return {
    menuItemName: { in: names },
    order: {
      status: { not: "ANULADO" as const },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
      OR: [
        { scheduledFor: { gte: bounds.gte, lt: bounds.lt } },
        { scheduledFor: null, createdAt: { gte: bounds.gte, lt: bounds.lt } },
      ],
    },
  };
}

/** Filtro de apartados vigentes (los ya vencidos cuentan como libres). */
function activeHoldWhere(date: string) {
  return { date, expiresAt: { gt: new Date() } };
}

/** Cuánto tiene apartado cada plato en la jornada y cuánto de eso es del propio
 *  `cartId` (sus propios apartados no le restan: ya son suyos). Solo cuentan los
 *  apartados vigentes: los vencidos son unidades libres otra vez. */
async function heldByItem(
  db: DbClient,
  date: string,
  menuItemIds: string[],
  cartId?: string | null,
) {
  const totals = new Map<string, number>();
  const mine = new Map<string, number>();
  if (menuItemIds.length === 0) return { totals, mine };

  const holds = await db.lunchHold.findMany({
    where: {
      ...activeHoldWhere(date),
      menuItemId: { in: menuItemIds },
    },
    select: { menuItemId: true, cartId: true, quantity: true },
  });
  for (const hold of holds) {
    totals.set(
      hold.menuItemId,
      (totals.get(hold.menuItemId) ?? 0) + hold.quantity,
    );
    if (cartId && hold.cartId === cartId) {
      mine.set(hold.menuItemId, (mine.get(hold.menuItemId) ?? 0) + hold.quantity);
    }
  }
  return { totals, mine };
}

export interface LunchStockOptions {
  /** Caja cuyas reservas propia no restan del `remaining` que se calcula. */
  excludeCartId?: string | null;
  /** Pedido excluido del `sold` (el que se está editando). */
  excludeOrderId?: string | null;
}

/** Cantidades de la jornada indicada para los platos del Menú del Día.
 *  Tres consultas: cuotas con sus ajustes, las unidades vendidas agregadas por
 *  nombre de plato (OrderItem no guarda menuItemId) y los apartados vigentes.
 *  Un plato sin cuota aparece igual, con `planned`/`remaining` en null y el
 *  umbral por defecto. */
export async function lunchStockRows(
  db: DbClient,
  targets: LunchStockTarget[],
  date: string,
  options: LunchStockOptions = {},
): Promise<Map<string, LunchStockRow>> {
  const rows = new Map<string, LunchStockRow>();
  if (targets.length === 0) return rows;

  const names = targets.map((t) => t.name);
  const ids = targets.map((t) => t.id);
  const bounds = zonedDayBounds(date);

  const [quotas, sales, held] = await Promise.all([
    db.lunchQuota.findMany({
      where: { date, menuItemId: { in: ids } },
      include: { adjusts: { select: { delta: true } } },
    }),
    db.orderItem.findMany({
      where: lunchSaleWhere(names, bounds, options.excludeOrderId),
      select: { menuItemName: true, quantity: true },
    }),
    heldByItem(db, date, ids, options.excludeCartId),
  ]);

  const soldByName = new Map<string, number>();
  for (const sale of sales) {
    const name = sale.menuItemName;
    if (name == null) continue;
    soldByName.set(name, (soldByName.get(name) ?? 0) + sale.quantity);
  }

  const quotaByItem = new Map(quotas.map((q) => [q.menuItemId, q]));
  for (const target of targets) {
    const quota = quotaByItem.get(target.id);
    const sold = soldByName.get(target.name) ?? 0;
    const heldTotal = held.totals.get(target.id) ?? 0;
    const heldMine = held.mine.get(target.id) ?? 0;
    // Lo apartado por otras cajas es lo que de verdad me quita disponibilidad.
    const heldOthers = heldTotal - heldMine;

    if (!quota) {
      rows.set(target.id, {
        planned: null,
        sold,
        held: heldTotal,
        heldByMe: heldMine,
        remaining: null,
        lowThreshold: DEFAULT_LOW_THRESHOLD,
      });
      continue;
    }
    const delta = quota.adjusts.reduce((acc, a) => acc + a.delta, 0);
    const available = (quota.planned ?? 0) + delta - sold - heldOthers;
    rows.set(target.id, {
      planned: quota.planned,
      sold,
      held: heldTotal,
      heldByMe: heldMine,
      // Sin cantidad asignada no hay control de stock: `remaining` queda null y
      // el terminal del cajero bloquea la tarjeta hasta que alguien asigne
      // unidades.
      remaining: quota.planned == null ? null : available,
      lowThreshold: quota.lowThreshold,
    });
  }

  return rows;
}

/** Atajo de `lunchStockRows` contra el cliente normal, para la jornada de hoy. */
export async function lunchStockByItem(
  targets: LunchStockTarget[],
  date: string = zonedDateKey(),
  options: LunchStockOptions = {},
): Promise<Map<string, LunchStockRow>> {
  return lunchStockRows(prisma, targets, date, options);
}

/** Solo se toca la cantidad de los platos del Menú del Día de HOY: cualquier
 *  otro plato (carta, día anterior o siguiente) se rechaza sin escribir nada. */
export async function requireTodayMenuItem(menuItemId: string) {
  const item = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { id: true, name: true, enMenuDelDia: true, menuDelDiaDate: true },
  });
  if (!item) {
    throw new Error("El plato no existe.");
  }
  if (!item.enMenuDelDia || item.menuDelDiaDate !== zonedDateKey()) {
    throw new Error("Solo se puede modificar la cantidad de los almuerzos de hoy.");
  }
  return item;
}

/** Programa la cantidad de unidades que la cocina prepara hoy para un plato.
 *  Reemplaza el valor anterior (no suma) y deja el resto igual. Devuelve el
 *  estado recalculado, con la misma forma que viaja al catálogo. */
export async function setLunchPlannedForDay(
  menuItemId: string,
  planned: number,
  cartId?: string | null,
): Promise<LunchStockRow> {
  if (!Number.isInteger(planned) || planned < PLANNED_MIN || planned > PLANNED_MAX) {
    throw new Error(
      `La cantidad debe ser un número entero entre ${PLANNED_MIN} y ${PLANNED_MAX}.`,
    );
  }
  const item = await requireTodayMenuItem(menuItemId);
  const date = zonedDateKey();
  await prisma.lunchQuota.upsert({
    where: { menuItemId_date: { menuItemId, date } },
    create: { menuItemId, date, planned },
    update: { planned },
  });
  return (
    await lunchStockByItem([{ id: item.id, name: item.name }], date, {
      excludeCartId: cartId,
    })
  ).get(item.id)!;
}

/** Corrige la cantidad disponible de la jornada con un delta, dejando registro
 *  de quién lo hizo, cuándo y con qué nota.
 *
 *  Si el plato todavía no tiene cantidad programada, una reposición positiva ES
 *  la base: se crea la cuota con `planned = delta` sin fila de ajuste, para no
 *  contar dos veces la misma reposición (contarla en los dos términos de
 *  remaining = planned + Σ delta − sold la duplicaría). Una resta sin cantidad
 *  programada se rechaza: no hay contra qué descontar. */
export async function adjustLunchStockForDay(
  menuItemId: string,
  delta: number,
  userId: string,
  note?: string | null,
  cartId?: string | null,
): Promise<LunchStockRow> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("El ajuste debe ser un número distinto de cero.");
  }
  const item = await requireTodayMenuItem(menuItemId);
  const date = zonedDateKey();
  const quota = await prisma.lunchQuota.findUnique({
    where: { menuItemId_date: { menuItemId, date } },
    select: { id: true, planned: true },
  });

  if (!quota) {
    if (delta < 0) {
      throw new Error("Primero suma unidades para poder restar.");
    }
    await prisma.lunchQuota.create({ data: { menuItemId, date, planned: delta } });
  } else {
    if (delta < 0 && quota.planned == null) {
      throw new Error("Primero suma unidades para poder restar.");
    }
    await prisma.lunchAdjust.create({
      data: {
        quotaId: quota.id,
        delta,
        note: note?.trim() || null,
        userId,
      },
    });
  }

  return (
    await lunchStockByItem([{ id: item.id, name: item.name }], date, {
      excludeCartId: cartId,
    })
  ).get(item.id)!;
}

/** Cambia el umbral de aviso de stock bajo del plato en la jornada. No programa
 *  cantidad: un plato sin cantidad sigue mostrando guion y vendiendo libre. */
export async function setLunchLowThresholdForDay(
  menuItemId: string,
  lowThreshold: number,
  cartId?: string | null,
): Promise<LunchStockRow> {
  if (
    !Number.isInteger(lowThreshold) ||
    lowThreshold < THRESHOLD_MIN ||
    lowThreshold > THRESHOLD_MAX
  ) {
    throw new Error(
      `El aviso debe ser un número entero entre ${THRESHOLD_MIN} y ${THRESHOLD_MAX}.`,
    );
  }
  const item = await requireTodayMenuItem(menuItemId);
  const date = zonedDateKey();
  await prisma.lunchQuota.upsert({
    where: { menuItemId_date: { menuItemId, date } },
    create: { menuItemId, date, lowThreshold },
    update: { lowThreshold },
  });
  return (
    await lunchStockByItem([{ id: item.id, name: item.name }], date, {
      excludeCartId: cartId,
    })
  ).get(item.id)!;
}

/** Una fila del histórico de almuerzos: qué se programó, qué se vendió y qué
 *  quedó en una jornada, para comparar el Cocina vs Vendido en el admin. */
export interface LunchHistoryRow extends LunchStockRow {
  date: string;
  menuItemId: string;
  name: string;
}

/** Histórico por jornada de los almuerzos: los últimos `days` días con cuota
 *  programming, en orden de fecha descendente. El vendido de cada día se cuenta
 *  en la fecha pactada de la reserva o en la de creación del pedido. */
export async function lunchStockHistory(days = 14): Promise<LunchHistoryRow[]> {
  const today = zonedDateKey();
  const dates = Array.from({ length: Math.max(1, days) }, (_, i) =>
    shiftDayKey(today, -(days - 1 - i)),
  );
  const window = { gte: zonedDayBounds(dates[0]).gte, lt: zonedDayBounds(today).lt };

  const [items, quotas, sales, holds] = await Promise.all([
    prisma.menuItem.findMany({
      where: { category: "ALMUERZO" },
      select: { id: true, name: true },
    }),
    prisma.lunchQuota.findMany({
      where: { date: { in: dates } },
      include: { adjusts: { select: { delta: true } } },
    }),
    prisma.orderItem.findMany({
      where: {
        menuItemCategory: "ALMUERZO",
        order: {
          status: { not: "ANULADO" as const },
          OR: [
            { scheduledFor: { gte: window.gte, lt: window.lt } },
            {
              scheduledFor: null,
              createdAt: { gte: window.gte, lt: window.lt },
            },
          ],
        },
      },
      select: {
        menuItemName: true,
        quantity: true,
        order: { select: { scheduledFor: true, createdAt: true } },
      },
    }),
    // Solo hay apartados vigentes (los de hoy): los de días pasados ya vencieron.
    prisma.lunchHold.findMany({
      where: { date: { in: dates }, expiresAt: { gt: new Date() } },
      select: { menuItemId: true, date: true, quantity: true },
    }),
  ]);

  const nameById = new Map(items.map((i) => [i.id, i.name]));
  const soldByDateName = new Map<string, number>();
  for (const sale of sales) {
    const name = sale.menuItemName;
    if (name == null) continue;
    const key = `${zonedDateKey(sale.order.scheduledFor ?? sale.order.createdAt)}|${name}`;
    soldByDateName.set(key, (soldByDateName.get(key) ?? 0) + sale.quantity);
  }
  const heldByDateItem = new Map<string, number>();
  for (const hold of holds) {
    const key = `${hold.date}|${hold.menuItemId}`;
    heldByDateItem.set(key, (heldByDateItem.get(key) ?? 0) + hold.quantity);
  }

  return quotas
    .flatMap((quota) => {
      const name = nameById.get(quota.menuItemId);
      if (name == null) return [];
      const sold = soldByDateName.get(`${quota.date}|${name}`) ?? 0;
      const held = heldByDateItem.get(`${quota.date}|${quota.menuItemId}`) ?? 0;
      const delta = quota.adjusts.reduce((acc, a) => acc + a.delta, 0);
      return [
        {
          date: quota.date,
          menuItemId: quota.menuItemId,
          name,
          planned: quota.planned,
          sold,
          held,
          // El admin no es una caja: no tiene apartados propios, así que todo lo
          // apartado le resta igual.
          heldByMe: 0,
          // El admin no es una caja: `remaining` es el disponible para cualquiera
          // (ya sin lo apartado) y `held` dice cuánto está tomado.
          remaining:
            quota.planned == null ? null : (quota.planned ?? 0) + delta - sold - held,
          lowThreshold: quota.lowThreshold,
        },
      ];
    })
    .sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : b.date.localeCompare(a.date)));
}
