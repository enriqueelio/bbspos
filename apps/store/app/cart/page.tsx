"use client";

import { useState } from "react";
import Link from "next/link";
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
import { createOrder } from "@/app/actions/order";

export default function CartPage() {
  const hydrated = useHasHydrated();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  if (!hydrated) {
    return <div className="text-muted-foreground">Cargando carrito...</div>;
  }

  if (orderId) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold">¡Pedido confirmado!</h1>
        <p className="text-muted-foreground">
          Tu pedido <span className="font-semibold">#{orderId}</span> fue
          registrado. Pasa por tu bubble drink en mostrador.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link href="/build">Armar otra bebida</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Volver al inicio</Link>
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
    setPlacing(true);
    setError(null);
    try {
      const { orderId: newOrderId } = await createOrder(items);
      setOrderId(newOrderId);
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
        </div>
      </div>
    </div>
  );
}
