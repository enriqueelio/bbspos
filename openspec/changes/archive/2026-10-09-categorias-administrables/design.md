# Design

## Context

Ver `proposal.md` (Why). Estado que condiciona el diseño:

- Hoy no existe entidad de categoría: `MenuCategory` es un enum (17 valores) duplicado en `packages/types/src/index.ts` y `packages/db/prisma/schema.prisma`, y el orden/labels/iconos viven en arrays hardcodeados: `MENU_PANE_ORDER` (pos-terminal.tsx:76-92), `PANE_LABEL_SHORT` (96-103), `PANE_TITLE` (106-108), `PANE_ICON`/`PANE_ICON_COLOR` (pos-category-bar.tsx:55-83), `CATEGORY_PANES` (menu-manager.tsx:308-325), `CATEGORY_ORDER` (print-report.ts:168-171 y reports/daily/route.ts:25).
- La fusión SANDWICH+PANINI hoy es virtual en el cajero (`SANDWICHES_PANE = "SANDWICHES"` en pos-terminal.tsx:67 y pos-category-bar.tsx:27) y en el admin (`CATEGORY_PANES`). **Decisión del dueño: convertirla en consolidación física** (los platos migran a `SANDWICHES`).
- `CategoryConfig` (key, imageUrl) es el embrión de la categoría: ya guarda la imagen, la siembra `saveCategoryImage` (product-image.ts:127-192) y el POS la consume como `catalog.categoryImages[key]` (pos.ts:143-145).
- El catalogo del POS ya entrega los `cartaItems` (platos de la carta disponibles) y `menuItems` (Menú del Día); la barra se arma en el cliente con los arrays hardcodeados combinando ambos.
- El admin ya tiene la pestaña "Categorías" (menu-manager.tsx) con subida de imagen; falta el CRUD completo y el reordenamiento.

## Goals / Non-Goals

**Goals:**
- Una sola fuente de verdad (tabla `Category`) para categorías: clave, nombre, slug, icono, color, imagen, orden, activa, visible en barra.
- CRUD admin completo con drag & drop (orden persistido atómicamente).
- Los consumidores (cajero, mesero, admin, reportes) leen de la BD; desaparecen los arrays hardcodeados.
- Migración SQL a mano (estándar del repo, AGENTS.md) que preserve datos y consolide SANDWICH/PANINI.

**Non-Goals:**
- Cambiar el comportamiento del selector de 2 estados de la barra (ya implementado).
- Hacer administrables los sabores de bebida (3 categorías de boba ESPECIALES/CON AGUA/CON LECHE se mantienen fijas; son dominio de `drink-catalog`, fuera de alcance).
- Permitir el CRUD de categorías desde la app del cajero/mesero: solo admin.
- Migración del mesero a lado del selector de 2 estados (diferible; hoy el mesero usa tabs de texto, lo que ya existe se conserva).

## Decisions

### D1. Modelo `Category` (nueva tabla) reemplazando enum y `CategoryConfig`

