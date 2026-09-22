"use server";

import { revalidatePath } from "next/cache";
import { prisma, localDayKey, type Prisma } from "@bbspos/db";
import {
  BenefitMetric,
  CustomerRewardType,
  LoyaltyPeriod,
  type BenefitMetric as BenefitMetricType,
  type CustomerBenefitRuleView,
  type CustomerRankingRow,
  type LoyaltyPeriod as LoyaltyPeriodType,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";

async function requireAdminSession() {
  const session = await getRequiredSession();
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    throw new Error("Solo los administradores pueden gestionar la lealtad.");
  }
  return session;
}

function parsePeriod(periodo: string): LoyaltyPeriodType {
  if (!Object.values(LoyaltyPeriod).includes(periodo as LoyaltyPeriodType)) {
    throw new Error("El periodo no es válido.");
  }
  return periodo as LoyaltyPeriodType;
}

function parseMetric(value: string): BenefitMetricType {
  if (!Object.values(BenefitMetric).includes(value as BenefitMetricType)) {
    throw new Error("La métrica de la regla no es válida.");
  }
  return value as BenefitMetricType;
}

/** Inicio UTC (medianoche La Paz, UTC-4 = 04:00 UTC) del mes local actual. */
function currentMonthStartUtc(now: Date): Date {
  const [y, m] = localDayKey(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 4, 0, 0));
}

/** Top 10 de clientes frecuentes del periodo: agrupa `Order.paidAt` no nulo
 *  (cobrado) por cliente y devuelve visitas/gasto del periodo más los
 *  acumulados históricos y puntos del caché del cliente. `search` filtra por
 *  nombre o teléfono. */
export async function getCustomerRanking(
  periodo: string,
  search?: string,
): Promise<CustomerRankingRow[]> {
  await requireAdminSession();
  const period = parsePeriod(periodo);
  const now = new Date();

  let gte: Date | undefined;
  if (period === LoyaltyPeriod.MONTH) {
    gte = currentMonthStartUtc(now);
  } else if (period === LoyaltyPeriod.DAYS_30) {
    gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  let customerIds: string[] | undefined;
  const q = search?.trim();
  if (q) {
    const matches = await prisma.customer.findMany({
      where: {
        OR: [{ name: { contains: q } }, { phone: { contains: q } }],
      },
      select: { id: true },
      take: 50,
    });
    customerIds = matches.map((c) => c.id);
    if (customerIds.length === 0) return [];
  }

  const where: Prisma.OrderWhereInput = {
    customerId: { not: null },
    paidAt: gte ? { gte } : { not: null },
    ...(customerIds ? { customerId: { in: customerIds } } : {}),
  };

  const grouped = await prisma.order.groupBy({
    by: ["customerId"],
    where,
    _count: { _all: true },
    _sum: { total: true },
    orderBy: { _sum: { total: "desc" } },
    take: 10,
  });

  if (grouped.length === 0) return [];

  const ids = grouped
    .map((g) => g.customerId)
    .filter((id): id is string => Boolean(id));
  const customers = await prisma.customer.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      phone: true,
      totalVisits: true,
      totalSpent: true,
      points: true,
      lastVisitAt: true,
    },
  });
  const byId = new Map(customers.map((c) => [c.id, c]));

  const rows: CustomerRankingRow[] = [];
  for (const g of grouped) {
    if (!g.customerId) continue;
    const c = byId.get(g.customerId);
    if (!c) continue;
    rows.push({
      customerId: c.id,
      customerName: c.name,
      phone: c.phone,
      periodVisits: g._count._all,
      periodSpent: g._sum.total ?? 0,
      totalVisits: c.totalVisits,
      totalSpent: c.totalSpent,
      points: c.points,
      lastVisitAt: c.lastVisitAt ? c.lastVisitAt.toISOString() : null,
    });
  }
  return rows;
}

/** Canje de puntos: valida el saldo, descuenta `points` y crea el registro
 *  CANJE en `CustomerReward` en la misma transacción. Rechaza saldo
 *  insuficiente con error claro. */
export async function redeemCustomerPoints(input: {
  customerId: string;
  points: number;
  description?: string;
  orderId?: string;
}): Promise<void> {
  const session = await requireAdminSession();

  const points = Math.trunc(input.points);
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error("La cantidad de puntos debe ser mayor a cero.");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }
  if (customer.points < points) {
    throw new Error(
      `Saldo insuficiente: ${customer.name} tiene ${customer.points} puntos y solicitaste ${points}.`,
    );
  }

  // El usuario de la sesión puede no existir en la DB (eliminado tras el
  // login); evitamos violar la restricción foránea (P2003).
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customer.id },
      data: { points: { decrement: points } },
    }),
    prisma.customerReward.create({
      data: {
        customerId: customer.id,
        type: CustomerRewardType.CANJE,
        pointsUsed: points,
        description: input.description?.trim() || "Canje de puntos",
        redeemedById: dbUser?.id ?? null,
        orderId: input.orderId?.trim() || null,
      },
    }),
  ]);

  revalidatePath("/customers-ranking");
}

/** Lista las reglas de lealtad activas e inactivas (para Admin). */
export async function listBenefitRules(): Promise<CustomerBenefitRuleView[]> {
  await requireAdminSession();
  const rules = await prisma.customerBenefitRule.findMany({
    orderBy: { threshold: "asc" },
  });
  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    metric: r.metric,
    threshold: r.threshold,
    active: r.active,
  }));
}

/** Crea o actualiza una regla de lealtad (nombre, métrica y umbral
 *  configurables). `ruleId` ausente = crear. */
export async function saveBenefitRule(input: {
  ruleId?: string;
  name: string;
  description?: string;
  metric: string;
  threshold: number;
  active?: boolean;
}): Promise<void> {
  await requireAdminSession();

  const name = input.name.trim();
  if (!name) {
    throw new Error("El nombre de la regla es obligatorio.");
  }
  const metric = parseMetric(input.metric);
  const threshold = Math.trunc(input.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new Error("El umbral debe ser mayor a cero.");
  }
  const description = input.description?.trim() ?? "";
  const active = input.active ?? true;

  if (input.ruleId) {
    const existing = await prisma.customerBenefitRule.findUnique({
      where: { id: input.ruleId },
    });
    if (!existing) {
      throw new Error("Regla no encontrada.");
    }
    await prisma.customerBenefitRule.update({
      where: { id: input.ruleId },
      data: { name, description, metric, threshold, active },
    });
  } else {
    await prisma.customerBenefitRule.create({
      data: { name, description, metric, threshold, active },
    });
  }

  revalidatePath("/customers-ranking");
}
