# Informe Técnico: Sistema de Categorías del Menú

> **Ruta auditada:** http://localhost:3001/menu (admin) · **Proyecto:** `bbspos`
> **Fecha:** 2026-10-09 · **Alcance:** SOLO el sistema de categorías (no el CRUD de platos).

---

## 1. Resumen ejecutivo

- **No existe una entidad `Category` en la base de datos.** Las categorías son un **enum hardcodeado** (`MenuCategory`, 17 valores) duplicado en TypeScript y Prisma, más **arrays fijos** replicados en cada app.
- **No hay panel admin para crear/editar/desactivar categorías.** La pestaña "Categorías" existente solo administra la **imagen de fondo** de tarjetas ya existentes (`CategoryConfig`).
- **No existe campo `order`/`position`/`sortOrder`.** El orden es fijo por arrays.
- **No hay drag & drop** (`@dnd-kit/sortable` no está instalado; solo se menciona en `indicaciones/menu.txt` como propuesta).
- **El flujo de 2 estados ya está implementado en el cajero** (grid de tarjetas `h-32` ↔ barra compacta `h-12` + botón "Volver"). El estado se llama `activePane`. **No hay que construirlo: hay que volverlo administrable.**

---

## 2. Diagnóstico actual

### 2.1 ¿Dónde están definidas las categorías?

**Enum TypeScript — `packages/types/src/index.ts:24-84`** (fuente de verdad):

```ts
export const MenuCategory = {
  ALMUERZO: "ALMUERZO",
  SANDWICH: "SANDWICH",
  PANINI: "PANINI",
  ENSALADA: "ENSALADA",
  PIQUEO: "PIQUEO",
  COMPARTIR: "COMPARTIR",
  ALITA: "ALITA",
  HAMBURGUESA: "HAMBURGUESA",
  MILANESA: "MILANESA",
  LOMO: "LOMO",
  POLLO: "POLLO",
  KIDS: "KIDS",
  POSTRE: "POSTRE",
  WAFFLE: "WAFFLE",
  PANCAKE: "PANCAKE",
  EXTRAS: "EXTRAS",
  BEBIDA: "BEBIDA",
} as const;

export type MenuCategory = (typeof MenuCategory)[keyof typeof MenuCategory];
```

También define `MenuCategoryLabel` (`:47-65`, nombre largo visible) y `MenuCategoryList` (`:67-84`, 16 valores **sin** `ALMUERZO`).

**Enum Prisma — `packages/db/prisma/schema.prisma:444-462`** (mismo listado, definición duplicada):

```prisma
enum MenuCategory {
  ALMUERZO
  SANDWICH
  PANINI
  ENSALADA
  PIQUEO
  COMPARTIR
  ALITA
  HAMBURGUESA
  MILANESA
  LOMO
  POLLO
  KIDS
  POSTRE
  WAFFLE
  PANCAKE
  EXTRAS
  BEBIDA
}
```

**Consumo en el modelo de plato — `schema.prisma:90-111`:**

```prisma
model MenuItem {
  id        String        @id @default(cuid())
  name      String
  category  MenuCategory  @default(ALMUERZO)
  price     Int
  ...
  @@index([category, available])
}
```

### 2.2 ¿Existe tabla `Category`?

**No.** El único modelo con "Category" en el nombre es la imagen de fondo — `schema.prisma:332-339`:

```prisma
model CategoryConfig {
  key      String  @id
  imageUrl String?
}
```

No hay `name`, `slug`, `icon`, `color`, `order` ni `isActive` en ninguna parte.

### 2.3 Arrays fijos duplicados (orden + etiquetas + iconos)

| Capa | Ubicación | Constante |
|---|---|---|
| Cajero | `apps/cajero/components/pos/pos-terminal.tsx:76-92` | `MENU_PANE_ORDER` |
| Cajero | `pos-terminal.tsx:96-103` | `PANE_LABEL_SHORT` |
| Cajero | `pos-terminal.tsx:106-108` | `PANE_TITLE` |
| Cajero | `apps/cajero/components/pos/pos-category-bar.tsx:55-73` | `PANE_ICON` |
| Cajero | `pos-category-bar.tsx:77-83` | `PANE_ICON_COLOR` |
| Admin | `apps/admin/app/(dashboard)/menu/menu-manager.tsx:308-325` | `CATEGORY_PANES` |
| Admin | `menu-manager.tsx:945-963` | `CARTA_CATEGORIES` / `CAFETERIA_CATEGORIES` |
| Admin | `apps/admin/app/actions/print-report.ts:168-171`; `apps/admin/app/api/reports/daily/route.ts:27` | `CATEGORY_ORDER` |
| Mesero | `apps/mesero/components/pos/pos-terminal.tsx:621-641` | itera `MenuCategoryList` |

