-- AlterTable: convertir los montos del cierre en Bs a REAL para poder contar
-- monedas fraccionarias (0,50 Bs) cuyo total puede quedar en .50.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_CashClose" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "closedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "denominations" TEXT NOT NULL,
    "countedCash" REAL NOT NULL,
    "systemCash" REAL NOT NULL,
    "systemQr" REAL NOT NULL,
    "systemCard" REAL NOT NULL,
    "pensionSales" REAL NOT NULL,
    "rechargeCash" REAL NOT NULL,
    "rechargeQr" REAL NOT NULL,
    "diffCash" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_CashClose" ("id","date","closedAt","userId","denominations","countedCash","systemCash","systemQr","systemCard","pensionSales","rechargeCash","rechargeQr","diffCash","notes","createdAt")
SELECT "id","date","closedAt","userId","denominations","countedCash","systemCash","systemQr","systemCard","pensionSales","rechargeCash","rechargeQr","diffCash","notes","createdAt" FROM "CashClose";

DROP TABLE "CashClose";
ALTER TABLE "new_CashClose" RENAME TO "CashClose";

-- CreateIndex
CREATE INDEX "CashClose_date_idx" ON "CashClose"("date");
CREATE INDEX "CashClose_closedAt_idx" ON "CashClose"("closedAt");

PRAGMA foreign_keys=ON;