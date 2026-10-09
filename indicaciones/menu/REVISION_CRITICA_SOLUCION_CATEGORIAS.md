# Revisión crítica: categorías administrables de BBSPOS

**Documentos contrastados**

- `SOLUCION_ADMIN_CATEGORIAS.md`: solución anterior con schema, endpoints, componentes y plan de integración.
- `SOLUCION_ARQUITECTO_CATEGORIAS.txt`: revisión arquitectónica del 09-10-2026 y decisiones específicas del monorepo.
- `INFORME_CATEGORIAS_MENU.txt`: auditoría original del sistema de categorías.

## Veredicto

La solución del arquitecto corrige varios supuestos importantes de la solución anterior y encaja mejor con BBSPOS. Recomiendo usarla como base de implementación, pero **no aplicarla literalmente sin resolver también el vacío de modelado de las categorías especiales** descrito en la sección 3.

La solución anterior sí cubre gran parte del CRUD, el reordenamiento, los campos de UI y el comportamiento de las tarjetas. Sin embargo, contiene instrucciones que contradicen el entorno real reportado por el arquitecto. Por tanto, no debe enviarse a OpenCode sin estas correcciones.

## 1. Errores de la solución anterior que deben corregirse

### 1.1 Migraciones: no usar `prisma migrate dev`

La solución anterior propone `prisma migrate dev --create-only`. El informe arquitectónico indica que BBSPOS usa migraciones SQL manuales y que `migrate dev` falla en este entorno. La migración debe escribirse/revisarse según las convenciones del repositorio y aplicarse con los scripts existentes; el arquitecto menciona `prisma migrate deploy` y `prisma generate` después de un backup y una prueba en una copia de la base.

No usar `prisma db push` contra la base de datos real. Tampoco copiar sin revisar un ejemplo genérico de reconstrucción de `MenuItem`: en SQLite deben conservarse todas las columnas, índices, restricciones, claves foráneas y dependencias reales de la tabla.

### 1.2 Autorización: `requireAdminApi` no está confirmado en el proyecto

La solución anterior muestra `requireAdminApi()` como guard ilustrativo. El arquitecto indica que la convención real del admin usa `getRequiredSession()` y verifica los roles `ADMIN` / `SUPER_ADMIN` en acciones existentes como `catalog.ts` y `product-image.ts`.

OpenCode debe inspeccionar esos archivos, reutilizar el mecanismo real de sesión y rol y adaptar los Route Handlers para que las llamadas no autorizadas reciban una respuesta apropiada. **No crear un guard ficticio, no dejar rutas abiertas y no eliminar la autorización para que compile.** Mantener las rutas API pedidas por el dueño (`GET /api/admin/categories` y `PUT /api/admin/categories/reorder`), además de las rutas necesarias para el CRUD y la imagen.

### 1.3 No crear un segundo sistema de imágenes

La solución anterior ya menciona reutilizar `saveCategoryImage`, pero propone un import/helper de ejemplo que puede no existir. El arquitecto confirma que ya existe un flujo en `apps/admin/app/actions/product-image.ts`, con Sharp, WebP 640×360 y almacenamiento en `apps/store/public/images/menu/`, además de `/api/menu-image`.

Reutilizar o extraer la operación de almacenamiento existente de manera segura. No crear `public/uploads/categories`, nuevos formatos, un resolver paralelo ni otra convención de URL. Migrar `CategoryConfig.imageUrl` a `Category.imageUrl` y conservar `CategoryConfig` hasta verificar las imágenes en todas las apps.

### 1.4 Selector: actualizar lo existente antes de duplicarlo

El selector de dos estados ya existe en `apps/cajero/components/pos/pos-category-bar.tsx`. No hay que reconstruir ese flujo en cajero: se deben sustituir sus arrays estáticos por las categorías consultadas desde la base. Para la vista del mesero (`/menu`), que actualmente tiene tabs de texto, sí tiene sentido implementar `CategorySelector.tsx` con el mismo comportamiento visual solicitado.

El componente nuevo no debe convertirse en una segunda fuente de verdad ni duplicar lógica de negocio distinta. Reutilizar el catálogo que ya se carga en `getPosCatalog()` y extender el payload para incluir categorías ordenadas.

