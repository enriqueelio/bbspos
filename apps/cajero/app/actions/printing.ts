"use server";

import { prisma } from "@bubba/db";
import { getRequiredSession } from "@/lib/session";
import { formatComanda, getPrinterName, printText } from "@/lib/printing";

/** Reimprime la comanda de un pedido en la impresora configurada. */
export async function reprintOrder(orderId: string): Promise<string> {
  await getRequiredSession();

  const printerName = getPrinterName();
  if (!printerName) {
    throw new Error(
      "No hay impresora configurada. Pide al administrador que la configure.",
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

  return `Comanda #${String(order.seq ?? 0).padStart(5, "0")} enviada a la impresora.`;
}
