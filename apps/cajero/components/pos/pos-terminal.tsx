"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlavorCategory,
  FlavorCategoryList,
  FlavorCategoryLabel,
  MenuCategory,
  MenuCategoryLabel,
  MenuCategoryList,
  cartItemUnitTotal,
  formatPrice,
  Role,
  type Catalog,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type MenuCategory as MenuCategoryType,
  type MenuItemView,
  type Role as RoleType,
  type Size,
  type Topping,
} from "@bbspos/types";
import { createPosOrder } from "@/actions/pos";
import { usePosCart, type PosDeliveryType } from "./pos-cart-store";

const CATEGORIES = FlavorCategoryList;

/** Identificador del panel de Bubble Drinks (pseudo-categoría del POS). */
const BUBAS_PANE = "BUBAS";
type CatalogPane = MenuCategoryType | typeof BUBAS_PANE;

function firstActiveCategory(catalog: Catalog): FlavorCategoryType {
  return (
    CATEGORIES.find((c) =>
      catalog.flavors.some((f) => f.categories.includes(c) && f.available),
    ) ?? FlavorCategory.MILK
  );
}

/** Categoría que debe quedar seleccionada al abrir el POS o iniciar una nueva
 *  venta: Milanesas por defecto; si no hay, la primera categoría de la carta que
 *  tenga productos; si tampoco hay carta, el Menú del Día y por último Bubas. */
function defaultPane(catalog: Catalog): CatalogPane {
  if (
    catalog.cartaItems.some((i) => i.category === MenuCategory.MILANESA)
  ) {
    return MenuCategory.MILANESA;
  }
  const first = MenuCategoryList.find((c) =>
    catalog.cartaItems.some((i) => i.category === c),
  );
  if (first) return first;
  if (catalog.menuItems.length > 0) return MenuCategory.ALMUERZO;
  return BUBAS_PANE;
}

function deliveryLabel(type: PosDeliveryType) {
  return type === "MESA" ? "Para mesa" : "Para llevar";
}

// ===== Estilos compartidos de botones y contenedores =====
const TOP_LABEL =
  "text-sm font-bold uppercase tracking-widest text-slate-400";
const CHIP_BASE =
  "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold capitalize tracking-wide transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30";
const CHIP = {
  selected:
    "border border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30",
  idle: "border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-primary/60 hover:bg-slate-800 hover:text-white",
  amber:
    "border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:border-amber-400 hover:bg-amber-500/20 hover:shadow-md hover:shadow-amber-500/10",
};
const PRODUCT_BASE =
  "relative flex w-full items-center justify-center rounded-xl border px-2 py-2 text-sm font-semibold capitalize leading-tight tracking-wide whitespace-normal break-words transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30";
const PRODUCT = {
  selected: "border-primary bg-primary/15 text-white shadow-md shadow-primary/20",
  idle: "border-slate-700 bg-slate-900/50 text-slate-100 hover:border-primary/60 hover:bg-slate-800",
};
const PAY_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-xl border text-sm font-bold capitalize tracking-wide transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

