"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BobaType, CartItem, Flavor, Size } from "@bubba/types";

interface CartState {
  items: CartItem[];
  addItem: (size: Size, flavor: Flavor, bobaType: BobaType) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (size, flavor, bobaType) =>
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.size.id === size.id &&
              i.flavor.id === flavor.id &&
              i.bobaType.id === bobaType.id,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              ),
            };
          }
          const item: CartItem = {
            id: `${size.id}-${flavor.id}-${bobaType.id}`,
            size,
            flavor,
            bobaType,
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
      name: "bubba-cart",
    },
  ),
);
