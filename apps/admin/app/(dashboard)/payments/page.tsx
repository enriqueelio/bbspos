import { prisma } from "@bubba/db";
import { PaymentsClient } from "./payments-client";

export const metadata = { title: "Pagos — Bubba Admin" };

export default async function PaymentsPage() {
  const config = await prisma.paymentConfig.findUnique({
    where: { id: "default" },
  });

  return (
    <PaymentsClient
      initialQr={
        config
          ? { qrImage: config.qrImage, mimeType: config.mimeType }
          : null
      }
    />
  );
}
