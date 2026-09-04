// Worker de cierre de caja: envía el reporte del día a Telegram cuando el
// reloj local supera DAILY_REPORT_HOUR (default 23:20). Corre en segundo plano
// dentro del contenedor (docker-entrypoint.sh). Toda la lógica vive en
// @bbspos/db/src/daily-report.ts (misma fuente que los botones manuales).
//
// Uso:
//   tsx daily-report-worker.ts                    -> bucle del servicio
//   tsx daily-report-worker.ts --date=2026-08-26  -> envía ese día y sale
//   tsx daily-report-worker.ts --dry-run=2026-08-26 -> imprime el mensaje sin enviar
//
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (requeridos), DAILY_REPORT_HOUR,
//      TIME_ZONE (default America/La_Paz).
import {
  buildReportMessage,
  collectReportStats,
  sendDailyReportToTelegram,
  targetReportDate,
} from "../src/daily-report";

const LOOP_MS = 60_000;

function argValue(prefix: string): string | undefined {
  return process.argv.find((a) => a.startsWith(prefix))?.split("=")[1];
}

async function main(): Promise<void> {
  const dry = argValue("--dry-run=");
  const date = argValue("--date=");

  if (dry) {
    console.log(buildReportMessage(dry, await collectReportStats(dry)));
    return;
  }

  if (date) {
    const res = await sendDailyReportToTelegram(date);
    console.log(`[daily-report] ${res.message}`);
    if (!res.ok) process.exitCode = 1;
    return;
  }

  // Servicio: revisa cada minuto. El propio envío lleva su marca anti-duplicado.
  const cutoff = process.env.DAILY_REPORT_HOUR || "23:20";
  const tick = async (): Promise<void> => {
    const target = targetReportDate(new Date(), cutoff);
    const res = await sendDailyReportToTelegram(target);
    if (!res.ok) {
      console.error(`[daily-report] Fallo para ${target}: ${res.message}`);
    }
  };
  await tick();
  setInterval(tick, LOOP_MS);
  console.log(`[daily-report] Activo. Hora de cierre ${cutoff}.`);
}

main().catch((err) => {
  console.error("[daily-report] Error fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});