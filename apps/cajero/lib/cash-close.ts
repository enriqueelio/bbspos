import { prisma, type Prisma } from "@bbspos/db";
import {
  OrderStatus,
  parseDenominations,
  type CashCloseRecord,
  type CashCloseStats,
  type CashMovementRecord,
  type CashMovementSource,
  type CashMovementType,
} from "@bbspos/types";
import { dayBounds } from "@/lib/day";

type CashCloseDb = Pick<
  Prisma.TransactionClient,
  "order" | "customerLedger" | "cashMovement"
>;

function toMovementRecord(row: {
  id: string;
  date: string;
  createdAt: Date;
  type: string;
  source: string;
  concept: string;
  amount: number;
  cashCloseId: string | null;
  voidedAt: Date | null;
  user: { name: string } | null;
}): CashMovementRecord {
  return {
    id: row.id,
    date: row.date,
    createdAt: row.createdAt.toISOString(),
    type: row.type as CashMovementType,
    source: row.source as CashMovementSource,
    concept: row.concept,
    amount: row.amount,
    userName: row.user?.name ?? "—",
    cashCloseId: row.cashCloseId,
    voidedAt: row.voidedAt?.toISOString() ?? null,
  };
}

/** Contraste del día del cajero: solo se consideran los pedidos ENTREGADOS
 *  cobrados por ese usuario (`Order.paidById`), de modo que cada cierre cubre
 *  exclusivamente lo que cobró, aunque el pedido lo haya tomado un mesero. Un
 *  pago dividido queda prorrateado entre sus dos métodos (el primero recibe
 *  total − amount2, el segundo amount2).
 *  Los movimientos manuales del mismo cajero y su excedente también ajustan la
 *  gaveta. Las recargas de pensionados se registran desde el admin y no tienen
 *  dueño en caja, así que no entran en el cierre de un cajero. */
export async function getCashCloseStats(
  dateKey: string,
  userId: string,
  db: CashCloseDb = prisma,
): Promise<CashCloseStats> {
  const bounds = dayBounds(dateKey);

  const [delivered, ledger, movements] = await Promise.all([
    db.order.findMany({
      where: {
        status: OrderStatus.ENTREGADO,
        deliveredAt: { gte: bounds.gte, lt: bounds.lt },
        paidById: userId,
      },
      select: {
        total: true,
        paymentMethod: true,
        paymentMethod2: true,
        paymentAmount2: true,
      },
    }),
    // Consumos de pensionados del propio cajero: se cobran contra la cuenta y
    // NO entran a la caja; solo se informan en el cierre.
    db.customerLedger.findMany({
      where: {
        type: "CONSUMO",
        order: {
          paidById: userId,
          status: OrderStatus.ENTREGADO,
          deliveredAt: { gte: bounds.gte, lt: bounds.lt },
        },
      },
      select: { amount: true },
    }),
    db.cashMovement.findMany({
      where: { date: dateKey, voidedAt: null, userId },
      select: { type: true, amount: true },
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

  // Consumos cobrados contra la cuenta: NO entran a la caja.
  const pensionSales = ledger.reduce((sum, l) => sum + l.amount, 0);

  // Las recargas/pagos de deuda se registran desde el admin y no pertenecen a
  // ningún cajero; quedan fuera del cierre individual.
  const rechargeCash = 0;
  const rechargeQr = 0;

  const cashIncome = movements
    .filter((m) => m.type === "INGRESO")
    .reduce((sum, m) => sum + m.amount, 0);
  const cashExpense = movements
    .filter((m) => m.type === "EGRESO")
    .reduce((sum, m) => sum + m.amount, 0);

  return {
    date: dateKey,
    deliveredOrders: delivered.length,
    systemCash: acc.EFECTIVO,
    systemQr: acc.QR,
    systemCard: acc.TARJETA,
    pensionSales,
    rechargeCash,
    rechargeQr,
    cashIncome,
    cashExpense,
    expectedCash:
      acc.EFECTIVO + rechargeCash + cashIncome - cashExpense,
    splitOrders,
  };
}

/** Movimientos de efectivo activos del día del cajero (más reciente primero). */
export async function getCashMovements(
  dateKey: string,
  userId: string,
): Promise<CashMovementRecord[]> {
  const rows = await prisma.cashMovement.findMany({
    where: { date: dateKey, voidedAt: null, userId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });
  return rows.map(toMovementRecord);
}

/** Cierres del día del cajero (más reciente primero) para consulta y
 *  reimpresión de su propio ticket resumen. */
export async function getCashCloses(
  dateKey: string,
  userId: string,
): Promise<CashCloseRecord[]> {
  const rows = await prisma.cashClose.findMany({
    where: { date: dateKey, userId },
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
    cashIncome: row.cashIncome,
    cashExpense: row.cashExpense,
    autoSurplus: row.autoSurplus,
    expectedCash: row.systemCash,
    diffCash: row.diffCash,
    notes: row.notes,
    movements: [],
  }));
}
