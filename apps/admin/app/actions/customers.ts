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

function validatePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) {
    throw new Error("El teléfono es obligatorio.");
  }
  return trimmed;
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
  phone: string;
  pensionType: string;
  creditLimit?: number;
}) {
  await requireAdminSession();

  const name = validateName(input.name);
  const phone = validatePhone(input.phone);
  const pensionType = parsePensionType(input.pensionType);
  const ci = input.ci?.trim() ? input.ci.trim() : null;
  // El límite de crédito solo aplica a los Postpago; prepago se cobra por saldo.
  const creditLimit =
    pensionType === PensionType.POSTPAGO
      ? Math.max(0, Math.trunc(input.creditLimit ?? 0))
      : 0;

  await prisma.customer.create({
    data: {
      name,
      ci,
      phone,
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
  phone: string;
  pensionType: string;
  creditLimit?: number;
}) {
  await requireAdminSession();

  const name = validateName(input.name);
  const phone = validatePhone(input.phone);
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

  await prisma.customer.update({
    where: { id: input.customerId },
    data: { name, ci, phone, pensionType, creditLimit },
  });

  revalidatePath("/customers");
}

/** Abona a la cuenta de un cliente: "Recargar Saldo" si es Prepago o
 *  "Pagar Deuda" si es Postpago. El monto siempre sube el saldo (hacia positivo
 *  o de vuelta hacia 0) y se registra en CustomerLedger para que cuadre como
 *  ingreso real (Efectivo/QR) en el cierre diario. */
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
    customer.pensionType === PensionType.PREPAGO
      ? CustomerLedgerType.RECARGA
      : CustomerLedgerType.PAGO_DEUDA;

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