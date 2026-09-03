"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlavorCategory,
  FlavorCategoryList,
  FlavorCategoryLabel,
  formatPrice,
  type Catalog,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type Size,
  type Topping,
} from "@bubba/types";
import { createPosOrder } from "@/actions/pos";
import { usePosCart } from "./pos-cart-store";

const CATEGORIES = FlavorCategoryList;

function firstActiveCategory(catalog: Catalog): FlavorCategoryType {
  return (
    CATEGORIES.find((c) =>
      catalog.flavors.some((f) => f.categories.includes(c) && f.available),
    ) ?? FlavorCategory.MILK
  );
}

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

export function PosTerminal({ catalog }: { catalog: Catalog }) {
  const cart = usePosCart();
  const [activeCategory, setActiveCategory] = useState<FlavorCategoryType>(
    firstActiveCategory(catalog),
  );
  const [sizeId, setSizeId] = useState<string>("");
  const [bobaTypeId, setBobaTypeId] = useState<string>("");
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al entrar (montar) se dejan los selectores en blanco para arrancar
  // un pedido nuevo sin arrastrar selecciones.
  useEffect(() => {
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
    setActiveCategory(firstActiveCategory(catalog));
  }, [catalog]);

  // Al entrar se limpia el carrito persistido de una sesión anterior para no
  // heredar ítems viejos guardados en localStorage.
  useEffect(() => {
    cart.clear();
    // La limpieza es solo al montar: se ignora el resto de dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toast de éxito: aparece suavemente, permanece ~3s y se desvanece solo.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contenedor con scroll del catálogo: se desplaza al inicio al confirmar un producto.
  const catalogScrollRef = useRef<HTMLDivElement | null>(null);

  function showToast(message: string) {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(message);
    setToastLeaving(false);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastLeaving(true), 3000);
  }

  useEffect(() => {
    if (!toastLeaving) return;
    const t = setTimeout(() => {
      setToastVisible(false);
      setToastLeaving(false);
      setToast(null);
    }, 400);
    return () => clearTimeout(t);
  }, [toastLeaving]);

  const sizes = catalog.sizes.filter((s) => s.available);
  const bobaTypes = catalog.bobaTypes.filter((b) => b.available);
  const toppings = catalog.toppings.filter((t) => t.available);
  const size = sizes.find((s) => s.id === sizeId);
  const bobaType = bobaTypes.find((b) => b.id === bobaTypeId);

  // Autoselección por defecto: Tamaño Grande y Tipo de boba Tapioca.
  const grandSize = sizes.find((s) => s.name === "Grande") ?? sizes[0];
  const tapiocaBoba =
    bobaTypes.find((b) => b.name === "Tapioca") ?? bobaTypes[0];

  // Orden de tipos de boba: Tapioca primero (izquierda) y Explosivas a la derecha.
  const sortedBobaTypes = [...bobaTypes].sort((a, b) => {
    const rank = (t: typeof bobaTypes[number]) =>
      t.name === "Tapioca" ? 0 : t.name === "Explosivas" ? 1 : 2;
    return rank(a) - rank(b);
  });

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

  // Subtotal del producto en proceso: bebida base + el costo de los extras seleccionados.
  function preticketSubtotal(): number {
    const base = priceOf();
    const extras = selectedToppings.reduce((sum, t) => sum + t.price, 0);
    return base + extras;
  }

  const selectedFlavor =
    flavors.find((f) => f.id === selectedFlavorId) ?? null;

  function switchCategory(category: FlavorCategoryType) {
    setActiveCategory(category);
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
  }

  function toggleTopping(id: string) {
    setToppingIds((current) =>
      current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id],
    );
  }

  function selectFlavor(flavor: Flavor) {
    setSelectedFlavorId((current) => {
      if (current !== flavor.id) {
        setToppingIds([]);
      }
      return flavor.id;
    });
    // Autoselección inteligente: Tamaño Grande y Tipo de boba Tapioca por defecto.
    if (grandSize) setSizeId(grandSize.id);
    if (tapiocaBoba) setBobaTypeId(tapiocaBoba.id);
  }

  function confirmProduct() {
    if (!selectedSize || !bobaType || !selectedFlavor) return;
    cart.addItem({
      size: selectedSize,
      flavor: selectedFlavor,
      category: activeCategory,
      bobaType,
      unitPrice: priceOf(),
      toppings: selectedToppings.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
      })),
    });
    setSelectedFlavorId(null);
    setSizeId("");
    setBobaTypeId("");
    setToppingIds([]);
    catalogScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (cart.items.length === 0) return;
    setBusy(true);
    setError(null);
    setToastLeaving(false);
    try {
      const trimmedName = cart.customerName.trim();
      // El mesero solo toma pedidos en mesa: se fuerza MESA.
      const result = await createPosOrder(
        cart.items,
        trimmedName === "" ? undefined : trimmedName,
        "MESA",
      );
      cart.clear();
      setToppingIds([]);
      setSizeId("");
      setBobaTypeId("");
      setSelectedFlavorId(null);
      setActiveCategory(firstActiveCategory(catalog));
      showToast(
        `¡Pedido enviado a caja con éxito! · Total ${formatPrice(result.total)}`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo enviar el pedido.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleClear() {
    cart.clear();
    setToppingIds([]);
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
  }

  const selectedSize: Size | undefined = size;

  // Brillo sutil en el cuadro de nombre cuando ya hay un ticket generado
  // pero aún no se ha ingresado el nombre o la mesa.
  const needsName = cart.items.length > 0 && cart.customerName.trim() === "";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-950">
      {/* Toast flotante de confirmación (se desvanece solo) */}
      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 transition-all duration-500 ease-out ${
            toastLeaving
              ? "pointer-events-none translate-y-[-10px] opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        >
          <div className="flex min-w-[300px] max-w-md items-start gap-3 rounded-xl border border-emerald-500/40 bg-slate-900 px-5 py-4 shadow-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-base font-bold leading-snug text-white">
              {toast}
            </p>
          </div>
        </div>
      )}

      {/* ===== Ticket en curso (ultra compacto) ===== */}
      {cart.items.length > 0 && (
        <div className="ticket-in sticky top-0 z-20 flex w-full shrink-0 flex-col bg-slate-900 border-b border-slate-800 shadow-2xl max-h-[40vh] overflow-hidden">
          <div className="shrink-0 px-2 pt-1 pb-0.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-black uppercase tracking-wide text-white">
                Ticket
              </h2>
              <button
                type="button"
                onClick={handleClear}
                disabled={busy}
                title="Vaciar el pedido"
                className="h-6 shrink-0 rounded border border-slate-700 bg-slate-800 px-1.5 text-[10px] font-bold text-slate-400 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Limpiar
              </button>
            </div>
            {busy && (
              <p className="mt-0.5 rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                Enviando…
              </p>
            )}
            {error && (
              <p className="mt-0.5 rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">
                ⚠ {error}
              </p>
            )}
          </div>

          {/* Ítems compactos */}
          <div className="scroll-touch min-h-0 flex-1 overflow-y-auto px-2 py-0.5 space-y-0.5">
            {cart.items.map((item) => {
              const unitWithExtras =
                item.unitPrice +
                item.toppings.reduce((sum, t) => sum + t.price, 0);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-1 rounded bg-slate-800/80 px-1.5 py-0.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white leading-tight">
                      {item.flavor.name}
                      <span className="ml-1 font-normal text-slate-400">
                        {item.size.name}·{item.bobaType.name}
                      </span>
                      {item.toppings.length > 0 && (
                        <span className="ml-1 font-normal text-slate-500 text-[10px]">
                          +{item.toppings.map((t) => t.name).join(",")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Quitar una unidad"
                      className="h-6 w-6 rounded bg-slate-700 text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Agregar una unidad"
                      className="h-6 w-6 rounded bg-slate-700 text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                    <span className="w-12 text-right font-mono text-[11px] font-bold text-white">
                      {formatPrice(unitWithExtras * item.quantity)}
                    </span>
                    <button
                      type="button"
                      aria-label="Quitar el producto"
                      className="ml-1 h-5 px-1 rounded bg-red-600/80 text-white text-[10px] font-bold active:scale-95"
                      onClick={() => cart.removeItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: input + Total + Enviar a Caja compacto */}
          <div className="shrink-0 px-2 py-1 bg-slate-950 border-t border-slate-800 space-y-1">
            <input
              type="text"
              value={cart.customerName}
              onChange={(e) => cart.setCustomerName(e.target.value)}
              placeholder="Nombre o Mesa"
              className={`h-8 w-full rounded border bg-slate-800 px-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-shadow ${
                needsName
                  ? "border-amber-400/70 animate-name-glow"
                  : "border-slate-700 focus:border-primary"
              }`}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Total
                </span>
                <span className="font-mono text-lg font-black text-white">
                  {formatPrice(totalOfItems(cart.items))}
                </span>
              </div>
              <button
                type="button"
                disabled={busy || cart.items.length === 0}
                onClick={submit}
                className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-black text-white shadow transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "…" : "Enviar a Caja"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Catálogo de menú (abajo) ===== */}
      <div ref={catalogScrollRef} className="scroll-touch min-h-0 flex-1 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {/* Pestañas de categorías */}
          <div className="flex flex-wrap gap-2">
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
                  className={`h-12 px-4 rounded-xl border text-base font-bold transition-colors disabled:opacity-30 ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-slate-600 text-white hover:border-primary/60"
                  }`}
                >
                  {FlavorCategoryLabel[category]}
                </button>
              );
            })}
          </div>

          {/* Grilla de sabores */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {flavors.map((flavor) => {
              const selected = selectedFlavorId === flavor.id;
              return (
                <button
                  key={flavor.id}
                  type="button"
                  onClick={() => selectFlavor(flavor)}
                  className={`h-16 w-full rounded-xl border p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-transform active:scale-95 ${
                    selected
                      ? "border-primary bg-primary/15 text-white"
                      : "border-slate-700 bg-slate-800 text-white hover:border-primary hover:bg-slate-700"
                  }`}
                >
                  {flavor.name}
                </button>
              );
            })}
          </div>

          {/* Tamaño */}
          <section className="space-y-2">
            <h3 className="text-base font-bold uppercase tracking-wide text-white">
              Tamaño
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSizeId(s.id)}
                  className={`h-16 w-full rounded-xl border p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-transform active:scale-95 ${
                    s.id === sizeId
                      ? "border-primary bg-primary text-white"
                      : "border-slate-700 bg-slate-800 text-white hover:border-primary hover:bg-slate-700"
                  }`}
                >
                  {s.name} · {s.oz} oz
                </button>
              ))}
            </div>
          </section>

          {/* Tipo de boba */}
          <section className="space-y-2">
            <h3 className="text-base font-bold uppercase tracking-wide text-white">
              Tipo de boba
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {sortedBobaTypes.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBobaTypeId(b.id)}
                  className={`h-16 w-full rounded-xl border p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-transform active:scale-95 ${
                    b.id === bobaTypeId
                      ? "border-primary bg-primary text-white"
                      : "border-slate-700 bg-slate-800 text-white hover:border-primary hover:bg-slate-700"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </section>

          {toppings.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-base font-bold uppercase tracking-wide text-white">
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
                          : "border-slate-700 bg-slate-800 text-white hover:border-primary hover:bg-slate-700"
                      }`}
                    >
                      + {t.name} · {formatPrice(t.price)}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Preticket: producto en construcción */}
          {selectedFlavor && (
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <h3 className="text-base font-bold uppercase tracking-wide text-white">
                Producto en curso
              </h3>
              <div className="mt-2 space-y-1 text-base text-white">
                <p className="font-bold">{selectedFlavor.name}</p>
                <p className="font-normal">
                  {size?.name
                    ? `${size.name} · ${bobaType?.name ?? ""}`
                    : "Elige un tamaño"}
                </p>
                {selectedToppings.length > 0 && (
                  <p className="font-normal">
                    + {selectedToppings.map((t) => t.name).join(", ")}
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-base font-semibold uppercase tracking-wide text-white">
                  Subtotal
                </span>
                <span className="font-mono text-2xl font-black text-white">
                  {selectedSize && bobaType ? formatPrice(preticketSubtotal()) : "—"}
                </span>
              </div>
              <button
                type="button"
                disabled={!selectedSize || !selectedFlavor || !bobaType}
                onClick={confirmProduct}
                className="mt-3 h-16 w-full rounded-xl bg-emerald-600 text-2xl font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar producto
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
