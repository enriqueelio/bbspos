import { prisma } from "@bubba/db";
import type { DashboardSummaryData } from "@bubba/types";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { dayBounds, zonedToUtc } from "@/lib/reports/range";

const CACHE_TTL_MS = 30_000;
let cache: { at: number; data: DashboardSummaryData } | null = null;

function todayLocal(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function summarize(orders: { total: number }[]) {
  const revenue = orders.reduce((acc, o) => acc + o.total, 0);
  return {
    revenue,
    orders: orders.length,
    avgTicket: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
  };
}

function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET() {
  return handleReportRoute(async () => {
    await requireSession();

    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return jsonOk(
        reportEnvelope(
          "dashboard-summary",
          zonedToUtc(todayLocal()),
          new Date(),
          cache.data,
        ),
      );
    }

    const today = todayLocal();
    const yesterdayDate = (() => {
      const utc = Date.UTC(today.year, today.month - 1, today.day - 1);
      const d = new Date(utc);
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
      };
    })();
    const weekAgoDate = (() => {
      const utc = Date.UTC(today.year, today.month - 1, today.day - 6);
      const d = new Date(utc);
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
      };
    })();

    const todayB = dayBounds(today);
    const yesterdayB = dayBounds(yesterdayDate);
    const weekB = rangeBounds7(weekAgoDate, today);

    const [todayOrders, yesterdayOrders, weekOrders, pendingOrders] =
      await Promise.all([
        prisma.order.findMany({
          where: {
            createdAt: { gte: todayB.gte, lt: todayB.lt },
            ...notCancelled,
          },
          select: { total: true },
        }),
        prisma.order.findMany({
          where: {
            createdAt: { gte: yesterdayB.gte, lt: yesterdayB.lt },
            ...notCancelled,
          },
          select: { total: true },
        }),
        prisma.order.findMany({
          where: {
            createdAt: { gte: weekB.gte, lt: weekB.lt },
            ...notCancelled,
          },
          select: { total: true },
        }),
        prisma.order.count({
          where: { status: "INGRESADO" },
        }),
      ]);

    const todaySum = summarize(todayOrders);
    const yesterdaySum = summarize(yesterdayOrders);
    const weekSum = summarize(weekOrders);

    const data: DashboardSummaryData = {
      today: todaySum,
      yesterday: yesterdaySum,
      deltaPct: {
        revenue: deltaPct(todaySum.revenue, yesterdaySum.revenue),
        orders: deltaPct(todaySum.orders, yesterdaySum.orders),
      },
      last7Days: weekSum,
      pendingOrders,
    };

    cache = { at: Date.now(), data };

    return jsonOk(reportEnvelope("dashboard-summary", todayB.gte, todayB.lt, data));
  });
}

function rangeBounds7(
  from: { year: number; month: number; day: number },
  to: { year: number; month: number; day: number },
): { gte: Date; lt: Date } {
  // Últimos 7 días locales incluyendo el día actual.
  const start = dayBounds(from).gte;
  const end = dayBounds(to).lt;
  return { gte: start, lt: end };
}
