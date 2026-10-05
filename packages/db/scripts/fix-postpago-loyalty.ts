// Corrige la caché de lealtad de `Customer` para que cuadre con los pedidos que
// realmente generaron lealtad.
//
// El origen: la acumulación solo miraba que el pedido tuviera `customerId`, sin
// considerar ni el tipo de cuenta ni el método de pago. El consumo a cuenta de
// un pensionado POSTPAGO (su pago diferido ya es su propio beneficio) sumaba
// visitas, gasto y puntos igual que una compra normal. El guard ya vive en
// `accumulateCustomerLoyalty` (@bbspos/cajero), pero los números anteriores al
// arreglo quedaron guardados y no se recalculan solos.
//
// La verdad, según la regla de lealtad:
//
//   - Todo pedido COBRADO (paidAt) y no ANULADO.
//   - Salvo el consumo a cuenta de un pensionado POSTPAGO
//     (paymentMethod PENSION), que no cuenta.
//   - Recargar saldo (PREPAGO) y pagar deuda (POSTPAGO) NO cuentan: los puntos
//     se ganan al comprar, no al mover la cuenta corriente. Por eso este script
//     no lee `CustomerLedger` para nada.
//
// De ahí: visitas = pedidos que puntuaron, gasto y puntos = suma de sus totales
// (1 punto por Bs), última visita = el `paidAt` más reciente de esos pedidos.
// Ojo: recalcular puede SUBIR el caché de un cliente, porque el programa de
// lealtad entró después que los primeros pedidos y nunca los retroactivó.
//
// No toca: pedidos, items, `CustomerLedger`, saldos de la cuenta corriente,
// `CustomerReward`, ni los datos de ningun cliente. Solo los cuatro campos de
// lealtad de `Customer`.
//
// Por defecto SOLO informa: dry-run con la lista exacta de lo que cambiaría.
// Para escribir de verdad, pasar --apply.
//
//   corepack pnpm --filter @bbspos/db fix:postpago-loyalty
//   corepack pnpm --filter @bbspos/db fix:postpago-loyalty -- --apply
//
// Es idempotente: al terminar todo cliente cuadra con sus pedidos, así que
// volver a correrlo no encuentra nada.
import { prisma } from "../src/index";

const APPLY = process.argv.includes("--apply");

type Cliente = Awaited<ReturnType<typeof buscarClientes>>[number];

/** Los cuatro campos de lealtad de `Customer` (la caché). */
type Cache = {
  totalVisits: number;
  totalSpent: number;
  points: number;
  lastVisitAt: Date | null;
};

async function buscarClientes() {
  return prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      account: { select: { pensionType: true } }, // hasAccount = account != null
      totalVisits: true,
      totalSpent: true,
      points: true,
      lastVisitAt: true,
    },
    orderBy: { name: "asc" },
  });
}

function cacheDe(c: Cliente): Cache {
  return {
    totalVisits: c.totalVisits,
    totalSpent: c.totalSpent,
    points: c.points,
    lastVisitAt: c.lastVisitAt,
  };
}

/** Recalcula desde `Order`: cobrados, no anulados y que sí generaron lealtad.
 *  Se replica la regla de `fidelizableOrderWhere` en SQL crudo porque este
 *  script no debe depender de `@bbspos/types` (los scripts de @bbspos/db corren
 *  sin las dependencias de las apps). */
async function calcularDesdePedidos(customerId: string): Promise<Cache> {
  const pedidos = await prisma.order.findMany({
    where: { customerId, paidAt: { not: null }, status: { not: "ANULADO" } },
    select: {
      total: true,
      paidAt: true,
      paymentMethod: true,
      customer: { select: { account: { select: { pensionType: true } } } },
    },
  });
  const puntuan = pedidos.filter(
    (p) =>
      // Todo lo que no sea consumo a cuenta de un pensionado POSTPAGO.
      // customer.account es nullable en el tipo generado; si no existe = mostrador.
      !p.customer?.account ||
      p.customer?.account?.pensionType !== "POSTPAGO" ||
      p.paymentMethod !== "PENSION",
  );
  const totalSpent = puntuan.reduce((suma, p) => suma + p.total, 0);
  const ultima = puntuan.reduce<Date | null>(
    (max, p) => (p.paidAt && (!max || p.paidAt > max) ? p.paidAt : max),
    null,
  );
  return {
    totalVisits: puntuan.length,
    totalSpent,
    // 1 punto por cada Bs, igual que el guard de acumulación.
    points: totalSpent,
    lastVisitAt: ultima,
  };
}

function esDistinto(cache: Cache, verdad: Cache): boolean {
  return (
    cache.totalVisits !== verdad.totalVisits ||
    cache.totalSpent !== verdad.totalSpent ||
    cache.points !== verdad.points ||
    (cache.lastVisitAt?.getTime() ?? null) !==
      (verdad.lastVisitAt?.getTime() ?? null)
  );
}

function describe(c: Cache): string {
  const visita = c.lastVisitAt
    ? c.lastVisitAt.toISOString().slice(0, 10)
    : "-";
  return `${String(c.totalVisits).padStart(3)}v ${String(c.totalSpent).padStart(5)}Bs ${String(c.points).padStart(5)}p  ${visita}`;
}

async function main() {
  const clientes = await buscarClientes();

  const cambios: Array<{ c: Cliente; cache: Cache; verdad: Cache }> = [];
  for (const c of clientes) {
    const cache = cacheDe(c);
    const verdad = await calcularDesdePedidos(c.id);
    if (esDistinto(cache, verdad)) cambios.push({ c, cache, verdad });
  }

  if (cambios.length === 0) {
    console.log("OK   Ningun acumulado de lealtad necesita correccion.");
    return;
  }

  console.log(`${APPLY ? "A CORREGIR" : "SE CORREGIRIAN"} ${cambios.length} cliente(s):\n`);
  console.log("  cliente                pension            ahora                 recalculado           delta");
  for (const { c, cache, verdad } of cambios) {
    const delta = verdad.totalSpent - cache.totalSpent;
    const cuenta = c.account ? c.account.pensionType : "MOSTRADOR";
    console.log(
      `  ${c.name.slice(0, 20).padEnd(20)}  ${cuenta.padEnd(16)}  ` +
        `${describe(cache)}  ->  ${describe(verdad)}  ${delta > 0 ? "+" : ""}${delta}Bs`,
    );
  }
  console.log("");

  if (!APPLY) {
    console.log(
      `Dry-run: no se escribio nada. Para corregir de verdad:\n` +
        `  corepack pnpm --filter @bbspos/db fix:postpago-loyalty -- --apply`,
    );
    return;
  }

  for (const { c, verdad } of cambios) {
    await prisma.customer.update({ where: { id: c.id }, data: verdad });
  }
  console.log(`\nOK   ${cambios.length} cliente(s) recalculados.`);

  // Verificación posterior: el criterio debe quedar en cero.
  const despues = await buscarClientes();
  const fallos: string[] = [];
  for (const c of despues) {
    const verdad = await calcularDesdePedidos(c.id);
    if (esDistinto(cacheDe(c), verdad)) {
      fallos.push(`${c.name} no cuadra con sus pedidos`);
    }
  }
  if (fallos.length > 0) {
    console.error(`FALLA ${fallos.length} cliente(s):`);
    for (const f of fallos) console.error(`  ${f}`);
    process.exitCode = 1;
  } else {
    console.log("OK   Todo cliente cuadrado con los pedidos que generaron lealtad.");
  }
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());