import { cva } from "class-variance-authority";
import { OrderStatus, OrderType, type Order } from "@bbspos/types";

/* ------------------------------------------------------------------ */
/*  Estado visual de un pedido en la cola                              */
/* ------------------------------------------------------------------ */

/** Las 5 condiciones visuales que se ven en la tarjeta de la cola. No
 *  coinciden 1:1 con el status en BD (RECIBIDO/ACEPTADO/ENTREGADO) porque
 *  también dependen de si el pedido está cobrado (paidAt) y entregado. */
export type OrderVisualState =
  | "RECIBIDO"
  | "ACEPTADO"
  | "ENTREGADO_SIN_COBRAR"
  | "ENTREGADO_COBRADO"
  | "PAGADO_SIN_ENTREGAR";

export function visualStateOf(order: Order): OrderVisualState {
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
 *  PAGADO_SIN_ENTREGAR naranja. */
export const orderBadgeVariants = cva("shrink-0 border-transparent font-bold", {
  variants: {
    visual: {
      RECIBIDO: "bg-slate-400 text-slate-950",
      ACEPTADO: "bg-blue-500 text-white",
      ENTREGADO_SIN_COBRAR: "bg-green-500 text-white",
      ENTREGADO_COBRADO: "bg-green-500 text-white",
      PAGADO_SIN_ENTREGAR: "bg-orange-500 text-white",
    },
  },
  defaultVariants: { visual: "ACEPTADO" },
});

/** Borde de la tarjeta: azul (recibido), amarillo pulsante (aceptado),
 *  rojo pulsante (entregado sin cobrar), neutro (entregado cobrado /
 *  completado), verde pulsante (pagado sin entregar). */
export const orderCardVariants = cva("animate-in fade-in slide-in-from-bottom-4 duration-200", {
  variants: {
    visual: {
      RECIBIDO: "border-blue-500 animate-glow ring-1 ring-blue-500/60",
      ACEPTADO: "border-amber-500 animate-name-glow ring-1 ring-amber-500/60",
      ENTREGADO_SIN_COBRAR:
        "border-red-500 animate-glow-red ring-1 ring-red-500/60",
      ENTREGADO_COBRADO: "",
      PAGADO_SIN_ENTREGAR:
        "border-green-500 animate-glow-green ring-1 ring-green-500/60",
    },
  },
  defaultVariants: { visual: "ACEPTADO" },
});

/* ------------------------------------------------------------------ */
/*  Texto de antigüedad ("hace X min / tardó X")                       */
/* ------------------------------------------------------------------ */

/** A partir de esta antigüedad el tiempo se pinta rojo (crítico).
 *  Por debajo, se muestra en el color neutro del encabezado. */
export const AGE_CRITICAL_MINUTES = 30;

export const ageTextVariants = cva("font-bold", {
  variants: {
    critical: {
      true: "text-red-500",
      false: "text-slate-400",
    },
  },
  defaultVariants: { critical: false },
});

export const orderTypeBackgroundVariants = cva("transition-all duration-300", {
  variants: {
    orderType: {
      MESA: "",
      LLEVAR: "",
      DELIVERY:
        "bg-purple-500/15 shadow-[0_0_14px_rgba(168,85,247,0.9),0_0_45px_rgba(168,85,247,0.35)]",
    },
  },
  defaultVariants: { orderType: OrderType.LLEVAR },
});