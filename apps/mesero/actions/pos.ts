"use server";

import { revalidatePath } from "next/cache";
import { prisma, todayMenuItems, cartaMenuItems } from "@bbspos/db";
import {
  OrderStatus,
  cartItemUnitTotal,
  type CartItem,
  type Catalog,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { printText, formatComanda, getPrinterName } from "@/lib/printing";

export async function getPosCatalog(): Promise<Catalog> {
  const [sizes, flavors, bobaTypes, drinkPrices, toppings, menuItems, cartaItems] =
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
      cartaMenuItems(),
    ]);

  const toMenuItemView = (
    mi: {
      id: string;
      name: string;
      category: string;
      price: number;
      description: string | null;
      imageUrl?: string | null;
      options?: { id: string; name: string; price: number }[];
    },
  ) => ({
    id: mi.id,
    name: mi.name,
    category: mi.category as Catalog["menuItems"][number]["category"],
    price: mi.price,
    description: mi.description,
    imageUrl: mi.imageUrl ?? null,
    options: mi.options ?? [],
  });

  return {
    sizes,
    flavors: flavors.map((f) => ({
      id: f.id,
      name: f.name,
      categories: f.categories.map((c) => c.category),
      available: f.available,
      imageUrl: f.imageUrl ?? null,
    })),
    bobaTypes,
    drinkPrices,
    toppings,
    menuItems: menuItems.map(toMenuItemView),
    cartaItems: cartaItems.map(toMenuItemView),
  };
}

export async function createPosOrder(
  items: CartItem[],
  customerName?: string,
  deliveryType?: "MESA" | "LLEVAR" | null,
): Promise<{ orderId: string; seq: number; total: number }> {
  const session = await getRequiredSession();

  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  const orderItems = items.map((item) =>
    item.kind === "DRINK"
      ? {
          sizeName: item.size.name,
          flavorName: item.flavor.name,
          flavorCategory: item.category,
          bobaTypeName: item.bobaType.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          toppings: {
            create: item.toppings.map((t) => ({
              toppingName: t.name,
              unitPrice: t.price,
            })),
          },
        }
      : {
          menuItemName: item.name,
          menuItemCategory: item.category,
          menuItemOptionName: item.optionName,
          menuItemDetail: item.detail,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        },
  );

  const total = items.reduce(
    (acc, item) => acc + cartItemUnitTotal(item) * item.quantity,
    0,
  );

  let order: Awaited<ReturnType<typeof prisma.order.create>>;
  try {
    order = await prisma.$transaction(async (tx) => {
      // El número de pedido se reinicia a 1 cada medianoche.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const last = await tx.order.findFirst({
        where: { createdAt: { gte: startOfDay } },
        orderBy: { seq: "desc" },
        select: { seq: true },
      });
      const seq = (last?.seq ?? 0) + 1;
      return tx.order.create({
        data: {
          customerName: customerName?.trim() || null,
          deliveryType: deliveryType ?? "MESA",
          status: OrderStatus.ACEPTADO,
          seq,
          total,
          userId: dbUser ? dbUser.id : null,
          items: {
            create: orderItems,
          },
        },
      });
    });
  } catch (e) {
    console.error("No se pudo crear el pedido:", e);
    throw new Error(
      "No se pudo crear el pedido. Intenta de nuevo o contacta al administrador.",
    );
  }

  revalidatePath("/");

  try {
    const printerName = getPrinterName();
    if (printerName) {
      const printed = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { toppings: true } } },
      });
      if (printed) {
        await printText(
          printerName,
          formatComanda({
            seq: printed.seq,
            customerName: printed.customerName,
            createdAt: printed.createdAt,
            total: printed.total,
            items: printed.items.map((item) => ({
              sizeName: item.sizeName,
              flavorName: item.flavorName,
              bobaTypeName: item.bobaTypeName,
              menuItemName: item.menuItemName,
              menuItemOptionName: item.menuItemOptionName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              toppings: item.toppings.map((t) => ({
                toppingName: t.toppingName,
                unitPrice: t.unitPrice,
              })),
            })),
          }),
        );
      }
    }
  } catch (e) {
    console.error("No se pudo imprimir la comanda al crear el pedido:", e);
  }

  return { orderId: order.id, seq: order.seq ?? 0, total };
}
