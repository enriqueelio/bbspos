import { prisma } from "@bubba/db";
import type { Catalog } from "@bubba/types";

export async function getCatalog(): Promise<Catalog> {
  const [sizes, flavors, bobaTypes, drinkPrices, toppings] = await Promise.all([
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
  };
}

export type { Catalog } from "@bubba/types";
