"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlavorCategory,
  FlavorCategoryList,
  FlavorCategoryLabel,
  MenuCategoryLabel,
  cartItemUnitTotal,
  formatPrice,
  Role,
  type Catalog,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type Role as RoleType,
  type Size,
  type Topping,
} from "@bbspos/types";
import { createPosOrder } from "@/actions/pos";
import { usePosCart, type PosDeliveryType } from "./pos-cart-store";

const CATEGORIES = FlavorCategoryList;

function firstActiveCategory(catalog: Catalog): FlavorCategoryType {
  return (
    CATEGORIES.find((c) =>
      catalog.flavors.some((f) => f.categories.includes(c) && f.available),
    ) ?? FlavorCategory.MILK
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
    firstActiveCategory(catalog),
  );
  const [sizeId, setSizeId] = useState<string>("");
  const [bobaTypeId, setBobaTypeId] = useState<string>("");
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Al entrar (montar) se dejan los selectores en blanco para que el mesero
  // arranque un pedido nuevo sin arrastrar selecciones.
  useEffect(() => {
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
    setActiveCategory(firstActiveCategory(catalog));
  }, [catalog]);

  // Al entrar se limpia el carrito persistido de una sesión anterior para que
  // el mesero no herede ítems viejos guardados en localStorage.
  useEffect(() => {
    cart.clear();
    // La limpieza es solo al montar: se ignora el resto de dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Autoselección por defecto: Tamaño Grande y Tipo de boba Tapioca.
  const grandSize = sizes.find((s) => s.name === "Grande") ?? sizes[0];
  const tapiocaBoba =
    bobaTypes.find((b) => b.name === "Tapioca") ?? bobaTypes[0];

  // Orden de tipos de boba: Tapioca primero (izquierda) y Explosivas a la derecha.
  const sortedBobaTypes = [...bobaTypes].sort((a, b) => {
    const rank = (t: (typeof bobaTypes)[number]) =>
      t.name === "Tapioca" ? 0 : t.name === "Explosivas" ? 1 : 2;
    return rank(a) - rank(b);
  });

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

  // Tocar un sabor marca el producto en construcción. Si ya había otro sabor,
  // se reinicia la selección para recomenzar el cálculo desde cero.
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
      const deliveryType = isBilling
        ? cart.deliveryType === ""
          ? null
          : cart.deliveryType
        : "MESA";
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
      setBobaTypeId("");
      setSelectedFlavorId(null);
      setActiveCategory(firstActiveCategory(catalog));
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

  // Limpia el pedido actual (carrito y producto en construcción) por si el
  // cliente se arrepiente.
  function handleClear() {
    cart.clear();
    setToppingIds([]);
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
  }

  const selectedSize: Size | undefined = size;
  const cartTotal = cart.items.reduce(
    (acc, item) => acc + cartItemUnitTotal(item) * item.quantity,
    0,
  );
  // Brillo sutil en el cuadro de nombre cuando ya hay un ticket generado
  // pero aún no se ha ingresado el nombre o la mesa.
  const needsName = cart.items.length > 0 && cart.customerName.trim() === "";

  return (
    <div className="flex w-full h-[calc(100vh-8rem)] bg-slate-950 overflow-hidden">
      {/* ===== Izquierda (~35%): Ticket en curso y cobro (fijo) ===== */}
      <div className="w-[34%] min-w-[320px] flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
        {/* Encabezado del ticket */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <h2 className="text-base font-black uppercase tracking-wide text-white">
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
            className="h-8 shrink-0 rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-300 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>

        {busy && (
          <p className="shrink-0 mx-4 mt-3 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-300">
            Enviando… por favor espera.
          </p>
        )}
        {notice && (
          <p className="shrink-0 mx-4 mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {notice}
          </p>
        )}
        {error && (
          <p className="shrink-0 mx-4 mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            ⚠ {error}
          </p>
        )}

        {/* Cuerpo del ticket: ítems scrolleables */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.items.length === 0 && (
            <p className="text-sm text-slate-500">
              Agrega bebidas tocando un sabor o un plato del día en el
              catálogo.
            </p>
          )}
          {cart.items.map((item) => {
            const unitWithExtras = cartItemUnitTotal(item);
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-md bg-slate-800 px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-bold text-white">
                    {item.quantity}×{" "}
                    {item.kind === "DRINK" ? item.flavor.name : item.name}
                  </p>
                  <p className="text-slate-400">
                    {item.kind === "DRINK"
                      ? `${item.size.name} · ${item.bobaType.name}`
                      : MenuCategoryLabel[item.category]}
                  </p>
                  {item.kind === "DRINK" && item.toppings.length > 0 && (
                    <p className="text-slate-400">
                      + {item.toppings.map((t) => t.name).join(", ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-md bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-95 transition-transform"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span className="text-base font-bold w-6 text-center text-slate-200">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-md bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-95 transition-transform"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="h-8 px-3 rounded-md bg-red-600 text-white text-xs font-bold active:scale-95 transition-transform"
                      onClick={() => cart.removeItem(item.id)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-white whitespace-nowrap">
                  {formatPrice(unitWithExtras * item.quantity)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Área de pago fija al fondo del panel izquierdo */}
        <div className="shrink-0 px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
          <input
            type="text"
            value={cart.customerName}
            onChange={(e) => cart.setCustomerName(e.target.value)}
            placeholder="Nombre o Mesa"
            className={`h-10 w-full rounded-md border bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-shadow ${
              needsName
                ? "border-amber-400/70 animate-name-glow"
                : "border-slate-700 focus:border-primary"
            }`}
          />

          <div className="grid grid-cols-2 gap-2">
            {(["MESA", "LLEVAR"] as PosDeliveryType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => cart.setDeliveryType(type)}
                className={`h-10 rounded-md border text-sm font-bold transition-colors ${
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
            <span className="text-sm font-bold uppercase tracking-wide text-white">
              Total
            </span>
            <span className="font-mono text-xl font-black text-white">
              {formatPrice(cartTotal)}
            </span>
          </div>

          <button
            type="button"
            disabled={busy || cart.items.length === 0}
            onClick={submit}
            className={`w-full h-12 text-base font-black text-white rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isBilling ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700"
            }`}
          >
            {busy ? (
              "Enviando…"
            ) : isBilling ? (
              <>
                <span className="text-base font-black">Enviar y Cobrar</span>
                <span className="font-mono text-lg font-black">
                  {formatPrice(cartTotal)}
                </span>
              </>
            ) : (
              "Enviar a Caja"
            )}
          </button>
        </div>
      </div>

      {/* ===== Derecha (~66%): Catálogo de menú ===== */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Sección destacada del Menú del Día (platos) */}
          {catalog.menuItems.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
                Almuerzos
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-500">
                  DEL DÍA
                </span>
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
                      })
                    }
                    className="relative h-14 w-full rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-colors active:scale-95 hover:border-amber-400 hover:bg-amber-500/20"
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
                  className={`h-9 px-3 rounded-lg border text-sm font-bold transition-colors disabled:opacity-30 ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-slate-800 text-white hover:border-primary/60"
                  }`}
                >
                  {FlavorCategoryLabel[category]}
                </button>
              );
            })}
          </div>

          {/* Grilla de sabores */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {flavors.map((flavor) => {
              const selected = selectedFlavorId === flavor.id;
              return (
                <button
                  key={flavor.id}
                  type="button"
                  onClick={() => selectFlavor(flavor)}
                  className={`h-14 w-full rounded-lg border p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-colors active:scale-95 ${
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
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Tamaño
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSizeId(s.id)}
                  className={`h-14 w-full rounded-lg border p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-colors active:scale-95 ${
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

          {/* Tipo de boba (debajo de tamaño) */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Tipo de boba
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {sortedBobaTypes.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBobaTypeId(b.id)}
                  className={`h-14 w-full rounded-lg border p-2 text-sm font-bold leading-tight whitespace-normal break-words transition-colors active:scale-95 ${
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
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
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
                      className={`h-9 rounded-lg border px-3 text-sm font-bold transition-colors ${
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
          {selectedFlavor ? (
            <section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                Producto en curso
              </h3>
              <div className="mt-2 space-y-1 text-sm text-white">
                <p className="font-bold">{selectedFlavor.name}</p>
                <p className="text-slate-400">
                  {size?.name
                    ? `${size.name} · ${bobaType?.name ?? ""}`
                    : "Elige un tamaño"}
                </p>
                {selectedToppings.length > 0 && (
                  <p className="text-slate-400">
                    + {selectedToppings.map((t) => t.name).join(", ")}
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Subtotal
                </span>
                <span className="font-mono text-xl font-black text-white">
                  {selectedSize && bobaType ? formatPrice(preticketSubtotal()) : "—"}
                </span>
              </div>
              <button
                type="button"
                disabled={!selectedSize || !selectedFlavor || !bobaType}
                onClick={confirmProduct}
                className="mt-3 h-11 w-full rounded-lg bg-emerald-600 text-base font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar producto
              </button>
            </section>
          ) : (
            <p className="text-sm text-slate-500">
              Toca un sabor para empezar tu pedido.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
