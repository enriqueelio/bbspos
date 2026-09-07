import { Prisma, PrismaClient, OrderStatus, PaymentMethod, DeliveryType } from "@prisma/client";

const prisma = new PrismaClient();

const TIME_ZONE = "America/La_Paz";

function zonedStartOfToday(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now).split("-").map(Number);
  const [year, month, day] = parts;
  const guessUtcMs = Date.UTC(year, month - 1, day, 4, 0, 0);
  const hourInZone = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE, hour: "numeric", hour12: false,
    }).format(new Date(guessUtcMs)),
  );
  const corrected = hourInZone === 0 ? guessUtcMs : guessUtcMs - (hourInZone + 4) * 3_600_000;
  return new Date(corrected);
}

const daysAgo = (from: Date, days: number) => new Date(from.getTime() - days * 24 * 3_600_000);

async function lastSeq(tx: Prisma.TransactionClient): Promise<number> {
  const last = await tx.order.findFirst({ orderBy: { seq: "desc" }, select: { seq: true } });
  return (last?.seq ?? 0) + 1;
}

interface DrinkItem {
  sizeName: string; flavorName: string; flavorCategory: "MILK" | "WATER" | "SPECIAL";
  bobaTypeName: string; unitPrice: number; quantity: number; toppings?: { toppingName: string; unitPrice: number }[];
}

async function createOrder(cfg: {
  createdAt: Date; status: OrderStatus; customerName?: string; deliveryType?: DeliveryType;
  total: number; items: DrinkItem[]; paidAt?: Date; paymentMethod?: PaymentMethod;
  deliveredAt?: Date; cancelledAt?: Date; cancelReason?: string; userId?: string;
  discountAmount?: number; discountReason?: string; discountedAt?: Date; discountedById?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const seq = await lastSeq(tx);
    await tx.order.create({
      data: {
        seq, status: cfg.status, customerName: cfg.customerName ?? "Cliente de prueba",
        deliveryType: cfg.deliveryType ?? "LLEVAR", total: cfg.total,
        createdAt: cfg.createdAt, paidAt: cfg.paidAt, deliveredAt: cfg.deliveredAt,
        paymentMethod: cfg.paymentMethod,
        user: cfg.userId ? { connect: { id: cfg.userId } } : undefined,
        cancelledAt: cfg.cancelledAt, cancelReason: cfg.cancelReason,
        discountAmount: cfg.discountAmount ?? 0, discountReason: cfg.discountReason,
        discountedAt: cfg.discountedAt,
        discountedBy: cfg.discountedById ? { connect: { id: cfg.discountedById } } : undefined,
        items: { create: cfg.items.map((i) => ({ ...i, toppings: i.toppings ? { create: i.toppings } : undefined })) },
      },
    });
  });
}

