"use server";

import { prisma } from "@bubba/db";

/** Envía una alerta por Telegram cuando un pedido supera el tiempo de espera
 *  aceptable. Devuelve `true` si la alerta quedó confirmada (enviada, o ya la
 *  reclamó otra instancia) y `false` si falló y conviene reintentar.
 *
 *  El flag `delayNotified` se reclama de forma atómica ANTES de enviar, para
 *  que dos pestañas/tabs al mismo tiempo no manden mensajes duplicados. Si el
 *  envío falla, se libera el flag para que un reintento posterior lo intente. */
export async function notifyDelayedOrder(
  orderId: string,
  orderSeq: number,
  ageMinutes: number,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  // Reclamo atómico del flag: solo quien obtiene 1 fila actualizada envía.
  const claim = await prisma.order.updateMany({
    where: { id: orderId, delayNotified: false },
    data: { delayNotified: true },
  });

  if (claim.count === 0) {
    // Ya lo avisó otra instancia (o el pedido ya no aplica): nada que hacer.
    return true;
  }

  const text = `🚨 URGENTE: El Pedido #${orderSeq} lleva ${ageMinutes} minutos en espera y aún no se entrega.`;

  let ok = false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }

  if (!ok) {
    // Libera el flag para que el reintento (siguiente tick del reloj) lo intente.
    await prisma.order
      .update({
        where: { id: orderId },
        data: { delayNotified: false },
      })
      .catch(() => {});
    return false;
  }

  return true;
}