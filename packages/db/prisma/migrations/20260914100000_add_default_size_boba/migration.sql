-- AlterTable: marcar el tamaño y el tipo de boba por defecto (Grande y Tapioca)
-- para la autoselección del POS, en lugar de buscarlos por nombre.
ALTER TABLE "Size" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BobaType" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;