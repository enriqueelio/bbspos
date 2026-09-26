"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlavorCategory,
  FlavorCategoryList,
  MenuCategory,
  MenuCategoryLabel,
  MenuCategoryList,
  cartItemUnitTotal,
  formatOrderCode,
  formatPrice,
  Role,
  shortCustomerName,
  type Catalog,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type LunchStockState,
  type MenuCategory as MenuCategoryType,
  type MenuItemView,
  type Role as RoleType,
  type Topping,
} from "@bbspos/types";
import {
  createPosOrder,
  updatePosOrder,
} from "@/actions/pos";
import {
  getCustomerLoyalty,
  linkCustomerByText,
} from "@/app/actions/customers";
import { getPosState, usePosCart, type PosDeliveryType } from "./pos-cart-store";
import { QueueView } from "@/components/queue-view";
import type {
  CartItem,
  CartTopping,
  Order,
} from "@bbspos/types";
import type { PensionCustomerOption } from "@/components/pension-payment-dialog";
import type { CustomerLoyaltyView } from "@bbspos/types";
import { PosCategoryBar } from "./pos-category-bar";
import { PosTicketPanel } from "./pos-ticket-panel";
import { PosBubasBuilder } from "./pos-bubas-builder";
import { PosCartaGrid } from "./pos-carta-grid";
import { LunchStockBadge } from "./lunch-stock-badge";
import { getRequiredSauces, isMixtasItem } from "./pos-variant-selector";
import { holdLunchUnits, syncLunchHolds } from "@/actions/lunch-stock";
import { addableUnits } from "@/lib/lunch-stock";

const CATEGORIES = FlavorCategoryList;

/** Estado de cantidad de un plato al que no se le controla stock (catálogo viejo
 *  o terminal sin el cálculo): guion neutro y tarjeta normal. */
const NO_STOCK: LunchStockState = {
  planned: null,
  sold: 0,
  held: 0,
  heldByMe: 0,
  remaining: null,
  lowThreshold: 5,
};

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

/** Reconstruye los CartItems de una reserva desde sus datos persistidos para
 *  poder cargarlos en el ticket (al editar). Los productos se re-resuelven por
 *  nombre contra el catálogo activo; los que ya no existen se omiten y se
 *  reportan en `skipped` para avisar al cajero. El id de cada ítem coincide
 *  con el que usaría addItem/addMenuItem para que siga sumando cantidades. */