export function PosTerminal({
  catalog,
  role,
}: {
  catalog: Catalog;
  role: RoleType;
}) {
  const router = useRouter();
  const cart = usePosCart();
  const isBilling =
    role === Role.CAJERO || role === Role.ADMIN || role === Role.SUPER_ADMIN;
  const [activePane, setActivePane] = useState<CatalogPane>(() =>
    defaultPane(catalog),
  );
  const [bubaCategory, setBubaCategory] = useState<FlavorCategoryType>(
    firstActiveCategory(catalog),
  );
  const [sizeId, setSizeId] = useState<string>("");
  const [bobaTypeId, setBobaTypeId] = useState<string>("");
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variantItem, setVariantItem] = useState<MenuItemView | null>(null);
  const [isAfter16, setIsAfter16] = useState(false);

  // Al entrar (montar) se dejan los selectores en blanco para que el mesero
  // arranque un pedido nuevo sin arrastrar selecciones.
  useEffect(() => {
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
    setVariantItem(null);
    setBubaCategory(firstActiveCategory(catalog));
    setActivePane(defaultPane(catalog));
  }, [catalog]);

  // Regla horaria del Menú del Día: desde las 16:00 la disponibilidad de los
  // almuerzos del día termina y la sección se oculta del catálogo visible.
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const past16 = now.getHours() >= 16;
      setIsAfter16(past16);
      if (past16) {
        setActivePane((pane) =>
          pane === MenuCategory.ALMUERZO ? defaultPane(catalog) : pane,
        );
      }
    };
    checkTime();
    const id = setInterval(checkTime, 30_000);
    return () => clearInterval(id);
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
        (f) => f.categories.includes(bubaCategory) && f.available,
      ),
    [catalog.flavors, bubaCategory],
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
          p.category === bubaCategory &&
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

  function switchBubaCategory(category: FlavorCategoryType) {
    setBubaCategory(category);
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
  }

  function switchPane(pane: CatalogPane) {
    setActivePane(pane);
    setVariantItem(null);
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
      category: bubaCategory,
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
      setBubaCategory(firstActiveCategory(catalog));
      setActivePane(defaultPane(catalog));
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
    setVariantItem(null);
  }

  const isMenuDelDia = activePane === MenuCategory.ALMUERZO;
  const isBubas = activePane === BUBAS_PANE;
  const isCartaPane = !isMenuDelDia && !isBubas;
  const cartaItems = isCartaPane
    ? catalog.cartaItems.filter((i) => i.category === activePane)
    : [];

  // Botones del bloque superior: las categorías de la carta con productos y
  // Bubble Drinks como categoría fija. El Menú del Día queda fijo en la parte
  // superior del catálogo (fuera de esta barra) para acceso rápido; se oculta
  // tras las 16:00.
  const catalogPanes = useMemo(() => {
    const panes: { key: CatalogPane; label: string }[] = [];
    for (const c of MenuCategoryList) {
      if (catalog.cartaItems.some((i) => i.category === c)) {
        panes.push({ key: c, label: MenuCategoryLabel[c] });
      }
    }
    panes.push({ key: BUBAS_PANE, label: "Bubble Drinks" });
    return panes;
  }, [catalog]);

  // Tocar un plato de la carta: si tiene variantes (Pollo/Res) se abre el
  // selector con sus precios; si no, se agrega directo con su precio fijo.
  function tapCartaItem(item: MenuItemView) {
    if (item.options.length > 0) {
      setVariantItem(item);
      return;
    }
    setVariantItem(null);
    cart.addMenuItem({
      menuItemId: item.id,
      name: item.name,
      category: item.category,
      unitPrice: item.price,
      optionName: null,
    });
  }

  function confirmVariant(option: MenuItemView["options"][number]) {
    if (!variantItem) return;
    cart.addMenuItem({
      menuItemId: variantItem.id,
      name: variantItem.name,
      category: variantItem.category,
      unitPrice: option.price,
      optionName: option.name,
    });
    setVariantItem(null);
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
            className="h-8 shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-3 text-xs font-semibold uppercase tracking-wide text-slate-300 transition-all hover:border-red-500/60 hover:bg-red-500/15 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                  <p className="font-semibold capitalize text-white">
                    {item.quantity}×{" "}
                    {item.kind === "DRINK" ? item.flavor.name : item.name}
                  </p>
                  <p className="text-slate-400">
                    {item.kind === "DRINK" ? (
                      `${item.size.name} · ${item.bobaType.name}`
                    ) : (
                      <>
                        {MenuCategoryLabel[item.category]}
                        {item.optionName && (
                          <span className="ml-1 font-semibold text-white">
                            · {item.optionName}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  {item.kind === "DRINK" && item.toppings.length > 0 && (
                    <p className="text-slate-400">
                      + {item.toppings.map((t) => t.name).join(", ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-600"
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
                      className="h-8 w-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-600"
                      onClick={() =>
                        cart.updateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="h-8 px-3 rounded-lg bg-red-600/90 text-white text-xs font-bold uppercase tracking-wide transition-all active:scale-95 hover:bg-red-500"
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
            className={`h-10 w-full rounded-xl border bg-slate-800 px-3 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none transition-shadow ${
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
                className={`${PAY_BUTTON} ${
                  cart.deliveryType === type
                    ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
                    : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-primary/60 hover:bg-slate-800"
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
            className={`w-full h-12 text-base font-bold capitalize text-white rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${
              isBilling
                ? "bg-gradient-to-b from-blue-500 to-blue-600 shadow-blue-950/40 hover:from-blue-400 hover:to-blue-600"
                : "bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700"
            }`}
          >
            {busy ? (
              "Enviando…"
            ) : isBilling ? (
              <>
                <span className="text-base font-bold">Enviar y cobrar</span>
                <span className="font-mono text-lg font-bold">
                  {formatPrice(cartTotal)}
                </span>
              </>
            ) : (
              "Enviar a caja"
            )}
          </button>
        </div>
      </div>

      {/* ===== Derecha (~66%): Catálogo ===== */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {/* Bloque superior: almuerzos del día (acceso rápido) + categorías */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex flex-col gap-2">
          {!isAfter16 && catalog.menuItems.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
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
                    className={`${CHIP_BASE} ${CHIP.amber} whitespace-normal break-words leading-tight`}
                  >
                    {menuItem.name}
                    <span className="ml-1 text-xs font-semibold text-amber-300">
                      {formatPrice(menuItem.price)}
                    </span>
                  </button>
                ))}
              </div>
              {/* Línea separadora entre almuerzos y categorías */}
              <div className="h-px bg-slate-800" />
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {catalogPanes.map((pane) => {
              const selected = pane.key === activePane;
              return (
                <button
                  key={pane.key}
                  type="button"
                  onClick={() => switchPane(pane.key)}
                  className={`${CHIP_BASE} ${
                    selected ? CHIP.selected : CHIP.idle
                  }`}
                >
                  {pane.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bloque inferior: productos de la categoría seleccionada */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            {isBubas && (
              <>
                {/* Subcategorías de Bubble Drinks (Especiales / Con agua / Con leche) */}
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => {
                    const enabled = catalog.flavors.some(
                      (f) => f.categories.includes(category) && f.available,
                    );
                    const selected = category === bubaCategory;
                    return (
                      <button
                        key={category}
                        type="button"
                        disabled={!enabled}
                        onClick={() => switchBubaCategory(category)}
                        className={`${CHIP_BASE} ${
                          selected ? CHIP.selected : CHIP.idle
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
                        className={`${PRODUCT_BASE} h-14 ${
                          selected ? PRODUCT.selected : PRODUCT.idle
                        }`}
                      >
                        {flavor.name}
                      </button>
                    );
                  })}
                </div>

                {/* Tamaño */}
                <section className="space-y-2">
                  <h3 className={TOP_LABEL}>Tamaño</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSizeId(s.id)}
                        className={`${PRODUCT_BASE} h-14 ${
                          s.id === sizeId ? PRODUCT.selected : PRODUCT.idle
                        }`}
                      >
                        {s.name} · {s.oz} oz
                      </button>
                    ))}
                  </div>
                </section>

                {/* Tipo de boba (debajo de tamaño) */}
                <section className="space-y-2">
                  <h3 className={TOP_LABEL}>Tipo de boba</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {sortedBobaTypes.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBobaTypeId(b.id)}
                        className={`${PRODUCT_BASE} h-14 ${
                          b.id === bobaTypeId ? PRODUCT.selected : PRODUCT.idle
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </section>

                {toppings.length > 0 && (
                  <section className="space-y-2">
                    <h3 className={TOP_LABEL}>Extras</h3>
                    <div className="flex flex-wrap gap-2">
                      {toppings.map((t) => {
                        const selected = toppingIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTopping(t.id)}
                            className={`${CHIP_BASE} ${
                              selected ? CHIP.selected : CHIP.idle
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
                  <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                      Producto en curso
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-white">
                      <p className="font-semibold capitalize">
                        {selectedFlavor.name}
                      </p>
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
                      <span className="font-mono text-xl font-bold text-white">
                        {selectedSize && bobaType ? formatPrice(preticketSubtotal()) : "—"}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!selectedSize || !selectedFlavor || !bobaType}
                      onClick={confirmProduct}
                      className="mt-3 h-11 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.99] hover:from-emerald-400 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Confirmar producto
                    </button>
                  </section>
                ) : (
                  <p className="text-sm text-slate-500">
                    Toca un sabor para empezar tu pedido.
                  </p>
                )}
              </>
            )}

            {isCartaPane && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
                  {MenuCategoryLabel[activePane as MenuCategoryType]}
                </h3>

                {/* Grilla de platos de la categoría seleccionada */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {cartaItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.description ?? `Agregar ${item.name}`}
                      onClick={() => tapCartaItem(item)}
                      className={`${PRODUCT_BASE} h-16 flex-col ${PRODUCT.idle} hover:shadow-md hover:shadow-black/30`}
                    >
                      <span className="line-clamp-2 text-center">{item.name}</span>
                      <span className="mt-1 text-center text-xs font-semibold text-slate-300">
                        {item.options.length > 0
                          ? "Elegir variante"
                          : formatPrice(item.price)}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selector de variante (Pollo/Res): se abre al tocar un plato con opciones */}
                {variantItem && (
                  <div className="rounded-xl border border-primary/40 bg-slate-900/80 p-4 space-y-2 shadow-lg shadow-black/20">
                    <p className="text-sm font-bold text-white capitalize">
                      {variantItem.name} — elige variante
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {variantItem.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => confirmVariant(option)}
                          className="h-12 rounded-xl border border-slate-600 bg-slate-800 text-sm font-semibold text-white transition-all active:scale-95 hover:border-primary hover:bg-slate-700"
                        >
                          <span className="block capitalize">{option.name}</span>
                          <span className="block text-xs font-semibold text-slate-300">
                            {formatPrice(option.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setVariantItem(null)}
                      className="w-full rounded-lg pt-1 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide transition-colors hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
