import { PrismaClient, MenuCategory as PrismaMenuCategory } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

const TXT_PATH = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "indicaciones",
  "menu_bibosi.txt",
);

interface ParsedItem {
  name: string;
  category: PrismaMenuCategory;
  price: number;
  description: string;
  options: { name: string; price: number }[];
}

const HEADER_TO_CATEGORY: Record<string, PrismaMenuCategory> = {
  "SANDWICHES DE MILANESA": PrismaMenuCategory.SANDWICH,
  "PANINIS": PrismaMenuCategory.PANINI,
  "ENSALADAS": PrismaMenuCategory.ENSALADA,
  "PIQUEOS": PrismaMenuCategory.PIQUEO,
  "PARA COMPARTIR": PrismaMenuCategory.COMPARTIR,
  "ALITAS": PrismaMenuCategory.ALITA,
  "ALITAS MIXTAS": PrismaMenuCategory.ALITA,
  "HAMBURGUESAS": PrismaMenuCategory.HAMBURGUESA,
  "MILANESAS": PrismaMenuCategory.MILANESA,
  "LOMOS": PrismaMenuCategory.LOMO,
  "POLLOS": PrismaMenuCategory.POLLO,
  "MEN\u00da KIDS": PrismaMenuCategory.KIDS,
  "POSTRES Y HELADOS": PrismaMenuCategory.POSTRE,
  "BUBBLE WAFFLES": PrismaMenuCategory.WAFFLE,
  "PANCAKES": PrismaMenuCategory.PANCAKE,
  "TOPPINGS Y JALEAS": PrismaMenuCategory.EXTRAS,
  "BEBIDAS": PrismaMenuCategory.BEBIDA,
};

const GENERAL_RE = /^-\s*(.+?)\s*-\s*(\d+(?:[.,]\d+)?)\s*BS\.?\s*(.*)$/i;
const MILANESA_DUAL_RE =
  /^-\s*(.+?):\s*Pollo\s*-\s*(\d+)\s*BS\s*\/\s*Res\s*-\s*(\d+)\s*BS\.?\s*(.*)$/i;
const MILANESA_SINGLE_RE =
  /^-\s*(.+?):\s*Pollo\s*-\s*(\d+)\s*BS\.?\s*(.*)$/i;

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Sabores (salsas) de las alitas simples. Cada uno es un plato de la carta
 *  con sus tamaños como variantes: 6 Unidades (base) y 8 Unidades. */
const ALITA_FLAVORS = [
  "Miel y Mostaza",
  "Barbacoa",
  "Barbacoa Picante",
  "Buffalo",
  "Agridulce",
  "Crocantes",
] as const;

interface AlitaSizes {
  header: "ALITAS" | "ALITAS MIXTAS";
  sizes: { units: string; price: number }[];
}

/** Convierte una sección de alitas del menú en platillos agrupados por sabor.
 *  ALITAS: un plato por salsa con 6/8 Unidades como opciones de precio.
 *  ALITAS MIXTAS: un solo plato con 6/8/12 Unidades y salsas a elección. */
function pushAlitasGroup(items: ParsedItem[], group: AlitaSizes) {
  if (group.sizes.length === 0) return;
  if (group.header === "ALITAS") {
    for (const flavor of ALITA_FLAVORS) {
      items.push({
        name: `Alitas ${flavor}`,
        category: PrismaMenuCategory.ALITA,
        price: Math.min(...group.sizes.map((s) => s.price)),
        description:
          "Acompañadas de papas fritas y salsa de la casa.",
        options: group.sizes.map((s) => ({
          name: `${s.units} Unidades`,
          price: s.price,
        })),
      });
    }
    return;
  }
  items.push({
    name: "Alitas Mixtas",
    category: PrismaMenuCategory.ALITA,
    price: Math.min(...group.sizes.map((s) => s.price)),
    description:
      "2 salsas a elección (6 y 8 unidades) o 3 salsas (12 unidades). Acompañadas de papas fritas y salsa de la casa.",
    options: group.sizes.map((s) => ({
      name: `${s.units} Unidades`,
      price: s.price,
    })),
  });
}

