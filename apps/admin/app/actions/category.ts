"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import { Role } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { CATEGORY_ICON_NAMES } from "@bbspos/ui";

/** Vista de categoría para el panel del admin (todas, activas o no). */
export interface CategoryAdminView {
  key: string;
  name: string;
  slug: string;
  iconName: string;
  color: string;
  imageUrl: string | null;
  order: number;
  isActive: boolean;
  visibleInBar: boolean;
}

interface CategoryInput {
  /** Clave nueva (solo en alta o si la categoría no tiene platos asignados). */
  key: string;
  name: string;
  slug: string;
  iconName: string;
  color: string;
  visibleInBar: boolean;
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const KEY_RE = /^[A-Z0-9_]{2,}$/;
const SLUG_RE = /^[a-z0-9-]{2,}$/;

async function requireAdminSession() {
  const session = await getRequiredSession();
  if (
    session.user.role !== Role.ADMIN &&
    session.user.role !== Role.SUPER_ADMIN
  ) {
    throw new Error("Solo los administradores pueden modificar el menú.");
  }
}

function toView(
  c: Awaited<ReturnType<typeof prisma.category.findFirstOrThrow>>,
): CategoryAdminView {
  return {
    key: c.key,
    name: c.name,
    slug: c.slug,
    iconName: c.iconName,
    color: c.color,
    imageUrl: c.imageUrl,
    order: c.order,
    isActive: c.isActive,
    visibleInBar: c.visibleInBar,
  };
}

function validateInput(input: Partial<CategoryInput>, partial = false) {
  const errors: string[] = [];
  if (!partial || input.key !== undefined) {
    if (!input.key || !KEY_RE.test(input.key)) {
      errors.push("La clave debe ser mayúsculas, números o guión bajo (mínimo 2).");
    }
  }
  if (!partial || input.name !== undefined) {
    if (!input.name?.trim() || input.name.trim().length > 40) {
      errors.push("El nombre debe tener entre 1 y 40 caracteres.");
    }
  }
  if (!partial || input.slug !== undefined) {
    if (!input.slug || !SLUG_RE.test(input.slug)) {
      errors.push("El slug debe ser minúsculas o guiones (mínimo 2).");
    }
  }
  if (!partial || input.iconName !== undefined) {
    if (!CATEGORY_ICON_NAMES.includes(input.iconName ?? "")) {
      errors.push("Ícono no válido.");
    }
  }
  if (!partial || input.color !== undefined) {
    if (!input.color || !HEX_COLOR_RE.test(input.color)) {
      errors.push("El color debe estar en formato hex (#RRGGBB).");
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export async function listCategories(): Promise<CategoryAdminView[]> {
  await requireAdminSession();
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
  });
  return categories.map(toView);
}

export async function createCategory(input: CategoryInput): Promise<CategoryAdminView> {
  await requireAdminSession();
  validateInput(input);

  const existing = await prisma.category.findFirst({
    where: { OR: [{ key: input.key }, { slug: input.slug }] },
  });
  if (existing) {
    throw new Error(
      existing.key === input.key
        ? "Ya existe una categoría con esa clave."
        : "Ya existe una categoría con ese slug.",
    );
  }

  const last = await prisma.category.aggregate({ _max: { order: true } });
  const created = await prisma.category.create({
    data: {
      key: input.key,
      name: input.name.trim(),
      slug: input.slug,
      iconName: input.iconName,
      color: input.color,
      visibleInBar: input.visibleInBar,
      order: (last._max.order ?? 0) + 1,
    },
  });
  revalidatePath("/menu");
  return toView(created);
}

export async function updateCategory(
  input: CategoryInput,
): Promise<CategoryAdminView> {
  await requireAdminSession();
  validateInput(input, true);

  const current = await prisma.category.findUnique({ where: { key: input.key } });
  if (!current) {
    throw new Error("La categoría ya no existe.");
  }

  if (input.key !== current.key) {
    // La clave es el valor guardado en MenuItem.category: solo se puede cambiar
    // si ninguna fila la referencia (categoría sin platos de la carta).
    const referenced = await prisma.menuItem.count({
      where: { category: current.key },
    });
    if (referenced > 0) {
      throw new Error("No se puede cambiar la clave: hay platos asignados a esta categoría.");
    }
    const keyTaken = await prisma.category.findFirst({
      where: { OR: [{ key: input.key }, { slug: input.slug }] },
    });
    if (keyTaken) {
      throw new Error("Ya existe una categoría con esa clave o slug.");
    }
  } else if (input.slug !== current.slug) {
    const slugTaken = await prisma.category.findFirst({
      where: { slug: input.slug },
    });
    if (slugTaken) {
      throw new Error("Ya existe una categoría con ese slug.");
    }
  }

  const updated = await prisma.category.update({
    where: { key: current.key },
    data: {
      key: input.key,
      name: input.name.trim(),
      slug: input.slug,
      iconName: input.iconName,
      color: input.color,
      visibleInBar: input.visibleInBar,
    },
  });
  revalidatePath("/menu");
  return toView(updated);
}

/** Borrado lógico: la categoría deja de ofrecerse en terminales y reportes.
 *  ALMUERZO es la sección del Menú del Día (se arma desde enMenuDelDia/fecha del
 *  plato, no desde esta fila): desactivarla no escondería los almuerzos y solo
 *  confundiría, así que se protege. */
export async function setCategoryActive(
  input: { key: string; isActive: boolean },
): Promise<void> {
  await requireAdminSession();
  if (input.key === "ALMUERZO" && !input.isActive) {
    throw new Error("La categoría ALMUERZO no se puede desactivar.");
  }
  await prisma.category.update({
    where: { key: input.key },
    data: { isActive: input.isActive },
  });
  revalidatePath("/menu");
}

/** Persiste el orden del drag & drop. Exige que la lista sea exactamente el set
 *  de categorías activas (sin faltantes ni inventadas) y aplica los `order` en
 *  una sola transacción: si algo no cuadra, no persiste nada. */
export async function reorderCategories(keys: string[]): Promise<void> {
  await requireAdminSession();

  const uniqueKeys = [...new Set(keys)];
  if (uniqueKeys.length !== keys.length) {
    throw new Error("La lista de categorías no puede repetir claves.");
  }

  const active = await prisma.category.findMany({
    where: { isActive: true },
    select: { key: true },
  });
  const activeKeys = new Set(active.map((a) => a.key));
  if (
    uniqueKeys.length !== activeKeys.size ||
    uniqueKeys.some((k) => !activeKeys.has(k))
  ) {
    throw new Error(
      "Las categorías no coinciden con las activas. Recargá la página e intentá de nuevo.",
    );
  }

  await prisma.$transaction(
    uniqueKeys.map((key, index) =>
      prisma.category.update({
        where: { key },
        data: { order: index + 1 },
      }),
    ),
  );
  revalidatePath("/menu");
}