### 2.4 Fetch: ¿estático o dinámico?

- **Datos (platos):** dinámicos, Prisma sobre SQLite.
- **Lista de categorías:** **estática** (enumerada en código por cada app).
- Admin: `menu/page.tsx:10-42` → `menuItem.findMany({ orderBy: [{category:"asc"},{name:"asc"}] })` + `categoryConfig.findMany()`.
- Cajero: `actions/pos.ts:44-147` `getPosCatalog()` → incluye `categoryConfig.findMany()` (`:83`) → `categoryImages` (`:143-145`); refresco por polling 15 s (`pos-terminal.tsx:280-286`).
- **No existe `/api/categories`.**

---

## 3. Problemas encontrados

| # | Problema | Impacto |
|---|---|---|
| P1 | Categorías hardcodeadas en 5+ sitios + enum prisma | Agregar 1 categoría = tocar código + migración. Imposible desde panel. |
| P2 | No hay tabla `Category` (name/slug/icon/color/order/isActive) | Nada de la categoría es configurable salvo la imagen. |
| P3 | Sin campo de orden | Reordenar = editar arrays en cajero, admin y mesero. |
| P4 | Sin drag & drop | No hay `@dnd-kit` instalado en ningún workspace. |
| P5 | Icono y color fijos en código | `PANE_ICON` y `PANE_ICON_COLOR`; no editables. |
| P6 | Duplicación/desincronización de labels y orden | `"Sandwiches"` vs `"Sandwiches de Milanesa"`, `"Burgers"` vs `"Hamburguesas"`, `"Heladería"` vs `"Postres y Helados"`. |
| P7 | Fusión `SANDWICHES` inconsistente | `SANDWICH`+`PANINI` → pane `SANDWICHES` en cajero/admin; separados en BD y mesero. |
| P8 | Iconos incompletos | `ALMUERZO`, `SANDWICH`, `PANINI` no tienen entrada en `PANE_ICON`. `CATEGORY_KEYS` incluye `ALMUERZO` que nunca aparece en la barra. |
| P9 | 2 estados solo en cajero | El mesero usa tabs de texto planos sin tarjetas ni botón "Volver". |

### Extra: mismatch de panes ↔ categorías

- Pane del cajero: `CatalogPane = MenuCategory | "BUBAS" | "SANDWICHES"` (`pos-terminal.tsx:68-71`).
- `SANDWICHES` se muestra si hay ítems `SANDWICH` **o** `PANINI` (`pos-terminal.tsx:727-740`) y filtra ambos (`:673-676`).
- `BUBAS` siempre al final (`:750-754`).
- `ALMUERZO` no entra a la barra (Menú del Día aparte).

---

## 4. Flujo de 2 estados — viabilidad

**Veredicto: viable, ya está implementado.** Componente `apps/cajero/components/pos/pos-category-bar.tsx` (276 líneas). Estado padre `activePane` (`pos-terminal.tsx:229`).

### Estado 1 — sin categoría (`activeKey === null`) · `pos-category-bar.tsx:159`

- Contenedor `grid grid-cols-5 justify-items-stretch gap-2 px-4` (`:167-168`).
- Tarjeta `h-32 w-full`; con imagen `p-0` (`expandedIdle` `:132`, `expandedIdleImage` `:133`).
- Con imagen: `flex-col`; **foto arriba `flex-1 object-cover` + franja oscura `bg-slate-900/90` con icono+nombre abajo** (`:206-232`).
- Sin imagen: fondo oscuro, icono centrado, mismo alto para grilla uniforme (`:200-201`, `:234-251`).
- Imagen URL: `/images/menu/` → `/api/menu-image/` (`:184-187`).

