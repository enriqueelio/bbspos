"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bubba/db";
import { getRequiredSession } from "@/lib/session";

export async function createSize(input: {
  name: string;
  ml: number;
  price: number;
}) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.ml <= 0 || input.price <= 0) {
    throw new Error("Datos inválidos: nombre, ml y precio son obligatorios.");
  }
  await prisma.size.create({ data: { name, ml: input.ml, price: input.price } });
  revalidatePath("/menu");
}

export async function updateSize(
  id: string,
  input: {
    name: string;
    ml: number;
    price: number;
    available: boolean;
  },
) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.ml <= 0 || input.price <= 0) {
    throw new Error("Datos inválidos: nombre, ml y precio son obligatorios.");
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
  category: string;
  price: number;
}) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.price <= 0) {
    throw new Error("Datos inválidos: nombre y precio son obligatorios.");
  }
  await prisma.flavor.create({
    data: {
      name,
      category: input.category as "MILK" | "WATER" | "SPECIAL",
      price: input.price,
    },
  });
  revalidatePath("/menu");
}

export async function updateFlavor(
  id: string,
  input: {
    name: string;
    category: string;
    price: number;
    available: boolean;
  },
) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.price <= 0) {
    throw new Error("Datos inválidos: nombre y precio son obligatorios.");
  }
  await prisma.flavor.update({
    where: { id },
    data: {
      name,
      category: input.category as "MILK" | "WATER" | "SPECIAL",
      price: input.price,
      available: input.available,
    },
  });
  revalidatePath("/menu");
}

export async function deleteFlavor(id: string) {
  await getRequiredSession();
  await prisma.flavor.delete({ where: { id } });
  revalidatePath("/menu");
}

export async function createBoba(input: {
  name: string;
  kind: string;
  price: number;
}) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.price <= 0) {
    throw new Error("Datos inválidos: nombre y precio son obligatorios.");
  }
  await prisma.bobaType.create({
    data: {
      name,
      kind: input.kind as "TAPIOCA" | "POPPING",
      price: input.price,
    },
  });
  revalidatePath("/menu");
}

export async function updateBoba(
  id: string,
  input: {
    name: string;
    kind: string;
    price: number;
    available: boolean;
  },
) {
  await getRequiredSession();
  const name = input.name.trim();
  if (!name || input.price <= 0) {
    throw new Error("Datos inválidos: nombre y precio son obligatorios.");
  }
  await prisma.bobaType.update({
    where: { id },
    data: {
      name,
      kind: input.kind as "TAPIOCA" | "POPPING",
      price: input.price,
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
