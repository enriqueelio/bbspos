import { prisma } from "@bbspos/db";
import type {
  DashboardSummaryData,
  DashboardEmployeeRow,
  PaymentBreakdownRow,
  FlavorCategory,
} from "@bbspos/types";
import {
  handleReportRoute,
  jsonOk,
  reportEnvelope,
} from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import {
  dayBounds,
  rangeBounds,
  getZonedParts,
  previousPeriodRange,
  type LocalDate,
} from "@/lib/reports/range";
import {
  dashboardQuerySchema,
  parseSearchParams,
} from "@/lib/reports/params";

const CACHE_TTL_MS = 10_000;
let cache: { at: number; data: DashboardSummaryData } | null = null;

function todayLocal(): LocalDate {
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
    .map(([method, v]) => ({
      method: method as PaymentBreakdownRow["method"],
      ...v,
    }));
}

function avgDeliveryMinutes(
  orders: { createdAt: Date; deliveredAt: Date | null }[],
): number {
  const delivered = orders.filter(
    (o) => o.deliveredAt != null,
  ) as { createdAt: Date; deliveredAt: Date }[];
  if (delivered.length === 0) return 0;
  const sum = delivered.reduce(
    (acc, o) => acc + (o.deliveredAt.getTime() - o.createdAt.getTime()),
    0,
  );
  return Math.round(sum / delivered.length / 60_000);
}

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = dashboardQuerySchema.parse(parseSearchParams(url.searchParams));

    const today = todayLocal();
    const from: LocalDate = query.from ?? today;
    const to: LocalDate = query.to ?? today;
    const { gte: rangeGte, lt: rangeLt } = rangeBounds(from, to);

    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return jsonOk(
        reportEnvelope("dashboard-summary", rangeGte, rangeLt, cache.data),
      );
    }

    const todayB = dayBounds(today);
    const yesterdayDate = (() => {
      const utc = Date.UTC(today.year, today.month - 1, today.day - 1);
      const d = new Date(utc);
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
      };
    })();
    const yesterdayB = dayBounds(yesterdayDate);

    const prevRange = previousPeriodRange(from, to);
    const { gte: prevGte, lt: prevLt } = rangeBounds(
      prevRange.from,
      prevRange.to,
    );

    const [
      todayOrders,
      yesterdayOrders,
      rangeOrders,
      prevRangeOrders,
      pendingOrders,
      cancelledToday,
      cancelledRangeAgg,
      discountsAgg,
      paymentsOrders,
      deliveriesRange,
      rangeItems,
      rangeToppings,
      catalogFlavors,
      soldFlavorNames,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: todayB.gte, lt: todayB.lt }, ...notCancelled },
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
        where: { createdAt: { gte: rangeGte, lt: rangeLt }, ...notCancelled },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: prevGte, lt: prevLt }, ...notCancelled },
        select: { total: true },
      }),
      prisma.order.count({
        where: { status: { in: ["RECIBIDO", "ACEPTADO"] } },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: todayB.gte, lt: todayB.lt },
          status: "ANULADO",
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: rangeGte, lt: rangeLt },
          status: "ANULADO",
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: rangeGte, lt: rangeLt }, ...notCancelled },
        _sum: { discountAmount: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: rangeGte, lt: rangeLt },
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
          createdAt: { gte: rangeGte, lt: rangeLt },
          ...notCancelled,
        },
        select: { createdAt: true, deliveredAt: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: { createdAt: { gte: rangeGte, lt: rangeLt }, ...notCancelled },
        },
        select: {
          flavorCategory: true,
          unitPrice: true,
          quantity: true,
          flavorName: true,
        },
      }),
      prisma.orderItemTopping.findMany({
        where: {
          orderItem: {
            order: {
              createdAt: { gte: rangeGte, lt: rangeLt },
              ...notCancelled,
            },
          },
        },
        select: { unitPrice: true },
      }),
      prisma.flavor.findMany({
        where: { available: true },
        select: { name: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: { createdAt: { gte: rangeGte, lt: rangeLt }, ...notCancelled },
        },
        select: { flavorName: true },
        distinct: ["flavorName"],
      }),
    ]);

    const todaySum = summarize(todayOrders);
    const yesterdaySum = summarize(yesterdayOrders);
    const rangeSum = summarize(rangeOrders);
    const prevRangeSum = summarize(prevRangeOrders);

    const totalToday = todaySum.orders + cancelledToday;
    const cancelledPct =
      totalToday > 0
        ? Math.round((cancelledToday / totalToday) * 1000) / 10
        : 0;

    const discountsTotal = Number(discountsAgg._sum.discountAmount ?? 0);
    const cancellationsCost = Number(cancelledRangeAgg._sum.total ?? 0);

    const paymentsBreakdown = paymentBreakdown(paymentsOrders);
    const deliveryAvg = avgDeliveryMinutes(
      deliveriesRange as { createdAt: Date; deliveredAt: Date | null }[],
    );

    // Peak revenue hour (local, from range orders)
    const rangeOrdersWithTime = await prisma.order.findMany({
      where: { createdAt: { gte: rangeGte, lt: rangeLt }, ...notCancelled },
      select: { createdAt: true, total: true },
    });
    const peakHourMap = new Map<number, number>();
    for (const o of rangeOrdersWithTime) {
      const h = getZonedParts(o.createdAt).hour;
      peakHourMap.set(h, (peakHourMap.get(h) ?? 0) + o.total);
    }
    let peakHour: number | null = null;
    let peakRevenue = 0;
    for (const [h, rev] of peakHourMap) {
      if (rev > peakRevenue) {
        peakRevenue = rev;
        peakHour = h;
      }
    }

    // Best category
    const catRevenue = new Map<FlavorCategory, number>();
    for (const item of rangeItems) {
      catRevenue.set(
        item.flavorCategory,
        (catRevenue.get(item.flavorCategory) ?? 0) +
          item.unitPrice * item.quantity,
      );
    }
    let bestCategory: FlavorCategory | null = null;
    let bestCatRev = 0;
    for (const [cat, rev] of catRevenue) {
      if (rev > bestCatRev) {
        bestCatRev = rev;
        bestCategory = cat;
      }
    }

    // Staff performance (from range orders with userId)
    const rangeOrdersStaff = await prisma.order.findMany({
      where: { createdAt: { gte: rangeGte, lt: rangeLt }, ...notCancelled },
      select: { userId: true, total: true },
    });
    const staffMap = new Map<
      string,
      { ordersProcessed: number; revenueTotal: number }
    >();
    for (const o of rangeOrdersStaff) {
      if (!o.userId) continue;
      const s = staffMap.get(o.userId) ?? { ordersProcessed: 0, revenueTotal: 0 };
      s.ordersProcessed += 1;
      s.revenueTotal += o.total;
      staffMap.set(o.userId, s);
    }
    let staffPerformance: DashboardEmployeeRow[] = [];
    if (staffMap.size > 0) {
      const userIds = [...staffMap.keys()];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userNameMap = new Map(users.map((u) => [u.id, u.name]));
      staffPerformance = userIds.map((uid) => ({
        userId: uid,
        userName: userNameMap.get(uid) ?? "—",
        ...staffMap.get(uid)!,
      }));
      staffPerformance.sort((a, b) => b.revenueTotal - a.revenueTotal);
    }

    // Menu rotation (% of catalog with zero orders in range)
    const soldNames = new Set(soldFlavorNames.map((f) => f.flavorName));
    const totalFlavors = catalogFlavors.length;
    const unsoldCount = catalogFlavors.filter(
      (f) => !soldNames.has(f.name),
    ).length;
    const menuRotationPct =
      totalFlavors > 0
        ? Math.round((unsoldCount / totalFlavors) * 1000) / 10
        : 0;

    // Toppings margin
    const rangeRevenue = rangeSum.revenue;
    const toppingsRevenue = rangeToppings.reduce(
      (acc, t) => acc + t.unitPrice,
      0,
    );
    const toppingsMarginPct =
      rangeRevenue > 0
        ? Math.round((toppingsRevenue / rangeRevenue) * 1000) / 10
        : 0;

    const data: DashboardSummaryData = {
      today: todaySum,
      yesterday: yesterdaySum,
      deltaPct: {
        revenue: deltaPct(todaySum.revenue, yesterdaySum.revenue),
        orders: deltaPct(todaySum.orders, yesterdaySum.orders),
      },
      last7Days: rangeSum,

      netSales: rangeRevenue,
      growthPct: deltaPct(rangeRevenue, prevRangeSum.revenue),
      avgTicket: rangeSum.avgTicket,
      ordersVolume: rangeSum.orders,
      cancelledPct,
      discountsTotal,
      peakHour,
      bestCategory,
      paymentsToday: paymentsBreakdown,
      avgDeliveryMinutes: deliveryAvg,
      pendingOrders,
      staffPerformance,
      cancellationsCost,
      menuRotationPct,
      toppingsMarginPct,
    };

    cache = { at: Date.now(), data };

    return jsonOk(reportEnvelope("dashboard-summary", rangeGte, rangeLt, data));
  });
}
