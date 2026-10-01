-- Separa los PENSIONADOS de los clientes de MOSTRADOR. Hasta ahora la tabla
-- Customer mezclaba los dos y pensionType no los distinguia: su default es
-- PREPAGO, y todo cliente registrado al vuelo en el ticket del cajero nace
-- PREPAGO con saldo 0, o sea igual que un pensionado de verdad. Por eso la
-- lista de "Cuenta Pensionado" del cajero mostraba a todos los clientes.
--
-- isPension es la marca explicita: solo los TRUE aparecen en el dialogo de
-- cobro del cajero y solo ellos aceptan un cobro por cuenta.
--
-- Backfill: se marca como pensionado al que ya tiene huella de cuenta corriente
-- (CI, limite de deuda, saldo movido o movimientos en el libro). Los que no
-- cumplen nada de eso son clientes de mostrador puros. Revisar en
-- Administracion -> Clientes / Pensionados los que quedaron FALSE y marcar los
-- que falten.

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "isPension" BOOLEAN NOT NULL DEFAULT false;

-- Backfill
UPDATE "Customer"
SET "isPension" = 1
WHERE "ci" IS NOT NULL
   OR "creditLimit" > 0
   OR "balance" <> 0
   OR EXISTS (
       SELECT 1
       FROM "CustomerLedger"
       WHERE "CustomerLedger"."customerId" = "Customer"."id"
   );
