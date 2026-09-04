import Link from "next/link";
import { prisma } from "@bbspos/db";
import { OrderStatusLabel, formatPrice, formatOrderCode } from "@bbspos/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
} from "@bbspos/ui";

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
      valueClass: "",
    },
    {
      label: "Pedidos por cobrar",
      value: String(pendingOrders),
      valueClass: pendingOrders > 0 ? "text-amber-400" : "",
    },
    {
      label: "Ventas del día",
      value: formatPrice(todayRevenue._sum.total ?? 0),
      valueClass: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de la actividad del restaurante.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label} className="p-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {m.label}
            </CardTitle>
            <div
              className={`mt-2 font-mono text-5xl font-black tracking-tighter ${m.valueClass}`}
            >
              {m.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Pedidos recientes</h2>
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
