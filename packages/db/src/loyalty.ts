import { prisma } from "./index";
import { localDayKey } from "./day";
import {
  BenefitMetric,
  fidelizableOrderWhere,
  type PensionType,
} from "@bbspos/types";

/** Nombre del nivel vigente del cliente según las reglas activas: gasto del mes,
 *  visitas del mes o puntos acumulados (zona America/La_Paz, UTC-4).
 *
 *  Solo cuentan los pedidos que generaron lealtad (`fidelizableOrderWhere`): el
 *  consumo a cuenta de un pensionado POSTPAGO no le sube de nivel, porque no le
 *  sumó puntos. Sus compras en efectivo/QR sí. Criterio en `isFidelizable`. */
export async function levelNameOf(
  customerId: string,
  points: number,
): Promise<string | null> {
  const rules = await prisma.customerBenefitRule.findMany({
    where: { active: true },
  });
  if (rules.length === 0) return null;

  const now = new Date();
  const [y, m] = localDayKey(now).split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1, 4, 0, 0));
  const agg = await prisma.order.aggregate({
    where: {
      customerId,
      paidAt: { not: null, gte: monthStart },
      status: { not: "ANULADO" },
      ...fidelizableOrderWhere(),
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

/** Valida si un pensionado puede absorber un consumo contra su cuenta.
 *  Devuelve { ok: boolean, message: string }.
 *  - PREPAGO: balance >= total
 *  - POSTPAGO: balance - total >= -creditLimit (si creditLimit > 0) */
export function validatePensionadoBalance(
  pensionType: PensionType,
  balance: number,
  creditLimit: number,
  total: number,
): { ok: boolean; message: string } {
  if (pensionType === "PREPAGO") {
    if (balance < total) {
      return {
        ok: false,
        message: `Saldo insuficiente: tiene ${balance} Bs y el pedido cuesta ${total} Bs.`,
      };
    }
    return {
      ok: true,
      message: `Se descontará ${total} Bs del saldo y quedarán ${balance - total} Bs a favor.`,
    };
  }
  const nextBalance = balance - total;
  if (creditLimit > 0 && nextBalance < -creditLimit) {
    return {
      ok: false,
      message: `La deuda superaría el límite de ${creditLimit} Bs (quedaría en ${Math.abs(nextBalance)} Bs).`,
    };
  }
  if (nextBalance < 0) {
    return {
      ok: true,
      message: `Se acumulará una deuda de ${Math.abs(nextBalance)} Bs.`,
    };
  }
  return {
    ok: true,
    message: `Tras el consumo quedará un saldo de ${nextBalance} Bs.`,
  };
}