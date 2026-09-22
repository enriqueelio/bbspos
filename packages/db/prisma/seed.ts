import { PrismaClient, BobaKind, FlavorCategory } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const sizeNames = ["Grande", "Extragrande"];
const bobaTypeNames = ["Tapioca", "Explosivas"];

const flavorList: { name: string; categories: FlavorCategory[] }[] = [
  { name: "Capuchino", categories: [FlavorCategory.SPECIAL] },
  { name: "Oreo", categories: [FlavorCategory.SPECIAL] },
  { name: "Fruticoco", categories: [FlavorCategory.SPECIAL] },
  { name: "Matcha", categories: [FlavorCategory.SPECIAL] },
  { name: "Piña colada", categories: [FlavorCategory.SPECIAL] },
  { name: "Limonada brasilera", categories: [FlavorCategory.SPECIAL] },
  { name: "Frutilimon", categories: [FlavorCategory.SPECIAL] },
  { name: "Taro", categories: [FlavorCategory.SPECIAL] },
  { name: "Frutilla", categories: [FlavorCategory.WATER, FlavorCategory.MILK] },
  { name: "Limón", categories: [FlavorCategory.WATER] },
  { name: "Piña", categories: [FlavorCategory.WATER] },
  { name: "Manzana", categories: [FlavorCategory.WATER] },
  { name: "Naranja", categories: [FlavorCategory.WATER] },
  { name: "Mango", categories: [FlavorCategory.WATER] },
  { name: "Coco", categories: [FlavorCategory.MILK] },
  { name: "Vainilla", categories: [FlavorCategory.MILK] },
  { name: "Chocolate", categories: [FlavorCategory.MILK] },
  { name: "Mora", categories: [FlavorCategory.MILK] },
];

const priceMatrix: Record<
  FlavorCategory,
  Record<string, Record<string, number>>
> = {
  [FlavorCategory.SPECIAL]: {
    Grande: { Tapioca: 20, Explosivas: 25 },
    Extragrande: { Tapioca: 30, Explosivas: 35 },
  },
  [FlavorCategory.WATER]: {
    Grande: { Tapioca: 16, Explosivas: 20 },
    Extragrande: { Tapioca: 25, Explosivas: 30 },
  },
  [FlavorCategory.MILK]: {
    Grande: { Tapioca: 18, Explosivas: 22 },
    Extragrande: { Tapioca: 28, Explosivas: 32 },
  },
};

const toppings = [
  { name: "Tapioca extra", price: 4 },
  { name: "Explosiva extra", price: 5 },
];

async function main() {
  const sizes = [
    { name: "Grande", oz: 16, isDefault: true },
    { name: "Extragrande", oz: 21, isDefault: false },
  ];

  for (const size of sizes) {
    await prisma.size.upsert({
      where: { name: size.name },
      update: size,
      create: size,
    });
  }

  await prisma.size.deleteMany({ where: { name: { notIn: sizeNames } } });

  const bobaTypes = [
    { name: "Tapioca", kind: BobaKind.TAPIOCA, isDefault: true },
    { name: "Explosivas", kind: BobaKind.POPPING, isDefault: false },
  ];

  for (const boba of bobaTypes) {
    await prisma.bobaType.upsert({
      where: { name: boba.name },
      update: boba,
      create: boba,
    });
  }

  await prisma.bobaType.deleteMany({ where: { name: { notIn: bobaTypeNames } } });

  for (const flavor of flavorList) {
    const created = await prisma.flavor.upsert({
      where: { name: flavor.name },
      update: {},
      create: { name: flavor.name },
    });

    await prisma.flavorCategoryLink.deleteMany({
      where: { flavorId: created.id },
    });

    if (flavor.categories.length > 0) {
      await prisma.flavorCategoryLink.createMany({
        data: flavor.categories.map((category) => ({
          flavorId: created.id,
          category,
        })),
      });
    }
  }

  await prisma.flavor.deleteMany({
    where: { name: { notIn: flavorList.map((f) => f.name) } },
  });

  const sizeByName = new Map(
    (await prisma.size.findMany()).map((s) => [s.name, s.id]),
  );
  const bobaByName = new Map(
    (await prisma.bobaType.findMany()).map((b) => [b.name, b.id]),
  );

  for (const [category, bySize] of Object.entries(priceMatrix)) {
    for (const [sizeName, byBoba] of Object.entries(bySize)) {
      for (const [bobaName, price] of Object.entries(byBoba)) {
        const sizeId = sizeByName.get(sizeName);
        const bobaTypeId = bobaByName.get(bobaName);
        if (!sizeId || !bobaTypeId) continue;
        await prisma.drinkPrice.upsert({
          where: {
            category_sizeId_bobaTypeId: {
              category: category as FlavorCategory,
              sizeId,
              bobaTypeId,
            },
          },
          update: { price },
          create: {
            category: category as FlavorCategory,
            sizeId,
            bobaTypeId,
            price,
          },
        });
      }
    }
  }

  for (const topping of toppings) {
    await prisma.topping.upsert({
      where: { name: topping.name },
      update: topping,
      create: topping,
    });
  }

  const adminPassword = await hash("admin123", 10);

  await prisma.user.upsert({
    where: { username: "superadmin" },
    update: { role: "SUPER_ADMIN" },
    create: {
      username: "superadmin",
      name: "Super Admin",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { role: "ADMIN" },
    create: {
      username: "admin",
      name: "Administrador",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const cajeroPassword = await hash("cajero123", 10);

  await prisma.user.upsert({
    where: { username: "cajero" },
    update: {},
    create: {
      username: "cajero",
      name: "Cajero Principal",
      password: cajeroPassword,
      role: "CAJERO",
    },
  });

  const meseroPassword = await hash("mesero123", 10);

  await prisma.user.upsert({
    where: { username: "mesero" },
    update: {},
    create: {
      username: "mesero",
      name: "Mesero de Turno",
      password: meseroPassword,
      role: "MESERO",
    },
  });

  // Reglas de lealtad por defecto: se crean solo si no existen (nunca borran ni
  // pisan los umbrales editados desde Admin).
  const benefitRules = [
    {
      name: "Cliente Habitual",
      description: "5 visitas al mes: cortesía de una explosiva extra en su bebida.",
      metric: "VISITS_MONTH",
      threshold: 5,
    },
    {
      name: "Frecuente",
      description: "150 Bs de gasto al mes: 10% de descuento en un producto.",
      metric: "SPEND_MONTH",
      threshold: 150,
    },
    {
      name: "VIP",
      description: "300 Bs de gasto al mes: bebida grande gratis de cortesía.",
      metric: "SPEND_MONTH",
      threshold: 300,
    },
    {
      name: "Amante del Té",
      description: "500 puntos acumulados: canje de bebida a elección.",
      metric: "POINTS",
      threshold: 500,
    },
  ] as const;

  for (const rule of benefitRules) {
    const existing = await prisma.customerBenefitRule.findFirst({
      where: { name: rule.name },
    });
    if (!existing) {
      await prisma.customerBenefitRule.create({
        data: { ...rule, active: true },
      });
    }
  }

  console.log(
    "Catálogo, matriz de precios, super admin, admin, cajero, mesero y reglas de lealtad sembrados correctamente.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
