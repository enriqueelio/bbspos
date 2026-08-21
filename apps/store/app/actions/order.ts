"use server";

import { prisma } from "@bubba/db";
import { sumToppings, type CartItem } from "@bubba/types";

export async function createOrder(
  items: CartItem[],
  customerName?: string,
): Promise<{ orderId: string; total: number }> {
  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }
  if (!customerName?.trim()) {
    throw new Error("Falta el nombre del cliente");
  }

  const orderItems = items.map((item) => ({
    sizeName: item.size.name,
    flavorName: item.flavor.name,
    flavorCategory: item.category,
    bobaTypeName: item.bobaType.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    toppings: {
      create: item.toppings.map((t) => ({
        toppingName: t.name,
        unitPrice: t.price,
      })),
    },
  }));

  const total = items.reduce(
    (acc, item) =>
      acc + (item.unitPrice + sumToppings(item.toppings)) * item.quantity,
    0,
  );

  const order = await prisma.order.create({
    data: {
      customerName: customerName.trim(),
      total,
      items: {
        create: orderItems,
      },
    },
  });

  return { orderId: order.id, total };
}
