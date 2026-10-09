# Tasks

## 1. Modelo de datos y migración (packages/db)

- [x] 1.1 Agregar el modelo `Category` al schema.prisma (según design D1) y verificar con `corepack pnpm exec prisma format` que el schema queda válido
- [x] 1.2 Escribir la migración SQL manual `migrations/<ts>_make_categories_administrable/migration.sql`: CREATE TABLE `Category`, INSERT seed de las 17 filas del design D3 (con `imageUrl` desde `CategoryConfig` por key), UPDATE de `MenuItem.category` ('SANDWICH' y 'PANINI' → 'SANDWICHES'), reconstrucción de la columna `MenuItem.category` de enum a TEXT conservando `@@index([category, available])`, y DROP TABLE `CategoryConfig`; verificar con `npx prisma migrate deploy` tras matar los procesos node (AGENTS.md)
- [x] 1.3 Actualizar `schema.prisma`: `MenuItem.category String @default("ALMUERZO")`, eliminar `CategoryConfig` y el enum `MenuCategory`; verificar que `corepack pnpm exec prisma generate` finaliza sin EPERM
- [x] 1.4 Cambiar `MenuItem.category` a `String` no-enum en `packages/types` (eliminar `MenuCategory`, `MenuCategoryLabel`, `MenuCategoryList`); verificar con `pnpm --filter @bbspos/db typecheck` y `pnpm --filter @bbspos/types typecheck`

## 2. Server actions de categorías (apps/admin)

- [x] 2.1 Crear `apps/admin/app/actions/category.ts` con `listCategories`, `createCategory`, `updateCategory`, `setCategoryActive` y `reorderCategories` usando `getRequiredSession` + rol ADMIN/SUPER_ADMIN (convención de product-image.ts) y verificar con typecheck del admin
- [x] 2.2 Implementar `reorderCategories` con `prisma.$transaction` validando que la lista recibida contenga exactamente las categorías activas (sin faltantes ni inventadas) → error de conflictos (409) sin persistir nada; verificar con una prueba de servicio llamando a la action con un set incompleto
- [x] 2.3 Proteger la edición de `key` en `updateCategory` (no editable si la categoría tiene `MenuItem` asociados); verificar que la action rechaza el cambio de key con platos y lo permite sin platos
- [x] 2.4 Adaptar `saveCategoryImage`/`removeCategoryImage` (product-image.ts) para validar el `key` contra la tabla `Category` en vez de `CATEGORY_KEYS` y decidir el manejo del archivo tras consolidación; verificar subida/borrado de imagen de una categoría por admin

## 3. UI del panel admin (apps/admin)

- [x] 3.1 Agregar dependencias `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities` a apps/admin y verificar que la instalación y el build compilan
- [x] 3.2 Ampliar la pestaña "Categorías" (menu-manager.tsx) con formulario de alta/edición: nombre, slug autogenerado, selector de ícono (whitelist de lucide, sin cast `any`), color en hex, toggle `visibleInBar`; verificar creación/edición desde el admin y aparición en la lista
- [x] 3.3 Agregar toggle activar/desactivar por categoría (borrado lógico) y verificar que al desactivar desaparece del grid y de la barra del cajero en la siguiente lectura
- [x] 3.4 Implementar drag & drop de reordenamiento (Sensors: pointer + keyboard) que al soltar llame `reorderCategories` y actualice el estado local en el mismo orden; verificar arrastre, persistencia al recargar y mensaje de error si el servidor rechaza (set inválido)

## 4. Catálogo del POS y barra (apps/cajero + mesero)

- [x] 4.1 En `getPosCatalog` (pos.ts:62) cargar `categories` activas visibles en barra ordenadas por `order` y derivar `categoryImages` de esa consulta (o eliminar la clave y pasar `imageUrl` inline); verificar devolviendo el JSON del catálogo
- [x] 4.2 Reemplazar en `pos-terminal.tsx` `MENU_PANE_ORDER`, `PANE_LABEL_SHORT`, `PANE_TITLE` y la fusión virtual SANDWICH+PANINI por las `catalog.categories`; mantener la lógica `isBubas` y el pane de Menú del Día; verificar que la barra idle muestra las 5 columnas con el orden y labels del seed
- [x] 4.3 Resolver ícono/color en `pos-category-bar.tsx` desde `iconName`/`color` con un mapa whitelist `Record<string, LucideIcon>` y el color como `style={{ color }}` (o tintes existentes); verificar que cada tarjeta muestra su ícono y tinte correctos sin imagen
- [x] 4.4 Adaptar el mesero (tabs de texto) para iterar `catalog.categories` activas en vez de `MenuCategoryList`; verificar que el mesero muestra la misma lista ordenada sin cambiar su comportamiento
- [x] 4.5 Verificar integración en el navegador (punta a punta, cajero puerto 3002 y mesero 3003): estado inicial 5 columnas, apertura/volver de categoría, tarjeta con imagen, categoría desactivada ausente y sin cuentas de teclado; usar `corepack pnpm --filter @bbspos/cajero typecheck && lint`

## 5. Reportes

- [x] 5.1 En `print-report.ts` (CATEGORY_ORDER:168) y `api/reports/daily/route.ts` (CATEGORY_ORDER:25) sustituir el array hardcodeado por `category.findMany({ orderBy: { order: "asc" } })` y usar `Category.name` para la etiqueta del desglose; verificar que el cierre diario lista las categorías en el orden de la BD
- [x] 5.2 Aplicar el mapa de legado `{ SANDWICH: "SANDWICHES", PANINI: "SANDWICHES" }` al agrupar `menuItemCategory` en reportes diarios y de ventas por categoría; verificar con una consulta sobre tickets históricos pre-consolidación que se agrupan bajo "Sandwiches"
- [x] 5.3 Verificar los escenarios de la spec reports (desglose de carta, desglose sin mezclar bebidas/platillos, categoría desactivada con ventas en el periodo) ejecutando el endpoint con un dataset de prueba en dev.db

## 6. Limpieza y verificación final

- [x] 6.1 Buscar referencias residuales a `MenuCategory`, `MenuCategoryLabel`, `MenuCategoryList`, `CATEGORY_PANES` y `categoryImages` en todo el monorepo (grep) y eliminarlas o reemplazarlas por `Category`; verificar que no quedan usos
- [x] 6.2 Ejecutar `pnpm -r typecheck` y `pnpm -r lint` sobre el monorepo y corregir errores y warnings relevantes (preexistente: `Topping` sin usar en pos-terminal.tsx:23)
- [x] 6.3 Probar la migración sobre dev.db (backup previo): `migrate deploy`, `prisma generate` y `pnpm --filter @bbspos/db verify:cuenta` (invariantes del modelo) y `verify:customer-account` si aplica; verificar que la BD queda operativa
- [x] 6.4 Prueba funcional completa: abrir localhost:3001 (admin) → reordenar/crear/desactivar categorías; localhost:3002 (cajero) → barra e imagen/iconos; localhost:3003 (mesero) → tabs; reporte diario con ventas del día
- [x] 6.5 Commit del cambio (migración + seed + código + types; `dev.db` versionada como se venía haciendo) y push a master, con mensaje conventional en español siguiendo el estilo del repo