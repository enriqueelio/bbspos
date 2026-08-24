import { OrderStatus } from "@bubba/types";

/** Condición compartida: las ventas no incluyen órdenes anuladas. */
export const notCancelled = {
  status: { not: OrderStatus.ANULADO },
} as const;
