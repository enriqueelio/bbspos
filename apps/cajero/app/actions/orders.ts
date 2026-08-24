"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bubba/db";
import { OrderStatus } from "@bubba/types";
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

  if (order.status !== OrderStatus.INGRESADO) {
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
