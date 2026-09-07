// Worker de limpieza del Menú del Día: al detectar el cambio de jornada,
// desactiva los almuerzos que quedaron marcados el día anterior para que la
// selección del Menú del Día siempre arranque limpia. Corre en segundo plano
// dentro del contenedor (docker-entrypoint.sh), igual que el worker de cierre.
//
// Uso:
//   tsx menu-day-cleanup-worker.ts        -> bucle del servicio
//   tsx menu-day-cleanup-worker.ts --once -> resetea y sale
import { resetStaleMenuDelDia } from "../src/menu-day";
import { zonedDateKey } from "../src/daily-report";

const LOOP_MS = 60_000;

async function main(): Promise<void> {
  const once = process.argv.includes("--once");

  let currentDay = zonedDateKey();

  const tick = async (): Promise<void> => {
    const today = zonedDateKey();
    if (today === currentDay) return;
    currentDay = today;
    const cleared = await resetStaleMenuDelDia();
    if (cleared > 0) {
      console.log(
        `[menu-day] Nueva jornada ${today}: se limpiaron ${cleared} almuerzos del día anterior.`,
      );
    }
  };

  await tick();
  if (once) {
    console.log(`[menu-day] Reseteo manual completado para ${currentDay}.`);
    return;
  }

  setInterval(tick, LOOP_MS);
  console.log(`[menu-day] Activo. Monitor de la jornada ${currentDay}.`);
}

main().catch((err) => {
  console.error(
    "[menu-day] Error fatal:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
