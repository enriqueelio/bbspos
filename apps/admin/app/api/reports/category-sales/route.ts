import { prisma } from "@bbspos/db";
import { normalizeCategoryKey, type CategorySalesData } from "@bbspos/types";
import {
  assertRange,
  categorySalesQuerySchema,
  parseSearchParams,
} from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { notCancelled } from "@/lib/reports/sales";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { dayKeyOf, rangeBounds, zonedToUtc } from "@/lib/reports/range";

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = categorySalesQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    const bounds = rangeBounds(query.from, query.to);

    const [items, catalogCategories] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: bounds.gte, lt: bounds.lt },
            ...notCancelled,
          },
        },
        select: {
          flavorCategory: true,
          menuItemCategory: true,
          unitPrice: true,
          quantity: true,
        },
      }),
      prisma.category.findMany({
        orderBy: { order: "asc" },
        select: { key: true, name: true },
      }),
    ]);

    const labels = new Map<string, string>();
    const categoryOrder: string[] = [];

    // Una fila por categoría real de la carta (tabla `Category`). Las bebidas
    // Bubble Tea se venden con la matriz sabor/tamaño/boba y guardan
    // `flavorCategory` en vez de `menuItemCategory`: todas se consolidan en la
    // categoría Bubbas, igual que cualquier otra categoría con variantes.
    for (const cat of catalogCategories) {
      const key = normalizeCategoryKey(cat.key);
      if (!labels.has(key)) {
        labels.set(key, cat.name);
        categoryOrder.push(key);
      }
    }
    if (!labels.has("BUBAS")) {
      labels.set("BUBAS", "Bubbas");
      categoryOrder.push("BUBAS");
    }

    const totals = new Map<string, { unitsSold: number; revenue: number }>();
    for (const key of categoryOrder) {
      totals.set(key, { unitsSold: 0, revenue: 0 });
    }

    for (const item of items) {
      const key = item.flavorCategory
        ? "BUBAS"
        : normalizeCategoryKey(item.menuItemCategory ?? "OTROS");
      let entry = totals.get(key);
      if (!entry) {
        entry = { unitsSold: 0, revenue: 0 };
        totals.set(key, entry);
        labels.set(key, key);
        categoryOrder.push(key);
      }
      entry.unitsSold += item.quantity;
      entry.revenue += item.unitPrice * item.quantity;
    }

    const revenueAll = [...totals.values()].reduce(
      (acc, v) => acc + v.revenue,
      0,
    );

    let bestCategory: string | null = null;
    let bestRevenue = 0;
    for (const key of categoryOrder) {
      const revenue = totals.get(key)?.revenue ?? 0;
      if (revenue > bestRevenue) {
        bestRevenue = revenue;
        bestCategory = key;
      }
    }
    if (bestRevenue <= 0) bestCategory = null;

    const categories: CategorySalesData["categories"] = categoryOrder.map(
      (key) => {
        const entry = totals.get(key)!;
        return {
          category: key,
          label: labels.get(key) ?? key,
          unitsSold: entry.unitsSold,
          revenue: entry.revenue,
          sharePct:
            revenueAll > 0
              ? Math.round((entry.revenue / revenueAll) * 1000) / 10
              : 0,
          avgTicketItem:
            entry.unitsSold > 0
              ? Math.round(entry.revenue / entry.unitsSold)
              : 0,
        };
      },
    );

    const data: CategorySalesData = { categories, bestCategory };

    if (query.format === "csv") {
      const headers = [
        "Categoría",
        "Unidades",
        "Ingresos",
        "Participación %",
        "Precio promedio por ítem",
      ];
      const rows = categories.map((c) => [
        c.label,
        c.unitsSold,
        c.revenue,
        c.sharePct,
        c.avgTicketItem,
      ]);
      const fromKey = dayKeyOf(zonedToUtc(query.from));
      const toKey = dayKeyOf(zonedToUtc(query.to));
      return csvResponse(
        `ventas-categoria-${fromKey}_${toKey}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(
      reportEnvelope("category-sales", bounds.gte, bounds.lt, data),
    );
  });
}