const EXTRAS_ITEMS: ParsedItem[] = [
  {
    name: "Helado",
    category: PrismaMenuCategory.EXTRAS,
    price: 15,
    description: "Porci\u00f3n de helado como extra.",
    options: [],
  },
  {
    name: "Topping extra",
    category: PrismaMenuCategory.EXTRAS,
    price: 5,
    description: "Topping adicional a elecci\u00f3n: Frutilla, Durazno, Banana, Oreo, Chubi, Chocolate, Gomitas, Chispas de chocolate.",
    options: [],
  },
  {
    name: "Crema",
    category: PrismaMenuCategory.EXTRAS,
    price: 5,
    description: "Porci\u00f3n extra de crema.",
    options: [],
  },
  {
    name: "Jalea extra",
    category: PrismaMenuCategory.EXTRAS,
    price: 5,
    description: "Jalea adicional: Salsa de chocolate, Frutilla, Dulce de leche, Miel o Leche condensada.",
    options: [],
  },
];

function parseFile(): ParsedItem[] {
  const text = readFileSync(TXT_PATH, "utf8");
  const lines = text.split(/\r?\n/);

  const items: ParsedItem[] = [];
  let currentCategory: PrismaMenuCategory | null = null;
  let currentHeader: string | null = null;
  // Las alitas se acumulan por sección: los tamaños vienen en líneas separadas
  // y se agrupan por sabor al terminar la sección (siguiente encabezado o fin).
  let pendingAlitas: AlitaSizes | null = null;

  const flushAlitas = () => {
    if (pendingAlitas) {
      pushAlitasGroup(items, pendingAlitas);
      pendingAlitas = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "BIBOSI" || line === "Calidad que se disfruta") continue;

    if (line.startsWith("-")) {
      if (!currentCategory) continue;
      const isMilanesas = currentHeader === "MILANESAS";
      const isAlitas =
        currentHeader === "ALITAS" || currentHeader === "ALITAS MIXTAS";

      if (isMilanesas) {
        const dual = line.match(MILANESA_DUAL_RE);
        if (dual) {
          const name = clean(dual[1]);
          const pollo = Number(dual[2]);
          const res = Number(dual[3]);
          items.push({
            name,
            category: PrismaMenuCategory.MILANESA,
            price: Math.min(pollo, res),
            description: clean(dual[4]),
            options: [
              { name: "Pollo", price: pollo },
              { name: "Res", price: res },
            ],
          });
          continue;
        }
        const single = line.match(MILANESA_SINGLE_RE);
        if (single) {
          items.push({
            name: clean(single[1]),
            category: PrismaMenuCategory.MILANESA,
            price: Number(single[2]),
            description: clean(single[3]),
            options: [{ name: "Pollo", price: Number(single[2]) }],
          });
          continue;
        }
        continue;
      }

      const m = line.match(GENERAL_RE);
      if (!m) continue;
      const name = clean(m[1]);
      const price = Number(m[2]);

      if (isAlitas) {
        const units = m[1].match(/(\d+)\s*Unidades?/i)?.[1] ?? m[1];
        if (!pendingAlitas) {
          pendingAlitas = { header: currentHeader as AlitaSizes["header"], sizes: [] };
        }
        pendingAlitas.sizes.push({ units, price });
        continue;
      }

      const description = clean(m[3].replace(/^[:.\s]+/, ""));

      items.push({
        name,
        category: currentCategory,
        price,
        description,
        options: [],
      });
      continue;
    }

    const matched = HEADER_TO_CATEGORY[line];
    if (matched) {
      flushAlitas();
      currentCategory = matched;
      currentHeader = line;
      continue;
    }
    if (line.startsWith("PANCAKES")) {
      flushAlitas();
      currentCategory = PrismaMenuCategory.PANCAKE;
      currentHeader = "PANCAKES";
      continue;
    }
  }

  flushAlitas();

  return items;
}

