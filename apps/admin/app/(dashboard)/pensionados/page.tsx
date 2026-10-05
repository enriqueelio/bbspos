import { prisma } from "@bbspos/db";
import { type CustomerLedgerType } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { PensionadosClient, type PensionadoCustomer } from "./pensionados-client";

export const metadata = {
  title: "Pensionados (Cuentas Corrientes) — BBSPOS Admin",
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
    ci: c.ci,
    phone: c.phone ?? "",
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

  return (
    <PensionadosClient
      customers={data}
      currentUserRole={session.user.role}
    />
  );
}