function reconstructOrderItems(
  order: Order,
  catalog: Catalog,
): { items: CartItem[]; skipped: string[] } {
  const items: CartItem[] = [];
  const skipped: string[] = [];
  const sizeByName = new Map(catalog.sizes.map((s) => [s.name, s]));
  const flavorByName = new Map(catalog.flavors.map((f) => [f.name, f]));
  const bobaByName = new Map(catalog.bobaTypes.map((b) => [b.name, b]));
  const toppingByName = new Map(catalog.toppings.map((t) => [t.name, t]));
  const catalogItems = [...catalog.cartaItems, ...catalog.menuItems];

  for (const item of order.items) {
    if (item.sizeName) {
      const size = sizeByName.get(item.sizeName);
      const flavor = item.flavorName
        ? flavorByName.get(item.flavorName)
        : undefined;
      const boba = item.bobaTypeName
        ? bobaByName.get(item.bobaTypeName)
        : undefined;
      if (!size || !flavor || !boba) {
        skipped.push(`${item.flavorName ?? "Bebida"} (${item.sizeName ?? ""})`);
        continue;
      }
      const category: FlavorCategoryType =
        item.flavorCategory ?? flavor.categories[0];
      const toppings: CartTopping[] = [];
      for (const t of item.toppings) {
        const db = toppingByName.get(t.toppingName);
        if (db) {
          toppings.push({ id: db.id, name: db.name, price: db.price });
        } else {
          skipped.push(`${item.flavorName} · topping ${t.toppingName}`);
        }
      }
      const toppingKey = toppings.map((t) => t.id).sort().join("+");
      const id = [
        category,
        size.name,
        flavor.name,
        boba.name,
        toppingKey,
      ].join("-");
      items.push({
        kind: "DRINK",
        id,
        size,
        flavor,
        category,
        bobaType: boba,
        unitPrice: item.unitPrice,
        toppings,
        quantity: item.quantity,
      });
      continue;
    }

    const name = item.menuItemName ?? "";
    const catalogItem = catalogItems.find((m) => m.name === name);
    if (!catalogItem) {
      skipped.push(name || "Producto sin nombre");
      continue;
    }
    const option = item.menuItemOptionName
      ? (catalogItem.options.find((o) => o.name === item.menuItemOptionName) ??
        null)
      : null;
    const detail = item.menuItemDetail ?? null;
    const id = `menu-item-${catalogItem.id}-${item.menuItemOptionName ?? ""}-${detail ?? ""}`;
    items.push({
      kind: "MENU_ITEM",
      id,
      menuItemId: catalogItem.id,
      name,
      category:
        (item.menuItemCategory as MenuCategoryType) ?? catalogItem.category,
      unitPrice: item.unitPrice,
      optionId: option?.id ?? null,
      optionName: item.menuItemOptionName,
      detail,
      quantity: item.quantity,
    });
  }
  return { items, skipped };
}

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
  const [productQty, setProductQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variantItem, setVariantItem] = useState<MenuItemView | null>(null);
  const [variantSize, setVariantSize] = useState<
    MenuItemView["options"][number] | null
  >(null);
  const [variantSauces, setVariantSauces] = useState<string[]>([]);
  const [isAfter16, setIsAfter16] = useState(false);
  const [alitaSauces, setAlitaSauces] = useState<string[]>([]);
  // Cantidad de la jornada corregida desde el propio POS: las server actions
  // devuelven el estado ya recalculado y se aplica sobre la tarjeta en el acto,
  // sin esperar el próximo refresco del catálogo (que llega hasta 15 s después).
  // La sobreescritura se descarta en cuanto el catálogo trae ese plato.
  const [stockOverrides, setStockOverrides] = useState<
    Record<string, LunchStockState>
  >({});
  const didMount = useRef(false);
  // El popover del contador se recorta con esta columna (overflow-hidden), así
  // que la necesita para abrirse hacia el lado correcto.
  const catalogRef = useRef<HTMLElement>(null);

  // Al entrar (montar) se dejan los selectores en blanco para que el mesero
  // arranque un pedido nuevo sin arrastrar selecciones. Corre una sola vez (ref
  // guard): el catálogo cambia de identidad en cada refresh (router.refresh de
  // la cola) y re-ejecutarlo resetea la categoría activa a Milanesas.
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
    setProductQty(1);
    setVariantItem(null);
    setVariantSize(null);
    setVariantSauces([]);
    setBubaCategory(firstActiveCategory(catalog));
    setActivePane(defaultPane(catalog));
  }, [catalog]);

  // El catálogo cambia de identidad en cada `router.refresh()` (el polling de
  // 15 s de la cola). Es el momento de soltar las sobreescrituras de cantidad:
  // la acción ya las guardó y el servidor ya las trae, así que el catálogo pasa
  // a ser la fuente y converge con lo que hagan las otras cajas.
  useEffect(() => {
    setStockOverrides({});
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

  // El carrito del POS se persiste en localStorage (pos-cart-store): un refresh
  // accidental o una caída del cajero no pierde el ticket en curso. Solo lo
  // vacían la limpieza explícita (botón "Limpiar") o el envío exitoso del pedido.

  /** Deja los apartados de la caja iguales a las líneas de almuerzo del ticket y
   *  avisa si otra caja se llevó alguna mientras tanto. Es idempotente: suelta lo
   *  que sobra y pide de a uno lo que falta. */
  function syncTicketHolds() {
    if (!cart.cartId) return;
    // Del módulo, no de `cart`: este efecto corre al montar y `usePosCart` sigue
    // devolviendo el carrito vacío del servidor hasta que hidrata. Con `cart`
    // la recarga mandaba una lista vacía y liberaba el apartado de la caja.
    const live = getPosState();
    syncLunchHolds(
      cart.cartId,
      live.items
        .filter((i) => i.kind === "MENU_ITEM")
        .map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      live.scheduledFor || null,
    )
      .then(({ lost }) => {
        if (lost.length === 0) return;
        setNotice(
          `Otra caja tomó ${lost.join(", ")}: quitá esa línea del ticket para cobrar.`,
        );
        router.refresh();
      })
      .catch(() => {
        // Sin red o sesión caída: el TTL libera lo que quede.
      });
  }

  // Al (re)abrir el POS hay que reconciliar el apartado de cupo con las líneas
  // que quedaron en el ticket: el carrito se restaura del navegador, pero sus
  // apartados pueden haber vencido (caja cerrada mucho rato) o haberse quedado
  // atrás. Un carrito vacío también llama, para soltar lo que quedara apartado.
  const didSyncHolds = useRef(false);
  useEffect(() => {
    if (didSyncHolds.current) return;
    didSyncHolds.current = true;
    syncTicketHolds();
    // Solo al abrir el POS: después cada movimiento de línea va con su propia
    // acción de apartado o liberación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.cartId]);

  // Catálogo de salsas para las Alitas Mixtas, servido desde la BD.
  useEffect(() => {
    fetch("/api/alita-sauces")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { name: string }[]) =>
        setAlitaSauces(data.map((s) => s.name)),
      )
      .catch(() => setAlitaSauces([]));
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

  function priceOf(): number | null {
    if (!size || !bobaType) return null;
    const entry = catalog.drinkPrices.find(
      (p) =>
        p.category === bubaCategory &&
        p.sizeId === size.id &&
        p.bobaTypeId === bobaType.id,
    );
    return entry ? entry.price : null;
  }

  const selectedToppings = toppingIds
    .map((id) => toppings.find((t) => t.id === id))
    .filter((t): t is Topping => Boolean(t));

  // Subtotal del producto en proceso: bebida base + el costo de los extras
  // seleccionados. null = el combo de tamaño+boba no tiene precio (no disponible).
  function preticketSubtotal(): number | null {
    const base = priceOf();
    if (base === null) return null;
    const extras = selectedToppings.reduce((sum, t) => sum + t.price, 0);
    return base + extras;
  }

  const selectedFlavor =
    flavors.find((f) => f.id === selectedFlavorId) ?? null;

  // Razón explícita por la que "Confirmar producto" queda deshabilitado, para
  // que el cajero sepa qué falta sin silencio de UX.
  const productBlockReason =
    !size || !bobaType
      ? "Falta elegir tamaño/boba"
      : preticketSubtotal() === null
        ? "Combinación no disponible"
        : null;

  function switchBubaCategory(category: FlavorCategoryType) {
    setBubaCategory(category);
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setToppingIds([]);
    setProductQty(1);
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

  // Tocar un sabor marca el producto en construcción. Los toppings se conservan
  // al cambiar de sabor (un mismo vaso puede llevar la misma combinación); solo
  // se reinician al cambiar de categoría o al confirmar el producto.
  function selectFlavor(flavor: Flavor) {
    setSelectedFlavorId((current) => {
      if (current !== flavor.id) {
        setProductQty(1);
      }
      return flavor.id;
    });
    // Autoselección inteligente: Tamaño Grande y Tipo de boba Tapioca por defecto.
    if (grandSize) setSizeId(grandSize.id);
    if (tapiocaBoba) setBobaTypeId(tapiocaBoba.id);
  }

  const canConfirmProduct = Boolean(
    size && bobaType && selectedFlavor && preticketSubtotal() !== null,
  );

  function confirmProduct() {
    const unitPrice = priceOf();
    if (unitPrice === null || !size || !bobaType || !selectedFlavor) return;
    setNotice(null);
    cart.addItem(
      {
        size,
        flavor: selectedFlavor,
        category: bubaCategory,
        bobaType,
        unitPrice,
        toppings: selectedToppings.map((t) => ({
          id: t.id,
          name: t.name,
          price: t.price,
        })),
      },
      productQty,
    );
    // Restablece el selector para empezar a armar otro producto.
    setSelectedFlavorId(null);
    setSizeId("");
    setToppingIds([]);
    setProductQty(1);
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
      // Resuelve el cliente: si el cajero lo eligió (autocompletado o
      // registro) se reutiliza su id y el nombre corto ya está en el campo; si
      // escribió texto libre, se intenta vincular por teléfono/nombre exacto y,
      // si no coincide nada, la venta queda como invitado (sin crear cliente).
      let customerId = cart.customerId;
      let customerName = trimmedName;
      let loyalty: CustomerLoyaltyView | null = null;
      if (customerId) {
        loyalty = await getCustomerLoyalty(customerId);
      } else {
        loyalty = await linkCustomerByText(customerName);
        if (loyalty) {
          customerId = loyalty.id;
          customerName = shortCustomerName(loyalty).toUpperCase();
        }
      }
      const result = cart.editingOrderId
        ? await updatePosOrder(
            cart.editingOrderId,
            cart.items,
            customerName,
            deliveryType,
            cart.notes,
            customerId,
            cart.scheduledFor || null,
            cart.reserveLeadMin,
            cart.cartId,
          )
        : await createPosOrder(
            cart.items,
            customerName,
            deliveryType,
            cart.notes,
            customerId,
            cart.scheduledFor || null,
            cart.reserveLeadMin,
            cart.cartId,
          );
      const isReservation = cart.scheduledFor !== "";
      const wasEditing = cart.editingOrderId !== null;
      cart.clear();
      // Devuelve los selectores a su estado por defecto para no arrastrar
      // las opciones del pedido anterior.
      setToppingIds([]);
      setSizeId("");
      setBobaTypeId("");
      setSelectedFlavorId(null);
      setBubaCategory(firstActiveCategory(catalog));
      setActivePane(defaultPane(catalog));
      setProductQty(1);
      const loyaltyText = loyalty?.levelName
        ? ` · Nivel ${loyalty.levelName} (${loyalty.points} pts)`
        : "";
      setNotice(
        wasEditing
          ? `Pedido #${formatOrderCode(result.daySeq)} actualizado · Total ${formatPrice(result.total)}${loyaltyText} · Reserva, confirmar desde la cola`
          : `Pedido #${formatOrderCode(result.daySeq)} creado · Total ${formatPrice(result.total)}${loyaltyText}${isReservation ? " · Reserva, confirmar desde la cola" : ""}`,
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
  // cliente se arrepiente. Suelta además el cupo de los almuerzos apartados: si
  // no, las otras cajas los verían tomado hasta que venciera el TTL.
  function handleClear() {
    // Sin await a propósito: limpiar el ticket no puede quedar esperando al
    // servidor. Con líneas vacías, esto suelta todos los apartados de la caja.
    void syncLunchHolds(cart.cartId, [], cart.scheduledFor || null).catch(() => {});
    cart.clear();
    setNotice(null);
    setToppingIds([]);
    setSizeId("");
    setBobaTypeId("");
    setSelectedFlavorId(null);
    setVariantItem(null);
    setVariantSize(null);
    setVariantSauces([]);
    setProductQty(1);
  }

  // Carga una reserva sin confirmar en el TICKET EN CURSO para editarla
  // (ítems, nombre, hora pactada, etc.). Se conserva el mismo pedido al
  // guardar: ver PosTerminal.submit → updatePosOrder.
  function handleEditReservation(order: Order) {
    const { items: restored, skipped } = reconstructOrderItems(order, catalog);
    cart.setItems(restored);
    cart.setCustomerName((order.customerName ?? "").toUpperCase());
    cart.setCustomerId(order.customerId ?? null);
    cart.setDeliveryType(
      (order.orderType as PosDeliveryType) || ("LLEVAR" as PosDeliveryType),
    );
    cart.setNotes(order.notes ?? "");
    cart.setScheduledFor(order.scheduledFor ?? "");
    cart.setReserveLeadMin(order.reserveLeadMin || 30);
    cart.setEditingOrder(order.id);
    setError(null);
    // Las líneas de la reserva entran al carrito sin pasar por el popover ni por
    // la tarjeta: hay que apartar su cupo igual, o este ticket vendería unidades
    // que otra caja ya tiene separadas.
    syncTicketHolds();
    setNotice(
      skipped.length > 0
        ? `Editando #${formatOrderCode(order.daySeq ?? order.seq ?? 0)}. No se incluyeron (ya no disponibles): ${skipped.join(", ")}.`
        : `Editando reserva #${formatOrderCode(order.daySeq ?? order.seq ?? 0)}. Reparte y pulsa GUARDAR.`,
    );
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
  // Cantidad vigente de cada almuerzo: la del catálogo, o la corregida desde el
  // propio cajero si la ajustó hace menos de un ciclo de refresco.
  const lunchStockOf = (item: MenuItemView): LunchStockState | null =>
    stockOverrides[item.id] ?? item.lunchStock;
  /** Razón por la que un almuerzo del día no se puede agregar al ticket, o null
   *  si se puede vender. Son tres casos distintos y se muestran distinto:
   *  - `sin-cantidad`: todavía no se le asignó una cantidad para hoy. No se
   *    vende nada hasta que alguien le asigne una.
   *  - `agotado`: tenía unidades y ya no queda ninguna, para nadie. Se repone
   *    desde el número.
   *  - `todo-apartado`: lo que le queda ya está en el ticket de ESTA caja, así
   *    que no hay nada más que agregar. Al quitar líneas se liberan y vuelve a
   *    habilitarse.
   *  Un plato sin control de cantidad (`lunchStock` null, una terminal que no
   *  lo lleva) no se bloquea: no hay dato para saber si tiene. */
  function lunchBlock(
    item: MenuItemView,
  ): "sin-cantidad" | "agotado" | "todo-apartado" | null {
    const stock = lunchStockOf(item);
    if (!stock) return null;
    if (stock.planned == null || stock.remaining == null) return "sin-cantidad";
    if (stock.remaining <= 0) return "agotado";
    const addable = addableUnits(stock);
    return addable != null && addable <= 0 ? "todo-apartado" : null;
  }
  function applyStockOverride(
    menuItemId: string,
    next: LunchStockState,
  ) {
    setStockOverrides((current) => ({ ...current, [menuItemId]: next }));
  }
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

  // Tocar un almuerzo del día: primero se aparta la unidad para esta caja y solo
  // después se agrega la línea. Si otra caja se llevó lo último entre el número
  // que se veía y el clic, el servidor lo rechaza, la línea no se agrega y se
  // avisa: es el momento exacto en que "el primero que agarró gana".
  async function tapMenuDayItem(menuItem: MenuItemView) {
    setNotice(null);
    try {
      const next = await holdLunchUnits(
        cart.cartId,
        menuItem.id,
        1,
        cart.scheduledFor || null,
      );
      // El número de la tarjeta baja en uno con este estado, sin esperar el
      // refresco: `heldByMe` ya viene incrementado.
      if (next) applyStockOverride(menuItem.id, next);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Otra caja ya tomó ese almuerzo. Actualizando…",
      );
      router.refresh();
      return;
    }
    cart.addMenuItem({
      menuItemId: menuItem.id,
      name: menuItem.name,
      category: menuItem.category,
      unitPrice: menuItem.price,
      optionId: null,
      optionName: null,
    });
    // El resto del catálogo también se actualiza (lo que otra caja tomó se ve
    // desde acá), así que refrescamos igual.
    router.refresh();
  }

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
    setNotice(null);
    cart.addMenuItem({
      menuItemId: item.id,
      name: item.name,
      category: item.category,
      unitPrice: item.price,
      optionId: null,
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
    setNotice(null);
    cart.addMenuItem({
      menuItemId: variantItem.id,
      name: variantItem.name,
      category: variantItem.category,
      unitPrice: option.price,
      optionId: option.id,
      optionName: option.name,
    });
    setVariantItem(null);
  }

  // Confirmar las Alitas Mixtas: exige exactamente las salsas requeridas (2 en
  // 6/8 unidades, 3 en 12) antes de agregar la línea a la orden.
  function confirmMixtas() {
    if (!variantItem || !variantSize) return;
    if (variantSauces.length !== getRequiredSauces(variantItem, variantSize))
      return;
    setNotice(null);
    cart.addMenuItem({
      menuItemId: variantItem.id,
      name: variantItem.name,
      category: variantItem.category,
      unitPrice: variantSize.price,
      optionId: variantSize.id,
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

  return (
    <div className="flex h-full w-full bg-slate-950 overflow-hidden">
      {/* ===== Columna 1 (20%): Pedidos en Cola con scroll propio ===== */}
      <aside className="flex w-1/5 min-w-[300px] shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900">
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <QueueView
            orders={queueOrders}
            role={role}
            customers={customers}
            compact
            onEditReservation={handleEditReservation}
            editingOrderId={cart.editingOrderId}
          />
        </div>
      </aside>

      {/* ===== Columna 2 (20%): Ticket en curso y cobro (fijo) ===== */}
      <PosTicketPanel
        cart={cart}
        isBilling={isBilling}
        busy={busy}
        notice={notice}
        error={error}
        needsName={needsName}
        needsDelivery={needsDelivery}
        formOk={formOk}
        cartTotal={cartTotal}
        hasBuildingProduct={selectedFlavorId !== null}
        onClear={handleClear}
        onSubmit={submit}
        onNotice={setNotice}
        onLunchStock={applyStockOverride}
      />

      {/* ===== Columna 3 (60%): Catálogo interactivo ===== */}
      <section
        ref={catalogRef}
        className="flex w-3/5 flex-col bg-slate-950 overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto">
          {/* Almuerzos del día (acceso rápido): tarjetas doradas con el mismo bloque
            uniforme que la grilla de la carta para una retícula simétrica */}
          {!isAfter16 && catalog.menuItems.length > 0 && (
            <div className={`${menuDayGridClass} px-4 pt-3`}>
              {menuDayItems.map((menuItem) => {
                const block = lunchBlock(menuItem);
                const blocked = block !== null;
                return (
                  // El contador va como hermano de la tarjeta (no dentro del
                  // botón) para que siga siendo clicable con la tarjeta
                  // bloqueada: es la única forma de asignar o reponer unidades.
                  <div key={menuItem.id} className="relative">
                    <button
                      type="button"
                      disabled={blocked}
                      title={
                        block === "sin-cantidad"
                          ? `${menuItem.name} — sin cantidad. Clic en el número para asignarle unidades.`
                          : block === "agotado"
                            ? `${menuItem.name} — agotado. Clic en el número para reponer.`
                            : block === "todo-apartado"
                              ? `${menuItem.name} — lo que queda ya está en tu ticket. Quita líneas para liberarlo.`
                              : `Agregar ${menuItem.name}`
                      }
                      onClick={() => tapMenuDayItem(menuItem)}
                      className={
                        blocked
                          ? "flex h-[70px] w-full cursor-not-allowed flex-col justify-between rounded-xl border border-slate-700 bg-slate-800/40 p-2.5 text-left opacity-60"
                          : "flex h-[70px] w-full flex-col justify-between rounded-xl border border-amber-500/50 bg-amber-500/10 p-2.5 text-left transition-transform hover:border-amber-400 hover:bg-amber-500/20 active:scale-95"
                      }
                    >
                      <span
                        className={`line-clamp-2 pr-7 text-xs font-semibold leading-tight ${
                          blocked ? "text-slate-400" : "text-amber-100"
                        }`}
                      >
                        {menuItem.name}
                      </span>
                      <span className="flex items-end justify-between gap-1">
                        {blocked && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            {block === "sin-cantidad"
                              ? "Sin cantidad"
                              : block === "todo-apartado"
                                ? "En tu ticket"
                                : "Agotado"}
                          </span>
                        )}
                        <span
                          className={`self-end font-mono text-sm font-bold ${
                            blocked ? "text-slate-500" : "text-amber-300"
                          }`}
                        >
                          {formatPrice(menuItem.price)}
                        </span>
                      </span>
                    </button>
                    <div className="absolute right-1.5 top-1.5">
                      <LunchStockBadge
                        menuItemId={menuItem.id}
                        state={lunchStockOf(menuItem) ?? NO_STOCK}
                        boundaryRef={catalogRef}
                        onApplied={(next) => applyStockOverride(menuItem.id, next)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra de categorías como tarjetas: pega arriba al scrollear y usa la
              misma retícula de 5 columnas que los productos para quedar alineada */}
          <PosCategoryBar
            panes={catalogPanes}
            activeKey={activePane}
            onSwitch={(key) => switchPane(key as CatalogPane)}
          />

          {/* Bloque inferior: productos de la categoría seleccionada. Sin tope de
              ancho ni centrado, para que sus columnas caigan exactamente sobre las
              de las categorías y las de los almuerzos del día. */}
          <div className="px-4 py-4">
            <div className="flex flex-col gap-4">
              {isBubas && (
                <PosBubasBuilder
                  bubaCategory={bubaCategory}
                  onSwitchCategory={switchBubaCategory}
                  flavors={flavors}
                  sizes={sizes}
                  bobaTypes={sortedBobaTypes}
                  toppings={toppings}
                  selectedFlavorId={selectedFlavorId}
                  selectedFlavor={selectedFlavor}
                  selectedSize={size}
                  selectedBobaType={bobaType}
                  selectedToppings={selectedToppings}
                  productQty={productQty}
                  productBlockReason={productBlockReason}
                  preticketSubtotal={preticketSubtotal()}
                  canConfirm={canConfirmProduct}
                  onSelectFlavor={selectFlavor}
                  onSelectSize={setSizeId}
                  onSelectBoba={setBobaTypeId}
                  onToggleTopping={toggleTopping}
                  onSetQty={(value) => setProductQty(Math.max(1, value))}
                  onConfirmProduct={confirmProduct}
                />
              )}

              {isCartaPane && (
                <PosCartaGrid
                  paneTitle={
                    PANE_TITLE[activePane] ??
                    MenuCategoryLabel[activePane as MenuCategoryType]
                  }
                  items={cartaItems}
                  variantItem={variantItem}
                  variantSize={variantSize}
                  variantSauces={variantSauces}
                  alitaSauces={alitaSauces}
                  onTapItem={tapCartaItem}
                  onSelectVariantSize={tapVariantSize}
                  onToggleVariantSauce={toggleVariantSauce}
                  onConfirmMixtas={confirmMixtas}
                  onCancelVariant={() => {
                    setVariantItem(null);
                    setVariantSize(null);
                    setVariantSauces([]);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}