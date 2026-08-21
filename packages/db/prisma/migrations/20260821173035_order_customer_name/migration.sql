-- AlterTable
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Size" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "oz" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Size" ("available", "createdAt", "id", "name", "oz") SELECT "available", "createdAt", "id", "name", "oz" FROM "Size";
DROP TABLE "Size";
ALTER TABLE "new_Size" RENAME TO "Size";
CREATE UNIQUE INDEX "Size_name_key" ON "Size"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
