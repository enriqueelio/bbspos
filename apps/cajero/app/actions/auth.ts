"use server";

import { getServerSession } from "next-auth";
import { compare } from "bcryptjs";
import { prisma } from "@bubba/db";
import { authOptions } from "@/lib/auth";
import { hasCashierAccess } from "@/lib/session";

/**
 * Verifica que la sesión recién creada pertenezca a personal de mostrador.
 * Se usa desde el login para cerrar la sesión de cuentas sin permisos.
 */
export async function ensureCashierRole(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  return hasCashierAccess(session.user.role);
}

/**
 * Indica si unas credenciales correctas pertenecen a una cuenta desactivada.
 * Devuelve false cuando el correo no existe, la contraseña es incorrecta
 * o la cuenta está activa: solo revela el estado a quien tiene acceso válido.
 */
export async function isAccountInactive(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || user.active) return false;

  return compare(password, user.password);
}
