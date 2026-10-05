import { prisma } from "@bbspos/db";
import { getRequiredSession } from "@/lib/session";
import { CustomersClient, type ClientCustomer } from "./customers-client";

export const metadata = {
  title: "Clientes (Mostrador) — BBSPOS Admin",
};

export default async function CustomersPage() {
  const [session, customers] = await Promise.all([
    getRequiredSession(),
    prisma.customer.findMany({
      where: { account: null },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        ci: true,
        phone: true,
        totalVisits: true,
        totalSpent: true,
        lastVisitAt: true,
        points: true,
        createdAt: true,
      },
    }),
  ]);

  const data: ClientCustomer[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    ci: c.ci,
    phone: c.phone ?? "",
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