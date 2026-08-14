-- CreateTable
CREATE TABLE "DrinkPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "bobaTypeId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrinkPrice_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DrinkPrice_bobaTypeId_fkey" FOREIGN KEY ("bobaTypeId") REFERENCES "BobaType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Topping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrderItemTopping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "toppingName" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    CONSTRAINT "OrderItemTopping_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BobaType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_BobaType" ("available", "createdAt", "id", "kind", "name") SELECT "available", "createdAt", "id", "kind", "name" FROM "BobaType";
DROP TABLE "BobaType";
ALTER TABLE "new_BobaType" RENAME TO "BobaType";
CREATE UNIQUE INDEX "BobaType_name_key" ON "BobaType"("name");
CREATE TABLE "new_Flavor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Flavor" ("available", "category", "createdAt", "id", "name") SELECT "available", "category", "createdAt", "id", "name" FROM "Flavor";
DROP TABLE "Flavor";
ALTER TABLE "new_Flavor" RENAME TO "Flavor";
CREATE UNIQUE INDEX "Flavor_name_key" ON "Flavor"("name");
CREATE TABLE "new_Size" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ml" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Size" ("available", "createdAt", "id", "ml", "name") SELECT "available", "createdAt", "id", "ml", "name" FROM "Size";
DROP TABLE "Size";
ALTER TABLE "new_Size" RENAME TO "Size";
CREATE UNIQUE INDEX "Size_name_key" ON "Size"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DrinkPrice_category_sizeId_bobaTypeId_key" ON "DrinkPrice"("category", "sizeId", "bobaTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Topping_name_key" ON "Topping"("name");
