-- Reversión: se elimina el apodo (primer nombre) en favor del nombre corto

-- derivado en el terminal (primer nombre + apellido paterno).
ALTER TABLE "Customer" DROP COLUMN "nickname";
