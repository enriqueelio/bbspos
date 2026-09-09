"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { QueueView } from "@/components/queue-view";
import type { Order } from "@bbspos/types";
import type { PensionCustomerOption } from "@/components/pension-payment-dialog";

const CATEGORIES = FlavorCategoryList;

/** Identificador del panel de Bubble Drinks (pseudo-categoría del POS). */
const BUBAS_PANE = "BUBAS";
// Sandwiches y Paninis se fusionan en un solo botón de la barra.
const SANDWICHES_PANE = "SANDWICHES";
type CatalogPane =
  | MenuCategoryType
  | typeof BUBAS_PANE
  | typeof SANDWICHES_PANE;

/** Orden de lectura de la carta en la barra de categorías: Milanesas primero
 *  (categoría seleccionada por defecto), luego platos principales, entradas,
 *  kids, postres y bebidas. Bubble Drinks siempre va al final. */
const MENU_PANE_ORDER: MenuCategoryType[] = [
  MenuCategory.MILANESA,
  MenuCategory.SANDWICH,
  MenuCategory.HAMBURGUESA,
  MenuCategory.LOMO,
  MenuCategory.POLLO,
  MenuCategory.ALITA,
  MenuCategory.ENSALADA,
  MenuCategory.PIQUEO,
  MenuCategory.COMPARTIR,
  MenuCategory.KIDS,
  MenuCategory.POSTRE,
  MenuCategory.WAFFLE,
  MenuCategory.PANCAKE,
  MenuCategory.EXTRAS,
  MenuCategory.BEBIDA,
];

/** Nombres cortos de categoría en la barra (ahorran espacio; los nombres
 *  completos se conservan en tickets, comandas y reportes vía MenuCategoryLabel). */
const PANE_LABEL_SHORT: Partial<Record<CatalogPane, string>> = {
  [MenuCategory.SANDWICH]: "Sandwiches",
  [MenuCategory.HAMBURGUESA]: "Burgers",
  [MenuCategory.WAFFLE]: "Wafles",
  [MenuCategory.KIDS]: "Kids",
  [MenuCategory.POSTRE]: "Heladería",
  [MenuCategory.COMPARTIR]: "Compartir",
};

/** Títulos propios de los panes fusionados (no son categorías de la carta). */
const PANE_TITLE: Partial<Record<CatalogPane, string>> = {
  [SANDWICHES_PANE]: "Sandwiches",
};

// ===== Alitas: sabores simples y salsas de las alitas mixtas =====
// Las alitas simples vienen bañadas en su salsa (Miel y Mostaza, Barbacoa, …);
// las Alitas Mixtas obligan a elegir 2 salsas (6/8 unidades) o 3 (12 unidades).
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
  return type === "MESA" ? "PARA MESA" : "PARA LLEVAR";
}

// ===== Estilos compartidos de botones y contenedores =====
const TOP_LABEL =
  "text-sm font-bold uppercase tracking-widest text-slate-400";
const CHIP_BASE =
  "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-bold capitalize tracking-wide transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30";
const CHIP = {
  selected:
    "border border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30",
  idle: "border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-primary/60 hover:bg-slate-800 hover:text-white",
  amber:
    "border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:border-amber-400 hover:bg-amber-500/20 hover:shadow-md hover:shadow-amber-500/10",
};

/** Acento de color por categoría principal (identificación visual de un vistazo).
 *  Las categorías sin acento usan el CHIP neutral (azul). */
const PANE_ACCENT: Partial<
  Record<CatalogPane, { idle: string; selected: string }>
