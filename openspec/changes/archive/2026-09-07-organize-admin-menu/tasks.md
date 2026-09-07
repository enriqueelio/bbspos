## 1. Separación de platos en el admin

- [x] 1.1 Definir tipo compartido `MenuItemFormState` para formularios de plato
- [x] 1.2 Estados separados `almuerzoForm` (categoría fija `ALMUERZO`) y `cartaForm` (categoría inicial de carta)
- [x] 1.3 Componente reutilizable `PlatosGroup` (formulario de alta + listado + activar/editar/eliminar)
- [x] 1.4 Bloque **Almuerzos**: sin selector de sección, botón "Agregar/Quitar del día" solo para `ALMUERZO`
- [x] 1.5 Bloque **Platos a la carta**: selector con `MenuCategoryList` (excluye `ALMUERZO`), sin botón del día
- [x] 1.6 Edición compartida permite mover platos entre secciones (`ALMUERZO` + carta)

## 2. Bloque Bubas

- [x] 2.1 Componente `SubSection` (sub-secciones colapsables, sin Cards anidadas)
- [x] 2.2 Agrupar tamaños de vaso, sabores, tipos de boba, toppings y matrices de precios bajo `CollapsibleCard` "Bubas"

## 3. Verificación

- [x] 3.1 `pnpm db:generate` (Prisma Client para typecheck tras install limpio)
- [x] 3.2 `pnpm --filter @bbspos/admin typecheck` sin errores
- [x] 3.3 `pnpm --filter @bbspos/admin lint` sin errores (solo warnings preexistentes de `slideshow/page.tsx`)