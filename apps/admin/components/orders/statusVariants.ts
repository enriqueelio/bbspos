import { cva } from "class-variance-authority";
import { OrderStatus, type Order } from "@bbspos/types";

/* ------------------------------------------------------------------ */
/*  Estado visual de un pedido en la tabla de pedidos                  */
/* ------------------------------------------------------------------ */

/** Las condiciones visuales que se ven en una fila de la tabla (las 5 de la
 *  cola del cajero más ANULADO, que el admin sí filtra). No coinciden 1:1 con
 *  el status en BD (RECIBIDO/ACEPTADO/ENTREGADO/ANULADO) porque también
 *  dependen de si el pedido está cobrado (paidAt) y entregado. */
export type OrderVisualState =
  | "RECIBIDO"
  | "ACEPTADO"
  | "ENTREGADO_SIN_COBRAR"
  | "ENTREGADO_COBRADO"
  | "PAGADO_SIN_ENTREGAR"
  | "ANULADO";

export function visualStateOf(order: Order): OrderVisualState {
  if (order.status === OrderStatus.ANULADO) return "ANULADO";
  if (order.paidAt && order.deliveredAt) return "ENTREGADO_COBRADO";
  if (order.deliveredAt) return "ENTREGADO_SIN_COBRAR";
  if (order.paidAt) return "PAGADO_SIN_ENTREGAR";
  if (order.status === OrderStatus.RECIBIDO) return "RECIBIDO";
  return "ACEPTADO";
}

/* ------------------------------------------------------------------ */
/*  Paleta por estado                                                  */
/* ------------------------------------------------------------------ */

/** Badge de estado: RECIBIDO gris, ACEPTADO azul, ENTREGADO* verde,
 *  PAGADO_SIN_ENTREGAR naranja, ANULADO gris oscuro. */
export const orderBadgeVariants = cva("shrink-0 border-transparent font-bold", {
  variants: {
    visual: {
      RECIBIDO: "bg-slate-400 text-slate-950",
      ACEPTADO: "bg-blue-500 text-white",
      ENTREGADO_SIN_COBRAR: "bg-green-500 text-white",
      ENTREGADO_COBRADO: "bg-green-500 text-white",
      PAGADO_SIN_ENTREGAR: "bg-orange-500 text-white",
      ANULADO: "bg-slate-600 text-white",
    },
  },
  defaultVariants: { visual: "ACEPTADO" },
});

/** Borde izquierdo de la fila: azul (recibido), amarillo (aceptado), rojo
 *  pulsante (entregado sin cobrar), verde fijo (entregado cobrado / pagado
 *  sin entregar), neutro (anulado). */
export const orderCardVariants = cva("", {
  variants: {
    visual: {
      RECIBIDO: "border-l-blue-500",
      ACEPTADO: "border-l-amber-500",
      ENTREGADO_SIN_COBRAR: "border-l-red-500 animate-border-pulse",
      ENTREGADO_COBRADO: "border-l-green-500",
      PAGADO_SIN_ENTREGAR: "border-l-green-500",
      ANULADO: "border-l-slate-600",
    },
  },
  defaultVariants: { visual: "ACEPTADO" },
});