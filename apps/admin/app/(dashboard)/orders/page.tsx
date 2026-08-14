import { prisma } from "@bubba/db";
import {
  OrderStatus,
  OrderStatusLabel,
  type Order,
} from "@bubba/types";
import { OrdersClient } from "./orders-client";

export const metadata = {
  title: "Pedidos — Bubba Admin",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const currentStatus =
    status && status in OrderStatus ? (status as Order["status"]) : "ALL";

  const where =
    currentStatus === "ALL"
      ? {}
      : { status: currentStatus as (typeof OrderStatus)[keyof typeof OrderStatus] };

  const rawOrders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const orders: Order[] = rawOrders.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      sizeName: i.sizeName,
      flavorName: i.flavorName,
      flavorCategory: i.flavorCategory,
      bobaTypeName: i.bobaTypeName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
    })),
  }));

  return (
    <OrdersClient
      orders={orders}
      currentStatus={currentStatus}
      statusLabels={OrderStatusLabel}
    />
  );
}
