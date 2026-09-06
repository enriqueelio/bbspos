import { prisma, zonedDateKey } from "@bbspos/db";
import { MenuManager } from "./menu-manager";

export const metadata = {
  title: "Menú — BBSPOS Admin",
};

export default async function MenuPage() {
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
      prisma.menuItem.findMany({ orderBy: { name: "asc" } }),
    ]);

  const today = zonedDateKey();

  return (
    <MenuManager
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
        available: mi.available,
        enMenuDelDiaHoy:
          mi.enMenuDelDia && mi.menuDelDiaDate === today,
      }))}
    />
  );
}
