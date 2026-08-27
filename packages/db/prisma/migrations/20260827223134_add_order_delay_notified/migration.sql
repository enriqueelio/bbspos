-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seq" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "customerName" TEXT,
    "deliveryType" TEXT,
    "total" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "deliveredAt" DATETIME,
    "userId" TEXT,
    "paymentMethod" TEXT,
    "paymentMethod2" TEXT,
    "paymentAmount2" INTEGER,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "discountedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "delayNotified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cancelReason", "cancelledAt", "createdAt", "customerName", "deliveredAt", "deliveryType", "discountAmount", "discountReason", "discountedAt", "id", "paidAt", "paymentAmount2", "paymentMethod", "paymentMethod2", "seq", "status", "total", "userId") SELECT "cancelReason", "cancelledAt", "createdAt", "customerName", "deliveredAt", "deliveryType", "discountAmount", "discountReason", "discountedAt", "id", "paidAt", "paymentAmount2", "paymentMethod", "paymentMethod2", "seq", "status", "total", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_seq_key" ON "Order"("seq");
CREATE INDEX "Order_createdAt_status_idx" ON "Order"("createdAt", "status");
CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
