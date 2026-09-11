"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  Utensils,
  Bike,
  Banknote,
  QrCode,
  Users,
  CreditCard,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  cn,
} from "@bbspos/ui";
import {
  formatOrderCode,
  formatPrice,
  formatDurationMinutes,
  OrderStatus,
  OrderStatusLabel,
  OrderType,
  Role,
  type Order,
  type Role as RoleType,
} from "@bbspos/types";
import {
  acceptOrder,
  acceptPensionOrder,
  acceptQueueOrder,
  deliverOrder,
} from "@/app/actions/orders";
import { SplitPaymentDialog } from "@/components/split-payment-dialog";
import {
  PensionPaymentDialog,
  type PensionCustomerOption,
} from "@/components/pension-payment-dialog";
import {
  orderBadgeVariants,
  orderCardVariants,
  orderDelayVariants,
  orderTypeBackgroundVariants,
  visualStateOf,
} from "@/components/orders/statusVariants";
import { delayLevelOf, delayMinutes, getStartTime } from "@/lib/time";

// El ticket que ve el cliente es el daySeq diario (#001...), no el seq global.
function ticketOf(o: { seq: number | null; daySeq?: number | null }): number {
  return o.daySeq ?? o.seq ?? 0;
}

// Icono lucide "paper-bag": lucide-react 0.468 no lo incluye, así que se
// embebe el SVG oficial directamente (mismo viewBox y estilo stroke 24×24).
function PaperBag({
  className,
  ["aria-hidden"]: ariaHidden = true,
  ["aria-label"]: ariaLabel,
  children,
}: {
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
  children?: React.ReactNode;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.364 3.848C4 6 3 9.652 3 12.652V19a2 2 0 002 2h14a2 2 0 002-2v-5c0-2.334-1.816-4.668-2.622-7.002" />
      <path d="M7 3h11.379a2 2 0 011.789 1.106l.723 1.447A1 1 0 0119.997 7h-8.525a2 2 0 01-1.789-1.106L8.79 4.105a2 2 0 10-3.579 1.789l2.261 4.522A5 5 0 018 12.652V21" />
      {children}
    </svg>
  );
}

// Tipos de entrega con su icono, color y tooltip.
const DELIVERY_ICONS = {
  DELIVERY: { icon: Bike, color: "text-sky-400", label: "Delivery" },
  MESA: { icon: Utensils, color: "text-amber-400", label: "Mesa" },
  LLEVAR: { icon: PaperBag, color: "text-emerald-400", label: "Llevar" },
} as const;

function DeliveryTypeIcon({
  orderType,
  className = "",
}: {
  orderType?: OrderType;
  className?: string;
}) {
  const type = orderType ?? OrderType.LLEVAR;
  const delivery = DELIVERY_ICONS[type] ?? DELIVERY_ICONS.LLEVAR;
  const Icon = delivery.icon;
  const base = "flex-shrink-0";
  const size = className ? "" : "h-4 w-4";
  return (
    <Icon className={cn(base, size, className, delivery.color)} aria-label={delivery.label}>
      <title>{delivery.label}</title>
    </Icon>
  );
}

// Icono del método de pago de la tarjeta. "Dividido" no existe como método en
// BD: se detecta cuando el pedido tiene un segundo método con su monto.
const PAYMENT_ICONS = {
  EFECTIVO: { icon: Banknote, color: "text-emerald-400", label: "Efectivo" },
  QR: { icon: QrCode, color: "text-sky-400", label: "QR" },
  PENSIONADO: { icon: Users, color: "text-amber-400", label: "Pensionado" },
  DIVIDIDO: { icon: CreditCard, color: "text-violet-400", label: "Dividido" },
  TARJETA: { icon: CreditCard, color: "text-blue-400", label: "Tarjeta" },
} as const;

type PaymentIconKey = keyof typeof PAYMENT_ICONS;

