import { prisma } from "@bbspos/db";
import { type CustomerLedgerType } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { PensionadosClient, type PensionadoCustomer, type PensionadosKPIs } from "./pensionados-client";

export const metadata = {
  title: "Cuentas Pensionadas — BBSPOS Admin",
};

export default async function PensionadosPage() {
  const [session, customers] = await Promise.all([
    getRequiredSession(),
    prisma.customer.findMany({
      where: { account: { isNot: null } },
      orderBy: [{ name: "asc" }],
      include: {
        account: {
          include: { ledger: { orderBy: { createdAt: "desc" }, take: 100 } },
        },
      },
    }),
  ]);

  const data: PensionadoCustomer[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    pensionType: c.account?.pensionType ?? "PREPAGO",
    balance: c.account?.balance ?? 0,
    creditLimit: c.account?.creditLimit ?? 0,
    createdAt: c.createdAt.toISOString(),
    ledger: c.account?.ledger.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      type: l.type as CustomerLedgerType,
      amount: l.amount,
      paymentMethod: l.paymentMethod,
      orderId: l.orderId,
      createdAt: l.createdAt.toISOString(),
    })) ?? [],
  }));

  // KPIs
  const totalSaldoAFavor = data
    .filter((c) => c.pensionType === "PREPAGO" && c.balance > 0)
    .reduce((sum, c) => sum + c.balance, 0);
  const totalDeudaPorCobrar = data
    .filter((c) => c.pensionType === "POSTPAGO" && c.balance < 0)
    .reduce((sum, c) => sum + Math.abs(c.balance), 0);

  const kpis: PensionadosKPIs = { totalSaldoAFavor, totalDeudaPorCobrar };

  return (
    <PensionadosClient
      customers={data}
      kpis={kpis}
      currentUserRole={session.user.role}
    />
  );
}