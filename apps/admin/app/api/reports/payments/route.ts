import { prisma } from "@bubba/db";
import type { PaymentsData } from "@bubba/types";
import {
  assertRange,
  parseSearchParams,
  paymentsQuerySchema,
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
    const query = paymentsQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    const bounds = rangeBounds(query.from, query.to);
    const { gte, lt } = bounds;

    // Desglose por método de pago: solo campos ligeros (sin items/toppings).
    // La lógica de pagos divididos (repartir monto por método) se calcula aquí.
    const payments = await prisma.order.findMany({
      where: { createdAt: { gte, lt }, ...notCancelled },
      select: {
        paymentMethod: true,
        paymentMethod2: true,
        paymentAmount2: true,
        total: true,
      },
    });

    const totals = new Map<string, { orders: number; revenue: number }>();
    for (const order of payments) {
      const method = order.paymentMethod;
      if (!method) continue;

      const add = (m: string, amount: number) => {
        const entry = totals.get(m) ?? { orders: 0, revenue: 0 };
        entry.orders += 1;
        entry.revenue += amount;
        totals.set(m, entry);
      };

      if (order.paymentMethod2 && order.paymentAmount2 != null) {
        // Pago dividido: cada método recibe su parte y cuenta como una orden.
        add(method, order.total - order.paymentAmount2);
        add(order.paymentMethod2, order.paymentAmount2);
      } else {
        add(method, order.total);
      }
    }

    const breakdown = [...totals.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([method, v]) => ({ method: method as PaymentsData["breakdown"][number]["method"], ...v }));

    const revenueTotal = payments.reduce((acc, o) => acc + o.total, 0);
    const data: PaymentsData = {
      summary: {
        revenueTotal,
        ordersTotal: payments.length,
        methodsCount: breakdown.length,
      },
      breakdown,
    };

    if (query.format === "csv") {
      const headers = ["Método de pago", "Órdenes", "Ingresos"];
      const rows = breakdown.map((r) => [r.method, r.orders, r.revenue]);
      const fromKey = dayKeyOf(zonedToUtc(query.from));
      const toKey = dayKeyOf(zonedToUtc(query.to));
      return csvResponse(
        `metodos-pago-${fromKey}_${toKey}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(reportEnvelope("payments", gte, lt, data));
  });
}