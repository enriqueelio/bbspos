import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const sizes = await prisma.size.findMany();
  const bobaTypes = await prisma.bobaType.findMany();
  const toppings = await prisma.topping.findMany();
  const flavors = await prisma.flavor.findMany({ include: { categories: true } });
  const todayOrders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  const maxSeq = await prisma.order.aggregate({ _max: { seq: true } });

  console.log("USUARIOS:", JSON.stringify(users.map((u) => ({ username: u.username, name: u.name, role: u.role, active: u.active }))));
  console.log("SIZES:", sizes.map((s) => `${s.name}(${s.oz}oz)`));
  console.log("BOBA:", bobaTypes.map((b) => `${b.name}[${b.kind}]`));
  console.log("TOPPINGS:", toppings.map((t) => `${t.name}=${t.price}`));
  console.log("FLAVORS:", flavors.map((f) => `${f.name}[${f.categories.map((c) => c.category).join(",")}]`));
  console.log("MAX_SEQ:", maxSeq._max.seq);
  console.log("PEDIDOS_TOTAL:", todayOrders.length);
  console.log("PEDIDOS_HOY:", JSON.stringify(todayOrders.slice(0, 8).map((o) => ({
    seq: o.seq, status: o.status, customerName: o.customerName, total: o.total,
    createdAt: o.createdAt.toISOString(), paymentMethod: o.paymentMethod,
    userId: o.userId,
  }))));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
