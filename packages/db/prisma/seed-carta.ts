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

function parseAlitas(header: string, name: string, price: number): ParsedItem {
  const m = name.match(/(\d+)\s*Unidades?/i);
  const n = m ? m[1] : name;
  return {
    name: header === "ALITAS MIXTAS" ? `Alitas Mixtas (${n} Unidades)` : `Alitas (${n} Unidades)`,
    category: PrismaMenuCategory.ALITA,
    price,
    description: header === "ALITAS MIXTAS" ? "2 salsas a elecci\u00f3n. Acompa\u00f1adas de papas fritas y salsa de la casa." : "",
    options: [],
  };
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

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "BIBOSI" || line === "Calidad que se disfruta") continue;

    if (line.startsWith("-")) {
      if (!currentCategory) continue;
      const isMilanesas = currentHeader === "MILANESAS";
      const isAlitas = currentHeader === "ALITAS" || currentHeader === "ALITAS MIXTAS";

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
      const description = clean(m[3].replace(/^[:.\s]+/, ""));

      if (isAlitas) {
        items.push(parseAlitas(currentHeader!, name, price));
        continue;
      }

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
      currentCategory = matched;
      currentHeader = line;
      continue;
    }
    if (line.startsWith("PANCAKES")) {
      currentCategory = PrismaMenuCategory.PANCAKE;
      currentHeader = "PANCAKES";
      continue;
    }
  }

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });