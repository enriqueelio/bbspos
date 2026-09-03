import { prisma } from "@bubba/db";
import type { DayTotalData } from "@bubba/types";
import {
  dayTotalQuerySchema,
  parseSearchParams,
} from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { rangeBounds, localDateKey } from "@/lib/reports/range";

// Ítems vendidos en el rango (incluso de órdenes anuladas): SUM de quantity
// sobre todos los items, filtrando por la fecha de la orden padre.
const ITEMS_SQL = `
  SELECT COALESCE(SUM(oi."quantity"), 0) AS units
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."createdAt" >= ? AND o."createdAt" < ?
`;

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = dayTotalQuerySchema.parse(parseSearchParams(url.searchParams));
    const { gte, lt } = rangeBounds(query.from, query.to);

    // Ventas brutas del rango sin discriminar nada: TODAS las órdenes,
    // incluidas las ANULADAS.
    const [gross, cancelledAgg, itemsRows] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte, lt } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte, lt }, status: "ANULADO" },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.$queryRawUnsafe<{ units: number | bigint }[]>(ITEMS_SQL, gte, lt),
    ]);

    const revenueTotal = Number(gross._sum.total ?? 0);
    const ordersTotal = gross._count._all;
    const cancellationsCount = cancelledAgg._count._all;
    const cancellationsRevenue = Number(cancelledAgg._sum.total ?? 0);
    const validRevenue = revenueTotal - cancellationsRevenue;
    const avgTicket = ordersTotal > 0 ? Math.round(revenueTotal / ordersTotal) : 0;
    const itemsSold = Number(itemsRows[0]?.units ?? 0);

    const data: DayTotalData = {
      revenueTotal,
      ordersTotal,
      cancellationsCount,
      cancellationsRevenue,
      validRevenue,
      avgTicket,
      itemsSold,
    };

    if (query.format === "csv") {
      const headers = [
        "Ingresos totales (bruto)",
        "Órdenes totales",
        "Ingresos válidos",
        "Anulaciones",
        "Ingreso anulado",
        "Ticket promedio",
        "Ítems vendidos",
      ];
      const rows = [[
        revenueTotal,
        ordersTotal,
        validRevenue,
        cancellationsCount,
        cancellationsRevenue,
        avgTicket,
        itemsSold,
      ]];
      return csvResponse(
        `venta-total-${localDateKey(query.from)}_${localDateKey(query.to)}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(reportEnvelope("day-total", gte, lt, data));
  });
}