```prisma
model Category {
  key         String   @id            // = valor guardado en MenuItem.category (post consolidación)
  name        String                  // etiqueta en español (ej: "Sandwiches")
  slug        String   @unique        // URL/looking, ej: "sandwiches"
  iconName    String   @default("Utensils") // nombre del ícono en la whitelist
  color       String   @default("#CE7A22")  // hex, UX: tono té / esmeralda
  imageUrl    String?
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  visibleInBar Boolean @default(true) // false => no sale en barra (ALMUERZO; categorías solo-dato)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- `MenuItem.category`: de `MenuCategory` (enum) a `String @default("ALMUERZO")`, conservando `@@index([category, available])`.
- Se elimina `CategoryConfig`; su `imageUrl` migra a `Category.imageUrl`. `OrderItem.menuItemCategory` ya es `String` (snapshot por ticket) → **inmune a la consolidación**.
- **Alternativa descartada**: mantener enum + tabla Category con FK. Duplica el dominio y no permite "crear 50 categorías" sin tocar código — el objetivo exacto que se desea eliminar.

### D2. Consolidación física SANDWICH + PANINI → SANDWICHES

- Migración: en `MenuItem` (y `MenuCategory` ne se usa más en tickets) `UPDATE ... SET category='SANDWICHES' WHERE category IN ('SANDWICH','PANINI')`. Los `OrderItem` históricos conservan sus valores.
- El seed crea una sola fila `SANDWICHES` (name "Sandwiches"). En el catálogo del POS, el pane `SANDWICHES` ya no requiere fusión: filtra directo `item.category === "SANDWICHES"`.
- **Alternativa descartada**: pane virtual sin consolidar. Mantiene SANDWICH/PANINI como claves de dato y complica la semántica (categoría "de dato" vs "de visualización"); el dueño eligió consolidar.

### D3. Seed idempotente de categorías

En `seed.ts` (o migration seed), con `upsert` por `key` para no pisar ediciones del admin:

| key | name | slug | iconName | color | visibleInBar |
|---|---|---|---|---|---|
| MILANESA | Milanesas | milanesas | UtensilsCrossed | #F59E0B | true |
| SANDWICHES | Sandwiches | sandwiches | Sandwich | #FBBF24 | true |
| HAMBURGUESA | Burgers | burgers | Hamburger | #FB923C | true |
| LOMO | Lomos | lomos | Beef | #D1D5DB | true |
| POLLO | Pollos | pollos | Bird | #F3F4F6 | true |
| ALITA | Alitas | alitas | Drumstick | #F87171 | true |
| ENSALADA | Ensaladas | ensaladas | Salad | #86EFAC | true |
| PIQUEO | Piqueos | piqueos | Popcorn | #FDBA74 | true |
| COMPARTIR | Compartir | compartir | Users | #7DD3FC | true |
| KIDS | Kids | kids | Baby | #A5B4FC | true |
| POSTRE | Heladería | heladeria | IceCreamCone | #F9A8D4 | true |
| WAFFLE | Wafles | wafles | CakeSlice | #FCD34D | true |
| PANCAKE | Pancakes | pancakes | Cake | #FDE68A | true |
| EXTRAS | Extras | extras | PackagePlus | #B0BEC5 | true |
| BEBIDA | Bebidas | bebidas | GlassWater | #67E8F9 | true |
| BUBAS | Bubbas | bubbas | CupSoda | #4ADE80 | true |
| ALMUERZO | Almuerzo | almuerzo | UtensilsCrossed | #CE7A22 | **false** |

Iconos de la whitelist `lucide-react` existente en `pos-category-bar.tsx` (se reutilizan los mismos componentes, ahora resueltos por `iconName`). `saveCategoryImage` pasa de validar contra `CATEGORY_KEYS` (hardcode) a validar contra `Category.key` en BD.

### D4. Server actions de categorías (apps/admin/app/actions/category.ts)

Convención del repo (`getRequiredSession` + rol ADMIN/SUPER_ADMIN + mensajes en español + redirect/revalidate en `/menu`):
- `listCategories()`, `createCategory()`, `updateCategory()`, `setCategoryActive()`, `reorderCategories(keys[])`.
- `reorderCategories` en `prisma.$transaction`, validando que `keys[]` contenga exactamente las categorías activas existentes (ninguna fecha/inventada): si falta o sobra una → error 409 sin cambios.
- `updateCategory` NO permite cambiar `key` si la categoría tiene `MenuItem` asociados (o siempre, salvo caso explicitado). El `key` se fija en el alta.
- Imagen: se reutilizan `saveCategoryImage`/`removeCategoryImage` (product-image.ts) cambiando `CATEGORY_KEYS`→BD y acceptando `key` de `Category`.

### D5. Orden y deriva de clientes (cajero/mesero)

- `getPosCatalog` (pos.ts) suma `categories: prisma.category.findMany({ where: { isActive: true, visibleInBar: true }, orderBy: { order: "asc" } })` y deja `categoryImages` como derivado de esa misma consulta (o elimina `categoryImages` y pasa `category.imageUrl` inline).
- En `pos-terminal.tsx` se reemplaza `MENU_PANE_ORDER`, `PANE_LABEL_SHORT`, `PANE_TITLE` y la fusión `SANDWICHES` por el array `catalog.categories`; BUBAS ya es una fila de la tabla y abre el builder (lógica `isBubas` existente se conserva). `PANE_ICON`/`PANE_ICON_COLOR` pasan a resolverse desde `iconName`/`color` con un mapa whitelist `Record<string, LucideIcon>` (componente); sin `any`.
- Mesero: itera `catalog.categories` activas (tabs de texto) en vez de `MenuCategoryList` y su filtrado actual; mismo orden, mismo comportamiento visible.

### D6. Reportes: etiqueta y orden desde la BD

- `CATEGORY_ORDER` (print-report.ts y api/reports/daily/route.ts) se sustituye por `category.findMany({ orderBy: { order: "asc" } })`, agrupando por `menuItemCategory` con **mapa de legado** `{ SANDWICH: "SANDWICHES", PANINI: "SANDWICHES" }` para tickets históricos pre-consolidación.
- El nombre mostrado = `Category.name` (ej. "Sandwiches"), no el `key`.

### D7. Frontend admin (menu-manager.tsx, pestaña Categorías)

- Se conserva el grid de tarjetas con imagen que ya existe y se agrega: formulario de alta/edición (nombre, slug auto, icono seleccionable de whitelist, color picker hex, visibleInBar toggle), toggle activar/desactivar, y **drag & drop con `@dnd-kit`** (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` a `apps/admin`).
- Al soltar un `arrayMove`, llama `reorderCategories(keys)`. Estados de error 409 renderizados como validación.

