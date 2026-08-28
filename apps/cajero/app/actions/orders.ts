"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bubba/db";
import {
  AcceptablePayment,
  OrderStatus,
  Role,
  type PaymentMethod as PaymentMethodType,
} from "@bubba/types";
import { getRequiredSession } from "@/lib/session";

/** Registra el pago de un pedido. Al cobrar un pedido RECIBIDO (proveniente
 *  de la tienda web) lo pasa a ACEPTADO; los pedidos ya ACEPTADO o ENTREGADO
 *  (tomados en el POS) se cobran sin cambiar su estado, pues el cliente puede
 *  pagar después, incluso tras la entrega. La comanda ya se imprimió al crear. */
export async function acceptOrder(
  orderId: string,
  method: string,
  method2?: string,
  amount2?: number,
) {
  const session = await getRequiredSession();

  if (session.user.role === Role.MESERO) {
    throw new Error("No autorizado. Los meseros no pueden registrar pagos.");
  }

  if (!AcceptablePayment.includes(method as PaymentMethodType)) {
    throw new Error("Selecciona un método de pago válido: Efectivo o QR.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { toppings: true } } },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  if (
    order.status !== OrderStatus.RECIBIDO &&
    order.status !== OrderStatus.ACEPTADO &&
    order.status !== OrderStatus.ENTREGADO
  ) {
    throw new Error("No se puede registrar el pago de este pedido.");
  }

  if (order.paidAt) {
    throw new Error("Este pedido ya fue cobrado.");
  }

  let paymentMethod2: PaymentMethodType | null = null;
  let paymentAmount2: number | null = null;

  if (method2 && amount2 !== undefined) {
    if (!AcceptablePayment.includes(method2 as PaymentMethodType)) {
      throw new Error("El segundo método de pago no es válido.");
    }
    if (method2 === method) {
      throw new Error("Los dos métodos de pago deben ser distintos.");
    }
    if (amount2 <= 0) {
      throw new Error("El monto del segundo pago debe ser mayor a cero.");
    }
    if (amount2 >= order.total) {
      throw new Error("El monto del segundo pago debe ser menor al total.");
    }
    paymentMethod2 = method2 as PaymentMethodType;
    paymentAmount2 = Math.trunc(amount2);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      // Un pedido en RECIBIDO (web/store) se acepta al cobrarlo; los que ya
      // están ACEPTADO o ENTREGADO conservan su estado (el cobro es aparte).
      ...(order.status === OrderStatus.RECIBIDO
        ? { status: OrderStatus.ACEPTADO }
        : {}),
      paymentMethod: method as PaymentMethodType,
      paymentMethod2,
      paymentAmount2,
      paidAt: new Date(),
      userId: order.userId ?? session.user.id,
    },
  });

  revalidatePath("/");
}

/** Marca un pedido ACEPTADO como ENTREGADO. La entrega es independiente del
 *  cobro: el cliente puede pagar después, incluso tras la entrega. */
export async function deliverOrder(orderId: string) {
  const session = await getRequiredSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  if (order.status !== OrderStatus.ACEPTADO) {
    throw new Error("El pedido ya fue entregado.");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.ENTREGADO,
      // El momento de entrega se registra una sola vez.
      deliveredAt: order.deliveredAt ?? new Date(),
      userId: order.userId ?? session.user.id,
    },
  });

  revalidatePath("/");
}
