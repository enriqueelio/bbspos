import { prisma } from "@bbspos/db";
import type { SlowMoverRow } from "@bbspos/types";
import {
  assertRange,
  parseSearchParams,
  slowMoversQuerySchema,
  type SlowMoversQuery,
} from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { dayKeyOf, rangeBounds, zonedToUtc } from "@/lib/reports/range";

const CATEGORY_LABELS: Record<string, string> = {
  MILK: "Con leche",
  WATER: "Con agua",
  SPECIAL: "Especiales",
};

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = slowMoversQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    const bounds = rangeBounds(query.from, query.to);

    if (query.toppings) {
      return toppingsSlowMovers(query, bounds.gte, bounds.lt);
    }

    const [matrix, items] = await Promise.all([
      prisma.drinkPrice.findMany({
        select: {
          category: true,
          size: { select: { name: true, available: true } },
          bobaType: { select: { name: true, available: true } },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: bounds.gte, lt: bounds.lt },
            ...notCancelled,
          },
        },
        select: {
          flavorCategory: true,
          sizeName: true,
          bobaTypeName: true,
          unitPrice: true,
          quantity: true,
        },
      }),
    ]);

    const soldByCombo = new Map<
      string,
      { unitsSold: number; revenue: number }
    >();
    for (const item of items) {
      // Las líneas de platillos del Menú del Día no tienen flavorCategory:
      // este reporte mide rotación solo de bebidas.
      if (!item.flavorCategory) continue;
      const key = `${item.flavorCategory} · ${item.sizeName} · ${item.bobaTypeName}`;
      const acc = soldByCombo.get(key) ?? { unitsSold: 0, revenue: 0 };
      acc.unitsSold += item.quantity;
      acc.revenue += item.unitPrice * item.quantity;
      soldByCombo.set(key, acc);
    }

    // Universo: matriz vigente categoría × tamaño × tipo de boba.
    const seen = new Set<string>();
    const rows: SlowMoverRow[] = [];

    for (const entry of matrix) {
      const comboKey = `${entry.category} · ${entry.size.name} · ${entry.bobaType.name}`;
      if (seen.has(comboKey)) continue;
      seen.add(comboKey);

      const sold = soldByCombo.get(comboKey);
      rows.push({
        key: `${CATEGORY_LABELS[entry.category] ?? entry.category} · ${entry.size.name} · ${entry.bobaType.name}`,
        unitsSold: sold?.unitsSold ?? 0,
        revenue: sold?.revenue ?? 0,
        available:
          Boolean(entry.size.available) && Boolean(entry.bobaType.available),
      });
    }

    return respond(rows, query, bounds.gte, bounds.lt);
  });
}

async function toppingsSlowMovers(
  query: SlowMoversQuery,
  gte: Date,
  lt: Date,
) {
  const [toppings, items] = await Promise.all([
    prisma.topping.findMany({ select: { name: true, available: true } }),
    prisma.orderItemTopping.findMany({
      where: {
        orderItem: {
          order: { createdAt: { gte, lt }, ...notCancelled },
        },
      },
      select: {
        toppingName: true,
        unitPrice: true,
        orderItem: { select: { quantity: true } },
      },
    }),
  ]);

  const soldByName = new Map<string, { unitsSold: number; revenue: number }>();
  for (const t of items) {
    const acc =
      soldByName.get(t.toppingName) ?? { unitsSold: 0, revenue: 0 };
    acc.unitsSold += t.orderItem.quantity;
    acc.revenue += t.unitPrice * t.orderItem.quantity;
    soldByName.set(t.toppingName, acc);
  }

  const rows: SlowMoverRow[] = toppings.map((topping) => {
    const sold = soldByName.get(topping.name);
    return {
      key: topping.name,
      unitsSold: sold?.unitsSold ?? 0,
      revenue: sold?.revenue ?? 0,
      available: topping.available,
    };
  });

  return respond(rows, query, gte, lt);
}

function respond(
  rows: SlowMoverRow[],
  query: SlowMoversQuery,
  gte: Date,
  lt: Date,
): Response {
  const filtered = query.includeZero
    ? rows
    : rows.filter((r) => r.unitsSold > 0);

  filtered.sort((a, b) => {
    if (a.unitsSold !== b.unitsSold) return a.unitsSold - b.unitsSold;
    if (a.revenue !== b.revenue) return a.revenue - b.revenue;
    return a.key.localeCompare(b.key);
  });

  const data = filtered.slice(0, query.limit);

  if (query.format === "csv") {
    const headers = ["Producto", "Unidades", "Ingresos", "Disponible"];
    const csvRows = data.map((r) => [
      r.key,
      r.unitsSold,
      r.revenue,
      r.available ? "Sí" : "No",
    ]);
    const fromKey = dayKeyOf(zonedToUtc(query.from));
    const toKey = dayKeyOf(zonedToUtc(query.to));
    return csvResponse(
      `baja-rotacion-${fromKey}_${toKey}.csv`,
      buildCsv(headers, csvRows),
    );
  }

  return jsonOk(reportEnvelope("slow-movers", gte, lt, data));
}
