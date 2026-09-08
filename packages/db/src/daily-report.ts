// Cierre de caja del día: métricas globales, mensaje para Telegram y envío.
// Es la fuente única de verdad usada por el worker de cron (scripts/), por el
// botón "Cierre diario" del admin y por "Enviar a Telegram" del cajero.
//
// Un día enviado queda marcado en DailyReportLog: el cron de las 23:20 no lo
// reenvía, y el botón manual tampoco (avisa que ya se envió).
import { prisma } from "./index";

const TIME_ZONE = process.env.TIME_ZONE || "America/La_Paz";

export interface DailyReportStats {
  revenueTotal: number;
  deliveredOrders: number;
  avgTicket: number;
  avgDeliveryMinutes: number | null;
  payment: { method: string; orders: number; revenue: number }[];
  cancellationsCount: number;
  cancellationsLost: number;
  discountsTotal: number;
  toppingsRevenue: number;
  peakHour: { hour: number; orders: number } | null;
  /** Ingresos reales del día por recargas/pagos de deuda de pensionados (Bs).
   *  Es efectivo/QR que entró a la caja ese día, aunque no sea una venta. */
  pensionRecharges: number;
  /** Desglose de pensionRecharges por método de pago (Efectivo/QR). */
  pensionRechargeByMethod: { method: string; revenue: number }[];
  /** Consumos del día cobrados por Cuenta Pensionado (no entran a la caja). */
  pensionConsumption: number;
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

/** Métricas del cierre de caja del día: finanzas, operación y fugas.
 *  Replica la lógica de agregación de lib/reports (adjustments/peak-hours/daily). */
export async function collectReportStats(key: string): Promise<DailyReportStats> {
  const bounds = dayBounds(key);

  const [delivered, peakCreated, adjustments, toppingItems, ledger] =
    await Promise.all([
      // FINANZAS: pedidos entregados del día (tienen método de pago y entrega).
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
      // Hora pico: pedidos creados en el día (sin anulados), como peak-hours.ts.
      prisma.order.findMany({
        where: {
          createdAt: { gte: bounds.gte, lt: bounds.lt },
          status: { not: "ANULADO" },
        },
        select: { createdAt: true },
      }),
      // Fugas: anulaciones (cancelledAt) y descuentos (discountedAt), como adjustments.ts.
      prisma.order.findMany({
        where: {
          OR: [
            { status: "ANULADO", cancelledAt: { gte: bounds.gte, lt: bounds.lt } },
            { discountedAt: { gte: bounds.gte, lt: bounds.lt } },
          ],
        },
        select: {
          status: true,
          total: true,
          discountAmount: true,
          discountedAt: true,
          cancelledAt: true,
        },
      }),
      // Ingreso por extras: toppings de los pedidos entregados del día.
      prisma.orderItem.findMany({
        where: {
          order: {
            status: "ENTREGADO",
            deliveredAt: { gte: bounds.gte, lt: bounds.lt },
          },
        },
        select: { quantity: true, toppings: { select: { unitPrice: true } } },
      }),
      // Cuentas corrientes de pensionados: la recarga/pago de deuda es ingreso
      // real de caja del día; el consumo NO entra a la caja (ya se cobró o se
      // cobrará a fin de mes contra la cuenta del pensionado).
      prisma.customerLedger.findMany({
        where: { createdAt: { gte: bounds.gte, lt: bounds.lt } },
        select: { type: true, amount: true, paymentMethod: true },
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

  // Hora pico local: la hora con más pedidos creados.
  const hourly = new Array<number>(24).fill(0);
  for (const order of peakCreated) {
    const hour = Math.floor(zonedMinutes(order.createdAt) / 60);
    hourly[hour] += 1;
  }
  let peakHour: { hour: number; orders: number } | null = null;
  for (let hour = 0; hour < 24; hour += 1) {
    if (hourly[hour] > 0 && (!peakHour || hourly[hour] > peakHour.orders)) {
      peakHour = { hour, orders: hourly[hour] };
    }
  }

  let cancellationsCount = 0;
  let cancellationsLost = 0;
  let discountsTotal = 0;
  for (const order of adjustments) {
    if (order.status === "ANULADO" && order.cancelledAt) {
      cancellationsCount += 1;
      cancellationsLost += order.total;
    }
    if ((order.discountAmount ?? 0) > 0 && order.discountedAt) {
      discountsTotal += order.discountAmount ?? 0;
    }
  }

  // Los toppings se cobran por unidad: Σ(Σ precio topping) × cantidad.
  const toppingsRevenue = toppingItems.reduce(
    (acc, item) =>
      acc +
      item.toppings.reduce((a, t) => a + t.unitPrice, 0) * item.quantity,
    0,
  );

  // Cuentas corrientes: recargas/pagos de deuda entran a la caja como ingresos
  // reales del día; los consumos se cobran contra la cuenta y NO entran a la caja.
  const pensionRecharges = ledger
    .filter((l) => l.type === "RECARGA" || l.type === "PAGO_DEUDA")
    .reduce((acc, l) => acc + l.amount, 0);
  const pensionRechargeByMethod = new Map<string, number>();
  for (const l of ledger) {
    if (l.type !== "RECARGA" && l.type !== "PAGO_DEUDA") continue;
    const method = l.paymentMethod ?? "EFECTIVO";
    pensionRechargeByMethod.set(method, (pensionRechargeByMethod.get(method) ?? 0) + l.amount);
  }
  const pensionConsumption = ledger
    .filter((l) => l.type === "CONSUMO")
    .reduce((acc, l) => acc + l.amount, 0);

  return {
    revenueTotal,
    deliveredOrders: delivered.length,
    avgTicket:
      delivered.length > 0 ? Math.round(revenueTotal / delivered.length) : 0,
    avgDeliveryMinutes: avgDeliveryMinutes(delivered),
    payment: [...payment.entries()].map(([method, v]) => ({ method, ...v })),
    cancellationsCount,
    cancellationsLost,
    discountsTotal,
    toppingsRevenue,
    peakHour,
    pensionRecharges,
    pensionRechargeByMethod: [...pensionRechargeByMethod.entries()].map(
      ([method, revenue]) => ({ method, revenue }),
    ),
    pensionConsumption,
  };
}

export function buildReportMessage(key: string, stats: DailyReportStats): string {
  const payment = new Map(stats.payment.map((p) => [p.method, p]));
  const efectivo = payment.get("EFECTIVO")?.revenue ?? 0;
  const qr = payment.get("QR")?.revenue ?? 0;
  const tarjeta = payment.get("TARJETA")?.revenue ?? 0;

  const horaPico = stats.peakHour
    ? `${String(stats.peakHour.hour).padStart(2, "0")}:00 - ${String(
        stats.peakHour.hour,
      ).padStart(2, "0")}:59`
    : "—";

  const pagos =
    `• Efectivo: ${efectivo} Bs | QR: ${qr} Bs` +
    (tarjeta > 0 ? ` | Tarjeta: ${tarjeta} Bs` : "");

  const pensionRecharges =
    stats.pensionRechargeByMethod.length > 0
      ? stats.pensionRechargeByMethod
          .map((p) => `${p.method}: ${p.revenue} Bs`)
          .join(" | ")
      : "0 Bs";

  return [
    "📊 *CIERRE DIARIO BIBOSI* 📊",
    `📅 ${key}`,
    "",
    "💰 *FINANZAS*",
    `• Total: *${stats.revenueTotal} Bs*`,
    `• Ticket Promedio: ${stats.avgTicket} Bs`,
    pagos,
    "",
    "👵 *PENSIONADOS*",
    `• Recargas / Pagos de deuda (ingreso real de caja): ${pensionRecharges}`,
    `• Consumos por Cuenta (no entran a caja): ${stats.pensionConsumption} Bs`,
    "",
    "⏱ *OPERACIÓN*",
    `• Pedidos Entregados: ${stats.deliveredOrders}`,
    `• Tiempo Promedio: ${stats.avgDeliveryMinutes ?? "—"} min`,
    `• Hora Pico: ${horaPico}`,
    "",
    "🚨 *FUGAS Y ALERTAS*",
    `• Anulaciones: ${stats.cancellationsCount} (${stats.cancellationsLost} Bs)`,
    `• Descuentos: ${stats.discountsTotal} Bs`,
    `• Ingreso por Extras: ${stats.toppingsRevenue} Bs`,
  ].join("\n");
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