"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bubba/db";
import {
  OrderStatus,
  PaymentMethod,
  type PaymentMethod as PaymentMethodType,
} from "@bubba/types";
import { getRequiredSession } from "@/lib/session";

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

  if (order.status === OrderStatus.ENTREGADO) {
    throw new Error("El pedido ya está entregado.");
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

  revalidatePath("/orders");
  revalidatePath("/");
}

export async function cancelOrder(orderId: string, reason: string) {
  const session = await getRequiredSession();

  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error("Debes indicar el motivo de la anulación.");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido ya está anulado.");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.ANULADO,
      cancelledAt: new Date(),
      cancelReason: trimmed,
      userId: session.user.id,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/");
}

export async function markOrderPaid(orderId: string, method: string) {
  const session = await getRequiredSession();

  if (!Object.values(PaymentMethod).includes(method as PaymentMethodType)) {
    throw new Error("Método de pago no válido.");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: method as PaymentMethodType,
      ...(order.status === OrderStatus.INGRESADO
        ? {
            status: OrderStatus.ENTREGADO,
            deliveredAt: order.deliveredAt ?? new Date(),
          }
        : {}),
      userId: order.userId ?? session.user.id,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/");
}

export async function applyDiscount(
  orderId: string,
  amountBs: number,
  reason: string,
) {
  const session = await getRequiredSession();

  const trimmed = reason.trim();
  const amount = Math.trunc(amountBs);

  if (!trimmed) {
    throw new Error("Debes indicar el motivo del descuento.");
  }
  if (!Number.isFinite(amountBs) || amount <= 0) {
    throw new Error("El monto del descuento debe ser mayor a cero.");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  if (amount >= order.total) {
    throw new Error(
      "El descuento debe ser menor al total actual del pedido.",
    );
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      total: order.total - amount,
      discountAmount: order.discountAmount + amount,
      discountReason: trimmed,
      discountedAt: new Date(),
      userId: order.userId ?? session.user.id,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/");
}
