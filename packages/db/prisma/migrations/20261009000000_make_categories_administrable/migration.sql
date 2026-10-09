-- Categorías administrables: reemplaza el enum MenuCategory y CategoryConfig
-- por la tabla de catálogo `Category`. La consolidación SANDWICH+PANINI → SANDWICHES
-- (decisión del dueño) migra los platos en `MenuItem`; los tickets históricos
-- conservan su snapshot en `OrderItem.menuItemCategory`.
--
-- En SQLite los enums de Prisma son columnas TEXT sin CHECK, así que NO hace falta
-- reconstruir tablas: la columna ya acepta cualquier valor.

-- CreateTable
CREATE TABLE "Category" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'Utensils',
    "color" TEXT NOT NULL DEFAULT '#CE7A22',
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "visibleInBar" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- Seed inicial de las 17 categorías en el orden actual de la barra del POS.
-- La imagen se hereda de CategoryConfig (el embrión que ya guardaba la foto de
-- fondo de cada tarjeta); sin fila en CategoryConfig la categoría queda sin
-- imagen y la tarjeta se dibuja con su ícono.
INSERT INTO "Category" ("key", "name", "slug", "iconName", "color", "order", "isActive", "visibleInBar", "imageUrl", "updatedAt") VALUES
    ('MILANESA', 'Milanesas', 'milanesas', 'UtensilsCrossed', '#F59E0B', 1, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'MILANESA'), CURRENT_TIMESTAMP),
    ('SANDWICHES', 'Sandwiches', 'sandwiches', 'Sandwich', '#FBBF24', 2, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'SANDWICHES'), CURRENT_TIMESTAMP),
    ('HAMBURGUESA', 'Burgers', 'burgers', 'Hamburger', '#FB923C', 3, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'HAMBURGUESA'), CURRENT_TIMESTAMP),
    ('LOMO', 'Lomos', 'lomos', 'Beef', '#D1D5DB', 4, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'LOMO'), CURRENT_TIMESTAMP),
    ('POLLO', 'Pollos', 'pollos', 'Bird', '#F3F4F6', 5, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'POLLO'), CURRENT_TIMESTAMP),
    ('ALITA', 'Alitas', 'alitas', 'Drumstick', '#F87171', 6, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'ALITA'), CURRENT_TIMESTAMP),
    ('ENSALADA', 'Ensaladas', 'ensaladas', 'Salad', '#86EFAC', 7, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'ENSALADA'), CURRENT_TIMESTAMP),
    ('PIQUEO', 'Piqueos', 'piqueos', 'Popcorn', '#FDBA74', 8, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'PIQUEO'), CURRENT_TIMESTAMP),
    ('COMPARTIR', 'Compartir', 'compartir', 'Users', '#7DD3FC', 9, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'COMPARTIR'), CURRENT_TIMESTAMP),
    ('KIDS', 'Kids', 'kids', 'Baby', '#A5B4FC', 10, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'KIDS'), CURRENT_TIMESTAMP),
    ('POSTRE', 'Heladería', 'heladeria', 'IceCreamCone', '#F9A8D4', 11, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'POSTRE'), CURRENT_TIMESTAMP),
    ('WAFFLE', 'Wafles', 'wafles', 'CakeSlice', '#FCD34D', 12, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'WAFFLE'), CURRENT_TIMESTAMP),
    ('PANCAKE', 'Pancakes', 'pancakes', 'Cake', '#FDE68A', 13, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'PANCAKE'), CURRENT_TIMESTAMP),
    ('EXTRAS', 'Extras', 'extras', 'PackagePlus', '#B0BEC5', 14, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'EXTRAS'), CURRENT_TIMESTAMP),
    ('BEBIDA', 'Bebidas', 'bebidas', 'GlassWater', '#67E8F9', 15, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'BEBIDA'), CURRENT_TIMESTAMP),
    ('BUBAS', 'Bubbas', 'bubbas', 'CupSoda', '#4ADE80', 16, 1, 1, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'BUBAS'), CURRENT_TIMESTAMP),
    ('ALMUERZO', 'Almuerzo', 'almuerzo', 'UtensilsCrossed', '#CE7A22', 17, 1, 0, (SELECT "imageUrl" FROM "CategoryConfig" WHERE "key" = 'ALMUERZO'), CURRENT_TIMESTAMP);

-- Consolidación física: los platos SANDWICH y PANINI pasan a la clave única
-- SANDWICHES (en el POS ya se mostraban fusionadas en un solo pane).
UPDATE "MenuItem" SET "category" = 'SANDWICHES' WHERE "category" IN ('SANDWICH', 'PANINI');

-- DropTable: CategoryConfig ya no existe; su roll de imagen lo hereda Category.
DROP TABLE "CategoryConfig";