### 1.5 Iconos: no resolver cualquier exportación dinámica de Lucide

La solución anterior convierte el módulo completo de `lucide-react` a un diccionario dinámico y contiene `Pizza`, que no corresponde al menú descrito. El arquitecto pide una lista permitida, iconos que existan realmente en la versión instalada y fallback `Utensils`, sin `any` ni resolución arbitraria.

Crear un mapa explícito `iconName -> componente Lucide` usando iconos comprobados en el repositorio. Validar `iconName` contra la misma lista permitida en el servidor. Un valor desconocido de la base debe mostrar el icono fallback, nunca romper el menú.

### 1.6 Color: no utilizar el color de categoría como fondo activo de toda la barra

La solución anterior colorea el fondo del botón activo con `category.color` y utiliza anillos naranja fijos. El informe arquitectónico advierte que el POS usa esmeralda para el estado activo. El color administrable de la categoría debe servir principalmente para el acento del icono; el estado activo debe respetar los tokens/estilos del POS existentes. No crear clases Tailwind dinámicas desde un valor de BD: guardar y validar siempre un hexadecimal `#RRGGBB`.

## 2. Decisiones recomendadas para implementar sin bloquearse

### 2.1 Mantener la identidad técnica `key`

`Category.key` es estable y corresponde al valor guardado en `MenuItem.category`. `slug` es identificador legible/editable y no debe utilizarse para relacionar platos. Editar un nombre o slug nunca debe modificar `key` ni reasignar platos históricos.

Cambiar `MenuItem.category` de enum a `String` conservando los valores actuales. No introducir una FK en esta primera migración si obliga a una reconstrucción riesgosa en SQLite; validar la clave en las operaciones de alta/edición de platos. Eliminar `MenuCategory` de `packages/types` y Prisma solamente cuando todos sus consumidores se hayan migrado y el typecheck/`rg` lo confirmen.

### 2.2 Resolver las categorías especiales de forma explícita

Se recomienda la opción A del arquitecto: **mantener `SANDWICH` y `PANINI` como valores de platos separados** para no perder la distinción histórica. La barra puede mostrar un agrupador visual `SANDWICHES`, que filtra ambos valores. No consolidar datos durante esta migración.

El informe del arquitecto descubre un hueco del schema propuesto: `visibleInBar` permite ocultar una categoría, pero por sí solo no distingue una categoría normal de una agrupación visual o de un botón que abre un builder. Si solo se agrega `visibleInBar`, la UI de alta de platos podría ofrecer por error `SANDWICHES` o `BUBAS` como una categoría normal.

Para evitarlo, recomiendo añadir un metadato técnico `kind` a `Category`, validado en el servidor y no editable libremente en el formulario:

```prisma
model Category {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  slug        String   @unique
  iconName    String   @default("Utensils")
  color       String   @default("#CE7A22")
  imageUrl    String?
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  visibleInBar Boolean @default(true)
  kind        String   @default("PRODUCT") // PRODUCT | GROUP | BUILDER | SYSTEM
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([order, isActive, visibleInBar])
}
```

`kind` se almacena como texto por simplicidad de validación/migración y sus valores se restringen en el código. No debe aceptar valores arbitrarios enviados desde el cliente. La interfaz puede etiquetar el tipo especial; no debe permitir convertir una categoría virtual en categoría de producto mediante un PATCH ordinario.

Seed inicial recomendado:

| `key` | `kind` | `visibleInBar` | Comportamiento |
|---|---|---:|---|
| `SANDWICHES` | `GROUP` | sí | Pane visual que muestra platos `SANDWICH` y `PANINI`; no es asignable a platos |
| `SANDWICH` | `PRODUCT` | no | Conserva el valor de categoría de los platos existentes |
| `PANINI` | `PRODUCT` | no | Conserva el valor de categoría de los platos existentes |
| `BUBAS` | `BUILDER` | sí | Abre el builder de bubble tea; no filtra platos normales |
| `ALMUERZO` | `SYSTEM` | no | Mantiene la lógica separada del menú del día |
| Otras categorías corrientes | `PRODUCT` | sí, salvo que el comportamiento actual indique otra cosa | Categorías administrables normales |

