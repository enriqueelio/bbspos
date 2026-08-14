"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@bubba/ui";
import { useCartStore } from "@/lib/store/cart-store";
import { useHasHydrated } from "@/lib/use-has-hydrated";

export function SiteHeader() {
  const hydrated = useHasHydrated();
  const items = useCartStore((s) => s.items);
  const count = hydrated
    ? items.reduce((acc, item) => acc + item.quantity, 0)
    : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-block h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-700" />
          <span className="text-lg">Bubba Drinks</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/build">Arma tu boba</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/cart" className="relative">
              <ShoppingCart className="h-4 w-4" />
              <span>Carrito</span>
              {count > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
