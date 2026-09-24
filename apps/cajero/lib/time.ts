import type { Order } from "@bbspos/types";

/** Ventana efectiva de producción de una reserva: aunque el pedido esté
 *  confirmado, la producción debería arrancar a más tardar en
 *  `scheduledFor - tiempoEstimado`, así el reloj de demora no se prende antes
 *  de la franja planificada. Devuelve ese instante (o el inicio unificado). */
function effectiveStartMs(order: {
  acceptedAt?: string | null;
  createdAt: string;
  scheduledFor?: string | null;
  tiempoEstimado?: number;
}): number {
  const base = new Date(order.acceptedAt ?? order.createdAt).getTime();
  if (!order.scheduledFor) return base;
  const productionStart =
    new Date(order.scheduledFor).getTime() -
    (order.tiempoEstimado ?? 10) * 60_000;
  return Math.max(base, productionStart);
}

/** Inicio del reloj de un pedido: el momento en que se aceptó y empezó a
 *  prepararse (acceptedAt), o —si nunca se aceptó— el momento en que se
 *  creó (createdAt). Es la fuente única de verdad del "timer" de demora.
 *  En una reserva el reloj arranca en scheduledFor - tiempoEstimado (nunca
 *  antes), para no contar demora mientras el pedido espera su franja. */
export function getStartTime(order: Pick<Order, "acceptedAt" | "createdAt" | "scheduledFor" | "tiempoEstimado">): Date {
  return new Date(effectiveStartMs(order));
}

/** Demora en minutos: tiempo transcurrido (desde el inicio del reloj hasta un
 *  momento dado) menos el tiempo estimado de producción del pedido. Valor
 *  positivo = el pedido ya se pasó de su tiempo estimado. */
export function delayMinutes(
  order: Pick<Order, "acceptedAt" | "createdAt" | "tiempoEstimado" | "scheduledFor">,
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