-- Cantidad diaria de los almuerzos del Menú del Día, por plato y jornada.
-- LunchQuota es la fila de control: una por (menuItemId, date) con la cantidad
-- programada (planned, null = nadie la programó todavía) y el umbral de aviso
-- de stock bajo. LunchAdjust es la bitácora de correcciones manuales: cada
-- ajuste guarda el delta, la nota, el usuario y el momento, de modo que
-- remaining = planned + Σ delta − sold sea siempre reconstruible.
-- El "sold" NO se guarda: se deriva de OrderItem de los pedidos no anulados
-- (reservas por scheduledFor, resto por createdAt). Por eso no hay contador que
-- dos terminales puedan pisar, y anular un pedido lo restituye solo.
-- No hay backfill: la primera jornada empieza sin cuotas y se comportan como
-- "sin cantidad programada".

-- CreateTable
CREATE TABLE "LunchQuota" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "planned" INTEGER,
    "lowThreshold" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LunchQuota_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LunchAdjust" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotaId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LunchAdjust_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "LunchQuota" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LunchQuota_menuItemId_date_key" ON "LunchQuota"("menuItemId", "date");

-- CreateIndex
CREATE INDEX "LunchQuota_date_idx" ON "LunchQuota"("date");

-- CreateIndex
CREATE INDEX "LunchAdjust_quotaId_idx" ON "LunchAdjust"("quotaId");
