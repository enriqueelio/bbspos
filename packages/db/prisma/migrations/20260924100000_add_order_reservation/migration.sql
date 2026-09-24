-- Reservas: pedido con hora pactada de entrega. Entra a la cola como RESERVA
-- (scheduledFor fijo, reservationConfirmed=false) sin activar el reloj de
-- producción ni imprimir comanda. reserveLeadMin = cuántos minutos antes de
-- scheduledFor se empieza a avisar (card iluminada + botón CONFIRMAR).
-- El operador la confirma (reservationConfirmed=true, acceptedAt=now) al
-- cobrarla; reusa el flujo ANULADO/cancelReason existente para anularla.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "scheduledFor" DATETIME;
ALTER TABLE "Order" ADD COLUMN "reservationConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "reserveLeadMin" INTEGER NOT NULL DEFAULT 30;