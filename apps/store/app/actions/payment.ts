"use server";

import { prisma } from "@bubba/db";

export async function getPaymentQr(): Promise<{ qrImage: string } | null> {
  const config = await prisma.paymentConfig.findUnique({
    where: { id: "default" },
  });
  return config ? { qrImage: config.qrImage } : null;
}
