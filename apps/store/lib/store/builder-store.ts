"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FlavorCategory } from "@bbspos/types";

interface BuilderState {
  category: FlavorCategory | null;
  flavorId: string | null;
  sizeId: string | null;
  bobaTypeId: string | null;
  toppingIds: string[];
  setCategory: (category: FlavorCategory) => void;
  setFlavor: (id: string) => void;
  setSize: (id: string | null) => void;
  setBobaType: (id: string | null) => void;
  toggleTopping: (id: string) => void;
  clearToppings: () => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      category: null,
      flavorId: null,
      sizeId: null,
      bobaTypeId: null,
      toppingIds: [],
      setCategory: (category) => set({ category, flavorId: null }),
      setFlavor: (flavorId) => set({ flavorId }),
      setSize: (sizeId) => set({ sizeId }),
      setBobaType: (bobaTypeId) => set({ bobaTypeId }),
      toggleTopping: (id) =>
        set((state) => ({
          toppingIds: state.toppingIds.includes(id)
            ? state.toppingIds.filter((t) => t !== id)
            : [...state.toppingIds, id],
        })),
      clearToppings: () => set({ toppingIds: [] }),
      reset: () =>
        set({
          category: null,
          flavorId: null,
          sizeId: null,
          bobaTypeId: null,
          toppingIds: [],
        }),
    }),
    {
      name: "bubba-builder-v2",
    },
  ),
);
