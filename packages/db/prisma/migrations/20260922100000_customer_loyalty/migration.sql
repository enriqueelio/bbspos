-- Módulo de lealtad de clientes: Customer ampliado con métricas y puntos,
-- reglas de beneficio configurables y bitácora de otorgos/canjes.

-- RedefineTables: Customer pasa a phone opcional (null si vacío) y único,
-- con las columnas de lealtad.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ci" TEXT,
    "phone" TEXT,
    "pensionType" TEXT NOT NULL DEFAULT 'PREPAGO',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" INTEGER NOT NULL DEFAULT 0,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" DATETIME,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Customer" ("id", "name", "ci", "phone", "pensionType", "balance", "creditLimit", "createdAt")
SELECT "id", "name", "ci", NULLIF(TRIM("phone"), ''), "pensionType", "balance", "creditLimit", "createdAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable CustomerBenefitRule
CREATE TABLE "CustomerBenefitRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT NOT NULL DEFAULT 'SPEND_MONTH',
    "threshold" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CustomerBenefitRule_metric_active_idx" ON "CustomerBenefitRule"("metric", "active");

-- CreateTable CustomerReward
CREATE TABLE "CustomerReward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "ruleId" TEXT,
    "type" TEXT NOT NULL,
    "pointsUsed" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "redeemedById" TEXT,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerReward_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerReward_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CustomerBenefitRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerReward_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerReward_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CustomerReward_customerId_idx" ON "CustomerReward"("customerId");
CREATE INDEX "CustomerReward_createdAt_idx" ON "CustomerReward"("createdAt");
CREATE INDEX "CustomerReward_ruleId_idx" ON "CustomerReward"("ruleId");