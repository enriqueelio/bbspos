import { prisma } from "@bubba/db";
import {
  FlavorCategoryList,
  type DailyReportData,
  type CategoryBreakdownRow,
} from "@bubba/types";
import { dailyQuerySchema, parseSearchParams } from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { dayBounds, localDateKey } from "@/lib/reports/range";

const CATEGORY_LABELS: Record<string, string> = {
  MILK: "Con leche",
  WATER: "Con agua",
  SPECIAL: "Especiales",
};

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = dailyQuerySchema.parse(parseSearchParams(url.searchParams));

    const date = query.date ?? (() => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/La_Paz",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(now)
        .split("-")
        .map(Number);
      return { year: parts[0], month: parts[1], day: parts[2] };
    })();

    const bounds = dayBounds(date);

    const [orders, cancelledAgg] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: bounds.gte, lt: bounds.lt }, ...notCancelled },
        include: { items: { include: { toppings: true } } },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: bounds.gte, lt: bounds.lt },
          status: "ANULADO",
        },
      }),
    ]);

    const discountsTotal = orders.reduce(
      (acc, o) => acc + (o.discountAmount ?? 0),
      0,
    );

    const paymentTotals = new Map<string, { orders: number; revenue: number }>();
    for (const order of orders) {
      if (!order.paymentMethod) continue;
      const entry =
        paymentTotals.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += order.total;
      paymentTotals.set(order.paymentMethod, entry);
    }
    const paymentBreakdown = [...paymentTotals.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([method, v]) => ({ method, ...v })) as DailyReportData["paymentBreakdown"];

    const revenueTotal = orders.reduce((acc, o) => acc + o.total, 0);
    const ordersTotal = orders.length;
    const avgTicket =
      ordersTotal > 0 ? Math.round(revenueTotal / ordersTotal) : 0;

    let itemsSold = 0;
    let toppingsRevenue = 0;
    const byCategory = new Map<string, CategoryBreakdownRow & { orderIds: Set<string> }>();
    for (const category of FlavorCategoryList) {
      byCategory.set(category, {
        category,
        orders: 0,
        units: 0,
        revenue: 0,
        orderIds: new Set(),
      });
    }

    for (const order of orders) {
      for (const item of order.items) {
        itemsSold += item.quantity;
        toppingsRevenue +=
          item.toppings.reduce((acc, t) => acc + t.unitPrice, 0) *
          item.quantity;

        const row = byCategory.get(item.flavorCategory);
        if (row) {
          row.orderIds.add(order.id);
          row.units += item.quantity;
          row.revenue +=
            item.unitPrice * item.quantity;
        }
      }
    }

    const data: DailyReportData = {
      date: localDateKey(date),
      revenueTotal,
      ordersTotal,
      avgTicket,
      itemsSold,
      toppingsRevenue,
      byCategory: FlavorCategoryList.map((c) => {
        const row = byCategory.get(c)!;
        return { category: row.category, orders: row.orderIds.size, units: row.units, revenue: row.revenue };
      }),
      paymentBreakdown,
      discountsTotal,
      cancellationsCount: cancelledAgg,
    };

    if (query.format === "csv") {
      const headers = [
        "Fecha",
        "Ingresos totales",
        "Órdenes totales",
        "Ticket promedio",
        "Bebidas vendidas",
        "Ingreso por toppings",
        "Categoría",
        "Órdenes categoría",
        "Unidades categoría",
        "Ingresos categoría",
      ];
      const rows = data.byCategory.map((row) => [
        data.date,
        data.revenueTotal,
        data.ordersTotal,
        data.avgTicket,
        data.itemsSold,
        data.toppingsRevenue,
        CATEGORY_LABELS[row.category] ?? row.category,
        row.orders,
        row.units,
        row.revenue,
      ]);
      return csvResponse(
        `cierre-diario-${data.date}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(reportEnvelope("daily-summary", bounds.gte, bounds.lt, data));
  });
}