function PaymentMethodIcon({
  order,
  className = "h-4 w-4",
}: {
  order: Order;
  className?: string;
}) {
  const isSplit =
    Boolean(order.paymentMethod) &&
    Boolean(order.paymentMethod2) &&
    order.paymentAmount2 != null;
  // En BD el pensionado se guarda como PENSION; aquí se muestra como PENSIONADO.
  const raw = isSplit
    ? "DIVIDIDO"
    : order.paymentMethod === "PENSION"
      ? "PENSIONADO"
      : (order.paymentMethod ?? "EFECTIVO");
  const payment = PAYMENT_ICONS[raw as PaymentIconKey] ?? PAYMENT_ICONS.EFECTIVO;
  const Icon = payment.icon;
  return (
    <Icon
      className={`flex-shrink-0 ${className} ${payment.color}`}
      aria-label={payment.label}
    >
      <title>{payment.label}</title>
    </Icon>
  );
}

// Hora de creación en formato 24h (ej. "11:10" / "20:45", sin a.m./p.m.).
function horaCreacion(order: Order): string {
  const d = new Date(order.createdAt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
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

  return {
    now,
    busyId,
    error,
    notice,
    run,
    setError,
    pendingConfirm,
    closingConfirm,
    askConfirm,
    confirmAction,
    cancelAction,
  };
}

function AgeBadge({
  order,
  now,
}: {
  order: Order;
  now: number;
}) {
  // RECIBIDO (pedido del store sin aceptar): aún no arranca el reloj de
  // producción, así que no se muestra antigüedad.
  if (order.status === OrderStatus.RECIBIDO) return null;

  // Entregado: tiempo fijo desde que se aceptó hasta la entrega.
  if (order.status === OrderStatus.ENTREGADO && order.deliveredAt) {
    const deliveredAtMs = new Date(order.deliveredAt).getTime();
    const minutes = Math.max(
      0,
      Math.floor((deliveredAtMs - getStartTime(order).getTime()) / 60_000),
    );
    const demora = delayMinutes(order, deliveredAtMs);
    return (
      <span
        className={cn(
          "font-bold",
          orderDelayVariants({ delay: delayLevelOf(demora) }),
        )}
      >
        ⏱ Tardó {formatDurationMinutes(minutes)}
      </span>
    );
  }

  // En producción: el reloj corre desde que se aceptó el pedido. La demora es
  // el transcurrido menos el tiempo estimado del pedido.
  const minutes = Math.max(
    0,
    Math.floor((now - getStartTime(order).getTime()) / 60_000),
  );
  const demora = delayMinutes(order, now);
  return (
    <span
      className={cn(
        "font-bold",
        orderDelayVariants({ delay: delayLevelOf(demora) }),
      )}
    >
      Ingresado hace {formatDurationMinutes(minutes)}
    </span>
  );
}

function ItemsList({
  order,
  compact = false,
}: {
  order: Order;
  compact?: boolean;
}) {
  return (
    <div className={`space-y-1 ${compact ? "text-sm" : "text-base"}`}>
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
          <span className={compact ? "shrink-0 tabular-nums" : ""}>
            {formatPrice(item.unitPrice * item.quantity)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Botón único de cobro con menú emergente de métodos de pago.
 *  El menú se renderiza en un portal flotante (fixed) para que nunca quede
 *  recortado por el overflow del scroll de la columna ni de las tarjetas. */
function ChargeButton({
  order,
  clock,
  onSplit,
  onPension,
  compact = false,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
  onSplit: () => void;
  onPension: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic fuera de él (botón o menú flotante).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        ref.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
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

  // Recalcula la posición respecto al botón al abrir o al redimensionar.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.top, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  function pay(method: string) {
    setOpen(false);
    clock.run(order.id, async () => {
      await acceptOrder(order.id, method);
    });
  }

  const menu = open && pos
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
          style={{
            left: pos.left,
            bottom: window.innerHeight - pos.top + 8,
            width: Math.max(pos.width, 168),
          }}
        >
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between border-b border-slate-800 px-3 text-base font-bold text-white transition-colors hover:bg-violet-600"
            onClick={() => {
              setOpen(false);
              onPension();
            }}
          >
            PENSIONADO
            <span className="text-lg">👤</span>
          </button>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between border-b border-slate-800 px-3 text-base font-bold text-white transition-colors hover:bg-slate-700"
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
            className="flex h-12 w-full items-center justify-between border-b border-slate-800 px-3 text-base font-bold text-white transition-colors hover:bg-primary/70"
            onClick={() => pay("QR")}
          >
            QR
            <span className="text-lg">📱</span>
          </button>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between px-3 text-base font-bold text-white transition-colors hover:bg-emerald-600"
            onClick={() => pay("EFECTIVO")}
          >
            EFECTIVO
            <span className="text-lg">💵</span>
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={ref} className="relative">
      <Button
        size={compact ? "default" : "lg"}
        className={`animate-pulse bg-gradient-to-b from-red-500 to-red-600 font-black text-white shadow-lg shadow-red-950/50 transition-all hover:from-red-400 hover:to-red-500 hover:animate-none active:scale-[0.98] ${
          compact
            ? "h-10 px-4 text-sm"
            : "h-14 text-xl"
        }`}
        disabled={clock.busyId === order.id}
        onClick={() => {
          const rect = ref.current?.getBoundingClientRect();
          if (rect) setPos({ top: rect.top, left: rect.left, width: rect.width });
          setOpen((v) => !v);
        }}
      >
        {clock.busyId === order.id ? "Cobrando…" : "Cobrar"}
      </Button>

      {menu}
    </div>
  );
}

function OrderCard({
  order,
  clock,
  billing,
  customers,
  compact = false,
  expandedId,
  setExpandedId,
  flashing = false,
}: {
  order: Order;
  clock: ReturnType<typeof useQueueClock>;
  billing: boolean;
  customers: PensionCustomerOption[];
  compact?: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  flashing?: boolean;
}) {
  const [showSplit, setShowSplit] = useState(false);
  const [showPension, setShowPension] = useState(false);
  const visual = visualStateOf(order);
  const isDeliveredNotPaid =
    order.deliveredAt !== null && order.paidAt === null;
  const isPending = clock.busyId === order.id;
  // Finalizado = cobrado Y entregado. Se auto-contrae (acordeón cerrado).
  const isFinished = Boolean(order.paidAt && order.deliveredAt);
  // En modo compact (cola del 20%) TODOS los pedidos nacen contraídos y cada
  // tarjeta se expande/contrae manualmente al hacer clic.
  const isOpen = expandedId === order.id;
  const collapsed = !isOpen;
  // Únicamente en la tarjeta expandida se muestra el método de pago; la
  // contraída queda solo con el icono del tipo de entrega.
  const showPaymentIcon = isOpen;
  // Auto-contraer solo al pasar a "completado" (cobrado y entregado); los
  // pedidos pendientes quedan desplegados como entran.
  const prevFinished = useRef(isFinished);
  useEffect(() => {
    if (isFinished && !prevFinished.current) {
      setExpandedId(null);
    }
    prevFinished.current = isFinished;
  }, [isFinished, setExpandedId]);
  // Demora frente al tiempo estimado: positiva = el pedido ya se tardó. Se usa
  // para el puntito de la vista colapsada (mismo reloj que AgeBadge/Telegram).
  const demora = delayMinutes(order, clock.now);

  return (
    <div
      key={order.id}
      className={`relative transition-opacity duration-200 ${
        isPending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <Card
        className={cn(
          "animate-in fade-in slide-in-from-bottom-4 duration-200",
          orderCardVariants({ visual }),
          isFinished
            ? ""
            : orderTypeBackgroundVariants({
                orderType: order.orderType ?? OrderType.LLEVAR,
              }),
        )}
      >
      {collapsed ? (
        <button
          type="button"
          onClick={() => setExpandedId(order.id)}
          className={`flex w-full animate-in fade-in cursor-pointer items-center justify-between gap-2 text-left transition-colors hover:bg-slate-900/60 ${
            flashing ? "animate-flash-blue" : ""
          } ${compact ? "px-3 py-2" : "gap-3 px-5 py-3.5"}`}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={`shrink-0 font-black text-white ${
                compact ? "text-sm" : "text-lg"
              }`}
            >
              #{formatOrderCode(ticketOf(order))}
            </span>
            {demora > 0 && (
              <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
            )}
            {order.customerName && (
              <span
                className={`truncate font-black text-primary ${
                  compact ? "text-sm" : "text-lg"
                }`}
              >
                {order.customerName}
              </span>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <span
              className={`whitespace-nowrap font-black tabular-nums text-emerald-300 ${
                compact ? "text-sm" : "text-xl"
              }`}
            >
              {formatPrice(order.total)}
            </span>
            <span
              className={`whitespace-nowrap text-right tabular-nums text-slate-400 ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              {horaCreacion(order)}
            </span>
            <DeliveryTypeIcon
              orderType={order.orderType}
              className={compact ? "h-3.5 w-3.5" : "h-5 w-5"}
            />
          </div>
        </button>
      ) : (
        <div
          onClick={(e) => {
            // Si el clic fue sobre un botón (cobrar, entregar, reimprimir,
            // cantidades…), no se contrae la tarjeta.
            const target = e.target as HTMLElement;
            if (target.closest("button")) return;
            setExpandedId(null);
          }}
          className="cursor-pointer"
        >
      <CardHeader className={compact ? "pb-1 pt-2 px-3" : "pb-3"}>
        <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`flex items-baseline gap-x-2 ${compact ? "flex-wrap" : "flex-wrap"}`}
          >
            <CardTitle
              className={`shrink-0 font-black text-white ${
                compact ? "text-base" : "text-2xl"
              }`}
            >
              #{formatOrderCode(ticketOf(order))}
            </CardTitle>
            {order.customerName && (
              <span
                className={`min-w-0 truncate font-black text-primary ${
                  compact ? "text-sm" : "text-2xl"
                }`}
              >
                {order.customerName}
              </span>
            )}
          </div>
          <p
            className={`flex flex-wrap items-center gap-x-2 font-semibold text-slate-400 ${
              compact ? "text-xs" : "text-base"
            }`}
          >
            {horaCreacion(order)}
            <AgeBadge order={order} now={clock.now} />
          </p>
        </div>
        {compact && (
          <DeliveryTypeIcon
            orderType={order.orderType}
            className="h-5 w-5 flex-shrink-0"
          />
        )}
        </div>
      </CardHeader>
      <CardContent className={compact ? "space-y-2 px-3 pb-3" : "space-y-3"}>
        <ItemsList order={order} compact={compact} />

        {order.notes && (
          <div className="border-t border-slate-700 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Indicaciones especiales
            </p>
            <p className="mt-0.5 text-sm font-semibold text-amber-300">
              {order.notes}
            </p>
          </div>
        )}

        {compact && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-700 pt-2">
            <div className="flex min-w-0 items-center gap-1">
              <span
                className={`whitespace-nowrap font-mono font-black ${
                  isDeliveredNotPaid ? "text-red-500" : "text-white"
                }`}
              >
                {formatPrice(order.total)}
              </span>
              {showPaymentIcon && order.paymentMethod && (
                <PaymentMethodIcon order={order} />
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Badge
                className={cn("shrink-0 text-xs", orderBadgeVariants({ visual }))}
              >
                {OrderStatusLabel[order.status]}
              </Badge>
            </div>
          </div>
        )}

        <div className={`flex items-center gap-3 border-t ${compact ? "flex-col gap-2 border-slate-700 pt-2" : "flex-wrap pt-3"}`}>
          {!compact && (
            <span
              className={`flex flex-nowrap items-center gap-2 py-1 text-4xl font-mono font-black ${
                isDeliveredNotPaid ? "text-red-500" : "text-white"
              }`}
            >
              <DeliveryTypeIcon orderType={order.orderType} className="h-6 w-6 flex-shrink-0" />
              {showPaymentIcon && order.paymentMethod && (
                <PaymentMethodIcon order={order} className="h-6 w-6" />
              )}
              <span className="whitespace-nowrap">{formatPrice(order.total)}</span>
            </span>
          )}
          <div className={`flex items-center gap-2 ${compact ? "w-full" : "ml-auto"}`}>
            {/* Pedido RECIBIDO (llegó del store): al aceptarlo arranca la producción
                y aparecen los botones de cobrar/entregar */}
            {order.status === OrderStatus.RECIBIDO && (
              <Button
                size={compact ? "default" : "lg"}
                className={`bg-primary hover:bg-primary/80 text-white ${
                  compact ? "h-10 w-full text-sm" : "h-14"
                }`}
                disabled={clock.busyId === order.id}
                onClick={() =>
                  clock.askConfirm(
                    order.id,
                    "¿Aceptas este pedido para prepararlo? El reloj de producción se inicia ahora.",
                    async () => {
                      await acceptQueueOrder(order.id);
                    },
                  )
                }
              >
                {clock.busyId === order.id ? "Aceptando…" : "Aceptar"}
              </Button>
            )}

            {/* ACEPTADO sin cobrar: el cajero puede registrar el pago después */}
            {order.status === OrderStatus.ACEPTADO &&
              !order.paidAt &&
              (billing ? (
                <ChargeButton
                  order={order}
                  clock={clock}
                  onSplit={() => setShowSplit(true)}
                onPension={() => setShowPension(true)}
                compact={compact}
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
                compact={compact}
  />
              )}

{/* Pedido ACEPTADO: siempre se puede marcar como entregado,
                pague el cliente antes o después de la entrega */}
            {order.status === OrderStatus.ACEPTADO && (
<Button
                  size={compact ? "default" : "lg"}
                  className={`bg-emerald-500 hover:bg-emerald-600 text-white ${
                    compact ? "h-10 w-full text-sm" : "h-14"
                  }`}
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
          {!compact && (
            <Badge
              className={cn(
                "shrink-0 text-base",
                orderBadgeVariants({ visual }),
              )}
            >
              {OrderStatusLabel[order.status]}
            </Badge>
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

// Acordeón de grupo: cabecera con chevrón y contenido desplegable. Si no es
// colapsable (siempre visible) el clic no hace nada y el contenido se muestra
// abierto en todo momento.
function QueueGroupAccordion({
  title,
  count,
  open,
  collapsible = false,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  collapsible?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={collapsible ? onToggle : undefined}
        disabled={!collapsible}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors ${
          collapsible
            ? "cursor-pointer hover:bg-slate-900/60"
            : "cursor-default"
        }`}
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? "" : "-rotate-90"
          }`}
        />
        <span className="truncate text-sm font-black uppercase tracking-wide text-white">
          {title}
        </span>
        {count > 0 && (
          <Badge variant="outline" className="ml-auto shrink-0">
            {count}
          </Badge>
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-800 p-3">{children}</div>
      )}
    </Card>
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
  // Acordeón único: solo una tarjeta expandida a la vez en toda la cola.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Grupo "Pedidos completados": contraído por defecto; el de pendientes
  // siempre está visible (no colapsa).
  const [completedOpen, setCompletedOpen] = useState(false);
  // Pedidos recién llegados a la cola, en parpadeo azul durante 2 segundos.
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());
  // Ref de las tarjetas para auto-scroll cuando entra un pedido nuevo.
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const knownIds = useRef<Set<string> | null>(null);

  // Cuando aparece un pedido nuevo (pedido aceptado), desplaza la lista hasta
  // que la tarjeta nueva quede visible. El primer render solo inicializa el
  // set de ids conocidos para no scrollear al abrir la vista.
  useEffect(() => {
    if (!knownIds.current) {
      knownIds.current = new Set(orders.map((o) => o.id));
      return;
    }
    const fresh = orders.filter((o) => !knownIds.current!.has(o.id));
    if (fresh.length === 0) return;
    knownIds.current = new Set(orders.map((o) => o.id));
    const newest = fresh.reduce((a, b) => (ticketOf(a) >= ticketOf(b) ? a : b));
    // El pedido nuevo aterriza desplegado (para ver sus ítems y botones). Al
    // ser acordeón único, esto cierra cualquier otra tarjeta abierta.
    setExpandedId(newest.id);
    // Parpadeo azul de 2s en la tarjeta de cada pedido que acaba de entrar.
    const ids = fresh.map((o) => o.id);
    setFlashingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    const timer = setTimeout(() => {
      setFlashingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 2000);
    requestAnimationFrame(() =>
      cardRefs.current.get(newest.id)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      }),
    );
    return () => clearTimeout(timer);
  }, [orders]);

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
      o.status === OrderStatus.RECIBIDO ||
      o.status === OrderStatus.ACEPTADO ||
      (o.status === OrderStatus.ENTREGADO && !o.paidAt),
  ).length;

  // Agrupa completados (entregados Y cobrados) en el grupo superior y
  // pendientes (no cobrados o no entregados) en el inferior; dentro de cada
  // grupo ordena ascendente por número de ticket (seq). El array `ordered` ya
  // lleva ambos criterios aplicados y los dos acordeones lo dividen en bloques.
  const isComplete = (o: Order) =>
    o.status === OrderStatus.ENTREGADO && Boolean(o.paidAt);

  const ordered = [...orders].sort((a, b) => {
    const aDone = isComplete(a) ? 0 : 1;
    const bDone = isComplete(b) ? 0 : 1;
    const diff = aDone - bDone;
    if (diff !== 0) return diff;
    return ticketOf(a) - ticketOf(b);
  });

  // Búsqueda libre sobre la cola: número de pedido, nombre/mesa y hora.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? ordered.filter((order) => {
        const code = formatOrderCode(ticketOf(order)).toLowerCase();
        const name = order.customerName?.toLowerCase() ?? "";
        const hour = horaCreacion(order).toLowerCase();
        return code.includes(q) || name.includes(q) || hour.includes(q);
      })
    : ordered;

  // Dos grupos con el sort ascendente por seq ya aplicado: los completados
  // (entregados Y cobrados) y los pendientes (el resto de la cola).
  const completados = filtered.filter((o) => isComplete(o));
  const pendientes = filtered.filter((o) => !isComplete(o));

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
        <div
          className={`flex items-center gap-2 ${
            compact
              ? "sticky top-0 z-10 -mx-3 bg-slate-900 px-3 pb-2 pt-1"
              : ""
          }`}
        >
          <h2 className="flex shrink-0 items-center gap-2 text-base font-black uppercase tracking-wide text-white">
            PEDIDOS EN COLA
            {pendingCount > 0 && <Badge variant="warning">{pendingCount}</Badge>}
          </h2>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder=""
              title="Buscar por número de pedido, nombre, mesa u hora…"
              className="h-9 w-full pl-8"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-md border border-slate-700 bg-slate-900/60 px-4 py-6 text-center text-muted-foreground">
            Sin resultados para
            {query.trim() ? ` "${query.trim()}"` : " el pedido buscado"}.
          </p>
        ) : (
          <>
            <QueueGroupAccordion
              title="Pedidos pendientes"
              count={pendientes.length}
              open
            >
              {pendientes.map((order) => (
                <div
                  key={order.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(order.id, el);
                    else cardRefs.current.delete(order.id);
                  }}
                >
                  <OrderCard
                    order={order}
                    clock={clock}
                    billing={billing}
                    customers={customers}
                    compact={compact}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    flashing={flashingIds.has(order.id)}
                  />
                </div>
              ))}
            </QueueGroupAccordion>
            <QueueGroupAccordion
              title="Pedidos completados"
              count={completados.length}
              open={completedOpen}
              collapsible
              onToggle={() => setCompletedOpen((v) => !v)}
            >
              {completados.map((order) => (
                <div
                  key={order.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(order.id, el);
                    else cardRefs.current.delete(order.id);
                  }}
                >
                  <OrderCard
                    order={order}
                    clock={clock}
                    billing={billing}
                    customers={customers}
                    compact={compact}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    flashing={flashingIds.has(order.id)}
                  />
                </div>
              ))}
            </QueueGroupAccordion>
          </>
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

