// Alertas de pedidos retrasados por Telegram (server-side).
//
// Sustituye la notificación que antes vivía en el navegador del cajero: ya no
// depende de que el módulo esté abierto o minimizado. Un proceso en segundo
// plano (packages/db/scripts/telegram-alert-worker.ts) llama a
// `checkDelayedOrders()` periódicamente y revisa todos los pedidos activos que
// llevan más de DELAY_ALERT_MINUTES (default 10) minutos sin entregarse.
//
// Anti-spam: usar `delayNotified` en cada pedido (se marca tras el primer
// envío) e `updateMany` atómico para que varias instancias del worker nunca
// envíen el mismo mensaje dos veces. Si el envío a Telegram falla, el flag se
// libera y el siguiente tick reintenta.
//
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (requeridos),
//      DELAY_ALERT_MINUTES (opcional, default 10), TIME_ZONE (opcional).
import { prisma } from "./index";

const DEFAULT_ALERT_MINUTES = 10;

function alertMinutes(): number {
  const raw = Number(process.env.DELAY_ALERT_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ALERT_MINUTES;
}

function minutesSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
}

function durationLabel(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  return rest > 0 ? `${h} h ${rest} min` : `${h} h`;
}

/** Envía el aviso de un pedido retrasado al bot de Telegram. */
async function sendAlert(
  seq: number,
  name: string | null,
  minutes: number,
  status: string,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const cliente = name && name.trim() !== "" ? `\n👤 Cliente: ${name}` : "";
  const estado =
    status === "ENTREGADO"
      ? "ENTREGADO sin registrar pago"
      : "esperando entrega/cobro";

  const text = [
    "🚨 *PEDIDO ATRASADO* 🚨",
    `🍹 Pedido *#${seq}* lleva *${durationLabel(minutes)}* en espera.`,
    `📋 Estado: ${estado}.`,
    cliente,
    "⏰ Por favor atiéndelo a la brevedad.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Revisa los pedidos activos que superan el límite de minutos y envía la
 * alerta Telegram una sola vez por pedido. Devuelve la cantidad de avisos
 * enviados en esta pasada.
 */
export async function checkDelayedOrders(): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return 0;

  const cutoff = Date.now() - alertMinutes() * 60_000;

  const candidates = await prisma.order.findMany({
    where: {
      delayNotified: false,
      paidAt: null,
      createdAt: { lte: new Date(cutoff) },
      OR: [
        { status: "ACEPTADO" }, // No entregado (ni cobrado a veces)
        { status: "ENTREGADO" }, // Entregado sin cobrar (fuga de caja)
      ],
    },
    select: { id: true, seq: true, customerName: true, createdAt: true, status: true },
  });

  let sent = 0;
  for (const order of candidates) {
    const minutes = minutesSince(order.createdAt);
    if (minutes < alertMinutes()) continue;

    // Reclamo atómico: solo una instancia logra marcar `delayNotified: true`.
    const claim = await prisma.order.updateMany({
      where: { id: order.id, delayNotified: false },
      data: { delayNotified: true },
    });
    if (claim.count === 0) continue; // Otra instancia ya lo está enviando.

    const ok = await sendAlert(
      order.seq ?? 0,
      order.customerName,
      minutes,
      order.status,
    );

    if (!ok) {
      // Libera el flag para que el siguiente tick reintente.
      await prisma.order
        .update({
          where: { id: order.id },
          data: { delayNotified: false },
        })
        .catch(() => {});
      continue;
    }
    sent += 1;
  }

  return sent;
}
