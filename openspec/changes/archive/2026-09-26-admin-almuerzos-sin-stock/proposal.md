## Why

El bloque de almuerzos del admin quedó como una estación de observación de cifras que el cajero ya muestra mejor en su propio POS: programado/vendido/apartado/disponible e histórico por jornada. En la práctica el admin solo necesita elegir qué almuerzos se ofrecen hoy y a qué precio, y las columnas leían casi siempre "—" porque el cajero programa sobre su caja. Además arrastraban código muerto: la prop `enMenuDelDiaHoy` que nadie leía, el panel histórico completo y dos server actions sin ningún consumidor.

## What Changes

- La pestaña **Almuerzos** pasa a ser la vista por defecto al abrir la gestión de menú del admin, en lugar de "Platos a la carta".
- Se **eliminan** de la tabla de almuerzos del admin las columnas Prog., Vend., Apart. y Disponib. La tabla queda con Nombre, Precio y Acciones.
- Se **elimina** el panel "Histórico por jornada" del admin.
- La cantidad de la jornada y su histórico dejan de cargarse en el admin: `lunchStockByItem` y `lunchStockHistory` ya no se llaman desde la página de menú, y `lunchStock`/`enMenuDelDiaHoy` dejan de viajar al componente.
- Se **eliminan** las server actions del cajero `setLunchPlanned` y `setLunchLowThreshold`, que no tenía ningún consumidor. El umbral de stock bajo queda fijo en `DEFAULT_LOW_THRESHOLD` y solo lo usa el POS para el aviso de "pocas unidades".
- **BREAKING** (spec): el admin deja de poder consultar la comparación de cantidades por jornada. La spec canónica pasa a declarar que las cantidades de la jornada son responsabilidad exclusiva del POS.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `lunch-menu`: el requisito "Cantidad por jornada de los almuerzos del día" deja de exigir que el admin consulte la comparación por jornada y sus escenarios asociados; la consulta pasa a ser solo del POS. Se documenta además que el umbral de aviso no es configurable desde ninguna terminal.
- `pos-terminal`: el POS queda como única superficie que programa, ajusta y aparta cantidades de almuerzo, y se explicita que el admin solo activa/desactiva el plato del Menú del Día.

## Impact

- `apps/admin/app/(dashboard)/menu/menu-manager.tsx`: tab inicial, tabla de almuerzos, eliminación de `LunchHistoryPanel`, `LunchHistoryAdminView`, `formatDayKey`, `dayWeekday` y la prop `lunchHistory`.
- `apps/admin/app/(dashboard)/menu/page.tsx`: se retiran las consultas de stock e histórico y el mapeo de `enMenuDelDiaHoy`/`lunchStock`.
- `apps/cajero/actions/lunch-stock.ts`: se retiran `setLunchPlanned` y `setLunchLowThreshold`.
- Sin cambios de base de datos: `LunchQuota`, `LunchAdjust` y `LunchHold` se siguen usando igual, solo cambia quién las lee desde el admin.
- Sin cambios de comportamiento en el POS: el cajero sigue programando, ajustando y apartando exactamente igual.
