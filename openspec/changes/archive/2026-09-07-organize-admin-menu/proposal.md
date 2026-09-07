# Proposal: organize-admin-menu

## Why

La sección Menú del admin mezcla en una sola vista la gestión de platos (almuerzos y carta) con todos los componentes del catálogo de bebidas (tamaños, sabores, bobas, toppings y matrices de precios). Con la carta a la carta ya conviviendo con los almuerzos, se pierde la distinción clara entre lo que es el Menú del Día, lo que es la carta fija y lo que es el negocio original de las bubas. Se reorganiza la gestión del menú para separar tres bloques: **Almuerzos**, **Platos a la carta** y **Bubas**.

## What Changes

- Los platos se separan en dos bloques: **Almuerzos** (sección `ALMUERZO`, donde opera la bandera del Menú del Día) y **Platos a la carta** (secciones fijas distintas de `ALMUERZO`), cada uno con su formulario de alta y su listado.
- El alta del bloque de almuerzos crea platos en la sección `ALMUERZO` sin selector de sección.
- El alta del bloque de carta permite elegir únicamente entre las secciones de la carta.
- La edición de un plato permite moverlo entre almuerzos y carta.
- Todos los componentes del catálogo de bebidas (tamaños de vaso, sabores, tipos de boba, toppings y matrices de precios) se agrupan dentro de un bloque único **Bubas** con sub-secciones colapsables.
- Sin cambios en terminales ni tienda: la presentación de consumo (Almuerzos / Carta / Bebidas) permanece igual.

## Capabilities

### New Capabilities

- `menu-organization`: Organización de la gestión del menú del admin en tres secciones — Almuerzos, Platos a la carta y Bubas.

### Modified Capabilities

- `lunch-menu`: El requisito "Gestión de platos con sección y precio fijo" se extiende para exigir bloques separados de almuerzos y carta en el admin, altas con la sección fijada según el bloque y edición que permite mover platos entre secciones.
- `drink-catalog`: El requisito "Acceso al catálogo" se extiende para exigir que los componentes del catálogo de bebidas se agrupen en la sección Bubas del admin.

## Impact

- **apps/admin**: `app/(dashboard)/menu/menu-manager.tsx` se reorganiza en bloques Almuerzos / Platos a la carta / Bubas; `page.tsx` sin cambios.
- **packages/db**: sin cambios (no requiere migración).
- **packages/types**: sin cambios.
- **apps/mesero / apps/cajero / apps/store**: sin cambios.