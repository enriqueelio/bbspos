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
  OrderStatus,
  OrderStatusLabel,
  type Order,
} from "@bubba/types";
import { acceptOrder, deliverOrder } from "@/app/actions/orders";
import { reprintOrder } from "@/app/actions/printing";
import { SplitPaymentDialog } from "@/components/split-payment-dialog";

function ageMinutes(createdAtIso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(createdAtIso).getTime()) / 60_000));
}

function useQueueClock() {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setBusyId(null);
    }
  }

  async function reprint(orderId: string) {
    setBusyId(orderId);
    setError(null);
    setNotice(null);
    try {
      setNotice(await reprintOrder(orderId));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo reimprimir la comanda.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return { now, busyId, error, notice, run, reprint, setError };
}

function AgeBadge({ order, now }: { order: Order; now: number }) {
  // Entregado: tiempo fijo desde el ingreso hasta la entrega.
  if (order.status === OrderStatus.ENTREGADO && order.deliveredAt) {
    const minutes = Math.max(
      0,
      Math.floor(
        (new Date(order.deliveredAt).getTime() -
          new Date(order.createdAt).getTime()) /
          60_000,
      ),
    );
    const slow = minutes >= 10;
    return (
      <Badge variant={slow ? "destructive" : "secondary"}>
        Entregado en {formatDurationMinutes(minutes)}
      </Badge>
    );
  }
  const minutes = ageMinutes(order.createdAt, now);
  const urgent = minutes >= 15;
  const amber = minutes > 10 && minutes < 15;
  return (
    <Badge variant={urgent ? "destructive" : amber ? "warning" : "secondary"}>
      Ingresado hace {formatDurationMinutes(minutes)}
    </Badge>
  );
}

/** Color del estado: azul recibido (por cobrar), verde aceptado/entregado. */
function statusVariant(status: Order["status"]) {
  switch (status) {
    case OrderStatus.RECIBIDO:
      return "default" as const;
    case OrderStatus.ACEPTADO:
      return "success" as const;
    case OrderStatus.ENTREGADO:
      return "success" as const;
    default:
      return "secondary" as const;
  }
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

function ReprintButton({
  order,
  clock,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={clock.busyId === order.id}
      onClick={() => clock.reprint(order.id)}
    >
      {clock.busyId === order.id ? "…" : "Reimprimir"}
    </Button>
  );
}

function OrderCard({
  order,
  clock,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
}) {
  const [showSplit, setShowSplit] = useState(false);

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
          <div className="flex flex-wrap items-center justify-end gap-2 text-right">
            <Badge variant={statusVariant(order.status)}>
              {OrderStatusLabel[order.status]}
            </Badge>
            <AgeBadge order={order} now={clock.now} />
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
          <div className="space-y-1">
            <span className="text-lg font-bold">
              Total: {formatPrice(order.total)}
            </span>
            {order.paymentMethod && (
              <p className="text-sm text-muted-foreground">
                Pago: {PaymentMethodLabel[order.paymentMethod]}
                {order.paymentMethod2 &&
                  order.paymentAmount2 != null &&
                  ` + ${PaymentMethodLabel[order.paymentMethod2]} ${formatPrice(order.total - order.paymentAmount2)}`}
                {!order.paymentMethod2 && " ✓"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {order.status === OrderStatus.RECIBIDO && (
              <ReprintButton order={order} clock={clock} />
            )}
            {order.status === OrderStatus.RECIBIDO && (
              <>
                <Button
                  variant="default"
                  disabled={clock.busyId === order.id}
                  onClick={() =>
                    clock.run(order.id, async () => {
                      await acceptOrder(order.id, "EFECTIVO");
                    })
                  }
                >
                  Cobró {PaymentMethodLabel.EFECTIVO}
                </Button>
                <Button
                  variant="default"
                  disabled={clock.busyId === order.id}
                  onClick={() =>
                    clock.run(order.id, async () => {
                      await acceptOrder(order.id, "QR");
                    })
                  }
                >
                  Cobró {PaymentMethodLabel.QR}
                </Button>
                <Button
                  variant="secondary"
                  disabled={clock.busyId === order.id}
                  onClick={() => setShowSplit(true)}
                >
                  Cobro dividido
                </Button>
              </>
            )}
            {order.status === OrderStatus.ACEPTADO && (
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
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
            )}
          </div>
        </div>
      </CardContent>

      {showSplit && (
        <SplitPaymentDialog
          total={order.total}
          busy={clock.busyId === order.id}
          onConfirm={async (method, method2, amount2) => {
            await clock.run(order.id, async () => {
              await acceptOrder(order.id, method, method2, amount2);
            });
            setShowSplit(false);
          }}
          onCancel={() => setShowSplit(false)}
        />
      )}
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

export function QueueView({ orders }: { orders: Order[] }) {
  const clock = useQueueClock();

  if (orders.length === 0) {
    return (
      <EmptyQueue
        title="No hay pedidos por preparar"
        hint="Los pedidos nuevos aparecerán aquí automáticamente."
      />
    );
  }

  const pendingCount = orders.filter(
    (o) =>
      o.status === OrderStatus.RECIBIDO || o.status === OrderStatus.ACEPTADO,
  ).length;

  return (
    <div className="space-y-6">
      {clock.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {clock.error}
        </p>
      )}
      {clock.notice && !clock.error && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {clock.notice}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          Pedidos del día
          {pendingCount > 0 && <Badge variant="warning">{pendingCount}</Badge>}
        </h2>
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} clock={clock} />
        ))}
      </section>
    </div>
  );
}
