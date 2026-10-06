-- Columna iconKey en User (aplicada manualmente en dev.db via add_iconkey.sql.js;
-- esta migración la formaliza para entornos nuevos)
ALTER TABLE "User" ADD COLUMN "iconKey" VARCHAR(20) DEFAULT NULL;
