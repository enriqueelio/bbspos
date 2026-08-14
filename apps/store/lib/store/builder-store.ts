"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BuilderState {
  sizeId: string | null;
  flavorId: string | null;
  bobaTypeId: string | null;
  setSize: (id: string) => void;
  setFlavor: (id: string) => void;
  setBobaType: (id: string) => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      sizeId: null,
      flavorId: null,
      bobaTypeId: null,
      setSize: (sizeId) => set({ sizeId }),
      setFlavor: (flavorId) => set({ flavorId }),
      setBobaType: (bobaTypeId) => set({ bobaTypeId }),
      reset: () => set({ sizeId: null, flavorId: null, bobaTypeId: null }),
    }),
    {
      name: "bubba-builder",
    },
  ),
);
