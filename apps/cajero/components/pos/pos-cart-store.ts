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

let items: CartItem[] = [];
let customerName = "";
let deliveryType: PosDeliveryType = "MESA";
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
}

export function updatePosQuantity(id: string, quantity: number) {
  items = items.map((i) =>
    i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i,
  );
  emit();
}

export function removePosItem(id: string) {
  items = items.filter((i) => i.id !== id);
  emit();
}

export function setPosCustomerName(name: string) {
  customerName = name;
  emit();
}

export function setPosDeliveryType(type: PosDeliveryType) {
  deliveryType = type;
  emit();
}

export function clearPosCart() {
  items = [];
  customerName = "";
  deliveryType = "MESA";
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePosCart() {
  const state = useSyncExternalStore(subscribe, () => snapshot);
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