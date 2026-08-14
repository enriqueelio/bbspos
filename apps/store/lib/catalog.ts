import { prisma } from "@bubba/db";

export async function getCatalog() {
  const [sizes, flavors, bobaTypes] = await Promise.all([
    prisma.size.findMany({
      where: { available: true },
      orderBy: { price: "asc" },
    }),
    prisma.flavor.findMany({
      where: { available: true },
      orderBy: { price: "asc" },
    }),
    prisma.bobaType.findMany({
      where: { available: true },
      orderBy: { price: "asc" },
    }),
  ]);

  return { sizes, flavors, bobaTypes };
}

export type Catalog = Awaited<ReturnType<typeof getCatalog>>;
