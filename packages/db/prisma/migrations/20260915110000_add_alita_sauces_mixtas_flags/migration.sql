-- Catalogo de salsas para las Alitas Mixtas + flags de platos mixtos.
CREATE TABLE "AlitaSauce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "AlitaSauce_name_key" ON "AlitaSauce"("name");

ALTER TABLE "MenuItem" ADD COLUMN "isMixtas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN "requiredSauces" INTEGER;

ALTER TABLE "MenuItemOption" ADD COLUMN "requiredSauces" INTEGER;