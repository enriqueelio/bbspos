"use server";

import { prisma } from "@bbspos/db";
import { getRequiredSession } from "@/lib/session";
import { getCashierDailyData } from "@/lib/report";
import {
  formatComanda,
  formatReportText,
  getPrinterConfig,
  printText,
} from "@/lib/printing";

/** Reimprime la comanda de un pedido en la impresora configurada. */
export async function reprintOrder(orderId: string): Promise<string> {
  await getRequiredSession();

  const settings = await getPrinterConfig();
  if (!settings) {
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

  // La comanda se reimprime mientras el pedido no esté entregado ni anulado,
  // para reponer copias (mesa, cocina) antes de terminar el servicio.
  if (
    order.status !== "RECIBIDO" &&
    order.status !== "ACEPTADO"
  ) {
    throw new Error(
      "La comanda ya no se puede reimprimir: el pedido fue entregado o anulado.",
    );
  }

  await printText(
    settings,
    formatComanda({
      seq: order.seq,
      daySeq: order.daySeq,
      customerName: order.customerName,
      notes: order.notes,
      deliveryType: order.deliveryType,
      createdAt: order.createdAt,
      total: order.total,
      items: order.items.map((item) => ({
        sizeName: item.sizeName,
        flavorName: item.flavorName,
        bobaTypeName: item.bobaTypeName,
        menuItemName: item.menuItemName,
        menuItemOptionName: item.menuItemOptionName,
        menuItemDetail: item.menuItemDetail,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        toppings: item.toppings.map((t) => ({
          toppingName: t.toppingName,
          unitPrice: t.unitPrice,
        })),
      })),
    }),
    {
      title: "ticket",
      number: order.daySeq ?? order.seq,
      date: order.createdAt,
    },
  );

  return `Comanda #${String(order.daySeq ?? order.seq ?? 0).padStart(3, "0")} enviada a la impresora.`;
}

/** Imprime el reporte del d�a del cajero conectado en la impresora configurada. */
export async function printDailyReport(): Promise<string> {
  const session = await getRequiredSession();

  const settings = await getPrinterConfig();
  if (!settings) {
    throw new Error(
      "No hay impresora configurada. Pide al administrador que la configure.",
    );
  }

  const data = await getCashierDailyData(session.user.id);
  await printText(settings, formatReportText(data, session.user.name ?? ""), {
    title: "reporte",
    date: data.date,
  });

  return `Reporte del d�a (${data.date}) enviado a la impresora.`;
}
