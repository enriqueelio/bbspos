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
  cartItemUnitTotal,
  type CartItem,
  type Catalog,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { printText, formatComanda, getPrinterName } from "@/lib/printing";

/** Catálogo activo para el punto de venta: tamaños, sabores, tipos de boba,
 *  la matriz de precios, los toppings disponibles, el Menú del Día vigente
 *  y la carta fija (a la carta, categorías distintas de ALMUERZO). */
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

/** Crea un pedido de venta manual (POS): carrito, cliente y tipo de entrega.
 *  Asigna el seq (número de pedido), lo deja en ACEPTADO (pendiente de cobro)
 *  y calcula el total. El pago se registra después por el cajero, incluso tras
 *  la entrega. La comanda se imprime una sola vez, al crear el pedido. */
export async function createPosOrder(
  items: CartItem[],
  customerName?: string,
  deliveryType?: "MESA" | "LLEVAR" | null,
  notes?: string | null,
): Promise<{ orderId: string; seq: number; daySeq: number; total: number }> {
  const session = await getRequiredSession();

  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  if (!customerName?.trim()) {
    throw new Error("El nombre o mesa del cliente es obligatorio.");
  }

  if (!deliveryType) {
    throw new Error("Elige Para mesa o Para llevar.");
  }

  // Verifica que el usuario de la sesión exista para no violar la llave
  // foránea a la hora de asociar el pedido. Si no existe, se crea sin usuario.
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
      // El seq es global y único (nunca se repite en la BD): es la clave de
      // orden cronológico de todo el historial. El ticket visible al cliente
      // es el daySeq, que sí se reinicia a 1 cada medianoche.
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
          deliveryType: deliveryType ?? null,
          notes: notes?.trim() || null,
          status: OrderStatus.ACEPTADO,
          seq,
          orderDate,
          daySeq,
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

  // Impresión automática de la comanda al crear el pedido.
  // No bloquea la respuesta de la UI: si la impresora falla, solo se loguea.
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
            daySeq: printed.daySeq,
            customerName: printed.customerName,
            createdAt: printed.createdAt,
            total: printed.total,
            items: printed.items.map((item) => ({
              sizeName: item.sizeName,
              flavorName: item.flavorName,
              bobaTypeName: item.bobaTypeName,
              menuItemName: item.menuItemName,
              menuItemOptionName: item.menuItemOptionName,
              menuItemDetail: item.menuItemDetail,
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

  return { orderId: order.id, seq: order.seq ?? 0, daySeq: order.daySeq ?? 0, total };
}