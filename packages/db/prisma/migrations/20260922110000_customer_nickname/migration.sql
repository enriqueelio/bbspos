-- Apodo del cliente: nombre corto auto-rellenado con el primer nombre,
-- editable en Administración y usado en cola/comanda/pago del terminal.
ALTER TABLE "Customer" ADD COLUMN "nickname" TEXT;

-- Backfill: nickname = primer token del nombre (en mayúsculas), ya sea
-- "MARIA LOPEZ" -> "MARIA" o una sola palabra "JUAN" -> "JUAN".
UPDATE "Customer"
SET "nickname" = substr(trim("name"), 1, instr(trim("name") || ' ', ' ') - 1)
WHERE "nickname" IS NULL OR trim("nickname") = '';