import Link from "next/link";
import { prisma } from "@bubba/db";
import { OrderStatus, type Order } from "@bubba/types";
import { getRequiredSession } from "@/lib/session";
import { dayBounds, todayKey } from "@/lib/day";
import { getCashierDailyData } from "@/lib/report";
import { QueueView } from "@/components/queue-view";
import { ReportView } from "@/components/report-view";
import { ReportActions } from "@/components/report-actions";

type Tab = "preparar" | "reporte";

function toPlainOrder(order: {
  id: string;
  seq: number | null;
  status: string;
  customerName: string | null;
  total: number;
  createdAt: Date;
  deliveredAt: Date | null;
  items: {
    id: string;
    sizeName: string;
    flavorName: string;
    flavorCategory: string;
    bobaTypeName: string;
    unitPrice: number;
    quantity: number;
    toppings: { toppingName: string; unitPrice: number }[];
  }[];
}): Order {
  return {
    id: order.id,
    seq: order.seq,
    status: order.status as Order["status"],
    customerName: order.customerName,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      ...item,
      flavorCategory: item.flavorCategory as Order["items"][number]["flavorCategory"],
      toppings: item.toppings,
    })),
  };
}

export default async function CashierPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getRequiredSession();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "reporte" ? "reporte" : "preparar";

  if (tab === "preparar") {
    const bounds = dayBounds(todayKey());
    const rows = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.RECIBIDO, OrderStatus.ACEPTADO, OrderStatus.ENTREGADO],
        },
        createdAt: { gte: bounds.gte, lt: bounds.lt },
      },
      include: {
        items: { include: { toppings: true } },
      },
      // Los pedidos más recientes primero: el que acaba de entrar queda arriba.
      orderBy: [{ createdAt: "desc" }, { seq: "desc" }],
    });

    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <Header name={session.user.name ?? ""} role={session.user.role} tab={tab} />
        <QueueView orders={rows.map(toPlainOrder)} />
      </main>
    );
  }

  const data = await getCashierDailyData(session.user.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <Header name={session.user.name ?? ""} role={session.user.role} tab={tab} />
      <div className="flex items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold">Reporte del día</h1>
        <ReportActions />
      </div>
      <div className="print-report-area">
        <ReportView data={data} myName={session.user.name ?? ""} />
      </div>
    </main>
  );
}

function Header({
  name,
  tab,
}: {
  name: string;
  role: string;
  tab: Tab;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 font-bold">
          <span className="inline-block h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700" />
          <span>Bubba Cajero</span>
        </div>
        <span className="text-sm text-muted-foreground">{name}</span>
      </div>
      <nav className="flex gap-2">
        <Link
          href="/?tab=preparar"
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "preparar"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/?tab=reporte"
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "reporte"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Reporte del día
        </Link>
      </nav>
    </>
  );
}
