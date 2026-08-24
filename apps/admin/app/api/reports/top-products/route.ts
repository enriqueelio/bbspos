import { prisma } from "@bubba/db";
import type { TopProductRow, TopProductsGroupBy } from "@bubba/types";
import {
  assertRange,
  parseSearchParams,
  topProductsQuerySchema,
  type TopProductsQuery,
} from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { dayKeyOf, rangeBounds, zonedToUtc } from "@/lib/reports/range";

interface Acc {
  unitsSold: number;
  revenue: number;
}

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = topProductsQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    const bounds = rangeBounds(query.from, query.to);
    const groupBy: TopProductsGroupBy = query.groupBy;

    if (groupBy === "topping") {
      return toppingRanking(query, bounds.gte, bounds.lt);
    }

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: bounds.gte, lt: bounds.lt },
          ...notCancelled,
        },
      },
      select: {
        sizeName: true,
        flavorName: true,
        bobaTypeName: true,
        unitPrice: true,
        quantity: true,
      },
    });

    const accs = new Map<string, Acc>();
    for (const item of items) {
      const key =
        groupBy === "drink"
          ? `${item.flavorName} · ${item.sizeName} · ${item.bobaTypeName}`
          : groupBy === "flavor"
            ? item.flavorName
            : groupBy === "size"
              ? item.sizeName
              : item.bobaTypeName;
      const acc = accs.get(key) ?? { unitsSold: 0, revenue: 0 };
      acc.unitsSold += item.quantity;
      acc.revenue += item.unitPrice * item.quantity;
      accs.set(key, acc);
    }

    const data = rank(accs, query);

    if (query.format === "csv") {
      const headers = [
        "Puesto",
        "Producto",
        "Unidades",
        "Ingresos",
        "Precio promedio",
      ];
      const rows = data.map((r) => [
        r.rank,
        r.key,
        r.unitsSold,
        r.revenue,
        r.unitPriceAvg,
      ]);
      const fromKey = dayKeyOf(zonedToUtc(query.from));
      const toKey = dayKeyOf(zonedToUtc(query.to));
      return csvResponse(
        `top-productos-${fromKey}_${toKey}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(reportEnvelope("top-products", bounds.gte, bounds.lt, data));
  });
}

async function toppingRanking(
  query: TopProductsQuery,
  gte: Date,
  lt: Date,
) {
  const items = await prisma.orderItem.findMany({
    where: {
      order: { createdAt: { gte, lt }, ...notCancelled },
    },
    select: {
      quantity: true,
      toppings: { select: { toppingName: true, unitPrice: true } },
    },
  });

  const accs = new Map<string, Acc>();
  for (const item of items) {
    for (const topping of item.toppings) {
      const acc =
        accs.get(topping.toppingName) ?? { unitsSold: 0, revenue: 0 };
      acc.unitsSold += item.quantity;
      acc.revenue += topping.unitPrice * item.quantity;
      accs.set(topping.toppingName, acc);
    }
  }

  const data = rank(accs, query);

  if (query.format === "csv") {
    const headers = [
      "Puesto",
      "Topping",
      "Unidades",
      "Ingresos",
      "Precio promedio",
    ];
    const rows = data.map((r) => [
      r.rank,
      r.key,
      r.unitsSold,
      r.revenue,
      r.unitPriceAvg,
    ]);
    const fromKey = dayKeyOf(zonedToUtc(query.from));
    const toKey = dayKeyOf(zonedToUtc(query.to));
    return csvResponse(
      `top-toppings-${fromKey}_${toKey}.csv`,
      buildCsv(headers, rows),
    );
  }

  return jsonOk(reportEnvelope("top-products", gte, lt, data));
}

function rank(
  accs: Map<string, Acc>,
  query: { metric: "quantity" | "revenue"; limit: number },
): TopProductRow[] {
  const sorted = [...accs.entries()].sort((a, b) => {
    const diff =
      query.metric === "quantity"
        ? b[1].unitsSold - a[1].unitsSold
        : b[1].revenue - a[1].revenue;
    return diff !== 0 ? diff : a[0].localeCompare(b[0]);
  });

  return sorted.slice(0, query.limit).map(([key, acc], index) => ({
    rank: index + 1,
    key,
    unitsSold: acc.unitsSold,
    revenue: acc.revenue,
    unitPriceAvg:
      acc.unitsSold > 0 ? Math.round(acc.revenue / acc.unitsSold) : 0,
  }));
}
