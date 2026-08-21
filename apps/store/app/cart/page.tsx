"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CartItemRow,
  CartSummary,
} from "@bubba/ui";
import { useCartStore } from "@/lib/store/cart-store";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import { formatPrice, formatOrderCode } from "@bubba/types";
import type { CartItem } from "@bubba/types";
import { createOrder } from "@/app/actions/order";
import { getPaymentQr } from "@/app/actions/payment";
import { printReceipt } from "@/lib/print-receipt";

export default function CartPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const items = useCartStore((s) => s.items);
  const customerName = useCartStore((s) => s.customerName);
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderSeq, setOrderSeq] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [orderCustomerName, setOrderCustomerName] = useState<string | null>(
    null,
  );
  const [paymentQr, setPaymentQr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    getPaymentQr()
      .then((qr) => setPaymentQr(qr?.qrImage ?? null))
      .catch(() => setPaymentQr(null));
  }, [orderId]);

  if (!hydrated) {
    return <div className="text-muted-foreground">Cargando carrito...</div>;
  }

  if (orderId) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold">¡Pedido confirmado!</h1>
        <p className="text-muted-foreground">
          Tu pedido{" "}
          <span className="font-semibold">
            #{formatOrderCode(orderSeq)}
          </span>{" "}
          fue registrado.
          {orderCustomerName && (
            <>{" "}Queda a nombre de{" "}
              <span className="font-semibold text-foreground">
                {orderCustomerName}
              </span>
            </>
          )}
          {" "}Pasa por tu bubble drink en mostrador.
        </p>
        {orderTotal !== null && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-6 py-4">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Total a pagar
            </p>
            <p className="text-4xl font-extrabold text-foreground">
              {formatPrice(orderTotal)}
            </p>
          </div>
        )}
        {paymentQr && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Escanea este QR para realizar tu pago:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={paymentQr}
              alt="QR de pago"
              className="mx-auto h-48 w-48 rounded-lg border bg-white object-contain p-2"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() =>
              printReceipt(
                formatOrderCode(orderSeq),
                orderItems,
                orderTotal ?? 0,
                orderCustomerName,
                () => {
                  window.location.href = "/";
                },
              )
            }
          >
            Imprimir comanda
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-10 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <p className="text-muted-foreground">
          Arma tu primera bubble drink y agrégala al carrito.
        </p>
        <Button asChild>
          <Link href="/build">Armar mi boba</Link>
        </Button>
      </div>
    );
  }

  async function handleCheckout() {
    if (!customerName?.trim()) {
      setError("Escribe tu nombre para que podamos entregarte el pedido.");
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      setOrderItems([...items]);
      setOrderCustomerName(customerName.trim());
      const { orderId: newOrderId, seq, total } = await createOrder(
        items,
        customerName.trim(),
      );
      setOrderId(newOrderId);
      setOrderSeq(seq);
      setOrderTotal(total);
      clear();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al crear el pedido.",
      );
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi carrito</h1>
        <Badge variant="secondary">
          {items.reduce((acc, i) => acc + i.quantity, 0)} bebida
          {items.reduce((acc, i) => acc + i.quantity, 0) !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div />
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-4">
              <label
                htmlFor="customer-name"
                className="text-sm font-medium text-muted-foreground"
              >
                Tu nombre (para entregar tu pedido)
              </label>
              <input
                id="customer-name"
                type="text"
                maxLength={40}
                placeholder="Ej. María Pérez"
                value={customerName ?? ""}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </CardContent>
          </Card>
          <CartSummary items={items} />
          {error && (
            <Card>
              <CardContent className="p-4 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          )}
          <Button
            className="w-full"
            size="lg"
            disabled={placing}
            onClick={handleCheckout}
          >
            {placing ? "Creando pedido..." : "Confirmar pedido"}
          </Button>
          <Button variant="outline" className="w-full border-white/40 bg-red-500/80 text-white hover:bg-red-500" asChild>
            <Link href="/build">Armar otra bebida</Link>
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              clear();
              router.push("/");
            }}
          >
            Cancelar pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
