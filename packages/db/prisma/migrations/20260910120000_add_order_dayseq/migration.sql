-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderDate" TEXT;
ALTER TABLE "Order" ADD COLUMN "daySeq" INTEGER;

-- Backfill del día local (America/La_Paz, UTC-4 fijo) a partir de createdAt.
UPDATE "Order"
SET "orderDate" = date("createdAt", '-4 hours')
WHERE "orderDate" IS NULL;

-- Tickets diarios (#001, #002...) respetando el orden histórico.
UPDATE "Order"
SET "daySeq" = (
  SELECT rn FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "orderDate" ORDER BY "createdAt", "seq") AS rn
    FROM "Order"
  ) ranked
  WHERE ranked.id = "Order"."id"
)
WHERE "daySeq" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderDate_daySeq_key" ON "Order"("orderDate", "daySeq");