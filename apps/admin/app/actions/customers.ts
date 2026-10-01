"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import {
  CustomerLedgerType,
  PaymentMethod,
  PensionType,
  type PaymentMethod as PaymentMethodType,
  type PensionType as PensionTypeType,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";

async function requireAdminSession() {
  const session = await getRequiredSession();
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    throw new Error("Solo los administradores pueden gestionar clientes.");
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

/** Normaliza un teléfono igual que el terminal del cajero (quita espacios y
 *  guiones) para que Admin y POS escriban el mismo valor y el vínculo por
 *  teléfono siga funcionando. Vacío = null (cliente sin teléfono). */
function validatePhone(phone: string) {
  const trimmed = phone.trim().replace(/[\s-]+/g, "");
  return trimmed ? trimmed : null;
}

/** El teléfono es único en BD: se valida antes de escribir para dar un error
 *  claro en vez del P2002 crudo de Prisma. */
async function assertPhoneAvailable(phone: string | null, excludeId?: string) {
  if (!phone) return;
  const existing = await prisma.customer.findFirst({
    where: { phone },
    select: { id: true, name: true },
  });
  if (existing && existing.id !== excludeId) {
    throw new Error(`El teléfono ${phone} ya está registrado para ${existing.name}.`);
  }
}

function parsePensionType(value: string): PensionTypeType {
  if (!Object.values(PensionType).includes(value as PensionTypeType)) {
    throw new Error("La modalidad de pensión no es válida.");
  }
  return value as PensionTypeType;
}

/** Monto entero positivo en Bs usado en abonos y límites. */
function parsePositiveAmount(value: number) {
  const amount = Math.trunc(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }
  return amount;
}

/** El abono a la cuenta solo se recibe en efectivo o QR (dinero real de caja). */
function parseFundsMethod(value: string): PaymentMethodType {
  if (value !== PaymentMethod.EFECTIVO && value !== PaymentMethod.QR) {
    throw new Error("El abono debe registrarse en Efectivo o QR.");
  }
  return value as PaymentMethodType;
}

export async function createCustomer(input: {
  name: string;
  ci?: string;
  phone?: string;
  isPension: boolean;
  pensionType: string;
  creditLimit?: number;
}) {
  await requireAdminSession();

  const name = validateName(input.name);
  const phone = validatePhone(input.phone ?? "");
  const pensionType = parsePensionType(input.pensionType);
  const ci = input.ci?.trim() ? input.ci.trim() : null;
  // El límite de crédito solo aplica a los Postpago; prepago se cobra por saldo.
  const creditLimit =
    pensionType === PensionType.POSTPAGO
      ? Math.max(0, Math.trunc(input.creditLimit ?? 0))
      : 0;

  await assertPhoneAvailable(phone);

  await prisma.customer.create({
    data: {
      name,
      ci,
      phone,
      isPension: input.isPension,
      pensionType,
      creditLimit,
      balance: 0,
    },
  });

  revalidatePath("/customers");
}

export async function updateCustomer(input: {
  customerId: string;
  name: string;
  ci?: string;
  phone?: string;
  isPension: boolean;
  pensionType: string;
  creditLimit?: number;
}) {
  await requireAdminSession();

  const name = validateName(input.name);
  const phone = validatePhone(input.phone ?? "");
  const pensionType = parsePensionType(input.pensionType);
  const ci = input.ci?.trim() ? input.ci.trim() : null;
  const creditLimit =
    pensionType === PensionType.POSTPAGO
      ? Math.max(0, Math.trunc(input.creditLimit ?? 0))
      : 0;

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }

  await assertPhoneAvailable(phone, customer.id);

  await prisma.customer.update({
    where: { id: input.customerId },
    data: {
      name,
      ci,
      phone,
      isPension: input.isPension,
      // Desmarcar "pensionado" no borra la cuenta: la modalidad y el límite se
      // dejan como están para que volver a marcarlo no pierda el historial. El
      // saldo y el libro nunca se tocan desde acá.
      ...(input.isPension ? { pensionType, creditLimit } : {}),
    },
  });

  revalidatePath("/customers");
}

/** Abona a la cuenta de un cliente: "Recargar Saldo" si es Prepago o
 *  "Pagar Deuda" si es Postpago. El monto siempre sube el saldo (hacia positivo
 *  o de vuelta hacia 0) y se registra en CustomerLedger para que cuadre como
 *  ingreso real (Efectivo/QR) en el cierre diario.
 *
 *  El tipo de movimiento se decide por `isPension`, NO solo por `pensionType`:
 *  el esquema le pone `PREPAGO` por defecto a todos, así que mirar solo
 *  `pensionType` trataría a un cliente de mostrador como pensionado prepago y le
 *  marcaría su abono como "recarga de saldo" cuando en realidad está pagando por
 *  adelantado una cuenta corriente.
 *
 *  Ningún abono genera lealtad: los puntos se ganan al comprar, no al mover la
 *  cuenta. Esto no cambia ningún acumulado de `Customer`. */
export async function addCustomerFunds(input: {
  customerId: string;
  amount: number;
  paymentMethod: string;
}) {
  await requireAdminSession();

  const amount = parsePositiveAmount(input.amount);
  const paymentMethod = parseFundsMethod(input.paymentMethod);

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }

  const type =
    customer.isPension && customer.pensionType === PensionType.POSTPAGO
      ? CustomerLedgerType.PAGO_DEUDA
      : CustomerLedgerType.RECARGA;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: input.customerId },
      data: { balance: { increment: amount } },
    }),
    prisma.customerLedger.create({
      data: {
        customerId: input.customerId,
        type,
        amount,
        paymentMethod,
      },
    }),
  ]);

  revalidatePath("/customers");
}