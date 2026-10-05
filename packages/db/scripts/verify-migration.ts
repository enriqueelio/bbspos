import { PrismaClient } from '@bbspos/db';

/**
 * Verifica el estado del modelo normalizado: la cuenta corriente vive en
 * CustomerAccount y el libro cuelga de la cuenta, no del cliente. Se ejecuta
 * sobre dev.db y solo lee.
 */

const prisma = new PrismaClient();

async function check(label: string, sql: string) {
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, bigint | null>>>(
    `SELECT COUNT(*) AS n FROM (${sql})`,
  );
  const n = Number(rows[0].n);
  const ok = n === 0;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${label}: ${n}`);
  return ok;
}

async function main() {
  console.log('=== Verificacion CustomerAccount ===\n');

  let ok = true;

  // La columna legacy tiene que estar realmente gone: si sobrevive, el esquema
  // Prisma y la base estan desalineados y un migrate futuro no la tocaria.
  const legacyCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM pragma_table_info('Customer') WHERE name IN ('isPension','pensionType','balance','creditLimit')`,
  );
  const colsOk = legacyCols.length === 0;
  console.log(
    `${colsOk ? 'OK  ' : 'FALLA'} Customer sin columnas financieras legacy: ${legacyCols.length}` +
      (colsOk ? '' : ` (${legacyCols.map((c) => c.name).join(', ')})`),
  );
  ok = colsOk && ok;

  const legacyLedgerCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM pragma_table_info('CustomerLedger') WHERE name = 'customerId'`,
  );
  const ledgerColsOk = legacyLedgerCols.length === 0;
  console.log(
    `${ledgerColsOk ? 'OK  ' : 'FALLA'} CustomerLedger sin customerId: ${legacyLedgerCols.length}`,
  );
  ok = ledgerColsOk && ok;

  ok = (await check(
    'Cuentas de clientes inexistentes',
    `SELECT 1 FROM "CustomerAccount" ca LEFT JOIN "Customer" c ON c.id = ca.customerId WHERE c.id IS NULL`,
  )) && ok;

  ok = (await check(
    'Clientes con mas de una cuenta',
    `SELECT customerId FROM "CustomerAccount" GROUP BY customerId HAVING COUNT(*) > 1`,
  )) && ok;

  ok = (await check(
    'Movimientos con cuenta inexistente',
    `SELECT 1 FROM "CustomerLedger" l LEFT JOIN "CustomerAccount" ca ON ca.id = l.accountId WHERE ca.id IS NULL`,
  )) && ok;

  ok = (await check(
    'Pedidos con cuenta de otro cliente',
    `SELECT 1 FROM "Order" o JOIN "CustomerAccount" ca ON ca.id = o.accountId
     WHERE o.customerId IS NOT NULL AND ca.customerId <> o.customerId`,
  )) && ok;

  // Coherencia del saldo con el libro. El saldo es la suma firmada de los
  // movimientos: CONSUMO resta, RECARGA y PAGO_DEUDA suman. Si no cuadra, el
  // saldo se toco a mano y el libro ya no explica de donde vino.
  const drift = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; balance: number; ledger: number }>>(
    `SELECT ca.id, c.name, ca.balance AS balance,
            COALESCE(SUM(CASE WHEN l.type = 'CONSUMO' THEN -l.amount ELSE l.amount END), 0) AS ledger
     FROM "CustomerAccount" ca
     JOIN "Customer" c ON c.id = ca.customerId
     LEFT JOIN "CustomerLedger" l ON l.accountId = ca.id
     GROUP BY ca.id
     HAVING ca.balance <> COALESCE(SUM(CASE WHEN l.type = 'CONSUMO' THEN -l.amount ELSE l.amount END), 0)`,
  );
  const driftOk = drift.length === 0;
  console.log(
    `${driftOk ? 'OK  ' : 'FALLA'} Saldo = suma del libro: ${drift.length} cuentas descuadradas` +
      (driftOk ? '' : ` (${drift.map((d) => `${d.name}: saldo ${d.balance} vs libro ${d.ledger}`).join('; ')})`),
  );
  ok = driftOk && ok;

  // Un Postpago con saldo a favor es un dato raro pero no invalido (pago de
  // sobra); un Prepago con deuda y sin limiteConfigured no puede existir porque
  // el prepago no permite saldo negativo: el cobro lo rechaza.
  const prepagoConDeuda = await prisma.$queryRawUnsafe<Array<{ name: string; balance: number }>>(
    `SELECT c.name, ca.balance FROM "CustomerAccount" ca JOIN "Customer" c ON c.id = ca.customerId
     WHERE ca.pensionType = 'PREPAGO' AND ca.balance < 0`,
  );
  const prepagoOk = prepagoConDeuda.length === 0;
  console.log(
    `${prepagoOk ? 'OK  ' : 'FALLA'} Prepago sin deuda: ${prepagoConDeuda.length}` +
      (prepagoOk ? '' : ` (${prepagoConDeuda.map((p) => `${p.name}: ${p.balance}`).join('; ')})`),
  );
  ok = prepagoOk && ok;

  const postpagoSinLimite = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT c.name FROM "CustomerAccount" ca JOIN "Customer" c ON c.id = ca.customerId
     WHERE ca.pensionType = 'POSTPAGO' AND ca.balance < 0 AND ca.creditLimit > 0 AND -ca.balance > ca.creditLimit`,
  );
  const limiteOk = postpagoSinLimite.length === 0;
  console.log(
    `${limiteOk ? 'OK  ' : 'FALLA'} Deuda dentro del limite: ${postpagoSinLimite.length}` +
      (limiteOk ? '' : ` (${postpagoSinLimite.map((p) => p.name).join('; ')})`),
  );
  ok = limiteOk && ok;

  const fkProblems = await prisma.$queryRawUnsafe<Array<{ table: string; rowid: number }>>(
    `PRAGMA foreign_key_check`,
  );
  const fkOk = fkProblems.length === 0;
  console.log(
    `${fkOk ? 'OK  ' : 'FALLA'} PRAGMA foreign_key_check: ${fkProblems.length} violaciones` +
      (fkOk ? '' : ` (${fkProblems.map((f) => `${f.table}#${f.rowid}`).join(', ')})`),
  );
  ok = fkOk && ok;

  const resumen = await prisma.$queryRawUnsafe<Array<Record<string, bigint>>>(
    `SELECT
       (SELECT COUNT(*) FROM "Customer") AS clientes,
       (SELECT COUNT(*) FROM "CustomerAccount") AS cuentas,
       (SELECT COUNT(*) FROM "CustomerLedger") AS movimientos,
       (SELECT COUNT(*) FROM "Order" WHERE "paymentMethod" = 'PENSION') AS pedidos_pension`,
  );
  console.log('\n=== Resumen ===');
  console.log(resumen[0]);

  console.log(`\n${ok ? 'TODO OK' : 'HAY FALLAS'}`);
  await prisma.$disconnect();
  if (!ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});