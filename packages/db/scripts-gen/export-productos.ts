/* Exporta el catálogo de productos a un .xlsx con una columna en blanco para
 * asignar el tiempo de producción. Uso: tsx scripts-gen/export-productos.ts */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { prisma } from "../src/index";

const require = createRequire(import.meta.url);

process.env.DATABASE_URL ??= `file:${path
  .resolve(path.dirname(fileURLToPath(import.meta.url)), "../prisma/dev.db")
  .replace(/\\/g, "/")}`;

const XLSX = require("C:/Users/lelio/Documents/bbspos/apps/admin/node_modules/xlsx");

const OUT = "C:/Users/lelio/Documents/bbspos/informes/productos-tiempos-produccion.xlsx";

const CATEGORY_LABEL: Record<string, string> = {
  MILK: "Leche",
  WATER: "Agua / Té",
  SPECIAL: "Especial",
};

const MENU_LABEL: Record<string, string> = {
  ALMUERZO: "Almuerzo",
  SANDWICH: "Sándwich",
  PANINI: "Panini",
  ENSALADA: "Ensalada",
  PIQUEO: "Piqueo",
  COMPARTIR: "Para compartir",
  ALITA: "Alitas",
  HAMBURGUESA: "Hamburguesa",
  MILANESA: "Milanesa",
  LOMO: "Lomo",
  POLLO: "Pollo",
  KIDS: "Kids",
  POSTRE: "Postre",
  WAFFLE: "Waffle",
  PANCAKE: "Panqueque",
  EXTRAS: "Extras",
  BEBIDA: "Bebida",
};

function st(title: string, rows: unknown[][], widths: number[], timeIdx: number) {
  const titleRow: unknown[] = [];
  titleRow[0] = title;
  const ws = XLSX.utils.aoa_to_sheet([titleRow, ...rows]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: rows[0].length - 1 } }];
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const header = 1;
  for (let c = 0; c < rows[0].length; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: header, c })];
    if (cell) {
      cell.s = {
        fill: { fgColor: { rgb: "7C3AED" } },
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { vertical: "center" },
      };
    }
  }
  ws["!cols"] = widths.map((wch) => ({ wch }));
  for (let r = header + 1; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: timeIdx });
    const cell = ws[addr];
    if (cell)
      cell.s = {
        fill: { fgColor: { rgb: "FEF3C7" } },
        alignment: { horizontal: "center" },
      };
  }
  ws["!freeze"] = { xSplit: 0, ySplit: header + 1 };
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: header, c: 0 },
      e: { r: range.e.r, c: rows[0].length - 1 },
    }),
  };
  return ws;
}

async function main() {
  const [drinkPrices, flavors, toppings, menuItems] = await Promise.all([
    prisma.drinkPrice.findMany({ include: { size: true, bobaType: true } }),
    prisma.flavor.findMany({ include: { categories: true } }),
    prisma.topping.findMany(),
    prisma.menuItem.findMany({ include: { options: true } }),
  ]);

  const bebidas: unknown[][] = drinkPrices.map((p) => [
    CATEGORY_LABEL[p.category] ?? p.category,
    p.size.name,
    String(p.size.oz),
    p.bobaType.name,
    p.price,
    p.available && p.size.available && p.bobaType.available ? "Sí" : "No",
    "",
  ]);
  bebidas.sort((a, b) => {
    const cat = String(a[0]).localeCompare(String(b[0]));
    if (cat !== 0) return cat;
    const oz = Number(a[2]) - Number(b[2]);
    return oz !== 0 ? oz : String(a[3]).localeCompare(String(b[3]));
  });

  const saborRows: unknown[][] = flavors
    .map((f) => [
      f.name,
      f.categories.map((l) => CATEGORY_LABEL[l.category] ?? l.category).join(", ") ||
        "-",
      f.available ? "Sí" : "No",
      "",
    ])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const toppingRows: unknown[][] = toppings
    .map((t) => [t.name, t.price, t.available ? "Sí" : "No", ""])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const platilloRows: unknown[][] = [];
  for (const mi of menuItems) {
    // El Excel es de todo el menú excepto almuerzos.
    if (mi.category === "ALMUERZO") continue;
    if (mi.options.length > 0) {
      for (const o of mi.options) {
        platilloRows.push([
          mi.name,
          MENU_LABEL[mi.category] ?? mi.category,
          o.name,
          o.price,
          mi.available ? "Sí" : "No",
          "",
        ]);
      }
    } else {
      platilloRows.push([
        mi.name,
        MENU_LABEL[mi.category] ?? mi.category,
        "-",
        mi.price,
        mi.available ? "Sí" : "No",
        "",
      ]);
    }
  }
  platilloRows.sort((a, b) => {
    const cat = String(a[1]).localeCompare(String(b[1]));
    return cat !== 0 ? cat : String(a[0]).localeCompare(String(b[0]));
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    st(
      "Bebidas (categoría × tamaño × boba). El tiempo aplica a todos los sabores de esa categoría.",
      [["Categoría", "Tamaño", "Onzas", "Tipo de boba", "Precio (Bs)", "Disponible", "Tiempo de producción (min)"]].concat(bebidas),
      [14, 12, 8, 16, 12, 12, 24],
      6,
    ),
    "Bebidas",
  );
  XLSX.utils.book_append_sheet(
    wb,
    st(
      "Sabores de té. Celda amarilla: tiempo de producción en minutos.",
      [["Sabor", "Categoría", "Disponible", "Tiempo de producción (min)"]].concat(saborRows),
      [26, 20, 12, 24],
      3,
    ),
    "Sabores",
  );
  XLSX.utils.book_append_sheet(
    wb,
    st(
      "Toppings / extras",
      [["Nombre", "Precio (Bs)", "Disponible", "Tiempo de producción (min)"]].concat(toppingRows),
      [24, 12, 12, 24],
      3,
    ),
    "Toppings",
  );
  XLSX.utils.book_append_sheet(
    wb,
    st(
      "Platillos del menú (excluye almuerzos)",
      [["Nombre", "Categoría", "Opción", "Precio (Bs)", "Disponible", "Tiempo de producción (min)"]].concat(platilloRows),
      [28, 18, 24, 12, 12, 24],
      5,
    ),
    "Platillos",
  );

  XLSX.writeFile(wb, OUT);

  console.log(
    JSON.stringify(
      {
        ok: true,
        salida: OUT,
        bebidas: bebidas.length,
        sabores: saborRows.length,
        toppings: toppingRows.length,
        platillos: platilloRows.length,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});