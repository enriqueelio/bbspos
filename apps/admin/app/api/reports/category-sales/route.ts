import { prisma } from "@bbspos/db";
import { FlavorCategoryList, type CategorySalesData } from "@bbspos/types";
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

const CATEGORY_LABELS: Record<string, string> = {
  MILK: "Con leche",
  WATER: "Con agua",
  SPECIAL: "Especiales",
};

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    const url = new URL(request.url);
    const query = categorySalesQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    const bounds = rangeBounds(query.from, query.to);

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: bounds.gte, lt: bounds.lt },
          ...notCancelled,
        },
      },
      select: {
        flavorCategory: true,
        unitPrice: true,
        quantity: true,
      },
    });

    const totals = new Map<string, { unitsSold: number; revenue: number }>();
    for (const category of FlavorCategoryList) {
      totals.set(category, { unitsSold: 0, revenue: 0 });
    }

    for (const item of items) {
      // Las líneas de platillos del Menú del Día no tienen flavorCategory:
      // este reporte desglosa solo bebidas.
      if (!item.flavorCategory) continue;
      const entry = totals.get(item.flavorCategory);
      if (!entry) continue;
      entry.unitsSold += item.quantity;
      entry.revenue += item.unitPrice * item.quantity;
    }

    const revenueAll = [...totals.values()].reduce(
      (acc, v) => acc + v.revenue,
      0,
    );

    let bestCategory: CategorySalesData["bestCategory"] = null;
    for (const category of FlavorCategoryList) {
      if (
        !bestCategory ||
        (totals.get(category)?.revenue ?? 0) >
          (totals.get(bestCategory)?.revenue ?? 0)
      ) {
        bestCategory = category;
      }
    }
    bestCategory = revenueAll > 0 ? bestCategory : null;

    const categories: CategorySalesData["categories"] =
      FlavorCategoryList.map((category) => {
        const entry = totals.get(category)!;
        return {
          category,
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
      });

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
        CATEGORY_LABELS[c.category] ?? c.category,
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
