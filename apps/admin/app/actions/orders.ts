"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import {
  AcceptablePayment,
  OrderStatus,
  type PaymentMethod as PaymentMethodType,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import {
  formatComanda,
  getPrinterConfig,
  printText,
} from "@/lib/printing";

/** El usuario de la sesión puede haber sido eliminado de la DB tras el login
 *  (la sesión es JWT y no se invalida al borrar al usuario). Asignar su id como
 *  clave foránea generaría un error P2003, así que solo lo devolvemos si el
 *  usuario sigue existiendo; en caso contrario, null. */
async function resolveSessionUserId(sessionUserId: string): Promise<string | null> {
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true },
  });
  return dbUser ? dbUser.id : null;
}

/** Registra el pago de un pedido RECIBIDO y lo pasa a ACEPTADO.
 *  Soporta pago simple (un método) o dividido (dos métodos con montos). */
export async function acceptOrder(
  orderId: string,
  method: string,
  method2?: string,
  amount2?: number,
) {
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
      status: OrderStatus.ACEPTADO,
      paymentMethod: method as PaymentMethodType,
      paymentMethod2,
      paymentAmount2,
      paidAt: new Date(),
      userId: order.userId ?? (await resolveSessionUserId(session.user.id)),
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
      userId: order.userId ?? (await resolveSessionUserId(session.user.id)),
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
      // Quién ejecutó la anulación (FK vinculada al usuario real de sesión).
      canceledById: await resolveSessionUserId(session.user.id),
      // Conserva el usuario original del pedido: el usuario de sesión
      // puede no existir en la tabla de usuarios y rompería la FK.
      userId: order.userId ?? (await resolveSessionUserId(session.user.id)),
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
      // Quién aplicó el descuento (FK vinculada al usuario real de sesión).
      discountedById: await resolveSessionUserId(session.user.id),
      userId: order.userId ?? (await resolveSessionUserId(session.user.id)),
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
      daySeq: order.daySeq,
      customerName: order.customerName,
      createdAt: order.createdAt,
      total: order.total,
      items: order.items.map((item) => ({
        sizeName: item.sizeName,
        flavorName: item.flavorName,
        bobaTypeName: item.bobaTypeName,
        menuItemName: item.menuItemName,
        menuItemOptionName: item.menuItemOptionName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        toppings: item.toppings.map((t) => ({
          toppingName: t.toppingName,
          unitPrice: t.unitPrice,
        })),
      })),
    }),
  );

  return `Comanda #${String(order.daySeq ?? order.seq ?? 0).padStart(5, "0")} enviada a "${printerName}".`;
}
