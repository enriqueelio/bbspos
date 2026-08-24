"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bubba/db";
import {
  AcceptablePayment,
  OrderStatus,
  type PaymentMethod as PaymentMethodType,
} from "@bubba/types";
import { getRequiredSession } from "@/lib/session";
import {
  formatComanda,
  getPrinterConfig,
  printText,
} from "@/lib/printing";

/** Registra el pago de un pedido RECIBIDO y lo pasa a ACEPTADO. */
export async function acceptOrder(orderId: string, method: string) {
  const session = await getRequiredSession();

  if (!AcceptablePayment.includes(method as PaymentMethodType)) {
    throw new Error(
      "Selecciona un método de pago válido: Efectivo o QR.",
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  if (order.status !== OrderStatus.RECIBIDO) {
    throw new Error(
      "Solo los pedidos en estado Recibido pueden aceptarse con pago.",
    );
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.ACEPTADO,
      paymentMethod: method as PaymentMethodType,
      paidAt: new Date(),
      userId: order.userId ?? session.user.id,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/");
}

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

  if (order.status === OrderStatus.RECIBIDO) {
    throw new Error(
      "El pedido aún no está pagado: registra el pago antes de entregarlo.",
    );
  }

  if (order.status !== OrderStatus.ACEPTADO) {
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

/** Reimprime la comanda de un pedido en la impresora configurada. */
export async function reprintOrder(orderId: string): Promise<string> {
  await getRequiredSession();

  const printerName = (await getPrinterConfig())?.printerName;
  if (!printerName) {
    throw new Error(
      "Configura primero la impresora de comandas en la pesta�a Impresora.",
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { toppings: true } } },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  await printText(
    printerName,
    formatComanda({
      seq: order.seq,
      customerName: order.customerName,
      createdAt: order.createdAt,
      total: order.total,
      items: order.items.map((item) => ({
        sizeName: item.sizeName,
        flavorName: item.flavorName,
        bobaTypeName: item.bobaTypeName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        toppings: item.toppings.map((t) => ({
          toppingName: t.toppingName,
          unitPrice: t.unitPrice,
        })),
      })),
    }),
  );

  return `Comanda #${String(order.seq ?? 0).padStart(5, "0")} enviada a "${printerName}".`;
}
