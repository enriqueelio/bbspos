// Normaliza los pedidos con `acceptedAt` posterior a `deliveredAt`.
//
// El origen: cuando el cajero entrega y cobra casi juntos, el cobro rellenaba
// el `acceptedAt` que faltaba con la hora de ese momento, y quedaba después de
// la entrega. El arranque del reloj quedaba después del cierre, así que medir la
// duración daba cero y la cola pintaba "Tardó 0m" en pedidos que el cliente
// había esperado 14 minutos. El código ya no lo sufre (`getElapsedMs` cae a
// `createdAt` cuando detecta el arranque posterior al cierre, y los actions de
// cobro ya no generan el dato), pero el sello roto queda guardado y cualquier
// reporte que lea `acceptedAt` directo sigue viendo un instante imposible.
//
// Qué hace: pone `acceptedAt = createdAt` en esos pedidos, que es lo más
// cercano a la verdad que se puede recuperar (el pedido sí existía entonces).
// No toca `createdAt`, `deliveredAt`, `paidAt` ni nada de la cola. Solo mira
// pedidos ENTREGADO, que son los únicos donde la inversión significa "cobré
// después de entregar".
//
// Por defecto SOLO informa: dry-run con la lista exacta de lo que cambiaría.
// Para escribir de verdad, pasar --apply.
//
//   corepack pnpm --filter @bbspos/db fix:accepted-at
//   corepack pnpm --filter @bbspos/db fix:accepted-at -- --apply
//
// Es idempotente: al terminar no queda ningún pedido con el arranque posterior
// al cierre, así que volver a correrlo no encuentra nada.
import { prisma } from "../src/index";

const APPLY = process.argv.includes("--apply");

const LA = "America/La_Paz";

function hms(d: Date | null): string {
  if (!d) return "—";
  // La BD guarda instantes; mostrarlos en hora local es lo que espera el cajero.
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: LA,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

type Invertido = Awaited<ReturnType<typeof buscarInvertidos>>[number];

function buscarInvertidos() {
  return prisma.order
    .findMany({
      where: {
        acceptedAt: { not: null },
        deliveredAt: { not: null },
        status: "ENTREGADO",
      },
      select: {
        id: true,
        daySeq: true,
        orderDate: true,
        createdAt: true,
        acceptedAt: true,
        deliveredAt: true,
        tiempoEstimado: true,
      },
      orderBy: [{ orderDate: "desc" }, { daySeq: "desc" }],
    })
    .then((rows) =>
      // El filtro de Prisma no puede comparar dos columnas, así que el descarte
      // se hace acá: solo interesan los que tienen el arranque tras el cierre.
      // `createdAt` es NOT NULL en el schema, pero el cliente generado lo tipa
      // nullable; el descarte evita que un null llegue a la escritura y ponga el
      // arranque en NULL, que sería peor que el dato roto que se quiere arreglar.
      rows.filter(
        (o) =>
          o.createdAt !== null &&
          o.acceptedAt!.getTime() > o.deliveredAt!.getTime(),
      ),
    );
}

async function main() {
  const invertidos: Invertido[] = await buscarInvertidos();

  if (invertidos.length === 0) {
    console.log("OK   Ningun pedido tiene acceptedAt posterior a deliveredAt.");
    return;
  }

  console.log(
    `${APPLY ? "A CORREGIR" : "SE CORREGIRIAN"} ${invertidos.length} pedido(s) con el arranque posterior al cierre:\n`,
  );
  console.log("  fecha       #   creado     aceptado   entregado  desvio  tardara");
  for (const o of invertidos) {
    const desvio = Math.round(
      (o.acceptedAt!.getTime() - o.deliveredAt!.getTime()) / 1000,
    );
    // Lo que la cola va a mostrar con el sello corregido.
    const tardara = Math.max(
      0,
      Math.floor((o.deliveredAt!.getTime() - o.createdAt!.getTime()) / 60_000),
    );
    console.log(
      `  ${o.orderDate ?? "?"}   ${String(o.daySeq ?? "?").padEnd(3)} ` +
        `${hms(o.createdAt!)}  ${hms(o.acceptedAt!)}  ${hms(o.deliveredAt)}  ` +
        `${String(desvio).padStart(4)}s  ${tardara}m de ${o.tiempoEstimado}m`,
    );
  }

  if (!APPLY) {
    console.log(
      `\nDry-run: no se escribio nada. Para corregir de verdad:\n` +
        `  corepack pnpm --filter @bbspos/db fix:accepted-at -- --apply`,
    );
    return;
  }

  let ok = 0;
  for (const o of invertidos) {
    await prisma.order.update({
      where: { id: o.id },
      data: { acceptedAt: o.createdAt },
    });
    ok += 1;
  }
  console.log(`\nOK   ${ok} pedido(s) corregidos.`);

  // Verificación posterior contra la BD: el criterio debe quedar en cero.
  const restantes = await buscarInvertidos();
  if (restantes.length > 0) {
    console.error(
      `FALLA ${restantes.length} pedido(s) siguen con el arranque posterior al cierre.`,
    );
    process.exitCode = 1;
  } else {
    console.log("OK   Ya no queda ningun pedido con el arranque posterior al cierre.");
  }
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
