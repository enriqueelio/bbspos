// Apartado de cupo: la regla de "el primero que agarró el plato gana".
//
// El carrito del POS vive en el navegador, así que para que dos cajas no vendan
// las mismas unidades hace falta que el clic en la tarjeta deje una reserva en
// la base: una fila en LunchHold por (plato, jornada, caja). Mientras esa fila
// está vigente, el `remaining` que calculan las demás cajas ya viene descontado,
// así que ven la tarjeta en rojo o en "Agotado" y no pueden vender lo que esta
// caja le prometió al cliente. Cuando la caja confirma el pedido, el apartado se
// borra porque las unidades pasan a contar como vendidas (vía sold). Si la caja
// abandona el ticket, el apartado vence solo y las unidades vuelven a estar
// libres sin que nadie limpie nada a mano.
import { prisma } from "./index";
import { zonedDateKey } from "./daily-report";
import {
  HOLD_TTL_MIN,
  lunchStockRows,
  requireTodayMenuItem,
  type DbClient,
  type LunchStockRow,
  type LunchStockTarget,
} from "./menu-day";

/** Minutos que hay que renovarlos les queda para que la caja renueve. */
const RENEW_WINDOW_MIN = 6;

function expiryFromNow() {
  return new Date(Date.now() + HOLD_TTL_MIN * 60_000);
}

/** ¿Le queda poco de vida al apartado? Entonces hay que renovarlo. */
function needsRenewal(expiresAt: Date) {
  return expiresAt.getTime() - Date.now() < RENEW_WINDOW_MIN * 60_000;
}

/** Apartar unidades para el ticket en curso de `cartId`. Es la puerta de
 *  entrada: si otra caja ya se llevó lo que había, falla y el cajero no agrega
 *  la línea. Devuelve el estado recalculado tal como lo ve esta caja. */
