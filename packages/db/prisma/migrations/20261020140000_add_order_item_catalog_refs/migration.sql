-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "menuItemOptionId" TEXT,
    "sizeId" TEXT,
    "flavorId" TEXT,
    "bobaTypeId" TEXT,
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
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemOptionId_fkey" FOREIGN KEY ("menuItemOptionId") REFERENCES "MenuItemOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_bobaTypeId_fkey" FOREIGN KEY ("bobaTypeId") REFERENCES "BobaType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("bobaTypeName", "flavorCategory", "flavorName", "id", "menuItemCategory", "menuItemDetail", "menuItemName", "menuItemOptionName", "orderId", "quantity", "sizeName", "tiempoProduccion", "unitPrice") SELECT "bobaTypeName", "flavorCategory", "flavorName", "id", "menuItemCategory", "menuItemDetail", "menuItemName", "menuItemOptionName", "orderId", "quantity", "sizeName", "tiempoProduccion", "unitPrice" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");
CREATE TABLE "new_OrderItemTopping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "toppingId" TEXT,
    "toppingName" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    CONSTRAINT "OrderItemTopping_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItemTopping_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "Topping" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItemTopping" ("id", "orderItemId", "toppingName", "unitPrice") SELECT "id", "orderItemId", "toppingName", "unitPrice" FROM "OrderItemTopping";
DROP TABLE "OrderItemTopping";
ALTER TABLE "new_OrderItemTopping" RENAME TO "OrderItemTopping";
CREATE INDEX "OrderItemTopping_toppingId_idx" ON "OrderItemTopping"("toppingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
