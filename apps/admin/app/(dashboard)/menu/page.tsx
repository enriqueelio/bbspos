import { prisma } from "@bubba/db";
import { MenuManager } from "./menu-manager";

export const metadata = {
  title: "Menú — Bubba Admin",
};

export default async function MenuPage() {
  const [sizes, flavors, bobaTypes, toppings, drinkPrices] = await Promise.all([
    prisma.size.findMany({ orderBy: { oz: "asc" } }),
    prisma.flavor.findMany({
      include: { categories: true },
      orderBy: { name: "asc" },
    }),
    prisma.bobaType.findMany({ orderBy: { name: "asc" } }),
    prisma.topping.findMany({ orderBy: { name: "asc" } }),
    prisma.drinkPrice.findMany({ orderBy: { category: "asc" } }),
  ]);

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
    />
  );
}
