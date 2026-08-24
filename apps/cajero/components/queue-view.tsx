"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@bubba/ui";
import {
  formatOrderCode,
  formatPrice,
  formatDurationMinutes,
  type Order,
} from "@bubba/types";
import { deliverOrder } from "@/app/actions/orders";

function ageMinutes(createdAtIso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(createdAtIso).getTime()) / 60_000));
}

export function QueueView({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reloj para la antigüedad de cada pedido.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Refresco automático de la cola; se pausa con la pestaña oculta.
  useEffect(() => {
    if (document.hidden) return;
    const timer = setInterval(() => router.refresh(), 15_000);
    const onVisibility = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  async function handleDeliver(orderId: string) {
    if (
      !confirm("¿Confirmas la entrega de este pedido? Esta acción no se puede deshacer.")
    ) {
      return;
    }
    setDeliveringId(orderId);
    setError(null);
    try {
      await deliverOrder(orderId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setDeliveringId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-lg font-semibold">No hay pedidos por preparar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Los pedidos nuevos aparecerán aquí automáticamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {orders.map((order) => {
        const minutes = ageMinutes(order.createdAt, now);
        const urgent = minutes >= 15;
        return (
          <Card key={order.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">
                    Pedido #{formatOrderCode(order.seq)}
                  </CardTitle>
                  {order.customerName && (
                    <p className="text-sm font-semibold text-primary">
                      Para: {order.customerName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={urgent ? "destructive" : "secondary"}>
                    Ingresado hace {formatDurationMinutes(minutes)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="font-medium">
                      {item.quantity}× {item.flavorName}{" "}
                      <span className="text-sm text-muted-foreground">
                        ({item.sizeName} · {item.bobaTypeName})
                      </span>
                      {item.toppings.length > 0 && (
                        <span className="block pl-4 text-xs text-muted-foreground">
                          + {item.toppings.map((t) => t.toppingName).join(", ")}
                        </span>
                      )}
                    </span>
                    <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <span className="text-lg font-bold">
                  Total: {formatPrice(order.total)}
                </span>
                <Button
                  size="lg"
                  disabled={deliveringId === order.id}
                  onClick={() => handleDeliver(order.id)}
                >
                  {deliveringId === order.id ? "Entregando…" : "Marcar entregado"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
