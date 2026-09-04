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
    "discountedById" TEXT,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "canceledById" TEXT,
    "delayNotified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_discountedById_fkey" FOREIGN KEY ("discountedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cancelReason", "canceledById", "cancelledAt", "createdAt", "customerName", "delayNotified", "deliveredAt", "deliveryType", "discountAmount", "discountReason", "discountedAt", "discountedById", "id", "paidAt", "paymentAmount2", "paymentMethod", "paymentMethod2", "seq", "status", "total", "userId") SELECT "cancelReason", "canceledById", "cancelledAt", "createdAt", "customerName", "delayNotified", "deliveredAt", "deliveryType", "discountAmount", "discountReason", "discountedAt", "discountedById", "id", "paidAt", "paymentAmount2", "paymentMethod", "paymentMethod2", "seq", "status", "total", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_seq_key" ON "Order"("seq");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_createdAt_status_idx" ON "Order"("createdAt", "status");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CAJERO',
    "shift" TEXT NOT NULL DEFAULT 'SIN_TURNO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("active", "createdAt", "id", "name", "password", "role", "username") SELECT "active", "createdAt", "id", "name", "password", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
