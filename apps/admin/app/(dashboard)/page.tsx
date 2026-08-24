import Link from "next/link";
import { prisma } from "@bubba/db";
import { OrderStatusLabel, formatPrice, formatOrderCode } from "@bubba/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@bubba/ui";

function statusVariant(status: string) {
  switch (status) {
    case "RECIBIDO":
      return "warning" as const;
    case "ACEPTADO":
      return "default" as const;
    case "ENTREGADO":
      return "success" as const;
    case "ANULADO":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default async function DashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayOrders, pendingOrders, todayRevenue, recentOrders] =
    await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count({
        where: { status: "RECIBIDO" },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const metrics = [
    {
      label: "Pedidos hoy",
      value: String(todayOrders),
    },
    {
      label: "Pedidos por cobrar",
      value: String(pendingOrders),
    },
    {
      label: "Ventas del día",
      value: formatPrice(todayRevenue._sum.total ?? 0),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de la actividad del restaurante.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{m.value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Pedidos recientes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/orders">Ver todos</Link>
          </Button>
        </div>
        {recentOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Aún no hay pedidos registrados.
            </CardContent>
          </Card>
        ) : (
          recentOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    Pedido #{formatOrderCode(order.seq)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.items.reduce((acc, i) => acc + i.quantity, 0)} bebida
                    {order.items.reduce((acc, i) => acc + i.quantity, 0) !== 1
                      ? "s"
                      : ""}{" "}
                    ·{" "}
                    {new Date(order.createdAt).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(order.status)}>
                    {OrderStatusLabel[order.status]}
                  </Badge>
                  <span className="font-bold">{formatPrice(order.total)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
