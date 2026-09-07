"use server";

import { prisma } from "@bbspos/db";
import {
  FlavorCategoryList,
  MenuCategoryList,
  type CategoryBreakdownRow,
} from "@bbspos/types";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { dayBounds, isValidLocalDate } from "@/lib/reports/range";
import { getPrinterConfig, printText, formatSummaryReport, formatDailyReport } from "@/lib/printing";

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

/** Imprime en la impresora térmica el Resumen del día (dashboard). */
export async function printSummaryReport(): Promise<string> {
  await requireSession();

  const printerName = (await getPrinterConfig())?.printerName;
  if (!printerName) {
    throw new Error(
      "Configura primero la impresora de comandas en la pestaña Impresora.",
    );
  }

  const today = todayLocal();
  const sub = (d: { year: number; month: number; day: number }, days: number) => {
    const utc = Date.UTC(d.year, d.month - 1, d.day - days);
    const x = new Date(utc);
    return discrete(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
  };
  const discrete = (year: number, month: number, day: number) => ({ year, month, day });

  const todayB = dayBounds(today);
  const yesterdayB = dayBounds(sub(today, 1));
  const weekFrom = sub(today, 6);
  const weekB = { gte: dayBounds(weekFrom).gte, lt: todayB.lt };

  const [todayOrders, yesterdayOrders, weekOrders, pendingOrders] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: todayB.gte, lt: todayB.lt }, ...notCancelled },
      select: { total: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: yesterdayB.gte, lt: yesterdayB.lt }, ...notCancelled },
      select: { total: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: weekB.gte, lt: weekB.lt }, ...notCancelled },
      select: { total: true },
    }),
    prisma.order.count({ where: { status: "RECIBIDO" } }),
  ]);

  const todaySum = summarize(todayOrders);
  const yesterdaySum = summarize(yesterdayOrders);
  const weekSum = summarize(weekOrders);

  const text = formatSummaryReport({
    today: todaySum,
    yesterday: yesterdaySum,
    deltaPct: {
      revenue: deltaPct(todaySum.revenue, yesterdaySum.revenue),
      orders: deltaPct(todaySum.orders, yesterdaySum.orders),
    },
    last7Days: weekSum,
    pendingOrders,
  });

  await printText(printerName, text);
  return `Resumen enviado a "${printerName}".`;
}

/** Imprime en la impresora térmica el Cierre diario de una fecha (YYYY-MM-DD). */
export async function printDailyReport(date?: string): Promise<string> {
  await requireSession();

  const printerName = (await getPrinterConfig())?.printerName;
  if (!printerName) {
    throw new Error(
      "Configura primero la impresora de comandas en la pestaña Impresora.",
    );
  }

  const localDate =
    date && isValidLocalDate(date)
      ? (() => {
          const [y, m, d] = date.split("-").map(Number);
          return { year: y, month: m, day: d };
        })()
      : todayLocal();

  const bounds = dayBounds(localDate);

  const [orders, cancelledAgg] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: bounds.gte, lt: bounds.lt }, ...notCancelled },
      include: { items: { include: { toppings: true } } },
    }),
    prisma.order.count({
      where: { createdAt: { gte: bounds.gte, lt: bounds.lt }, status: "ANULADO" },
    }),
  ]);

  const discountsTotal = orders.reduce((acc, o) => acc + (o.discountAmount ?? 0), 0);

  const paymentTotals = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    if (!order.paymentMethod) continue;
    if (order.paymentMethod2 && order.paymentAmount2 != null) {
      const amount1 = order.total - order.paymentAmount2;
      const e1 = paymentTotals.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
      e1.orders += 1;
      e1.revenue += amount1;
      paymentTotals.set(order.paymentMethod, e1);

      const e2 = paymentTotals.get(order.paymentMethod2) ?? { orders: 0, revenue: 0 };
      e2.orders += 1;
      e2.revenue += order.paymentAmount2;
      paymentTotals.set(order.paymentMethod2, e2);
    } else {
      const e = paymentTotals.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
      e.orders += 1;
      e.revenue += order.total;
      paymentTotals.set(order.paymentMethod, e);
    }
  }
  const paymentBreakdown = [...paymentTotals.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([method, v]) => ({ method, ...v }));

  const revenueTotal = orders.reduce((acc, o) => acc + o.total, 0);
  const ordersTotal = orders.length;
  const avgTicket = ordersTotal > 0 ? Math.round(revenueTotal / ordersTotal) : 0;

  let itemsSold = 0;
  let toppingsRevenue = 0;
  const CATEGORY_ORDER: CategoryBreakdownRow["category"][] = [
    ...FlavorCategoryList,
    ...MenuCategoryList,
  ];
  const byCategory = new Map<
    CategoryBreakdownRow["category"],
    {
      category: CategoryBreakdownRow["category"];
      orders: Set<string>;
      units: number;
      revenue: number;
    }
  >();
  for (const category of CATEGORY_ORDER) {
    byCategory.set(category, { category, orders: new Set(), units: 0, revenue: 0 });
  }
  for (const order of orders) {
    for (const item of order.items) {
      itemsSold += item.quantity;
      toppingsRevenue += item.toppings.reduce((acc, t) => acc + t.unitPrice, 0) * item.quantity;
      // Bebidas agrupan por flavorCategory; platillos (carta y Menú del Día)
      // por menuItemCategory.
      const key = item.flavorCategory ?? item.menuItemCategory ?? "ALMUERZO";
      const row = byCategory.get(key);
      if (row) {
        row.orders.add(order.id);
        row.units += item.quantity;
        row.revenue += item.unitPrice * item.quantity;
      }
    }
  }

  const text = formatDailyReport({
    date: date ?? isoLocal(todayLocal()),
    revenueTotal,
    ordersTotal,
    avgTicket,
    itemsSold,
    toppingsRevenue,
    byCategory: CATEGORY_ORDER.map((c) => {
      const r = byCategory.get(c)!;
      return { category: r.category, orders: r.orders.size, units: r.units, revenue: r.revenue };
    }),
    paymentBreakdown,
    discountsTotal,
    cancellationsCount: cancelledAgg,
  });

  await printText(printerName, text);
  return `Cierre enviado a "${printerName}".`;
}

function isoLocal(d: { year: number; month: number; day: number }): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.year}-${p(d.month)}-${p(d.day)}`;
}
