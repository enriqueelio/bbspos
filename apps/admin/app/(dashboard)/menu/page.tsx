import {
  lunchStockByItem,
  lunchStockHistory,
  prisma,
  resetStaleMenuDelDia,
  zonedDateKey,
} from "@bbspos/db";
import { Role } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { MenuManager } from "./menu-manager";

export const metadata = {
  title: "Menú — BBSPOS Admin",
};

export default async function MenuPage() {
  // Al abrir el módulo del menú, limpia la selección de almuerzos de jornadas
  // anteriores para que el admin vuelva a elegir los platos del día.
  await resetStaleMenuDelDia();

  const session = await getRequiredSession();
  const currentUserRole = session.user.role as Role;

  const [sizes, flavors, bobaTypes, toppings, drinkPrices, menuItems, alitaSauces] =
    await Promise.all([
      prisma.size.findMany({ orderBy: { oz: "asc" } }),
      prisma.flavor.findMany({
        include: { categories: true },
        orderBy: { name: "asc" },
      }),
      prisma.bobaType.findMany({ orderBy: { name: "asc" } }),
      prisma.topping.findMany({ orderBy: { name: "asc" } }),
      prisma.drinkPrice.findMany({ orderBy: { category: "asc" } }),
      prisma.menuItem.findMany({
        include: { options: { orderBy: { name: "asc" } } },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.alitaSauce.findMany({ orderBy: { name: "asc" } }),
    ]);

  const today = zonedDateKey();

  // Cantidad de la jornada en solo lectura (el admin no programa ni ajusta: eso
  // es del cajero) y el histórico por jornada para comparar plan vs venta.
  const lunchTargets = menuItems
    .filter((mi) => mi.category === "ALMUERZO")
    .map((mi) => ({ id: mi.id, name: mi.name }));
  const [lunchStock, lunchHistory] = await Promise.all([
    lunchStockByItem(lunchTargets),
    lunchStockHistory(),
  ]);

  return (
    <MenuManager
      currentUserRole={currentUserRole}
      sizes={sizes}
      flavors={flavors.map((f) => ({
        id: f.id,
        name: f.name,
        categories: f.categories.map((c) => c.category),
        available: f.available,
        imageUrl: f.imageUrl ?? null,
      }))}
      bobaTypes={bobaTypes}
      toppings={toppings}
      drinkPrices={drinkPrices}
      menuItems={menuItems.map((mi) => ({
        id: mi.id,
        name: mi.name,
        category: mi.category,
        price: mi.price,
        description: mi.description,
        imageUrl: mi.imageUrl ?? null,
        options: mi.options.map((o) => ({
          id: o.id,
          name: o.name,
          price: o.price,
        })),
        available: mi.available,
        enMenuDelDiaHoy:
          mi.enMenuDelDia && mi.menuDelDiaDate === today,
        lunchStock: lunchStock.get(mi.id) ?? {
          planned: null,
          sold: 0,
          held: 0,
          heldByMe: 0,
          remaining: null,
          lowThreshold: 5,
        },
      }))}
      lunchHistory={lunchHistory}
      alitaSauces={alitaSauces.map((s) => ({
        id: s.id,
        name: s.name,
        available: s.available,
      }))}
    />
  );
}
