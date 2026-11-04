-- Orden editable de productos y variantes en la carta.
-- Se inicializa con el orden actual de inserción (rowid) para no alterar la
-- visualización existente: antes el POS ordenaba por nombre.

ALTER TABLE "MenuItem" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MenuItemOption" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "MenuItem"
SET "sortOrder" = (
  SELECT COUNT(*)
  FROM "MenuItem" AS "m2"
  WHERE "m2"."category" = "MenuItem"."category"
    AND "m2".rowid <= "MenuItem".rowid
);

UPDATE "MenuItemOption"
SET "sortOrder" = (
  SELECT COUNT(*)
  FROM "MenuItemOption" AS "o2"
  WHERE "o2"."menuItemId" = "MenuItemOption"."menuItemId"
    AND "o2".rowid <= "MenuItemOption".rowid
);
