-- Imagen de fondo de las tarjetas de categoría de la barra del POS.
-- Una fila por pane (valores del enum MenuCategory + "BUBAS" + "SANDWICHES").
CREATE TABLE "CategoryConfig" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT
);
