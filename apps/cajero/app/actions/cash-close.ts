"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import {
  CashDenominations,
  Role,
  parseDenominations,
  stringifyDenominations,
  type CashDenominationCount,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";
import { todayKey } from "@/lib/day";
import { getCashCloseStats } from "@/lib/cash-close";
import {
  formatCashCloseText,
  getPrinterName,
  printText,
} from "@/lib/printing";

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
  const stats = await getCashCloseStats(dateKey);
  const diffCash = countedCash - stats.expectedCash;

  // El usuario de la sesión puede no existir en la DB; verificamos antes de
  // asignar la llave foránea para no violar la restricción (P2003).
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  const record = await prisma.cashClose.create({
    data: {
      date: dateKey,
      userId: dbUser ? dbUser.id : null,
      denominations: stringifyDenominations(input.denominations),
      countedCash,
      systemCash: stats.expectedCash,
      systemQr: stats.systemQr,
      systemCard: stats.systemCard,
      pensionSales: stats.pensionSales,
      rechargeCash: stats.rechargeCash,
      rechargeQr: stats.rechargeQr,
      diffCash,
      notes,
    },
  });

  revalidatePath("/");

  return {
    id: record.id,
    message:
      diffCash === 0
        ? "Cierre de caja guardado. El efectivo cuadra exacto."
        : diffCash > 0
          ? `Cierre de caja guardado. Sobrante de Bs ${diffCash}.`
          : `Cierre de caja guardado. Faltante de Bs ${Math.abs(diffCash)}.`,
  };
}

/** Imprime el ticket resumen de un cierre de caja guardado. */
export async function printCashClose(closeId: string): Promise<string> {
  const session = await getRequiredSession();

  if (session.user.role === Role.MESERO) {
    throw new Error("No autorizado. Los meseros no pueden imprimir el cierre.");
  }

  const printerName = getPrinterName();
  if (!printerName) {
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

  await printText(
    printerName,
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
      expectedCash: row.systemCash,
      diffCash: row.diffCash,
      notes: row.notes,
    }),
  );

  return `Ticket del cierre de caja (${row.date}, ${row.closedAt.toLocaleString(
    "es-BO",
    { timeStyle: "short" },
  )}) enviado a la impresora.`;
}