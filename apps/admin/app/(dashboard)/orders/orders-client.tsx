"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  type Order,
  type OrderStatus,
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

function ReprintButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  return (
    <Button
      size="sm"
      className="h-9 bg-slate-800 px-4 text-slate-200 hover:bg-slate-700"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const message = await reprintOrder(orderId);
          toast({ title: message });
        } catch (e) {
          toast({
            variant: "destructive",
            title: "Acción Denegada",
            description:
              e instanceof Error
                ? e.message
                : "No se pudo reimprimir la comanda.",
            duration: 100000,
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Imprimiendo..." : "Reimprimir comanda"}
    </Button>
  );
}

function OrderActions({ order }: { order: Order }) {
  const [panel, setPanel] = useState<"pay" | null>(null);
  const [showSplit, setShowSplit] = useState(false);
  const [splitBusy, setSplitBusy] = useState(false);
  const { toast } = useToast();

  if (order.status === "ANULADO") {
    return null;
  }

  const close = () => setPanel(null);

  return (
    <div className="space-y-3">
      {order.status === "RECIBIDO" && (
        <div className="space-y-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              className="h-14 w-full text-lg"
              disabled={panel === "pay"}
              variant={panel === "pay" ? "default" : "secondary"}
              onClick={() => setPanel(panel === "pay" ? null : "pay")}
            >
              Registrar pago
            </Button>
          </div>
          {panel === "pay" && (
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3">
              <Button
                className="h-12 w-full bg-success text-lg font-bold text-success-foreground hover:bg-success/90"
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
                className="h-12 w-full bg-success text-lg font-bold text-success-foreground hover:bg-success/90"
                onClick={() =>
                  runAction(async () => {
                    await acceptOrder(order.id, "QR");
                    close();
                  }, toast)
                }
              >
                QR
              </Button>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              className="h-14 w-full text-lg"
              variant="secondary"
              onClick={() => setShowSplit(true)}
            >
              Cobro dividido
            </Button>
          </div>
        </div>
      )}

      {order.status === "ACEPTADO" && (
        <Button
          className="h-14 w-full bg-success text-lg font-bold text-success-foreground hover:bg-success/90"
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

function OrderCard({
  order,
  statusLabels,
}: {
  order: Order;
  statusLabels: Record<OrderStatus, string>;
}) {
  // Acciones secundarias de la tarjeta (Descontar / Anular) vía diálogos flotantes.
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
      <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl font-black text-white">
              Pedido #{formatOrderCode(order.seq)}
            </CardTitle>
            {order.customerName && (
              <p className="text-sm font-semibold text-primary">
                Para: {order.customerName}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleString("es-MX", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {order.paymentMethod && (
              <Badge variant="secondary">
                {order.paymentMethod2 && order.paymentAmount2 != null
                  ? `${PaymentMethodLabel[order.paymentMethod]} + ${PaymentMethodLabel[order.paymentMethod2]}`
                  : PaymentMethodLabel[order.paymentMethod]}
              </Badge>
            )}
            <Badge variant={statusVariant(order.status)}>
              {statusLabels[order.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(order.cancelReason ||
          order.discountReason ||
          order.paidAt ||
          order.deliveredAt) && (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
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
                Descuento aplicado: −{formatPrice(order.discountAmount ?? 0)}{" "}
                por{" "}
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
        <div>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="mb-2 flex items-center justify-between gap-2 border-b border-slate-800 pb-2"
            >
              <div>
                <p className="text-lg font-bold text-white">
                  {item.quantity}× {item.sizeName} · {item.flavorName} ·{" "}
                  {item.bobaTypeName}
                </p>
                {item.toppings.length > 0 && (
                  <p className="pl-2 text-sm text-slate-400">
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
              <span className="font-medium">
                {formatPrice(
                  (item.unitPrice +
                    item.toppings.reduce((acc, t) => acc + t.unitPrice, 0)) *
                    item.quantity,
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Fila del precio con acciones secundarias uniformes */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="font-mono text-3xl font-bold text-emerald-400">
            {formatPrice(order.total)}
            {(order.discountAmount ?? 0) > 0 && (
              <span className="ml-2 inline-block rounded-full bg-warning/20 px-2 py-0.5 align-middle font-sans text-sm font-semibold text-warning">
                Descuento de {formatPrice(order.discountAmount ?? 0)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {order.status !== "ANULADO" && (
              <>
                <Button
                  size="sm"
                  className="h-9 bg-warning px-4 text-warning-foreground hover:bg-warning/90"
                  onClick={() => {
                    resetDiscount();
                    setConfirmDiscountOpen(true);
                  }}
                >
                  Descontar
                </Button>
                <Button
                  size="sm"
                  className="h-9 bg-red-700 px-4 text-white hover:bg-red-600"
                  onClick={() => {
                    resetCancel();
                    setConfirmCancelOpen(true);
                  }}
                >
                  Anular
                </Button>
              </>
            )}
            <ReprintButton orderId={order.id} />
          </div>
        </div>

        {/* Acciones primarias */}
        <OrderActions order={order} />
      </CardContent>
    </Card>

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

export function OrdersClient({
  orders,
  currentStatus,
  statusLabels,
}: {
  orders: Order[];
  currentStatus: "ALL" | OrderStatus;
  statusLabels: Record<OrderStatus, string>;
}) {
  const today = toISODate(new Date());
  const [status, setStatus] = useState<"ALL" | OrderStatus>(currentStatus);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const filtered = orders.filter((order) => {
    if (status !== "ALL" && order.status !== status) return false;
    const t = new Date(order.createdAt).getTime();
    const fromStart = new Date(`${from}T00:00:00`).getTime();
    const toEnd = new Date(`${to}T23:59:59.999`).getTime();
    return t >= fromStart && t <= toEnd;
  });

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Pedidos</h1>
        <p className="text-muted-foreground">
          Consulta y avanza el estado de los pedidos.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
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
        </div>
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </div>

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

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No hay pedidos que mostrar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} statusLabels={statusLabels} />
          ))}
        </div>
      )}
    </div>
  );
}