async function main() {
  const cajero = await prisma.user.findUnique({ where: { username: "cajero" } });
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!cajero || !admin) throw new Error("Usuarios de prueba no encontrados. Corre el seed.");

  const today = zonedStartOfToday();
  const t = (h: number, m: number) => new Date(today.getTime() + (h * 60 + m) * 60_000);

  // Ordena limpia de pedidos previos relacionados con prueba (evita duplicar seq).
  // No borra historico real si existiera: mantiene solo datos de ejemplo.
  await prisma.orderItemTopping.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  const drink = (over: Partial<DrinkItem>): DrinkItem => ({
    sizeName: "Grande", flavorName: "Capuchino", flavorCategory: "SPECIAL",
    bobaTypeName: "Tapioca", unitPrice: 20, quantity: 1, ...over,
  });

  // ===== HOY "Por cobrar" (RECIBIDO) =====
  await createOrder({
    createdAt: t(9, 12), status: OrderStatus.RECIBIDO, customerName: "MarÃ­a GarcÃ­a",
    total: 20, deliveryType: "LLEVAR",
    items: [drink({ flavorName: "Capuchino", quantity: 1 })],
  });
  await createOrder({
    createdAt: t(12, 45), status: OrderStatus.RECIBIDO, customerName: "Pedidos Ya #105",
    total: 55, deliveryType: "LLEVAR",
    items: [
      drink({ flavorName: "Matcha", unitPrice: 30, bobaTypeName: "Explosivas" }),
      drink({ flavorName: "Frutilla", unitPrice: 18, bobaTypeName: "Tapioca" }),
      drink({ flavorName: "Oreo", unitPrice: 7, quantity: 1 }),
    ],
  });
  // RECIBIDO viejo (hace 2 horas) para semÃ¡foro de demora
  await createOrder({
    createdAt: t(11, 5), status: OrderStatus.RECIBIDO, customerName: "Recibido viejo",
    total: 45, deliveryType: "LLEVAR",
    items: [drink({ flavorName: "Taro", unitPrice: 25, bobaTypeName: "Explosivas", quantity: 1 }), drink({ flavorName: "Mango", unitPrice: 20, quantity: 1 })],
  });

  // ===== HOY "Por entregar" (ACEPTADO) =====
  // Aceptado hace poco (sin urgencia)
  await createOrder({
    createdAt: t(9, 30), status: OrderStatus.ACEPTADO, customerName: "Cliente QR rÃ¡pido",
    total: 20, deliveryType: "MESA",
    paidAt: t(9, 32), paymentMethod: PaymentMethod.QR, userId: cajero.id,
    items: [drink({ flavorName: "Limonada brasilera", unitPrice: 20, bobaTypeName: "Tapioca" })],
  });
  // Aceptado hace >=15 min (badge de urgencia)
  await createOrder({
    createdAt: t(9, 5), status: OrderStatus.ACEPTADO, customerName: "Cliente demorado",
    total: 38, deliveryType: "MESA",
    paidAt: t(9, 10), paymentMethod: PaymentMethod.EFECTIVO, userId: cajero.id,
    items: [drink({ flavorName: "Chocolate", unitPrice: 18, bobaTypeName: "Tapioca" }), drink({ flavorName: "Coco", unitPrice: 20, bobaTypeName: "Explosivas" })],
  });
  // ACEPTADO sin cobrar todavÃ­a (mesero enviÃ³, pagarÃ¡ en caja luego)
  await createOrder({
    createdAt: t(12, 20), status: OrderStatus.ACEPTADO, customerName: "Mesa 4 - sin pagar",
    total: 25, deliveryType: "MESA",
    items: [drink({ flavorName: "Vainilla", unitPrice: 25, bobaTypeName: "Explosivas" })],
  });

  // ===== HOY ENTREGADO (reporte diario) =====
  await createOrder({
    createdAt: t(8, 40), status: OrderStatus.ENTREGADO, customerName: "Entregado 1",
    total: 20, deliveryType: "LLEVAR",
    paidAt: t(8, 42), paymentMethod: PaymentMethod.QR, userId: cajero.id,
    deliveredAt: t(8, 55), items: [drink({ flavorName: "Capuchino" })],
  });
  await createOrder({
    createdAt: t(10, 15), status: OrderStatus.ENTREGADO, customerName: "Entregado 2",
    total: 36, deliveryType: "MESA",
    paidAt: t(10, 18), paymentMethod: PaymentMethod.EFECTIVO, userId: cajero.id,
    deliveredAt: t(10, 48), items: [drink({ flavorName: "PiÃ±a colada", unitPrice: 36, bobaTypeName: "Explosivas", quantity: 2 })],
  });
  await createOrder({
    createdAt: t(11, 0), status: OrderStatus.ENTREGADO, customerName: "Con descuento",
    total: 44, deliveryType: "LLEVAR",
    paidAt: t(11, 2), paymentMethod: PaymentMethod.EFECTIVO, userId: cajero.id,
    deliveredAt: t(11, 10), discountAmount: 6, discountReason: "CupÃ³n 10%", discountedAt: t(11, 0), discountedById: cajero.id,
    items: [drink({ flavorName: "Oreo", unitPrice: 30, bobaTypeName: "Tapioca" }), drink({ flavorName: "Frutilimon", unitPrice: 20, quantity: 1 })],
  });

  // ===== HOY ANULADO =====
  await createOrder({
    createdAt: t(9, 50), status: OrderStatus.ANULADO, customerName: "Cancelado cliente",
    total: 20, deliveryType: "LLEVAR",
    cancelledAt: t(9, 55), cancelReason: "El cliente se fue", userId: cajero.id,
    items: [drink({ flavorName: "Coco", unitPrice: 20, bobaTypeName: "Tapioca" })],
  });
  await createOrder({
    createdAt: t(12, 0), status: OrderStatus.ANULADO, customerName: "Cancelado por el local",
    total: 20, deliveryType: "LLEVAR",
    cancelledAt: t(12, 5), cancelReason: "Error de cobro", userId: cajero.id,
    items: [drink({ flavorName: "Mango", unitPrice: 20, bobaTypeName: "Tapioca" })],
  });

  // ===== HistÃ³ricos (ayer y hace 3 dÃ­as) para migraciÃ³n/filtros =====
  const yesterday = daysAgo(today, 1);
  const threeDays = daysAgo(today, 3);
  await createOrder({
    createdAt: new Date(yesterday.getTime() + 10 * 3_600_000), status: OrderStatus.ENTREGADO,
    customerName: "HistÃ³rico ayer", total: 20, deliveryType: "LLEVAR",
    paidAt: new Date(yesterday.getTime() + 10.05 * 3_600_000), paymentMethod: PaymentMethod.QR,
    userId: admin.id, deliveredAt: new Date(yesterday.getTime() + 10.25 * 3_600_000),
    items: [drink({ flavorName: "Capuchino" })],
  });
  await createOrder({
    createdAt: new Date(threeDays.getTime() + 15 * 3_600_000), status: OrderStatus.ENTREGADO,
    customerName: "HistÃ³rico hace 3 dÃ­as", total: 41, deliveryType: "LLEVAR",
    paidAt: new Date(threeDays.getTime() + 15.05 * 3_600_000), paymentMethod: PaymentMethod.EFECTIVO,
    userId: admin.id, deliveredAt: new Date(threeDays.getTime() + 15.3 * 3_600_000),
    items: [drink({ flavorName: "Matcha", unitPrice: 21, bobaTypeName: "Explosivas" }), drink({ flavorName: "Mora", unitPrice: 20, quantity: 1 })],
  });
  await createOrder({
    createdAt: new Date(yesterday.getTime() + 18 * 3_600_000), status: OrderStatus.ANULADO,
    customerName: "Cancelado histÃ³rico", total: 20, deliveryType: "LLEVAR",
    cancelledAt: new Date(yesterday.getTime() + 18.1 * 3_600_000), cancelReason: "Prueba histÃ³rica", userId: admin.id,
    items: [drink({ flavorName: "Taro", unitPrice: 20, bobaTypeName: "Tapioca" })],
  });

  const counts = {
    RECIBIDO: 0, ACEPTADO: 0, ENTREGADO: 0, ANULADO: 0,
  };
  for (const row of await prisma.order.findMany({ select: { status: true } })) {
    counts[row.status] += 1;
  }
  console.log("Pedidos de prueba creados por estado:", counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
