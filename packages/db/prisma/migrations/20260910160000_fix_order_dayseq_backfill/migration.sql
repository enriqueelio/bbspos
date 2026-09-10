-- Backfill del día local (America/La_Paz, UTC-4 fijo).
-- createdAt se almacena como entero (ms desde época): se divide entre 1000,
-- se interpreta como unixepoch y se descuenta 4 h para obtener el día local.
UPDATE "Order"
SET "orderDate" = date("createdAt" / 1000, 'unixepoch', '-4 hours')
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