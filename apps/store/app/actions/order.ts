"use server";

import { prisma } from "@bubba/db";
import { computeDrinkPrice, type CartItem } from "@bubba/types";

export async function createOrder(
  items: CartItem[],
): Promise<{ orderId: string }> {
  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  const orderItems = items.map((item) => ({
    sizeName: item.size.name,
    flavorName: item.flavor.name,
    flavorCategory: item.flavor.category,
    bobaTypeName: item.bobaType.name,
    unitPrice: computeDrinkPrice(item.size, item.flavor, item.bobaType),
    quantity: item.quantity,
  }));

  const total = orderItems.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0,
  );

  const order = await prisma.order.create({
    data: {
      total,
      items: {
        create: orderItems,
      },
    },
  });

  return { orderId: order.id };
}
