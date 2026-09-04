"use server";

import {
  manualReportCutoffMinutes,
  sendDailyReportToTelegram,
  zonedDateKey,
  zonedMinutes,
} from "@bbspos/db";
import { getRequiredSession } from "@/lib/session";

/** Envía (una sola vez) el cierre de caja del día actual al bot de Telegram.
 *  Solo se habilita a partir de las 23:10 para evitar envíos anticipados. */
export async function sendDailyReportToBot(): Promise<string> {
  await getRequiredSession();

  const now = new Date();
  if (zonedMinutes(now) < manualReportCutoffMinutes()) {
    throw new Error(
      "El cierre de caja manual se habilita a partir de las 23:10.",
    );
  }

  const res = await sendDailyReportToTelegram(zonedDateKey(now));
  if (!res.ok) {
    throw new Error(res.message);
  }
  return res.message;
}