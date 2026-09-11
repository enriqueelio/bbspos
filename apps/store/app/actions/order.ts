"use server";

import { after } from "next/server";
import { prisma, todayKey } from "@bbspos/db";
import { cartItemUnitTotal, type CartItem } from "@bbspos/types";
import { formatComanda, getPrinterName, printText } from "@/lib/printing";
import productosTiempoData from "../../../../data/productos-tiempo.json";

const productosTiempo = productosTiempoData as Record<string, number>;

export async function createOrder(
  items: CartItem[],
  customerName?: string,
  deliveryType?: "MESA" | "LLEVAR" | null,
): Promise<{ orderId: string; seq: number; daySeq: number; total: number }> {
  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }
  if (!customerName?.trim()) {
    throw new Error("Falta el nombre del cliente");
  }

  const orderItems = items.map((item) => {
    // La tienda pública solo arma bebidas; las líneas de platillos llegan
    // únicamente desde las terminales POS.
    if (item.kind !== "DRINK") {
      throw new Error("Este producto no está disponible en la tienda.");
    }
    return {
      sizeName: item.size.name,
      flavorName: item.flavor.name,
      flavorCategory: item.category,
      bobaTypeName: item.bobaType.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      tiempoProduccion: productosTiempo["Bubble Tea"] ?? 5,
      toppings: {
        create: item.toppings.map((t) => ({
          toppingName: t.name,
          unitPrice: t.price,
        })),
      },
    };
  });

  // La tienda solo vende bebidas de té: el estimado es el "Bubble Tea".
  const tiempoEstimado = productosTiempo["Bubble Tea"] ?? 5;

  const total = items.reduce(
    (acc, item) => acc + cartItemUnitTotal(item) * item.quantity,
    0,
  );

  const order = await prisma.$transaction(async (tx) => {
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
        customerName: customerName.trim(),
        deliveryType: deliveryType ?? undefined,
        seq,
        orderDate,
        daySeq,
        total,
        tiempoEstimado,
        items: {
          create: orderItems,
        },
      },
    });
  });

  // Impresión automática de la comanda, best-effort y fuera del request:
  // un fallo de impresora nunca debe impedir crear el pedido.
  after(async () => {
    try {
      const printerName = getPrinterName();
      if (!printerName) return;

      const full = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: { include: { toppings: true } } },
      });

      await printText(
        printerName,
        formatComanda({
          seq: full.seq,
          daySeq: full.daySeq,
          customerName: full.customerName,
          createdAt: full.createdAt,
          total: full.total,
          items: full.items.map((item) => ({
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
    } catch {
      // Sin impresora o con fallo de impresión: el pedido sigue válido.
    }
  });

  return { orderId: order.id, seq: order.seq ?? 0, daySeq: order.daySeq ?? 0, total };
}
