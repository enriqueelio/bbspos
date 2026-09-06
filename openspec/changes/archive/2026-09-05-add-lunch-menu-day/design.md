## Context

See proposal.md - Why. El sistema modela solo bebidas: el payload `Catalog` (`packages/types`) es `sizes/flavors/bobaTypes/drinkPrices/toppings`, `OrderItem` persiste `sizeName/flavorName/flavorCategory/bobaTypeName` no anulables, `CartItem` es 100% bebida, y las terminales (cajero y mesero) consumen `getPosCatalog()` → `PosTerminal`. No existe concepto de platillo ni de sección gastronómica. Los contratos de pedido ya congelan texto denormalizado (nombres + precios), patrón reutilizable para platillos.

## Goals / Non-Goals

**Goals:**
- Incluir platos con sección (ALMUERZO), precio fijo, `available` y bandera de Menú del Día con vigencia por jornada sin worker.
- Persistir líneas de platillo dentro de `OrderItem` (snapshot de nombre/categoría/precio), manteniendo el patrón denormalizado existente.
- Exponer `menuItems` en el payload `Catalog` consumido por cajero, mesero y tienda (cambio aditivo), y gestión CRUD + toggle en el admin.
- Sección destacada "Almuerzos · Menú del Día" en ambas terminales con su formato visual propio (tarjetas compactas / grilla fluida), solo platos del día.
- Compatibilidad: la tienda (`store`) sigue construyendo solo ítems de bebida; el carrito persistido se migra en la carga.

**Non-Goals:**
- No hay UI nueva en la tienda pública para almuerzos (solo tipo de datos).
- No inventario/stock, no combinaciones, no toppings para platillos, no matriz de precios para platos.
- No worker ni cron de reset diario: la vigencia por jornada se resuelve en consulta.
- No se siembran platos iniciales (empezar vacío).

## Decisions

### 1. Modelo de datos: `MenuItem` genérico con sección

```prisma
enum MenuCategory { ALMUERZO }

model MenuItem {
  id             String       @id @default(cuid())
  name           String
  category       MenuCategory @default(ALMUERZO)
  price          Int          // Bs, mismo tipo que drinkPrice
  available      Boolean      @default(true)
  enMenuDelDia   Boolean      @default(false)
  menuDelDiaDate String?      // jornada YYYY-MM-DD (America/La_Paz) en que se activó
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@index([category, available])
}
```

Alternativa descartada: `LunchItem` dedicado — no escala a SANDWICH/ENSALADAS/etc. (los requisitos del histórico lo prevén). Alternativa descartada: agregar `ALMUERZO` al enum `FlavorCategory` — contamina la matriz `DrinkPrice` y el configurador de bebidas.

**Auto-reset diario sin worker:** la bandera es efectiva solo cuando `enMenuDelDia = true` Y `menuDelDiaDate = zonedDateKey(now())` (helper ya existente en `packages/db/src/daily-report.ts:29`). Al cambiar la fecha, los flags viejos dejan de aplicar por sí solos. Alternativa descartada: daemon que resetea a medianoche — complejidad y carrera innecesarias para el mismo comportamiento observable.

### 2. `OrderItem` con líneas de platillo (snapshot en el mismo lugar)

Pasos: `sizeName`, `flavorName`, `bobaTypeName` y `flavorCategory` pasan a anulables; se agregan `menuItemName String?` y `menuItemCategory MenuCategory?`. Discriminador: `menuItemName != null` ⇒ línea de platillo.

Alternativa descartada: modelo nuevo `OrderMenuLine` relacionado a `Order` — obligaría joins en comanda, cola y reportes y quebraría el patrón snapshot existente.

### 3. `CartItem` como unión discriminada

```ts
type CartItem = DrinkCartItem | MenuItemCartItem;
// DrinkCartItem = { kind: "DRINK"; ...campos actuales... }
// MenuItemCartItem = { kind: "MENU_ITEM"; menuItemId; name; category; unitPrice; quantity }
```

La tienda solo construye `DrinkCartItem`; cajero/mesero construyen ambos. El carrito en localStorage (`bbspos-pos-cart`) se migra en la carga: ítems sin `kind` se tipan como `"DRINK"`.

### 4. `Catalog` aditivo

`Catalog` agrega `menuItems: MenuItemView[]` donde `MenuItemView = { id, name, category, price }` = platos `available` con Menú del Día vigente. Se actualizan los 3 constructores: `getPosCatalog` (cajero: `actions/pos.ts:16`, mesero: `actions/pos.ts:14`) y `getCatalog` (tienda: `lib/catalog.ts:4`). Sin cambios en los consumidores existentes (solo agregan datos).