export async function acquireLunchHold(
  cartId: string,
  menuItemId: string,
  quantity = 1,
): Promise<LunchStockRow> {
  if (!cartId) {
    throw new Error("La caja no tiene sesión de ticket para apartar unidades.");
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("La cantidad a apartar debe ser al menos 1.");
  }
  const item = await requireTodayMenuItem(menuItemId);
  const date = zonedDateKey();
  const target: LunchStockTarget = { id: item.id, name: item.name };

  return prisma.$transaction(async (tx) => {
    const row = (await lunchStockRows(tx, [target], date, { excludeCartId: cartId }))
      .get(item.id)!;

    if (row.planned == null || row.remaining == null) {
      throw new Error(`A ${item.name} todavía no se le asignó cantidad hoy.`);
    }

    // `row.remaining` es el disponible DESCONTANDO lo que ya apartaron las otras
    // cajas, así que hay que sumarle lo que esta caja ya tiene: el control es
    // "apartado mío + lo que pido + apartado ajeno = disponible". Si se mirara
    // solo el incremento, dos cajas podrían juntar más unidades de las que hay.
    // Solo cuenta el apartado VIGENTE: uno vencido ya es de cualquiera y, si se
    // sumara, esta caja quedaría bloqueada sin poder volver a tomar el plato.
    const mine = await tx.lunchHold.findFirst({
      where: {
        menuItemId,
        date,
        cartId,
        expiresAt: { gt: new Date() },
      },
      select: { quantity: true },
    });
    const myHeld = mine?.quantity ?? 0;
    const free = row.remaining - myHeld;

    if (free <= 0 || myHeld + quantity > row.remaining) {
      throw new Error(
        free <= 0
          ? `A ${item.name} ya no le queda nada: otra caja se lo llevó.`
          : `A ${item.name} solo le quedan ${free} para esta caja.`,
      );
    }

    const expiresAt = expiryFromNow();
    await tx.lunchHold.upsert({
      where: { menuItemId_date_cartId: { menuItemId, date, cartId } },
      create: { menuItemId, date, cartId, quantity, expiresAt },
      update: {
        // Si había un apartado vigente se le suma lo nuevo; si lo que había
        // estaba vencido la fila se reutiliza pero con la cantidad ABSOLUTA
        // (sumarle a lo vencido haría aparecer unidades de la nada).
        quantity: myHeld > 0 ? { increment: quantity } : quantity,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    return (
      await lunchStockRows(tx, [target], date, { excludeCartId: cartId })
    ).get(item.id)!;
  });
}

/** Devuelve unidades al común: la caja quitó la línea del ticket o bajó la
 *  cantidad. Nunca deja un apartado negativo (si el piso es 0, lo borra). */
export async function releaseLunchHold(
  cartId: string,
  menuItemId: string,
  quantity = 1,
): Promise<number> {
  if (!cartId || !Number.isInteger(quantity) || quantity < 1) return 0;
  // Solo el apartado de HOY: los de jornadas anteriores ya no son de este
  // ticket y liberarlos tocaría el cupo equivocado.
  const hold = await prisma.lunchHold.findUnique({
    where: {
      menuItemId_date_cartId: { menuItemId, date: zonedDateKey(), cartId },
    },
    select: { id: true, quantity: true },
  });
  if (!hold) return 0;

  const left = hold.quantity - quantity;
  if (left <= 0) {
    await prisma.lunchHold.delete({ where: { id: hold.id } });
    return 0;
  }
  await prisma.lunchHold.update({ where: { id: hold.id }, data: { quantity: left } });
  return left;
}

/** Suelta todos los apartados de la caja: al limpiar el ticket en curso, al
 *  cambiar de caja o al recargar la página con un carrito vacío. */
export async function releaseCartLunchHolds(cartId: string): Promise<number> {
  if (!cartId) return 0;
  const result = await prisma.lunchHold.deleteMany({ where: { cartId } });
  return result.count;
}

/** Renueva los apartados de la caja. La hace el poll del catálogo (cada 15s)
 *  para que un ticket abierto mucho rato no pierda el cupo por vencer, y solo
 *  escribe cuando al apartado le queda poca vida. */
export async function touchCartLunchHolds(cartId: string): Promise<number> {
  if (!cartId) return 0;
  const now = new Date();
  const holds = await prisma.lunchHold.findMany({
    where: { cartId, expiresAt: { gt: now } },
    select: { id: true, expiresAt: true },
  });
  const stale = holds.filter((h) => needsRenewal(h.expiresAt));
  if (stale.length === 0) return 0;

  const expiresAt = expiryFromNow();
  await prisma.lunchHold.updateMany({
    where: { id: { in: stale.map((h) => h.id) } },
    data: { expiresAt, updatedAt: new Date() },
  });
  return stale.length;
}

/** Deja los apartados de la caja iguales a las líneas que tiene en el ticket.
 *
 *  Se usa al (re)abrir el POS: el carrito vive en localStorage, así que tras
 *  una recarga o un crash puede volver con líneas cuyo apartado ya venció o ya
 *  no existe. Los que sobran (ya no están en el carrito) se sueltan y los que
 *  faltan se vuelven a pedir de a uno, así que avisa en `lost` los platos que
 *  otra caja se llevó mientras tanto, para que el cajero los quite del ticket. */
export async function reconcileCartLunchHolds(
  cartId: string,
  lines: { menuItemId: string; quantity: number }[],
): Promise<{ released: number; lost: string[] }> {
  if (!cartId) return { released: 0, lost: [] };

  const wanted = new Map<string, number>();
  for (const line of lines) {
    wanted.set(line.menuItemId, (wanted.get(line.menuItemId) ?? 0) + line.quantity);
  }

  // Solo los apartados VIGENTES cuentan como "mío": los vencidos son unidades
  // libres y hay que volver a pedirllas, no darlas por separadas.
  const mine = await prisma.lunchHold.findMany({
    where: { cartId, date: zonedDateKey(), expiresAt: { gt: new Date() } },
    select: { id: true, menuItemId: true, quantity: true },
  });

  let released = 0;
  for (const hold of mine) {
    const target = wanted.get(hold.menuItemId) ?? 0;
    if (target === 0) {
      await prisma.lunchHold.delete({ where: { id: hold.id } });
      released += 1;
    } else if (hold.quantity > target) {
      await prisma.lunchHold.update({
        where: { id: hold.id },
        data: { quantity: target },
      });
    }
  }

  const lost: string[] = [];
  for (const [menuItemId, quantity] of wanted) {
    const have = mine.find((h) => h.menuItemId === menuItemId)?.quantity ?? 0;
    for (let i = have; i < quantity; i += 1) {
      try {
        await acquireLunchHold(cartId, menuItemId, 1);
      } catch {
        const item = await requireTodayMenuItem(menuItemId);
        lost.push(item.name);
        break;
      }
    }
  }

  return { released, lost: [...new Set(lost)] };
}

/** El pedido se va a guardar, así que las unidades dejan de estar apartadas y
 *  pasan a contar como vendidas. Se llama DENTRO de la misma transacción que
 *  crea el pedido. */
export async function consumeCartLunchHolds(
  db: DbClient,
  cartId: string,
): Promise<number> {
  if (!cartId) return 0;
  const result = await db.lunchHold.deleteMany({ where: { cartId } });
  return result.count;
}

/** Falla de cupo con un mensaje para el cajero. Viaja como error propio para que
 *  quien llama la distinga de un fallo técnico y no la tape con un "no se pudo
 *  guardar el pedido" genérico. */
export class LunchCapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LunchCapacityError";
  }
}

/** Última barrera antes de guardar el pedido: confirma que el cupo sigue ahí.
 *
 *  `remaining` excluye los propios apartados, así que comparar contra la
 *  cantidad del carrito es exactamente "me alcanza lo que tengo reservado". Si
 *  el apartado se venció (caja abierta mucho tiempo) y otra caja tomó las
 *  unidades, acá se rechaza en vez de sobrevender.
 *
 *  `date` es la jornada donde va a contar la venta (la fecha pactada de la
 *  reserva, o hoy). `excludeOrderId` es el pedido que se está editando: sus
 *  ítems viejos siguen en `sold` y sin excluirlos se contarían dos veces. */
export async function assertLunchCapacity(
  db: DbClient,
  cartId: string,
  demand: { menuItemId: string; name: string; quantity: number }[],
  date: string,
  excludeOrderId?: string | null,
): Promise<void> {
  if (demand.length === 0) return;

  const nameById = new Map(demand.map((d) => [d.menuItemId, d.name]));
  const byId = new Map<string, number>();
  for (const line of demand) {
    byId.set(line.menuItemId, (byId.get(line.menuItemId) ?? 0) + line.quantity);
  }
  const targets: LunchStockTarget[] = [...byId.keys()].map((id) => ({
    id,
    name: nameById.get(id)!,
  }));

  const rows = await lunchStockRows(db, targets, date, {
    excludeCartId: cartId,
    excludeOrderId,
  });

  for (const [menuItemId, quantity] of byId) {
    const name = nameById.get(menuItemId) ?? "Ese plato";
    const row = rows.get(menuItemId);
    if (row?.planned == null || row?.remaining == null) {
      throw new LunchCapacityError(
        `${name} no tiene cantidad asignada para esa fecha.`,
      );
    }
    if (row.remaining < quantity) {
      throw new LunchCapacityError(
        row.remaining <= 0
          ? `Ya no queda ${name}: se agotó u otra caja lo apartó. Quitá la línea del ticket.`
          : `Solo quedan ${row.remaining} de ${name} y pediste ${quantity}.`,
      );
    }
  }
}
