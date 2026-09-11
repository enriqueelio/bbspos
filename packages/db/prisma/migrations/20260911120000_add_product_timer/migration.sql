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
    "total" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
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
    "tiempoEstimado" INTEGER NOT NULL DEFAULT 10,
    "customerId" TEXT,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_discountedById_fkey" FOREIGN KEY ("discountedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("acceptedAt", "cancelReason", "canceledById", "cancelledAt", "createdAt", "customerId", "customerName", "daySeq", "delayNotified", "deliveredAt", "deliveryType", "discountAmount", "discountReason", "discountedAt", "discountedById", "id", "notes", "orderDate", "paidAt", "paymentAmount2", "paymentMethod", "paymentMethod2", "seq", "status", "total", "userId") SELECT "acceptedAt", "cancelReason", "canceledById", "cancelledAt", "createdAt", "customerId", "customerName", "daySeq", "delayNotified", "deliveredAt", "deliveryType", "discountAmount", "discountReason", "discountedAt", "discountedById", "id", "notes", "orderDate", "paidAt", "paymentAmount2", "paymentMethod", "paymentMethod2", "seq", "status", "total", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_seq_key" ON "Order"("seq");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_createdAt_status_idx" ON "Order"("createdAt", "status");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE UNIQUE INDEX "Order_orderDate_daySeq_key" ON "Order"("orderDate", "daySeq");
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "sizeName" TEXT,
    "flavorName" TEXT,
    "flavorCategory" TEXT,
    "bobaTypeName" TEXT,
    "menuItemName" TEXT,
    "menuItemCategory" TEXT,
    "menuItemOptionName" TEXT,
    "menuItemDetail" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tiempoProduccion" INTEGER NOT NULL DEFAULT 5,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("bobaTypeName", "flavorCategory", "flavorName", "id", "menuItemCategory", "menuItemDetail", "menuItemName", "menuItemOptionName", "orderId", "quantity", "sizeName", "unitPrice") SELECT "bobaTypeName", "flavorCategory", "flavorName", "id", "menuItemCategory", "menuItemDetail", "menuItemName", "menuItemOptionName", "orderId", "quantity", "sizeName", "unitPrice" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;