import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role, type Role as RoleType } from "@bubba/types";

export async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("No autorizado");
  }
  return session;
}

/** Acceso a la app del cajero para tomar/ver pedidos: cajero, admin y mesero. */
export function hasCashierAccess(role: RoleType): boolean {
  return (
    role === Role.CAJERO || role === Role.ADMIN || role === Role.MESERO
  );
}

/** Acceso a funciones de cobro (registrar pagos): solo cajero y admin. */
export function hasBillingAccess(role: RoleType): boolean {
  return role === Role.CAJERO || role === Role.ADMIN;
}
