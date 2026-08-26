/* Datos de prueba para reportes: 3 cajeros x 200 ventas en los últimos 7 días. */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const HASH = readFileSync("C:/Users/PC-ENRIQUE/AppData/Local/Temp/opencode/hash.txt", "utf-8").trim();

const CAJEROS = [
  { email: "cajero@bubba.mx", name: "Cajero Uno" }, // ya existe
  { email: "cajero2@bubba.mx", name: "Ana Mamani" },
  { email: "cajero3@bubba.mx", name: "Luis Torrez" },
];

const CUSTOMERS = [
  "María Fernández", "Juan Pérez", "Lucía Rojas", "Diego Salazar",
  "Carla Ortiz", "Pedro Antelo", "Sofía Vargas", "Andrés Mendoza",
  "Valeria Cruz", "Nicolás Blanco", "Camila Suárez", "Robo Mesa",
];

// La Paz = UTC-4 fijo
function localDate(daysAgo, hourLocal, minuteLocal) {
  const now = new Date();
  const base = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, hourLocal + 4, minuteLocal),
  );
  return base;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

async function main() {
  // 1) Cajeros
  const users = [];
  for (const c of CAJEROS) {
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: { name: c.name, role: "CAJERO", active: true },
      create: { email: c.email, name: c.name, password: HASH, role: "CAJERO", active: true },
    });
    users.push(u);
  }
  console.log(`cajeros: ${users.map((u) => u.name).join(", ")}`);

  // 2) Catálogo real para ítems consistentes
  const sizes = await prisma.size.findMany();
  const flavors = await prisma.flavor.findMany({ include: { categories: true } });
  const bobaTypes = await prisma.bobaType.findMany();
  const toppings = await prisma.topping.findMany();

  const sizeNames = sizes.length ? sizes.map((s) => s.name) : ["16oz", "22oz"];
  const flavorNames = flavors.length ? flavors.map((f) => f.name) : ["Taro", "Chocolate", "Fresa"];
  const bobaNames = bobaTypes.length ? bobaTypes.map((b) => b.name) : ["Tapioca", "Popping Boba"];
  const toppingNames = toppings.length ? toppings.map((t) => t.name) : [];

  // 3) Secuencia correlativa
  const maxSeq = await prisma.order.aggregate({ _max: { seq: true } });
  let seq = (maxSeq._max.seq ?? 0) + 1;

  // 4) Generar pedidos
  const ordersData = [];
  for (const user of users) {
    for (let i = 0; i < 200; i++) {
      const daysAgo = rand(0, 6);
      const createdAt = localDate(daysAgo, rand(10, 21), rand(0, 59));
      const roll = Math.random();

      let status, deliveredAt = null, cancelledAt = null, cancelReason = null;
      if (roll < 0.93) {
        status = "ENTREGADO";
        deliveredAt = new Date(createdAt.getTime() + rand(3, 25) * 60_000);
      } else {
        status = "ANULADO";
        cancelledAt = new Date(createdAt.getTime() + rand(1, 10) * 60_000);
        cancelReason = pick(["Cliente se retiró", "Sin insumos", "Pedido duplicado"]);
      }

      // Ítems primero para calcular total
      const itemCount = rand(1, 3);
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        const quantity = rand(1, 2);
        const unitPrice = rand(18, 32);
        const itemToppings = [];
        const toppingCount = Math.random() < 0.5 ? rand(0, 2) : 0;
        for (let t = 0; t < toppingCount; t++) {
          itemToppings.push({ unitPrice: rand(2, 5), toppingName: toppingNames.length ? pick(toppingNames) : "Extra pearls" });
        }
        items.push({
          sizeName: pick(sizeNames),
          flavorName: pick(flavorNames),
          flavorCategory: pick(["MILK", "WATER", "SPECIAL"]),
          bobaTypeName: pick(bobaNames),
          unitPrice,
          quantity,
          toppings: itemToppings,
        });
      }

      const subtotal = items.reduce(
        (sum, it) => sum + it.quantity * it.unitPrice + it.toppings.reduce((s, t) => s + t.unitPrice, 0),
        0,
      );
      const hasDiscount = status === "ENTREGADO" && Math.random() < 0.08;
      const discountAmount = hasDiscount ? Math.min(5, subtotal) : 0;

      ordersData.push({
        seq: seq++,
        status,
        customerName: pick(CUSTOMERS),
        total: subtotal - discountAmount,
        createdAt,
        deliveredAt,
        cancelledAt,
        cancelReason,
        userId: user.id,
        paymentMethod: status === "ENTREGADO" ? pick(["EFECTIVO", "QR", "TARJETA"]) : null,
        discountAmount,
        discountReason: hasDiscount ? "Promoción 2x1" : null,
        discountedAt: hasDiscount ? deliveredAt : null,
        items,
      });
    }
  }

  // 5) Insertar en lotes
  const chunkSize = 50;
  for (let i = 0; i < ordersData.length; i += chunkSize) {
    const chunk = ordersData.slice(i, i + chunkSize);
    await prisma.order.createMany({
      data: chunk.map(({ items, ...o }) => o),
    });
  }

  // Recuperar ids por seq para adjuntar ítems
  const created = await prisma.order.findMany({
    where: { seq: { gte: ordersData[0].seq - ordersData.length + 1 } },
    select: { id: true, seq: true },
  });
  const bySeq = new Map(created.map((o) => [o.seq, o.id]));

  const itemsData = [];
  const toppingsData = []; // se insertan tras los ítems
  for (const o of ordersData) {
    const orderId = bySeq.get(o.seq);
    if (!orderId) continue;
    for (const it of o.items) {
      itemsData.push({ orderId, ...it });
    }
  }

  const createdItems = [];
  for (let i = 0; i < itemsData.length; i += 100) {
    const chunk = itemsData.slice(i, i + 100);
    await prisma.orderItem.createMany({ data: chunk.map(({ toppings, ...it }) => it) });
  }
  const orderIds = [...new Set(itemsData.map((i) => i.orderId))];
  const dbItems = await prisma.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: { id: true, orderId: true },
  });
  // Emparejar toppings por orden de inserción (orden no garantizado; es dato de prueba)
  let idx = 0;
  const itemByOrder = new Map();
  for (const it of dbItems) {
    if (!itemByOrder.has(it.orderId)) itemByOrder.set(it.orderId, []);
    itemByOrder.get(it.orderId).push(it.id);
  }
  for (const o of ordersData) {
    const ids = itemByOrder.get(bySeq.get(o.seq)) ?? [];
    o.items.forEach((it, k) => {
      const itemId = ids[k];
      if (!itemId) return;
      for (const t of it.toppings) {
        toppingsData.push({ orderItemId: itemId, ...t });
      }
    });
    idx++;
  }
  for (let i = 0; i < toppingsData.length; i += 100) {
    await prisma.orderItemTopping.createMany({ data: toppingsData.slice(i, i + 100) });
  }

  const counts = {};
  for (const u of users) {
    counts[u.name] = await prisma.order.count({ where: { userId: u.id } });
  }
  console.log("pedidos por cajero:", counts);
  console.log(`total ítems: ${itemsData.length}, toppings: ${toppingsData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
