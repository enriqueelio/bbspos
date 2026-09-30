# Proposal

## Why

Cinco archivos de UI superan las 950 líneas y dos superan las 1.400:

| Archivo | Líneas | Problema |
|---|:---:|---|
| `apps/admin/app/(dashboard)/menu/menu-manager.tsx` | 2226 | `MenuManager` = 1541 líneas con **29 `useState`** y 0 `useMemo` |
| `apps/cajero/components/queue-view.tsx` | 1665 | 22 piezas ya bien cortadas, pegadas en un archivo. `OrderCard` = 522 líneas |
| `apps/admin/app/(dashboard)/reports/reports-client.tsx` | 1415 | 15 piezas pegadas. El shell `ReportsClient` = 477 líneas |
| `apps/cajero/components/pos/pos-terminal.tsx` | 1024 | Lógica de builder/cart con equivalente parcial en mesero (957) |
| `apps/mesero/components/pos/pos-terminal.tsx` | 957 | Ídem |

El tamaño es el síntoma, no el diagnóstico. Hay dos causas distintas:

1. **Fusión de archivos con costuras ya correctas.** `queue-view.tsx` y `reports-client.tsx` ya contienen 15-22 componentes y hooks correctamente delimitados; simplemente viven en el mismo archivo. Partirlos es mecánico y sin riesgo.
2. **Un componente con demasiadas responsabilidades.** `MenuManager` mezcla **8 dominios CRUD independientes** (tamaños, sabores, bobas, toppings, carta, bebidas, cafetería, salsas) bajo un `useState` compartido, pese a que la barra de pestañas (`MENU_TABS`) ya existe y presenta cada dominio como una sección separada. Esta es la parte realmente peligrosa.

A eso se suma que nada impide el re-crecimiento: ESLint solo extiende `next/core-web-vitals` en 8 `.eslintrc.cjs` sueltos (sin `max-lines`) y **el repositorio no tiene suite de tests ni runner**. El riesgo ya es concreto, no teórico: editar el formulario de sabores en `MenuManager` obliga a mantener el estado de 8 dominios en un solo scope, y el ciclo de vida de `useQueueClock` (98 líneas, 10 `useEffect`) no es verificable sin abrir la app y esperar.

## What Changes

Refactorización **sin cambio de comportamiento observable**. El POS y el Admin deben seguir funcionando igual antes y después; la diferencia es dónde vive el código.

- **F1 — Costuras (movimiento puro).** Partir `queue-view.tsx` y `reports-client.tsx` en directorios `queue/`, `views/`, `components/`, respetando las delimitaciones que ya existen. Solo cambia `git mv` + imports.
- **F2 — Romper `MenuManager`.** Un panel por pestaña (`almuerzos`, `carta`, `bebidas`, `cafeteria`, `bubas`, `salsas`), cada uno con su propio estado y su propio módulo. `menu-manager.tsx` queda como shell de pestañas. Efecto colateral positivo: cambiar de pestaña deja de re-renderizar los formularios de las otras seis.
- **F3 — Estado extraído a hooks.** `useQueueClock` y el bloque de fetching de reportes salen a módulos propios. Son lógica pura y son el primer material testeable del repositorio.
- **F4 — Piezas POS compartidas.** Llevar `flavor-picker` / `size-selector` / `boba-picker` / carrito a `packages/ui`, que ya tiene `components/builder/` y `components/cart/` pero hoy casi no lo consumen los terminales.
- **F5 — Guardrails.** `max-lines` y `max-lines-per-function` en ESLint (primero `warn`, `error` al terminar) + Vitest con tests sobre la lógica ya extraída.

El orden importa y está justificado en `design.md`: F1 y F3 son reversibles por construcción; F2 es el único que altera estructura de render y por eso exige verificación manual en pantalla.

## Capabilities

### New Capabilities

- `code-organization`: límites de módulo, ubicación del estado de UI, guardrails de tamaño y red de seguridad mínima para los componentes cliente.

### Modified Capabilities

- (ninguna) — es el punto central de la propuesta: **ninguna capacidad de negocio cambia**. No se toca `pos-terminal`, `cashier`, `ordering`, `reports`, `drink-catalog` ni `lunch-menu`, porque la Conducta Especificada no cambia. Si alguna de esas specs necesitara un cambio, es señal de que el refactor se salió de alcance.

## Impact

- **Comportamiento de negocio:** ninguno. Cero cambios en `schema.prisma`, cero migraciones, cero cambios en server actions.
- **UI:** sin cambios visuales previstos. El único cambio de comportamiento perceptible (F2) es una mejora de renders: las pestañas no activas dejan de re-renderizar.
- **Archivos:** se mueven piezas a directorios nuevos en `apps/cajero/components/queue/`, `apps/admin/app/(dashboard)/reports/views/` y `apps/admin/app/(dashboard)/menu/panels/`. Se borran 3 archivos monolíticos y se crean ~30 módulos.
- **Riesgo principal:** regresión visual. `typecheck` y `lint` no detectan un componente que deja de renderizar. Por eso cada fase termina con verificación manual en pantalla y el plan evita reescribir lógica durante el movimiento.
- **Dependencias:** se añade Vitest (+ `@testing-library` si se prueba algo de DOM). No se añade state manager ni librería de UI nueva.
- **Previo requerido:** la verificación manual de `docs/VERIFICACION-MANUAL-CAJAERO-ADMIN.md`, que además de servir de checklist sirve de línea base funcional para comparar antes y después.
