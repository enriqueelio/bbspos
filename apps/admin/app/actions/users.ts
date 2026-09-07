"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import { hash } from "bcryptjs";
import { Role, Shift, type Role as RoleType, type Shift as ShiftType } from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";

const MIN_PASSWORD_LENGTH = 6;

function parseRole(value: string): RoleType {
  if (!Object.values(Role).includes(value as RoleType)) {
    throw new Error("Rol no válido.");
  }
  return value as RoleType;
}

function parseShift(value: string): ShiftType {
  if (!Object.values(Shift).includes(value as ShiftType)) {
    throw new Error("Turno no válido.");
  }
  return value as ShiftType;
}

async function requireAdminSession() {
  const session = await getRequiredSession();
  if (
    session.user.role !== Role.ADMIN &&
    session.user.role !== Role.SUPER_ADMIN
  ) {
    throw new Error("Solo los administradores pueden gestionar usuarios.");
  }
  return session;
}

/** Roles que el actor puede otorgar al crear/editar usuarios. */
function rolesAssignableBy(actorRole: RoleType): RoleType[] {
  if (actorRole === Role.SUPER_ADMIN) {
    return [Role.SUPER_ADMIN, Role.ADMIN, Role.CAJERO, Role.MESERO];
  }
  return [Role.CAJERO, Role.MESERO];
}

/**
 * Reglas de gestión de usuarios:
 * - El Super Admin es una cuenta protegida: nadie puede cambiarle el rol ni el turno.
 * - Solo el Super Admin gestiona a usuarios con rol ADMIN (excepto él mismo).
 * - Nadie puede desactivar su propia cuenta ni quitarse su propio rol.
 */
async function assertUserEditAllowed(options: {
  actor: { id: string; role: RoleType };
  target: { id: string; role: RoleType; shift: ShiftType; active: boolean };
  nextRole: RoleType;
  nextShift: ShiftType;
  nextActive: boolean;
}) {
  const { actor, target, nextRole, nextShift, nextActive } = options;
  const isSelf = target.id === actor.id;

  if (target.role === Role.SUPER_ADMIN) {
    if (actor.role === Role.ADMIN) {
      throw new Error("Solo el Super Admin puede gestionar al Super Admin.");
    }
    if (nextRole !== target.role) {
      throw new Error("El rol de un Super Admin no puede cambiarse.");
    }
    if (nextShift !== target.shift) {
      throw new Error("El turno de un Super Admin no puede cambiarse.");
    }
    return;
  }

  if (isSelf) {
    if (!nextActive) {
      throw new Error("No puedes desactivar tu propia cuenta.");
    }
    if (nextRole !== target.role) {
      throw new Error("No puedes quitarte tu propio rol.");
    }
  }

  if (target.role === Role.ADMIN && actor.role === Role.ADMIN && !isSelf) {
    throw new Error("Solo el Super Admin puede gestionar administradores.");
  }
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

export async function createUser(input: {
  name: string;
  username: string;
  password: string;
  role: string;
  shift: string;
}) {
  const session = await requireAdminSession();

  const name = validateName(input.name);
  const username = input.username.trim().toLowerCase();
  const password = validatePassword(input.password);
  const role = parseRole(input.role);
  const shift = parseShift(input.shift);

  if (!rolesAssignableBy(session.user.role).includes(role)) {
    throw new Error("No tienes permisos para asignar ese rol.");
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    throw new Error(
      "El usuario solo puede contener letras, números y guiones bajos.",
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error("Ese usuario ya está registrado.");
  }

  await prisma.user.create({
    data: {
      name,
      username,
      password: await hash(password, 10),
      role,
      shift,
      active: true,
    },
  });

  revalidatePath("/users");
}

export async function updateUser(input: {
  userId: string;
  name: string;
  role: string;
  shift: string;
  newPassword?: string;
}) {
  const session = await requireAdminSession();

  const name = validateName(input.name);
  const role = parseRole(input.role);
  const shift = parseShift(input.shift);

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  if (
    user.id !== session.user.id &&
    !rolesAssignableBy(session.user.role).includes(role)
  ) {
    throw new Error("No tienes permisos para asignar ese rol.");
  }

  await assertUserEditAllowed({
    actor: { id: session.user.id, role: session.user.role },
    target: {
      id: user.id,
      role: user.role,
      shift: user.shift,
      active: user.active,
    },
    nextRole: role,
    nextShift: shift,
    nextActive: user.active,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      role,
      shift,
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

  if (user.role === Role.SUPER_ADMIN) {
    throw new Error(
      "El Super Admin es una cuenta protegida y no puede darse de baja.",
    );
  }

  if (user.id === session.user.id) {
    throw new Error("No puedes desactivar tu propia cuenta.");
  }

  if (user.role === Role.ADMIN && session.user.role === Role.ADMIN) {
    throw new Error("Solo el Super Admin puede dar de baja a administradores.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { active },
  });

  revalidatePath("/users");
}