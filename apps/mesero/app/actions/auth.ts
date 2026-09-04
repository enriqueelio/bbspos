"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@bbspos/types";
import { prisma } from "@bbspos/db";
import { compare } from "bcryptjs";

/** Roles que pueden operar el terminal de toma de pedidos del mesero. */
const ALLOWED_ROLES = [Role.MESERO, Role.CAJERO, Role.ADMIN];

/** Valida que la sesión tenga un rol con acceso a la app del mesero. */
export async function ensureOrderAccess(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) return false;
  return ALLOWED_ROLES.includes(session.user.role);
}

/** Detecta si una cuenta existe y está desactivada (para diferenciar mensajes). */
export async function isAccountInactive(
  username: string,
  password: string,
): Promise<boolean> {
  if (!username || !password) return false;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (!user) return false;
  const valid = await compare(password, user.password);
  return valid && !user.active;
}
