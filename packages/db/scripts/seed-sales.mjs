/* Genera 500 ventas de ejemplo en un rango de ~30 días (8 ago → 2 sep 2026),
 * todas ACEPTADAS → ENTREGADAS y COBRADAS (con paidAt y método de pago),
 * reutilizando el catálogo real (tamaños, sabores, bobas, toppings, precios y
 * usuarios). Conserva los pedidos ya existentes y continúa la secuencia `seq`.
 *
 * Uso: pnpm --filter @bubba/db tsx scripts/seed-sales.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CUSTOMERS = [
  "María Fernández", "Juan Pérez", "Lucía Rojas", "Diego Salazar",
  "Carla Ortiz", "Pedro Antelo", "Sofía Vargas", "Andrés Mendoza",
  "Valeria Cruz", "Nicolás Blanco", "Camila Suárez", "Rodrigo Mesa",
  "Andrea Quiroga", "Marcos Luna", "Paola Rivero", "Santiago Paredes",
  "Fernanda Cabrera", "Luis Montero", "Gabriela Arias", "Tomás Garrido",
];

const DISCOUNT_REASONS = [
  "Promoción 2x1", "Cortesía del local", "Club lealtad", "Degustación",
];

// La Paz = UTC-4 fijo (constante durante todo el año).
const LA_PAZ_OFFSET_MS = 4 * 60 * 60_000;

// Rango: de 2026-08-04 a 2026-09-02 inclusive (30 días).
const RANGE = { start: Date.UTC(2026, 7, 4), end: Date.UTC(2026, 8, 3) };

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function weighted(pairs) {
  const r = Math.random();
  let acc = 0;
  for (const [weight, value] of pairs) {
    acc += weight;
    if (r <= acc) return value;
  }
  return pairs[pairs.length - 1][1];
}

// Fecha/hora local en La Paz (hora negocio 11:00–23:00 con pico por la tarde).
function localDateTime(dayTs) {
  const peakish = weighted([
    [0.6, rand(12, 15)],
    [0.3, rand(16, 19)],
    [0.1, rand(11, 20)],
  ]);
  return new Date(dayTs + peakish * 3600_000 + rand(0, 59) * 60_000 - LA_PAZ_OFFSET_MS);
}

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ username: "cajero" }, { username: "mesero" }] },
    select: { id: true },
  });
  const sizes = await prisma.size.findMany({ select: { name: true } });
  const flavors = await prisma.flavor.findMany({
    select: { name: true, categories: { select: { category: true } } },
  });
  const bobas = await prisma.bobaType.findMany({ select: { name: true } });
  const toppings = await prisma.topping.findMany({
    select: { name: true, price: true },
  });
  // Precios reales por (categoría, tamaño, boba).
  const prices = await prisma.drinkPrice.findMany({
    select: { category: true, size: { select: { name: true } }, bobaType: { select: { name: true } }, price: true },
  });
  // Mapa de precios para inferir cada <unitPrice> real.
  const priceKey = (c, s, b) => `${c}|${s}|${b}`;
  const priceMap = new Map(prices.map((p) => [priceKey(p.category, p.size.name, p.bobaType.name), p.price]));

  const entries = flavors.map((f) => ({
    name: f.name,
    category: f.categories[0]?.category ?? "MILK",
  }));
  const sizeNames = sizes.map((s) => s.name);
  const bobaNames = bobas.map((b) => b.name);

  const maxSeq = await prisma.order.aggregate({ _max: { seq: true } });
  let seq = (maxSeq._max.seq ?? 0) + 1;

  const ordersData = [];
  for (let i = 0; i < 500; i++) {
    const day = new Date(RANGE.start + Math.random() * (RANGE.end - RANGE.start - 1));
    day.setUTCHours(0, 0, 0, 0);
    const createdAt = localDateTime(day.getTime());

    // Todos los pedidos quedan ACEPTADOS → ENTREGADOS y COBRADOS (sin ANULADO,
    // sin pendientes en cola). El pago se registra (paidAt + paymentMethod).
    const status = "ENTREGADO";
    const paidAt = new Date(createdAt.getTime() + rand(1, 6) * 60_000);
    const deliveredAt = new Date(createdAt.getTime() + rand(8, 35) * 60_000);

    const itemCount = rand(1, 3);
    const items = [];
    for (let j = 0; j < itemCount; j++) {
      const f = pick(entries);
      const sizeName = pick(sizeNames);
      const bobaName = pick(bobaNames);
      const unitPrice =
        priceMap.get(priceKey(f.category, sizeName, bobaName)) ?? rand(18, 32);
      const quantity = rand(1, 2);
      const itemToppings = [];
      if (Math.random() < 0.3 && toppings.length) {
        const t = pick(toppings);
        itemToppings.push({ unitPrice: t.price, toppingName: t.name });
      }
      items.push({
        sizeName,
        flavorName: f.name,
        flavorCategory: f.category,
        bobaTypeName: bobaName,
        unitPrice,
        quantity,
        toppings: itemToppings,
      });
    }

    const total = items.reduce(
      (sum, it) =>
        sum +
        (it.unitPrice +
          it.toppings.reduce((s, t) => s + t.unitPrice, 0)) *
          it.quantity,
      0,
    );

    const hasDiscount = Math.random() < 0.12;
    const discountAmount = hasDiscount
      ? Math.min(Math.round(total * rand(5, 20) / 100), total)
      : 0;

    // Pagos: EFECTIVO 45% · QR 40% · TARJETA 15%, con pagos divididos ocasionales.
    const method = weighted([[0.45, "EFECTIVO"], [0.4, "QR"], [0.15, "TARJETA"]]);
    let paymentMethod = method, paymentMethod2 = null, paymentAmount2 = null;
    if (Math.random() < 0.08) {
      const second = weighted([[0.5, "EFECTIVO"], [0.3, "QR"], [0.2, "TARJETA"]]);
      if (second !== method) {
        paymentMethod2 = second;
        paymentAmount2 = Math.max(1, Math.round(total * rand(15, 50) / 100));
      }
    }

    ordersData.push({
      seq: seq++,
      status,
      customerName: pick(CUSTOMERS),
      deliveryType: pick(["MESA", "LLEVAR"]),
      total,
      createdAt,
      paidAt,
      deliveredAt,
      userId: users.length ? pick(users).id : null,
      paymentMethod,
      paymentMethod2,
      paymentAmount2,
      discountAmount,
      discountReason: hasDiscount ? pick(DISCOUNT_REASONS) : null,
      discountedAt: hasDiscount ? deliveredAt : null,
      discountedById: hasDiscount && users.length ? pick(users).id : null,
      delayNotified: false,
      items,
    });
  }

  // Insertar pedidos (createMany no soporta anidados)
  const chunk = 50;
  for (let i = 0; i < ordersData.length; i += chunk) {
    const slice = ordersData.slice(i, i + chunk);
    await prisma.order.createMany({
      data: slice.map(({ items, ...o }) => o),
    });
  }

  const firstSeq = ordersData[0].seq;
  const created = await prisma.order.findMany({
    where: { seq: { gte: firstSeq } },
    select: { id: true, seq: true },
  });
  const bySeq = new Map(created.map((o) => [o.seq, o.id]));

  const itemsData = [];
  for (const o of ordersData) {
    const orderId = bySeq.get(o.seq);
    if (!orderId) continue;
    for (const it of o.items) itemsData.push({ orderId, ...it });
  }
  for (let i = 0; i < itemsData.length; i += 100) {
    const slice = itemsData.slice(i, i + 100);
    await prisma.orderItem.createMany({
      data: slice.map(({ toppings, ...it }) => it),
    });
  }

  const dbItems = await prisma.orderItem.findMany({
    where: { orderId: { in: itemsData.map((i) => i.orderId) } },
    select: { id: true, orderId: true },
  });
  const itemsByOrder = new Map();
  for (const it of dbItems) {
    if (!itemsByOrder.has(it.orderId)) itemsByOrder.set(it.orderId, []);
    itemsByOrder.get(it.orderId).push(it.id);
  }
  const toppingRows = [];
  for (const o of ordersData) {
    const orderId = bySeq.get(o.seq);
    if (!orderId) continue;
    const ids = itemsByOrder.get(orderId) ?? [];
    o.items.forEach((it, k) => {
      const itemId = ids[k];
      if (!itemId) return;
      for (const t of it.toppings) toppingRows.push({ orderItemId: itemId, ...t });
    });
  }
  for (let i = 0; i < toppingRows.length; i += 100) {
    await prisma.orderItemTopping.createMany({ data: toppingRows.slice(i, i + 100) });
  }

  const totalOrders = await prisma.order.count();
  const summary = await prisma.order.groupBy({
    by: ["status"],
    _count: true,
    _sum: { total: true, discountAmount: true },
    _avg: { total: true },
  });
  console.log("== Seed de ventas completado ==");
  console.log(`Pedidos totales en BD: ${totalOrders} (12 previos + 500 nuevos)`);
  console.log("Por estado:", JSON.stringify(summary.map((r) => ({
    status: r.status,
    count: r._count,
    total: Number(r._sum.total ?? 0),
    discounts: Number(r._sum.discountAmount ?? 0),
    avg: Math.round(Number(r._avg.total ?? 0)),
  }))));
  console.log(`Ítems: ${itemsData.length}, toppings: ${toppingRows.length}`);
  console.log(`Nuevo rango seq: ${firstSeq} .. ${firstSeq + 499}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());