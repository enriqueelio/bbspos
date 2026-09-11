/* Regenera data/productos-tiempo.json con todos los productos (menú a la
 * carta, bebidas, extras) y un tiempo de producción por defecto por categoría.
 * Los almuerzos (Menú del Día) quedan fuera, igual que en el Excel de tiempos.
 * Uso: tsx scripts-gen/generate-productos-tiempo.ts */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/index";

process.env.DATABASE_URL ??= `file:${path
  .resolve(path.dirname(fileURLToPath(import.meta.url)), "../prisma/dev.db")
  .replace(/\\/g, "/")}`;

const OUT = "C:/Users/lelio/Documents/bbspos/data/productos-tiempo.json";

/** Minutos por defecto según la categoría del menú. */
const CATEGORY_DEFAULT: Record<string, number> = {
  SANDWICH: 5,
  PANINI: 5,
  ENSALADA: 5,
  PIQUEO: 8,
  COMPARTIR: 15,
  ALITA: 12,
  HAMBURGUESA: 8,
  MILANESA: 12,
  LOMO: 12,
  POLLO: 10,
  KIDS: 5,
  POSTRE: 5,
  WAFFLE: 6,
  PANCAKE: 6,
  EXTRAS: 2,
  BEBIDA: 5,
};

const FALLBACK_MINUTES = 10;

async function main() {
  const [menu, toppings] = await Promise.all([
    prisma.menuItem.findMany({
      where: { category: { not: "ALMUERZO" } },
      orderBy: { category: "asc" },
      select: { name: true, category: true },
    }),
    prisma.topping.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  const data: Record<string, number> = {
    // Ejemplos base (incluyen aunque ahora no exista pizza en el catálogo).
    Hamburguesa: 8,
    Pizza: 15,
    // Base para todas las bebidas de té (sabor × tamaño × boba).
    "Bubble Tea": 5,
  };

  for (const mi of menu) {
    data[mi.name] = CATEGORY_DEFAULT[mi.category] ?? FALLBACK_MINUTES;
  }
  for (const t of toppings) {
    data[t.name] = 1;
  }

  writeFileSync(
    OUT,
    JSON.stringify(
      data,
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`OK: ${Object.keys(data).length} productos -> ${OUT}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});