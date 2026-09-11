import type { Order } from "@bbspos/types";

/** Inicio del reloj de un pedido: el momento en que se aceptó y empezó a
 *  prepararse (acceptedAt), o —si nunca se aceptó— el momento en que se
 *  creó (createdAt). Es la fuente única de verdad del "timer" de demora. */
export function getStartTime(order: Pick<Order, "acceptedAt" | "createdAt">): Date {
  return new Date(order.acceptedAt ?? order.createdAt);
}

/** Demora en minutos: tiempo transcurrido (desde el inicio del reloj hasta un
 *  momento dado) menos el tiempo estimado de producción del pedido. Valor
 *  positivo = el pedido ya se pasó de su tiempo estimado. */
export function delayMinutes(
  order: Pick<Order, "acceptedAt" | "createdAt" | "tiempoEstimado">,
  nowMs: number,
): number {
  const start = getStartTime(order).getTime();
  const elapsed = Math.max(0, Math.floor((nowMs - start) / 60_000));
  return elapsed - (order.tiempoEstimado ?? 10);
}

export type DelayLevel = "ok" | "warning" | "critical";

/** Nivel visual de una demora: a tiempo hasta 0, en aviso hasta 5 min y
 *  crítico (prioridad) a partir de ahí. */
export function delayLevelOf(demora: number): DelayLevel {
  if (demora <= 0) return "ok";
  if (demora < 5) return "warning";
  return "critical";
}