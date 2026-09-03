import { prisma } from "@bubba/db";
import type { DashboardSummaryData, PaymentBreakdownRow } from "@bubba/types";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { dayBounds, zonedToUtc } from "@/lib/reports/range";

const CACHE_TTL_MS = 10_000;
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

function paymentBreakdown(
  orders: {
    paymentMethod: string | null;
    paymentMethod2: string | null;
    paymentAmount2: number | null;
    total: number;
  }[],
): PaymentBreakdownRow[] {
  const totals = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    if (!o.paymentMethod) continue;
    if (o.paymentMethod2 && o.paymentAmount2 != null) {
      const a = totals.get(o.paymentMethod) ?? { orders: 0, revenue: 0 };
      a.orders += 1;
      a.revenue += o.total - o.paymentAmount2;
      totals.set(o.paymentMethod, a);
      const b = totals.get(o.paymentMethod2) ?? { orders: 0, revenue: 0 };
      b.orders += 1;
      b.revenue += o.paymentAmount2;
      totals.set(o.paymentMethod2, b);
    } else {
      const e = totals.get(o.paymentMethod) ?? { orders: 0, revenue: 0 };
      e.orders += 1;
      e.revenue += o.total;
      totals.set(o.paymentMethod, e);
    }
  }
  return [...totals.entries()]
    .sort((x, y) => y[1].revenue - x[1].revenue)
    .map(([method, v]) => ({ method: method as PaymentBreakdownRow["method"], ...v }));
}

function avgDeliveryMinutes(
  orders: { createdAt: Date; deliveredAt: Date }[],
): number {
  if (orders.length === 0) return 0;
  const sum = orders.reduce(
    (acc, o) => acc + (o.deliveredAt.getTime() - o.createdAt.getTime()),
    0,
  );
  return Math.round(sum / orders.length / 60_000);
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

    const [todayOrders, yesterdayOrders, weekOrders, pendingOrders, cancelledToday, discountsToday, paymentsOrders, deliveriesToday] =
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
          where: { status: "RECIBIDO" },
        }),
        prisma.order.count({
          where: { createdAt: { gte: todayB.gte, lt: todayB.lt }, status: "ANULADO" },
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: todayB.gte, lt: todayB.lt },
            ...notCancelled,
          },
          _sum: { discountAmount: true },
        }),
        prisma.order.findMany({
          where: {
            createdAt: { gte: todayB.gte, lt: todayB.lt },
            ...notCancelled,
          },
          select: {
            paymentMethod: true,
            paymentMethod2: true,
            paymentAmount2: true,
            total: true,
          },
        }),
        prisma.order.findMany({
          where: {
            createdAt: { gte: todayB.gte, lt: todayB.lt },
            deliveredAt: { not: null },
          },
          select: { createdAt: true, deliveredAt: true },
        }),
      ]);

    const todaySum = summarize(todayOrders);
    const yesterdaySum = summarize(yesterdayOrders);
    const weekSum = summarize(weekOrders);

    const totalToday = todaySum.orders + cancelledToday;
    const cancelledPct =
      totalToday > 0 ? Math.round((cancelledToday / totalToday) * 100) : 0;
    const discountsTodayVal = Number(discountsToday._sum.discountAmount ?? 0);
    const paymentsBreakdown = paymentBreakdown(paymentsOrders);
    const deliveryAvg = avgDeliveryMinutes(
      deliveriesToday as { createdAt: Date; deliveredAt: Date }[],
    );

    const data: DashboardSummaryData = {
      today: todaySum,
      yesterday: yesterdaySum,
      deltaPct: {
        revenue: deltaPct(todaySum.revenue, yesterdaySum.revenue),
        orders: deltaPct(todaySum.orders, yesterdaySum.orders),
      },
      last7Days: weekSum,
      pendingOrders,
      cancelledPct,
      discountsToday: discountsTodayVal,
      paymentsToday: paymentsBreakdown,
      avgDeliveryMinutes: deliveryAvg,
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
