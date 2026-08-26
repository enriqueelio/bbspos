import { prisma } from "@bubba/db";
import { OrderStatus, type CashierDailyData } from "@bubba/types";
import { dayBounds, todayKey } from "@/lib/day";

function avgDeliveryMinutes(
  orders: { createdAt: Date; deliveredAt: Date | null }[],
): number | null {
  const valid = orders.filter((o) => o.deliveredAt !== null);
  if (valid.length === 0) return null;
  const totalMinutes = valid.reduce(
    (acc, o) =>
      acc + (o.deliveredAt!.getTime() - o.createdAt.getTime()) / 60_000,
    0,
  );
  return Math.round(totalMinutes / valid.length);
}

/**
 * Reporte del día del cajero: KPIs globales del día (solo pedidos entregados)
 * y rendimiento exclusivo del usuario conectado.
 */
export async function getCashierDailyData(
  userId: string,
): Promise<CashierDailyData> {
  const key = todayKey();
  const bounds = dayBounds(key);

  const delivered = await prisma.order.findMany({
    where: {
      status: OrderStatus.ENTREGADO,
      deliveredAt: { gte: bounds.gte, lt: bounds.lt },
    },
    select: {
      total: true,
      paymentMethod: true,
      paymentMethod2: true,
      paymentAmount2: true,
      userId: true,
      createdAt: true,
      deliveredAt: true,
    },
  });

  const revenueTotal = delivered.reduce((acc, o) => acc + o.total, 0);

  const paymentTotals = new Map<string, { orders: number; revenue: number }>();
  for (const order of delivered) {
    if (!order.paymentMethod) continue;

    if (order.paymentMethod2 && order.paymentAmount2 != null) {
      // Pago dividido: el primer método recibe (total - amount2), el segundo recibe amount2
      const amount1 = order.total - order.paymentAmount2;
      const entry1 = paymentTotals.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
      entry1.orders += 1;
      entry1.revenue += amount1;
      paymentTotals.set(order.paymentMethod, entry1);

      const entry2 = paymentTotals.get(order.paymentMethod2) ?? { orders: 0, revenue: 0 };
      entry2.orders += 1;
      entry2.revenue += order.paymentAmount2;
      paymentTotals.set(order.paymentMethod2, entry2);
    } else {
      // Pago simple
      const entry = paymentTotals.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += order.total;
      paymentTotals.set(order.paymentMethod, entry);
    }
  }

  const mine = delivered.filter((o) => o.userId === userId);

  return {
    date: key,
    revenueTotal,
    deliveredOrders: delivered.length,
    avgTicket:
      delivered.length > 0 ? Math.round(revenueTotal / delivered.length) : 0,
    avgDeliveryMinutes: avgDeliveryMinutes(delivered),
    myDeliveredOrders: mine.length,
    myAvgDeliveryMinutes: avgDeliveryMinutes(mine),
    paymentBreakdown: [...paymentTotals.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([method, v]) => ({
        method: method as CashierDailyData["paymentBreakdown"][number]["method"],
        ...v,
      })),
  };
}
