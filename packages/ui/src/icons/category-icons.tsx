"use client";

import type { ComponentType, CSSProperties } from "react";
import {
  Apple,
  Baby,
  Banana,
  Beef,
  Beer,
  Bird,
  Cake,
  CakeSlice,
  Candy,
  Carrot,
  ChefHat,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Donut,
  Drumstick,
  EggFried,
  Fish,
  Flame,
  GlassWater,
  Grape,
  Ham,
  IceCreamBowl,
  IceCreamCone,
  Leaf,
  Martini,
  Milk,
  PackagePlus,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  ShoppingBag,
  Soup,
  Sparkles,
  Star,
  Store,
  Users,
  Utensils,
  UtensilsCrossed,
  Wheat,
  Wine,
} from "lucide-react";

/** Ícono de hamburguesa (lucide "hamburger"); no existe en la versión instalada
 *  de lucide-react, así que se define con sus mismas paths para mantener el
 *  estilo stroke de lucide. */
function HamburgerIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M12 16H4a2 2 0 1 1 0-4h16a2 2 0 1 1 0 4h-4.25" />
      <path d="M5 12a2 2 0 0 1-2-2 9 7 0 0 1 18 0 2 2 0 0 1-2 2" />
      <path d="M5 16a2 2 0 0 0-2 2 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 2 2 0 0 0-2-2q0 0 0 0" />
      <path d="m6.67 12 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2" />
    </svg>
  );
}

/** Whitelist de íconos de categoría (Catálogo admin → iconName). El `iconName`
 *  guardado en la tabla Category mapea a un componente aquí; sin coincidencia el
 *  admin cae en el ícono neutro. Compartido por admin (selector/formulario) y
 *  las terminales (barra del POS, pestañas del mesero). La lista de nombres
 *  válidos vive en category-icon-names.ts (importable desde server actions). */
export const CATEGORY_ICONS: Record<
  string,
  ComponentType<{ className?: string; style?: CSSProperties }>
> = {
  Utensils,
  UtensilsCrossed,
  ChefHat,
  CookingPot,
  Soup,
  Pizza,
  Hamburger: HamburgerIcon,
  Sandwich,
  Salad,
  Beef,
  Bird,
  Drumstick,
  Ham,
  Fish,
  EggFried,
  Popcorn,
  Carrot,
  Wheat,
  Leaf,
  Coffee,
  Milk,
  CupSoda,
  GlassWater,
  Beer,
  Wine,
  Martini,
  IceCreamCone,
  IceCreamBowl,
  CakeSlice,
  Cake,
  Cookie,
  Croissant,
  Donut,
  Candy,
  Apple,
  Banana,
  Cherry,
  Citrus,
  Grape,
  Baby,
  Users,
  Star,
  Sparkles,
  Flame,
  Store,
  ShoppingBag,
  PackagePlus,
};
