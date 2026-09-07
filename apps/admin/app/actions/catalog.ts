"use server";

import { revalidatePath } from "next/cache";
import { prisma, setMenuDelDiaForToday } from "@bbspos/db";
import { Role, type FlavorCategory, type MenuCategory } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";

async function requireAdminSession() {
  const session = await getRequiredSession();
  if (session.user.role !== Role.ADMIN) {
    throw new Error("Solo los administradores pueden modificar el menú.");
  }
  return session;
}

export async function createSize(input: { name: string; oz: number }) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.oz <= 0) {
    throw new Error("Datos inválidos: nombre y onzas son obligatorios.");
  }
  await prisma.size.create({ data: { name, oz: input.oz } });
  revalidatePath("/menu");
}

export async function updateSize(
  id: string,
  input: { name: string; oz: number; available: boolean },
) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.oz <= 0) {
    throw new Error("Datos inválidos: nombre y onzas son obligatorios.");
  }
  await prisma.size.update({ where: { id }, data: input });
  revalidatePath("/menu");
}

export async function deleteSize(id: string) {
  await getRequiredSession();
  await prisma.size.delete({ where: { id } });
  revalidatePath("/menu");
}

export async function createFlavor(input: {
  name: string;
  categories: FlavorCategory[];
}) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.categories.length === 0) {
    throw new Error(
      "Datos inválidos: nombre y al menos una categoría son obligatorios.",
    );
  }
  await prisma.flavor.create({
    data: {
      name,
      categories: {
        create: input.categories.map((category) => ({ category })),
      },
    },
  });
  revalidatePath("/menu");
}

export async function updateFlavor(
  id: string,
  input: { name: string; categories: FlavorCategory[]; available: boolean },
) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.categories.length === 0) {
    throw new Error(
      "Datos inválidos: nombre y al menos una categoría son obligatorios.",
    );
  }
  await prisma.flavor.update({
    where: { id },
    data: {
      name,
      available: input.available,
      categories: {
        deleteMany: {},
        create: input.categories.map((category) => ({ category })),
      },
    },
  });
  revalidatePath("/menu");
}

export async function deleteFlavor(id: string) {
  await getRequiredSession();
  await prisma.flavor.delete({ where: { id } });
  revalidatePath("/menu");
}

export async function createBoba(input: { name: string; kind: string }) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Datos inválidos: nombre es obligatorio.");
  }
  await prisma.bobaType.create({
    data: {
      name,
      kind: input.kind as "TAPIOCA" | "POPPING",
    },
  });
  revalidatePath("/menu");
}

export async function updateBoba(
  id: string,
  input: { name: string; kind: string; available: boolean },
) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Datos inválidos: nombre es obligatorio.");
  }
  await prisma.bobaType.update({
    where: { id },
    data: {
      name,
      kind: input.kind as "TAPIOCA" | "POPPING",
      available: input.available,
    },
  });
  revalidatePath("/menu");
}

export async function deleteBoba(id: string) {
  await getRequiredSession();
  await prisma.bobaType.delete({ where: { id } });
  revalidatePath("/menu");
}

export async function createTopping(input: { name: string; price: number }) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.price <= 0) {
    throw new Error("Datos inválidos: nombre y precio son obligatorios.");
  }
  await prisma.topping.create({ data: { name, price: input.price } });
  revalidatePath("/menu");
}

export async function updateTopping(
  id: string,
  input: { name: string; price: number; available: boolean },
) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.price <= 0) {
    throw new Error("Datos inválidos: nombre y precio son obligatorios.");
  }
  await prisma.topping.update({ where: { id }, data: input });
  revalidatePath("/menu");
}

export async function deleteTopping(id: string) {
  await getRequiredSession();
  await prisma.topping.delete({ where: { id } });
  revalidatePath("/menu");
}

export async function saveDrinkPrices(input: {
  category: FlavorCategory;
  prices: { sizeId: string; bobaTypeId: string; price: number }[];
}) {
  await getRequiredSession();
  const valid = input.prices.filter(
    (p) => p.sizeId && p.bobaTypeId && p.price > 0,
  );
  if (valid.length === 0) {
    throw new Error("Al menos un precio de la matriz es obligatorio.");
  }
  await prisma.$transaction(
    valid.map((p) =>
      prisma.drinkPrice.upsert({
        where: {
          category_sizeId_bobaTypeId: {
            category: input.category,
            sizeId: p.sizeId,
            bobaTypeId: p.bobaTypeId,
          },
        },
        update: { price: p.price },
        create: {
          category: input.category,
          sizeId: p.sizeId,
          bobaTypeId: p.bobaTypeId,
          price: p.price,
        },
      }),
    ),
  );
  revalidatePath("/menu");
}

export async function createMenuItem(input: {
  name: string;
  category: MenuCategory;
  price: number;
  description?: string | null;
  options?: { name: string; price: number }[];
}) {
  await getRequiredSession();
  const name = input.name.trim();
  const options = (input.options ?? []).filter(
    (o) => o.name.trim() && o.price > 0,
  );
  if (!name) {
    throw new Error("Datos inválidos: nombre es obligatorio.");
  }
  if (!input.price || input.price <= 0) {
    throw new Error("Datos inválidos: precio es obligatorio.");
  }
  const optsValid = options.every((o) => o.price > 0 && Number.isFinite(o.price));
  if (!optsValid) {
    throw new Error("Datos inválidos: precio de variante inválido.");
  }
  await prisma.menuItem.create({
    data: {
      name,
      category: input.category,
      price: Math.trunc(input.price),
      description: input.description?.trim() || null,
      options: {
        create: options.map((o) => ({
          name: o.name.trim(),
          price: Math.trunc(o.price),
        })),
      },
    },
  });
  revalidatePath("/menu");
}

export async function updateMenuItem(
  id: string,
  input: {
    name: string;
    category: MenuCategory;
    price: number;
    available: boolean;
    description?: string | null;
    options?: { name: string; price: number }[];
  },
) {
  await getRequiredSession();
  const name = input.name.trim();
  const options = (input.options ?? []).filter(
    (o) => o.name.trim() && o.price > 0,
  );
  if (!name) {
    throw new Error("Datos inválidos: nombre es obligatorio.");
  }
  if (!input.price || input.price <= 0) {
    throw new Error("Datos inválidos: precio es obligatorio.");
  }
  await prisma.$transaction([
    prisma.menuItemOption.deleteMany({ where: { menuItemId: id } }),
    prisma.menuItem.update({
      where: { id },
      data: {
        name,
        category: input.category,
        price: Math.trunc(input.price),
        available: input.available,
        description: input.description?.trim() || null,
        options: {
          create: options.map((o) => ({
            name: o.name.trim(),
            price: Math.trunc(o.price),
          })),
        },
      },
    }),
  ]);
  revalidatePath("/menu");
}

export async function deleteMenuItem(id: string) {
  await getRequiredSession();
  await prisma.menuItem.delete({ where: { id } });
  revalidatePath("/menu");
}

/** Activa (ON) o desactiva (OFF) el Menú del Día de un plato para la jornada actual. */
export async function setMenuItemMenuDelDia(id: string, on: boolean) {
  await requireAdminSession();
  await setMenuDelDiaForToday(id, on);
  revalidatePath("/menu");
}
