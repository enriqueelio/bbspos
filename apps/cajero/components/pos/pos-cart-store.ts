"use client";

import { useSyncExternalStore } from "react";
import type {
  BobaType,
  CartItem,
  CartTopping,
  Flavor,
  FlavorCategory,
  MenuCategory,
  Size,
} from "@bbspos/types";

export type PosDeliveryType = "MESA" | "LLEVAR" | "DELIVERY";

export interface AddPosItemInput {
  size: Size;
  flavor: Flavor;
  category: FlavorCategory;
  bobaType: BobaType;
  unitPrice: number;
  toppings: CartTopping[];
}

export interface AddPosMenuItemInput {
  menuItemId: string;
  name: string;
  category: MenuCategory;
  unitPrice: number;
  /** Id de la variante (MenuItemOption) elegida, p.ej. un tamaño de alitas.
   *  El server lo usa para recalcular el precio sin confiar en unitPrice. */
  optionId?: string | null;
  optionName: string | null;
  /** Detalle elegido por el cajero (p.ej. salsas de las Alitas Mixtas); se
   *  imprime en la comanda y se guarda en el pedido. */
  detail?: string | null;
}

export interface PosCartSnapshot {
  items: CartItem[];
  customerName: string;
  /** Cliente vinculado elegido en el autocompletado; null si es texto libre. */
  customerId: string | null;
  deliveryType: PosDeliveryType | "";
  notes: string;
  /** Hora pactada de una reserva en ISO 8601; "" = pedido normal sin reserva. */
  scheduledFor: string;
  /** Minutos antes de la hora pactada en que hay que avisar/iluminar la
   *  reserva en la cola (se configura por reserva al crearla; default 30). */
  reserveLeadMin: number;
  /** Id del pedido que se está editando (reserva sin confirmar cargada desde
   *  la cola); null = venta nueva. Al enviar reemplaza ítems/campos del pedido
   *  en vez de crear uno nuevo. */
  editingOrderId: string | null;
}

const listeners = new Set<() => void>();

const STORAGE_KEY = "bbspos-pos-cart";

// Los ítems guardados antes de la unión discriminada no traen `kind`: eran
// siempre bebidas. Se normalizan a "DRINK" para que las sesiones previas
// sigan funcionando sin perder el carrito.
function normalizeStoredItem(item: unknown): CartItem | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  if (raw.kind === "MENU_ITEM") {
    return {
      ...(raw as object),
      optionId: "optionId" in raw ? raw.optionId : null,
      optionName: "optionName" in raw ? raw.optionName : null,
      detail: "detail" in raw ? raw.detail : null,
    } as CartItem;
  }
  return { kind: "DRINK", ...(raw as object) } as CartItem;
}

function loadFromStorage(): Partial<PosCartSnapshot> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PosCartSnapshot>;
    return parsed;
  } catch {
    return {};
  }
}

function persistState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Almacenamiento no disponible: se ignora.
  }
}

const stored = loadFromStorage();
let items: CartItem[] = Array.isArray(stored.items)
  ? stored.items
      .map(normalizeStoredItem)
      .filter((i): i is CartItem => Boolean(i))
  : [];
let customerName =
  typeof stored.customerName === "string" ? stored.customerName : "";
// Cliente vinculado (autocompletado): se persiste con el resto del carrito.
let customerId =
  typeof stored.customerId === "string" && stored.customerId
    ? stored.customerId
    : null;
// El tipo de entrega arranca sin ninguno preseleccionado; el cliente/mesero
// elige "Para mesa" o "Para llevar" (o se toma por defecto al enviar).
let deliveryType: PosDeliveryType | "" = "";
let notes = typeof stored.notes === "string" ? stored.notes : "";
let scheduledFor = typeof stored.scheduledFor === "string" ? stored.scheduledFor : "";
let reserveLeadMin =
  typeof stored.reserveLeadMin === "number" && stored.reserveLeadMin > 0
    ? stored.reserveLeadMin
    : 30;
let editingOrderId =
  typeof stored.editingOrderId === "string" && stored.editingOrderId
    ? stored.editingOrderId
    : null;
let snapshot: PosCartSnapshot = {
  items,
  customerName,
  customerId,
  deliveryType,
  notes,
  scheduledFor,
  reserveLeadMin,
  editingOrderId,
};

function emit() {
  snapshot = {
    items,
    customerName,
    customerId,
    deliveryType,
    notes,
    scheduledFor,
    reserveLeadMin,
    editingOrderId,
  };
  for (const listener of listeners) listener();
}

