"use server";

import { prisma } from "@bbspos/db";
import { getRequiredSession } from "@/lib/session";
import { getCashierDailyData } from "@/lib/report";
import {
  formatReportText,
  getPrinterConfig,
  printComandas,
  printText,
  toComandaItem,
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

  await printComandas(
    settings,
    {
      seq: order.seq,
      daySeq: order.daySeq,
      customerName: order.customerName,
      notes: order.notes,
      deliveryType: order.deliveryType,
      scheduledFor: order.scheduledFor,
      reserveLeadMin: order.reserveLeadMin,
      createdAt: order.createdAt,
      total: order.total,
      items: order.items.map(toComandaItem),
    },
    {
      number: order.daySeq ?? order.seq,
      date: order.createdAt,
    },
  );

  return `Comandas del pedido #${String(order.daySeq ?? order.seq ?? 0).padStart(3, "0")} enviadas a la impresora.`;
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
