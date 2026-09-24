"use server";

import { revalidatePath } from "next/cache";
import {
  prisma,
  todayMenuItems,
  cartaMenuItems,
  todayKey,
} from "@bbspos/db";
import {
  OrderStatus,
  type CartItem,
  type Catalog,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { printText, formatComanda, getPrinterConfig } from "@/lib/printing";
import productosTiempoData from "../../../data/productos-tiempo.json";

const productosTiempo = productosTiempoData as Record<string, number>;

/** Minutos de producción de un producto según data/productos-tiempo.json.
 *  Las bebidas de té usan la clave base "Bubble Tea"; los platillos se
 *  buscan por nombre (y opción) con 10 min como respaldo. */
function productionMinutesFor(item: CartItem): number {
  if (item.kind === "DRINK") return productosTiempo["Bubble Tea"] ?? 5;
  return (
    productosTiempo[item.name] ?? productosTiempo[item.optionName ?? ""] ?? 10
  );
}

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
      isMixtas: boolean;
      requiredSauces: number | null;
      options?: { id: string; name: string; price: number; requiredSauces: number | null }[];
    },
  ) => ({
    id: mi.id,
    name: mi.name,
    category: mi.category as Catalog["menuItems"][number]["category"],
    price: mi.price,
    description: mi.description,
    imageUrl: mi.imageUrl ?? null,
    isMixtas: mi.isMixtas,
    requiredSauces: mi.requiredSauces,
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
): Promise<{ orderId: string; seq: number; daySeq: number; total: number }> {
  const session = await getRequiredSession();

  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  // ===== Precios autoritativos desde la BD =====
  // Nunca se confía en item.unitPrice del cliente: se recalculan el precio de la
  // bebida (matriz DrinkPrice + toppings) y el de los platillos (precio de la
  // variante elegida o del producto base).
  const toppingIds = [
    ...new Set(
      items.flatMap((i) =>
        i.kind === "DRINK" ? i.toppings.map((t) => t.id) : [],
      ),
    ),
  ];

  const [dbToppings, drinkPrices, dbOptions, dbMenuItems] =
    await Promise.all([
      prisma.topping.findMany({ where: { id: { in: toppingIds } } }),
      prisma.drinkPrice.findMany(),
      prisma.menuItemOption.findMany({
        where: {
          id: {
            in: items
              .filter((i) => i.kind === "MENU_ITEM")
              .map((i) => i.optionId)
              .filter((id): id is string => Boolean(id)),
          },
        },
      }),
      prisma.menuItem.findMany({
        where: {
          id: {
            in: items
              .filter((i) => i.kind === "MENU_ITEM")
              .map((i) => i.menuItemId),
          },
        },
      }),
    ]);

  const drinkPriceByCombo = new Map(
    drinkPrices.map((p) => [`${p.category}|${p.sizeId}|${p.bobaTypeId}`, p.price]),
  );
  const toppingById = new Map(dbToppings.map((t) => [t.id, t]));
  const optionById = new Map(dbOptions.map((o) => [o.id, o]));
  const menuItemById = new Map(dbMenuItems.map((m) => [m.id, m]));

  let total = 0;
  const orderItems = items.map((item) => {
    if (item.quantity <= 0) {
      throw new Error("PRECIO_INVALIDO");
    }
    if (item.kind === "DRINK") {
      const base = drinkPriceByCombo.get(
        `${item.category}|${item.size.id}|${item.bobaType.id}`,
      );
      if (base === undefined) {
        throw new Error("COMBINACION_NO_DISPONIBLE");
      }
      const toppings = item.toppings.map((t) => {
        const dbTopping = toppingById.get(t.id);
        if (!dbTopping || dbTopping.price <= 0) {
          throw new Error("PRECIO_INVALIDO");
        }
        return { toppingName: dbTopping.name, unitPrice: dbTopping.price };
      });
      if (base <= 0) {
        throw new Error("PRECIO_INVALIDO");
      }
      total += (base + toppings.reduce((sum, t) => sum + t.unitPrice, 0)) * item.quantity;
      return {
        sizeName: item.size.name,
        flavorName: item.flavor.name,
        flavorCategory: item.category,
        bobaTypeName: item.bobaType.name,
        unitPrice: base,
        quantity: item.quantity,
        tiempoProduccion: productionMinutesFor(item),
        toppings: {
          create: toppings,
        },
      };
    }
    const unitPrice = item.optionId
      ? optionById.get(item.optionId)?.price
      : menuItemById.get(item.menuItemId)?.price;
    if (unitPrice === undefined || unitPrice <= 0) {
      throw new Error("PRECIO_INVALIDO");
    }
    total += unitPrice * item.quantity;
    return {
      menuItemName: item.name,
      menuItemCategory: item.category,
      menuItemOptionName: item.optionName,
      menuItemDetail: item.detail,
      unitPrice,
      quantity: item.quantity,
      tiempoProduccion: productionMinutesFor(item),
    };
  });

  // El tiempo estimado del pedido es el del producto que más tarda.
  const tiempoEstimado = items.reduce(
    (max, item) => Math.max(max, productionMinutesFor(item)),
    0,
  );

  let order: Awaited<ReturnType<typeof prisma.order.create>>;
  try {
    order = await prisma.$transaction(async (tx) => {
      // El seq es global y único; el ticket visible es el daySeq diario (#001...).
      const first = await tx.order.findFirst({
        orderBy: { seq: "desc" },
        select: { seq: true },
      });
      const seq = (first?.seq ?? 0) + 1;

      const orderDate = todayKey();
      const last = await tx.order.findFirst({
        where: { orderDate },
        orderBy: { daySeq: "desc" },
        select: { daySeq: true },
      });
      const daySeq = (last?.daySeq ?? 0) + 1;

      return tx.order.create({
        data: {
          customerName: customerName?.trim() || null,
          deliveryType: deliveryType ?? "MESA",
          status: OrderStatus.ACEPTADO,
          seq,
          orderDate,
          daySeq,
          total,
          tiempoEstimado,
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
    const settings = await getPrinterConfig();
    if (settings) {
      const printed = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { toppings: true } } },
      });
      if (printed) {
        await printText(
          settings,
          formatComanda({
            seq: printed.seq,
            daySeq: printed.daySeq,
            customerName: printed.customerName,
            notes: printed.notes,
            deliveryType: printed.deliveryType,
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
          {
            title: "ticket",
            number: printed.daySeq ?? printed.seq,
            date: printed.createdAt,
          },
        );
      }
    }
  } catch (e) {
    console.error("No se pudo imprimir la comanda al crear el pedido:", e);
  }

  return { orderId: order.id, seq: order.seq ?? 0, daySeq: order.daySeq ?? 0, total };
}
