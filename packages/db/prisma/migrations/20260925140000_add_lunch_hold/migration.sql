-- Apartado de cupo: el primero que mete un almuerzo al ticket en curso lo
-- reserva para su caja, de modo que otra terminal no pueda vender lo mismo.
-- LunchHold es una fila por (menuItemId, date, cartId) con la cantidad apartada.
-- La fecha es la jornada local (America/La_Paz) a la que pertenece el cupo.
-- cartId identifica el navegador/caja que aparta (se guarda en localStorage).
-- remaining que ve una caja = planned + SUM(delta) - sold - apartados de OTROS
-- carritos: asi el numero no baja cuando uno mismo agrega lineas, pero baja en
-- el acto en que otra caja se lleva unidades. Al confirmar el pedido el
-- apartado se borra (el pedido pasa a consumir por la via de sold) y si la caja
-- abandona el ticket, expiresAt lo libera solo.
-- No hay backfill: no existen apartados previos.

-- CreateTable
CREATE TABLE "LunchHold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "LunchHold_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LunchHold_menuItemId_date_cartId_key" ON "LunchHold"("menuItemId", "date", "cartId");

-- CreateIndex
CREATE INDEX "LunchHold_date_idx" ON "LunchHold"("date");

-- CreateIndex
CREATE INDEX "LunchHold_cartId_idx" ON "LunchHold"("cartId");

-- CreateIndex
CREATE INDEX "LunchHold_expiresAt_idx" ON "LunchHold"("expiresAt");
