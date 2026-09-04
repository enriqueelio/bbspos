import { prisma } from "@bbspos/db";
import {
  FlavorCategoryList,
  type DailyReportData,
  type CategoryBreakdownRow,
} from "@bbspos/types";
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

// Filas devueltas por las consultas SQL nativas (SQLite devuelve agregaciones
// como números enteros grandes; se normalizan con Number()).
type CategoryRow = {
  flavorCategory: string;
  orders: number | bigint;
  units: number | bigint;
  revenue: number | bigint;
};

type ToppingsRow = {
  value: number | bigint;
};

// Desglose por categoría (COUNT DISTINCT de órdenes, unidades e ingresos por
// producto) delegado por completo a SQLite.
const CATEGORY_SQL = `
  SELECT oi."flavorCategory" AS flavorCategory,
         COUNT(DISTINCT oi."orderId") AS orders,
         COALESCE(SUM(oi."quantity"), 0) AS units,
         COALESCE(SUM(oi."unitPrice" * oi."quantity"), 0) AS revenue
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."createdAt" >= ? AND o."createdAt" < ? AND o."status" != 'ANULADO'
  GROUP BY oi."flavorCategory"
`;

// Ingreso por toppings (cada topping multiplicado por la cantidad del ítem).
const TOPPINGS_SQL = `
  SELECT COALESCE(SUM(t."unitPrice" * oi."quantity"), 0) AS value
  FROM "OrderItemTopping" t
  JOIN "OrderItem" oi ON oi.id = t."orderItemId"
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."createdAt" >= ? AND o."createdAt" < ? AND o."status" != 'ANULADO'
`;

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
    const { gte, lt } = bounds;

    // Todas las agregaciones se delegan a SQLite:
    //  - resumen de órdenes y descuentos (order.aggregate)
    //  - anulaciones (order.count)
    //  - desglose por categoría e ingreso por toppings (SQL nativo)
    //  - desglose por método de pago (solo campos ligeros, sin items/toppings)
    const [orderAgg, cancelledAgg, catRows, toppingsRows, payments] =
      await Promise.all([
        prisma.order.aggregate({
          where: { createdAt: { gte, lt }, ...notCancelled },
          _sum: { total: true, discountAmount: true },
          _count: { _all: true },
        }),
        prisma.order.count({
          where: { createdAt: { gte, lt }, status: "ANULADO" },
        }),
        prisma.$queryRawUnsafe<CategoryRow[]>(CATEGORY_SQL, gte, lt),
        prisma.$queryRawUnsafe<ToppingsRow[]>(TOPPINGS_SQL, gte, lt),
        prisma.order.findMany({
          where: { createdAt: { gte, lt }, ...notCancelled },
          select: {
            paymentMethod: true,
            paymentMethod2: true,
            paymentAmount2: true,
            total: true,
          },
        }),
      ]);

    const revenueTotal = Number(orderAgg._sum.total ?? 0);
    const ordersTotal = orderAgg._count._all;
    const avgTicket =
      ordersTotal > 0 ? Math.round(revenueTotal / ordersTotal) : 0;
    const discountsTotal = Number(orderAgg._sum.discountAmount ?? 0);

    const byCategoryMap = new Map<string, CategoryBreakdownRow & { units: number }>();
    for (const category of FlavorCategoryList) {
      byCategoryMap.set(category, {
        category,
        orders: 0,
        units: 0,
        revenue: 0,
      });
    }
    let itemsSold = 0;
    for (const row of catRows) {
      const entry = byCategoryMap.get(row.flavorCategory);
      if (!entry) continue;
      const units = Number(row.units);
      entry.orders = Number(row.orders);
      entry.units = units;
      entry.revenue = Number(row.revenue);
      itemsSold += units;
    }

    const toppingsRevenue = Number(toppingsRows[0]?.value ?? 0);

    const paymentTotals = new Map<string, { orders: number; revenue: number }>();
    for (const order of payments) {
      if (!order.paymentMethod) continue;

      if (order.paymentMethod2 && order.paymentAmount2 != null) {
        // Pago dividido
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
    const paymentBreakdown = [...paymentTotals.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([method, v]) => ({ method, ...v })) as DailyReportData["paymentBreakdown"];

    const data: DailyReportData = {
      date: localDateKey(date),
      revenueTotal,
      ordersTotal,
      avgTicket,
      itemsSold,
      toppingsRevenue,
      byCategory: FlavorCategoryList.map((c) => {
        const row = byCategoryMap.get(c)!;
        return { category: row.category, orders: row.orders, units: row.units, revenue: row.revenue };
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