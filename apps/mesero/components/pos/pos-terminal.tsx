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
    <div className="flex w-full min-h-screen flex-col bg-slate-950">
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

      {/* ===== Ticket en curso (visible solo cuando hay productos agregados) ===== */}
      {cart.items.length > 0 && (
        <div className="ticket-in sticky top-0 z-20 flex h-[42vh] w-full shrink-0 flex-col bg-slate-900 border-b border-slate-800 shadow-2xl">
        <div className="shrink-0 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-white">
              Ticket en curso
            </h2>
            <button
              type="button"
              onClick={handleClear}
              disabled={
                busy ||
                (cart.items.length === 0 &&
                  cart.customerName === "" &&
                  selectedFlavorId === null)
              }
              title="Vaciar el pedido si el cliente se arrepiente"
              className="h-10 shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-bold text-slate-300 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpiar
            </button>
          </div>
          {busy && (
            <p className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300">
              Enviando… por favor espera.
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Cuerpo del ticket: ítems con scroll interno sin alterar el tamaño del cuadro */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 && (
            <p className="text-base text-white">
              Agrega bebidas tocando un sabor.
            </p>
          )}
          {cart.items.map((item) => {
            const unitWithExtras =
              item.unitPrice +
              item.toppings.reduce((sum, t) => sum + t.price, 0);
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-slate-800 px-3 py-2"
              >
                <div className="min-w-0 text-base">
                  <p className="font-bold text-white">
                    {item.quantity}× {item.flavor.name}
                  </p>
                  <p className="text-white font-normal">
                    {item.size.name} · {item.bobaType.name}
                  </p>
                  {item.toppings.length > 0 && (
                    <p className="text-white font-normal">
                      + {item.toppings.map((t) => t.name).join(", ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      className="h-14 w-14 rounded-lg bg-slate-700 text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span className="text-xl font-bold w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="h-14 w-14 rounded-lg bg-slate-700 text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="h-14 px-6 rounded-lg bg-red-600 text-white text-lg font-bold active:scale-95 transition-transform"
                      onClick={() => cart.removeItem(item.id)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                <span className="font-mono text-base font-bold text-white">
                  {formatPrice(unitWithExtras * item.quantity)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Área de pago: input, luego fila con Total + botón Enviar a Caja en la misma línea */}
        <div className="shrink-0 p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
          <input
            type="text"
            value={cart.customerName}
            onChange={(e) => cart.setCustomerName(e.target.value)}
            placeholder="Nombre o Mesa"
            className={`h-11 w-full rounded-lg border bg-slate-800 px-3 text-base text-white placeholder:text-slate-500 focus:outline-none transition-shadow ${
              needsName
                ? "border-amber-400/70 animate-name-glow"
                : "border-slate-700 focus:border-primary"
            }`}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-base font-bold uppercase tracking-wide text-white">
                Total
              </span>
              <span className="truncate font-mono text-3xl font-black text-white">
                {formatPrice(totalOfItems(cart.items))}
              </span>
            </div>

            <button
              type="button"
              disabled={busy || cart.items.length === 0}
              onClick={submit}
              className="flex h-16 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-xl font-black text-white shadow-lg transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Enviando…" : "Enviar a Caja"}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ===== Catálogo de menú (abajo) ===== */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
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
