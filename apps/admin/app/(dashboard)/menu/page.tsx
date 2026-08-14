import { prisma } from "@bubba/db";
import { MenuManager } from "./menu-manager";

export const metadata = {
  title: "Menú — Bubba Admin",
};

export default async function MenuPage() {
  const [sizes, flavors, bobaTypes] = await Promise.all([
    prisma.size.findMany({ orderBy: { price: "asc" } }),
    prisma.flavor.findMany({ orderBy: { price: "asc" } }),
    prisma.bobaType.findMany({ orderBy: { price: "asc" } }),
  ]);

  return (
    <MenuManager
      sizes={sizes}
      flavors={flavors}
      bobaTypes={bobaTypes}
    />
  );
}
