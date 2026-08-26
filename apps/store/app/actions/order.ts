"use server";

import { after } from "next/server";
import { prisma } from "@bubba/db";
import { sumToppings, type CartItem } from "@bubba/types";
import { formatComanda, getPrinterName, printText } from "@/lib/printing";

export async function createOrder(
  items: CartItem[],
  customerName?: string,
  deliveryType?: "MESA" | "LLEVAR" | null,
): Promise<{ orderId: string; seq: number; total: number }> {
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

  const order = await prisma.$transaction(async (tx) => {
    const last = await tx.order.findFirst({
      orderBy: { seq: "desc" },
      select: { seq: true },
    });
    const seq = (last?.seq ?? 0) + 1;
    return tx.order.create({
      data: {
        customerName: customerName.trim(),
        deliveryType: deliveryType ?? undefined,
        seq,
        total,
        items: {
          create: orderItems,
        },
      },
    });
  });

  // Impresión automática de la comanda, best-effort y fuera del request:
  // un fallo de impresora nunca debe impedir crear el pedido.
  after(async () => {
    try {
      const printerName = getPrinterName();
      if (!printerName) return;

      const full = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: { include: { toppings: true } } },
      });

      await printText(
        printerName,
        formatComanda({
          seq: full.seq,
          customerName: full.customerName,
          createdAt: full.createdAt,
          total: full.total,
          items: full.items.map((item) => ({
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
    } catch {
      // Sin impresora o con fallo de impresión: el pedido sigue válido.
    }
  });

  return { orderId: order.id, seq: order.seq ?? 0, total };
}
