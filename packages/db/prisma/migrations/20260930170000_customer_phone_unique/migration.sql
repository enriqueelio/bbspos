-- El telefono pasa a ser unico: es la forma de encontrar a un cliente sin
-- ambiguedad, y el mostrador ya lo pide siempre que el cliente tenga uno.
-- SQLite no tiene ALTER TABLE ... ADD UNIQUE, asi que la constraint es el indice.
-- phone es opcional y los NULL no chocan entre si, asi que los clientes de
-- mostrador (sin telefono) pueden repetirse sin problema.
-- Sin backfill: ya se verifico que ningun telefono esta duplicado.

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
