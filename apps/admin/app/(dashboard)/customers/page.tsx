import { prisma } from "@bbspos/db";
import { type CustomerLedgerType } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { CustomersClient, type PensionCustomer } from "./customers-client";

export const metadata = {
  title: "Clientes / Pensionados — BBSPOS Admin",
};

export default async function CustomersPage() {
  const [session, customers] = await Promise.all([
    getRequiredSession(),
    prisma.customer.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        ledger: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    }),
  ]);

  const data: PensionCustomer[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    ci: c.ci,
    phone: c.phone,
    pensionType: c.pensionType,
    balance: c.balance,
    creditLimit: c.creditLimit,
    createdAt: c.createdAt.toISOString(),
    ledger: c.ledger.map((l) => ({
      id: l.id,
      customerId: l.customerId,
      type: l.type as CustomerLedgerType,
      amount: l.amount,
      paymentMethod: l.paymentMethod,
      orderId: l.orderId,
      createdAt: l.createdAt.toISOString(),
    })),
  }));

  return (
    <CustomersClient
      customers={data}
      currentUserRole={session.user.role}
    />
  );
}