Las categorías `SANDWICH` y `PANINI` pueden seguir activas para preservar la clasificación y aparecer en el dropdown de categorías de producto. El dropdown debe incluir `kind === "PRODUCT" && isActive === true`; la navegación del menú debe mostrar solo `isActive && visibleInBar`.

Los comportamientos de `GROUP`, `BUILDER` y `SYSTEM` se conservan como reglas explícitas para las tres claves especiales; no fingir que esos comportamientos se vuelven genéricos por añadir `kind`.

### 2.3 Mantener `ALMUERZO` y `BUBAS`

- `ALMUERZO`: mantener la lógica del menú del día; no aparece en la barra compacta porque `visibleInBar=false`.
- `BUBAS`: se mantiene como acceso al builder y puede tener orden/icono/color administrados, pero no se trata como una lista normal de platos.
- `SANDWICHES`: fila visible y administrable para imagen, nombre, icono, color y orden; al seleccionarla, la lógica actual agrupa `SANDWICH` + `PANINI`.

Proteger las claves y el tipo técnico de estos registros especiales: modificar su nombre, imagen, icono, color, orden y estado no debe cambiar accidentalmente su semántica interna.

### 2.4 Ruta de administración

El dueño pidió explícitamente `/admin/categorias`, por lo que esa debe ser la URL final. Puede enlazarse desde el sidebar y, si conviene, también desde la navegación de `/admin/menu`; no sustituirla por una pestaña únicamente dentro de `MenuManager`.

### 2.5 Reordenamiento

Usar `PUT /api/admin/categories/reorder` con `{ "orderedIds": [...] }`. El arreglo debe incluir exactamente una vez cada ID que devuelve el listado administrativo, incluidas categorías inactivas e internas, dado que la tabla administra todas ellas. Validar duplicados, IDs inexistentes y listas incompletas. Persistir posiciones consecutivas mediante una transacción y responder `409` ante una lista desactualizada.

El orden del seed debe extraerse de los arrays reales antes de quitarlos, especialmente `MENU_PANE_ORDER`, `CATEGORY_PANES`, `CARTA_CATEGORIES`, `CAFETERIA_CATEGORIES` y `CATEGORY_ORDER`. La propuesta visible del arquitecto contiene 16 elementos de barra; sus posiciones consecutivas serían `0..15`, no `0..16`. Los elementos internos pueden ocupar posiciones posteriores sin alterar el orden relativo de los visibles.

## 3. Migración segura

1. Hacer una copia recuperable de `packages/db/prisma/dev.db` y seguir el flujo real de despliegue definido por el repositorio.
2. Agregar `Category` y cambiar `MenuItem.category` de enum a `String` en `schema.prisma`, preservando el índice `@@index([category, available])` y cualquier default real que corresponda.
3. Escribir y revisar manualmente el SQL de migración en el formato que ya usa `packages/db/prisma/migrations/`. Antes de reconstruir `MenuItem`, inspeccionar el schema completo y todas las relaciones, claves foráneas e índices que la referencien. No pegar literalmente un `CREATE TABLE MenuItem_new` incompleto.
4. Ejecutar la migración contra una copia de la base; utilizar los comandos existentes del repo. El informe recomienda aplicar migraciones revisadas con `prisma migrate deploy` y generar el cliente con el script real de `prisma generate`. No usar `prisma migrate dev` ni `db push` sobre la base real.
5. Insertar las filas iniciales con seed idempotente. Copiar `CategoryConfig.imageUrl` por `key` sin sobrescribir datos nuevos y sin eliminar aún `CategoryConfig`.
6. Comprobar cantidad total de platos, distribución por `MenuItem.category`, índices, relaciones y tickets históricos. Comparar las imágenes en admin/cajero/mesero usando `/api/menu-image`.
7. Solo después de verificar todas las apps, eliminar `CategoryConfig`, los enums y los arrays estáticos que hayan quedado sin uso.

## 4. Contrato de la solución final para OpenCode

Implementar estos endpoints en `apps/admin`:

