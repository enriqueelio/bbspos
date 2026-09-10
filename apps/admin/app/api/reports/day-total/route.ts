import { prisma } from "@bbspos/db";
import type { DayTotalData, DayTotalOrderRow } from "@bbspos/types";
import {
  dayTotalQuerySchema,
  parseSearchParams,
} from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { rangeBounds, localDateKey } from "@/lib/reports/range";

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = dayTotalQuerySchema.parse(parseSearchParams(url.searchParams));
    const { gte, lt } = rangeBounds(query.from, query.to);

    const [orders, agg] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte, lt } },
        select: {
          seq: true,
          daySeq: true,
          createdAt: true,
          customerName: true,
          total: true,
          discountAmount: true,
          discountReason: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte, lt } },
        _sum: { total: true, discountAmount: true },
        _count: { _all: true },
      }),
    ]);

    const revenueTotal = Number(agg._sum.total ?? 0);
    const discountsTotal = Number(agg._sum.discountAmount ?? 0);
    const ordersTotal = agg._count._all;
    const netTotal = revenueTotal - discountsTotal;

    const orderRows: DayTotalOrderRow[] = orders.map((o) => ({
      seq: o.seq,
      daySeq: o.daySeq,
      createdAt: o.createdAt.toISOString(),
      customerName: o.customerName,
      total: o.total,
      discountAmount: o.discountAmount,
      discountReason: o.discountReason,
    }));

    const data: DayTotalData = {
      orders: orderRows,
      summary: { ordersTotal, revenueTotal, discountsTotal, netTotal },
    };

    if (query.format === "csv") {
      const headers = [
        "# Ticket",
        "Fecha",
        "Hora",
        "Cliente",
        "Monto",
        "Descuento",
        "Motivo descuento",
      ];
      const csvRows = orderRows.map((o) => {
        const d = new Date(o.createdAt);
        return [
          o.daySeq ?? o.seq ?? "—",
          localDateKey(query.from),
          d.toLocaleTimeString("es-BO", {
            timeZone: "America/La_Paz",
            hour: "2-digit",
            minute: "2-digit",
          }),
          o.customerName ?? "—",
          o.total,
          o.discountAmount || "",
          o.discountReason ?? "",
        ];
      });
      return csvResponse(
        `ventas-totales-${localDateKey(query.from)}_${localDateKey(query.to)}.csv`,
        buildCsv(headers, csvRows),
      );
    }

    return jsonOk(reportEnvelope("day-total", gte, lt, data));
  });
}
