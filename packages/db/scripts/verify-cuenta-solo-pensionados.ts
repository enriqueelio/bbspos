// Auditoría del invariante de la cuenta corriente: `isPension = false => saldo
// = 0`.
//
// Por qué existe: la plata de una recarga entra al cierre de caja y al reporte
// del día como ingreso real, pero solo se puede gastar si el cliente está
// marcado como pensionado, porque la lista de cobro a cuenta del cajero filtra
// por `isPension` y `acceptPensionOrder` rechaza a los demás. Un abono a un
// mostrador sería, entonces, plata que entró y que nadie puede usar (BUG-4).
// `addCustomerFunds` y `updateCustomer` ya lo impiden; este script sirve para
// confirmar que la base real no arrastra ninguno de esos casos.
//
// SOLO LEE. No escribe, no crea y no borra nada, así que es seguro correrlo
// sobre cualquier base.
//
//   corepack pnpm --filter @bbspos/db verify:cuenta
//
// Sale con código 1 si encuentra algún caso, para que sirva en una revisión.
import { prisma } from "../src/index";

async function main() {
  // 1. El caso directo de BUG-4: plata en una cuenta que el cajero no lista.
  const conSaldo = await prisma.customer.findMany({
    where: { isPension: false, balance: { not: 0 } },
    select: { id: true, name: true, balance: true, pensionType: true },
    orderBy: { name: "asc" },
  });

  // 2. Plata que ya entró por el libro, aunque hoy el saldo esté en cero. Un
  //    movimiento en una cuenta de mostrador no debería existir: la única vía
  //    para crearlo era `addCustomerFunds`.
  const conMovimientos = await prisma.customerLedger.groupBy({
    by: ["customerId"],
    where: { customer: { isPension: false } },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const nombresConMovimientos = conMovimientos.length
    ? await prisma.customer.findMany({
        where: { id: { in: conMovimientos.map((m) => m.customerId) } },
        select: { id: true, name: true },
      })
    : [];
  const nombreDe = new Map(nombresConMovimientos.map((c) => [c.id, c.name]));

  // 3. Dato incoherente, no rompe el invariante pero indica una edición previa:
  //    un PREPAGO con límite de crédito no debería tener `creditLimit > 0`,
  //    porque el límite es del postpago y el prepago se cobra por saldo.
  const limiteIncoherente = await prisma.customer.findMany({
    where: { isPension: true, pensionType: "PREPAGO", creditLimit: { gt: 0 } },
    select: { id: true, name: true, creditLimit: true },
    orderBy: { name: "asc" },
  });

  const total = conSaldo.length + conMovimientos.length + limiteIncoherente.length;

  console.log("AUDITORIA DE LA CUENTA CORRIENTE (isPension = false => saldo = 0)\n");

  if (conSaldo.length === 0) {
    console.log("OK   Sin clientes no pensionados con saldo.");
  } else {
    console.log(`FALLA ${conSaldo.length} cliente(s) no pensionado(s) con saldo:`);
    console.table(conSaldo);
  }

  if (conMovimientos.length === 0) {
    console.log("OK   Sin movimientos de cuenta en clientes no pensionados.");
  } else {
    console.log(`FALLA ${conMovimientos.length} cliente(s) no pensionado(s) con movimientos:`);
    console.table(
      conMovimientos.map((m) => ({
        cliente: nombreDe.get(m.customerId) ?? m.customerId,
        movimientos: m._count._all,
        total: m._sum.amount,
      })),
    );
  }

  if (limiteIncoherente.length === 0) {
    console.log("OK   Sin limites de credito en clientes prepago.");
  } else {
    console.log(`AVISO ${limiteIncoherente.length} pensionado(s) prepago con limite de credito:`);
    console.table(limiteIncoherente);
  }

  console.log(
    total === 0
      ? "\nTodo bien: el invariante se cumple en esta base."
      : "\nRevisar los casos de arriba. No los arregla este script: es de solo lectura.",
  );
  if (total > 0) process.exitCode = 1;

  await prisma.$disconnect();
}

main();