-- AlterTable: momento en que el pedido pasa a producción (ACEPTADO en la cola).
-- El timer de la cola cuenta desde aquí, no desde createdAt.
ALTER TABLE "Order" ADD COLUMN "acceptedAt" DATETIME;

-- Backfill: los pedidos ya aceptados/entregados empiezan a contar el tiempo de
-- producción desde su creación (no existía un timestamp de aceptación previo).
-- createdAt se almacena como entero ms; copiar el valor conserva la semántica.
UPDATE "Order"
SET "acceptedAt" = "createdAt"
WHERE "status" IN ('ACEPTADO', 'ENTREGADO');