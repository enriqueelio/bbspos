import { OrderStatus } from "@bbspos/types";

/** Condición compartida: las ventas no incluyen órdenes anuladas. */
export const notCancelled = {
  status: { not: OrderStatus.ANULADO },
} as const;
