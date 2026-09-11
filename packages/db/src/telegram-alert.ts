// Alertas de pedidos retrasados por Telegram (server-side).
//
// Sustituye la notificación que antes vivía en el navegador del cajero: ya no
// depende de que el módulo esté abierto o minimizado. Un proceso en segundo
// plano (packages/db/scripts/telegram-alert-worker.ts) llama a
// `checkDelayedOrders()` periódicamente y revisa todos los pedidos activos
// cuyo tiempo transcurrido supera el tiempo estimado de producción del pedido
// (demora = transcurrido - tiempoEstimado; si demora > 0, se notifica).
//
// Anti-spam: usar `delayNotified` en cada pedido (se marca tras el primer
// envío) e `updateMany` atómico para que varias instancias del worker nunca
// envíen el mismo mensaje dos veces. Si el envío a Telegram falla, el flag se
// libera y el siguiente tick reintenta. Cuando el pedido se cobra (paidAt),
// el flag se resetea a free para mantener la cadena limpia.
//
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (requeridos).
import { prisma } from "./index";

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
  estimated: number,
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
    `🍹 Pedido *#${seq}* lleva *${durationLabel(minutes)}* (estimado *${estimated} min*).`,
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
 * Revisa los pedidos activos que superan su tiempo estimado de producción y
 * envía la alerta Telegram una sola vez por pedido. Devuelve la cantidad de
 * avisos enviados en esta pasada.
 */
export async function checkDelayedOrders(): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return 0;

  // Pedidos ya cobrados: liberan el flag para no arrastrar el "notificado".
  await prisma.order.updateMany({
    where: { delayNotified: true, paidAt: { not: null } },
    data: { delayNotified: false },
  });

  // Pedidos activos sin notificar. El reloj arranca en el inicio unificado:
  // COALESCE(acceptedAt, createdAt) — igual que el badge del cajero.
  const rows = (await prisma.$queryRaw<
    {
      id: string;
      seq: number | null;
      daySeq: number | null;
      customerName: string | null;
      status: string;
      createdAt: Date;
      acceptedAt: Date | null;
      tiempoEstimado: number;
    }[]
  >`
    SELECT id, seq, daySeq, customerName, status, createdAt, acceptedAt, tiempoEstimado
    FROM "Order"
    WHERE delayNotified = 0
      AND paidAt IS NULL
      AND status IN ('ACEPTADO', 'ENTREGADO')
  `) ?? [];

  let sent = 0;
  for (const order of rows) {
    const start = order.acceptedAt ?? order.createdAt;
    const minutes = minutesSince(new Date(start));
    const demora = minutes - order.tiempoEstimado;
    // Solo se alerta cuando el pedido ya superó su tiempo estimado.
    if (demora <= 0) continue;

    // Reclamo atómico: solo una instancia logra marcar `delayNotified: true`.
    const claim = await prisma.order.updateMany({
      where: { id: order.id, delayNotified: false },
      data: { delayNotified: true },
    });
    if (claim.count === 0) continue; // Otra instancia ya lo está enviando.

    const ok = await sendAlert(
      order.daySeq ?? order.seq ?? 0,
      order.customerName,
      minutes,
      order.tiempoEstimado,
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