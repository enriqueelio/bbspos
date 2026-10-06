import {
  Bird,
  Bug,
  Cat,
  Dog,
  Fish,
  Mouse,
  PawPrint,
  Rabbit,
  Rat,
  Snail,
  Squirrel,
  Turtle,
  Worm,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@bbspos/types";
import { cn } from "../lib/utils";

/** iconos.txt §19: única definición iconKey → componente lucide-react.
 *  Trazo consistente con el resto de la interfaz del POS; un icono por clave,
 *  sin duplicados (el sprite de animales disponibles de lucide-react). */
const ICON_COMPONENTS: Record<IconKey, LucideIcon> = {
  cat: Cat,
  dog: Dog,
  bird: Bird,
  rabbit: Rabbit,
  turtle: Turtle,
  snail: Snail,
  fish: Fish,
  mouse: Mouse,
  rat: Rat,
  squirrel: Squirrel,
  bug: Bug,
  worm: Worm,
};

/** Icono de identidad del usuario (iconKey de User). Claves desconocidas o
 *  nulas → huella neutra. Tamaño estándar h-4 w-4, sobreescribible con className. */
export function UserIcon({
  iconKey,
  className,
}: {
  iconKey?: string | null;
  className?: string;
}) {
  const Icon =
    iconKey && iconKey in ICON_COMPONENTS
      ? ICON_COMPONENTS[iconKey as IconKey]
      : PawPrint;
  return (
    <Icon className={cn("h-4 w-4 shrink-0", className)} aria-hidden="true" />
  );
}
