"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@bubba/ui";
import { formatPrice, type Order, type OrderStatus } from "@bubba/types";
import { advanceOrderStatus } from "@/app/actions/orders";

const FILTERS: { value: "ALL" | OrderStatus; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "RECIBIDO", label: "Recibidos" },
  { value: "EN_PREPARACION", label: "En preparación" },
  { value: "ENTREGADO", label: "Entregados" },
];

function statusVariant(status: OrderStatus) {
  switch (status) {
    case "RECIBIDO":
      return "warning" as const;
    case "EN_PREPARACION":
      return "default" as const;
    case "ENTREGADO":
      return "success" as const;
    default:
      return "secondary" as const;
  }
}

export function OrdersClient({
  orders,
  currentStatus,
  statusLabels,
}: {
  orders: Order[];
  currentStatus: "ALL" | OrderStatus;
  statusLabels: Record<OrderStatus, string>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground">
          Consulta y avanza el estado de los pedidos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={currentStatus === f.value ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={
                f.value === "ALL" ? "/orders" : `/orders?status=${f.value}`
              }
            >
              {f.label}
            </Link>
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No hay pedidos que mostrar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Pedido #{order.id}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(order.status)}>
                      {statusLabels[order.status]}
                    </Badge>
                    <span className="font-bold">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {item.quantity}× {item.sizeName} · {item.flavorName} ·{" "}
                        {item.bobaTypeName}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                {order.status !== "ENTREGADO" && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        advanceOrderStatus(order.id).catch((e) => {
                          alert(
                            e instanceof Error ? e.message : "Ocurrió un error.",
                          );
                        });
                      }}
                    >
                      Avanzar a:{" "}
                      {order.status === "RECIBIDO"
                        ? "En preparación"
                        : "Entregado"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
