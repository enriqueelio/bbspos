# Checklist de verificación — Almuerzos y Menú del Día

- [x] 1. DB: `schema.prisma` (MenuCategory, MenuItem, OrderItem nullable) + migración `add_menu_item` + helper `menu-day` en `packages/db`
- [x] 2. Tipos: MenuCategory, MenuItemView, Catalog.menuItems, CartItem unión, OrderItem nullable, CategoryBreakdownRow
- [x] 3. Admin: acciones CRUD MenuItem + `setMenuDelDia`, `page.tsx`, accordion Almuerzos en `menu-manager`
- [x] 4. POS: `getPosCatalog` + `createPosOrder` (cajero/mesero), `pos-cart-store` con `kind` + migración + `addMenuItem`
- [x] 5. Terminales: sección Almuerzos del día (mesero `h-16`, cajero `h-14`) + render ticket con platillos
- [x] 6. Comanda/cola/reportes: `formatComanda` platillos, `QueueView` menuItemName, agrupación ALMUERZO en reportes admin, null-safe en reportes/orders
- [x] 7. Tienda: `getCatalog` menuItems + cart `kind` DRINK + CartItemRow/CartSummary unión + `formatComanda` platillos
- [x] 8. Verificación: `pnpm typecheck` + lint + smoke test DB