### Estado 2 — categoría abierta (`activeKey != null`)

- Contenedor `flex flex-wrap items-center gap-3 px-4` (`:169`).
- Activa: `expandedActive h-12 shrink-0 px-6` (icono + texto) (`:138`).
- Resto: `collapsed h-12 w-12` (cuadrados) (`:139`).
- La activa **pierde la imagen** en este estado (`:182-187`).
- Botón "Volver" (rojo, `ArrowLeft`) solo si `!isIdle` (`:262-272`).
- Padre: `togglePane` (misma = cierra, otra = abre) `:440-442`; `switchPane(null)` = Volver `:444-459`.

```ts
const CATEGORY_CARD = {
  base: "inline-flex items-center justify-center gap-2 rounded-xl border text-xs font-bold capitalize tracking-wide transition-colors duration-150 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-30",
  expandedIdle: "h-32 w-full px-2",
  expandedIdleImage: "h-32 w-full p-0",
  expandedActive: "h-12 shrink-0 px-6",
  collapsed: "h-12 w-12 shrink-0 px-0",
  back: "h-12 w-12 shrink-0 px-0",
  selected: "border-success bg-success/15 text-white shadow-md shadow-success/25",
  idle: "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80 hover:text-white",
};
```

**Lo que falta no es el flujo, sino que orden/existencia/icono/color salgan de la BD.**

---

## 5. Schema propuesto (categorías 100% administrables)

```prisma
model Category {
  id        String   @id @default(cuid())
  key       String   @unique
  name      String
  iconName  String?
  color     String?
  imageUrl  String?
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([order])
}
```

**Notas de migración:**
- `MenuItem.category` → referencia `Category.key` (String) o relación; validar integridad.
- `CategoryConfig.imageUrl` → migrar a `Category.imageUrl`; `CategoryConfig` puede descartarse.
- `BUBAS` y `SANDWICHES` se siembran como filas reales con su `order`.

**Seed inicial sugerido (order = posición en la barra actual):**

| order | key | name | iconName |
|---|---|---|---|
| 1 | MILANESA | Milanesas | UtensilsCrossed |
| 2 | SANDWICHES | Sandwiches | Sandwich |
| 3 | HAMBURGUESA | Burgers | HamburgerIcon |
| 4 | LOMO | Lomos | Beef |
| 5 | POLLO | Pollos | Bird |
| 6 | ALITA | Alitas | Drumstick |
| 7 | ENSALADA | Ensaladas | Salad |
| 8 | PIQUEO | Piqueos | Popcorn |
| 9 | COMPARTIR | Compartir | Users |
| 10 | KIDS | Kids | Baby |
| 11 | POSTRE | Heladería | IceCreamCone |
| 12 | WAFFLE | Wafles | CakeSlice |
| 13 | PANCAKE | Pancakes | Cake |
| 14 | EXTRAS | Extras | PackagePlus |
| 15 | BEBIDA | Bebidas | GlassWater |
| 16 | BUBAS | Bubbas | CupSoda |

---

## 6. Endpoints propuestos

### GET `/api/categories`

```ts
// apps/admin/app/api/categories/route.ts
import { prisma } from "@bbspos/db";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}
```

### PUT `/api/categories/reorder`

```ts
// Body: { orderedKeys: ["MILANESA", "SANDWICHES", ...] }
export async function PUT(req: Request) {
  const { orderedKeys } = await req.json();
  await prisma.$transaction(
    orderedKeys.map((key: string, order: number) =>
      prisma.category.update({ where: { key }, data: { order } })
    )
  );
  return NextResponse.json({ ok: true });
}
```

### POST/PATCH/DELETE `/api/categories[/:id]`

- **DELETE:** soft-delete (`isActive = false`) para no romper pedidos históricos.

**Imagen:** reutilizar el patrón de `saveCategoryImage` (`apps/admin/app/actions/product-image.ts:127-169`) — sharp 640×360 cover, WebP, `category-<key>.webp` en `apps/store/public/images/menu/`.

---

## 7. Frontend propuesto

### 7.1 Panel admin (nueva página `categorias` o pestana existente)

