"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlavorCategory,
  FlavorCategoryList,
  FlavorCategoryLabel,
  formatPrice,
  type Catalog,
  type FlavorCategory as FlavorCategoryType,
  type Size,
  type Topping,
} from "@bubba/types";
import { createPosOrder } from "@/actions/pos";
import { usePosCart, type PosDeliveryType } from "./pos-cart-store";

const CATEGORIES = FlavorCategoryList;

function totalOfItems(items: {
  unitPrice: number;
  quantity: number;
  toppings: { price: number }[];
}[]): number {
  return items.reduce(
    (acc, item) =>
      acc +
      (item.unitPrice +
        item.toppings.reduce((sum, t) => sum + t.price, 0)) *
        item.quantity,
    0,
  );
}

function deliveryLabel(type: PosDeliveryType) {
  return type === "MESA" ? "Para mesa" : "Para llevar";
}

export function PosTerminal({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const cart = usePosCart();
  const [activeCategory, setActiveCategory] = useState<FlavorCategoryType>(
    CATEGORIES.find((c) =>
      catalog.flavors.some(
        (f) => f.categories.includes(c) && f.available,
      ),
    ) ?? FlavorCategory.MILK,
  );
  const [sizeId, setSizeId] = useState<string>(catalog.sizes[0]?.id ?? "");
  const [bobaTypeId, setBobaTypeId] = useState<string>(
    catalog.bobaTypes[0]?.id ?? "",
  );
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sizes = catalog.sizes.filter((s) => s.available);
  const bobaTypes = catalog.bobaTypes.filter((b) => b.available);
  const toppings = catalog.toppings.filter((t) => t.available);
  const size =
    sizes.find((s) => s.id === sizeId) ?? sizes.find((s) => s.available);
  const bobaType =
    bobaTypes.find((b) => b.id === bobaTypeId) ??
    bobaTypes.find((b) => b.available);

  const flavors = useMemo(
    () =>
      catalog.flavors.filter(
        (f) => f.categories.includes(activeCategory) && f.available,
      ),
    [catalog.flavors, activeCategory],
  );

  function priceOf(): number {
    if (!size || !bobaType) return 0;
    return (
      catalog.drinkPrices.find(
        (p) =>
          p.category === activeCategory &&
          p.sizeId === size.id &&
          p.bobaTypeId === bobaType.id,
      )?.price ?? 0
    );
  }

  const selectedToppings = toppingIds
    .map((id) => toppings.find((t) => t.id === id))
    .filter((t): t is Topping => Boolean(t));

  function switchCategory(category: FlavorCategoryType) {
    setActiveCategory(category);
    setSizeId(catalog.sizes[0]?.id ?? "");
    setBobaTypeId(catalog.bobaTypes[0]?.id ?? "");
  }

  function toggleTopping(id: string) {
    setToppingIds((current) =>
      current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id],
    );
  }

  async function submit() {
    if (cart.items.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const trimmedName = cart.customerName.trim();
      const result = await createPosOrder(
        cart.items,
        trimmedName === "" ? undefined : trimmedName,
        cart.deliveryType,
      );
      cart.clear();
      setToppingIds([]);
      setNotice(
        `Pedido #${result.seq} creado · Total ${formatPrice(result.total)}`,
      );
      router.push("/?tab=preparar");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo enviar el pedido.",
      );
    } finally {
      setBusy(false);
    }
  }

  const selectedSize: Size | undefined = size;

  return (
    <div className="grid min-h-screen lg:grid-cols-[7fr_3fr]">
      {/* ===== Izquierda (70%): catálogo rápido ===== */}
      <div className="space-y-4 overflow-y-auto p-4 lg:p-6">
        <div className="flex gap-2">
          {CATEGORIES.map((category) => {
            const enabled = catalog.flavors.some(
              (f) => f.categories.includes(category) && f.available,
            );
            const selected = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                disabled={!enabled}
                onClick={() => switchCategory(category)}
                className={`h-12 flex-1 rounded-xl border text-lg font-bold transition-colors disabled:opacity-30 ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card hover:border-primary/60"
                }`}
              >
                {FlavorCategoryLabel[category]}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {flavors.map((flavor) => (
            <button
              key={flavor.id}
              type="button"
              disabled={!selectedSize || !bobaType}
              onClick={() =>
                cart.addItem({
                  size: selectedSize!,
                  flavor,
                  category: activeCategory,
                  bobaType: bobaType!,
                  unitPrice: priceOf(),
                  toppings: selectedToppings.map((t) => ({
                    id: t.id,
                    name: t.name,
                    price: t.price,
                  })),
                })
              }
              className="h-16 rounded-xl border border-border bg-card px-3 text-lg font-bold text-white transition-all hover:border-primary hover:bg-primary/10 disabled:opacity-40"
            >
              <span className="block leading-tight">{flavor.name}</span>
              <span className="block text-sm font-semibold text-primary">
                {priceOf()
                  ? formatPrice(priceOf())
                  : "\u00a0"}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tamaño
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSizeId(s.id)}
                  className={`h-12 rounded-xl border text-base font-bold transition-colors ${
                    s.id === sizeId
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card hover:border-primary/60"
                  }`}
                >
                  {s.name} · {s.oz} oz
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tipo de boba
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {bobaTypes.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBobaTypeId(b.id)}
                  className={`h-12 rounded-xl border text-base font-bold transition-colors ${
                    b.id === bobaTypeId
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card hover:border-primary/60"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </section>
        </div>

        {toppings.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Extras
            </h3>
            <div className="flex flex-wrap gap-2">
              {toppings.map((t) => {
                const selected = toppingIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTopping(t.id)}
                    className={`h-11 rounded-xl border px-4 text-base font-bold transition-colors ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card hover:border-primary/60"
                    }`}
                  >
                    + {t.name} · {formatPrice(t.price)}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ===== Derecha (30%): ticket en curso ===== */}
      <aside className="sticky top-0 flex h-screen flex-col bg-slate-900 p-4">
        <h2 className="pb-3 text-lg font-black uppercase tracking-wide text-white">
          Ticket en curso
        </h2>

        {busy && (
          <p className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300">
            Enviando… por favor espera.
          </p>
        )}
        {notice && (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            ⚠ {error}
          </p>
        )}

        <ul className="flex-1 space-y-1 overflow-y-auto py-2">
          {cart.items.length === 0 && (
            <li className="text-sm text-slate-500">
              Agrega bebidas tocando un sabor.
            </li>
          )}
          {cart.items.map((item) => {
            const unitWithExtras =
              item.unitPrice +
              item.toppings.reduce((sum, t) => sum + t.price, 0);
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-slate-800 px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-bold text-white">
                    {item.quantity}× {item.flavor.name}
                  </p>
                  <p className="text-slate-400">
                    {item.size.name} · {item.bobaType.name}
                  </p>
                  {item.toppings.length > 0 && (
                    <p className="text-slate-400">
                      + {item.toppings.map((t) => t.name).join(", ")}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-6 w-6 rounded bg-slate-700 text-sm font-black text-white hover:bg-slate-600"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="h-6 w-6 rounded bg-slate-700 text-sm font-black text-white hover:bg-slate-600"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="text-sm font-bold text-red-400 hover:text-red-300"
                      onClick={() => cart.removeItem(item.id)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                <span className="font-mono text-base font-bold text-white">
                  {formatPrice(unitWithExtras * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>

        <input
          type="text"
          value={cart.customerName}
          onChange={(e) => cart.setCustomerName(e.target.value)}
          placeholder="Nombre del cliente (opcional)"
          className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-base text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
        />

        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["MESA", "LLEVAR"] as PosDeliveryType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => cart.setDeliveryType(type)}
              className={`h-11 rounded-lg border text-base font-bold transition-colors ${
                cart.deliveryType === type
                  ? "border-primary bg-primary text-white"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:border-primary/60"
              }`}
            >
              {deliveryLabel(type)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Total
          </span>
          <span className="font-mono text-2xl font-black text-white">
            {formatPrice(totalOfItems(cart.items))}
          </span>
        </div>

        <button
          type="button"
          disabled={busy || cart.items.length === 0}
          onClick={submit}
          className="mt-3 h-20 w-full rounded-xl bg-primary px-4 text-xl font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Enviando…"
            : `Enviar y Cobrar (Total: ${formatPrice(totalOfItems(cart.items))})`}
        </button>
      </aside>
    </div>
  );
}