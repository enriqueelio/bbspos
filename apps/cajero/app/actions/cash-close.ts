"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import {
  CashDenominations,
  Role,
  parseDenominations,
  stringifyDenominations,
  type CashDenominationCount,
  type CashMovementRecord,
  type CashMovementSource,
  type CashMovementType,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { todayKey } from "@/lib/day";
import { getCashCloseStats } from "@/lib/cash-close";
import {
  formatCashCloseText,
  getPrinterConfig,
  printText,
} from "@/lib/printing";

function canManageCash(role: string): boolean {
  return role !== Role.MESERO;
}

function normalizeMovementConcept(value: unknown): string {
  const concept = String(value ?? "").trim();
  if (!concept) {
    throw new Error("Escribe un concepto para el movimiento.");
  }
  if (concept.length > 120) {
    throw new Error("El concepto es demasiado largo (máx. 120 caracteres).");
  }
  return concept;
}

function normalizeMovementAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  if (rounded <= 0 || rounded > 1_000_000) {
    throw new Error("El monto no es válido.");
  }
  return rounded;
}

/** Registra un ingreso o egreso manual de efectivo de la gaveta. */
export async function registerCashMovement(input: {
  type: CashMovementType;
  concept: string;
  amount: number;
}): Promise<{ id: string; message: string }> {
  const session = await getRequiredSession();
  if (!canManageCash(session.user.role)) {
    throw new Error("No autorizado. Los meseros no pueden mover la caja.");
  }

  if (input.type !== "INGRESO" && input.type !== "EGRESO") {
    throw new Error("Tipo de movimiento inválido.");
  }
  const concept = normalizeMovementConcept(input.concept);
  const amount = normalizeMovementAmount(input.amount);

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  const movement = await prisma.cashMovement.create({
    data: {
      date: todayKey(),
      type: input.type,
      source: "MANUAL",
      concept,
      amount,
      userId: dbUser?.id ?? null,
    },
  });

  revalidatePath("/");

  return {
    id: movement.id,
    message:
      input.type === "INGRESO"
        ? "Ingreso registrado en la caja."
        : "Egreso registrado en la caja.",
  };
}

/** Anula un movimiento manual que todavía no fue incluido en un cierre.
 *  No se borra: se conserva con fecha y usuario para auditoría. */
