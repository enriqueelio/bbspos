import { prisma } from "@bbspos/db";
import { getRequiredSession } from "@/lib/session";
import { CustomersClient, type ClientCustomer } from "./customers-client";

export const metadata = {
  title: "Clientes — BBSPOS Admin",
};

export default async function CustomersPage() {
  const [session, customers] = await Promise.all([
    getRequiredSession(),
    prisma.customer.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        account: {
          select: { pensionType: true, balance: true, creditLimit: true },
        },
      },
    }),
  ]);

  const data: ClientCustomer[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    ci: c.ci,
    phone: c.phone ?? "",
    pensionType: c.account?.pensionType ?? null,
    balance: c.account?.balance ?? 0,
    creditLimit: c.account?.creditLimit ?? 0,
    totalVisits: c.totalVisits,
    totalSpent: c.totalSpent,
    lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
    points: c.points,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <CustomersClient
      customers={data}
      currentUserRole={session.user.role}
    />
  );
}