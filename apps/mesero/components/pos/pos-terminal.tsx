"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlavorCategory,
  FlavorCategoryList,
  FlavorCategoryLabel,
  MenuCategoryLabel,
  MenuCategoryList,
  cartItemUnitTotal,
  formatPrice,
  type Catalog,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type MenuCategory as MenuCategoryType,
  type MenuItemView,
  type Size,
  type Topping,
} from "@bbspos/types";
import { createPosOrder } from "@/actions/pos";
import { usePosCart } from "./pos-cart-store";

const CATEGORIES = FlavorCategoryList;

// ===== Alitas: sabores simples y salsas de las alitas mixtas =====
// Las alitas simples vienen bañadas en su salsa; las Alitas Mixtas obligan a
// elegir 2 salsas (6/8 unidades) o 3 (12 unidades) antes de confirmar.
const ALITA_SAUCES = [
  "Miel y Mostaza",
  "Barbacoa",
  "Barbacoa Picante",
  "Buffalo",
  "Agridulce",
  "Crocantes",
];

function isMixtasItem(item: Pick<MenuItemView, "name">): boolean {
  return /mixtas/i.test(item.name);
}

/** Salsas exigidas para las Alitas Mixtas según las unidades del tamaño. */
function requiredSauces(unitsLabel: string): number {
  const units = Number(unitsLabel.match(/^(\d+)/)?.[1]) || 0;
  return units >= 12 ? 3 : 2;
}

function firstActiveCategory(catalog: Catalog): FlavorCategoryType {
  return (
    CATEGORIES.find((c) =>
      catalog.flavors.some((f) => f.categories.includes(c) && f.available),
    ) ?? FlavorCategory.MILK
  );
}

