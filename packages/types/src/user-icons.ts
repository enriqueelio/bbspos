/** Catálogo centralizado de íconos para identificación de usuarios (iconos.txt §2/§19).
 *  Única definición de iconKey -> metadata visual; reutilizable desde:
 *  - Admin > Usuarios
 *  - tarjeta de pedido (cajero)
 *  - historial y detalle de pedido
 *  - tooltip
 *
 *  Restricciones (definidas en iconos.txt):
 *  - No tienen relación con comida, bebidas o productos.
 *  - Preferentemente animales y símbolos neutros.
 *  - La unicidad entre usuarios activos se valida en backend.
 *
 *  Cada clave tiene su equivalente en lucide-react (iconos.txt §2: "no es necesario
 *  utilizar literalmente estos nombres si la librería existente tiene equivalentes").
 *  El componente se define una sola vez en packages/ui/src/components/user-icon.tsx.
 */

export const ICON_CATALOG = [
  "cat",
  "dog",
  "bird",
  "rabbit",
  "turtle",
  "snail",
  "fish",
  "mouse",
  "rat",
  "squirrel",
  "bug",
  "worm",
] as const;

export type IconKey = (typeof ICON_CATALOG)[number];

export const ICON_LABELS: Record<IconKey, string> = {
  cat: "Gato",
  dog: "Perro",
  bird: "Pájaro",
  rabbit: "Conejo",
  turtle: "Tortuga",
  snail: "Caracol",
  fish: "Pez",
  mouse: "Ratón",
  rat: "Rata",
  squirrel: "Ardilla",
  bug: "Escarabajo",
  worm: "Gusato",
};

export const ICON_COLORS: Record<IconKey, string> = {
  cat: "#F687B3",
  dog: "#4A90E2",
  bird: "#3B82F6",
  rabbit: "#00C853",
  turtle: "#20C997",
  snail: "#A97CA6",
  fish: "#14B8A6",
  mouse: "#6C757D",
  rat: "#495057",
  squirrel: "#ED8936",
  bug: "#F59E0B",
  worm: "#83C5BE",
};

/** Emoji equivalente: se usa solo donde no se puede dibujar el trazo lucide
 *  (opciones de <select>, celdas de texto del admin). La cola del cajero usa
 *  el componente lucide real (UserIcon en packages/ui). */
export const ICON_EMOJI: Record<IconKey, string> = {
  cat: "🐱",
  dog: "🐶",
  bird: "🐦",
  rabbit: "🐰",
  turtle: "🐢",
  snail: "🐌",
  fish: "🐟",
  mouse: "🐭",
  rat: "🐀",
  squirrel: "🐿️",
  bug: "🐞",
  worm: "🪱",
};

/** Emoji para un iconKey arbitrario; claves desconocidas o nulas → persona neutra. */
export function iconEmojiOf(key?: string | null): string {
  return key && key in ICON_EMOJI ? ICON_EMOJI[key as IconKey] : "👤";
}
