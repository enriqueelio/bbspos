import { prisma } from "@bbspos/db";
import type { TopProductRow, TopProductsGroupBy } from "@bbspos/types";
import {
  assertRange,
  parseSearchParams,
  topProductsQuerySchema,
} from "@/lib/reports/params";
import { handleReportRoute, jsonOk, reportEnvelope } from "@/lib/reports/response";
import { requireSession } from "@/lib/reports/guard";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { dayKeyOf, rangeBounds, zonedToUtc } from "@/lib/reports/range";

interface AccRow {
  key: string;
  unitsSold: number | bigint;
  revenue: number | bigint;
}

// Bebidas: agrupa por combinación / sabor / tamaño / tipo de boba según
// `groupBy`, con unidades e ingresos (SUM de unitPrice*quantity) en SQLite.
function drinkGroupSql(groupBy: Exclude<TopProductsGroupBy, "topping">): string {
  const keyExpr =
    groupBy === "drink"
      ? `oi."flavorName" || ' · ' || oi."sizeName" || ' · ' || oi."bobaTypeName"`
      : groupBy === "flavor"
        ? `oi."flavorName"`
        : groupBy === "size"
          ? `oi."sizeName"`
          : `oi."bobaTypeName"`;
  return `
    SELECT ${keyExpr} AS key,
           COALESCE(SUM(oi."quantity"), 0) AS unitsSold,
           COALESCE(SUM(oi."unitPrice" * oi."quantity"), 0) AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."createdAt" >= ? AND o."createdAt" < ? AND o."status" != 'ANULADO'
      AND oi."menuItemName" IS NULL
    GROUP BY ${keyExpr}
  `;
}

// Toppings: agrupa por topping, contando la cantidad del ítem padre y su ingreso.
const TOPPING_SQL = `
  SELECT t."toppingName" AS key,
         COALESCE(SUM(oi."quantity"), 0) AS unitsSold,
         COALESCE(SUM(t."unitPrice" * oi."quantity"), 0) AS revenue
  FROM "OrderItemTopping" t
  JOIN "OrderItem" oi ON oi.id = t."orderItemId"
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."createdAt" >= ? AND o."createdAt" < ? AND o."status" != 'ANULADO'
  GROUP BY t."toppingName"
`;

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

    const sql = groupBy === "topping" ? TOPPING_SQL : drinkGroupSql(groupBy);
    const rows = await prisma.$queryRawUnsafe<AccRow[]>(
      sql,
      bounds.gte,
      bounds.lt,
    );

    const data = rank(rows, query);

    if (query.format === "csv") {
      const headers = [
        "Puesto",
        "Producto",
        "Unidades",
        "Ingresos",
        "Precio promedio",
      ];
      const csvRows = data.map((r) => [
        r.rank,
        r.key,
        r.unitsSold,
        r.revenue,
        r.unitPriceAvg,
      ]);
      const fromKey = dayKeyOf(zonedToUtc(query.from));
      const toKey = dayKeyOf(zonedToUtc(query.to));
      const filename =
        groupBy === "topping"
          ? `top-toppings-${fromKey}_${toKey}.csv`
          : `top-productos-${fromKey}_${toKey}.csv`;
      return csvResponse(filename, buildCsv(headers, csvRows));
    }

    return jsonOk(reportEnvelope("top-products", bounds.gte, bounds.lt, data));
  });
}

function rank(
  rows: AccRow[],
  query: { metric: "quantity" | "revenue"; limit?: number },
): TopProductRow[] {
  const sorted = rows
    .map((r) => ({
      key: r.key,
      unitsSold: Number(r.unitsSold),
      revenue: Number(r.revenue),
    }))
    .sort((a, b) => {
      const diff =
        query.metric === "quantity"
          ? b.unitsSold - a.unitsSold
          : b.revenue - a.revenue;
      return diff !== 0 ? diff : a.key.localeCompare(b.key);
    });

  const sliced = query.limit ? sorted.slice(0, query.limit) : sorted;

  return sliced.map((r, index) => ({
    rank: index + 1,
    key: r.key,
    unitsSold: r.unitsSold,
    revenue: r.revenue,
    unitPriceAvg:
      r.unitsSold > 0 ? Math.round(r.revenue / r.unitsSold) : 0,
  }));
}