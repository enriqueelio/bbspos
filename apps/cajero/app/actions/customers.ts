"use server";

import { prisma, localDayKey, type Prisma, type Customer } from "@bbspos/db";
import {
  BenefitMetric,
  type CustomerLoyaltyView,
  type CustomerSuggestion,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";

const PHONE_RE = /^[0-9+\s-]{7,}$/;

/** Normaliza un teléfono: quita espacios y guiones (para comparar/almacenar). */
function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s-]+/g, "");
}

/** Nombre del nivel vigente del cliente según las reglas activas: gasto del mes,
 *  visitas del mes o puntos acumulados (zona America/La_Paz, UTC-4). */
async function levelNameOf(
  customerId: string,
  points: number,
): Promise<string | null> {
  const rules = await prisma.customerBenefitRule.findMany({
    where: { active: true },
  });
  if (rules.length === 0) return null;

  const now = new Date();
  const [y, m] = localDayKey(now).split("-").map(Number);
  // Medianoche local del día 1 en La Paz (UTC-4) = 04:00 UTC.
  const monthStart = new Date(Date.UTC(y, m - 1, 1, 4, 0, 0));
  const agg = await prisma.order.aggregate({
    where: {
      customerId,
      paidAt: { not: null, gte: monthStart },
      status: { not: "ANULADO" },
    },
    _count: { _all: true },
    _sum: { total: true },
  });
  const visits = agg._count._all;
  const spent = agg._sum.total ?? 0;

  let level: string | null = null;
  for (const rule of [...rules].sort((a, b) => a.threshold - b.threshold)) {
    const value =
      rule.metric === BenefitMetric.SPEND_MONTH
        ? spent
        : rule.metric === BenefitMetric.VISITS_MONTH
          ? visits
          : points;
    if (value >= rule.threshold) level = rule.name;
  }
  return level;
}

/** Vista de lealtad de un cliente (para la alerta de nivel del terminal). */
export async function getCustomerLoyalty(
  customerId: string,
): Promise<CustomerLoyaltyView | null> {
  await getRequiredSession();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) return null;
  const levelName = await levelNameOf(customer.id, customer.points);
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    totalVisits: customer.totalVisits,
    totalSpent: customer.totalSpent,
    lastVisitAt: customer.lastVisitAt
      ? customer.lastVisitAt.toISOString()
      : null,
    points: customer.points,
    levelName,
  };
}

/** Autocompletado del terminal: hasta 8 coincidencias por nombre o teléfono,
 *  ordenadas por la última visita. */
export async function getCustomerSuggestions(
  term: string,
): Promise<CustomerSuggestion[]> {
  await getRequiredSession();
  const q = term.trim();
  if (!q) return [];
  const customers = await prisma.customer.findMany({
    where: {
      OR: [{ name: { contains: q } }, { phone: { contains: q } }],
    },
    orderBy: { lastVisitAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
      phone: true,
      lastVisitAt: true,
    },
  });
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    lastVisitAt: c.lastVisitAt ? c.lastVisitAt.toISOString() : null,
  }));
}

/** Vincula un cliente registrado al pedido sin crearlo nunca:
 *  - si el texto parece teléfono y coincide con un `phone` exacto, lo vincula;
 *  - de lo contrario, si coincide exactamente con el `name` de algún cliente
 *    (ignorando mayúsculas), lo vincula;
 *  - si no hay coincidencia, devuelve `null` (venta invitado). */
export async function linkCustomerByText(
  text: string,
): Promise<CustomerLoyaltyView | null> {
  await getRequiredSession();
  const raw = text.trim();
  if (!raw) return null;
  const looksLikePhone = PHONE_RE.test(raw);
  const phone = looksLikePhone ? normalizePhone(raw) : null;

  let customer: Customer | null = null;
  if (phone) {
    customer = await prisma.customer.findFirst({ where: { phone } });
  } else {
    const candidates = await prisma.customer.findMany({
      where: { name: { contains: raw } },
      take: 20,
    });
    customer =
      candidates.find((c) => c.name.toUpperCase() === raw.toUpperCase()) ?? null;
  }

  if (!customer) return null;

  const levelName = await levelNameOf(customer.id, customer.points);
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    totalVisits: customer.totalVisits,
    totalSpent: customer.totalSpent,
    lastVisitAt: customer.lastVisitAt
      ? customer.lastVisitAt.toISOString()
      : null,
    points: customer.points,
    levelName,
  };
}

/** Registra un cliente explícitamente desde el terminal del cajero (básico:
 *  nombre obligatorio y teléfono opcional). Crea el cliente y devuelve la
 *  vista de lealtad para vincular. */
export async function registerCustomerAtPos(input: {
  name: string;
  phone?: string | null;
}): Promise<CustomerLoyaltyView> {
  const session = await getRequiredSession();
  if (session.user.role === "MESERO") {
    throw new Error("El mesero no puede registrar clientes.");
  }
  const name = input.name.trim().toUpperCase();
  if (!name) {
    throw new Error("El nombre del cliente es obligatorio.");
  }
  const phoneRaw = input.phone?.trim() ?? "";
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

  const existing = phone
    ? await prisma.customer.findFirst({ where: { phone } })
    : null;
  if (existing) {
    throw new Error(
      `El teléfono ${phone} ya está registrado para ${existing.name}.`,
    );
  }

  const customer = await prisma.customer.create({
    data: { name, phone },
  });
  const levelName = await levelNameOf(customer.id, customer.points);
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    totalVisits: customer.totalVisits,
    totalSpent: customer.totalSpent,
    lastVisitAt: customer.lastVisitAt
      ? customer.lastVisitAt.toISOString()
      : null,
    points: customer.points,
    levelName,
  };
}

/** Acumula lealtad al cobrar un pedido (misma transacción que registra paidAt):
 *  +1 visita, +total gastado, +total en puntos y última visita. Solo debe
 *  llamarse con customerId válido. Idempotente por pedido: paidAt solo se
 *  registra una vez. */
export async function accumulateCustomerLoyalty(
  tx: Prisma.TransactionClient,
  customerId: string,
  total: number,
  when: Date,
): Promise<void> {
  await tx.customer.update({
    where: { id: customerId },
    data: {
      totalVisits: { increment: 1 },
      totalSpent: { increment: total },
      points: { increment: total },
      lastVisitAt: when,
    },
  });
}