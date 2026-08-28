"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bubba/db";
import {
  OrderStatus,
  sumToppings,
  type CartItem,
  type Catalog,
} from "@bubba/types";
import { getRequiredSession } from "@/lib/session";
import { printText, formatComanda, getPrinterName } from "@/lib/printing";

/** Catálogo activo para el punto de venta: tamaños, sabores, tipos de boba,
 *  la matriz de precios y los toppings disponibles. */
export async function getPosCatalog(): Promise<Catalog> {
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

/** Crea un pedido de venta manual (POS): carrito, cliente y tipo de entrega.
 *  Asigna el seq (número de pedido), lo deja en RECIBIDO y calcula el total. */
export async function createPosOrder(
  items: CartItem[],
  customerName?: string,
  deliveryType?: "MESA" | "LLEVAR" | null,
): Promise<{ orderId: string; seq: number; total: number }> {
  const session = await getRequiredSession();

  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  const orderItems = items.map((item) => ({
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
  }));

  const total = items.reduce(
    (acc, item) =>
      acc + (item.unitPrice + sumToppings(item.toppings)) * item.quantity,
    0,
  );

  const order = await prisma.$transaction(async (tx) => {
    const last = await tx.order.findFirst({
      orderBy: { seq: "desc" },
      select: { seq: true },
    });
    const seq = (last?.seq ?? 0) + 1;
    return tx.order.create({
      data: {
        customerName: customerName?.trim() || null,
        deliveryType: deliveryType ?? null,
        status: OrderStatus.RECIBIDO,
        seq,
        total,
        userId: session.user.id,
        items: {
          create: orderItems,
        },
      },
    });
  });

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
            customerName: printed.customerName,
            createdAt: printed.createdAt,
            total: printed.total,
            items: printed.items.map((item) => ({
              sizeName: item.sizeName,
              flavorName: item.flavorName,
              bobaTypeName: item.bobaTypeName,
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