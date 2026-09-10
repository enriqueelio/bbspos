import { prisma } from "@bbspos/db";
import {
  OrderStatus,
  type Order,
} from "@bbspos/types";
import { OrdersClient } from "./orders-client";

export const metadata = {
  title: "Pedidos — BBSPOS Admin",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const currentStatus =
    status && status in OrderStatus ? (status as Order["status"]) : "ALL";

  // Se cargan todos los pedidos y el filtrado por estado y fechas se hace en
  // el cliente (OrdersClient), para que la lista se actualice sin recargar.
  const rawOrders = await prisma.order.findMany({
    include: {
      items: { include: { toppings: true } },
      user: { select: { name: true, shift: true } },
      canceledBy: { select: { name: true, role: true } },
      discountedBy: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const orders: Order[] = rawOrders.map((o) => ({
    id: o.id,
    seq: o.seq,
    orderDate: o.orderDate,
    daySeq: o.daySeq,
    status: o.status,
    customerName: o.customerName,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      sizeName: i.sizeName,
      flavorName: i.flavorName,
      flavorCategory: i.flavorCategory,
      bobaTypeName: i.bobaTypeName,
      menuItemName: i.menuItemName,
      menuItemCategory: i.menuItemCategory,
      menuItemOptionName: i.menuItemOptionName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      toppings: i.toppings.map((t) => ({
        id: t.id,
        toppingName: t.toppingName,
        unitPrice: t.unitPrice,
      })),
    })),
    userId: o.userId,
    userName: o.user?.name ?? null,
    userShift: (o.user?.shift as Order["userShift"]) ?? null,
    paymentMethod: o.paymentMethod ?? null,
    paymentMethod2: o.paymentMethod2 ?? null,
    paymentAmount2: o.paymentAmount2 ?? null,
    discountAmount: o.discountAmount,
    discountReason: o.discountReason,
    cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,
    cancelReason: o.cancelReason,
    canceledBy: o.canceledBy
      ? { name: o.canceledBy.name, role: o.canceledBy.role }
      : null,
    discountedBy: o.discountedBy
      ? { name: o.discountedBy.name, role: o.discountedBy.role }
      : null,
  }));

  return (
    <OrdersClient
      orders={orders}
      currentStatus={currentStatus}
    />
  );
}
