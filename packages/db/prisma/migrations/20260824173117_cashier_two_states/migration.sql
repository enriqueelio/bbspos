-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seq" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'INGRESADO',
    "customerName" TEXT,
    "total" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "userId" TEXT,
    "paymentMethod" TEXT,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "discountedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cancelReason", "cancelledAt", "createdAt", "customerName", "discountAmount", "discountReason", "discountedAt", "id", "paymentMethod", "seq", "status", "total", "userId") SELECT "cancelReason", "cancelledAt", "createdAt", "customerName", "discountAmount", "discountReason", "discountedAt", "id", "paymentMethod", "seq", CASE "status" WHEN 'RECIBIDO' THEN 'INGRESADO' WHEN 'EN_PREPARACION' THEN 'INGRESADO' ELSE "status" END, "total", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_seq_key" ON "Order"("seq");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CAJERO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password") SELECT "createdAt", "email", "id", "name", "password" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
