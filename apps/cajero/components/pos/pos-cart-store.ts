"use client";

import { useSyncExternalStore } from "react";
import type {
  BobaType,
  CartItem,
  CartTopping,
  Flavor,
  FlavorCategory,
  Size,
} from "@bubba/types";

export type PosDeliveryType = "MESA" | "LLEVAR";

export interface AddPosItemInput {
  size: Size;
  flavor: Flavor;
  category: FlavorCategory;
  bobaType: BobaType;
  unitPrice: number;
  toppings: CartTopping[];
}

export interface PosCartSnapshot {
  items: CartItem[];
  customerName: string;
  deliveryType: PosDeliveryType;
}

const listeners = new Set<() => void>();

const STORAGE_KEY = "bubba-pos-cart";

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
let items: CartItem[] = Array.isArray(stored.items) ? stored.items : [];
let customerName =
  typeof stored.customerName === "string" ? stored.customerName : "";
let deliveryType: PosDeliveryType =
  stored.deliveryType === "LLEVAR" ? "LLEVAR" : "MESA";
let snapshot: PosCartSnapshot = { items, customerName, deliveryType };

function emit() {
  snapshot = { items, customerName, deliveryType };
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

export function clearPosCart() {
  items = [];
  customerName = "";
  deliveryType = "MESA";
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
    updateQuantity: updatePosQuantity,
    removeItem: removePosItem,
    setCustomerName: setPosCustomerName,
    setDeliveryType: setPosDeliveryType,
    clear: clearPosCart,
  };
}