## Context

El sistema cataloga platillos en `MenuItem` (sección/categoría, precio fijo, `enMenuDelDia`) y terminales POS que hoy solo ofrecen Almuerzos. La carta se obtiene de `indicaciones/menu_bibosi.txt` (86 platillos con descripción, algunos con variante Pollo/Res). Ver proposal.md — Why. Los cambios afectan el esquema SQLite único `dev.db`, los tipos compartidos de `@bbspos/types`, los apps `admin`/`cajero`/`mesero`/`store` y los reportes.

## Goals / Non-Goals

**Goals:**
- Soporte de carta fija y variantes de precio con el menor costo de invasión sobre el esquema y los flujos existentes.
- Una sola fuente para el catálogo POS (cajero y mesero) vía el mismo endpoint que hoy entrega almuerzos.
- Cargas idempotentes desde los textos fuente para reconstruir catálogo y carta.

**Non-Goals:**
- No crear una vista de catálogo nueva en `store` (solo se expone la carta en su API).
- No recetas (composiciones), combos ni búsqueda.
- No cambiar el flujo de pagos ni de comandas más allá de añadir la variante a la línea.

## Decisions

- **Modelo de variantes con `MenuItemOption`** en lugar de "precio por combinación": cada variante es un `(name, price, sortOrder)` con `@@unique([menuItemId, name])` y `onDelete: Cascade`. Alternativa descartada: duplicar `MenuItem` por variante (rompe el agrupado y el listado de pedidos). Decisión: `MenuItem.price` sigue existiendo y para platos con variantes vale el mínimo de sus precios (carga en catálogo); el carrito cobra `option.price` cuando hay variante elegida.
- **Proveer la carta en el mismo `getPosCatalog`/`getCatalog`** como `catalog.cartaItems` por categoría (keyed por `firstCartaCategory`), junto a sus variantes mapeadas a `MenuItemOptionView`. Evita un endpoint y una ronda de carga nuevos y mantiene al cajero y mesero idénticos.
- **Id de carrito único por variante**: `menu-item-${menuItemId}-${optionName ?? ""}` para que cada variante sea su propia línea; la suma del mismo plato con distinta variante produce líneas separadas. Se persistió `optionName` en `OrderItem.menuItemOptionName` y en el item serializado del carrito (`normalizeStoredItem` con default `null` por compatibilidad con carritos viejos de localStorage).
- **Selector de variante en la terminal**: estado local `variantItem` + diálogo que exige elegir opción antes de confirmar; platos sin variantes se agregan de un toque como los almuerzos. Alternativa descartada: deep-link por toque largo o menú desplegable (menos descubrible en táctil).
- **`MenuCategory` como enum ampliado** (ALMUERZO + 16 categorías de carta) con `MenuCategoryLabel`/`MenuCategoryList` en español, reutilizando el patrón existente de `FlavorCategory`. El badge "Del Día" del admin se limita a `ALMUERZO` (la bandera solo aplica a almuerzos).
- **Reportes por categoría de menú**: el cierre diario agrupa por `flavorCategory ?? menuItemCategory` (las bebidas `OrderItem` no tienen `menuItemCategory`), con `CATEGORY_LABELS` = `FlavorCategoryLabel` ∪ `MenuCategoryLabel` y un `CATEGORY_ORDER` fijo que incluye `MenuCategoryList`.
- **Seed de la carta con lectura del fuente**: `seed-carta.ts` parsea `../../indicaciones/menu_bibosi.txt` (ids `num`), ignora gaseosas sin precio y agrega 4 Extras fijos; idempotente vía upsert por nombre+categoría y `deleteMany({menuItemCategory: notIn([ALMUERZO])})` antes de recrear. Migración `20260906233019_add_carta_la_carta` aplicada en el `dev.db` compartido; se corrió tras detener los dev servers para desbloquear `prisma generate`.

## Risks / Trade-offs

- [Precio de exhibición = mínimo de variantes] → El admin debe mantener `MenuItem.price` coherente; el mapper lo recalcula al servir el catálogo, no confiando en el valor persistido.
- [Carta hardcodeada desde el seed] → Si cambia el fuente, hay que re-ejecutar el seed; aceptado porque la carta es fija y el seed es idempotente.
- [LocalStorage de carritos viejos sin `optionName`] → `normalizeStoredItem` sane los ítems al restaurar (default `null`).
- [`prisma generate` bloqueado por DLLs de dev servers] → Operación se corrió con los servidores detenidos y se reiniciaron luego.

## Migration Plan

- Migración Prisma `20260906233019_add_carta_la_carta`: crea `MenuItemOption`, añade `MenuItem.description`, `OrderItem.menuItemOptionName`, y (vía enum) las 16 categorías de carta; se aplicó a `dev.db` con `prisma db push`/migrate y el cliente se regeneró (v6.19.3).
- Rollback: revertir la migración y volver a sembrar el catálogo viejo (`seed-old-catalog.ts`); las líneas de pedido nuevas con `menuItemOptionName` no rompen los reportes (se ignora la columna si se revierte con cuidado).

## Open Questions

- Ninguna.