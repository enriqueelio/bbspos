## Why

El negocio vende ahora "Bubble Drinks" con precios definidos por una matriz fija (categoría × tamaño × tipo de boba) más toppings opcionales, y no por suma de precios individuales como el modelo actual (tamaño + sabor + boba en céntimos). El modelo de datos y el configurador actuales no pueden expresar esa lógica, por lo que hay que rediseñar la estructura y la toma de pedidos para reflejar el catálogo nuevo (Especiales / Con agua / Con leche) y su precio en bolivianos.

## What Changes

- **BREAKING** Modelo de precios: se eliminan los precios de `Size`, `Flavor` y `BobaType`; se introduce una matriz de precios por combinación `(categoría, tamaño, tipo de boba)` y un catálogo de toppings opcionales con precio aditivo (boba de tapioca extra +4 Bs, bobas explosivas extra +5 Bs).
- Catálogo: tamaños pasan a **Grande** y **Extragrande**; tipos de boba a **Tapioca** y **Explosivas**; los sabores siguen la lista exacta por categoría del documento; categorías etiquetadas **Especiales**, **Con agua** y **Con leche**.
- **BREAKING** Moneda: los precios se guardan como enteros en bolivianos (p. ej. 20 = 20 Bs) y `formatPrice` muestra "20 Bs" (antes céntimos formateados como MXN).
- **BREAKING** Flujo del configurador: seleccionar categoría → sabor → tamaño + boba (obligatorios, definen el precio base de la matriz) → toppings opcionales (multiselección). El precio se muestra en tiempo real desde la matriz más toppings.
- **BREAKING** Los pedidos persisten por ítem el precio base de la matriz y los toppings seleccionados; el total incluye toppings.
- El admin pasa a gestionar la matriz de precios y los toppings además del catálogo.

## Capabilities

### New Capabilities

- *(ninguna nueva; el cambio modifica las capacidades existentes de configuración, catálogo y pedidos)*

### Modified Capabilities

- `drink-builder`: el flujo del configurador cambia a categoría → sabor → tamaño + boba (obligatorios) → toppings opcionales; el cálculo de precio usa la matriz de precios más toppings en bolivianos.
- `drink-catalog`: los tamaños, sabores y bobas dejan de tener precio individual; se agregan la matriz de precios y los toppings como entidades gestionables; catálogo inicial y semilla actualizados a los nuevos sabores por categoría.
- `ordering`: los ítems de pedido persisten toppings con sus precios capturados y el precio base de la matriz; el total y el detalle del pedido incluyen los toppings.

## Impact

- `packages/db`: `schema.prisma` (quitar `price` de `Size`/`Flavor`/`BobaType`, añadir modelo de matriz de precios, modelo `Topping` y relación de toppings por ítem), nueva migración y semilla.
- `packages/types`: tipos de selección/carrito/pedido con toppings, cálculo de precio por matriz (`computeDrinkPrice` → lookup), `formatPrice` en bolivianos.
- `apps/store`: configurador de 4 pasos con selección de toppings múltiples, carrito mostrando toppings, action de pedido con toppings.
- `apps/admin`: gestor de menú con CRUD de matriz de precios y toppings, visualización de pedidos con toppings.
- Moneda y datos existentes: cambio de céntimos/MXN a bolivianos enteros; la BD existente requiere re-migración/resiembra.
