"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlavorCategory,
  FlavorCategoryList,
  FlavorCategoryLabel,
  formatPrice,
  Role,
  type Catalog,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type Role as RoleType,
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

export function PosTerminal({
  catalog,
  role,
}: {
  catalog: Catalog;
  role: RoleType;
}) {
  const router = useRouter();
  const cart = usePosCart();
  const isBilling = role === Role.CAJERO || role === Role.ADMIN;
  const [activeCategory, setActiveCategory] = useState<FlavorCategoryType>(
    CATEGORIES.find((c) =>
      catalog.flavors.some(
        (f) => f.categories.includes(c) && f.available,
      ),
    ) ?? FlavorCategory.MILK,
  );
  const [sizeId, setSizeId] = useState<string>("");
  const [bobaTypeId, setBobaTypeId] = useState<string>(
    catalog.bobaTypes[0]?.id ?? "",
  );
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sizes = catalog.sizes.filter((s) => s.available);
  const bobaTypes = catalog.bobaTypes.filter((b) => b.available);
  const toppings = catalog.toppings.filter((t) => t.available);
  const size = sizes.find((s) => s.id === sizeId);
  const bobaType = bobaTypes.find((b) => b.id === bobaTypeId);

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

  const selectedFlavor =
    flavors.find((f) => f.id === selectedFlavorId) ?? null;

  function switchCategory(category: FlavorCategoryType) {
    setActiveCategory(category);
    setSizeId("");
    setBobaTypeId(catalog.bobaTypes[0]?.id ?? "");
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

  // Tocar un sabor marca el producto en construcción. Si ya había otro sabor,
  // se reinicia la selección para recomenzar el cálculo desde cero.
  function selectFlavor(flavor: Flavor) {
    setSelectedFlavorId((current) => {
      if (current !== flavor.id) {
        setToppingIds([]);
        setSizeId("");
      }
      return flavor.id;
    });
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
    // Restablece el selector para empezar a armar otro producto.
    setSelectedFlavorId(null);
    setSizeId("");
    setToppingIds([]);
  }

  async function submit() {
    if (cart.items.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const trimmedName = cart.customerName.trim();
      // El mesero solo toma pedidos en mesa: se fuerza MESA.
      const deliveryType = isBilling ? cart.deliveryType : "MESA";
      const result = await createPosOrder(
        cart.items,
        trimmedName === "" ? undefined : trimmedName,
        deliveryType,
      );
      cart.clear();
      // Devuelve los selectores a su estado por defecto para no arrastrar
      // las opciones del pedido anterior.
      setToppingIds([]);
      setSizeId("");
      setBobaTypeId(catalog.bobaTypes[0]?.id ?? "");
      setSelectedFlavorId(null);
      setActiveCategory(
        CATEGORIES.find((c) =>
          catalog.flavors.some(
            (f) => f.categories.includes(c) && f.available,
          ),
        ) ?? FlavorCategory.MILK,
      );
      setNotice(
        `Pedido #${result.seq} creado · Total ${formatPrice(result.total)}`,
      );
      // El mesero se queda en Nueva Venta para seguir tomando órdenes;
      // el cajero/admin va a la cola para registrar pagos/entregas.
      router.push(isBilling ? "/?tab=preparar" : "/?tab=venta");
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
    <div className="flex flex-col lg:flex-row w-full min-h-screen lg:h-[calc(100vh-5rem)] bg-slate-950 overflow-hidden">
      {/* ===== Izquierda: Catálogo de menú ===== */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Contenedor interno que centra el menú y limita su expansión en pantallas anchas */}
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
                    ? "border-secondary bg-secondary text-secondary-foreground"
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
                    : "border-border bg-card text-white hover:border-primary hover:bg-primary/10"
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
                    : "border-border bg-card hover:border-primary/60"
                }`}
              >
                {s.name} · {s.oz} oz
              </button>
            ))}
          </div>
        </section>

        {/* Tipo de boba (debajo de tamaño) */}
        <section className="space-y-2">
          <h3 className="text-base font-bold uppercase tracking-wide text-white">
            Tipo de boba
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {bobaTypes.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBobaTypeId(b.id)}
                className={`h-16 w-full rounded-xl border p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-transform active:scale-95 ${
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

        {/* Preticket: producto en construcción */}
        {selectedFlavor ? (
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <h3 className="text-base font-bold uppercase tracking-wide text-white">
              Producto en curso
            </h3>
            <div className="mt-2 space-y-1 text-base text-white">
              <p className="font-bold">{selectedFlavor.name}</p>
              <p className="font-normal">
                {size?.name ? `${size.name} · ${bobaType?.name ?? ""}` : "Elige un tamaño"}
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
                {selectedSize && bobaType ? formatPrice(priceOf()) : "—"}
              </span>
            </div>
            <button
              type="button"
              disabled={!selectedSize || !selectedFlavor}
              onClick={confirmProduct}
              className="mt-3 h-16 w-full rounded-xl bg-emerald-600 text-2xl font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirmar producto
            </button>
          </section>
        ) : (
          <p className="text-base text-white">
            Toca un sabor para empezar tu pedido.
          </p>
        )}
        </div>
      </div>

      {/* ===== Derecha: Ticket en curso y cobro (barra lateral sólida) ===== */}
      <div className="w-full lg:w-[420px] flex-shrink-0 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-full z-10 shadow-2xl">
        <div className="shrink-0 p-5 pb-0 space-y-2">
          <h2 className="text-lg font-black uppercase tracking-wide text-white">
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
        </div>

        {/* Cuerpo del ticket: ítems scrolleables */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
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

        {/* Área de pago fija al fondo de la barra lateral */}
        <div className="shrink-0 p-5 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
          <input
            type="text"
            value={cart.customerName}
            onChange={(e) => cart.setCustomerName(e.target.value)}
            placeholder="Nombre del cliente (opcional)"
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-base text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
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

          <div className="flex items-center justify-between">
            <span className="text-base font-bold uppercase tracking-wide text-white">
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
            className={`w-full h-16 text-xl font-black text-white rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isBilling ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700"
            }`}
          >
            {busy ? (
              "Enviando…"
            ) : isBilling ? (
              <>
                <span className="text-xl font-black">Enviar y Cobrar</span>
                <span className="font-mono text-2xl font-black">
                  {formatPrice(totalOfItems(cart.items))}
                </span>
              </>
            ) : (
              "Enviar a Caja"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}