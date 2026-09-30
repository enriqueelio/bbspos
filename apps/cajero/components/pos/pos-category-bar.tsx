"use client";

import type { ComponentType } from "react";
import {
  ArrowLeft,
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
 *  estado activo de alto contraste con el acento esmeralda del tema. La
 *  esquina queda libre a propósito: el número de unidades del almuerzo que se
 *  muestra en las tarjetas de la grilla se lee como dato de esa tarjeta, y no
 *  como un número de acceso rápido de la barra.
 *
 *  La fila cambia de layout según el estado. Sin categoría seleccionada
 *  (`activeKey === null`) es una cuadrícula de 5 columnas y todas las tarjetas
 *  ocupan su celda, que es la lectura uniforme de un vistazo. Al abrir una
 *  categoría pasa a flex: la tarjeta abierta se mide por su contenido y las
 *  demás son cuadrados fijos que no crecen, agrupados sin los huecos que dejaba
 *  la retícula al encogerse.
 *
 *  `transition-colors`, y no `transition-all`, por una razón medida. La tarjeta
 *  del estado inicial lleva `w-full`, o sea `width: 100%`: un porcentaje que se
 *  resuelve distinto según el bloque contenedor. Al abrir una categoría el
 *  contenedor pasa de `display: grid` a `display: flex` en el mismo frame en que
 *  la tarjeta cambia de `w-full` a `w-12`, así que ese `100%` pasa a resolver
 *  contra el flex completo (807px en lugar de los 155px de la celda) y la
 *  transición arrancaba desde ahí. Lo medido: los 15 íconos salían ocupando
 *  807px, uno por fila (17 filas, barra de 1041px) y se encogían en 300ms,
 *  arrastrando a los productos 900px hacia arriba. Aquí solo se animan los
 *  colores, así que el cambio de tamaño es instantáneo y no se ve. El `onClick`
 *  tampoco cambia y la tarjeta encogida sigue siendo pulsable, para cambiar de
 *  categoría de un solo clic.
 *
 *  `focus:outline-none` no es decoración: sin atajos de teclado la sección se
 *  elige con el clic, y el anillo de foco que dibuja el navegador (blanco sobre
 *  este fondo) saltaba a la vista en cuanto el cajero apretaba cualquier tecla
 *  después de elegir, haciendo creer que el borde había cambiado de color. Es el
 *  mismo tratamiento que ya reciben los campos de texto del POS. */
const CATEGORY_CARD = {
  base: "inline-flex items-center justify-center gap-2 rounded-xl border text-xs font-bold capitalize tracking-wide transition-colors duration-150 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-30",
  // Todas las tarjetas miden 48px de alto en los tres estados (inicial, abierta
  // y encogida) a propósito. Con la abierta en 56px, abrir una categoría hacía
  // crecer la barra 8px y empujaba los productos hacia abajo; con la fila fija
  // el alto, abrir y cerrar no mueve nada y el cambio de tamaño se lee como un
  // estado más, no como un empujón.
  //
  // Cuadrícula (estado inicial): la tarjeta ocupa su celda y queda uniforme.
  expandedIdle: "h-12 w-full px-2",
  // Flex (con categoría abierta): la abierta se mide por su texto y las demás son
  // cuadrados fijos. `w-full` y `justify-self-center` sobran aquí: en flex el
  // ancho lo fija el propio cuadrado. `h-12` en vez de `min-h-12` para que el
  // texto largo no estire la tarjeta y desalinee la fila.
  expandedActive: "h-12 shrink-0 px-6",
  collapsed: "h-12 w-12 shrink-0 px-0",
  back: "h-12 w-12 shrink-0 px-0",
  selected:
    "border-success bg-success/15 text-white shadow-md shadow-success/25",
  idle: "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80 hover:text-white",
};

export function PosCategoryBar({
  panes,
  activeKey,
  onSwitch,
  onBack,
}: {
  panes: { key: string; label: string }[];
  /** Categoría abierta, o null cuando la fila está en su estado inicial. */
  activeKey: string | null;
  onSwitch: (key: string) => void;
  /** Cierra la categoría abierta y vuelve a mostrar todas las tarjetas grandes. */
  onBack: () => void;
}) {
  const isIdle = activeKey === null;
  return (
    <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950 py-2">
      {/* El contenedor cambia de layout con el estado: la retícula de 5 columnas
          deja huecos enormes en cuanto las tarjetas se encogen a 48px, así que
          en el estado activo se agrupan en flex, que las junta sin huecos. */}
      <div
        className={
          isIdle
            ? "grid grid-cols-5 justify-items-stretch gap-2 px-4"
            : "flex flex-wrap items-center gap-3 px-4"
        }
      >
        {panes.map((pane) => {
          const selected = pane.key === activeKey;
          const Icon = PANE_ICON[pane.key];
          // Con una categoría abierta solo esa tarjeta conserva el texto; el
          // título sigue en `title`/`aria-label` para que el ícono encogido se
          // pueda identificar al pasar el mouse o con lector de pantalla. Un
          // clic sobre la que ya está abierta la cierra, igual que el botón
          // "Volver", así que el `onClick` no cambia: la barra no distingue
          // abrir de cerrar, el estado decide.
          const showLabel = isIdle || selected;
          return (
            <button
              key={pane.key}
              type="button"
              title={selected ? `${pane.label} (clic para volver)` : pane.label}
              aria-label={pane.label}
              aria-pressed={selected}
              onClick={() => onSwitch(pane.key)}
              className={`${CATEGORY_CARD.base} ${
                showLabel
                  ? isIdle
                    ? CATEGORY_CARD.expandedIdle
                    : CATEGORY_CARD.expandedActive
                  : CATEGORY_CARD.collapsed
              } ${selected ? CATEGORY_CARD.selected : CATEGORY_CARD.idle}`}
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
              {showLabel && (
                <span className="leading-tight line-clamp-2">{pane.label}</span>
              )}
            </button>
          );
        })}

        {/* Salir del estado categorical: sin categoría seleccionada el bloque de
            productos de abajo no se renderiza y todas las tarjetas recuperan su
            tamaño completo. Va al final de la fila, en rojo y con el mismo
            cuadrado de las tarjetas encogidas para que se lea como salida y no
            como una categoría más. Solo flecha: el texto estorba en una fila de
            cuadrados; el nombre queda en `title` y `aria-label`. */}
        {!isIdle && (
          <button
            type="button"
            title="Volver"
            aria-label="Volver"
            onClick={onBack}
            className={`${CATEGORY_CARD.base} ${CATEGORY_CARD.back} border-red-900/70 bg-red-950/30 text-red-200 hover:border-red-700 hover:bg-red-900/40`}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}