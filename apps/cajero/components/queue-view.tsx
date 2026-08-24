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
  PaymentMethodLabel,
  type Order,
} from "@bubba/types";
import { acceptOrder, deliverOrder } from "@/app/actions/orders";

function ageMinutes(createdAtIso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(createdAtIso).getTime()) / 60_000));
}

function useQueueClock() {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
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

  async function run(
    orderId: string,
    action: () => Promise<void>,
    confirmMsg?: string,
  ) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusyId(orderId);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setBusyId(null);
    }
  }

  return { now, busyId, error, run, setError };
}

function AgeBadge({ createdAtIso, now }: { createdAtIso: string; now: number }) {
  const minutes = ageMinutes(createdAtIso, now);
  const urgent = minutes >= 15;
  return (
    <Badge variant={urgent ? "destructive" : "secondary"}>
      Ingresado hace {formatDurationMinutes(minutes)}
    </Badge>
  );
}

function ItemsList({ order }: { order: Order }) {
  return (
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
  );
}

/** Pedido RECIBIDO: falta registrar el pago (Efectivo o QR). */
function PendingPaymentCard({
  order,
  clock,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
}) {
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
            <AgeBadge createdAtIso={order.createdAt} now={clock.now} />
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
        <ItemsList order={order} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-lg font-bold">
            Total: {formatPrice(order.total)}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={clock.busyId === order.id}
              onClick={() =>
                clock.run(order.id, async () => {
                  await acceptOrder(order.id, "EFECTIVO");
                })
              }
            >
              {clock.busyId === order.id ? "…" : `Cobró ${PaymentMethodLabel.EFECTIVO}`}
            </Button>
            <Button
              variant="outline"
              disabled={clock.busyId === order.id}
              onClick={() =>
                clock.run(order.id, async () => {
                  await acceptOrder(order.id, "QR");
                })
              }
            >
              Cobró {PaymentMethodLabel.QR}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Pedido ACEPTADO (pagado): listo para entregar. */
function ReadyToDeliverCard({
  order,
  clock,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
}) {
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
            <Badge variant="default">Pagado</Badge>
            <AgeBadge createdAtIso={order.createdAt} now={clock.now} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ItemsList order={order} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-lg font-bold">
            Total: {formatPrice(order.total)}
          </span>
          <Button
            size="lg"
            disabled={clock.busyId === order.id}
            onClick={() =>
              clock.run(
                order.id,
                async () => {
                  await deliverOrder(order.id);
                },
                "¿Confirmas la entrega de este pedido? Esta acción no se puede deshacer.",
              )
            }
          >
            {clock.busyId === order.id ? "Entregando…" : "Marcar entregado"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyQueue({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function QueueView({
  pendingPayment,
  readyToDeliver,
}: {
  pendingPayment: Order[];
  readyToDeliver: Order[];
}) {
  const clock = useQueueClock();
  const empty = pendingPayment.length === 0 && readyToDeliver.length === 0;

  if (empty) {
    return (
      <EmptyQueue
        title="No hay pedidos por preparar"
        hint="Los pedidos nuevos aparecerán aquí automáticamente."
      />
    );
  }

  return (
    <div className="space-y-6">
      {clock.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {clock.error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          Por cobrar
          <Badge variant="warning">{pendingPayment.length}</Badge>
        </h2>
        {pendingPayment.length === 0 ? (
          <EmptyQueue
            title="Nada pendiente de pago"
            hint="Los pedidos sin pagar del día aparecerán aquí."
          />
        ) : (
          pendingPayment.map((order) => (
            <PendingPaymentCard key={order.id} order={order} clock={clock} />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          Por entregar
          <Badge variant="default">{readyToDeliver.length}</Badge>
        </h2>
        {readyToDeliver.length === 0 ? (
          <EmptyQueue
            title="Nada pendiente de entrega"
            hint="Los pedidos pagados esperando entrega aparecerán aquí."
          />
        ) : (
          readyToDeliver.map((order) => (
            <ReadyToDeliverCard key={order.id} order={order} clock={clock} />
          ))
        )}
      </section>
    </div>
  );
}
