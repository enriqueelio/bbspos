"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@bbspos/ui";
import {
  formatOrderCode,
  formatPrice,
  formatDurationMinutes,
  PaymentMethodLabel,
  OrderStatus,
  OrderStatusLabel,
  Role,
  type Order,
  type Role as RoleType,
} from "@bbspos/types";
import { acceptOrder, deliverOrder } from "@/app/actions/orders";
import { reprintOrder } from "@/app/actions/printing";
import { SplitPaymentDialog } from "@/components/split-payment-dialog";

function ageMinutes(createdAtIso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(createdAtIso).getTime()) / 60_000));
}

// Hora de creación formateada en formato 12h (ej. "01:18 p.m.").
function horaCreacion(order: Order): string {
  return new Date(order.createdAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useQueueClock(orders: Order[]) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Diálogo flotante de confirmación de acciones importantes.
  const [pendingConfirm, setPendingConfirm] = useState<{
    orderId: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [closingConfirm, setClosingConfirm] = useState(false);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

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

  // Ejecuta una acción de pedido (cambio de estado / cobro) una vez confirmada.
  async function run(orderId: string, action: () => Promise<void>) {
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

  // Abre el diálogo flotante de confirmación sin ejecutar nada todavía.
  function askConfirm(
    orderId: string,
    message: string,
    action: () => Promise<void>,
  ) {
    setClosingConfirm(false);
    setPendingConfirm({ orderId, message, action });
  }

  // Cierra el diálogo con una transición suave y (opcionalmente) ejecuta la acción.
  function settleConfirm(afterClose?: () => void) {
    setClosingConfirm(true);
    setTimeout(() => {
      setPendingConfirm(null);
      setClosingConfirm(false);
      if (afterClose) afterClose();
    }, 200);
  }

  // "Aceptar": cierra el diálogo y ejecuta la acción (única vía que toca la BD).
  function confirmAction() {
    const pending = pendingConfirm;
    if (!pending) return;
    settleConfirm(() => run(pending.orderId, pending.action));
  }

  // "Cancelar": descarta la acción sin alterar ningún registro.
  function cancelAction() {
    settleConfirm();
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

  return {
    now,
    busyId,
    error,
    notice,
    run,
    reprint,
    setError,
    pendingConfirm,
    closingConfirm,
    askConfirm,
    confirmAction,
    cancelAction,
  };
}

function AgeBadge({ order, now }: { order: Order; now: number }) {
  // Semáforo de demora basado en los minutos transcurridos desde createdAt:
  //  >= 10 min -> rojo pulsante (crítico)
  //  >= 7 min  -> ámbar (precaución)
  //  < 7 min   -> gris pizarra (normal)
  const color = (minutes: number) => {
    if (minutes >= 10) return "bg-red-600 text-white animate-pulse";
    if (minutes >= 7) return "bg-amber-500 text-white";
    return "bg-slate-700 text-slate-300";
  };

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
    return (
      <Badge className={`text-base ${color(minutes)}`}>
        ⏱ Tardó {formatDurationMinutes(minutes)}
      </Badge>
    );
  }

  const minutes = ageMinutes(order.createdAt, now);
  return (
    <Badge className={`text-base ${color(minutes)}`}>
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
    <div className="space-y-1 text-base">
      {order.items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-2"
        >
          <span>
            <span className="font-bold text-white">
{item.quantity}× {item.flavorName ? `${item.flavorName} (${item.sizeName})` : item.menuItemName}
                        </span>{" "}
                        {item.menuItemOptionName && (
                          <span className="text-white font-normal">
                            · {item.menuItemOptionName}
                          </span>
                        )}
                        {item.flavorName && (
                          <span className="text-white font-normal">
                            · {item.bobaTypeName}
                          </span>
                        )}
            {item.toppings.length > 0 && (
              <span className="block pl-4 text-white font-normal">
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
      className="h-10 w-full"
      disabled={clock.busyId === order.id}
      onClick={() => clock.reprint(order.id)}
    >
      {clock.busyId === order.id ? "…" : "Reimprimir"}
    </Button>
  );
}

function ChargeGrid({
  order,
  clock,
  onSplit,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
  onSplit: () => void;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
      <Button
        variant="default"
        className="h-14 text-lg font-bold w-full"
        disabled={clock.busyId === order.id}
        onClick={() =>
          clock.run(order.id, async () => {
            await acceptOrder(order.id, "EFECTIVO");
          })
        }
      >
        EFECTIVO
      </Button>
      <Button
        variant="default"
        className="h-14 text-lg font-bold w-full"
        disabled={clock.busyId === order.id}
        onClick={() =>
          clock.run(order.id, async () => {
            await acceptOrder(order.id, "QR");
          })
        }
      >
        QR
      </Button>
      <Button
        variant="secondary"
        className="h-10 w-full"
        disabled={clock.busyId === order.id}
        onClick={onSplit}
      >
        Cobro dividido
      </Button>
      <ReprintButton order={order} clock={clock} />
    </div>
  );
}

function OrderCard({
  order,
  clock,
  billing,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
  billing: boolean;
}) {
  const [showSplit, setShowSplit] = useState(false);
  const isFresh =
    order.status === OrderStatus.RECIBIDO ||
    (order.status === OrderStatus.ACEPTADO && !order.paidAt);
  const isDeliveredNotPaid =
    order.deliveredAt !== null && order.paidAt === null;
  const isPending = clock.busyId === order.id;

  return (
    <div
      key={order.id}
      className={`relative transition-opacity duration-200 ${
        isPending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <Card
        className={`animate-in fade-in slide-in-from-bottom-4 duration-200 ${
          isFresh
            ? "border-primary/80 animate-glow ring-1 ring-primary/60"
            : ""
        }`}
      >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl font-black text-white">
              Pedido #{formatOrderCode(order.seq)}
            </CardTitle>
            <p className="text-base font-semibold text-primary">
              {order.customerName
                ? `Para: ${order.customerName} · ${horaCreacion(order)}`
                : horaCreacion(order)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-right">
            <Badge variant={statusVariant(order.status)} className="text-base">
              {OrderStatusLabel[order.status]}
            </Badge>
            {isDeliveredNotPaid && (
              <Badge className="bg-red-600 text-white font-black animate-pulse px-3 py-1 uppercase text-sm border border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                ¡Falta Pagar!
              </Badge>
            )}
            <AgeBadge order={order} now={clock.now} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ItemsList order={order} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="space-y-2">
            <span
              className={`block py-1 text-4xl font-mono font-black ${
                isDeliveredNotPaid ? "text-red-500" : "text-white"
              }`}
            >
              {formatPrice(order.total)}
            </span>
            {order.paymentMethod && (
              <p className="text-base text-white">
                Pago: {PaymentMethodLabel[order.paymentMethod]}
                {order.paymentMethod2 && order.paymentAmount2 != null
                  ? ` ${formatPrice(order.total - order.paymentAmount2)} + ${PaymentMethodLabel[order.paymentMethod2]} ${formatPrice(order.paymentAmount2)}`
                  : " ✓"}
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-3">
            {/* Pedido en RECIBIDO (legado de pedidos web/store): se cobra y se acepta */}
            {order.status === OrderStatus.RECIBIDO &&
              (billing ? (
                <ChargeGrid
                  order={order}
                  clock={clock}
                  onSplit={() => setShowSplit(true)}
                />
              ) : (
                <div className="flex w-full justify-center py-1">
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-500"
                  >
                    Esperando pago en caja...
                  </Badge>
                </div>
              ))}

            {/* ACEPTADO sin cobrar: el cajero puede registrar el pago después */}
            {order.status === OrderStatus.ACEPTADO &&
              !order.paidAt &&
              (billing ? (
                <ChargeGrid
                  order={order}
                  clock={clock}
                  onSplit={() => setShowSplit(true)}
                />
              ) : (
                <div className="flex w-full justify-center py-1">
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-500"
                  >
                    Pendiente de pago
                  </Badge>
                </div>
              ))}

            {/* ENTREGADO sin cobrar (el cliente pagó después de recibir):
                el cajero puede registrar el pago en cualquier momento */}
            {order.status === OrderStatus.ENTREGADO &&
              !order.paidAt &&
              billing && (
                <ChargeGrid
                  order={order}
                  clock={clock}
                  onSplit={() => setShowSplit(true)}
                />
              )}

            {/* Pedido ACEPTADO: siempre se puede marcar como entregado,
                pague el cliente antes o después de la entrega */}
            {order.status === OrderStatus.ACEPTADO && (
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white w-full"
                disabled={clock.busyId === order.id}
        onClick={() =>
          clock.askConfirm(
            order.id,
            "¿Confirmas la entrega de este pedido? Esta acción no se puede deshacer.",
            async () => {
              await deliverOrder(order.id);
            },
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
      {isPending && (
        <svg
          className="absolute inset-0 m-auto h-12 w-12 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
    </div>
  );
}

function EmptyQueue({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-base text-white">{hint}</p>
      </CardContent>
    </Card>
  );
}

function ConfirmDialog({
  message,
  closing,
  onConfirm,
  onCancel,
}: {
  message: string;
  closing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-200 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-lg space-y-6 rounded-xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl transition-transform duration-200 ${
          closing ? "scale-95" : "scale-100 animate-in fade-in"
        }`}
      >
        <h2 className="text-2xl font-black text-white">Confirmar acción</h2>
        <p className="text-lg text-white">{message}</p>
        <div className="flex w-full flex-col gap-3">
          <Button
            size="lg"
            className="h-14 w-full bg-emerald-600 text-xl font-black text-white hover:bg-emerald-700"
            onClick={onConfirm}
          >
            Aceptar
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-14 w-full text-xl font-black"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QueueView({
  orders,
  role,
}: {
  orders: Order[];
  role: RoleType;
}) {
  const clock = useQueueClock(orders);
  const billing =
    role === Role.CAJERO || role === Role.ADMIN || role === Role.SUPER_ADMIN;

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

  const stateRank = (o: Order) =>
    o.status === OrderStatus.RECIBIDO
      ? 0
      : o.status === OrderStatus.ACEPTADO
        ? 1
        : 2;

  const ordered = [...orders].sort((a, b) => {
    const diff = stateRank(a) - stateRank(b);
    if (diff !== 0) return diff;
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  return (
    <div className="space-y-6">
      {clock.error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-lg space-y-6 rounded-xl bg-red-600 p-6 text-center text-xl font-bold text-white shadow-2xl">
            <p>⚠ {clock.error}</p>
            <Button
              size="lg"
              className="h-14 w-full bg-white text-xl font-black text-red-600 hover:bg-slate-100"
              onClick={() => clock.setError(null)}
            >
              Aceptar
            </Button>
          </div>
        </div>
      )}
      {clock.notice && !clock.error && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {clock.notice}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          PEDIDOS EN COLA
          {pendingCount > 0 && <Badge variant="warning">{pendingCount}</Badge>}
        </h2>
        {ordered.map((order) => (
          <OrderCard key={order.id} order={order} clock={clock} billing={billing} />
        ))}
      </section>

      {clock.pendingConfirm && (
        <ConfirmDialog
          message={clock.pendingConfirm.message}
          closing={clock.closingConfirm}
          onConfirm={clock.confirmAction}
          onCancel={clock.cancelAction}
        />
      )}
    </div>
  );
}
