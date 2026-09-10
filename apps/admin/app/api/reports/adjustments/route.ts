import { prisma } from "@bbspos/db";
import {
  OrderStatus,
  type AdjustmentItem,
  type AdjustmentsData,
} from "@bbspos/types";
import {
  assertRange,
  parseSearchParams,
  adjustmentsQuerySchema,
} from "@/lib/reports/params";
import {
  handleReportRoute,
  jsonOk,
  notImplementedSchema,
  reportEnvelope,
} from "@/lib/reports/response";
import { hasAuditSchema, requireSession } from "@/lib/reports/guard";
import { buildCsv, csvResponse } from "@/lib/reports/csv";
import { dayKeyOf, rangeBounds, zonedToUtc } from "@/lib/reports/range";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  return handleReportRoute(async () => {
    await requireSession();

    if (!(await hasAuditSchema())) {
      throw notImplementedSchema();
    }

    const url = new URL(request.url);
    const query = adjustmentsQuerySchema.parse(
      parseSearchParams(url.searchParams),
    );
    assertRange(query);

    const bounds = rangeBounds(query.from, query.to);

    const discountWhere = {
      discountedAt: { gte: bounds.gte, lt: bounds.lt },
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const cancellationWhere = {
      status: OrderStatus.ANULADO,
      cancelledAt: { gte: bounds.gte, lt: bounds.lt },
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const where =
      query.type === "discount"
        ? discountWhere
        : query.type === "cancellation"
          ? cancellationWhere
          : { OR: [discountWhere, cancellationWhere] };

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        seq: true,
        daySeq: true,
        total: true,
        status: true,
        discountAmount: true,
        discountReason: true,
        discountedAt: true,
        cancelledAt: true,
        cancelReason: true,
        user: { select: { id: true, name: true } },
        canceledBy: { select: { id: true, name: true } },
        discountedBy: { select: { id: true, name: true } },
      },
    });

    let discountsCount = 0;
    let discountsTotal = 0;
    let cancellationsCount = 0;
    let cancellationsLostRevenue = 0;
    const items: AdjustmentItem[] = [];

    for (const order of orders) {
      if (order.status === OrderStatus.ANULADO && order.cancelledAt) {
        cancellationsCount += 1;
        cancellationsLostRevenue += order.total;
        items.push({
          type: "cancellation",
          orderId: order.id,
          orderSeq: order.daySeq ?? order.seq,
          amount: order.total,
          reason: order.cancelReason ?? "",
          byUser: (order.canceledBy ?? order.user)
            ? {
                id: (order.canceledBy ?? order.user)!.id,
                name: (order.canceledBy ?? order.user)!.name,
              }
            : null,
          at: order.cancelledAt.toISOString(),
        });
      }
      if ((order.discountAmount ?? 0) > 0 && order.discountedAt) {
        discountsCount += 1;
        discountsTotal += order.discountAmount ?? 0;
        items.push({
          type: "discount",
          orderId: order.id,
          orderSeq: order.daySeq ?? order.seq,
          amount: order.discountAmount ?? 0,
          reason: order.discountReason ?? "",
          byUser: (order.discountedBy ?? order.user)
            ? {
                id: (order.discountedBy ?? order.user)!.id,
                name: (order.discountedBy ?? order.user)!.name,
              }
            : null,
          at: order.discountedAt.toISOString(),
        });
      }
    }

    items.sort((a, b) => b.at.localeCompare(a.at));

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const page = Math.min(query.page, totalPages);
    const pagedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const data: AdjustmentsData = {
      summary: {
        discountsCount,
        discountsTotal,
        cancellationsCount,
        cancellationsLostRevenue,
      },
      items: pagedItems,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        totalItems,
        totalPages,
      },
    };

    if (query.format === "csv") {
      const headers = [
        "Tipo",
        "Pedido",
        "Monto",
        "Motivo",
        "Usuario",
        "Momento",
      ];
      const rows = items.map((item) => [
        item.type === "cancellation" ? "Anulación" : "Descuento",
        item.orderSeq ?? item.orderId,
        item.amount,
        item.reason,
        item.byUser?.name ?? "",
        item.at,
      ]);
      const fromKey = dayKeyOf(zonedToUtc(query.from));
      const toKey = dayKeyOf(zonedToUtc(query.to));
      return csvResponse(
        `anulaciones-descuentos-${fromKey}_${toKey}.csv`,
        buildCsv(headers, rows),
      );
    }

    return jsonOk(reportEnvelope("adjustments", bounds.gte, bounds.lt, data));
  });
}
