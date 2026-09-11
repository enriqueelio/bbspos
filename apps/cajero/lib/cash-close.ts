import { prisma } from "@bbspos/db";
import {
  OrderStatus,
  parseDenominations,
  type CashCloseRecord,
  type CashCloseStats,
} from "@bbspos/types";
import { dayBounds } from "@/lib/day";

/** Contraste del día según el sistema, con el mismo criterio del reporte
 *  diario: solo pedidos ENTREGADOS cuentan para la caja, y un pago dividido
 *  queda prorrateado entre sus dos métodos (el primero recibe total − amount2,
 *  el segundo amount2). Ver @bbspos/db daily-report:collectReportStats. */
export async function getCashCloseStats(
  dateKey: string,
): Promise<CashCloseStats> {
  const bounds = dayBounds(dateKey);

  const [delivered, ledger] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: OrderStatus.ENTREGADO,
        deliveredAt: { gte: bounds.gte, lt: bounds.lt },
      },
      select: {
        total: true,
        paymentMethod: true,
        paymentMethod2: true,
        paymentAmount2: true,
      },
    }),
    // Cuentas de pensionados: la recarga/pago de deuda es ingreso real de caja
    // del día; el consumo se cobra contra la cuenta y NO entra a la caja.
    prisma.customerLedger.findMany({
      where: { createdAt: { gte: bounds.gte, lt: bounds.lt } },
      select: { type: true, amount: true, paymentMethod: true },
    }),
  ]);

  // Acumuladores por método de pago (pagos divididos ya prorrateados).
  const acc = { EFECTIVO: 0, QR: 0, TARJETA: 0, PENSION: 0 };
  let splitOrders = 0;
  const add = (method: string, amount: number) => {
    if (!(method in acc)) return;
    acc[method as keyof typeof acc] += amount;
  };

  for (const order of delivered) {
    if (!order.paymentMethod) continue;
    if (order.paymentMethod2 && order.paymentAmount2 != null) {
      splitOrders += 1;
      add(order.paymentMethod, order.total - order.paymentAmount2);
      add(order.paymentMethod2, order.paymentAmount2);
    } else {
      add(order.paymentMethod, order.total);
    }
  }

  // Recargas/pagos de deuda de pensionados: ingresos reales de caja del día.
  const moneyIn = ledger.filter(
    (l) => l.type === "RECARGA" || l.type === "PAGO_DEUDA",
  );
  // Consumos cobrados contra la cuenta: NO entran a la caja.
  const pensionSales = ledger
    .filter((l) => l.type === "CONSUMO")
    .reduce((sum, l) => sum + l.amount, 0);

  const rechargeCash = moneyIn
    .filter((l) => (l.paymentMethod ?? "EFECTIVO") === "EFECTIVO")
    .reduce((sum, l) => sum + l.amount, 0);
  const rechargeQr = moneyIn
    .filter((l) => (l.paymentMethod ?? "EFECTIVO") === "QR")
    .reduce((sum, l) => sum + l.amount, 0);

  return {
    date: dateKey,
    deliveredOrders: delivered.length,
    systemCash: acc.EFECTIVO,
    systemQr: acc.QR,
    systemCard: acc.TARJETA,
    pensionSales,
    rechargeCash,
    rechargeQr,
    expectedCash: acc.EFECTIVO + rechargeCash,
    splitOrders,
  };
}

/** Historial de cierres del día (más reciente primero) para auditoría y
 *  reimpresión del ticket resumen. */
export async function getCashCloses(
  dateKey: string,
): Promise<CashCloseRecord[]> {
  const rows = await prisma.cashClose.findMany({
    where: { date: dateKey },
    orderBy: { closedAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    closedAt: row.closedAt.toISOString(),
    userName: row.user?.name ?? "—",
    denominations: parseDenominations(row.denominations),
    countedCash: row.countedCash,
    systemCash: row.systemCash,
    systemQr: row.systemQr,
    systemCard: row.systemCard,
    pensionSales: row.pensionSales,
    rechargeCash: row.rechargeCash,
    rechargeQr: row.rechargeQr,
    expectedCash: row.systemCash,
    diffCash: row.diffCash,
    notes: row.notes,
  }));
}