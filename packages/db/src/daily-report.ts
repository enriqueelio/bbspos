// Cierre de caja del día: métricas globales, mensaje para Telegram y envío.
// Es la fuente única de verdad usada por el worker de cron (scripts/), por el
// botón "Cierre diario" del admin y por "Enviar a Telegram" del cajero.
//
// Un día enviado queda marcado en DailyReportLog: el cron de las 23:20 no lo
// reenvía, y el botón manual tampoco (avisa que ya se envió).
import { prisma } from "./index";

const TIME_ZONE = process.env.TIME_ZONE || "America/La_Paz";

const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  QR: "QR",
  TARJETA: "Tarjeta",
};

export interface DailyReportStats {
  revenueTotal: number;
  deliveredOrders: number;
  createdOrders: number;
  avgTicket: number;
  avgDeliveryMinutes: number | null;
  payment: { method: string; orders: number; revenue: number }[];
  top: [string, number][];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Clave local (YYYY-MM-DD) en la zona del restaurante. */
export function zonedDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Minutos transcurridos del día local (para comparar contra la hora de cierre). */
export function zonedMinutes(date: Date): number {
  const [h, m] = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .split(":")
    .map(Number);
  return h * 60 + m;
}

/** Minutos del día desde los que se permite el envío manual del cierre (23:10). */
export function manualReportCutoffMinutes(): number {
  const [h, m] = (process.env.MANUAL_REPORT_HOUR || "23:10").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Clave YYYY-MM-DD desplazada por `delta` días. */
export function shiftDayKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Día a reportar: el actual si ya pasó la hora de cierre, si no el anterior.
 *  Así un día sin reporte (contenedor caído o madrugada) se recupera solo. */
export function targetReportDate(
  date: Date = new Date(),
  cutoff = "23:20",
): string {
  const [h, m] = cutoff.split(":").map(Number);
  const cutoffMinutes = (h || 0) * 60 + (m || 0);
  return zonedMinutes(date) >= cutoffMinutes
    ? zonedDateKey(date)
    : shiftDayKey(zonedDateKey(date), -1);
}

/** Medianoche local del día (UTC) — offset fijo, sin horario de verano. */
function zonedStartOfDay(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const guessUtcMs = Date.UTC(year, month - 1, day, 4, 0, 0);
  const hourInZone = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      hour12: false,
    }).format(new Date(guessUtcMs)),
  );
  const corrected =
    hourInZone === 0 ? guessUtcMs : guessUtcMs - (hourInZone + 4) * 3_600_000;
  return new Date(corrected);
}

function dayBounds(key: string): { gte: Date; lt: Date } {
  const start = zonedStartOfDay(key);
  return { gte: start, lt: new Date(start.getTime() + 24 * 3_600_000) };
}