export async function voidCashMovement(
  movementId: string,
): Promise<{ message: string }> {
  const session = await getRequiredSession();
  if (!canManageCash(session.user.role)) {
    throw new Error("No autorizado. Los meseros no pueden mover la caja.");
  }

  const movement = await prisma.cashMovement.findUnique({
    where: { id: movementId },
  });
  if (!movement) {
    throw new Error("Movimiento no encontrado.");
  }
  if (movement.voidedAt) {
    throw new Error("El movimiento ya fue anulado.");
  }
  if (movement.source === "AUTO_CLOSE") {
    throw new Error("El excedente automático no se puede anular por separado.");
  }
  if (movement.cashCloseId) {
    throw new Error("El movimiento ya forma parte de un cierre de caja.");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  await prisma.cashMovement.update({
    where: { id: movementId },
    data: {
      voidedAt: new Date(),
      voidedById: dbUser?.id ?? null,
    },
  });

  revalidatePath("/");

  return { message: "Movimiento anulado." };
}

/** Valida y guarda el arqueo de un cierre de caja con su contraste. El total
 *  contado se recalcula en el servidor (fuente de confianza) y la diferencia
 *  contra el efectivo esperado del sistema queda registrada en el histórico. */
export async function confirmCashClose(input: {
  denominations: CashDenominationCount[];
  notes?: string;
}): Promise<{ id: string; message: string }> {
  const session = await getRequiredSession();

  if (session.user.role === Role.MESERO) {
    throw new Error(
      "No autorizado. Los meseros no pueden realizar el cierre de caja.",
    );
  }

  // Valida y normaliza el arqueo: solo denominaciones de la gaveta, cantidad
  // entera no negativa, y el total se calcula aquí (nunca se confía en el
  // cliente).
  if (!Array.isArray(input.denominations)) {
    throw new Error("Arqueo inválido.");
  }
  const seen = new Set<number>();
  let countedCash = 0;
  for (const d of input.denominations) {
    const value = Number(d?.value);
    const count = Number(d?.count);
    if (!CashDenominations.includes(value as (typeof CashDenominations)[number])) {
      throw new Error(`Denominación ${d?.value} no válida.`);
    }
    if (seen.has(value)) {
      throw new Error(`La denominación ${value} está repetida.`);
    }
    seen.add(value);
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Cantidad inválida para ${value} Bs.`);
    }
    countedCash += value * count;
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 300) {
    throw new Error("La nota es demasiado larga (máx. 300 caracteres).");
  }

  const dateKey = todayKey();

  // El usuario de la sesión puede no existir en la DB; verificamos antes de
  // asignar la llave foránea para no violar la restricción (P2003).
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  // El cierre y el movimiento automático se guardan juntos: si el efectivo
  // contado supera lo esperado, el excedente queda registrado como ingreso y
  // nunca se muestra como "sobrante" sin contabilizar.
  const result = await prisma.$transaction(async (tx) => {
    const stats = await getCashCloseStats(dateKey, tx);
    const rawDiff =
      Math.round((countedCash - stats.expectedCash + Number.EPSILON) * 100) /
      100;
    const autoSurplus = Math.max(rawDiff, 0);
    const expectedCash =
      Math.round((stats.expectedCash + autoSurplus + Number.EPSILON) * 100) /
      100;
    const diffCash =
      Math.round((countedCash - expectedCash + Number.EPSILON) * 100) / 100;

    const record = await tx.cashClose.create({
      data: {
        date: dateKey,
        userId: dbUser ? dbUser.id : null,
        denominations: stringifyDenominations(input.denominations),
        countedCash,
        systemCash: expectedCash,
        systemQr: stats.systemQr,
        systemCard: stats.systemCard,
        pensionSales: stats.pensionSales,
        rechargeCash: stats.rechargeCash,
        rechargeQr: stats.rechargeQr,
        cashIncome: stats.cashIncome,
        cashExpense: stats.cashExpense,
        autoSurplus,
        diffCash,
        notes,
      },
    });

    // Los movimientos manuales activos que aún no pertenecen a otro cierre
    // quedan vinculados a este para que la reimpresión sea reproducible.
    await tx.cashMovement.updateMany({
      where: { date: dateKey, voidedAt: null, cashCloseId: null },
      data: { cashCloseId: record.id },
    });

    if (autoSurplus > 0) {
      await tx.cashMovement.create({
        data: {
          date: dateKey,
          type: "INGRESO",
          source: "AUTO_CLOSE",
          concept: "Excedente de arqueo",
          amount: autoSurplus,
          userId: dbUser?.id ?? null,
          cashCloseId: record.id,
        },
      });
    }

    return { id: record.id, autoSurplus, diffCash };
  });

  revalidatePath("/");

  return {
    id: result.id,
    message:
      result.autoSurplus > 0
        ? `Cierre de caja guardado. Se registró automáticamente un ingreso por excedente de Bs ${result.autoSurplus}.`
        : result.diffCash === 0
          ? "Cierre de caja guardado. El efectivo cuadra exacto."
          : `Cierre de caja guardado. Faltante de Bs ${Math.abs(result.diffCash)}.`,
  };
}

/** Imprime el ticket resumen de un cierre de caja guardado. */
export async function printCashClose(closeId: string): Promise<string> {
  const session = await getRequiredSession();

  if (session.user.role === Role.MESERO) {
    throw new Error("No autorizado. Los meseros no pueden imprimir el cierre.");
  }

  const settings = await getPrinterConfig();
  if (!settings) {
    throw new Error(
      "No hay impresora configurada. Pide al administrador que la configure.",
    );
  }

  const row = await prisma.cashClose.findUnique({
    where: { id: closeId },
    include: { user: { select: { name: true } } },
  });

  if (!row) {
    throw new Error("Cierre de caja no encontrado.");
  }

  const movementRows = await prisma.cashMovement.findMany({
    where: {
      date: row.date,
      voidedAt: null,
      OR: [{ cashCloseId: row.id }, { createdAt: { lte: row.closedAt } }],
    },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });
  const movements: CashMovementRecord[] = movementRows.map((movement) => ({
    id: movement.id,
    date: movement.date,
    createdAt: movement.createdAt.toISOString(),
    type: movement.type as CashMovementType,
    source: movement.source as CashMovementSource,
    concept: movement.concept,
    amount: movement.amount,
    userName: movement.user?.name ?? "—",
    cashCloseId: movement.cashCloseId,
    voidedAt: movement.voidedAt?.toISOString() ?? null,
  }));

  await printText(
    settings,
    formatCashCloseText({
      id: row.id,
      date: row.date,
      closedAt: row.closedAt.toISOString(),
      userName: row.user?.name ?? session.user.name ?? "—",
      denominations: parseDenominations(row.denominations),
      countedCash: row.countedCash,
      systemCash: row.systemCash,
      systemQr: row.systemQr,
      systemCard: row.systemCard,
      pensionSales: row.pensionSales,
      rechargeCash: row.rechargeCash,
      rechargeQr: row.rechargeQr,
      cashIncome: row.cashIncome,
      cashExpense: row.cashExpense,
      autoSurplus: row.autoSurplus,
      expectedCash: row.systemCash,
      diffCash: row.diffCash,
      notes: row.notes,
      movements,
    }),
    {
      title: "cierre",
      number: null,
      date: row.closedAt,
    },
  );

  return `Ticket del cierre de caja (${row.date}, ${row.closedAt.toLocaleString(
    "es-BO",
    { timeStyle: "short" },
  )}) enviado a la impresora.`;
}