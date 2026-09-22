"use server";

import { prisma, localDayKey, type Prisma } from "@bbspos/db";
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
    select: { id: true, name: true, phone: true, lastVisitAt: true },
  });
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    lastVisitAt: c.lastVisitAt ? c.lastVisitAt.toISOString() : null,
  }));
}

/** Vincula o crea el cliente al enviar un pedido desde el terminal:
 *  - si el texto parece teléfono y coincide con un `phone` exacto, lo vincula;
 *  - si el texto coincide con un nombre exacto, lo vincula;
 *  - si no existe, lo crea con nombre en mayúsculas (el terminal ya lo envía así)
 *    y teléfono opcional cuando el texto parece teléfono. */
export async function upsertCustomerForOrder(
  text: string,
): Promise<CustomerLoyaltyView> {
  await getRequiredSession();
  const raw = text.trim();
  if (!raw) {
    throw new Error("El nombre o mesa del cliente es obligatorio.");
  }
  const looksLikePhone = PHONE_RE.test(raw);
  const phone = looksLikePhone ? normalizePhone(raw) : null;

  let customer: {
    id: string;
    name: string;
    phone: string | null;
    points: number;
    totalVisits: number;
    totalSpent: number;
    lastVisitAt: Date | null;
  } | null = null;

  if (phone) {
    customer = await prisma.customer.findFirst({ where: { phone } });
  } else {
    customer = await prisma.customer.findFirst({ where: { name: raw } });
  }

  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: raw, phone },
    });
  }

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