function avgDeliveryMinutes(
  orders: { createdAt: Date; deliveredAt: Date | null }[],
): number | null {
  const valid = orders.filter((o) => o.deliveredAt);
  if (valid.length === 0) return null;
  const total = valid.reduce(
    (acc, o) =>
      acc + (o.deliveredAt!.getTime() - o.createdAt.getTime()) / 60_000,
    0,
  );
  return Math.round(total / valid.length);
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${h} h ${rest} min` : `${h} h`;
}

/** Métricas globales del día (todos los cajeros). */
export async function collectReportStats(key: string): Promise<DailyReportStats> {
  const bounds = dayBounds(key);

  const [delivered, createdOrders, topItems] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "ENTREGADO",
        deliveredAt: { gte: bounds.gte, lt: bounds.lt },
      },
      select: {
        total: true,
        paymentMethod: true,
        paymentMethod2: true,
        paymentAmount2: true,
        createdAt: true,
        deliveredAt: true,
      },
    }),
    prisma.order.count({
      where: {
        status: { not: "ANULADO" },
        createdAt: { gte: bounds.gte, lt: bounds.lt },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          status: "ENTREGADO",
          deliveredAt: { gte: bounds.gte, lt: bounds.lt },
        },
      },
      select: { sizeName: true, flavorName: true, bobaTypeName: true, quantity: true },
    }),
  ]);

  const revenueTotal = delivered.reduce((acc, o) => acc + o.total, 0);

  const payment = new Map<string, { orders: number; revenue: number }>();
  for (const order of delivered) {
    if (!order.paymentMethod) continue;
    if (order.paymentMethod2 && order.paymentAmount2 != null) {
      const one = payment.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
      one.orders += 1;
      one.revenue += order.total - order.paymentAmount2;
      payment.set(order.paymentMethod, one);

      const two = payment.get(order.paymentMethod2) ?? { orders: 0, revenue: 0 };
      two.orders += 1;
      two.revenue += order.paymentAmount2;
      payment.set(order.paymentMethod2, two);
    } else {
      const entry = payment.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += order.total;
      payment.set(order.paymentMethod, entry);
    }
  }

  const byProduct = new Map<string, number>();
  for (const item of topItems) {
    const name = `${item.sizeName} ${item.flavorName} (${item.bobaTypeName})`;
    byProduct.set(name, (byProduct.get(name) ?? 0) + item.quantity);
  }
  const top = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return {
    revenueTotal,
    deliveredOrders: delivered.length,
    createdOrders,
    avgTicket:
      delivered.length > 0 ? Math.round(revenueTotal / delivered.length) : 0,
    avgDeliveryMinutes: avgDeliveryMinutes(delivered),
    payment: [...payment.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([method, v]) => ({ method, ...v })),
    top,
  };
}

export function buildReportMessage(key: string, stats: DailyReportStats): string {
  const lines = [
    "📊 *Cierre de caja*",
    `📅 ${key}`,
    "",
    `💵 Ingresos (entregados): ${stats.revenueTotal} Bs`,
    `🧋 Entregados: ${stats.deliveredOrders} · Creados: ${stats.createdOrders}`,
    `🎫 Ticket promedio: ${stats.avgTicket} Bs`,
  ];
  if (stats.avgDeliveryMinutes !== null) {
    lines.push(`⏱️ Entrega promedio: ${durationLabel(stats.avgDeliveryMinutes)}`);
  }
  lines.push("");
  if (stats.payment.length === 0) {
    lines.push("💳 Pagos: sin registros");
  } else {
    lines.push("💳 *Pagos*");
    for (const p of stats.payment) {
      lines.push(
        `   • ${PAYMENT_LABEL[p.method] ?? p.method}: ${p.revenue} Bs (${p.orders})`,
      );
    }
  }
  if (stats.top.length > 0) {
    lines.push("");
    lines.push("🥤 *Top productos*");
    stats.top.forEach(([name, qty], i) => {
      lines.push(`   ${i + 1}. ${qty}x ${name}`);
    });
  }
  return lines.join("\n");
}

/** Envía (una sola vez) el cierre de caja del día al bot de Telegram. */
export async function sendDailyReportToTelegram(
  key: string,
): Promise<{ ok: boolean; message: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      ok: false,
      message:
        "Faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID para enviar el reporte.",
    };
  }

  const already = await prisma.dailyReportLog.findUnique({
    where: { date: key },
    select: { date: true },
  });
  if (already) {
    return {
      ok: true,
      message: `El cierre de caja de ${key} ya se envió al bot.`,
    };
  }

  try {
    const stats = await collectReportStats(key);
    const text = buildReportMessage(key, stats);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      return {
        ok: false,
        message: `Telegram respondió ${res.status}: ${await res.text()}`,
      };
    }

    await prisma.dailyReportLog.upsert({
      where: { date: key },
      create: { date: key },
      update: {},
    });

    return { ok: true, message: `Cierre de caja de ${key} enviado al bot.` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "No se pudo enviar el reporte.",
    };
  }
}