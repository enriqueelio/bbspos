"use server";

import { prisma } from "@bubba/db";
import { getRequiredSession } from "@/lib/session";
import { getCashierDailyData } from "@/lib/report";
import {
  formatComanda,
  formatReportText,
  getPrinterName,
  printText,
} from "@/lib/printing";

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

  // La comanda solo se reimprime mientras el pedido está por cobrar.
  if (order.status !== "RECIBIDO") {
    throw new Error(
      "La comanda ya no se puede reimprimir: el pedido fue aceptado.",
    );
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

/** Imprime el reporte del d�a del cajero conectado en la impresora configurada. */
export async function printDailyReport(): Promise<string> {
  const session = await getRequiredSession();

  const printerName = getPrinterName();
  if (!printerName) {
    throw new Error(
      "No hay impresora configurada. Pide al administrador que la configure.",
    );
  }

  const data = await getCashierDailyData(session.user.id);
  await printText(
    printerName,
    formatReportText(data, session.user.name ?? ""),
  );

  return `Reporte del d�a (${data.date}) enviado a la impresora.`;
}
