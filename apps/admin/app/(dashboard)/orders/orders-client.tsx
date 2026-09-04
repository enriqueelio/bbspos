"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useToast,
} from "@bubba/ui";
import {
  formatPrice,
  formatOrderCode,
  PaymentMethodLabel,
  RoleLabel,
  ShiftLabel,
  ShiftList,
  type Order,
  type OrderStatus,
  type Shift,
} from "@bubba/types";
import {
  acceptOrder,
  applyDiscount,
  cancelOrder,
  deliverOrder,
  reprintOrder,
} from "@/app/actions/orders";
import { SplitPaymentDialog } from "@/components/split-payment-dialog";

const FILTERS: { value: "ALL" | OrderStatus; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "RECIBIDO", label: "Recibidos" },
  { value: "ACEPTADO", label: "Aceptados" },
  { value: "ENTREGADO", label: "Entregados" },
  { value: "ANULADO", label: "Anulados" },
];

function statusVariant(status: OrderStatus) {
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

function runAction(
  fn: () => Promise<void>,
  toast: ReturnType<typeof useToast>["toast"],
) {
  fn().catch((e) => {
    toast({
      variant: "destructive",
      title: "Acción Denegada",
      description: e instanceof Error ? e.message : "Ocurrió un error.",
      duration: 100000,
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Accordion row wrapper — smooth max-height transition               */
/* ------------------------------------------------------------------ */

function AccordionRow({
  order,
  index,
  expanded,
  onToggle,
  children,
}: {
  order: Order;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Header row (clickable) */}
      <tr
        className={`cursor-pointer select-none transition-colors hover:bg-slate-800/60 ${
          expanded
            ? "bg-primary/10 border-l-2 border-l-primary"
            : index % 2 === 0
              ? "bg-slate-900/40"
              : "bg-slate-900/20"
        }`}
        onClick={onToggle}
      >
        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-bold text-white">
          #{formatOrderCode(order.seq)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
          {new Date(order.createdAt).toLocaleString("es-MX", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-white">
          {order.customerName || "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
          {order.userName || "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-bold text-emerald-400">
          {formatPrice(order.total)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs">
          {(order.discountAmount ?? 0) > 0 ? (
            <span className="text-warning">−{formatPrice(order.discountAmount ?? 0)}</span>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right">
          {order.paymentMethod && (
            <Badge variant="secondary" className="mr-2 text-xs">
              {order.paymentMethod2 && order.paymentAmount2 != null
                ? `${PaymentMethodLabel[order.paymentMethod]}+${PaymentMethodLabel[order.paymentMethod2]}`
                : PaymentMethodLabel[order.paymentMethod]}
            </Badge>
          )}
          <Badge variant={statusVariant(order.status)}>
            {order.status}
          </Badge>
        </td>
        <td className={`px-4 py-3 text-right ${expanded ? "text-primary" : "text-slate-500"}`}>
          <span className={`inline-block transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            ▾
          </span>
        </td>
      </tr>

      {/* Expandable detail row */}
      <tr>
        <td colSpan={8} className="p-0">
          <div
            ref={contentRef}
            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{ maxHeight: expanded ? (contentRef.current?.scrollHeight ?? 1000) + "px" : "0px" }}
          >
            <div className={`border-t border-slate-800 px-6 py-4 ${
              expanded
                ? "bg-primary/5 border-l-2 border-l-primary"
                : index % 2 === 0
                  ? "bg-slate-900/40"
                  : "bg-slate-900/20"
            }`}>
              {children}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Order detail content (expanded)                                    */
/* ------------------------------------------------------------------ */

function OrderDetail({
  order,
}: {
  order: Order;
}) {
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmDiscountOpen, setConfirmDiscountOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const { toast } = useToast();

  const resetDiscount = () => {
    setDiscountAmount("");
    setDiscountReason("");
  };

  const resetCancel = () => {
    setCancelReason("");
  };

  return (
    <>
      <div className="space-y-4">
        {/* Metadata row */}
        {(order.paidAt ||
          order.deliveredAt ||
          order.cancelledAt ||
          (order.discountAmount ?? 0) > 0) && (
          <div className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
            {order.paidAt && (
              <p>
                Pago registrado:{" "}
                {new Date(order.paidAt).toLocaleString("es-MX", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            )}
            {order.deliveredAt && (
              <p>
                Entregado:{" "}
                {new Date(order.deliveredAt).toLocaleString("es-MX", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            )}
            {order.cancelledAt && order.cancelReason && (
              <p>
                Anulado por:{" "}
                <span className="font-semibold text-white">
                  {order.canceledBy?.name ?? "Usuario"}
                  {order.canceledBy
                    ? ` (${RoleLabel[order.canceledBy.role]})`
                    : ""}
                </span>{" "}
                · Motivo: {order.cancelReason} ·{" "}
                {new Date(order.cancelledAt).toLocaleString("es-MX", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            )}
            {(order.discountAmount ?? 0) > 0 && order.discountReason && (
              <p>
                Descuento: −{formatPrice(order.discountAmount ?? 0)} por{" "}
                <span className="font-semibold text-white">
                  {order.discountedBy?.name ?? "Usuario"}
                  {order.discountedBy
                    ? ` (${RoleLabel[order.discountedBy.role]})`
                    : ""}
                </span>{" "}
                ({order.discountReason})
              </p>
            )}
          </div>
        )}

        {/* Items list */}
        <div>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="mb-2 flex items-center justify-between gap-2 border-b border-slate-800 pb-2"
            >
              <div>
                <p className="font-bold text-white">
                  {item.quantity}× {item.sizeName} · {item.flavorName} ·{" "}
                  {item.bobaTypeName}
                </p>
                {item.toppings.length > 0 && (
                  <p className="pl-2 text-xs text-slate-400">
                    Toppings:{" "}
                    {item.toppings
                      .map(
                        (t) =>
                          `${t.toppingName} (+${formatPrice(t.unitPrice)})`,
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
              <span className="whitespace-nowrap font-medium text-sm">
                {formatPrice(
                  (item.unitPrice +
                    item.toppings.reduce((acc, t) => acc + t.unitPrice, 0)) *
                    item.quantity,
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
          {order.status !== "ANULADO" && (
            <>
              <Button
                size="sm"
                className="h-8 bg-warning px-3 text-xs text-warning-foreground hover:bg-warning/90"
                onClick={(e) => {
                  e.stopPropagation();
                  resetDiscount();
                  setConfirmDiscountOpen(true);
                }}
              >
                Descontar
              </Button>
              <Button
                size="sm"
                className="h-8 bg-red-700 px-3 text-xs text-white hover:bg-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  resetCancel();
                  setConfirmCancelOpen(true);
                }}
              >
                Anular
              </Button>
            </>
          )}
          <ReprintButton orderId={order.id} />
          <div className="flex-1" />
          <PrimaryActions order={order} />
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog
        open={confirmCancelOpen}
        onOpenChange={(open) => {
          setConfirmCancelOpen(open);
          if (!open) resetCancel();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Anular este pedido?</DialogTitle>
            <DialogDescription>
              Pedido #{formatOrderCode(order.seq)}
              {order.customerName ? ` · ${order.customerName}` : ""} por{" "}
              {formatPrice(order.total)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor={`cancel-reason-${order.id}`}>
              Motivo de anulación (obligatorio)
            </Label>
            <Input
              id={`cancel-reason-${order.id}`}
              type="text"
              value={cancelReason}
              autoFocus
              placeholder="Ej. pedido duplicado"
              onChange={(e) => setCancelReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cancelReason.trim()) {
                  (document.getElementById(
                    `cancel-confirm-${order.id}`,
                  ) as HTMLButtonElement | null)?.click();
                }
              }}
            />
          </div>
          <p className="text-sm text-destructive">
            Esta acción es irreversible y registrará el pedido como anulado.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancelOpen(false)}>
              Cancelar
            </Button>
            <Button
              id={`cancel-confirm-${order.id}`}
              variant="destructive"
              disabled={!cancelReason.trim()}
              onClick={() => {
                runAction(async () => {
                  await cancelOrder(order.id, cancelReason.trim());
                  setConfirmCancelOpen(false);
                  resetCancel();
                }, toast);
              }}
            >
              Sí, anular pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog
        open={confirmDiscountOpen}
        onOpenChange={(open) => {
          setConfirmDiscountOpen(open);
          if (!open) resetDiscount();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aplicar descuento</DialogTitle>
            <DialogDescription>
              Pedido #{formatOrderCode(order.seq)}
              {order.customerName ? ` · ${order.customerName}` : ""} por{" "}
              {formatPrice(order.total)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`discount-amount-${order.id}`}>Monto (Bs)</Label>
              <Input
                id={`discount-amount-${order.id}`}
                type="number"
                min={1}
                inputMode="numeric"
                value={discountAmount}
                placeholder={`Máx. ${order.total - 1}`}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`discount-reason-${order.id}`}>
                Motivo del descuento (obligatorio)
              </Label>
              <Input
                id={`discount-reason-${order.id}`}
                type="text"
                value={discountReason}
                placeholder="Ej. promo del día"
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscountOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={!discountReason.trim()}
              onClick={() => {
                const value = Number(discountAmount);
                if (!Number.isFinite(value) || value <= 0) {
                  toast({
                    variant: "destructive",
                    title: "Monto inválido",
                    description: "Ingresa un monto mayor a cero.",
                  });
                  return;
                }
                runAction(async () => {
                  await applyDiscount(
                    order.id,
                    value,
                    discountReason.trim(),
                  );
                  setConfirmDiscountOpen(false);
                  resetDiscount();
                }, toast);
              }}
            >
              Aplicar descuento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Primary actions (Accept / Deliver)                                 */
/* ------------------------------------------------------------------ */

function PrimaryActions({ order }: { order: Order }) {
  const [panel, setPanel] = useState<"pay" | null>(null);
  const [showSplit, setShowSplit] = useState(false);
  const [splitBusy, setSplitBusy] = useState(false);
  const { toast } = useToast();

  if (order.status === "ANULADO") return null;

  const close = () => setPanel(null);

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {order.status === "RECIBIDO" && (
        <>
          {panel === "pay" ? (
            <>
              <Button
                size="sm"
                className="h-8 bg-success px-3 text-xs font-bold text-success-foreground hover:bg-success/90"
                onClick={() =>
                  runAction(async () => {
                    await acceptOrder(order.id, "EFECTIVO");
                    close();
                  }, toast)
                }
              >
                Efectivo
              </Button>
              <Button
                size="sm"
                className="h-8 bg-success px-3 text-xs font-bold text-success-foreground hover:bg-success/90"
                onClick={() =>
                  runAction(async () => {
                    await acceptOrder(order.id, "QR");
                    close();
                  }, toast)
                }
              >
                QR
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-3 text-xs"
                onClick={() => setShowSplit(true)}
              >
                Dividir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-slate-400"
                onClick={() => setPanel(null)}
              >
                ✕
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="h-8 bg-success px-3 text-xs font-bold text-success-foreground hover:bg-success/90"
              onClick={() => setPanel("pay")}
            >
              Registrar pago
            </Button>
          )}
        </>
      )}

      {order.status === "ACEPTADO" && (
        <Button
          size="sm"
          className="h-8 bg-success px-3 text-xs font-bold text-success-foreground hover:bg-success/90"
          onClick={() =>
            runAction(async () => {
              await deliverOrder(order.id);
            }, toast)
          }
        >
          Entregar
        </Button>
      )}

      {showSplit && (
        <SplitPaymentDialog
          total={order.total}
          busy={splitBusy}
          onConfirm={(m1, m2, a2) => {
            setSplitBusy(true);
            runAction(async () => {
              await acceptOrder(order.id, m1, m2, a2);
              setShowSplit(false);
              setSplitBusy(false);
            }, toast);
          }}
          onCancel={() => setShowSplit(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reprint button                                                     */
/* ------------------------------------------------------------------ */

function ReprintButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  return (
    <Button
      size="sm"
      className="h-8 bg-slate-800 px-3 text-xs text-slate-200 hover:bg-slate-700"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        setBusy(true);
        reprintOrder(orderId)
          .then((message) => toast({ title: message }))
          .catch((err) =>
            toast({
              variant: "destructive",
              title: "Acción Denegada",
              description:
                err instanceof Error
                  ? err.message
                  : "No se pudo reimprimir la comanda.",
              duration: 100000,
            }),
          )
          .finally(() => setBusy(false));
      }}
    >
      {busy ? "Imprimiendo..." : "Reimprimir"}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Date range picker                                                   */
/* ------------------------------------------------------------------ */

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const label = "block mb-1 text-xs font-medium uppercase tracking-wide text-slate-400";
  const input =
    "h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white [color-scheme:dark] focus:border-primary focus:outline-none";
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label className={label}>Desde</Label>
        <input
          type="date"
          className={input}
          value={from}
          max={to}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div>
        <Label className={label}>Hasta</Label>
        <input
          type="date"
          className={input}
          value={to}
          min={from}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const today = toISODate(new Date());
          onFromChange(today);
          onToChange(today);
        }}
      >
        Hoy
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export function OrdersClient({
  orders,
  currentStatus,
}: {
  orders: Order[];
  currentStatus: "ALL" | OrderStatus;
}) {
  const today = toISODate(new Date());
  const [status, setStatus] = useState<"ALL" | OrderStatus>(currentStatus);
  const [shiftFilter, setShiftFilter] = useState<"ALL" | Shift>("ALL");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({
    key: "createdAt",
    dir: "desc",
  });

  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSort = useCallback((key: string) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  }, []);

  const filtered = orders.filter((order) => {
    if (status !== "ALL" && order.status !== status) return false;
    if (shiftFilter !== "ALL" && order.userShift !== shiftFilter) return false;
    const t = new Date(order.createdAt).getTime();
    const fromStart = new Date(`${from}T00:00:00`).getTime();
    const toEnd = new Date(`${to}T23:59:59.999`).getTime();
    return t >= fromStart && t <= toEnd;
  });

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case "seq":
          cmp = (a.seq ?? 0) - (b.seq ?? 0);
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "customerName":
          cmp = (a.customerName ?? "").localeCompare(b.customerName ?? "");
          break;
        case "userName":
          cmp = (a.userName ?? "").localeCompare(b.userName ?? "");
          break;
        case "total":
          cmp = a.total - b.total;
          break;
        case "discountAmount":
          cmp = (a.discountAmount ?? 0) - (b.discountAmount ?? 0);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          cmp = 0;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort]);

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Pedidos</h1>
        <p className="text-muted-foreground">
          Consulta y avanza el estado de los pedidos.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={status === f.value ? "default" : "secondary"}
            size="sm"
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-700" />
        <select
          className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white [color-scheme:dark] focus:border-primary focus:outline-none"
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value as "ALL" | Shift)}
        >
          <option value="ALL">Todos los turnos</option>
          {ShiftList.map((s) => (
            <option key={s} value={s}>
              {ShiftLabel[s]}
            </option>
          ))}
        </select>
      </div>

      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />

      <p className="text-sm text-muted-foreground">
        Mostrando{" "}
        <span className="font-semibold text-white">{filtered.length}</span>{" "}
        pedido(s) ·{" "}
        {from === to
          ? new Date(`${from}T12:00:00`).toLocaleDateString("es-MX", {
              dateStyle: "long",
            })
          : `${new Date(`${from}T12:00:00`).toLocaleDateString("es-MX", {
              dateStyle: "medium",
            })} → ${new Date(`${to}T12:00:00`).toLocaleDateString("es-MX", {
              dateStyle: "medium",
            })}`}
      </p>

      {/* Orders table */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-muted-foreground">
          No hay pedidos que mostrar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                {([
                  { key: "seq", label: "# Ticket", align: "left" },
                  { key: "createdAt", label: "Fecha y hora", align: "left" },
                  { key: "customerName", label: "Cliente / Mesa", align: "left" },
                  { key: "userName", label: "Atendió", align: "left" },
                  { key: "total", label: "Monto", align: "right" },
                  { key: "discountAmount", label: "Descuento", align: "right" },
                  { key: "status", label: "Estado", align: "right" },
                ] as const).map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 font-medium cursor-pointer select-none hover:text-white transition-colors ${
                      col.align === "right" ? "text-right" : ""
                    }`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sort.key === col.key && (
                      <span className="ml-1 text-primary">
                        {sort.dir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((order, i) => (
                <AccordionRow
                  key={order.id}
                  order={order}
                  index={i}
                  expanded={expandedId === order.id}
                  onToggle={() => toggle(order.id)}
                >
                  <OrderDetail order={order} />
                </AccordionRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
