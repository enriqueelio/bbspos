# Proposal

## Why

Las categorías del menú están fijas en código: un enum `MenuCategory` duplicado (TypeScript y Prisma) y arrays de orden/iconos/labels repetidos en cajero, admin y mesero. Agregar una categoría obliga a tocar código en 5+ sitios y crear una migración; reordenarlas también. El dueño quiere crear hasta decenas de categorías, ordenarlas con drag & drop y activar/desactivar desde un panel, sin editar código.

## What Changes

- **Nuevo modelo `Category` en Prisma** como única fuente de verdad: `key` (valor guardado en `MenuItem.category`), `name`, `slug`, `iconName`, `color` (hex), `imageUrl`, `order`, `isActive`, `visibleInBar`. Se reemplaza el enum `MenuCategory` y `MenuItem.category` pasa de enum a `String`.
- **Consolidación de categorías**: los platos `SANDWICH` y `PANINI` migran a la clave `SANDWICHES` (el POS ya las mostraba fusionadas en un solo pane "Sandwiches"). El enum se elimina; las claves pasan a ser strings.
- **Panel admin de categorías** dentro de la pestaña "Categorías" del menú: crear/editar/desactivar, subir imagen (reusa `saveCategoryImage`), y **reordenar con drag & drop** (`@dnd-kit`) persistiendo vía transacción.
- **API/actions de categorías** protegidas con `getRequiredSession` + rol ADMIN/SUPER_ADMIN (convención existente): CRUD (borrado lógico = `isActive=false`), reorder transaccional con validación, e imagen vía `saveCategoryImage`.
- **Consumidores migrados a la BD**: `pos-category-bar.tsx` (cajero) y las tabs del mesero leen categorías activas ordenadas por `order` desde el catálogo; el dropdown de secciones del admin, los reportes (`CATEGORY_ORDER`) y el editor de platos leen `Category`. `CategoryConfig` se descarta (absorbe a `Category.imageUrl`).
- **Selector de 2 estados se conserva**: tarjetas grandes con imagen arriba + franja inferior oscura (estado inicial) ↔ barra compacta (categoría abierta con botón Volver), ya implementado en el cajero; solo cambia el origen de los datos.

## Capabilities

### New Capabilities
- `menu-categories`: catálogo de categorías del menú administrable (alta/edición/desactivación/orden con drag & drop, icono/color/imagen), persistido en BD, como única fuente de verdad para la barra de secciones del POS, las tabs del mesero, el editor de platos y los reportes; con la regla horaria y de visibilidad de la barra (incluidas las categorías especiales `ALMUERZO` y `BUBAS`).

### Modified Capabilities
- `pos-terminal`: el selector de la "Sección Carta" ya no es una lista fija; las tarjetas/pestañas de la carta se construyen desde la BD (solo activas, en `order` dado, con ícono/color/imagen por categoría).
- `lunch-menu`: las secciones de platos a la carta dejan de ser fijas del enum y pasan a ser las categorías activas de la tabla `Category` (con `ALMUERZO` como caso especial del Menú del Día).
- `reports`: el desglose y las ventas por categoría usan las etiquetas y el orden de la tabla `Category` en lugar del mapeo fijo en código.

## Impact

- **BD**: migración SQL manual (reconstruye `MenuItem` al pasar `category` a `TEXT`, reescribiendo `SANDWICH`/`PANINI` → `SANDWICHES`), seed idempotente de ~17 categorías con el orden vigente de `MENU_PANE_ORDER`, copia de `CategoryConfig.imageUrl → Category.imageUrl`, y drop de `CategoryConfig`. `dev.db` queda versionada como ya se hace.
- **Dependencias**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` en `apps/admin`.
- **Código tocado**: `packages/types` (eliminar `MenuCategory`/`MenuCategoryLabel`/`MenuCategoryList`), `packages/db` (schema + migración + seed/script), `apps/admin` (menu-manager tab categorías, editor de platos, `product-image.ts` para usar `Category`, reportes), `apps/cajero` y `apps/mesero` (`getPosCatalog` + barra/tabs), reportes (`CATEGORY_ORDER`).
- **Riesgo principal**: regresión en la barra del cajero (orden, categorías especiales `ALMUERZO`/`BUBAS`, horario >16:00) y en los reportes históricos, que dependen de `OrderItem.menuItemCategory` (snapshot de clave string, inmune a la consolidación).