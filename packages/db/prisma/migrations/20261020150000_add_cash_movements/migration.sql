-- Movimientos manuales de caja (ingresos/egresos) y excedente automático.
ALTER TABLE "CashClose" ADD COLUMN "cashIncome" REAL NOT NULL DEFAULT 0;
ALTER TABLE "CashClose" ADD COLUMN "cashExpense" REAL NOT NULL DEFAULT 0;
ALTER TABLE "CashClose" ADD COLUMN "autoSurplus" REAL NOT NULL DEFAULT 0;

CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "concept" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "userId" TEXT,
    "cashCloseId" TEXT,
    "voidedAt" DATETIME,
    "voidedById" TEXT,
    CONSTRAINT "CashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CashMovement_cashCloseId_fkey" FOREIGN KEY ("cashCloseId") REFERENCES "CashClose" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CashMovement_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CashMovement_date_idx" ON "CashMovement"("date");
CREATE INDEX "CashMovement_cashCloseId_idx" ON "CashMovement"("cashCloseId");
CREATE INDEX "CashMovement_createdAt_idx" ON "CashMovement"("createdAt");
