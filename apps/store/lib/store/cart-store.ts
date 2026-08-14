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
} from "@bubba/types";

export interface AddItemInput {
  size: Size;
  flavor: Flavor;
  category: FlavorCategory;
  bobaType: BobaType;
  unitPrice: number;
  toppings: CartTopping[];
}

interface CartState {
  items: CartItem[];
  addItem: (input: AddItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
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
      clear: () => set({ items: [] }),
    }),
    {
      name: "bubba-cart-v2",
    },
  ),
);
