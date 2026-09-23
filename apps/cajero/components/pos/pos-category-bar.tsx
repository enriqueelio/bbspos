"use client";

import type { ComponentType } from "react";
import {
  Baby,
  Beef,
  Bird,
  Cake,
  CakeSlice,
  CupSoda,
  Drumstick,
  GlassWater,
  IceCreamCone,
  PackagePlus,
  Popcorn,
  Salad,
  Sandwich,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { MenuCategory } from "@bbspos/types";

/** Identificador del panel de Bubble Drinks (pseudo-categoría del POS). */
const BUBAS_PANE = "BUBAS";
// Sandwiches y Paninis se fusionan en un solo botón de la barra.
const SANDWICHES_PANE = "SANDWICHES";

/** Ícono de hamburguesa (lucide "hamburger"); no existe en la versión instalada
 *  de lucide-react, así que se define con sus mismas paths para mantener el
 *  estilo stroke de lucide. */
function HamburgerIcon({ className }: { className?: string }) {
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
    >
      <path d="M12 16H4a2 2 0 1 1 0-4h16a2 2 0 1 1 0 4h-4.25" />
      <path d="M5 12a2 2 0 0 1-2-2 9 7 0 0 1 18 0 2 2 0 0 1-2 2" />
      <path d="M5 16a2 2 0 0 0-2 2 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 2 2 0 0 0-2-2q0 0 0 0" />
      <path d="m6.67 12 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2" />
    </svg>
  );
}

/** Ícono representativo por panel (identidad visual de un vistazo). */
const PANE_ICON: Partial<Record<string, ComponentType<{ className?: string }>>> =
  {
    [MenuCategory.MILANESA]: UtensilsCrossed,
    [SANDWICHES_PANE]: Sandwich,
    [MenuCategory.HAMBURGUESA]: HamburgerIcon,
    [MenuCategory.LOMO]: Beef,
    [MenuCategory.POLLO]: Bird,
    [MenuCategory.ALITA]: Drumstick,
    [MenuCategory.ENSALADA]: Salad,
    [MenuCategory.PIQUEO]: Popcorn,
    [MenuCategory.COMPARTIR]: Users,
    [MenuCategory.KIDS]: Baby,
    [MenuCategory.POSTRE]: IceCreamCone,
    [MenuCategory.WAFFLE]: CakeSlice,
    [MenuCategory.PANCAKE]: Cake,
    [MenuCategory.EXTRAS]: PackagePlus,
    [MenuCategory.BEBIDA]: GlassWater,
    [BUBAS_PANE]: CupSoda,
  };

/** Tinte de color del ícono en estado inactivo (las categorías sin tinte usan el
 *  neutro). En estado seleccionado el ícono se pinta de blanco. */
const PANE_ICON_COLOR: Partial<Record<string, string>> = {
  [MenuCategory.MILANESA]: "text-amber-300",
  [MenuCategory.ALITA]: "text-red-300",
  [MenuCategory.BEBIDA]: "text-sky-300",
  [MenuCategory.HAMBURGUESA]: "text-orange-300",
  [MenuCategory.POSTRE]: "text-pink-300",
};

/** Tarjeta de categoría: fondo oscuro sutil, borde elegante, hover suave y
 *  estado activo de alto contraste con el acento esmeralda del tema. */
const CATEGORY_CARD = {
  base: "relative inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border px-2 text-xs font-bold capitalize tracking-wide transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30",
  selected:
    "border-success bg-success/15 text-white shadow-md shadow-success/25",
  idle: "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80 hover:text-white",
};

/** Badge del atajo de teclado (teclas 1-9): visible solo en los primeros 9
 *  panes de la barra, la misma numeración que usa el listener de teclado. */
function ShortcutBadge({
  index,
  selected,
}: {
  index: number;
  selected: boolean;
}) {
  return (
    <span
      className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border font-mono text-[9px] leading-none ${
        selected
          ? "border-success/60 text-white"
          : "border-slate-600 text-slate-500"
      }`}
    >
      {index + 1}
    </span>
  );
}

export function PosCategoryBar({
  panes,
  activeKey,
  onSwitch,
}: {
  panes: { key: string; label: string }[];
  activeKey: string;
  onSwitch: (key: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950 py-2">
      <div className="grid grid-cols-5 justify-items-stretch gap-2 px-4">
        {panes.map((pane, index) => {
          const selected = pane.key === activeKey;
          const Icon = PANE_ICON[pane.key];
          return (
            <button
              key={pane.key}
              type="button"
              title={pane.label}
              onClick={() => onSwitch(pane.key)}
              className={`${CATEGORY_CARD.base} ${
                selected ? CATEGORY_CARD.selected : CATEGORY_CARD.idle
              }`}
            >
              {Icon && (
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    selected
                      ? "text-white"
                      : (PANE_ICON_COLOR[pane.key] ?? "text-slate-400")
                  }`}
                />
              )}
              <span className="leading-tight line-clamp-2">{pane.label}</span>
              {index <= 8 && <ShortcutBadge index={index} selected={selected} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}