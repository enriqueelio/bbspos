## 1. Vista de almuerzos del admin

- [x] 1.1 Poner `"almuerzos"` como tab inicial de `MenuManager` en `apps/admin/app/(dashboard)/menu/menu-manager.tsx`, sin reordenar `MENU_TABS`
- [x] 1.2 Quitar de la tabla de almuerzos las columnas Prog., Vend., Apart. y Disponib., y ajustar el `colSpan` de la fila vacía a las columnas restantes
- [x] 1.3 Eliminar `LunchHistoryPanel` junto con los helpers `formatDayKey` y `dayWeekday`, que solo usaba
- [x] 1.4 Sacar de `MenuItemAdminView` las props `lunchStock` y `enMenuDelDiaHoy`, y de `MenuManager` la prop `lunchHistory`

## 2. Datos del admin

- [x] 2.1 Dejar de llamar `lunchStockByItem` y `lunchStockHistory` en `apps/admin/app/(dashboard)/menu/page.tsx`
- [x] 2.2 Retirar los imports de `lunchStockByItem`, `lunchStockHistory` y `zonedDateKey` de `page.tsx`, junto con el mapeo de `enMenuDelDiaHoy` y `lunchStock`
- [x] 2.3 Confirmar que la gestión de menú ya no lee `LunchQuota`, `LunchAdjust` ni `LunchHold` en ningún punto del admin

## 3. Código muerto del cajero

- [x] 3.1 Eliminar `setLunchPlanned` de `apps/cajero/actions/lunch-stock.ts`
- [x] 3.2 Eliminar `setLunchLowThreshold` de ese mismo archivo y los imports de `setLunchPlannedForDay` y `setLunchLowThresholdForDay`
- [x] 3.3 Verificar que ninguna app importa las dos acciones borradas

## 4. Verificación

- [x] 4.1 `pnpm -r typecheck` sin errores
- [x] 4.2 `pnpm -r lint` sin errores nuevos
- [x] 4.3 Abrir la gestión de menú del admin y confirmar que entra en Almuerzos y que la tabla muestra solo Nombre, Precio y Acciones
- [x] 4.4 Confirmar en el POS del cajero que la tarjeta de almuerzo sigue mostrando la cantidad, que el `+` sigue estableciendo la base y que el aviso de pocas unidades sigue en rojo a las cinco unidades
