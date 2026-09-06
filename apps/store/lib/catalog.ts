import { prisma, todayMenuItems } from "@bbspos/db";
import type { Catalog } from "@bbspos/types";

export async function getCatalog(): Promise<Catalog> {
  const [sizes, flavors, bobaTypes, drinkPrices, toppings, menuItems] =
    await Promise.all([
      prisma.size.findMany({
        where: { available: true },
        orderBy: { oz: "asc" },
      }),
      prisma.flavor.findMany({
        where: { available: true },
        include: { categories: true },
        orderBy: { name: "asc" },
      }),
      prisma.bobaType.findMany({
        where: { available: true },
        orderBy: { name: "asc" },
      }),
      prisma.drinkPrice.findMany({ orderBy: { category: "asc" } }),
      prisma.topping.findMany({
        where: { available: true },
        orderBy: { name: "asc" },
      }),
      todayMenuItems(),
    ]);

  return {
    sizes,
    flavors: flavors.map((f) => ({
      id: f.id,
      name: f.name,
      categories: f.categories.map((c) => c.category),
      available: f.available,
    })),
    bobaTypes,
    drinkPrices,
    toppings,
    // Payload aditivo: se entregan los platos del Menú del Día vigente.
    // La tienda pública aún no tiene UI para venderlos.
    menuItems: menuItems.map((mi) => ({
      id: mi.id,
      name: mi.name,
      category: mi.category,
      price: mi.price,
    })),
  };
}

export type { Catalog } from "@bbspos/types";
