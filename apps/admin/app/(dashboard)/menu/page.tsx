import { prisma, resetStaleMenuDelDia, zonedDateKey } from "@bbspos/db";
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

  const [sizes, flavors, bobaTypes, toppings, drinkPrices, menuItems] =
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
    ]);

  const today = zonedDateKey();

  return (
    <MenuManager
      currentUserRole={currentUserRole}
      sizes={sizes}
      flavors={flavors.map((f) => ({
        id: f.id,
        name: f.name,
        categories: f.categories.map((c) => c.category),
        available: f.available,
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
        options: mi.options.map((o) => ({
          id: o.id,
          name: o.name,
          price: o.price,
        })),
        available: mi.available,
        enMenuDelDiaHoy:
          mi.enMenuDelDia && mi.menuDelDiaDate === today,
      }))}
    />
  );
}
