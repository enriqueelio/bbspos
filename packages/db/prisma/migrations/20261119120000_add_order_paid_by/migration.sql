-- Atribuye cada pedido cobrado al usuario que registró el pago, para que el
-- cierre de caja sea individual por cajero (independiente de quién tomó el
-- pedido, p. ej. un mesero).
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seq" INTEGER,
    "orderDate" TEXT,
    "daySeq" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "customerName" TEXT,
    "deliveryType" TEXT,
    "notes" TEXT,
    "scheduledFor" DATETIME,
    "reservationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reserveLeadMin" INTEGER NOT NULL DEFAULT 30,
    "total" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
    "paidAt" DATETIME,
    "deliveredAt" DATETIME,
    "userId" TEXT,
    "paidById" TEXT,
    "paymentMethod" TEXT,
    "paymentMethod2" TEXT,
    "paymentAmount2" INTEGER,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "discountedAt" DATETIME,
    "discountedById" TEXT,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "canceledById" TEXT,
    "delayNotified" BOOLEAN NOT NULL DEFAULT false,
    "tiempoEstimado" INTEGER NOT NULL DEFAULT 10,
    "customerId" TEXT,
    "accountId" TEXT,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_discountedById_fkey" FOREIGN KEY ("discountedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("acceptedAt", "accountId", "cancelReason", "canceledById", "cancelledAt", "createdAt", "customerId", "customerName", "daySeq", "delayNotified", "deliveredAt", "deliveryType", "discountAmount", "discountReason", "discountedAt", "discountedById", "id", "notes", "orderDate", "paidAt", "paymentAmount2", "paymentMethod", "paymentMethod2", "reservationConfirmed", "reserveLeadMin", "scheduledFor", "seq", "status", "tiempoEstimado", "total", "userId") SELECT "acceptedAt", "accountId", "cancelReason", "canceledById", "cancelledAt", "createdAt", "customerId", "customerName", "daySeq", "delayNotified", "deliveredAt", "deliveryType", "discountAmount", "discountReason", "discountedAt", "discountedById", "id", "notes", "orderDate", "paidAt", "paymentAmount2", "paymentMethod", "paymentMethod2", "reservationConfirmed", "reserveLeadMin", "scheduledFor", "seq", "status", "tiempoEstimado", "total", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_seq_key" ON "Order"("seq");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_createdAt_status_idx" ON "Order"("createdAt", "status");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_paidById_idx" ON "Order"("paidById");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_accountId_idx" ON "Order"("accountId");
CREATE UNIQUE INDEX "Order_orderDate_daySeq_key" ON "Order"("orderDate", "daySeq");

-- Pedidos históricos ya cobrados: se asume quien los registró como quien los
-- cobró. Los nuevos pedidos guardan el cajero real en `paidById`.
UPDATE "Order" SET "paidById" = "userId" WHERE "paidAt" IS NOT NULL;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