- **Lista ordenada por `order`** con **`@dnd-kit/sortable`**: `SortableContext(verticalListSortingStrategy)` + `useSortable` por fila. Al `onDragEnd` recomputar `order` y llamar `PUT /api/categories/reorder`.
- Por fila: nombre editable, selector de icono lucide (mapa de componentes, claves = `iconName`), color, subida de imagen (preview), switch `isActive`, botón eliminar (soft).
- Botón **"+ Agregar categoría"** (crea con `POST`).

### 7.2 POS / menú (refactor de consumo)

- La barra se construye solo con categorías `isActive` ordenadas por `order` (hoy: `catalogPanes` en `pos-terminal.tsx:723-756`).
- Icono se resuelve `iconName → componente` vía mapa (equivalente a `PANE_ICON`).
- Sin imagen: cae al layout actual sin imagen (icono centrado, `h-32`).
- Mesero: tabs pasan a leer `Category` para no quedar desincronizado.

---

## 8. Checklist de implementación

- [ ] 1. Modelo `Category` en `schema.prisma` + migración SQL manual (`migrate deploy`, NO `migrate dev`).
- [ ] 2. Seed de filas desde el enum actual + `BUBAS` + `SANDWICHES` con su `order`.
- [ ] 3. `MenuItem.category` → referencia `Category` (validar con `verify:cuenta`/scripts tsx).
- [ ] 4. Migrar `CategoryConfig.imageUrl` → `Category.imageUrl`.
- [ ] 5. `GET /api/categories` (order ASC).
- [ ] 6. `pnpm --filter @bbspos/admin add @dnd-kit/core @dnd-kit/sortable`.
- [ ] 7. `PUT /api/categories/reorder` + `POST`/`PATCH`/`DELETE`.
- [ ] 8. UI admin de categorías (drag & drop + subida de imagen).
- [ ] 9. Refactor cajero: `catalogPanes` desde BD.
- [ ] 10. Refactor mesero: tabs desde BD.
- [ ] 11. Reemplazar `PANE_ICON`/`PANE_ICON_COLOR` por `iconName`/`color` de la BD.
- [ ] 12. Eliminar arrays duplicados (`MENU_PANE_ORDER`, `CATEGORY_PANES`, `CATEGORY_ORDER`, etc.).
- [ ] 13. Reportes leen la BD.
- [ ] 14. `typecheck` + `lint` + `migrate deploy` + prueba en :3001 y :3002.

**Criterio de éxito:** agregar 20 categorías mañana desde el panel y reordenarlas arrastrando, sin tocar código.

---

## Anexo — Archivos clave del sistema

| Archivo | Rol |
|---|---|
| `packages/types/src/index.ts` | Enum `MenuCategory`, `MenuCategoryLabel`, `MenuCategoryList`, `Catalog.categoryImages`. |
| `packages/db/prisma/schema.prisma` | Enum `MenuCategory`; `MenuItem.category`; `OrderItem.menuItemCategory`; `CategoryConfig`. |
| `apps/cajero/components/pos/pos-category-bar.tsx` | Barra de categorías (2 estados, imagen+franja, Volver) + `PANE_ICON`/`PANE_ICON_COLOR`. |
| `apps/cajero/components/pos/pos-terminal.tsx` | `activePane`, `MENU_PANE_ORDER`, `catalogPanes`, fusión `SANDWICHES`. |
| `apps/cajero/actions/pos.ts` | `getPosCatalog()` + `categoryImages`. |
| `apps/cajero/app/api/menu-image/[name]/route.ts` | Sirve los WebP desde `store/public/images/menu`. |
| `apps/mesero/components/pos/pos-terminal.tsx` | Tabs de texto (sin tarjetas ni Volver). |
| `apps/admin/app/(dashboard)/menu/menu-manager.tsx` | `CATEGORY_PANES`, `CARTA_CATEGORIES`, pestana "Categorías". |
| `apps/admin/app/(dashboard)/menu/page.tsx` | Fetch del menú admin. |
| `apps/admin/app/actions/product-image.ts` | `saveCategoryImage`/`removeCategoryImage` + `CATEGORY_KEYS`. |
| `apps/admin/app/actions/print-report.ts` · `apps/admin/app/api/reports/daily/route.ts` | `CATEGORY_ORDER` de reportes. |