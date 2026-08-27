import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function ago(minutes) {
  return new Date(Date.now() - minutes * 60_000);
}

async function main() {
  const sizes = await prisma.size.findMany();
  const bobaTypes = await prisma.bobaType.findMany();
  const topping = await prisma.topping.findFirst({ where: { name: "Boba de tapioca extra" } });
  const bartender = await prisma.user.findUnique({ where: { email: "cajero@bubba.mx" } });

  if (!topping) throw new Error("falta topping");
  const sizeG = sizes.find((s) => s.name === "Grande");
  const sizeXg = sizes.find((s) => s.name === "Extragrande");
  const tapioca = bobaTypes.find((b) => b.name === "Tapioca");
  const explosivas = bobaTypes.find((b) => b.name === "Explosivas");
  if (!sizeG || !sizeXg || !tapioca || !explosivas) throw new Error("falta catálogo");

  const maxSeq = await prisma.order.aggregate({ _max: { seq: true } });
  let seq = (maxSeq._max.seq ?? 0) + 1;

  // Limpiar pedidos de prueba previos
  await prisma.orderItemTopping.deleteMany({ where: { orderItem: { order: { customerName: { startsWith: "PRUEBA-UI" } } } } });
  await prisma.orderItem.deleteMany({ where: { order: { customerName: { startsWith: "PRUEBA-UI" } } } });
  await prisma.order.deleteMany({ where: { customerName: { startsWith: "PRUEBA-UI" } } });

  // PEDIDO 1: RECIBIDO fresco (~2 min) -> badge azul, botones azules de cobro
  await prisma.order.create({
    data: {
      seq: seq++, status: "RECIBIDO", customerName: "PRUEBA-UI Recibido nuevo",
      deliveryType: "MESA", total: 51, createdAt: ago(2),
      items: { create: [
        { sizeName: sizeG.name, flavorName: "Taro", flavorCategory: "SPECIAL", bobaTypeName: tapioca.name, unitPrice: 20, quantity: 2,
          toppings: { create: [{ toppingName: topping.name, unitPrice: topping.price }] } },
        { sizeName: sizeG.name, flavorName: "Frutilla", flavorCategory: "MILK", bobaTypeName: explosivas.name, unitPrice: 22, quantity: 1 },
      ] },
    },
  });

  // PEDIDO 2: RECIBIDO ~20 min -> badge ROJO destructive (urgente)
  await prisma.order.create({
    data: {
      seq: seq++, status: "RECIBIDO", customerName: "PRUEBA-UI Recibido viejo",
      deliveryType: "LLEVAR", total: 35, createdAt: ago(20),
      items: { create: [
        { sizeName: sizeXg.name, flavorName: "Matcha", flavorCategory: "SPECIAL", bobaTypeName: tapioca.name, unitPrice: 30, quantity: 1,
          toppings: { create: [{ toppingName: topping.name, unitPrice: topping.price }] } },
        { sizeName: sizeG.name, flavorName: "Limón", flavorCategory: "WATER", bobaTypeName: explosivas.name, unitPrice: 20, quantity: 1 },
      ] },
    },
  });

  // PEDIDO 3: ACEPTADO (pagado, por entregar) -> badge verde + botón verde
  await prisma.order.create({
    data: {
      seq: seq++, status: "ACEPTADO", customerName: "PRUEBA-UI Aceptado",
      deliveryType: "MESA", total: 25, createdAt: ago(15),
      paidAt: ago(14), userId: bartender?.id, paymentMethod: "EFECTIVO",
      items: { create: [
        { sizeName: sizeG.name, flavorName: "Chocolate", flavorCategory: "MILK", bobaTypeName: tapioca.name, unitPrice: 18, quantity: 1,
          toppings: { create: [{ toppingName: topping.name, unitPrice: topping.price }] } },
      ] },
    },
  });

  // PEDIDO 4: ENTREGADO con entrega de 12 min (>=10) -> badge ROJO de entrega lenta
  await prisma.order.create({
    data: {
      seq: seq++, status: "ENTREGADO", customerName: "PRUEBA-UI Entregado lento",
      deliveryType: "LLEVAR", total: 20,
      createdAt: ago(42), paidAt: ago(41), deliveredAt: ago(30),
      userId: bartender?.id, paymentMethod: "QR",
      items: { create: [
        { sizeName: sizeG.name, flavorName: "Coco", flavorCategory: "MILK", bobaTypeName: tapioca.name, unitPrice: 18, quantity: 1,
          toppings: { create: [{ toppingName: topping.name, unitPrice: topping.price }] } },
      ] },
    },
  });

  const final = await prisma.order.findMany({
    where: { customerName: { startsWith: "PRUEBA-UI" } },
    orderBy: { seq: "asc" },
    select: { seq: true, status: true, customerName: true, createdAt: true, deliveredAt: true },
  });
  console.log("PEDIDOS DE PRUEBA:", JSON.stringify(final, null, 2));
  console.log("ahora:", new Date().toISOString(), new Date().toString());
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
