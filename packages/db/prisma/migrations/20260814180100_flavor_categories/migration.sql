-- CreateTable
CREATE TABLE "FlavorCategoryLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flavorId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlavorCategoryLink_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill memberships from the previous single category column
INSERT INTO "FlavorCategoryLink" ("id", "flavorId", "category", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "category", CURRENT_TIMESTAMP FROM "Flavor";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flavor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Flavor" ("available", "createdAt", "id", "name") SELECT "available", "createdAt", "id", "name" FROM "Flavor";
DROP TABLE "Flavor";
ALTER TABLE "new_Flavor" RENAME TO "Flavor";
CREATE UNIQUE INDEX "Flavor_name_key" ON "Flavor"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FlavorCategoryLink_flavorId_category_key" ON "FlavorCategoryLink"("flavorId", "category");
