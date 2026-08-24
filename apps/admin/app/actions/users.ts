"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bubba/db";
import { hash } from "bcryptjs";
import { Role, type Role as RoleType } from "@bubba/types";
import { getRequiredSession } from "@/lib/session";

const MIN_PASSWORD_LENGTH = 6;

function parseRole(value: string): RoleType {
  if (!Object.values(Role).includes(value as RoleType)) {
    throw new Error("Rol no válido.");
  }
  return value as RoleType;
}

async function requireAdminSession() {
  const session = await getRequiredSession();
  if (session.user.role !== Role.ADMIN) {
    throw new Error("Solo los administradores pueden gestionar usuarios.");
  }
  return session;
}

function validateName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("El nombre es obligatorio.");
  }
  return trimmed;
}

function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
  return password;
}

/**
 * Garantiza que la operación no deje el sistema sin administradores activos
 * y que nadie modifique su propia cuenta para quitarse el acceso.
 */
async function assertLastAdminProtection(options: {
  currentUserId: string;
  targetUserId: string;
  nextRole: RoleType;
  nextActive: boolean;
}) {
  const { currentUserId, targetUserId, nextRole, nextActive } = options;

  if (targetUserId === currentUserId && (!nextActive || nextRole !== Role.ADMIN)) {
    throw new Error(
      "No puedes desactivar tu propia cuenta ni quitarte el rol de administrador.",
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true, active: true },
  });

  if (!target) {
    throw new Error("Usuario no encontrado.");
  }

  // ¿El cambio quita un administrador activo?
  const removesActiveAdmin =
    target.active &&
    target.role === Role.ADMIN &&
    (!nextActive || nextRole !== Role.ADMIN);

  if (!removesActiveAdmin) return;

  const otherActiveAdmins = await prisma.user.count({
    where: {
      role: Role.ADMIN,
      active: true,
      id: { not: targetUserId },
    },
  });

  if (otherActiveAdmins === 0) {
    throw new Error(
      "Debe existir al menos un administrador activo en el sistema.",
    );
  }
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  await requireAdminSession();

  const name = validateName(input.name);
  const email = input.email.trim().toLowerCase();
  const password = validatePassword(input.password);
  const role = parseRole(input.role);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("El correo no tiene un formato válido.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Ese correo ya está registrado.");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: await hash(password, 10),
      role,
      active: true,
    },
  });

  revalidatePath("/users");
}

export async function updateUser(input: {
  userId: string;
  name: string;
  role: string;
  newPassword?: string;
}) {
  const session = await requireAdminSession();

  const name = validateName(input.name);
  const role = parseRole(input.role);

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  await assertLastAdminProtection({
    currentUserId: session.user.id,
    targetUserId: user.id,
    nextRole: role,
    nextActive: user.active,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      role,
      ...(input.newPassword
        ? { password: await hash(validatePassword(input.newPassword), 10) }
        : {}),
    },
  });

  revalidatePath("/users");
}

export async function setUserActive(userId: string, active: boolean) {
  const session = await requireAdminSession();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  await assertLastAdminProtection({
    currentUserId: session.user.id,
    targetUserId: user.id,
    nextRole: user.role,
    nextActive: active,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { active },
  });

  revalidatePath("/users");
}
