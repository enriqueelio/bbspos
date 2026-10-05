"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import {
  CustomerLedgerType,
  PaymentMethod,
  PensionType,
  formatPrice,
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

/** Crea un cliente de mostrador (sin cuenta corriente). */
export async function createClient(input: {
  name: string;
  ci?: string;
  phone?: string;
}) {
  await requireAdminSession();

  const name = validateName(input.name);
  const phone = validatePhone(input.phone ?? "");
  const ci = input.ci?.trim() ? input.ci.trim() : null;

  await assertPhoneAvailable(phone);

  await prisma.customer.create({
    data: { name, ci, phone },
  });

  revalidatePath("/customers");
}

/** Crea un cliente pensionado directamente: identity + cuenta corriente en una
 *  transacción. El saldo arranca en cero.
 *  Solo los pensionados tienen cuenta corriente. Abonar a un cliente de mostrador
 *  sería plata que entra al cierre del día y que después nadie puede gastar. */
export async function createPensionado(input: {
  name: string;
  ci?: string;
  phone?: string;
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

  await assertPhoneAvailable(phone);

  await prisma.customer.create({
    data: {
      name,
      ci,
      phone,
      account: {
        create: { pensionType, creditLimit, balance: 0 },
      },
    },
  });

  revalidatePath("/pensionados");
  revalidatePath("/customers");
}

/** Actualiza los datos de identidad de un cliente (nombre, CI, teléfono). */
export async function updateCustomer(input: {
  customerId: string;
  name: string;
  ci?: string;
  phone?: string;
}) {
  await requireAdminSession();

  const name = validateName(input.name);
  const phone = validatePhone(input.phone ?? "");
  const ci = input.ci?.trim() ? input.ci.trim() : null;

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }

  await assertPhoneAvailable(phone, customer.id);

  await prisma.customer.update({
    where: { id: input.customerId },
    data: { name, ci, phone },
  });

  revalidatePath("/customers");
  revalidatePath("/pensionados");
}

/** Actualiza la modalidad y el límite de crédito de un pensionado. */
export async function updatePensionadoAccount(input: {
  customerId: string;
  pensionType: string;
  creditLimit?: number;
}) {
  await requireAdminSession();

  const pensionType = parsePensionType(input.pensionType);
  const creditLimit =
    pensionType === PensionType.POSTPAGO
      ? Math.max(0, Math.trunc(input.creditLimit ?? 0))
      : 0;

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: { account: true },
  });
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }
  if (!customer.account) {
    throw new Error("Este cliente no es pensionado (no tiene cuenta corriente).");
  }

  await prisma.customerAccount.update({
    where: { id: customer.account.id },
    data: { pensionType, creditLimit },
  });

  revalidatePath("/customers");
  revalidatePath("/pensionados");
}

function parsePaymentMethod(value: string): PaymentMethodType {
  if (value !== PaymentMethod.EFECTIVO && value !== PaymentMethod.QR) {
    throw new Error("El abono debe registrarse en Efectivo o QR.");
  }
  return value as PaymentMethodType;
}

/** Convierte un cliente de mostrador en pensionado creando su cuenta corriente.
 *  Permite saldo inicial (crea asiento RECARGA o PAGO_DEUDA en el libro). */
export async function convertToPensionado(input: {
  customerId: string;
  pensionType: string;
  creditLimit?: number;
  initialBalance?: number;
  paymentMethod?: string;
}) {
  await requireAdminSession();

  const pensionType = parsePensionType(input.pensionType);
  const creditLimit =
    pensionType === PensionType.POSTPAGO
      ? Math.max(0, Math.trunc(input.creditLimit ?? 0))
      : 0;
  const initialBalance = Math.trunc(input.initialBalance ?? 0);
  const paymentMethod = input.paymentMethod
    ? parsePaymentMethod(input.paymentMethod)
    : PaymentMethod.EFECTIVO;

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: { account: true },
  });
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }
  if (customer.account) {
    throw new Error(`${customer.name} ya es pensionado.`);
  }

  await prisma.$transaction(async (tx) => {
    const account = await tx.customerAccount.create({
      data: { customerId: customer.id, pensionType, creditLimit, balance: initialBalance },
    });
    if (initialBalance !== 0) {
      const ledgerType =
        pensionType === PensionType.POSTPAGO
          ? CustomerLedgerType.PAGO_DEUDA
          : CustomerLedgerType.RECARGA;
      await tx.customerLedger.create({
        data: {
          accountId: account.id,
          type: ledgerType,
          amount: Math.abs(initialBalance),
          paymentMethod,
        },
      });
    }
  });

  revalidatePath("/customers");
  revalidatePath("/pensionados");
}