export function addPosItem(input: AddPosItemInput, quantity = 1) {
  const qty = Math.max(1, Math.trunc(quantity));
  const toppingKey = input.toppings
    .map((t) => t.id)
    .sort()
    .join("+");
  const id = [
    input.category,
    input.size.name,
    input.flavor.name,
    input.bobaType.name,
    toppingKey,
  ].join("-");
  const existing = items.find((i) => i.id === id);
  if (existing) {
    items = items.map((i) =>
      i.id === id ? { ...i, quantity: i.quantity + qty } : i,
    );
  } else {
    const item: CartItem = {
      kind: "DRINK",
      id,
      size: input.size,
      flavor: input.flavor,
      category: input.category,
      bobaType: input.bobaType,
      unitPrice: input.unitPrice,
      toppings: input.toppings,
      quantity: qty,
    };
    items = [...items, item];
  }
  emit();
  persistState();
}

export function addPosMenuItem(input: AddPosMenuItemInput) {
  const id = `menu-item-${input.menuItemId}-${input.optionName ?? ""}-${
    input.detail ?? ""
  }`;
  const existing = items.find((i) => i.id === id);
  if (existing) {
    items = items.map((i) =>
      i.id === id ? { ...i, quantity: i.quantity + 1 } : i,
    );
  } else {
    const item: CartItem = {
      kind: "MENU_ITEM",
      id,
      menuItemId: input.menuItemId,
      name: input.name,
      category: input.category,
      unitPrice: input.unitPrice,
      optionId: input.optionId ?? null,
      optionName: input.optionName,
      detail: input.detail ?? null,
      quantity: 1,
    };
    items = [...items, item];
  }
  emit();
  persistState();
}

export function updatePosQuantity(id: string, quantity: number) {
  items = items.map((i) =>
    i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i,
  );
  emit();
  persistState();
}

export function removePosItem(id: string) {
  items = items.filter((i) => i.id !== id);
  emit();
  persistState();
}

export function setPosCustomerName(name: string) {
  customerName = name;
  emit();
  persistState();
}

/** Fija (o limpia con null) el cliente elegido en el autocompletado. */
export function setPosCustomerId(id: string | null) {
  customerId = id;
  emit();
  persistState();
}

export function setPosDeliveryType(type: PosDeliveryType) {
  deliveryType = type;
  emit();
  persistState();
}

export function setPosNotes(text: string) {
  notes = text;
  emit();
  persistState();
}

/** Fija (ISO string) o limpia (con "" ) la hora pactada de una reserva. */
export function setPosScheduledFor(iso: string) {
  scheduledFor = iso;
  emit();
  persistState();
}

/** Minutos antes de la hora pactada para avisar de la reserva (>= 1). */
export function setPosReserveLeadMin(min: number) {
  reserveLeadMin = Math.max(1, Math.trunc(min));
  emit();
  persistState();
}

/** Reemplaza todos los ítems del carrito de una vez (al cargar una reserva
 *  para editar). Los ítems vienen reconstruidos desde los datos del pedido. */
export function setPosItems(newItems: CartItem[]) {
  items = [...newItems];
  emit();
  persistState();
}

/** Marca que el carrito está editando el pedido con `id` (reserva sin
 *  confirmar); null vuelve a modo venta nueva. */
export function setPosEditingOrder(id: string | null) {
  editingOrderId = id;
  emit();
  persistState();
}

export function clearPosCart() {
  items = [];
  customerName = "";
  customerId = null;
  deliveryType = "";
  notes = "";
  scheduledFor = "";
  reserveLeadMin = 30;
  editingOrderId = null;
  emit();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Almacenamiento no disponible: se ignora.
    }
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Snapshot fijo para el servidor (SSR/hidratación): el carrito vive en
// localStorage del navegador y el SSR debe renderizar SIEMPRE el estado vacío.
// Tras hidratar, useSyncExternalStore cambia a getSnapshot y el carrito se
// pinta con un update normal (nunca con un mismatch de hidratación).
const SERVER_SNAPSHOT: PosCartSnapshot = {
  items: [],
  customerName: "",
  customerId: null,
  deliveryType: "",
  notes: "",
  scheduledFor: "",
  reserveLeadMin: 30,
  editingOrderId: null,
};

export function usePosCart() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
  return {
    ...state,
    addItem: addPosItem,
    addMenuItem: addPosMenuItem,
    updateQuantity: updatePosQuantity,
    removeItem: removePosItem,
    setCustomerName: setPosCustomerName,
    setCustomerId: setPosCustomerId,
    setDeliveryType: setPosDeliveryType,
    setNotes: setPosNotes,
    setScheduledFor: setPosScheduledFor,
    setReserveLeadMin: setPosReserveLeadMin,
    setItems: setPosItems,
    setEditingOrder: setPosEditingOrder,
    clear: clearPosCart,
  };
}