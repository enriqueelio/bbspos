-- Estación de preparación por categoría de la carta: define a qué comanda se
-- envía cada producto. Platos -> COCINA por defecto; las categorías que ya se
-- administraban como cafetería -> CAFETERIA.
ALTER TABLE "Category" ADD COLUMN "station" TEXT NOT NULL DEFAULT 'COCINA';

UPDATE "Category" SET "station" = 'CAFETERIA'
WHERE "key" IN ('PANCAKE', 'POSTRE', 'WAFFLE', 'EXTRAS', 'BEBIDA');
