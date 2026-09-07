import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role, type Role as RoleType } from "@bbspos/types";

export async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("No autorizado");
  }
  return session;
}

/** Acceso al terminal de toma de pedidos: mesero, cajero, admin y super admin. */
export function hasOrderAccess(role: RoleType): boolean {
  return (
    role === Role.MESERO ||
    role === Role.CAJERO ||
    role === Role.ADMIN ||
    role === Role.SUPER_ADMIN
  );
}