> = {
  [MenuCategory.MILANESA]: {
    idle: "border-amber-500/50 bg-amber-500/10 text-amber-100 hover:border-amber-400 hover:bg-amber-500/20",
    selected:
      "border-amber-400 bg-amber-400/20 text-white shadow-md shadow-amber-400/25",
  },
  [MenuCategory.ALITA]: {
    idle: "border-red-500/50 bg-red-500/10 text-red-100 hover:border-red-400 hover:bg-red-500/20",
    selected:
      "border-red-400 bg-red-400/20 text-white shadow-md shadow-red-400/25",
  },
  [MenuCategory.BEBIDA]: {
    idle: "border-sky-500/50 bg-sky-500/10 text-sky-100 hover:border-sky-400 hover:bg-sky-500/20",
    selected:
      "border-sky-400 bg-sky-400/20 text-white shadow-md shadow-sky-400/25",
  },
  [MenuCategory.HAMBURGUESA]: {
    idle: "border-orange-500/50 bg-orange-500/10 text-orange-100 hover:border-orange-400 hover:bg-orange-500/20",
    selected:
      "border-orange-400 bg-orange-400/20 text-white shadow-md shadow-orange-400/25",
  },
  [MenuCategory.POSTRE]: {
    idle: "border-pink-500/50 bg-pink-500/10 text-pink-100 hover:border-pink-400 hover:bg-pink-500/20",
    selected:
      "border-pink-400 bg-pink-400/20 text-white shadow-md shadow-pink-400/25",
  },
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
  queueOrders,
  customers,
}: {
  catalog: Catalog;
  role: RoleType;
  queueOrders: Order[];
  customers: PensionCustomerOption[];
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
  const [variantSize, setVariantSize] = useState<
    MenuItemView["options"][number] | null
  >(null);
  const [variantSauces, setVariantSauces] = useState<string[]>([]);
  const [isAfter16, setIsAfter16] = useState(false);

  // Al entrar (montar) se dejan los selectores en blanco para que el mesero
  // arranque un pedido nuevo sin arrastrar selecciones.
  useEffect(() => {
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
    setVariantItem(null);
    setVariantSize(null);
    setVariantSauces([]);
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
    setVariantSize(null);
    setVariantSauces([]);
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
    const trimmedName = cart.customerName.trim().toUpperCase();
    if (trimmedName === "") {
      setError("Falta el nombre o la mesa del cliente. Es un dato obligatorio.");
      return;
    }
    if (isBilling && cart.deliveryType === "") {
      setError("Falta elegir Para mesa o Para llevar. Es un dato obligatorio.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // El mesero solo toma pedidos en mesa: se fuerza MESA.
      const deliveryType = isBilling
        ? cart.deliveryType === ""
          ? null
          : cart.deliveryType
        : "MESA";
      const result = await createPosOrder(
        cart.items,
        trimmedName,
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
      // El pedido se registra y el cajero/mesero se mantiene en Nueva Venta.
      router.push("/?tab=venta");
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
    setVariantSize(null);
    setVariantSauces([]);
  }

  const isMenuDelDia = activePane === MenuCategory.ALMUERZO;
  const isBubas = activePane === BUBAS_PANE;
  const isCartaPane = !isMenuDelDia && !isBubas;
  // Productos ordenados por precio de mayor a menor (en toda la carta).
  const cartaItems = isCartaPane
    ? catalog.cartaItems
        .filter((i) =>
          activePane === SANDWICHES_PANE
            ? i.category === MenuCategory.SANDWICH ||
              i.category === MenuCategory.PANINI
            : i.category === activePane,
        )
        .sort((a, b) => b.price - a.price)
    : [];
  // Menú del Día también por precio de mayor a menor.
  const menuDayItems = [...catalog.menuItems].sort(
    (a, b) => b.price - a.price,
  );
  // Menú del Día con retícula fija de 5 columnas, misma que la barra de
  // categorías, para que ambas grillas queden alineadas.
  const menuDayGridClass = "grid grid-cols-5 gap-2";

  // Botones del bloque superior: las categorías de la carta con productos y
  // Bubble Drinks como categoría fija. El Menú del Día queda fijo en la parte
  // superior del catálogo (fuera de esta barra) para acceso rápido; se oculta
  // tras las 16:00.
  const catalogPanes = useMemo(() => {
    const panes: { key: CatalogPane; label: string }[] = [];
    for (const c of MENU_PANE_ORDER) {
      if (c === MenuCategory.SANDWICH) {
        const merged = catalog.cartaItems.some(
          (i) =>
            i.category === MenuCategory.SANDWICH ||
            i.category === MenuCategory.PANINI,
        );
        if (merged) {
          panes.push({ key: SANDWICHES_PANE, label: PANE_TITLE[SANDWICHES_PANE]! });
        }
        continue;
      }
      if (catalog.cartaItems.some((i) => i.category === c)) {
        panes.push({ key: c, label: PANE_LABEL_SHORT[c] ?? MenuCategoryLabel[c] });
      }
    }
    panes.push({ key: BUBAS_PANE, label: "Bubbas" });
    return panes;
  }, [catalog]);

  // Tocar un plato de la carta: si tiene variantes (Pollo/Res, Unidades de
  // alitas) se abre el selector; si no, se agrega directo con su precio fijo.
  function tapCartaItem(item: MenuItemView) {
    if (item.options.length > 0) {
      setVariantItem(item);
      setVariantSize(null);
      setVariantSauces([]);
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

  // Variantes de alitas: tocar un tamaño en las simples agrega directo; en las
  // Mixtas deja el tamaño marcado y continúa en la pantalla para elegir salsas.
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
  const cartTotal = cart.items.reduce(
    (acc, item) => acc + cartItemUnitTotal(item) * item.quantity,
    0,
  );
  // Brillo sutil en el cuadro de nombre cuando ya hay un ticket generado
  // pero aún no se ha ingresado el nombre o la mesa.
  const needsName = cart.items.length > 0 && cart.customerName.trim() === "";
  // El cajero/admin también debe elegir entre mesa o para llevar.
  const needsDelivery =
    isBilling && cart.items.length > 0 && cart.deliveryType === "";
  // El ticket está listo para enviarse: hay productos y ningún dato faltante.
  const formOk =
    cart.items.length > 0 && !needsName && !needsDelivery;

  // ===== Atajos de teclado (flujo rápido tipo Square) =====
  // Teclas 1-9 seleccionan la categoría de la barra por índice; Enter dispara el
  // cobro cuando el ticket tiene productos. Se ignoran si el foco está en un
  // campo de texto (buscar producto / nombre de cliente) para no chocar con la
  // escritura. Las refs evitan re-enganchar el listener en cada render.
  const panesRef = useRef(catalogPanes);
  panesRef.current = catalogPanes;
  const switchPaneRef = useRef(switchPane);
  switchPaneRef.current = switchPane;
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const hasItemsRef = useRef(false);
  hasItemsRef.current = cart.items.length > 0;
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      if (e.key >= "1" && e.key <= "9") {
        const pane = panesRef.current[Number(e.key) - 1];
        if (pane) {
          e.preventDefault();
          switchPaneRef.current(pane.key);
        }
        return;
      }

      if (e.key === "Enter" && hasItemsRef.current && !busyRef.current) {
        e.preventDefault();
        void submitRef.current();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // El listener se registra una sola vez; las funciones se leen de refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full w-full bg-slate-950 overflow-hidden">
      {/* ===== Columna 1 (20%): Pedidos en Cola con scroll propio ===== */}
      <aside className="flex w-1/5 min-w-[300px] shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900">
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <QueueView
            orders={queueOrders}
            role={role}
            customers={customers}
            compact
          />
        </div>
      </aside>

      {/* ===== Columna 2 (20%): Ticket en curso y cobro (fijo) ===== */}
      <section className="flex w-1/5 min-w-[280px] shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900">
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
            className="h-8 shrink-0 rounded-full border border-red-500/50 bg-red-500/10 px-3 text-xs font-semibold uppercase tracking-wide text-red-300 transition-all hover:border-red-500 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
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
                  {item.kind === "MENU_ITEM" && item.detail && (
                    <p className="text-xs font-semibold text-emerald-300">
                      {item.detail}
                    </p>
                  )}
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
            onChange={(e) => cart.setCustomerName(e.target.value.toUpperCase())}
            placeholder="NOMBRE O MESA DEL CLIENTE (OBLIGATORIO)"
            className={`h-10 w-full rounded-xl border bg-slate-800 px-3 text-sm font-medium uppercase text-white placeholder:text-slate-500 focus:outline-none transition-shadow ${
              needsName
                ? "border-amber-400/70 animate-name-glow"
                : "border-slate-700 focus:border-primary"
            }`}
          />

          <div
            className={`grid grid-cols-2 gap-2 rounded-xl ${
              needsDelivery ? "animate-name-glow" : ""
            }`}
          >
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

          {(needsName || needsDelivery) && (
            <p className="text-center text-xs font-bold uppercase tracking-wide text-amber-400">
              {needsName && needsDelivery
                ? "⚠ Completa nombre o mesa y elige Para mesa / Para llevar"
                : needsName
                  ? "⚠ Escribe el nombre o mesa del cliente"
                  : "⚠ Elige Para mesa o Para llevar"}
            </p>
          )}

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
            disabled={busy || !formOk}
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
                <span className="text-base font-bold">ACEPTAR</span>
                <span className="font-mono text-lg font-bold">
                  {formatPrice(cartTotal)}
                </span>
              </>
            ) : (
              "Enviar a caja"
            )}
          </button>
        </div>
      </section>

      {/* ===== Columna 3 (60%): Catálogo interactivo ===== */}
      <section className="flex w-3/5 flex-col bg-slate-950 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Almuerzos del día (acceso rápido): tarjetas doradas con el mismo bloque
            uniforme que la grilla de la carta para una retícula simétrica */}
          {!isAfter16 && catalog.menuItems.length > 0 && (
            <div className={`${menuDayGridClass} px-4 pt-3`}>
              {menuDayItems.map((menuItem) => (
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
                  className="flex h-[70px] flex-col justify-between rounded-xl border border-amber-500/50 bg-amber-500/10 p-2.5 text-left transition-transform hover:border-amber-400 hover:bg-amber-500/20 active:scale-95"
                >
                  <span className="line-clamp-2 text-xs font-semibold leading-tight text-amber-100">
                    {menuItem.name}
                  </span>
                  <span className="self-end font-mono text-sm font-bold text-amber-300">
                    {formatPrice(menuItem.price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Barra de categorías fija: pega arriba al scrollear y usa la misma
              retícula de 5 columnas que los almuerzos para quedar alineada */}
          <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950 py-2">
            <div className="grid grid-cols-5 justify-items-stretch gap-2 px-4">
              {catalogPanes.map((pane) => {
                const selected = pane.key === activePane;
                const accent = PANE_ACCENT[pane.key];
                const cls = accent
                  ? selected
                    ? accent.selected
                    : accent.idle
                  : selected
                    ? CHIP.selected
                    : CHIP.idle;
                return (
                  <button
                    key={pane.key}
                    type="button"
                    onClick={() => switchPane(pane.key)}
                    className={`${CHIP_BASE} ${cls}`}
                  >
                    {pane.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloque inferior: productos de la categoría seleccionada */}
          <div className="px-4 py-4">
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
                <section className="mt-2 space-y-3">
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
                <section className="mt-2 space-y-3">
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
                  <section className="mt-2 space-y-3">
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
                  {PANE_TITLE[activePane] ??
                    MenuCategoryLabel[activePane as MenuCategoryType]}
                </h3>

                {/* Grilla de platos de la categoría seleccionada (CSS Grid táctil:
                    tarjetas ~140px, altura fija 70px, precio en la esquina inferior) */}
                <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
                  {cartaItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.description ?? `Agregar ${item.name}`}
                      onClick={() => tapCartaItem(item)}
                      className="flex h-[70px] flex-col justify-between rounded-xl border border-slate-700/60 bg-slate-800 p-2.5 text-left transition-transform hover:bg-slate-700 active:scale-95"
                    >
                      <span className="line-clamp-2 text-xs font-semibold leading-tight text-white">
                        {item.name}
                      </span>
                      {item.options.length > 0 ? (
                        <span className="self-end text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                          Elegir variante
                        </span>
                      ) : (
                        <span className="self-end font-mono text-sm font-bold text-emerald-400">
                          {formatPrice(item.price)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Selector de variante (Pollo/Res, Unidades de alitas): se abre
                    al tocar un plato con opciones. Las Alitas Mixtas exigen
                    elegir el tamaño y luego marcar las salsas correspondientes. */}
                {variantItem && (
                  <div className="rounded-xl border border-primary/40 bg-slate-900/80 p-4 space-y-3 shadow-lg shadow-black/20">
                    <p className="text-sm font-bold text-white capitalize">
                      {variantItem.name} — elige tamaño
                    </p>
                    <div className="grid grid-cols-2 gap-2">
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
                              className={`h-12 rounded-xl border text-sm font-semibold text-white transition-all active:scale-95 ${
                                active
                                  ? "border-primary bg-primary"
                                  : "border-slate-600 bg-slate-800 hover:border-primary hover:bg-slate-700"
                              }`}
                            >
                              <span className="block capitalize">
                                {option.name}
                              </span>
                              <span className="block text-xs font-semibold text-slate-300">
                                {formatPrice(option.price)}
                              </span>
                            </button>
                          );
                        })}
                    </div>

                    {isMixtasItem(variantItem) && variantSize && (
                      <div className="rounded-lg bg-slate-950/60 p-3 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-white">
                          Salsas a elección
                        </p>
                        <p className="text-xs text-slate-400">
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
                                className={`h-9 rounded-full border px-3 text-xs font-semibold transition-all active:scale-95 ${
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
                            className="mt-2 h-11 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.99] hover:from-emerald-400 hover:to-emerald-600"
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
      </section>
    </div>
  );
}
