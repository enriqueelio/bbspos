"use server";

import { revalidatePath } from "next/cache";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { prisma } from "@bbspos/db";
import { Role } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";

const MENU_IMAGES_DIR = join(
  process.cwd(),
  "..",
  "store",
  "public",
  "images",
  "menu",
);

const ENTITIES = ["menuItem", "size", "flavor", "bobaType", "topping"] as const;
type ImageEntity = (typeof ENTITIES)[number];

async function requireAdminSession() {
  const session = await getRequiredSession();
  if (
    session.user.role !== Role.ADMIN &&
    session.user.role !== Role.SUPER_ADMIN
  ) {
    throw new Error("Solo los administradores pueden modificar el menú.");
  }
}

async function updateImageUrl(entity: ImageEntity, id: string, imageUrl: string | null) {
  switch (entity) {
    case "menuItem":
      await prisma.menuItem.update({ where: { id }, data: { imageUrl } });
      break;
    case "size":
      await prisma.size.update({ where: { id }, data: { imageUrl } });
      break;
    case "flavor":
      await prisma.flavor.update({ where: { id }, data: { imageUrl } });
      break;
    case "bobaType":
      await prisma.bobaType.update({ where: { id }, data: { imageUrl } });
      break;
    case "topping":
      await prisma.topping.update({ where: { id }, data: { imageUrl } });
      break;
  }
}

/** Guarda la foto de un producto: la redimensiona, la convierte a WebP de
 *  calidad reducida y la asocia a su fila. La ruta queda en apps/store/public
 *  para que las aplicaciones (incluida la futura app MENU) la sirvan. */
export async function saveProductImage(input: {
  entity: ImageEntity;
  id: string;
  file: File;
}): Promise<{ imageUrl: string }> {
  await requireAdminSession();
  const { entity, id, file } = input;

  if (!ENTITIES.includes(entity)) {
    throw new Error("Tipo de producto inválido.");
  }
  if (!id) {
    throw new Error("Falta el identificador del producto.");
  }
  if (!file || file.size === 0) {
    throw new Error("No se recibió ninguna imagen.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen supera los 5 MB.");
  }

  let optimized: Buffer;
  try {
    optimized = await sharp(await file.arrayBuffer())
      .rotate()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error(
      "No se pudo procesar la imagen. Usa JPG, PNG o WebP válidos.",
    );
  }

  await mkdir(MENU_IMAGES_DIR, { recursive: true });
  const filename = `${entity}-${id}.webp`;
  await writeFile(join(MENU_IMAGES_DIR, filename), optimized);

  const imageUrl = `/images/menu/${filename}`;
  await updateImageUrl(entity, id, imageUrl);
  revalidatePath("/menu");
  return { imageUrl };
}

/** Elimina la foto de un producto: borra el archivo y limpia el campo. */
export async function removeProductImage(input: {
  entity: ImageEntity;
  id: string;
}): Promise<void> {
  await requireAdminSession();
  const { entity, id } = input;

  await unlink(join(MENU_IMAGES_DIR, `${entity}-${id}.webp`)).catch(() => {});
  await updateImageUrl(entity, id, null);
  revalidatePath("/menu");
}