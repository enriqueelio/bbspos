-- Rename Size.ml to Size.oz and set real values in ounces.
ALTER TABLE "Size" ADD COLUMN "oz" INTEGER NOT NULL DEFAULT 0;

UPDATE "Size"
SET "oz" = CASE "name"
  WHEN 'Grande' THEN 16
  WHEN 'Extragrande' THEN 21
  ELSE "ml"
END;

ALTER TABLE "Size" DROP COLUMN "ml";
