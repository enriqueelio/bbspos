-- CreateTable
CREATE TABLE "CashClose" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "closedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "denominations" TEXT NOT NULL,
    "countedCash" INTEGER NOT NULL,
    "systemCash" INTEGER NOT NULL,
    "systemQr" INTEGER NOT NULL,
    "systemCard" INTEGER NOT NULL,
    "pensionSales" INTEGER NOT NULL,
    "rechargeCash" INTEGER NOT NULL,
    "rechargeQr" INTEGER NOT NULL,
    "diffCash" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CashClose_date_idx" ON "CashClose"("date");

-- CreateIndex
CREATE INDEX "CashClose_closedAt_idx" ON "CashClose"("closedAt");

