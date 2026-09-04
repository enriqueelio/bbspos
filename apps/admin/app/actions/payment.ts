"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import { getRequiredSession } from "@/lib/session";

const MAX_QR_BYTES = 2 * 1024 * 1024;

export async function savePaymentQr(formData: FormData) {
  await getRequiredSession();

  const file = formData.get("qrImage");
  if (!(file instanceof File)) {
    throw new Error("Selecciona un archivo de imagen.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen.");
  }
  if (file.size === 0) {
    throw new Error("El archivo está vacío.");
  }
  if (file.size > MAX_QR_BYTES) {
    throw new Error("La imagen no debe superar los 2 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const qrImage = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;

  await prisma.paymentConfig.upsert({
    where: { id: "default" },
    update: { qrImage, mimeType: file.type },
    create: { id: "default", qrImage, mimeType: file.type },
  });

  revalidatePath("/payments");
}

export async function removePaymentQr() {
  await getRequiredSession();
  await prisma.paymentConfig.deleteMany({ where: { id: "default" } });
  revalidatePath("/payments");
}

export async function getPaymentQr() {
  const config = await prisma.paymentConfig.findUnique({
    where: { id: "default" },
  });
  return config
    ? { qrImage: config.qrImage, mimeType: config.mimeType }
    : null;
}
