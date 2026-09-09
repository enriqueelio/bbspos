"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
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
import { acceptOrder, acceptPensionOrder, deliverOrder } from "@/app/actions/orders";
import { reprintOrder } from "@/app/actions/printing";
import { SplitPaymentDialog } from "@/components/split-payment-dialog";
import {
  PensionPaymentDialog,
  type PensionCustomerOption,
} from "@/components/pension-payment-dialog";

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
    <button
      type="button"
      title="Reimprimir comanda"
      aria-label="Reimprimir comanda"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900/70 text-slate-300 transition-colors hover:border-slate-400 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      disabled={clock.busyId === order.id}
      onClick={(e) => {
        e.stopPropagation();
        clock.reprint(order.id);
      }}
    >
      {clock.busyId === order.id ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
    </button>
  );
}

/** Botón único de cobro con menú emergente de métodos de pago. */
function ChargeButton({
  order,
  clock,
  onSplit,
  onPension,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
  onSplit: () => void;
  onPension: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic fuera de él.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Cierra el menú con Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pay(method: string) {
    setOpen(false);
    clock.run(order.id, async () => {
      await acceptOrder(order.id, method);
    });
  }

  return (
    <div ref={ref} className="relative">
      <Button
        size="lg"
        className="h-14 animate-pulse bg-gradient-to-b from-red-500 to-red-600 text-xl font-black text-white shadow-lg shadow-red-950/50 transition-all hover:from-red-400 hover:to-red-500 hover:animate-none active:scale-[0.98]"
        disabled={clock.busyId === order.id}
        onClick={() => setOpen((v) => !v)}
      >
        {clock.busyId === order.id ? "Cobrando…" : "Cobrar"}
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 z-20 mb-2 animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between border-b border-slate-800 px-4 text-base font-bold text-white transition-colors hover:bg-emerald-600"
            onClick={() => pay("EFECTIVO")}
          >
            EFECTIVO
            <span className="text-lg">💵</span>
          </button>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between border-b border-slate-800 px-4 text-base font-bold text-white transition-colors hover:bg-primary/70"
            onClick={() => pay("QR")}
          >
            QR
            <span className="text-lg">📱</span>
          </button>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between border-b border-slate-800 px-4 text-base font-bold text-white transition-colors hover:bg-slate-700"
            onClick={() => {
              setOpen(false);
              onSplit();
            }}
          >
            DIVIDIDO
            <span className="text-lg">➗</span>
          </button>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between px-4 text-base font-bold text-white transition-colors hover:bg-violet-600"
            onClick={() => {
              setOpen(false);
              onPension();
            }}
          >
            PENSIONADO
            <span className="text-lg">👤</span>
          </button>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  clock,
  billing,
  customers,
  compact = false,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
  billing: boolean;
  customers: PensionCustomerOption[];
  compact?: boolean;
}) {
  const [showSplit, setShowSplit] = useState(false);
  const [showPension, setShowPension] = useState(false);
  // Override manual: el cajero puede expandir/contraer un pedido finalizado.
  const [expanded, setExpanded] = useState(false);
  const isFresh =
    order.status === OrderStatus.RECIBIDO ||
    (order.status === OrderStatus.ACEPTADO && !order.paidAt);
  const isDeliveredNotPaid =
    order.deliveredAt !== null && order.paidAt === null;
  const isPending = clock.busyId === order.id;
  // Finalizado = cobrado Y entregado. Se auto-contrae (acordeón cerrado).
  const isFinished = Boolean(order.paidAt && order.deliveredAt);
  const collapsed = isFinished && !expanded;
  const payLabel = order.paymentMethod
    ? order.paymentMethod2 && order.paymentAmount2 != null
      ? `${PaymentMethodLabel[order.paymentMethod]} + ${PaymentMethodLabel[order.paymentMethod2]}`
      : PaymentMethodLabel[order.paymentMethod]
    : null;

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
      {collapsed ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`grid w-full animate-in fade-in cursor-pointer items-center gap-3 text-left transition-colors hover:bg-slate-900/60 ${
            compact
              ? "grid-cols-[minmax(0,1fr)_7rem] px-4 py-3"
              : "grid-cols-[minmax(0,1fr)_8rem_6rem_minmax(11rem,auto)] px-5 py-3.5"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-lg font-black text-white">
              Pedido #{formatOrderCode(order.seq)}
            </span>
            {order.customerName && (
              <span
                className={`truncate font-black text-primary ${
                  compact ? "text-base" : "text-lg"
                }`}
              >
                {order.customerName}
              </span>
            )}
          </div>
          <span
            className={`text-right font-black tabular-nums text-emerald-300 ${
              compact ? "text-lg" : "text-xl"
            }`}
          >
            {formatPrice(order.total)}
          </span>
          {!compact && (
            <>
              <span className="text-center text-sm tabular-nums text-slate-400">
                {horaCreacion(order)}
              </span>
              {payLabel && (
                <Badge
                  variant="outline"
                  className="justify-self-end border-primary/60 bg-primary/10 text-primary"
                >
                  {payLabel}
                </Badge>
              )}
            </>
          )}
        </button>
      ) : (
        <div
          onClick={() => isFinished && setExpanded(false)}
          className={isFinished ? "cursor-pointer" : ""}
        >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-white">
              Pedido #{formatOrderCode(order.seq)}
              <ReprintButton order={order} clock={clock} />
            </CardTitle>
            {order.customerName && (
              <p className="text-2xl font-black text-primary">
                Para: {order.customerName}
              </p>
            )}
            <p className="text-base font-semibold text-slate-400">
              {horaCreacion(order)}
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
        <div className="flex flex-wrap items-center gap-3 border-t pt-3">
          <span
            className={`block py-1 text-4xl font-mono font-black ${
              isDeliveredNotPaid ? "text-red-500" : "text-white"
            }`}
          >
            {formatPrice(order.total)}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {/* Pedido en RECIBIDO (legado de pedidos web/store): se cobra y se acepta */}
            {order.status === OrderStatus.RECIBIDO &&
              (billing ? (
                <ChargeButton
                  order={order}
                  clock={clock}
                  onSplit={() => setShowSplit(true)}
                onPension={() => setShowPension(true)}
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
                <ChargeButton
                  order={order}
                  clock={clock}
                  onSplit={() => setShowSplit(true)}
                onPension={() => setShowPension(true)}
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
                <ChargeButton
                  order={order}
                  clock={clock}
                  onSplit={() => setShowSplit(true)}
                onPension={() => setShowPension(true)}
  />
              )}

            {/* Pedido ACEPTADO: siempre se puede marcar como entregado,
                pague el cliente antes o después de la entrega */}
            {order.status === OrderStatus.ACEPTADO && (
<Button
                  size="lg"
                  className="h-14 bg-emerald-500 hover:bg-emerald-600 text-white"
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
          {order.paymentMethod && (
            <p className="w-full text-base text-white">
              Pago: {PaymentMethodLabel[order.paymentMethod]}
              {order.paymentMethod2 && order.paymentAmount2 != null
                ? ` ${formatPrice(order.total - order.paymentAmount2)} + ${PaymentMethodLabel[order.paymentMethod2]} ${formatPrice(order.paymentAmount2)}`
                : " ✓"}
            </p>
          )}
        </div>
      </CardContent>
      </div>
      )}

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

      {showPension && (
        <PensionPaymentDialog
          total={order.total}
          customers={customers}
          busy={clock.busyId === order.id}
          onConfirm={async (customerId) => {
            await clock.run(order.id, async () => {
              await acceptPensionOrder(order.id, customerId);
            });
            setShowPension(false);
          }}
          onCancel={() => setShowPension(false)}
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
  customers,
  compact = false,
}: {
  orders: Order[];
  role: RoleType;
  customers: PensionCustomerOption[];
  compact?: boolean;
}) {
  const clock = useQueueClock(orders);
  const billing =
    role === Role.CAJERO || role === Role.ADMIN || role === Role.SUPER_ADMIN;
  // Búsqueda libre sobre la cola: número de pedido, nombre/mesa y hora.
  const [query, setQuery] = useState("");

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

  // Búsqueda libre sobre la cola: número de pedido, nombre/mesa y hora.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? ordered.filter((order) => {
        const code = formatOrderCode(order.seq).toLowerCase();
        const name = order.customerName?.toLowerCase() ?? "";
        const hour = horaCreacion(order).toLowerCase();
        return code.includes(q) || name.includes(q) || hour.includes(q);
      })
    : ordered;

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
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número de pedido, nombre, mesa u hora…"
          className="w-full"
        />
        {filtered.length === 0 ? (
          <p className="rounded-md border border-slate-700 bg-slate-900/60 px-4 py-6 text-center text-muted-foreground">
            Sin resultados para
            {query.trim() ? ` "${query.trim()}"` : " el pedido buscado"}.
          </p>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              clock={clock}
              billing={billing}
              customers={customers}
              compact={compact}
            />
          ))
        )}
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

