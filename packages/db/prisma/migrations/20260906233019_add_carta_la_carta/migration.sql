-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "menuItemOptionName" TEXT;

-- CreateTable
CREATE TABLE "MenuItemOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuItemOption_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemOption_menuItemId_name_key" ON "MenuItemOption"("menuItemId", "name");