### 5. Server actions y admin

En `apps/admin/app/actions/catalog.ts`: `createMenuItem`, `updateMenuItem`, `deleteMenuItem`, `setMenuItemMenuDelDia(id, on)` (ON ⇒ `enMenuDelDia=true` + `menuDelDiaDate=today`; OFF ⇒ `enMenuDelDia=false`). Guard de sesión + `revalidatePath("/menu")`, mismo patrón que el CRUD de sabores. En `menu/page.tsx` se agrega la consulta de `menuItem` y en `menu-manager.tsx` un acordeón "Almuerzos · Menú del Día".

### 6. Sección destacada en terminales (solo Menú del Día)

En el panel derecho de `PosTerminal` (mesero: bloque catálogo `:415-574`; cajero: `:420-584`), se renderiza arriba de las tabs de categorías un bloque "Almuerzos · Menú del Día" reutilizando el estilo existente:

- **Mesero** (tarjetas compactas): `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`, botones `h-16 w-full rounded-xl border p-2 text-sm font-bold active:scale-95` con nombre + precio y un badge ámbar "DEL DÍA" (acento `warning` existente). Mismo patrón que las tarjetas de sabor (`pos-terminal.tsx:443-461`).
- **Cajero** (grilla fluida): `grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2`, botones `h-14 ... rounded-lg ...` idénticos a la grilla de sabores (`pos-terminal.tsx:449-467`), con el mismo badge.
- Click ⇒ se agrega al ticket en curso con su precio fijo (sin pasos de tamaño/boba/topping); clicks repetidos incrementan cantidad.

### 7. `createPosOrder`, comanda, cola y reportes

- `createPosOrder` (cajero/mesero `actions/pos.ts`): valida el carrito vacío, mapea cada ítem según `kind` (bebida ⇒ campos de bebida; platillo ⇒ `menuItemName/menuItemCategory` y campos de bebida `null`), total = Σ(`unitPrice` × `quantity`) sin toppings para platillos.
- Impresión (`formatComanda` en `lib/printing.ts` de mesero y cajero): si la línea tiene `menuItemName`, imprime `CANT nombre` + precio y omite sabor/tamaño/boba.
- Cola (`apps/cajero/components/queue-view.tsx`): muestra `menuItemName` cuando exista, con el mismo helper de etiqueta.
- Reportes (`collectReportStats` en `packages/db/src/daily-report.ts`): las líneas con `flavorCategory` nulo se agrupan en una sección "ALMUERZO" dentro del desglose por categoría; el total ya se calcula sobre `order.total`.

### 8. Seed

El seed no toca `MenuItem` (tabla queda vacía, decisión del usuario). Se mantiene idempotente.

## Risks / Trade-offs

- [Compatibilidad del carrito guardado en localStorage] → En la carga, ítems sin `kind` se tratan como `"DRINK"`; así las sesiones activas anteriores no se pierden.
- [Enums duplicados (Prisma y `packages/types`)] → Es el patrón ya existente con `FlavorCategory`/`BobaKind`; se replica para `MenuCategory`, documentado en types.
- [Columnas anulables en `OrderItem`] → Migración SQLite con rebuild de tabla; no destructiva (no hay órdenes en producción de nuevo sistema aún). `prisma migrate` la genera.
- [Reportes con `flavorCategory` nulo] → Código que agrupa por categoría debe usar el helper de etiqueta; se centraliza para evitar regresiones en `daily-report.ts`.
- [Los constructores de `Catalog` (3 apps) y los consumidores de `CartItem` deben actualizarse juntos] → El typecheck de Turbo compila los 4 apps/packages; cualquier omisión se detecta en CI.

## Migration Plan

1. Nueva migración Prisma `add_menu_item` (modelo `MenuItem`, enum `MenuCategory`, columnas anulables en `OrderItem`).
2. Dev: `pnpm db:migrate`; Prod: se aplica automáticamente vía `prisma migrate deploy` en `docker-entrypoint.sh` (sin cambios de infra).
3. Rollback: revertir la migración; como solo agrega datos opcionales y anula columnas, es no destructivo.

## Open Questions

Ninguna que afecte specs/approach/tasks. (Detalles de presentación del badge o label del acordeón admin se resuelven en implementación.)