async function keepOrUpdate(item: ParsedItem) {
  const existing = await prisma.menuItem.findFirst({
    where: { name: item.name, category: item.category },
    include: { options: true },
  });

  const data = {
    category: item.category,
    price: item.price,
    description: item.description || null,
    available: true,
    enMenuDelDia: false,
    menuDelDiaDate: null,
  };

  if (existing) {
    let changed = false;
    if (
      existing.price !== item.price ||
      existing.description !== (item.description || null)
    ) {
      changed = true;
    }
    const existingOptions = existing.options.map((o) => `${o.name}:${o.price}`).sort().join("|");
    const newOptions = item.options.map((o) => `${o.name}:${o.price}`).sort().join("|");
    if (existingOptions !== newOptions) {
      changed = true;
      await prisma.menuItemOption.deleteMany({ where: { menuItemId: existing.id } });
      if (item.options.length > 0) {
        await prisma.menuItemOption.createMany({
          data: item.options.map((o) => ({
            menuItemId: existing.id,
            name: o.name,
            price: o.price,
          })),
        });
      }
    }
    if (changed || !existing.available) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data,
      });
    }
    return "updated";
  }

  await prisma.menuItem.create({
    data: {
      ...data,
      name: item.name,
      options: {
        create: item.options.map((o) => ({ name: o.name, price: o.price })),
      },
    },
  });
  return "created";
}

async function main() {
  const parsed = parseFile();
  const withExtras = [...parsed, ...EXTRAS_ITEMS];

  // Las alitas pasaron de "Alitas (N Unidades)" genéricas a platillos por
  // sabor con los tamaños como variantes: se descartan los nombres antiguos.
  const removedAlitas = await prisma.menuItem.deleteMany({
    where: {
      category: PrismaMenuCategory.ALITA,
      name: { endsWith: "Unidades)" },
    },
  });

  let created = 0;
  let updated = 0;
  for (const item of withExtras) {
    const result = await keepOrUpdate(item);
    if (result === "created") created++;
    else updated++;
  }

  const cartaCount = await prisma.menuItem.count({
    where: { category: { not: PrismaMenuCategory.ALMUERZO } },
  });
  const availableCount = await prisma.menuItem.count({
    where: { category: { not: PrismaMenuCategory.ALMUERZO }, available: true },
  });
  const optionCount = await prisma.menuItemOption.count();

  console.log(`Items parseados del txt: ${parsed.length}`);
  console.log(`Alitas genéricas antiguas eliminadas: ${removedAlitas.count}`);
  console.log(`Creados: ${created} | Actualizados: ${updated}`);
  console.log(`==> Carta (no ALMUERZO) en DB: ${cartaCount} (disponibles: ${availableCount})`);

  const byCategory = await prisma.menuItem.groupBy({
    by: ["category"],
    where: { category: { not: PrismaMenuCategory.ALMUERZO }, available: true },
    _count: { _all: true },
  });
  for (const row of byCategory) {
    console.log(`  - ${row.category}: ${row._count._all} platos`);
  }
  console.log(`==> Variantes (MenuItemOption) registradas: ${optionCount}`);

  const milanesas = await prisma.menuItem.findMany({
    where: { category: PrismaMenuCategory.MILANESA },
    include: { options: true },
    orderBy: { name: "asc" },
  });
  for (const m of milanesas) {
    console.log(`  Milanesa ${m.name}: ${m.options.map((o) => `${o.name} ${o.price}`).join(" / ")}`);
  }

  const alitas = await prisma.menuItem.findMany({
    where: { category: PrismaMenuCategory.ALITA },
    include: { options: true },
    orderBy: { name: "asc" },
  });
  for (const a of alitas) {
    console.log(`  Alita ${a.name}: ${a.options.map((o) => `${o.name} ${o.price}`).join(" / ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });