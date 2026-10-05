// Auditoría del modelo normalizado: la cuenta corriente vive en CustomerAccount
// y el libro cuelga de la cuenta.
//
// Por qué existe: con la cuenta separada, la existencia de la fila ES la marca de
// pensionado, así que la estructura ya garantiza que un cliente de mostrador no
// tenga saldo ni movimientos. Lo que la base puede desincronizar es el contenido
// de la cuenta frente a su propio libro (un saldo tocado a mano, un límite que
// no corresponde a la modalidad, una deuda por encima del límite), y eso no lo
// impide ninguna FK. `addCustomerFunds`, `acceptPensionOrder` y
// `updatePensionadoAccount` ya lo impiden por código; este script sirve para
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
  // 1. Saldo descuadrado con el libro: el saldo tiene que ser la suma firmada de
  //    los movimientos (CONSUMO resta, RECARGA y PAGO_DEUDA suman).
  const descuadradas = await prisma.$queryRaw<
    Array<{ name: string; pensionType: string; balance: number; libro: number }>
  >`
    SELECT c.name, ca.pensionType, ca.balance,
           COALESCE(SUM(CASE WHEN l.type = 'CONSUMO' THEN -l.amount ELSE l.amount END), 0) AS libro
    FROM "CustomerAccount" ca
    JOIN "Customer" c ON c.id = ca.customerId
    LEFT JOIN "CustomerLedger" l ON l.accountId = ca.id
    GROUP BY ca.id
    HAVING ca.balance <> COALESCE(SUM(CASE WHEN l.type = 'CONSUMO' THEN -l.amount ELSE l.amount END), 0)
    ORDER BY c.name
  `;

  // 2. Límite de crédito en un Prepago: el prepago se cobra por saldo, así que
  //    un límite no corresponde a la modalidad.
  const limiteIncoherente = await prisma.customerAccount.findMany({
    where: { pensionType: "PREPAGO", creditLimit: { gt: 0 } },
    select: { customer: { select: { name: true } }, creditLimit: true },
    orderBy: { customer: { name: "asc" } },
  });

  // 3. Deuda por encima del límiteconfigured (creditLimit = 0 es sin límite).
  const sobreLimite = await prisma.$queryRaw<Array<{ name: string; balance: number; creditLimit: number }>>`
    SELECT c.name, ca.balance, ca.creditLimit
    FROM "CustomerAccount" ca
    JOIN "Customer" c ON c.id = ca.customerId
    WHERE ca.pensionType = 'POSTPAGO'
      AND ca.balance < 0
      AND ca.creditLimit > 0
      AND -ca.balance > ca.creditLimit
    ORDER BY c.name
  `;

  // 4. Prepago con deuda: el cobro a cuenta de un prepago no lo permite, solo
  //   .avanza si el saldo alcanza.
  const prepagoConDeuda = await prisma.$queryRaw<Array<{ name: string; balance: number }>>`
    SELECT c.name, ca.balance
    FROM "CustomerAccount" ca
    JOIN "Customer" c ON c.id = ca.customerId
    WHERE ca.pensionType = 'PREPAGO' AND ca.balance < 0
    ORDER BY c.name
  `;

  const total = descuadradas.length + limiteIncoherente.length + sobreLimite.length + prepagoConDeuda.length;

  console.log("AUDITORIA DE LA CUENTA CORRIENTE (CustomerAccount)\n");

  if (descuadradas.length === 0) {
    console.log("OK   Todos los saldos cuadran con su libro.");
  } else {
    console.log(`FALLA ${descuadradas.length} pensionado(s) con el saldo fuera del libro:`);
    console.table(descuadradas);
  }

  if (limiteIncoherente.length === 0) {
    console.log("OK   Sin limites de credito en clientes prepago.");
  } else {
    console.log(`AVISO ${limiteIncoherente.length} pensionado(s) prepago con limite de credito:`);
    console.table(
      limiteIncoherente.map((a) => ({
        cliente: a.customer.name,
        creditLimit: a.creditLimit,
      })),
    );
  }

  if (sobreLimite.length === 0) {
    console.log("OK   Ninguna deuda supera el limite de credito.");
  } else {
    console.log(`FALLA ${sobreLimite.length} pensionado(s) con deuda por encima del limite:`);
    console.table(sobreLimite);
  }

  if (prepagoConDeuda.length === 0) {
    console.log("OK   Ningun prepago con deuda.");
  } else {
    console.log(`FALLA ${prepagoConDeuda.length} prepago(s) con saldo en contra:`);
    console.table(prepagoConDeuda);
  }

  console.log(
    total === 0
      ? "\nTodo bien: la base es coherente con el modelo normalizado."
      : "\nRevisar los casos de arriba. No los arregla este script: es de solo lectura.",
  );
  if (total > 0) process.exitCode = 1;

  await prisma.$disconnect();
}

main();