## Context

La cantidad de la jornada de los almuerzos se modela en `LunchQuota` (cantidad programada), `LunchAdjust` (bitácora de correcciones) y `LunchHold` (apartado por caja), y se lee agregada por `lunchStockByItem` / `lunchStockHistory` en `packages/db/src/menu-day.ts`. Esa lectura tenía dos consumidores: la tarjeta del POS del cajero y la gestión de menú del admin.

La diferencia entre ambos es que el POS sí la necesita: es donde se programa, se repone y se aparta. El admin solo la pintaba. Además la capa de acciones del cajero (`apps/cajero/actions/lunch-stock.ts`) exponía `setLunchPlanned` y `setLunchLowThreshold` sin un solo consumidor, arrastradas desde el change `2026-09-25-control-cantidad-almuerzos`, que las dejó como API disponible para el futuro.

## Goals / Non-Goals

**Goals:**

- Que la lectura de cantidades para el admin desaparezca por completo, no solo se esconda: menos consultas por render y menos superficie que mantener.
- Que el código muerto salga en vez de quedar como API "por si más adelante".
- Dejar la spec canónica alineada con lo que la aplicación realmente hace.

**Non-Goals:**

- No se cambia el comportamiento del POS: el cajero sigue programando, ajustando y apartando igual.
- No se tocan las tablas ni las funciones de `packages/db`: `lunchStockByItem`, `lunchStockHistory` y `setLunchLowThresholdForDay` se conservan. Cambian solo sus consumidores.
- No se agrega vista de historial en ninguna terminal (ver Risks).

## Decisions

**1. Borrar la UI en vez de ocultarla.** Se eliminan las columnas, el panel de histórico y las props asociadas, en lugar de devolverlas detrás de un flag o un permiso. Alternativa considerada: dejar el panel con un toggle `mostrarCantidades` para el super admin. Descartada porque el único dato accionable era "este plato se está agotando", y ese aviso ya lo da la tarjeta del POS en el momento en que deciding la venta; en el admin llegaría tarde.

**2. Borrar las props de la vista y no solo su render.** `lunchStock` y `enMenuDelDiaHoy` salen de `MenuItemAdminView`, y con ellas las consultas de `page.tsx`. La alternativa era dejar `lunchStock` en el tipo marcada como de solo lectura; se descartó porque nadie la leía, y una prop muerta es la razón por la que el change anterior erosionó la confianza en la vista de almuerzos.

**3. Borrar `setLunchPlanned` y `setLunchLowThreshold`.** Se eliminan en vez de quedar exportadas. `setLunchPlanned` quedó sin consumidor cuando el POS pasó a establecer la cantidad con el primer `+` del badge (el ajuste positivo hace de base). `setLunchLowThreshold` quedó sin consumidor desde que el admin se volvió solo lectura, y la spec ahora dice explícitamente que el umbral es fijo en cinco unidades, así que dejarlo exportado sería prometer una vía que la spec niega.

**4. La tab de Almuerzos como vista por defecto.** `activeTab` arranca en `"almuerzos"` sin cambiar `MENU_TABS`, que ya la tenía primera. Es la opción de menor costo: el orden de las tabs ya comunicaba la prioridad y solo el estado inicial contradecía esa señal.

## Risks / Trade-offs

- **La comparación programado contra vendido por jornada deja de ser visible en la aplicación.** Los datos siguen en `LunchQuota` y `LunchAdjust`, y `lunchStockHistory` sigue disponible para reportes o consultas, pero ninguna pantalla los muestra. → Si más adelante hace falta, el lugar natural es el POS del cajero, que es donde se programa; se recupera con un panel de solo lectura, no con código nuevo de persistencia.
- **El umbral de stock bajo queda fijo en 5 y solo se cambia por SQL.** La columna `lowThreshold` sigue existiendo con default 5. → Aceptado: el umbral es un ajuste operativo menor y la spec lo declara no configurable. Si molesta, se expone en el admin con un change propio.
- **Borrar código de `apps/cajero` mientras el POS se refactoriza** (el terminal se partió en varios archivos hace poco) puede volver a dejar imports cruzados. → `pnpm -r typecheck` y `pnpm -r lint` corren como parte de la verificación del change.

## Migration Plan

No hay migración de datos ni despliegue ordenado: el cambio es de lectura en la UI y de exports en el cliente. Si algo fallara, revertir los tres archivos involucrados (`menu-manager.tsx`, `page.tsx`, `lunch-stock.ts`) restituye la vista anterior sin tocar la base.

## Open Questions

- ¿La comparación por jornada debería aparecer en el POS del cajero, o alcanza con un reporte? No cambia las specs de este change: es una capacidad nueva que requiere su propio change.
