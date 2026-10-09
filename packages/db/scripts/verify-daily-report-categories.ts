// Verificacion del desglose por categoria del reporte diario (spec reports):
// ejercita la misma SQL cruda y la normalizacion de claves historicas que usa
// apps/admin/app/api/reports/daily/route.ts, contra una orden de prueba propia
// (nunca toca datos reales salvo restaurar el flag isActive de una categoria).
//
//   corepack pnpm --filter @bbspos/db verify:daily-report-categories
import { prisma } from "../src/index";
import { normalizeCategoryKey } from "@bbspos/types";

const TEST_CUSTOMER = "PRUEBA REPORTE CATEGORIAS (verificacion)";
const DAY = "2099-01-15";
const gte = new Date(`${DAY}T00:00:00-04:00`);
const lt = new Date("2099-01-16T00:00:00-04:00");

// Misma consulta que CATEGORY_SQL del endpoint del reporte diario.
const CATEGORY_SQL = `
  SELECT oi."flavorCategory" AS flavorCategory,
         CASE WHEN oi."menuItemCategory" IN ('SANDWICH', 'PANINI')
              THEN 'SANDWICHES' ELSE oi."menuItemCategory" END AS menuItemCategory,
         COUNT(DISTINCT oi."orderId") AS orders,
         COALESCE(SUM(oi."quantity"), 0) AS units,
         COALESCE(SUM(oi."unitPrice" * oi."quantity"), 0) AS revenue
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."createdAt" >= ? AND o."createdAt" < ? AND o."status" != 'ANULADO'
  GROUP BY oi."flavorCategory",
           CASE WHEN oi."menuItemCategory" IN ('SANDWICH', 'PANINI')
                THEN 'SANDWICHES' ELSE oi."menuItemCategory" END
`;

type Row = {
  flavorCategory: string | null;
  menuItemCategory: string | null;
  orders: number | bigint;
  units: number | bigint;
  revenue: number | bigint;
};

let pass = 0;
let fail = 0;
let orderId: string | null = null;
let piqueoTouched = false;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)} (esperado ${JSON.stringify(expected)})`);
}

async function main() {
  // Limpieza de corridas previas.
  await prisma.order.deleteMany({ where: { customerName: TEST_CUSTOMER } });

  // Categoria inactiva con ventas en el periodo: PIQUEO se desactiva y se
  // restaura al final.
  const piqueo = await prisma.category.findUnique({ where: { key: "PIQUEO" } });
  if (piqueo?.isActive) {
    await prisma.category.update({ where: { key: "PIQUEO" }, data: { isActive: false } });
    piqueoTouched = true;
  }
  const piqueoAfter = await prisma.category.findUnique({ where: { key: "PIQUEO" } });
  console.log(`PIQUEO desactivada para la prueba (isActive=${piqueoAfter?.isActive})`);

  const order = await prisma.order.create({
    data: {
      status: "ACEPTADO",
      orderDate: DAY,
      daySeq: 999777,
      customerName: TEST_CUSTOMER,
      total: 1500 + 4000 + 1200 + 1300 + 3000,
      createdAt: new Date(`${DAY}T12:00:00-04:00`),
      items: {
        create: [
          // Bebida: se agrupa por flavorCategory.
          { flavorCategory: "MILK", flavorName: "Taro", sizeName: "12oz", unitPrice: 1500, quantity: 1 },
          // Plato de carta activo.
          { menuItemCategory: "MILANESA", menuItemName: "Milanesa de pollo", unitPrice: 2000, quantity: 2 },
          // Historicos pre-consolidacion: deben caer bajo SANDWICHES.
          { menuItemCategory: "SANDWICH", menuItemName: "Sandwich", unitPrice: 1200, quantity: 1 },
          { menuItemCategory: "PANINI", menuItemName: "Panini", unitPrice: 1300, quantity: 1 },
          // Categoria desactivada con ventas en el periodo.
          { menuItemCategory: "PIQUEO", menuItemName: "Piqueo", unitPrice: 1000, quantity: 3 },
        ],
      },
    },
    select: { id: true },
  });
  orderId = order.id;

  const [rows, categories] = await Promise.all([
    prisma.$queryRawUnsafe<Row[]>(CATEGORY_SQL, gte, lt),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  // Misma normalizacion/armado que el endpoint.
  const labels = new Map<string, string>([
    ...categories.map((c) => [c.key, c.name] as const),
  ]);
  const byCategory = new Map<
    string,
    { category: string; label: string; orders: number; units: number; revenue: number }
  >();
  for (const c of [...categories.map((c) => c.key), "MILK", "WATER", "SPECIAL"]) {
    byCategory.set(c, { category: c, label: labels.get(c) ?? c, orders: 0, units: 0, revenue: 0 });
  }
  let itemsSold = 0;
  for (const row of rows) {
    const key = normalizeCategoryKey(
      row.flavorCategory ?? row.menuItemCategory ?? "ALMUERZO",
    );
    const units = Number(row.units);
    itemsSold += units;
    const e = byCategory.get(key);
    check(`fila sin categoria desconocida (${key})`, Boolean(e), true);
    if (!e) continue;
    e.orders = Number(row.orders);
    e.units = units;
    e.revenue = Number(row.revenue);
  }

  const milanesa = byCategory.get("MILANESA")!;
  const milk = byCategory.get("MILK")!;
  const sandwiches = byCategory.get("SANDWICHES")!;
  const piqueoRow = byCategory.get("PIQUEO")!;

  console.log("\n--- Escenario: desglose por categoria de la carta ---");
  check("MILANESA unidades", milanesa.units, 2);
  check("MILANESA ingreso", milanesa.revenue, 4000);
  check("MILANESA etiqueta", milanesa.label, "Milanesas");

  console.log("\n--- Escenario: sin mezclar bebidas y platillos ---");
  check("MILK unidades", milk.units, 1);
  check("MILK ingreso", milk.revenue, 1500);
  check("MILK != MILANESA (no se agrupan)", milk.category !== milanesa.category, true);

  console.log("\n--- Escenario: desglose historico tras consolidacion ---");
  check("SANDWICHES unidades (SANDWICH+PANINI)", sandwiches.units, 2);
  check("SANDWICHES ingreso", sandwiches.revenue, 2500);
  check("SANDWICHES etiqueta", sandwiches.label, "Sandwiches");
  check("no queda fila SANDWICH", byCategory.has("SANDWICH"), false);
  check("no queda fila PANINI", byCategory.has("PANINI"), false);

  console.log("\n--- Escenario: categoria desactivada con ventas en el periodo ---");
  check("PIQUEO presente con ventas", piqueoRow.units, 3);
  check("PIQUEO etiqueta del catalogo", piqueoRow.label, "Piqueos");
  check("PIQUEO sigue inactiva en el catalogo", (await prisma.category.findUnique({ where: { key: "PIQUEO" } }))?.isActive, false);

  console.log("\n--- Totales ---");
  check("itemsSold", itemsSold, 8);

  console.log(`\n${pass} comprobaciones OK, ${fail} fallidas.`);
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Error en la verificacion:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
    if (piqueoTouched) {
      await prisma.category.update({ where: { key: "PIQUEO" }, data: { isActive: true } });
    }
    const left = await prisma.order.count({ where: { customerName: TEST_CUSTOMER } });
    const restored = await prisma.category.findUnique({ where: { key: "PIQUEO" } });
    console.log(`Limpieza: ordenes de prueba restantes=${left}, PIQUEO isActive=${restored?.isActive}`);
    await prisma.$disconnect();
  });
