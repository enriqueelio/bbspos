import { prisma } from "@bbspos/db";
import { OrderStatus, type Order } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { dayBounds, todayKey } from "@/lib/day";
import { getCashierDailyData } from "@/lib/report";
import { ReportView } from "@/components/report-view";
import { ReportActions } from "@/components/report-actions";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { SignOutButton } from "@/components/sign-out-button";
import {
  SettingsMenu,
  type ReprintOrderOption,
} from "@/components/settings-menu";
import { getPosCatalog } from "@/actions/pos";
import type { PensionCustomerOption } from "@/components/pension-payment-dialog";

type Tab = "venta" | "reporte";

function toPlainOrder(order: {
  id: string;
  seq: number | null;
  orderDate: string | null;
  daySeq: number | null;
  status: string;
  customerName: string | null;
  notes: string | null;
  customerId: string | null;
  total: number;
  createdAt: Date;
  acceptedAt: Date | null;
  deliveredAt: Date | null;
  delayNotified: boolean;
  paidAt: Date | null;
  paymentMethod: string | null;
  paymentMethod2: string | null;
  paymentAmount2: number | null;
  items: {
    id: string;
    sizeName: string | null;
    flavorName: string | null;
    flavorCategory: string | null;
    bobaTypeName: string | null;
    menuItemName: string | null;
    menuItemCategory: string | null;
    menuItemOptionName: string | null;
    unitPrice: number;
    quantity: number;
    toppings: { toppingName: string; unitPrice: number }[];
  }[];
}): Order {
  return {
    id: order.id,
    seq: order.seq,
    orderDate: order.orderDate,
    daySeq: order.daySeq,
    status: order.status as Order["status"],
    customerName: order.customerName,
    notes: order.notes,
    customerId: order.customerId,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    delayNotified: order.delayNotified,
    paidAt: order.paidAt?.toISOString() ?? null,
    paymentMethod:
      (order.paymentMethod as Order["paymentMethod"]) ?? null,
    paymentMethod2:
      (order.paymentMethod2 as Order["paymentMethod2"]) ?? null,
    paymentAmount2: order.paymentAmount2,
    items: order.items.map((item) => ({
      id: item.id,
      sizeName: item.sizeName,
      flavorName: item.flavorName,
      flavorCategory:
        item.flavorCategory as Order["items"][number]["flavorCategory"],
      bobaTypeName: item.bobaTypeName,
      menuItemName: item.menuItemName,
      menuItemCategory:
        item.menuItemCategory as Order["items"][number]["menuItemCategory"],
      menuItemOptionName: item.menuItemOptionName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      toppings: item.toppings,
    })),
  };
}

/** Pedidos activos (cola) y clientes pensionados para todo el día de hoy. */
async function getQueueData() {
  const bounds = dayBounds(todayKey());
  const [rows, dbCustomers] = await Promise.all([
    prisma.order.findMany({
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
    }),
    prisma.customer.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        ci: true,
        pensionType: true,
        balance: true,
        creditLimit: true,
      },
    }),
  ]);

  const pensionCustomers: PensionCustomerOption[] = dbCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    ci: c.ci,
    pensionType: c.pensionType as PensionCustomerOption["pensionType"],
    balance: c.balance,
    creditLimit: c.creditLimit,
  }));

  const orders = rows.map(toPlainOrder);

  return { orders, pensionCustomers };
}

/** Pedidos reimprimibles del día (Recibido o Aceptado), los más recientes
 *  primero, para el submenú de Reimpresión de la rueda dentada. */
async function getPrintableOrders(): Promise<ReprintOrderOption[]> {
  const bounds = dayBounds(todayKey());
  const rows = await prisma.order.findMany({
    where: {
      status: {
        in: [OrderStatus.RECIBIDO, OrderStatus.ACEPTADO],
      },
      createdAt: { gte: bounds.gte, lt: bounds.lt },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      seq: true,
      daySeq: true,
      customerName: true,
      createdAt: true,
    },
    take: 30,
  });
  return rows.map((r) => ({
    id: r.id,
    seq: r.seq,
    daySeq: r.daySeq,
    customerName: r.customerName,
    createdAt: r.createdAt.toISOString(),
  }));
}

export default async function CashierPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getRequiredSession();
  const { tab: tabParam } = await searchParams;
  // Nueva Venta es la pantalla por defecto (mesero y cajero); el reporte solo
  // se abre si se pide explícitamente con ?tab=reporte.
  const tab: Tab = tabParam === "reporte" ? "reporte" : "venta";

  if (tab === "venta") {
    const catalog = await getPosCatalog();
    const { orders: queueOrders, pensionCustomers } = await getQueueData();
    const printableOrders = await getPrintableOrders();

    return (
      <main className="flex h-dvh w-full flex-col overflow-hidden">
        <div className="w-full shrink-0 px-4 pt-2">
          <Header
            name={session.user.name ?? ""}
            role={session.user.role}
            printableOrders={printableOrders}
          />
        </div>
        <div className="min-h-0 flex-1">
          <PosTerminal
            catalog={catalog}
            role={session.user.role}
            queueOrders={queueOrders}
            customers={pensionCustomers}
          />
        </div>
      </main>
    );
  }

  if (tab === "reporte") {
    const data = await getCashierDailyData(session.user.id);
    const printableOrders = await getPrintableOrders();

    return (
      <main className="h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[70vw] space-y-6 px-4 py-5">
          <Header
            name={session.user.name ?? ""}
            role={session.user.role}
            printableOrders={printableOrders}
          />
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

  return null;
}

function Header({
  name,
  role,
  printableOrders,
}: {
  name: string;
  role: string;
  printableOrders: ReprintOrderOption[];
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3">
      <div className="flex shrink-0 items-center gap-2 font-bold">
        <span className="inline-block h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700" />
        <span>
          BBSPOS {role === "MESERO" ? "Mesero" : "Cajero"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <SettingsMenu printableOrders={printableOrders} />
        <span className="text-sm font-bold text-foreground">{name}</span>
        <SignOutButton />
      </div>
    </div>
  );
}
