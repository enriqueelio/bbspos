import Link from "next/link";
import { prisma } from "@bubba/db";
import { OrderStatus, type Order } from "@bubba/types";
import { getRequiredSession } from "@/lib/session";
import { dayBounds, todayKey } from "@/lib/day";
import { getCashierDailyData } from "@/lib/report";
import { QueueView } from "@/components/queue-view";
import { ReportView } from "@/components/report-view";

type Tab = "preparar" | "reporte";

function toPlainOrder(order: {
  id: string;
  seq: number | null;
  status: string;
  customerName: string | null;
  total: number;
  createdAt: Date;
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
    deliveredAt: null,
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
        status: { in: [OrderStatus.RECIBIDO, OrderStatus.ACEPTADO] },
        createdAt: { gte: bounds.gte, lt: bounds.lt },
      },
      include: {
        items: { include: { toppings: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const plain = rows.map(toPlainOrder);
    const pendingPayment = plain.filter((o) => o.status === OrderStatus.RECIBIDO);
    const readyToDeliver = plain.filter((o) => o.status === OrderStatus.ACEPTADO);

    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <Header name={session.user.name ?? ""} role={session.user.role} tab={tab} />
        <QueueView
          pendingPayment={pendingPayment}
          readyToDeliver={readyToDeliver}
        />
      </main>
    );
  }

  const data = await getCashierDailyData(session.user.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <Header name={session.user.name ?? ""} role={session.user.role} tab={tab} />
      <ReportView data={data} myName={session.user.name ?? ""} />
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
          Preparar
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
