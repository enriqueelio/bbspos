## Why

El restaurante (Bibosi/LA MILANESA) también vende **almuerzos ejecutivos con precio fijo**, pero el sistema actual solo modela bebidas (`Flavor`/`Size`/`BobaType`/`DrinkPrice`) y el personal no puede ofrecer platos desde las terminales de mesero y cajero. Se necesita un catálogo de platos con una sección dedicada "Almuerzos", un interruptor de **Menú del Día** que se renueve cada jornada, y su exposición destacada en ambas terminales respetando el diseño de cada una.

## What Changes

- **Nuevo modelo Prisma `MenuItem`**: plato con categoría/sección (enum `MenuCategory`, por defecto `ALMUERZO`), precio fijo en bolivianos, disponibilidad (`available`) y bandera `enMenuDelDia` con vigencia por jornada (`menuDelDiaDate`), de modo que la bandera se reinicia automáticamente al cambiar la fecha. Nueva migración y `menuItems` accesibles vía las acciones de menú existentes.
- **Catálogo extendido (endpoints del menú)**: el payload `Catalog` y las acciones `getPosCatalog` (cajero/mesero) y `getCatalog` (tienda) incluyen los platos del día (`menuItems` con `enMenuDelDia` vigente para la jornada actual y disponibles). Es un cambio **aditivo**: la tienda no expone UI nueva.
- **Admin UI (`/menu`)**: gestión CRUD de platos (nombre, precio, categoría, activo) y toggle "Agregar al Menú del Día de hoy" que activa la bandera con la fecha de jornada actual (auto-reset diario).
- **Órdenes**: `OrderItem` pasa a soportar **líneas de platillo** además de líneas de bebida (nombre del platillo, categoría y precio capturado al momento de la creación), incluyendo persistencia, comanda impresa y listado/cola de pedidos. Campos de bebida pasan a ser opcionales. **BREAKING** (controlado): migración con columnas anulables en `OrderItem`.
- **Mesero (UI)**: sección destacada "Almuerzos · Menú del Día" al inicio del catálogo, con **tarjetas compactas** (estilo `h-16`, tema oscuro slate existente), mostrando únicamente los platos habilitados del día.
- **Cajero (UI)**: sección destacada equivalente en **cuadrícula fluida** del POS (grilla responsive 3→6 columnas, botones de toque `h-14`, tema existente), mostrando únicamente los platos habilitados del día.
- **Semilla inicial**: sin cambios en el catálogo de bebidas; **no se siembran platos** (se empieza vacío, el admin los crea desde `/menu`).
- Reportes (detalle en `design.md`): los platillos se agrupan como una sección propia ("ALMUERZO") en el desglose por categoría.

## Capabilities

### New Capabilities

- `lunch-menu`: catálogo de platos con sección dedicada "Almuerzos" y precios fijos, disponibilidad por plato, bandera de Menú del Día con vigencia por jornada (auto-reset diario) y visibilidad en las terminales de mesero y cajero, gestionado por el admin.

### Modified Capabilities

- `ordering`: los pedidos pueden contener líneas de platillo (almuerzo) además de bebidas, con el precio capturado al momento de la creación; la persistencia, la comanda y el listado de pedidos reflejan ambos tipos de ítem.

## Impact

- `packages/db`: `schema.prisma` (modelo `MenuItem`, enum `MenuCategory`, columnas anulables en `OrderItem`), nueva migración, seed sin cambios de platos.
- `packages/types`: `Catalog` (aditivo `menuItems`), `CartItem` (unión bebida/platillo), tipos de platillo.
- `apps/cajero` y `apps/mesero`: `actions/pos.ts` (`getPosCatalog` incluye `menuItems`), `pos-terminal.tsx` (sección destacada), `pos-cart-store`, impresión (`formatComanda`), cola de pedidos.
- `apps/admin`: `app/actions/catalog.ts` (CRUD de platos + toggle de Menú del Día), `menu-manager.tsx` (nueva sección de almuerzos).
- `apps/store`: `getCatalog` devuelve `menuItems` vacío/opcional; sin cambios de UI.
- Reportes y worker diario: agrupación de platillos en desgloses.