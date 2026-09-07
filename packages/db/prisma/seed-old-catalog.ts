import { PrismaClient, MenuCategory } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

const EXTRACT_PATH = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "indicaciones",
  "extracto-catalogo-almuerzos.txt",
);

function readQuoted(txt: string, i: number): { value: string; idx: number } {
  i++;
  let out = "";
  const n = txt.length;
  while (i < n) {
    const c = txt.charCodeAt(i);
    if (c === 92) {
      const nxt = txt[i + 1];
      if (nxt === "0") out += "\0";
      else if (nxt === "n") out += "\n";
      else if (nxt === "r") out += "\r";
      else if (nxt === "t") out += "\t";
      else if (nxt === "b") out += "\b";
      else if (nxt === "Z") out += "\x1a";
      else out += nxt;
      i += 2;
      continue;
    }
    if (c === 39) return { value: out, idx: i + 1 };
    out += txt[i];
    i++;
  }
  return { value: out, idx: i };
}

interface Tuple {
  values: string[];
}

function parseTuplesWithQuoted(body: string): Tuple[] {
  const tuples: Tuple[] = [];
  const n = body.length;
  let i = 0;
  while (i < n) {
    const c = body.charCodeAt(i);
    if (c === 32 || c === 44 || c === 59) {
      i++;
      continue;
    }
    if (c !== 40) {
      i++;
      continue;
    }
    i++;
    const values: string[] = [];
    while (i < n) {
      const cc = body.charCodeAt(i);
      if (cc === 32) {
        i++;
        continue;
      }
      if (cc === 44) {
        i++;
        continue;
      }
      if (cc === 41) {
        i++;
        break;
      }
      if (cc === 39) {
        const r = readQuoted(body, i);
        values.push(r.value);
        i = r.idx;
      } else {
        let j = i;
        while (j < n) {
          const cj = body.charCodeAt(j);
          if (cj === 44 || cj === 41) break;
          j++;
        }
        values.push(body.slice(i, j));
        i = j;
      }
    }
    tuples.push({ values });
  }
  return tuples;
}

function parseExtract(): {
  categories: Map<string, number>;
  products: { id: number; name: string; category: string; price: number; estado: number }[];
} {
  const text = readFileSync(EXTRACT_PATH, "utf8");
  const lines = text.split(/\r?\n/);

  const categories = new Map<string, number>();
  const products: { id: number; name: string; category: string; price: number; estado: number }[] = [];

  for (const line of lines) {
    const m = line.match(/^INSERT INTO `(\w+)` VALUES(.*)$/);
    if (!m) continue;
    const t = m[1];
    let body = m[2];
    const semi = body.lastIndexOf(";");
    if (semi >= 0) body = body.slice(0, semi);
    const tuples = parseTuplesWithQuoted(body);
    for (const tu of tuples) {
      if (t === "categoria") {
        // 0=idCategoria, 1=texto, ..., 14=estado
        categories.set(tu.values[1] ?? "", Number(tu.values[14]));
      } else if (t === "producto") {
        // 0=idProducto, 1=descripcion, 2=categoria, 4=precio, 14=estado
        products.push({
          id: Number(tu.values[0]),
          name: (tu.values[1] ?? "").trim(),
          category: tu.values[2] ?? "",
          price: Number(tu.values[4]),
          estado: Number(tu.values[14]),
        });
      }
    }
  }

  return { categories, products };
}

async function main() {
  const { categories, products } = parseExtract();

  const activeCategories = new Set<string>();
  for (const [name, estado] of categories) {
    if (estado === 1) activeCategories.add(name);
  }

  const almuerzos = products.filter((p) => p.category === "ALMUERZO" && activeCategories.has("ALMUERZO"));

  const byName = new Map<string, typeof almuerzos>();
  for (const p of almuerzos) {
    const key = p.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(p);
  }

  const picks: typeof almuerzos = [];
  for (const list of byName.values()) {
    const sorted = [...list].sort((a, b) => {
      if (b.estado !== a.estado) return b.estado - a.estado;
      return b.id - a.id;
    });
    picks.push(sorted[0]);
  }

  picks.sort((a, b) => a.id - b.id);

  const existing = await prisma.menuItem.findMany({
    where: { category: MenuCategory.ALMUERZO },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((m) => m.name));

  let created = 0;
  let updated = 0;

  for (const p of picks) {
    const data = {
      category: MenuCategory.ALMUERZO,
      price: p.price,
      available: p.estado === 1,
      enMenuDelDia: false,
      menuDelDiaDate: null,
    };
    if (existingNames.has(p.name)) {
      await prisma.menuItem.updateMany({
        where: { category: MenuCategory.ALMUERZO, name: p.name },
        data,
      });
      updated++;
    } else {
      await prisma.menuItem.create({ data: { name: p.name, ...data } });
      created++;
    }
  }

  const total = await prisma.menuItem.count({ where: { category: MenuCategory.ALMUERZO } });
  const totalAvailable = await prisma.menuItem.count({
    where: { category: MenuCategory.ALMUERZO, available: true },
  });

  console.log(`Productos parseados: ${products.length}`);
  console.log(`Categorías activas: ${activeCategories.size}`);
  console.log(`Categorías inactivas: ${categories.size - activeCategories.size}`);
  console.log(`Almuerzos históricos (categoría ALMUERZO): ${almuerzos.length}`);
  console.log(`Nombres únicos con dedup (activo>id mayor): ${picks.length}`);
  console.log(`Creados: ${created} | Actualizados: ${updated}`);
  console.log(`==> MenuItem categoría ALMUERZO en DB: ${total} (disponibles available=true: ${totalAvailable})`);

  const activos = picks.filter((p) => p.estado === 1);
  console.log("Almuerzos disponibles migrados:");
  for (const a of activos) console.log(`  - ${a.name} | ${a.price} Bs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });