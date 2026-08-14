## 1. Base de datos

- [x] 1.1 Editar `packages/db/prisma/schema.prisma`: quitar `price` de `Size`, `Flavor` y `BobaType`; agregar modelo `DrinkPrice` (category, sizeId, bobaTypeId, price, única compuesta), modelo `Topping` (name, price, available) y modelo `OrderItemTopping` (orderItemId, toppingName, unitPrice) con su relación en `OrderItem`. *(Nota: `Flavor` usa `FlavorCategoryLink` para admitir varias categorías por sabor.)*
- [x] 1.2 Generar la migración con `prisma migrate dev --name bubble-drinks-price-matrix` y aplicarla sobre la BD local.
- [x] 1.3 Actualizar `packages/db/prisma/seed.ts`: tamaños Grande/Extragrande, bobas Tapioca/Explosivas (sin precio), la lista exacta de sabores por categoría del documento, la matriz de precios completa en Bs y los toppings (boba extra +4, explosivas extra +5); eliminar tamaños/sabores/bobas obsoletos; re-ejecutar la semilla.

## 2. Tipos compartidos

- [x] 2.1 Actualizar `packages/types/src/index.ts`: interfaces `Size`/`Flavor`/`BobaType` sin `price`; tipos `Topping`, `PriceMatrix` y `DrinkPrice`; `Catalog` con `drinkPrices` y `toppings`; `DrinkSelection` con categoría, tamaño, boba y toppings; `CartItem` y `OrderItem` con toppings; etiquetas de categoría "Con leche"/"Con agua"/"Especiales".
- [x] 2.2 Remplazar `computeDrinkPrice` por cálculo desde la matriz (precio base por categoría+tamaño+boba) más suma de toppings; cambiar `formatPrice` para emitir bolivianos enteros (p. ej. "20 Bs").

## 3. Store (apps/store)

- [x] 3.1 Actualizar `apps/store/lib/catalog.ts` para devolver también la matriz de precios y los toppings disponibles.
- [x] 3.2 Actualizar `builder-store.ts`: estado para categoría, sabor, tamaño, tipo de boba y toppings (multiselección), con su persistencia.
- [x] 3.3 Rediseñar el configurador (`/build`): pasos categoría → sabor → matriz 2×2 (tamaño × boba con precios por categoría) → toppings opcionales, con precio en tiempo real en Bs y bloqueo de pasos incompletos.
- [x] 3.4 Actualizar carrito (`cart-store`, `cart-item`, `cart-summary`): mostrar toppings por bebida y precio base de matriz; cambiar la clave de persistencia para descartar carritos antiguos.
- [x] 3.5 Actualizar la acción de creación de pedido (`app/actions/order.ts`) para enviar y persistir toppings y precio base.
- [x] 3.6 Al confirmar una bebida, redirigir al cliente al carrito; el carrito ofrece la opción de "Armar otra bebida" para añadir más ítems.

## 4. Admin (apps/admin)

- [x] 4.1 Actualizar el gestor de menú: CRUD de tamaños, sabores y tipos de boba sin precio (solo nombre/capacidad/categoría/disponibilidad).
- [x] 4.2 Agregar CRUD de toppings (nombre, precio en Bs, disponibilidad) en el gestor de menú.
- [x] 4.3 Agregar edición de la matriz de precios (grid por categoría: tamaño × boba → precio en Bs) con acción de servidor protegida.
- [x] 4.4 Actualizar la vista de pedidos: mostrar toppings por bebida y el detalle de cada pedido con precios en Bs.
- [x] 4.5 Permitir editar los valores de los ítems ya creados (tamaño, sabor, tipo de boba y topping) mediante diálogos en el gestor de menú.
- [x] 4.6 Cambiar la medida de los vasos a onzas (Grande 16 oz, Extragrande 21 oz): renombrar `Size.ml` a `Size.oz` con migración, actualizar seed, tipos y todas las UIs.

## 5. Verificación

- [x] 5.1 Ejecutar `pnpm typecheck`, `pnpm lint` y `pnpm build` desde la raíz y dejar todo en verde.
- [x] 5.2 Smoke test: configurar una bebida con toppings en la tienda, crear el pedido, y verificar en el admin el detalle con toppings y totales en Bs.
