-- Separa la cuenta corriente del pensionado de la identidad del cliente.
--
-- Hasta ahora "ser pensionado" vivia en Customer.isPension y sus datos
-- financieros (pensionType, balance, creditLimit) en la misma fila, junto a la
-- identidad y la lealtad. Eso mezclaba dos cosas con ciclo de vida distinto: un
-- cliente de mostrador con saldo 0 era indistinguible de un pensionado prepago
-- sin saldo, y el libro de movimientos colgaba de Customer en vez de de la
-- cuenta.
--
-- Ahora la existencia de CustomerAccount ES la marca de pensionado (no hay
-- columna que sincronizar) y CustomerLedger apunta a la cuenta, no al cliente.
-- El backfill da cuenta a todo cliente que REALMENTE tiene cuenta corriente: los
-- marcados isPension, los que movieron saldo, los que tienen limite de deuda y
-- los que tienen movimientos en el libro. Un cliente de mostrador puro no gana
-- una cuenta, asi que no puede aparecer en el cobro "PENSIONADO" del cajero.

-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "pensionType" TEXT NOT NULL DEFAULT 'PREPAGO',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CustomerAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_customerId_key" ON "CustomerAccount"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAccount_pensionType_idx" ON "CustomerAccount"("pensionType");

-- Backfill: una cuenta por cliente con huella de cuenta corriente.
-- El criterio es un superconjunto del backfill de isPension: ademas de los ya
-- marcados, entra cualquiera con saldo movido, limite o movimientos. Asi ningún
-- libro historico queda huerfano en la redefinicion de abajo.
INSERT INTO "CustomerAccount" ("id", "customerId", "pensionType", "balance", "creditLimit")
SELECT
    lower(hex(randomblob(16))),
    "Customer"."id",
    "Customer"."pensionType",
    "Customer"."balance",
    "Customer"."creditLimit"
FROM "Customer"
WHERE "Customer"."isPension" = 1
   OR "Customer"."balance" <> 0
   OR "Customer"."creditLimit" > 0
   OR EXISTS (
       SELECT 1
       FROM "CustomerLedger"
       WHERE "CustomerLedger"."customerId" = "Customer"."id"
   );

-- RedefineTables: el libro pasa a colgar de la cuenta.
-- El INNER JOIN con CustomerAccount no descarta filas: el backfill de arriba
-- creo una cuenta para todo cliente con movimientos, asi que cada renglon del
-- libro encuentra su cuenta. accountId queda NOT NULL porque una cuenta sin
-- movimientos no tiene nada que registrar en el libro.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CustomerLedger" ("id", "accountId", "type", "amount", "paymentMethod", "orderId", "createdAt")
SELECT
    "CustomerLedger"."id",
    "CustomerAccount"."id",
    "CustomerLedger"."type",
    "CustomerLedger"."amount",
    "CustomerLedger"."paymentMethod",
    "CustomerLedger"."orderId",
    "CustomerLedger"."createdAt"
FROM "CustomerLedger"
JOIN "Customer" ON "Customer"."id" = "CustomerLedger"."customerId"
JOIN "CustomerAccount" ON "CustomerAccount"."customerId" = "Customer"."id";
DROP TABLE "CustomerLedger";
ALTER TABLE "new_CustomerLedger" RENAME TO "CustomerLedger";
CREATE INDEX "CustomerLedger_accountId_idx" ON "CustomerLedger"("accountId");
CREATE INDEX "CustomerLedger_createdAt_idx" ON "CustomerLedger"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable: el pedido guarda la cuenta con la que se cobro, para que el gasto
-- a cuenta se pueda auditar sin volver a resolver el cliente. SQLite si permite
-- agregar una columna con REFERENCES, asi que no hace falta redefinir Order.
-- customerId NO se borra: sigue siendo el vinculo de identidad y lealtad del
-- pedido, que es independiente de como se pago.
ALTER TABLE "Order" ADD COLUMN "accountId" TEXT REFERENCES "CustomerAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: todo pedido ya cobrado a cuenta queda apuntando a su cuenta.
UPDATE "Order"
SET "accountId" = (
    SELECT "CustomerAccount"."id"
    FROM "CustomerAccount"
    WHERE "CustomerAccount"."customerId" = "Order"."customerId"
)
WHERE "customerId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Order_accountId_idx" ON "Order"("accountId");

-- RedefineTables: Customer queda solo con identidad y lealtad. Los datos
-- financieros ya viven en CustomerAccount; isPension desaparece porque la
-- existencia de la cuenta es la marca.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ci" TEXT,
    "phone" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" DATETIME,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Customer" ("id", "name", "ci", "phone", "totalVisits", "totalSpent", "lastVisitAt", "points", "createdAt")
SELECT "id", "name", "ci", "phone", "totalVisits", "totalSpent", "lastVisitAt", "points", "createdAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;