- `GET /api/admin/categories`: devuelve activas e inactivas, con `kind`, `visibleInBar` y el resto de campos, ordenadas por `order ASC` y luego un desempate estable.
- `POST /api/admin/categories`: crea una categoría corriente (`kind=PRODUCT`, `visibleInBar=true`) a menos que sea una clave reservada; valida nombre, slug, icono permitido y color hexadecimal.
- `PATCH /api/admin/categories/:id`: modifica los campos editables sin aceptar `id`, `key` o `kind` desde el cliente.
- `DELETE /api/admin/categories/:id`: soft delete mediante `isActive=false`; no borrar físicamente registros usados.
- `PUT /api/admin/categories/reorder`: validación estricta y actualización transaccional de todas las posiciones.
- `PUT /api/admin/categories/:id/image`: validar JPG/PNG/WebP de hasta 5 MB y reutilizar el procesamiento actual con Sharp, WebP 640×360 y almacenamiento compartido.

La autorización de cada handler debe implementarse con el mecanismo real de sesión y roles de `apps/admin`; el nombre y la forma de los helpers se extraen del código existente, no se inventan. Los handlers deben retornar 401/403 según la convención del proyecto antes de leer/escribir datos.

La lectura del menú debe preferir el catálogo server-side o el payload de `getPosCatalog()` ampliado con categorías. Un `GET /api/categories` público solo es necesario si la arquitectura actual de `/menu` realmente exige un fetch HTTP público; no añadirlo por defecto si la app consulta Prisma en servidor.

## 5. Refactor que no se debe olvidar

- `apps/cajero/components/pos/pos-terminal.tsx`: sustituir `MENU_PANE_ORDER`, `PANE_LABEL_SHORT` y `PANE_TITLE` que sean reemplazables por datos de BD, conservando reglas especiales.
- `apps/cajero/components/pos/pos-category-bar.tsx`: mantener los dos estados actuales y leer las categorías del catálogo; usar mapa explícito de iconos y color desde hex.
- `apps/cajero/actions/pos.ts`: ampliar `getPosCatalog()` para incluir categorías activas en orden, con `kind` y `visibleInBar`; respetar el polling actual.
- `apps/admin/app/(dashboard)/menu/menu-manager.tsx`: reemplazar `CATEGORY_PANES`, `CARTA_CATEGORIES` y `CAFETERIA_CATEGORIES` cuando ya se pueda derivar la lista desde la base. Los dropdowns de platos deben listar solo `PRODUCT` activas.
- `apps/admin/app/actions/print-report.ts` y `apps/admin/app/api/reports/daily/route.ts`: reemplazar `CATEGORY_ORDER` por el orden de la BD, con fallback para claves históricas desconocidas.
- `apps/mesero/components/pos/pos-terminal.tsx`: dejar de depender de `MenuCategoryList`.
- `apps/admin/app/(dashboard)/menu/page.tsx`: consultar categorías dinámicas y preservar la imagen al migrar `CategoryConfig`.
- `packages/types/src/index.ts` y `schema.prisma`: retirar `MenuCategory` solo al final, después de comprobar que no queden referencias activas.

## 6. Criterios de aceptación

- Crear categorías desde `/admin/categorias` no exige tocar código ni recompilar.
- El slug puede cambiar sin alterar `key` ni los platos vinculados.
- El color se valida como hexadecimal y solo los iconos de la lista permitida se guardan.
- Las imágenes usan la ubicación, transformación y resolución existentes.
- Drag & drop actualiza y persiste el orden incluso tras recargar; si falla, el frontend revierte el cambio y muestra error.
- La vista inicial del menú muestra tarjetas grandes con imagen arriba e icono + nombre abajo. Tras seleccionar, aparece la barra compacta con activa expandida y botón Volver.
- El orden visible corresponde a `Category.order` y las categorías inactivas no aparecen en navegación.
- `SANDWICHES` filtra `SANDWICH` y `PANINI`; `BUBAS` abre su builder; `ALMUERZO` conserva el flujo del menú del día.
- Los pedidos y reportes históricos siguen legibles y todos los apps pasan typecheck/lint con sus comandos reales.

## Decisión final

Usar la propuesta del arquitecto como guía principal de integración al repo, conservar las rutas API pedidas por el dueño y aplicar las correcciones anteriores. La clave es que **la tabla `Category` se convierta en fuente de verdad sin perder los comportamientos especiales que hoy están codificados en el POS**.
