"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  useToast,
} from "@bubba/ui";
import {
  formatPrice,
  formatOrderCode,
  PaymentMethodLabel,
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
  // Acciones secundarias de la tarjeta (Descontar / Anular).
  const [panel, setPanel] = useState<"discount" | "cancel" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const closeSecondary = () => {
    setPanel(null);
    setAmount("");
    setReason("");
  };

  const togglePanel = (which: "discount" | "cancel") =>
    setPanel(panel === which ? null : which);

  return (
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
                Anulado: {order.cancelReason} ·{" "}
                {new Date(order.cancelledAt).toLocaleString("es-MX", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            )}
            {(order.discountAmount ?? 0) > 0 && order.discountReason && (
              <p>
                Descuento aplicado: −{formatPrice(order.discountAmount ?? 0)}{" "}
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-9 bg-warning px-4 text-warning-foreground hover:bg-warning/90"
              onClick={() => togglePanel("discount")}
            >
              Descontar
            </Button>
            <Button
              size="sm"
              className="h-9 bg-red-700 px-4 text-white hover:bg-red-600"
              onClick={() => togglePanel("cancel")}
            >
              Anular
            </Button>
            <ReprintButton orderId={order.id} />
          </div>
        </div>

        {/* Paneles de descuento / anulación */}
        {panel === "discount" && (
          <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/40 p-3">
            <div className="w-24 space-y-1">
              <Label htmlFor={`amount-${order.id}`}>Monto (Bs)</Label>
              <Input
                id={`amount-${order.id}`}
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="min-w-48 flex-1 space-y-1">
              <Label htmlFor={`reason-${order.id}`}>Motivo</Label>
              <Input
                id={`reason-${order.id}`}
                type="text"
                value={reason}
                placeholder="Ej. promo del día"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={() =>
                runAction(async () => {
                  await applyDiscount(order.id, Number(amount), reason);
                  closeSecondary();
                }, toast)
              }
            >
              Aplicar descuento
            </Button>
          </div>
        )}

        {panel === "cancel" && (
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <div className="min-w-48 flex-1 space-y-1">
              <Label htmlFor={`cancel-${order.id}`}>
                Motivo de anulación (obligatorio)
              </Label>
              <Input
                id={`cancel-${order.id}`}
                type="text"
                value={reason}
                placeholder="Ej. pedido duplicado"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (
                  !confirm("¿Anular este pedido? Esta acción es irreversible.")
                ) {
                  return;
                }
                runAction(async () => {
                  await cancelOrder(order.id, reason);
                  closeSecondary();
                }, toast);
              }}
            >
              Anular pedido
            </Button>
          </div>
        )}

        {/* Acciones primarias */}
        <OrderActions order={order} />
      </CardContent>
    </Card>
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
  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Pedidos</h1>
        <p className="text-muted-foreground">
          Consulta y avanza el estado de los pedidos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={currentStatus === f.value ? "default" : "secondary"}
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
            <OrderCard key={order.id} order={order} statusLabels={statusLabels} />
          ))}
        </div>
      )}
    </div>
  );
}
