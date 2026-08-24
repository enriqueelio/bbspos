import { prisma } from "@bubba/db";
import type { SalesRangeData, SalesRangePoint } from "@bubba/types";
import {
  assertRange,
  parseSearchParams,
  salesRangeQuerySchema,
} from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import {
  dayKeyOf,
  isoWeekKeyOf,
  monthKeyOf,
  previousPeriodRange,
  rangeBounds,
  zonedToUtc,
} from "@/lib/reports/range";

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = salesRangeQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    const bounds = rangeBounds(query.from, query.to);
    const prev = previousPeriodRange(query.from, query.to);
    const prevBounds = rangeBounds(prev.from, prev.to);

    const [orders, prevRevenueAgg] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: bounds.gte, lt: bounds.lt },
          ...(query.status ? { status: query.status } : notCancelled),
        },
        select: { createdAt: true, total: true },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: prevBounds.gte, lt: prevBounds.lt },
          ...notCancelled,
        },
        _sum: { total: true },
      }),
    ]);

    const bucketOf =
      query.granularity === "day"
        ? dayKeyOf
        : query.granularity === "week"
          ? isoWeekKeyOf
          : monthKeyOf;

    const buckets = new Map<string, SalesRangePoint>();
    const dayRevenue = new Map<string, number>();

    for (const order of orders) {
      const key = bucketOf(order.createdAt);
      const point =
        buckets.get(key) ?? { bucket: key, orders: 0, revenue: 0, avgTicket: 0 };
      point.orders += 1;
      point.revenue += order.total;
      buckets.set(key, point);

      const dayKey = dayKeyOf(order.createdAt);
      dayRevenue.set(dayKey, (dayRevenue.get(dayKey) ?? 0) + order.total);
    }

    const series = [...buckets.values()].map((p) => ({
      ...p,
      avgTicket: p.orders > 0 ? Math.round(p.revenue / p.orders) : 0,
    }));
    series.sort((a, b) => a.bucket.localeCompare(b.bucket));

    const revenueTotal = orders.reduce((acc, o) => acc + o.total, 0);
    const ordersTotal = orders.length;

    let bestDay: { date: string; revenue: number } | null = null;
    for (const [date, revenue] of dayRevenue) {
      if (!bestDay || revenue > bestDay.revenue) {
        bestDay = { date, revenue };
      }
    }

    const prevRevenue = prevRevenueAgg._sum.total ?? 0;
    const comparisonPrevPeriod =
      prevRevenue > 0
        ? {
            revenueDeltaPct:
              Math.round(((revenueTotal - prevRevenue) / prevRevenue) * 1000) /
              10,
          }
        : null;

    const data: SalesRangeData = {
      summary: {
        revenueTotal,
        ordersTotal,
        avgTicket: ordersTotal > 0 ? Math.round(revenueTotal / ordersTotal) : 0,
        bestDay,
        comparisonPrevPeriod,
      },
      series,
    };

    if (query.format === "csv") {
      const headers = ["Periodo", "Órdenes", "Ingresos", "Ticket promedio"];
      const rows = series.map((p) => [
        p.bucket,
        p.orders,
        p.revenue,
        p.avgTicket,
      ]);
      const fromKey = dayKeyOf(zonedToUtc(query.from));
      const toKey = dayKeyOf(zonedToUtc(query.to));
      return csvResponse(
        `ventas-${query.granularity}-${fromKey}_${toKey}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(reportEnvelope("sales-range", bounds.gte, bounds.lt, data));
  });
}