function firstCartaCategory(catalog: Catalog): MenuCategoryType | null {
  return (
    MenuCategoryList.find((c) =>
      catalog.cartaItems.some((i) => i.category === c),
    ) ?? null
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
  const [cartaCategory, setCartaCategory] = useState<MenuCategoryType | null>(
    null,
  );
  const [variantItem, setVariantItem] = useState<MenuItemView | null>(null);
  const [variantSize, setVariantSize] = useState<
    MenuItemView["options"][number] | null
  >(null);
  const [variantSauces, setVariantSauces] = useState<string[]>([]);

  // Al entrar (montar) se dejan los selectores en blanco para arrancar
  // un pedido nuevo sin arrastrar selecciones.
  useEffect(() => {
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
    setVariantItem(null);
    setVariantSize(null);
    setVariantSauces([]);
    setCartaCategory(firstCartaCategory(catalog));
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
    setVariantItem(null);
    setVariantSize(null);
    setVariantSauces([]);
  }

  const cartaItems =
    cartaCategory === null
      ? []
      : catalog.cartaItems.filter((i) => i.category === cartaCategory);

  function tapCartaItem(item: MenuItemView) {
    if (item.options.length > 0) {
      setVariantItem(item);
      setVariantSize(null);
      setVariantSauces([]);
      return;
    }
    cart.addMenuItem({
      menuItemId: item.id,
      name: item.name,
      category: item.category,
      unitPrice: item.price,
      optionName: null,
    });
  }

  // Variantes de alitas: tocar un tamaño en las simples agrega directo; en las
  // Mixtas deja el tamaño marcado y continúa para elegir las salsas.
  function tapVariantSize(option: MenuItemView["options"][number]) {
    if (!variantItem) return;
    if (isMixtasItem(variantItem)) {
      setVariantSize(option);
      setVariantSauces([]);
      return;
    }
    cart.addMenuItem({
      menuItemId: variantItem.id,
      name: variantItem.name,
      category: variantItem.category,
      unitPrice: option.price,
      optionName: option.name,
    });
    setVariantItem(null);
  }

  // Confirmar las Alitas Mixtas: exige exactamente las salsas requeridas (2 en
  // 6/8 unidades, 3 en 12) antes de agregar la línea a la orden.
  function confirmMixtas() {
    if (!variantItem || !variantSize) return;
    if (variantSauces.length !== requiredSauces(variantSize.name)) return;
    cart.addMenuItem({
      menuItemId: variantItem.id,
      name: variantItem.name,
      category: variantItem.category,
      unitPrice: variantSize.price,
      optionName: variantSize.name,
      detail: `Salsas: ${variantSauces.join(", ")}`,
    });
    setVariantItem(null);
    setVariantSize(null);
    setVariantSauces([]);
  }

  function toggleVariantSauce(sauce: string) {
    setVariantSauces((current) =>
      current.includes(sauce)
        ? current.filter((s) => s !== sauce)
        : [...current, sauce],
    );
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
              const unitWithExtras = cartItemUnitTotal(item);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-1 rounded bg-slate-800/80 px-1.5 py-0.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white leading-tight">
                      {item.kind === "DRINK" ? item.flavor.name : item.name}
                      {item.kind === "DRINK" && (
                        <span className="ml-1 font-normal text-slate-400">
                          {item.size.name}·{item.bobaType.name}
                        </span>
                      )}
                      {item.kind === "DRINK" && item.toppings.length > 0 && (
                        <span className="ml-1 font-normal text-slate-500 text-[10px]">
                          +{item.toppings.map((t) => t.name).join(",")}
                        </span>
                      )}
                      {item.kind === "MENU_ITEM" && item.optionName && (
                        <span className="ml-1 font-normal text-slate-400">
                          ·{item.optionName}
                        </span>
                      )}
                      {item.kind === "MENU_ITEM" && item.detail && (
                        <span className="ml-1 font-normal text-emerald-300">
                          [{item.detail}]
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
                  {formatPrice(
                    cart.items.reduce(
                      (acc, item) =>
                        acc + cartItemUnitTotal(item) * item.quantity,
                      0,
                    ),
                  )}
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
          {/* Sección destacada del Menú del Día (platos) */}
          {catalog.menuItems.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-white">
                Almuerzos
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-500">
                  DEL DÍA
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {catalog.menuItems.map((menuItem) => (
                  <button
                    key={menuItem.id}
                    type="button"
                    title={`Agregar ${menuItem.name}`}
                    onClick={() =>
                      cart.addMenuItem({
                        menuItemId: menuItem.id,
                        name: menuItem.name,
                        category: menuItem.category,
                        unitPrice: menuItem.price,
                        optionName: null,
                      })
                    }
                    className="h-16 w-full rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-transform active:scale-95 hover:border-amber-400 hover:bg-amber-500/20"
                  >
                    {menuItem.name}
                    <span className="mt-0.5 block text-xs font-semibold text-amber-400">
                      {formatPrice(menuItem.price)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Sección Carta (a la carta: categorías fijas fuera del Menú del Día) */}
          {catalog.cartaItems.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-white">
                Carta
                <span className="text-slate-400 text-xs font-semibold">
                  A LA CARTA
                </span>
              </h3>

              {/* Pestañas de categorías de la carta */}
              <div className="flex flex-wrap gap-2">
                {MenuCategoryList.map((category) => {
                  const enabled = catalog.cartaItems.some(
                    (i) => i.category === category,
                  );
                  const selected = category === cartaCategory;
                  return (
                    <button
                      key={category}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setCartaCategory(category)}
                      className={`h-12 px-4 rounded-xl border text-base font-bold transition-colors disabled:opacity-30 ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-slate-600 text-white hover:border-primary/60"
                      }`}
                    >
                      {MenuCategoryLabel[category]}
                    </button>
                  );
                })}
              </div>

              {/* Grilla de platos de la categoría seleccionada */}
              {cartaCategory !== null && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cartaItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.description ?? `Agregar ${item.name}`}
                      onClick={() => tapCartaItem(item)}
                      className="h-16 w-full rounded-xl border-2 border-slate-600 bg-slate-700 p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-transform active:scale-95 hover:border-primary hover:bg-slate-600"
                    >
                      {item.name}
                      <span className="mt-0.5 block text-xs font-semibold text-slate-300">
                        {item.options.length > 0
                          ? "Elegir variante"
                          : formatPrice(item.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selector de variante (Pollo/Res, Unidades de alitas): las Alitas Mixtas
                  exigen elegir tamaño y luego marcar las salsas correspondientes. */}
              {variantItem && (
                <div className="rounded-xl border border-primary/40 bg-slate-700 p-4 space-y-3">
                  <p className="text-base font-bold text-white">
                    {variantItem.name} — elige tamaño
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[...variantItem.options]
                      .sort(
                        (a, b) =>
                          Number(a.name.match(/^(\d+)/)?.[1] ?? 0) -
                          Number(b.name.match(/^(\d+)/)?.[1] ?? 0),
                      )
                      .map((option) => {
                        const active = variantSize?.id === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => tapVariantSize(option)}
                            className={`h-14 rounded-xl border-2 text-base font-bold text-white transition-transform active:scale-95 ${
                              active
                                ? "border-primary bg-primary"
                                : "border-slate-600 bg-slate-600 hover:border-primary hover:bg-slate-500"
                            }`}
                          >
                            {option.name} · {formatPrice(option.price)}
                          </button>
                        );
                      })}
                  </div>

                  {isMixtasItem(variantItem) && variantSize && (
                    <div className="rounded-lg bg-slate-900/60 p-3 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Salsas a elección
                      </p>
                      <p className="text-xs text-slate-300">
                        Marca{" "}
                        <span className="font-bold text-amber-300">
                          {requiredSauces(variantSize.name)}
                        </span>{" "}
                        salsas ({variantSauces.length}/
                        {requiredSauces(variantSize.name)})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ALITA_SAUCES.map((sauce) => {
                          const on = variantSauces.includes(sauce);
                          return (
                            <button
                              key={sauce}
                              type="button"
                              onClick={() => toggleVariantSauce(sauce)}
                              className={`h-9 rounded-full border px-3 text-xs font-semibold transition-transform active:scale-95 ${
                                on
                                  ? "border-amber-400 bg-amber-400/20 text-amber-100"
                                  : "border-slate-600 bg-slate-800 text-slate-300 hover:border-amber-400/60"
                              }`}
                            >
                              {sauce}
                            </button>
                          );
                        })}
                      </div>
                      {variantSauces.length ===
                        requiredSauces(variantSize.name) && (
                        <button
                          type="button"
                          onClick={confirmMixtas}
                          className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white transition-colors hover:bg-emerald-500"
                        >
                          Confirmar · {formatPrice(variantSize.price)}
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setVariantItem(null);
                      setVariantSize(null);
                      setVariantSauces([]);
                    }}
                    className="w-full text-center text-sm font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </section>
          )}
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
