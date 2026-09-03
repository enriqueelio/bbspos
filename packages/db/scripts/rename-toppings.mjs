import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Renombra los toppings antiguos a los nuevos nombres cortos:
 *   "Boba de tapioca extra"  → "Tapioca extra"
 *   "Bobas explosivas extra" → "Explosiva extra"
 *   "Boba explosiva extra"   → "Explosiva extra"
 *
 * También actualiza el toppingName en OrderItemTopping (histórico)
 * para que las comandas impresas y los reportes muestren el nuevo nombre.
 */
const RENAMES = [
  { from: "Boba de tapioca extra", to: "Tapioca extra" },
  { from: "Bobas explosivas extra", to: "Explosiva extra" },
  { from: "Boba explosiva extra", to: "Explosiva extra" },
];

async function main() {
  let totalToppings = 0;
  let totalOrderItems = 0;

  for (const { from, to } of RENAMES) {
    // 1. Actualizar la tabla Topping (catálogo)
    const updated = await prisma.topping.updateMany({
      where: { name: from },
      data: { name: to },
    });
    if (updated.count > 0) {
      console.log(`[Topping] "${from}" → "${to}"  (${updated.count} registro(s))`);
      totalToppings += updated.count;
    }

    // 2. Actualizar el toppingName en OrderItemTopping (histórico)
    const orderItems = await prisma.orderItemTopping.updateMany({
      where: { toppingName: from },
      data: { toppingName: to },
    });
    if (orderItems.count > 0) {
      console.log(`[OrderItemTopping] "${from}" → "${to}"  (${orderItems.count} registro(s))`);
      totalOrderItems += orderItems.count;
    }
  }

  if (totalToppings === 0 && totalOrderItems === 0) {
    console.log("No se encontraron toppings con los nombres antiguos. Ya están actualizados.");
  } else {
    console.log(`\nListo: ${totalToppings} topping(s) del catálogo y ${totalOrderItems} referencia(s) en pedidos actualizados.`);
  }
}

main()
  .catch((e) => {
    console.error("Error al renombrar toppings:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
