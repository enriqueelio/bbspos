import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@bubba/db";
import { ApiError } from "./response";

export async function requireSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new ApiError(
      "UNAUTHENTICATED",
      "Debes iniciar sesión para consultar reportes.",
    );
  }
  return session;
}

let auditSchemaAvailable: boolean | null = null;

/**
 * Detecta (una sola vez por proceso) si la migración de auditoría
 * (Order.userId / paymentMethod / ANULADO, etc.) ya fue aplicada.
 */
export async function hasAuditSchema(): Promise<boolean> {
  if (auditSchemaAvailable !== null) return auditSchemaAvailable;
  try {
    await prisma.order.findFirst({ select: { userId: true } });
    auditSchemaAvailable = true;
  } catch {
    auditSchemaAvailable = false;
  }
  return auditSchemaAvailable;
}

export function resetAuditSchemaCache(): void {
  auditSchemaAvailable = null;
}
