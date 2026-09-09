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

export type PosDeliveryType = "MESA" | "LLEVAR";

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
  optionName: string | null;
  /** Detalle elegido por el cajero (p.ej. salsas de las Alitas Mixtas); se
   *  imprime en la comanda y se guarda en el pedido. */
  detail?: string | null;
}

export interface PosCartSnapshot {
  items: CartItem[];
  customerName: string;
  deliveryType: PosDeliveryType | "";
  notes: string;
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
// El tipo de entrega arranca sin ninguno preseleccionado; el cliente/mesero
// elige "Para mesa" o "Para llevar" (o se toma por defecto al enviar).
let deliveryType: PosDeliveryType | "" = "";
let notes = typeof stored.notes === "string" ? stored.notes : "";
let snapshot: PosCartSnapshot = { items, customerName, deliveryType, notes };

function emit() {
  snapshot = { items, customerName, deliveryType, notes };
  for (const listener of listeners) listener();
}

export function addPosItem(input: AddPosItemInput) {
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
      i.id === id ? { ...i, quantity: i.quantity + 1 } : i,
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
      quantity: 1,
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

export function clearPosCart() {
  items = [];
  customerName = "";
  deliveryType = "";
  notes = "";
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

export function usePosCart() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return {
    ...state,
    addItem: addPosItem,
    addMenuItem: addPosMenuItem,
    updateQuantity: updatePosQuantity,
    removeItem: removePosItem,
    setCustomerName: setPosCustomerName,
    setDeliveryType: setPosDeliveryType,
    setNotes: setPosNotes,
    clear: clearPosCart,
  };
}