## Why

El restaurante necesita vender su carta completa "A la Carta" (fuera del Menú del Día de almuerzos) desde las terminales POS, ya que actualmente el sistema solo maneja almuerzos dinámicos. Los platillos de la carta incluyen descripciones y algunos (las Milanesas) tienen variantes con precio propio (Pollo/Res), lo que el esquema actual no soporta.

## What Changes

- Ampliar el catálogo de platos para soportar la carta fija: nueva sección "Carta" en las terminales de mesero y cajero, separada de los Almuerzos del Menú del Día.
- Enriquecer el modelo de plato con una descripción opcional y variantes de precio (opciones como Pollo/Res), cada una con su propio precio. Para un plato con variantes, el precio de exhibición es el menor de sus variantes y el carrito cobra el precio de la variante elegida.
- Permitir al admin gestionar descripción y variantes de los platos; restringir la bandera "Menú del Día" solo a la categoría `ALMUERZO`.
- Persistir la variante elegida en las líneas de pedido (`menuItemOptionName`) y mostrarla en la comanda impresa, la cola de preparación y el listado de pedidos del admin.
- Cargar la carta completa desde `indicaciones/menu_bibosi.txt` con un seed idempotente (90 platillos disponibles, sin gaseosas sin precio).
- Agrupar el desglose por categoría del cierre diario por `menuItemCategory` para platillos (con etiquetas en español de las categorías de la carta) y por `flavorCategory` para bebidas.

## Capabilities

### New Capabilities

- Ninguna: la carta prolonga capacidades existentes.

### Modified Capabilities

- `lunch-menu`: la gestión de platos ahora incluye descripción y variantes de precio; la carta fija (categorías distintas de `ALMUERZO`) se entrega a las terminales en una sección separada y no participa del Menú del Día.
- `pos-terminal`: nueva sección "Carta" con pestañas por categoría de la carta, detalles de cada plato y selector de variante (Pollo/Res) con su precio.
- `ordering`: las líneas de pedido de platillos pueden llevar la variante elegida (`menuItemOptionName`) que se persiste y se muestra en comanda y listados.
- `reports`: el desglose por categoría del cierre diario agrupa por `menuItemCategory` los platillos (incluida la carta) y los etiqueta en español.

## Impact

- `packages/db`: migración `20260906233019_add_carta_la_carta` (nuevo modelo `MenuItemOption`, `MenuItem.description`, `OrderItem.menuItemOptionName`, enum `MenuCategory` ampliado), helper `cartaMenuItems()`, seed `seed-carta.ts` y `seed-old-catalog.ts` (previo).
- `packages/types`: `MenuCategory`/`MenuCategoryLabel`/`MenuCategoryList` ampliados, `MenuItemView` con `description`/`options`, `Catalog.cartaItems`, `MenuItemCartItem.optionName`, `OrderItem.menuItemOptionName`.
- `apps/cajero` y `apps/mesero`: catálogo POS con `cartaItems`, carrito con variantes (id único por opción), terminal POS con sección Carta, comanda y cola con la variante.
- `apps/admin`: gestión de platos con descripción/variantes, listado de pedidos y cierre diario con las nuevas categorías y la variante.
- `apps/store`: catálogo público con `cartaItems` (sin UI nueva) y comanda con la variante.