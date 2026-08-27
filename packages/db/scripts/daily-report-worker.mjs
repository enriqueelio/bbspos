// Worker de cierre de caja: envía el reporte del día a Telegram en cuanto el
// reloj local supera DAILY_REPORT_HOUR (default 23:20). Corre en segundo plano
// dentro del contenedor (docker-entrypoint.sh), sin dependencias externas.
//
// Regla auto-correctiva:
//   - si aún no es la hora de cierre, se reporta el día ANTERIOR (el día que ya
//     cerró), así se recupera un día perdido si el contenedor estuvo caído;
//   - si ya pasó la hora de cierre, se reporta el día en curso.
// Cada día queda marcado en DailyReportLog: no se reenvía aunque el contenedor
// reinicie. Si el envío falla, se reintenta en el siguiente ciclo (1 min).
//
// Uso:
//   node daily-report-worker.mjs                 -> bucle del servicio
//   node daily-report-worker.mjs --date=2026-08-26  -> envía ese día y sale
//   node daily-report-worker.mjs --dry-run=2026-08-26 -> imprime el mensaje sin enviar
//
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (requeridos), DAILY_REPORT_HOUR,
//      TIME_ZONE (default America/La_Paz).
import { PrismaClient } from "@prisma/client";

const TIME_ZONE = process.env.TIME_ZONE || "America/La_Paz";
const CUTOFF = parseCutoff(process.env.DAILY_REPORT_HOUR || "23:20");
const LOOP_MS = 60_000;
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const prisma = new PrismaClient();

const PAYMENT_LABEL = { EFECTIVO: "Efectivo", QR: "QR", TARJETA: "Tarjeta" };

function requireTelegramEnv() {
  if (!TOKEN || !CHAT_ID) {
    console.error(
      "[daily-report] Faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID; no se inicia.",
    );
    process.exit(1);
  }
}

function parseCutoff(value) {
  const [h, m] = String(value).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Clave local (YYYY-MM-DD) y minutos del día de un instante, en la zona del restaurante. */
export function localParts(date) {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [h, m] = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date).split(":").map(Number);
  return { key, minutes: h * 60 + m };
}

export function shiftDay(key, delta) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Día a reportar según la hora local actual. */
export function targetKey(date) {
  const { key, minutes } = localParts(date);
  return minutes >= CUTOFF ? key : shiftDay(key, -1);
}

/** Medianoche local del día (UTC) — offset fijo -4, sin horario de verano. */
function zonedStartOfDay(key) {
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

function dayBounds(key) {
  const start = zonedStartOfDay(key);
  return { gte: start, lt: new Date(start.getTime() + 24 * 3_600_000) };
}

function avgDeliveryMinutes(orders) {
  const valid = orders.filter((o) => o.deliveredAt);
  if (valid.length === 0) return null;
  const total = valid.reduce(
    (acc, o) => acc + (o.deliveredAt.getTime() - o.createdAt.getTime()) / 60_000,
    0,
  );
  return Math.round(total / valid.length);
}

function durationLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${h} h ${rest} min` : `${h} h`;
}

/** Métricas globales del día (todos los cajeros). */
export async function collectStats(key) {
  const bounds = dayBounds(key);

  const [delivered, createdCount, topItems] = await Promise.all([
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

  const payment = new Map();
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

  const byProduct = new Map();
  for (const item of topItems) {
    const name = `${item.sizeName} ${item.flavorName} (${item.bobaTypeName})`;
    byProduct.set(name, (byProduct.get(name) ?? 0) + item.quantity);
  }
  const top = [...byProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return {
    revenueTotal,
    deliveredOrders: delivered.length,
    createdOrders: createdCount,
    avgTicket:
      delivered.length > 0 ? Math.round(revenueTotal / delivered.length) : 0,
    avgDeliveryMinutes: avgDeliveryMinutes(delivered),
    payment: [...payment.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([method, v]) => ({ method, ...v })),
    top,
  };
}

export function buildMessage(key, stats) {
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

async function sendDailyReport(key) {
  const stats = await collectStats(key);
  const text = buildMessage(key, stats);

  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  });

  if (!res.ok) {
    throw new Error(`Telegram respondió ${res.status}: ${await res.text()}`);
  }

  await prisma.dailyReportLog.upsert({
    where: { date: key },
    create: { date: key },
    update: {},
  });
}

async function loop() {
  const target = targetKey(new Date());
  try {
    const sent = await prisma.dailyReportLog.findUnique({
      where: { date: target },
      select: { date: true },
    });
    if (sent) return;
    console.log(`[daily-report] Enviando cierre de caja para ${target}...`);
    await sendDailyReport(target);
    console.log(`[daily-report] Enviado ${target}.`);
  } catch (err) {
    console.error(`[daily-report] Fallo al reportar ${target}:`, err.message);
  }
}

async function main() {
  const dateArg = process.argv.find((a) => a.startsWith("--date="));
  const dryArg = process.argv.find((a) => a.startsWith("--dry-run="));
  if (dateArg || dryArg) {
    const key = (dateArg ?? dryArg).split("=")[1];
    try {
      if (dryArg) {
        console.log(buildMessage(key, await collectStats(key)));
        await prisma.$disconnect();
        return;
      }
      requireTelegramEnv();
      await sendDailyReport(key);
      console.log(`[daily-report] Enviado manualmente ${key}.`);
      await prisma.$disconnect();
    } catch (err) {
      console.error(`[daily-report] Fallo al reportar ${key}:`, err.message);
      await prisma.$disconnect().catch(() => {});
      process.exit(1);
    }
    return;
  }

  // Servicio: revisa cada minuto.
  requireTelegramEnv();
  await loop();
  setInterval(loop, LOOP_MS);
  console.log(
    `[daily-report] Activo. Hora de cierre ${process.env.DAILY_REPORT_HOUR || "23:20"} (${TIME_ZONE}).`,
  );
}

// Solo corre como entrada; importarlo desde otro script expone helpers puros.
if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  main().catch((err) => {
    console.error("[daily-report] Error fatal:", err.message);
    process.exit(1);
  });
}
