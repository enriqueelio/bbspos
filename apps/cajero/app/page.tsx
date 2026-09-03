import Link from "next/link";
import { prisma } from "@bubba/db";
import { OrderStatus, type Order } from "@bubba/types";
import { getRequiredSession } from "@/lib/session";
import { dayBounds, todayKey } from "@/lib/day";
import { getCashierDailyData } from "@/lib/report";
import { QueueView } from "@/components/queue-view";
import { ReportView } from "@/components/report-view";
import { ReportActions } from "@/components/report-actions";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { SignOutButton } from "@/components/sign-out-button";
import { getPosCatalog } from "@/actions/pos";

type Tab = "preparar" | "venta" | "reporte";

function toPlainOrder(order: {
  id: string;
  seq: number | null;
  status: string;
  customerName: string | null;
  total: number;
  createdAt: Date;
  deliveredAt: Date | null;
  delayNotified: boolean;
  paidAt: Date | null;
  paymentMethod: string | null;
  paymentMethod2: string | null;
  paymentAmount2: number | null;
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
    delayNotified: order.delayNotified,
    paidAt: order.paidAt?.toISOString() ?? null,
    paymentMethod:
      (order.paymentMethod as Order["paymentMethod"]) ?? null,
    paymentMethod2:
      (order.paymentMethod2 as Order["paymentMethod2"]) ?? null,
    paymentAmount2: order.paymentAmount2,
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
  const isMesero = session.user.role === "MESERO";
  // El mesero solo toma órdenes: siempre aterriza en Nueva Venta.
  const tab: Tab = isMesero
    ? "venta"
    : tabParam === "reporte"
      ? "reporte"
      : tabParam === "venta"
        ? "venta"
        : "preparar";

  if (tab === "venta") {
    const catalog = await getPosCatalog();

    return (
      <main className="h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[70vw] px-4 pt-4">
          <Header
            name={session.user.name ?? ""}
            role={session.user.role}
            tab={tab}
          />
        </div>
        <div className="mx-auto mt-2 w-full max-w-[70vw] px-4 lg:px-6">
          <PosTerminal catalog={catalog} role={session.user.role} />
        </div>
      </main>
    );
  }

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
      <main className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-[70vw] px-4 py-6">
          <Header name={session.user.name ?? ""} role={session.user.role} tab={tab} />
        </div>
        <div className="scroll-touch min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[70vw] px-4 pb-6">
            <QueueView orders={rows.map(toPlainOrder)} role={session.user.role} />
          </div>
        </div>
      </main>
    );
  }

  const data = await getCashierDailyData(session.user.id);

  return (
    <main className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[70vw] space-y-6 px-4 py-6">
        <Header name={session.user.name ?? ""} role={session.user.role} tab={tab} />
        <div className="flex items-center justify-between gap-3 print:hidden">
          <h1 className="text-xl font-bold">Reporte del día</h1>
          <ReportActions />
        </div>
        <div className="print-report-area">
          <ReportView data={data} myName={session.user.name ?? ""} />
        </div>
      </div>
    </main>
  );
}

function Header({
  name,
  role,
  tab,
}: {
  name: string;
  role: string;
  tab: Tab;
}) {
  const isMesero = role === "MESERO";
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 font-bold">
          <span className="inline-block h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700" />
          <span>Bubba Cajero</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{name}</span>
          <SignOutButton />
        </div>
      </div>
      {/* El mesero solo toma órdenes: no muestra navegación a otras vistas. */}
      {!isMesero && (
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
            href="/?tab=venta"
            className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
              tab === "venta"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Nueva Venta
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
      )}
    </>
  );
}
