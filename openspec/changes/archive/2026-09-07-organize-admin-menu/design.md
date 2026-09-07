# Design: organize-admin-menu

## Context

La gestión del menú del admin vive en `apps/admin/app/(dashboard)/menu/menu-manager.tsx`: una lista única de platos (categoría `ALMUERZO` + 16 secciones de carta) más cinco tarjetas colapsables para el catálogo de bebidas (tamaños, sabores, tipos de boba, toppings y una matriz por categoría de sabor). No hay necesidad de cambios de backend: el modelo ya distingue `ALMUERZO` del resto (`MenuCategory`), y las terminales/tienda ya consumen el catálogo con `todayMenuItems()` + `cartaMenuItems()`. Ver proposal.md.

## Goals / Non-Goals

**Goals**

- Separar visual y funcionalmente almuerzos, platos a la carta y bubas en el admin.
- Que cada bloque de platos ajuste su alta a su sección y la edición permita mover platos.

**Non-Goals**

- Renombrar la pestaña/label "Bebidas" a "Bubas" en mesero, cajero o tienda (queda para un cambio futuro si se define así).
- Cambiar el modelo de categorías ni las reglas de distribución del catálogo a terminales/tienda.
- Modificar la tienda pública ni el flujo de consumo de las terminales.

## Decisions

### D1. Dos bloques de platos con altas dedicadas

`PlatosGroup` es un componente reutilizable que renderiza un formulario de alta + listado + acciones, parametrizado por bloque. El bloque **Almuerzos** fija `category = ALMUERZO` (sin selector de sección) y conserva el botón "Agregar/Quitar del día" (exclusivo de `ALMUERZO`). El bloque **Platos a la carta** muestra un selector con `MenuCategoryList` (que ya excluye `ALMUERZO`) y no ofrece el botón del Menú del Día. Estados de formulario separados: `almuerzoForm` y `cartaForm`. *Alternativa descartada*: un solo formulario con toggle — confundiría el alta y obliga a mantener categoría "ALMUERZO" seleccionable.

### D2. Edición compartida puede mover platos entre secciones

El diálogo de edición (ya existente) lista todas las secciones: `ALMUERZO` + `MenuCategoryList`, de modo que un plato puede trasladarse entre bloques. Al moverse de `ALMUERZO` a una sección de carta pierde la operación de Menú del Día y viceversa, acorde a las reglas vigentes (`lunch-menu`).

### D3. Bloque Bubas con sub-secciones colapsables

`SubSection` replica el mecanismo de acordeón de `CollapsibleCard` (grid-rows 1fr/0fr) sin anidar `Card`s, para evitar doble borde. Dentro del bloque **Bubas** se agrupan: Tamaños de vaso, Sabores, Tipos de boba, Toppings y la matriz de precios por cada categoría de sabor (Con leche / Con agua / Especiales). Sin cambios en las acciones del catálogo (`app/actions/catalog.ts`).

## Risks / Trade-offs

- [Platos en el bloque equivocado por la separación] → El traspaso es posible vía edición; la UI la guía con textos de sección por bloque.
- [Sub-secciones anidadas añaden un nivel de clic] → Todas abren por defecto dentro del bloque Bubas, así que el contenido es visible de inmediato.

## Migration Plan

No aplica: sin cambios de esquema ni de datos. Es una reorganización de UI del admin únicamente.

## Open Questions

- Ninguna pendiente que afecte specs o tareas.