/** Desmarca un pensionado borrando su cuenta corriente, y con ella su libro.
 *
 *  Solo se admite con `balance = 0`. El saldo es la suma firmada del libro, así
 *  que un saldo distinto de cero significa que hay plata que se gasta en el
 *  mostrador (a favor) o deuda que se cobra ahí (en contra). Sin la cuenta, el
 *  cajero deja de listar al cliente en el cobro "PENSIONADO", y esa plata o esa
 *  deuda quedarían sin poder usarse ni cobrarse. Los dos casos son el mismo
 *  defecto — la cuenta no puede desaparecer mientras tenga saldo — y el mensaje
 *  cambia con el signo porque la explicación es otra. */
export async function removePensionadoStatus(customerId: string) {
  await requireAdminSession();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { account: true },
  });
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }
  if (!customer.account) {
    throw new Error(`${customer.name} no es pensionado.`);
  }
  if (customer.account.balance !== 0) {
    throw new Error(
      customer.account.balance > 0
        ? `${customer.name} tiene ${formatPrice(customer.account.balance)} de saldo a favor, que se gasta en el mostrador. Llévelo a cero antes de desmarcarlo.`
        : `${customer.name} debe ${formatPrice(Math.abs(customer.account.balance))}, que se cobra en el mostrador. Salda la deuda antes de desmarcarlo.`,
    );
  }

  await prisma.customerAccount.delete({ where: { id: customer.account.id } });

  revalidatePath("/customers");
  revalidatePath("/pensionados");
}

/** Abona a la cuenta de un pensionado: "Recargar Saldo" si es Prepago o
 *  "Pagar Deuda" si es Postpago. El monto siempre sube el saldo (hacia positivo
 *  o de vuelta hacia 0) y se registra en CustomerLedger para que cuadre como
 *  ingreso real (Efectivo/QR) en el cierre diario.
 *
 *  Solo los pensionados tienen cuenta corriente. Abonar a un cliente de mostrador
 *  sería plata que entra al cierre del día y que después nadie puede gastar: el
 *  cajero solo lista clientes con cuenta y `acceptPensionOrder` rechaza cobrarle
 *  a cuenta. Por eso se valida acá y no solo ocultando el botón.
 *
 *  El tipo de movimiento se decide por `pensionType` (dato real del pensionado).
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
    include: { account: true },
  });
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }
  if (!customer.account) {
    throw new Error(
      `${customer.name} no es pensionado y no tiene cuenta corriente donde entrar el abono. Conviértelo en pensionado para poder bonificarle.`,
    );
  }

  const type =
    customer.account.pensionType === PensionType.POSTPAGO
      ? CustomerLedgerType.PAGO_DEUDA
      : CustomerLedgerType.RECARGA;

  await prisma.$transaction([
    prisma.customerAccount.update({
      where: { id: customer.account.id },
      data: { balance: { increment: amount } },
    }),
    prisma.customerLedger.create({
      data: {
        accountId: customer.account.id,
        type,
        amount,
        paymentMethod,
      },
    }),
  ]);

  revalidatePath("/customers");
  revalidatePath("/pensionados");
}

/** Obtiene el detalle completo de un cliente para la ficha:
 *  identidad, cuenta (si existe), ledger, y pedidos fidelizables recientes. */
export async function getCustomerDetail(customerId: string) {
  await requireAdminSession();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      account: {
        include: {
          ledger: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      },
      orders: {
        where: {
          status: "ENTREGADO",
          paidAt: { not: null },
        },
        orderBy: { deliveredAt: "desc" },
        take: 10,
        select: {
          id: true,
          seq: true,
          daySeq: true,
          total: true,
          paymentMethod: true,
          deliveredAt: true,
          status: true,
        },
      },
    },
  });

  if (!customer) return null;

  return {
    id: customer.id,
    name: customer.name,
    ci: customer.ci,
    phone: customer.phone,
    createdAt: customer.createdAt.toISOString(),
    totalVisits: customer.totalVisits,
    totalSpent: customer.totalSpent,
    points: customer.points,
    lastVisitAt: customer.lastVisitAt?.toISOString() ?? null,
    account: customer.account
      ? {
          id: customer.account.id,
          pensionType: customer.account.pensionType,
          balance: customer.account.balance,
          creditLimit: customer.account.creditLimit,
          ledger: customer.account.ledger.map((l) => ({
            id: l.id,
            accountId: l.accountId,
            type: l.type as CustomerLedgerType,
            amount: l.amount,
            paymentMethod: l.paymentMethod,
            orderId: l.orderId,
            createdAt: l.createdAt.toISOString(),
          })),
        }
      : null,
    recentOrders: customer.orders.map((o) => ({
      id: o.id,
      seq: o.seq,
      daySeq: o.daySeq,
      total: o.total,
      paymentMethod: o.paymentMethod,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      status: o.status,
    })),
  };
}