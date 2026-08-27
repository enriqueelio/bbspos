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
} from "@bubba/ui";
import { useCartStore } from "@/lib/store/cart-store";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import { formatPrice, formatOrderCode, sumToppings } from "@bubba/types";
import { createOrder } from "@/app/actions/order";
import { getPaymentQr } from "@/app/actions/payment";

export default function CartPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const items = useCartStore((s) => s.items);
  const customerName = useCartStore((s) => s.customerName);
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  const deliveryType = useCartStore((s) => s.deliveryType);
  const setDeliveryType = useCartStore((s) => s.setDeliveryType);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderSeq, setOrderSeq] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
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
            className="w-full bg-green-500 text-white hover:bg-green-600"
            asChild
          >
            <Link href="/">Volver al inicio</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Tu comanda ya se está imprimiendo en mostrador.
          </p>
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
      setOrderCustomerName(customerName.trim());
      const { orderId: newOrderId, seq, total } = await createOrder(
        items,
        customerName.trim(),
        deliveryType,
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {items.reduce((acc, i) => acc + i.quantity, 0)} bebida
            {items.reduce((acc, i) => acc + i.quantity, 0) !== 1 ? "s" : ""}
          </Badge>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              clear();
              router.push("/");
            }}
          >
            Cancelar
          </Button>
        </div>
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
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className={`h-14 w-full bg-white text-lg font-semibold text-foreground ${deliveryType === "MESA" ? "border-primary bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setDeliveryType("MESA")}
                >
                  Para Servirse
                </Button>
                <Button
                  variant="outline"
                  className={`h-14 w-full bg-white text-lg font-semibold text-foreground ${deliveryType === "LLEVAR" ? "border-primary bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setDeliveryType("LLEVAR")}
                >
                  Para Llevar
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-6 py-4 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Total a pagar
            </p>
            <p className="text-4xl font-extrabold text-foreground">
              {formatPrice(
                items.reduce(
                  (acc, item) =>
                    acc + (item.unitPrice + sumToppings(item.toppings)) * item.quantity,
                  0,
                ),
              )}
            </p>
          </div>
          {error && (
            <Card>
              <CardContent className="p-4 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-4 w-full max-w-lg mx-auto">
            <Button
              className="w-full h-20 text-2xl font-bold bg-primary text-white rounded-2xl shadow-xl active:bg-primary/90"
              disabled={placing}
              onClick={handleCheckout}
            >
              {placing ? "Creando pedido..." : "Pagar ahora"}
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-lg font-semibold bg-white border-2 border-slate-200 text-slate-700 rounded-xl"
              asChild
            >
              <Link href="/build">Agregar más Bebidas</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
