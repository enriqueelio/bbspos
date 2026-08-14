"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bubba/db";
import {
  OrderStatusSequence,
  type OrderStatus,
} from "@bubba/types";
import { getRequiredSession } from "@/lib/session";

export async function advanceOrderStatus(orderId: string) {
  await getRequiredSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  const idx = OrderStatusSequence.indexOf(order.status as OrderStatus);
  if (idx < 0 || idx >= OrderStatusSequence.length - 1) {
    throw new Error("El pedido ya está entregado.");
  }

  const next = OrderStatusSequence[idx + 1];

  await prisma.order.update({
    where: { id: orderId },
    data: { status: next },
  });

  revalidatePath("/orders");
  revalidatePath("/");
}
