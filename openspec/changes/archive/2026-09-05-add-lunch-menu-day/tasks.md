## 1. Base de datos (packages/db)

- [x] 1.1 Agregar `enum MenuCategory { ALMUERZO }` y el modelo `MenuItem` al schema.prisma (`name`, `category`, `price`, `available`, `enMenuDelDia`, `menuDelDiaDate`, timestamps, índice `[category, available]`)
- [x] 1.2 Hacer anulables `sizeName`/`flavorName`/`bobaTypeName`/`flavorCategory` en `OrderItem` y agregar `menuItemName String?` y `menuItemCategory MenuCategory?`
- [x] 1.3 Crear migración `add_menu_item` con `pnpm db:migrate` y verificar `prisma generate` (cliente regenerado con MenuItem)
- [x] 1.4 Exportar helpers de Menú del Día en `packages/db/src` (`todayMenuItems()` que filtra `available + enMenuDelDia + menuDelDiaDate === zonedDateKey()` y `setMenuDelDiaForToday(id, on)`)

## 2. Tipos compartidos (packages/types)

- [x] 2.1 Agregar `MenuCategory` (ALMUERZO) y `MenuItemView { id, name, category, price }` a `packages/types/src/index.ts`
- [x] 2.2 Agregar `menuItems: MenuItemView[]` al contrato `Catalog`
- [x] 2.3 Convertir `CartItem` en unión `DrinkCartItem | MenuItemCartItem` (con `kind: "DRINK" | "MENU_ITEM"`) manteniendo los campos actuales en la variante de bebida

## 3. Backend / acciones del admin (apps/admin)

- [x] 3.1 En `app/actions/catalog.ts`: implementar `createMenuItem`, `updateMenuItem`, `deleteMenuItem` y `setMenuItemMenuDelDia(id, on)` con guard de sesión y `revalidatePath("/menu")`
- [x] 3.2 En `app/(dashboard)/menu/page.tsx`: consultar `menuItem` con marca de "en el menú de hoy" y pasarlo al gestor
- [x] 3.3 En `menu-manager.tsx`: nuevo acordeón "Almuerzos · Menú del Día" con lista (nombre, precio, activo), diálogos crear/editar/eliminar y toggle "Hoy" (agregar/quitar del menú del día)

## 4. Acciones POS y catálogo (apps/cajero y apps/mesero)

- [x] 4.1 `getPosCatalog` en ambas apps: incluir `menuItems` de hoy en `Catalog`
- [x] 4.2 `createPosOrder` en ambas apps: validar carrito por ítem según `kind`, mapear `OrderItem` (platillo ⇒ `menuItemName/menuItemCategory` con campos de bebida `null`; bebida ⇒ como hoy), total = Σ(unitPrice × quantity)
- [x] 4.3 Carrito POS (`pos-cart-store.ts` en ambas): migrar en la carga ítems sin `kind` a `"DRINK"` y soportar la variante de platillo

## 5. UI terminales (PosTerminal de cajero y mesero)

- [x] 5.1 Mesero: bloque destacado "Almuerzos · Menú del Día" al inicio del catálogo con tarjetas compactas (`grid` 2→4 cols, `h-16`, badge "DEL DÍA"), click ⇒ agregar al ticket
- [x] 5.2 Cajero: bloque destacado equivalente en grilla fluida (3→6 cols, `h-14`), click ⇒ agregar al ticket
- [x] 5.3 El bloque solo renderiza platos del día; si no hay, se oculta (sin platos)

## 6. Comanda, cola y reportes

- [x] 6.1 `formatComanda` (lib/printing.ts de mesero y cajero): imprimir líneas de platillo (cantidad + nombre + precio, sin sabor/tamaño/boba)
- [x] 6.2 `QueueView` de cajero: mostrar `menuItemName` cuando la línea sea de platillo
- [x] 6.3 Agrupar líneas con `flavorCategory` nulo bajo la sección "ALMUERZO" en los constructores reales de `byCategory` (ruta `GET /api/reports/daily` y `app/actions/print-report.ts`) usando etiqueta compartida `MenuCategoryLabel`, sin alterar el total de artículos
- [x] 6.4 Robustez con líneas de platillo en otros reportes: `category-sales` y `slow-movers` las omiten, `dashboard-summary` ignora nulos en mejor categoría y `top-products` agrega `AND "menuItemName" IS NULL` al SQL de bebidas

## 7. Tienda pública (apps/store)

- [x] 7.1 `getCatalog`/`GET /api/catalog`: devolver `menuItems` (del día) en el payload sin cambios de UI

## 8. Verificación

- [x] 8.1 `pnpm db:generate` + typecheck/lint de todos los paquetes y apps (Turbo): `pnpm typecheck` y `pnpm lint`
- [ ] 8.2 Prueba funcional de humo: crear un plato desde el admin, agregarlo al Menú del Día de hoy, pedirlo desde mesero y cajero, verificar comanda, cola, reporte y que al simular otra fecha el plato ya no aparece