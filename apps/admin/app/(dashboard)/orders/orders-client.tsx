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
} from "@bubba/ui";
import {
  formatPrice,
  formatOrderCode,
  PaymentMethodLabel,
  AcceptablePayment,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@bubba/types";
import {
  acceptOrder,
  applyDiscount,
  cancelOrder,
  deliverOrder,
} from "@/app/actions/orders";

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

function runAction(fn: () => Promise<void>) {
  fn().catch((e) => {
    alert(e instanceof Error ? e.message : "Ocurrió un error.");
  });
}

function OrderActions({ order }: { order: Order }) {
  const [panel, setPanel] = useState<"pay" | "discount" | "cancel" | null>(
    null,
  );
  const [method, setMethod] = useState<PaymentMethod>("EFECTIVO");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  if (order.status === "ANULADO") {
    return null;
  }

  const close = () => {
    setPanel(null);
    setAmount("");
    setReason("");
  };

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap justify-end gap-2">
        {order.status === "RECIBIDO" && (
          <Button
            size="sm"
            variant={panel === "pay" ? "default" : "outline"}
            onClick={() => setPanel(panel === "pay" ? null : "pay")}
          >
            Registrar pago
          </Button>
        )}
        {order.status === "ACEPTADO" && (
          <Button
            size="sm"
            variant="default"
            onClick={() =>
              runAction(async () => {
                await deliverOrder(order.id);
              })
            }
          >
            Entregar
          </Button>
        )}
        <Button
          size="sm"
          variant={panel === "discount" ? "default" : "outline"}
          onClick={() => setPanel(panel === "discount" ? null : "discount")}
        >
          Descontar
        </Button>
        <Button
          size="sm"
          variant={panel === "cancel" ? "destructive" : "outline"}
          onClick={() => setPanel(panel === "cancel" ? null : "cancel")}
        >
          Anular
        </Button>
      </div>

      {panel === "pay" && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/40 p-3">
          <div className="space-y-1">
            <Label htmlFor={`method-${order.id}`}>Método de pago</Label>
            <select
              id={`method-${order.id}`}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              {AcceptablePayment.map((m) => (
                <option key={m} value={m}>
                  {PaymentMethodLabel[m]}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={() =>
              runAction(async () => {
                await acceptOrder(order.id, method);
                close();
              })
            }
          >
            Confirmar pago ({formatPrice(order.total)})
          </Button>
        </div>
      )}

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
            onClick={() =>
              runAction(async () => {
                await applyDiscount(order.id, Number(amount), reason);
                close();
              })
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
              if (!confirm("¿Anular este pedido? Esta acción es irreversible.")) {
                return;
              }
              runAction(async () => {
                await cancelOrder(order.id, reason);
                close();
              });
            }}
          >
            Anular pedido
          </Button>
        </div>
      )}
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
                    <CardTitle className="text-base">
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
                        {PaymentMethodLabel[order.paymentMethod]}
                      </Badge>
                    )}
                    <Badge variant={statusVariant(order.status)}>
                      {statusLabels[order.status]}
                    </Badge>
                    <span className="font-bold">{formatPrice(order.total)}</span>
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
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {item.quantity}× {item.sizeName} · {item.flavorName} ·{" "}
                        {item.bobaTypeName}
                        {item.toppings.length > 0 && (
                          <span className="block pl-2 text-xs">
                            Toppings:{" "}
                            {item.toppings
                              .map(
                                (t) =>
                                  `${t.toppingName} (+${formatPrice(t.unitPrice)})`,
                              )
                              .join(", ")}
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {formatPrice(
                          (item.unitPrice +
                            item.toppings.reduce(
                              (acc, t) => acc + t.unitPrice,
                              0,
                            )) *
                            item.quantity,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <OrderActions order={order} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
