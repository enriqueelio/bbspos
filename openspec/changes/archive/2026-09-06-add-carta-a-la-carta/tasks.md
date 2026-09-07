## 1. Esquema de datos

- [x] 1.1 Ampliar enum `MenuCategory` con las 16 categorías de la carta y etiquetas/listas en `packages/types`
- [x] 1.2 Crear modelo `MenuItemOption` (name, price, sortOrder, cascade, unique menuItemId+name) y añadir `MenuItem.description` y `OrderItem.menuItemOptionName`
- [x] 1.3 Generar y aplicar la migración `20260906233019_add_carta_la_carta` al `dev.db` y regenerar el Prisma Client (servidores detenidos)

## 2. Tipos compartidos y catálogo

- [x] 2.1 Añadir a `packages/types`: `MenuItemOptionView`, `MenuItemView.description`/`options`, `Catalog.cartaItems`, `MenuItemCartItem.optionName`, `OrderItem.menuItemOptionName`
- [x] 2.2 Implementar helper `cartaMenuItems()` en `packages/db/src/menu-day.ts`
- [x] 2.3 Servir `cartaItems` en `getPosCatalog` (cajero/mesero) y `getCatalog` (store) con mapper a `MenuItemView` (precio = mínimo de variantes, options opcional)

## 3. Carrito y terminal POS

- [x] 3.1 Aceptar `optionName` en `AddPosMenuItemInput` y usar id único `menu-item-${menuItemId}-${optionName??""}` en los cart stores de cajero y mesero; `normalizeStoredItem` con default `optionName: null`
- [x] 3.2 Mostrar la variante en las líneas del ticket y en el resumen
- [x] 3.3 Sección "Carta" en la terminal: tabs por categoría (`MenuCategoryList`), `firstCartaCategory`, cuadrícula con descripción/precio
- [x] 3.4 Selector de variante: estado `variantItem`, `tapCartaItem`, `confirmVariant`, confirmación deshabilitada sin opción elegida

## 4. Comanda y displays

- [x] 4.1 Incluir `ComandaItem.menuItemOptionName` y label `(opción)` en las 4 libs de impresión y en los mapeos (cajero/mesero/store/admin actions)
- [x] 4.2 Mostrar la variante en cola de cajero (`queue-view.tsx`, `app/page.tsx`), listado admin (`orders/page.tsx`, `orders-client.tsx`)

## 5. Admin

- [x] 5.1 `createMenuItem`/`updateMenuItem` con `description` y `options` (transaction) en `apps/admin/app/actions/catalog.ts`
- [x] 5.2 UI de plato con descripción y editor de variantes (`MenuItemOptionsEditor`) en `menu-manager.tsx`; badge "Del Día" solo para `ALMUERZO`; toggle disponible preserva options

## 6. Reportes

- [x] 6.1 Agrupar cierre diario por `flavorCategory ?? menuItemCategory` con `CATEGORY_LABELS` (Flavor+Menu) y `CATEGORY_ORDER` incluyendo `MenuCategoryList` en route, print-report y admin printing

## 7. Seed y datos

- [x] 7.1 Reescribir `seed-old-catalog.ts` para coexistir con la carta y ejecutarlo
- [x] 7.2 Crear `seed-carta.ts` (parser de `indicaciones/menu_bibosi.txt` + 4 Extras fijos, idempotente) y ejecutarlo (90 platos, 15 variantes)

## 8. Verificación

- [x] 8.1 `pnpm -r typecheck` y `pnpm -r lint` sin errores nuevos
- [x] 8.2 Arrancar los 4 dev servers y verificar 200 en todos los puertos; `/menu` y `/login` compilan
- [x] 8.3 Re-ejecutar el seed y confirmar idempotencia (0 creados / 90 actualizados)