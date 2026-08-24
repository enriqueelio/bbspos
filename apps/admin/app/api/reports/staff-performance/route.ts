import { prisma } from "@bubba/db";
import { OrderStatus, type StaffPerformanceRow } from "@bubba/types";
import {
  assertRange,
  parseSearchParams,
  staffPerformanceQuerySchema,
} from "@/lib/reports/params";
import {
  ApiError,
  handleReportRoute,
  jsonOk,
  notImplementedSchema,
  reportEnvelope,
} from "@/lib/reports/response";
import { hasAuditSchema, requireSession } from "@/lib/reports/guard";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { dayKeyOf, rangeBounds, zonedToUtc } from "@/lib/reports/range";

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    if (!(await hasAuditSchema())) {
      throw notImplementedSchema();
    }

    const url = new URL(request.url);
    const query = staffPerformanceQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    if (query.userId) {
      const exists = await prisma.user.findUnique({
        where: { id: query.userId },
        select: { id: true },
      });
      if (!exists) {
        throw new ApiError("NOT_FOUND", "El usuario indicado no existe.");
      }
    }

    const bounds = rangeBounds(query.from, query.to);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: bounds.gte, lt: bounds.lt },
        status: { not: OrderStatus.ANULADO },
        ...(query.userId ? { userId: query.userId } : {}),
      },
      select: {
        total: true,
        userId: true,
        user: { select: { id: true, name: true } },
      },
    });

    const revenueAll = orders.reduce((acc, o) => acc + o.total, 0);

    const byUser = new Map<
      string,
      { name: string; ordersProcessed: number; revenueTotal: number }
    >();
    for (const order of orders) {
      if (!order.userId || !order.user) continue;
      const entry =
        byUser.get(order.userId) ?? {
          name: order.user.name,
          ordersProcessed: 0,
          revenueTotal: 0,
        };
      entry.ordersProcessed += 1;
      entry.revenueTotal += order.total;
      byUser.set(order.userId, entry);
    }

    const data: StaffPerformanceRow[] = [...byUser.entries()]
      .map(([id, entry]) => ({
        user: { id, name: entry.name },
        ordersProcessed: entry.ordersProcessed,
        revenueTotal: entry.revenueTotal,
        avgTicket:
          entry.ordersProcessed > 0
            ? Math.round(entry.revenueTotal / entry.ordersProcessed)
            : 0,
        shareOfRevenuePct:
          revenueAll > 0
            ? Math.round((entry.revenueTotal / revenueAll) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.revenueTotal - a.revenueTotal);

    if (query.format === "csv") {
      const headers = [
        "Usuario",
        "Órdenes procesadas",
        "Total recaudado",
        "Ticket promedio",
        "Participación %",
      ];
      const rows = data.map((r) => [
        r.user.name,
        r.ordersProcessed,
        r.revenueTotal,
        r.avgTicket,
        r.shareOfRevenuePct,
      ]);
      const fromKey = dayKeyOf(zonedToUtc(query.from));
      const toKey = dayKeyOf(zonedToUtc(query.to));
      return csvResponse(
        `rendimiento-personal-${fromKey}_${toKey}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(
      reportEnvelope("staff-performance", bounds.gte, bounds.lt, data),
    );
  });
}
