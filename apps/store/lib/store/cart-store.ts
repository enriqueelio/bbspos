"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BobaType,
  CartItem,
  CartTopping,
  Flavor,
  FlavorCategory,
  Size,
} from "@bbspos/types";

export interface AddItemInput {
  size: Size;
  flavor: Flavor;
  category: FlavorCategory;
  bobaType: BobaType;
  unitPrice: number;
  toppings: CartTopping[];
}

type DeliveryType = "MESA" | "LLEVAR";

interface CartState {
  items: CartItem[];
  customerName: string | null;
  deliveryType: DeliveryType | null;
  setCustomerName: (name: string) => void;
  setDeliveryType: (type: DeliveryType) => void;
  addItem: (input: AddItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      customerName: null,
      deliveryType: null,
      setCustomerName: (customerName) => set({ customerName }),
      setDeliveryType: (deliveryType) => set({ deliveryType }),
      addItem: (input) =>
        set((state) => {
          const toppingKey = input.toppings
            .map((t) => t.id)
            .sort()
            .join("+");
          const id = [
            input.category,
            input.size.id,
            input.flavor.id,
            input.bobaType.id,
            toppingKey,
          ].join("-");
          const existing = state.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          const item: CartItem = {
            id,
            kind: "DRINK",
            size: input.size,
            flavor: input.flavor,
            category: input.category,
            bobaType: input.bobaType,
            unitPrice: input.unitPrice,
            toppings: input.toppings,
            quantity: 1,
          };
          return { items: [...state.items, item] };
        }),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i,
          ),
        })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [], customerName: null, deliveryType: null }),
    }),
    {
      name: "bbspos-cart-v2",
      merge: (persisted, current) => {
        const state = {
          ...(current as object),
          ...(persisted as object),
        } as CartState;
        if (Array.isArray(state.items)) {
          state.items = state.items.map((item) => {
            // Ítems guardados antes de la unión discriminada no traían `kind`:
            // eran siempre bebidas y se normalizan a "DRINK".
            if (
              item &&
              typeof item === "object" &&
              "kind" in item &&
              (item as { kind?: string }).kind === "MENU_ITEM"
            ) {
              return item as CartItem;
            }
            return { kind: "DRINK", ...(item as object) } as CartItem;
          });
        }
        return state;
      },
    },
  ),
);
