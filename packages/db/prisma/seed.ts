import { PrismaClient, BobaKind, FlavorCategory } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const sizes = [
    { name: "Chico", ml: 350, price: 4500 },
    { name: "Mediano", ml: 500, price: 5500 },
    { name: "Grande", ml: 700, price: 6500 },
  ];

  for (const size of sizes) {
    await prisma.size.upsert({
      where: { name: size.name },
      update: size,
      create: size,
    });
  }

  const flavors = [
    { name: "Vainilla", category: FlavorCategory.MILK, price: 1000 },
    { name: "Chocolate", category: FlavorCategory.MILK, price: 1200 },
    { name: "Fresa", category: FlavorCategory.MILK, price: 1200 },
    { name: "Limón", category: FlavorCategory.WATER, price: 900 },
    { name: "Mango", category: FlavorCategory.WATER, price: 1000 },
    { name: "Maracuyá", category: FlavorCategory.WATER, price: 1100 },
    { name: "Matcha", category: FlavorCategory.SPECIAL, price: 1500 },
    { name: "Taro", category: FlavorCategory.SPECIAL, price: 1500 },
    { name: "Café con leche", category: FlavorCategory.SPECIAL, price: 1400 },
  ];

  for (const flavor of flavors) {
    await prisma.flavor.upsert({
      where: { name: flavor.name },
      update: flavor,
      create: flavor,
    });
  }

  const bobaTypes = [
    { name: "Tapioca clásica", kind: BobaKind.TAPIOCA, price: 1000 },
    { name: "Tapioca miel", kind: BobaKind.TAPIOCA, price: 1200 },
    { name: "Explosivas de mango", kind: BobaKind.POPPING, price: 1500 },
    { name: "Explosivas de fresa", kind: BobaKind.POPPING, price: 1500 },
  ];

  for (const boba of bobaTypes) {
    await prisma.bobaType.upsert({
      where: { name: boba.name },
      update: boba,
      create: boba,
    });
  }

  const adminPassword = await hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@bubba.mx" },
    update: {},
    create: {
      email: "admin@bubba.mx",
      name: "Administrador",
      password: adminPassword,
    },
  });

  console.log("Catálogo y usuario admin sembrados correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
