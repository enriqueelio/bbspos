"use server";

import { compare } from "bcryptjs";
import { prisma } from "@bubba/db";

/**
 * Indica si unas credenciales correctas pertenecen a una cuenta desactivada.
 * Devuelve false cuando el usuario no existe, la contraseña es incorrecta
 * o la cuenta está activa: solo revela el estado a quien tiene acceso válido.
 */
export async function isAccountInactive(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });

  if (!user || user.active) return false;

  return compare(password, user.password);
}
