// Worker de alertas de pedidos retrasados por Telegram. Revisa cada minuto
// todos los pedidos activos que superan el límite de minutos (default 10) y
// envía un aviso, una sola vez por pedido. Corre en segundo plano dentro del
// contenedor (docker-entrypoint.sh). Toda la lógica vive en
// @bbspos/db/src/telegram-alert.ts (misma fuente que el botón de prueba manual).
//
// Uso:
//   tsx telegram-alert-worker.ts          -> bucle del servicio (cada 60s)
//   tsx telegram-alert-worker.ts --once   -> una sola pasada y sale
//
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (requeridos),
//      DELAY_ALERT_MINUTES (opcional, default 10).
import { checkDelayedOrders } from "../src/telegram-alert";

const LOOP_MS = 60_000;

async function main(): Promise<void> {
  const once = process.argv.includes("--once");

  const tick = async (): Promise<void> => {
    try {
      const sent = await checkDelayedOrders();
      if (sent > 0) {
        console.log(`[telegram-alert] ${sent} alerta(s) enviada(s).`);
      }
    } catch (err) {
      console.error(
        "[telegram-alert] Error:",
        err instanceof Error ? err.message : err,
      );
    }
  };

  await tick();
  if (once) return;

  setInterval(tick, LOOP_MS);
  console.log("[telegram-alert] Activo. Intervalo de 60s.");
}

main().catch((err) => {
  console.error(
    "[telegram-alert] Error fatal:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