## Risks / Trade-offs

- **[Regresión en la barra del cajero]** — orden/visibilidad/labels cambian de fuente → Mitigación: seed reproduce exactamente el orden actual de `MENU_PANE_ORDER`+`CATEGORY_PANES` y los casos especiales pasan por scenario de prueba manual en dev (cajero: 5 columnas idle, 15+ panes). 
- **[Categoría desactivada con platos asignados]** — el editor de platos las oculta pero el `MenuItem` conserva el valor → Mitigación: lectura por `isActive` y desactivación vía toggle; la validación de `getPosCatalog` filtra y el plato no se ofrece; si se reactiva, reaparece.
- **[Reportes históricos SANDWICH/PANINI]** — sobreviven snacks en `OrderItem` → Mitigación: mapa de legado en D6, escenario cubierto en la spec reports.
- **[dev.db versionada + migración destructiva]** — reconstrucción de `MenuItem` (enum→TEXT) en SQL a mano → Mitigación: migración con `PRAGMA foreign_keys=off`, copia `CREATE TABLE` nuevo + mover datos + `rename` + `PRAGMA foreign_keys=on`; probar primero con `verify:*` tsx del paquete db y backend.
- **[`@dnd-kit` nuevo en admin]** — dependencia nueva en un monorepo de versiones fijadas → Tolerable: lib madura, uso acotado al reorder; versión compatible con React usado se fija en package.json de admin.
- **[Mesero fuera del 2-estados]** — el mesero mantiene tabs de texto (non-goal) → Aceptado; no cambia comportamiento externo, solo fuente de datos.

## Migration Plan

1. Escribir migración SQL manual `migrations/<ts>_make_categories_administrable/`: crear `Category`, `INSERT` seed de las 17 filas (con `imageUrl` desde `CategoryConfig` por key), consolidar `MenuItem.category` ('SANDWICH','PANINI'→'SANDWICHES'), reconstruir columna `MenuItem.category` a `TEXT` con índice, drop `CategoryConfig`, actualizar `schema.prisma` y `prisma generate` (matando node antes, AGENTS.md).
2. Migrar `packages/types` (borrar `MenuCategory`/`MenuCategoryLabel`/`MenuCategoryList`; `category` como `string` nominal `CategoryKey` o alias) y los consumidores.
3. Server actions + UI tab Categorías + DnD.
4. `getPosCatalog` + pos-terminal + pos-category-bar + mesero.
5. Reportes (D6).
6. `pnpm -r typecheck && pnpm -r lint`; pruebas manuales de barra (idle 5 cols, apertura/volver, imagen, categoria desactivada) y del cierre diario con tickets pre/post consolidación.
7. `verify:cuenta` / integridad y commit (rollback: `git revert` del commit de la migración + `prisma migrate` para desaplicarla; los datos de `MenuItem` se restauran desde la copia temporal que la migración deja en la misma transacción).

## Open Questions

- ¿Mantener `Category.slug` (para una futura pagina pública/menu del store) o diferirlo y quedarnos con key+name+orden por ahora? Afecta únicamente un campo del schema; puede diferirse, pero se incluye por mínimo costo.
- ¿OCR de iconos: exponer la whitelist completa de lucide o solo los 17 actuales? Se resuelve en tareas con la whitelist actual (no es decisión de spec).