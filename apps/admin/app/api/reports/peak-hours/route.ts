import { prisma } from "@bubba/db";
import type { PeakHoursData } from "@bubba/types";
import {
  assertRange,
  parseSearchParams,
  peakHoursQuerySchema,
} from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import {
  dayKeyOf,
  hourOfDay,
  rangeBounds,
  weekdayIndex,
  zonedToUtc,
} from "@/lib/reports/range";

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = peakHoursQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    const bounds = rangeBounds(query.from, query.to);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: bounds.gte, lt: bounds.lt },
        ...notCancelled,
      },
      select: { createdAt: true, total: true },
    });

    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      orders: 0,
      revenue: 0,
    }));

    for (const order of orders) {
      if (
        query.weekday !== undefined &&
        weekdayIndex(order.createdAt) !== query.weekday
      ) {
        continue;
      }
      const hour = hourOfDay(order.createdAt);
      hourly[hour].orders += 1;
      hourly[hour].revenue += order.total;
    }

    let peakHour: PeakHoursData["peakHour"] = null;
    let quietHour: PeakHoursData["quietHour"] = null;

    for (const entry of hourly) {
      if (entry.orders > 0) {
        if (!peakHour || entry.orders > peakHour.orders) {
          peakHour = { hour: entry.hour, orders: entry.orders };
        }
        if (!quietHour || entry.orders < quietHour.orders) {
          quietHour = { hour: entry.hour, orders: entry.orders };
        }
      }
    }

    const data: PeakHoursData = { hourly, peakHour, quietHour };

    if (query.format === "csv") {
      const headers = ["Hora", "Órdenes", "Ingresos"];
      const rows = hourly.map((h) => [
        `${String(h.hour).padStart(2, "0")}:00`,
        h.orders,
        h.revenue,
      ]);
      const fromKey = dayKeyOf(zonedToUtc(query.from));
      const toKey = dayKeyOf(zonedToUtc(query.to));
      return csvResponse(
        `horas-pico-${fromKey}_${toKey}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(reportEnvelope("peak-hours", bounds.gte, bounds.lt, data));
  });
}
