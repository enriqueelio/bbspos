# Solución completa: categorías administrables para BBSPOS

**Objetivo:** convertir las categorías del POS en datos administrables desde `apps/admin`, mantener la compatibilidad con los platos existentes y hacer que la vista `/menu` del mozo/cliente use la misma fuente de verdad.

**Base del diseño:** `INFORME_CATEGORIAS_MENU.txt` (auditoría del 09-10-2026). El proyecto es un monorepo `pnpm`, Next.js App Router y Prisma/SQLite. Actualmente las categorías salen del enum `MenuCategory`, las imágenes viven parcialmente en `CategoryConfig`, y existen arrays de orden/iconos duplicados en cajero, admin y mesero.

> **Instrucción para OpenCode:** inspecciona el repositorio real antes de aplicar los bloques. Conserva las convenciones existentes de Prisma, autenticación, alias de imports, subida/servido de imágenes y scripts. Cuando un import de ejemplo no coincida con el repositorio, reemplázalo por el helper existente equivalente; nunca elimines el control de acceso para hacer compilar una ruta. No borres los arrays antiguos hasta que todos sus consumidores hayan sido migrados y verificados.

---

## 1. Decisiones de arquitectura

1. **Una sola fuente de verdad:** tabla Prisma `Category`. Admin obtiene todas (activas e inactivas); el menú público obtiene solo activas y ordenadas por `order ASC`.
2. **Identidad estable:** `key` es la clave técnica estable que relaciona una categoría con `MenuItem.category`. `slug` es el slug visible/URL y puede editarse sin reasignar platos. Por ejemplo, `key: "MILANESA"`, `slug: "milanesas"`.
3. **Categorías ilimitadas:** `MenuItem.category` deja de ser enum y pasa a `String`. Conserva los valores de los platos actuales. No se añade una FK durante esta migración inicial para reducir riesgo con SQLite y permitir una transición gradual; las APIs/product editors deben validar las claves contra `Category`. Una FK se puede incorporar después de migrar todos los consumidores.
4. **No borrar físicamente categorías usadas:** `DELETE /api/admin/categories/:id` es un borrado lógico (`isActive=false`). Se conservan las claves y los pedidos históricos. La UI también ofrece activar/desactivar.
5. **Orden persistido:** drag & drop cambia el estado optimista del componente y envía el arreglo completo de IDs a `PUT /api/admin/categories/reorder`. El endpoint valida el arreglo y escribe todos los órdenes en una transacción.
6. **Dos estados del selector:** no hay que rediseñar el flujo de cero; el informe indica que ya existe en cajero. Se extrae/generaliza para `/menu`: grid de tarjetas grandes sin selección; barra horizontal compacta al seleccionar una categoría, con la categoría activa expandida y botón Volver.
7. **Imágenes:** mantener el flujo actual basado en `sharp`, WebP 640×360, `apps/store/public/images/menu/` y el endpoint/helper actual que sirve imágenes compartidas. La URL guardada será `/images/menu/<archivo>.webp`; cada app debe usar el mismo resolver que hoy transforma `/images/menu/` en `/api/menu-image/`, donde corresponda.
8. **Iconos seguros:** guardar el nombre de un icono Lucide en `iconName`, no JSX ni HTML. La UI usa una lista permitida de nombres y un icono fallback si un dato legado no existe en la versión instalada de `lucide-react`.

### Endpoints

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/api/admin/categories` | Todas las categorías para el administrador, incluidas inactivas |
| POST | `/api/admin/categories` | Crear categoría |
| PATCH | `/api/admin/categories/:id` | Editar nombre, slug, icono, color o estado |
| DELETE | `/api/admin/categories/:id` | Desactivar lógicamente |
| PUT | `/api/admin/categories/reorder` | Guardar el orden drag & drop |
| PUT | `/api/admin/categories/:id/image` | Subir/actualizar imagen de categoría |
| GET | `/api/categories` | Lectura pública: solo categorías activas, ordenadas |

`/api/admin/*` debe protegerse con la autenticación y autorización de administrador que ya use `apps/admin`. `/api/categories` es únicamente de lectura y no devuelve datos sensibles.

---

## 2. Prisma schema

Archivo: `packages/db/prisma/schema.prisma`.

### 2.1 Modelo nuevo

Añade este modelo. Si los nombres `createdAt`/`updatedAt` o el formato de IDs del repositorio difieren, utiliza la convención existente sin cambiar el contrato de la API.

```prisma
model Category {
  id        String   @id @default(cuid())
  key       String   @unique // clave técnica estable: MILANESA, BEBIDA, CATEGORIA_NUEVA...
  name      String
  slug      String   @unique
  iconName  String   @default("Utensils")
  imageUrl  String?
  color     String   @default("#ce7a22") // guardar hex, por ejemplo #CE7A22
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([order, isActive])
}
```

### 2.2 Cambio en `MenuItem`

En el modelo `MenuItem`, cambia **solo** el tipo del campo existente `category`; conserva el nombre y el índice actual. El valor que guarda seguirá siendo `Category.key`.

```prisma
// Antes: category MenuCategory
category String

// Mantener el índice existente (ajustar si el schema real tiene otra forma):
@@index([category, available])
```

El enum `MenuCategory` puede permanecer temporalmente en `schema.prisma` mientras se terminan de quitar las referencias TypeScript. Elimínalo del schema y de `packages/types/src/index.ts` únicamente cuando `rg "MenuCategory|MenuCategoryList|MenuCategoryLabel"` y el typecheck confirmen que ya no quedan consumidores activos.

### 2.3 `CategoryConfig`

No elimines `CategoryConfig` en la primera migración. Sus `imageUrl` deben copiarse a `Category.imageUrl`. Mantén el modelo hasta que la migración de datos y la verificación visual estén completas; después se puede retirar en una migración separada.

---

## 3. Migración SQLite y carga inicial

**No ejecutar una migración destructiva ni usar `prisma db push` sobre la base real.** Hacer backup de SQLite y generar una migración revisable.

1. Añadir `Category` y cambiar `MenuItem.category` de enum a `String` en el schema.
2. Ejecutar la herramienta desde el workspace/paquete DB siguiendo los scripts reales del monorepo, con `prisma migrate dev --create-only`. Revisar el SQL generado porque SQLite puede reconstruir la tabla `MenuItem` al cambiar el tipo. Confirmar que todos los valores actuales se preserven.
3. Añadir al SQL de migración el alta inicial de categorías **antes de activar cualquier validación de aplicación**. La lista de claves debe incluir todos los valores actuales del enum (`ALMUERZO`, `SANDWICH`, `PANINI`, `ENSALADA`, `PIQUEO`, `COMPARTIR`, `ALITA`, `HAMBURGUESA`, `MILANESA`, `LOMO`, `POLLO`, `KIDS`, `POSTRE`, `WAFFLE`, `PANCAKE`, `EXTRAS`, `BEBIDA`) y las pseudo-categorías existentes que realmente se usan (`BUBAS`, `SANDWICHES`).
4. **Preservar el orden vigente:** extraer el orden exacto de `MENU_PANE_ORDER`, `CATEGORY_PANES`, `CARTA_CATEGORIES`, `CAFETERIA_CATEGORIES` y `CATEGORY_ORDER` antes de eliminar esos arrays. No tomar el orden del enum como sustituto silencioso. Definir una tabla de mapeo explícita para categorías especiales: el informe indica que `ALMUERZO` es el menú del día y que `SANDWICH` + `PANINI` se fusionan como `SANDWICHES` en algunas pantallas, pero no en todas. Antes de fusionar datos, confirmar si se desea mantener la separación histórica. En ausencia de una regla inequívoca, conservar `SANDWICH` y `PANINI` por separado y no activar una segunda categoría visual duplicada sin una decisión explícita.
5. Copiar `CategoryConfig.imageUrl` por clave: por cada registro legado, actualizar la categoría que tenga el mismo `key`. No sobreescribir una imagen nueva si la categoría ya existe con una URL no vacía.
6. Crear un script idempotente de seed/bootstrap, preferiblemente en el paquete de DB, que haga `upsert` por `key`, copie imágenes y no duplique registros. El seed puede ejecutarse de nuevo sin cambiar orden/estado si una categoría ya fue editada desde el panel.
7. Ejecutar la migración primero en una copia de la base. Verificar cantidad de `MenuItem`, cantidades por valor de `category`, imágenes migradas y pedidos históricos antes de promoverla.

### Reglas para el seed inicial

- `key`: conservar exactamente las claves existentes en `MenuItem.category`. Para una categoría nueva, generarlo una sola vez desde el `slug` (`milanesas` → `MILANESAS`; si colisiona, añadir sufijo numérico). Nunca recalcular `key` cuando se edite el nombre o slug.
- `slug`: minúsculas, sin tildes, con guiones (`postres-y-helados`).
- `name`: extraer la etiqueta que corresponde al negocio de la UI actual; no traducir ni fusionar nombres sin validar los arrays actuales.
- `iconName` y `color`: usar valores existentes de `PANE_ICON`/`PANE_ICON_COLOR` cuando existan; establecer un fallback válido para los que no tengan.
- `imageUrl`: migrar `CategoryConfig.imageUrl`.
- `isActive`: decidirlo según la visibilidad real actual, preservando comportamientos especiales como `ALMUERZO` y las categorías fusionadas.
- `order`: capturar el orden real de la barra principal vigente, y después añadir las categorías restantes con órdenes consecutivos, sin repetir posiciones.

---

## 4. Helpers compartidos y validación

Los ejemplos de rutas de abajo usan estos imports ilustrativos:

```ts
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
```

OpenCode debe sustituirlos por los imports/helpers reales que ya use el admin. El contrato necesario de `requireAdminApi()` es: devolver `null` si el usuario tiene permiso de administrador o devolver una `Response` de error (401/403) que la ruta retorna inmediatamente. **No implementar una función que permita el acceso a todos.**

Crea `apps/admin/lib/category-validation.ts`:

```ts
export type CategoryWriteInput = {
  name: string;
  slug: string;
  iconName: string;
  color: string;
  isActive?: boolean;
};

export function slugifyCategory(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToKey(slug: string): string {
  return slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function validateCategoryWrite(value: unknown, partial = false): {
  data?: Partial<CategoryWriteInput>;
  error?: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "El cuerpo debe ser un objeto JSON." };
  }

  const body = value as Record<string, unknown>;
  const data: Partial<CategoryWriteInput> = {};

  if (!partial || "name" in body) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) {
      return { error: "El nombre es obligatorio y debe tener hasta 80 caracteres." };
    }
    data.name = body.name.trim();
  }

  if (!partial || "slug" in body) {
    if (typeof body.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)) {
      return { error: "El slug debe usar minúsculas, números y guiones; no puede empezar/terminar con guion." };
    }
    if (body.slug.length > 100) return { error: "El slug es demasiado largo." };
    data.slug = body.slug;
  }

  if (!partial || "iconName" in body) {
    if (typeof body.iconName !== "string" || !/^[A-Za-z][A-Za-z0-9]{0,60}$/.test(body.iconName)) {
      return { error: "El icono debe ser un nombre de Lucide válido." };
    }
    data.iconName = body.iconName;
  }

  if (!partial || "color" in body) {
    if (typeof body.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(body.color)) {
      return { error: "El color debe ser hexadecimal, por ejemplo #CE7A22." };
    }
    data.color = body.color.toUpperCase();
  }

  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") return { error: "isActive debe ser booleano." };
    data.isActive = body.isActive;
  }

  return { data };
}
```

---

## 5. API de administrador

### 5.1 `GET` y `POST /api/admin/categories`

Archivo: `apps/admin/app/api/admin/categories/route.ts`.

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ajustar al export real del paquete DB
import { requireAdminApi } from "@/lib/auth/require-admin"; // usar el guard real
import { slugToKey, validateCategoryWrite } from "@/lib/category-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const validated = validateCategoryWrite(body);
  if (validated.error || !validated.data) {
    return NextResponse.json({ error: validated.error ?? "Datos inválidos." }, { status: 400 });
  }

  const { name, slug, iconName, color, isActive } = validated.data as {
    name: string; slug: string; iconName: string; color: string; isActive?: boolean;
  };

  const baseKey = slugToKey(slug);
  if (!baseKey) return NextResponse.json({ error: "No se pudo generar la clave de la categoría." }, { status: 400 });

  const duplicateSlug = await prisma.category.findUnique({ where: { slug } });
  if (duplicateSlug) {
    return NextResponse.json({ error: "Ya existe una categoría con ese slug." }, { status: 409 });
  }

  // key solo se crea una vez; nunca depende de futuras ediciones del slug.
  let key = baseKey;
  let suffix = 2;
  while (await prisma.category.findUnique({ where: { key } })) {
    key = `${baseKey}_${suffix++}`;
  }

  try {
    const order = await prisma.category.count();
    const category = await prisma.category.create({
      data: {
        key,
        name,
        slug,
        iconName,
        color,
        isActive: isActive ?? true,
        order,
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    // Prisma P2002 = unique constraint. Cubre una posible colisión concurrente.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "La clave o el slug ya existe. Actualiza la lista e inténtalo otra vez." }, { status: 409 });
    }
    console.error("POST /api/admin/categories", error);
    return NextResponse.json({ error: "No se pudo crear la categoría." }, { status: 500 });
  }
}
```

### 5.2 `PATCH` y `DELETE /api/admin/categories/:id`

Archivo: `apps/admin/app/api/admin/categories/[id]/route.ts`.

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ajustar al export real
import { requireAdminApi } from "@/lib/auth/require-admin"; // guard existente
import { validateCategoryWrite } from "@/lib/category-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const validated = validateCategoryWrite(body, true);
  if (validated.error || !validated.data || Object.keys(validated.data).length === 0) {
    return NextResponse.json({ error: validated.error ?? "No hay cambios para guardar." }, { status: 400 });
  }

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });

  if (validated.data.slug && validated.data.slug !== current.slug) {
    const duplicate = await prisma.category.findUnique({ where: { slug: validated.data.slug } });
    if (duplicate) return NextResponse.json({ error: "Ya existe una categoría con ese slug." }, { status: 409 });
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: validated.data,
    });
    return NextResponse.json({ category });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "El slug ya existe." }, { status: 409 });
    }
    console.error("PATCH /api/admin/categories/[id]", error);
    return NextResponse.json({ error: "No se pudo actualizar la categoría." }, { status: 500 });
  }
}

// DELETE es intencionalmente un borrado lógico para proteger productos/pedidos históricos.
export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await context.params;

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });

  const category = await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ category, message: "Categoría desactivada; no se borraron sus datos históricos." });
}
```

> En versiones de Next.js cuyo `params` de Route Handler no sea una promesa, ajustar el tipo a la convención exacta del proyecto. La versión instalada en el repo manda.

### 5.3 `PUT /api/admin/categories/reorder`

Archivo: `apps/admin/app/api/admin/categories/reorder/route.ts`.

El body es `{ "orderedIds": ["id-1", "id-2", "id-3"] }`. Se usan IDs inmutables, no slugs editables.

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ajustar al export real
import { requireAdminApi } from "@/lib/auth/require-admin"; // guard existente

export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const orderedIds = (body as { orderedIds?: unknown } | null)?.orderedIds;
  if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === "string" && id.length > 0)) {
    return NextResponse.json({ error: "orderedIds debe ser un arreglo de IDs." }, { status: 400 });
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    return NextResponse.json({ error: "El arreglo contiene IDs duplicados." }, { status: 400 });
  }

  const existing = await prisma.category.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((category) => category.id));
  if (orderedIds.length !== existing.length || orderedIds.some((id) => !existingIds.has(id))) {
    return NextResponse.json(
      { error: "La lista está desactualizada o no incluye todas las categorías. Recarga y vuelve a ordenar." },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction(
      orderedIds.map((id, order) => prisma.category.update({ where: { id }, data: { order } })),
    );
    return NextResponse.json({ ok: true, orderedIds });
  } catch (error) {
    console.error("PUT /api/admin/categories/reorder", error);
    return NextResponse.json({ error: "No se pudo guardar el orden." }, { status: 500 });
  }
}
```

### 5.4 Subida de imagen `PUT /api/admin/categories/:id/image`

Archivo: `apps/admin/app/api/admin/categories/[id]/image/route.ts`.

**Importante:** el informe confirma que ya hay una función `saveCategoryImage` en `apps/admin/app/actions/product-image.ts`, basada en Sharp, que genera WebP 640×360 y guarda en `apps/store/public/images/menu/`. OpenCode debe reutilizar/externalizar esa implementación y la lógica existente de servir `/api/menu-image/`, en vez de crear un segundo formato de imagen. El siguiente es el contrato de la ruta; conectar `saveCategoryImage` usando su firma real luego de inspeccionar el archivo existente.

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ajustar al export real
import { requireAdminApi } from "@/lib/auth/require-admin"; // guard existente
// Importar el helper real reusado/refactorizado desde product-image.ts.
import { saveCategoryImage } from "@/lib/category-images";

type RouteContext = { params: Promise<{ id: string }> };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function PUT(request: Request, context: RouteContext) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await context.params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato no válido. Usa JPG, PNG o WebP." }, { status: 415 });
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "La imagen debe pesar como máximo 5 MB." }, { status: 413 });
  }

  try {
    // El helper debe validar/decodificar la imagen, rotarla según EXIF, recortar a 640x360,
    // convertir a WebP y guardar category-<key>.webp dentro del directorio compartido existente.
    const imageUrl = await saveCategoryImage({ key: category.key, file });
    const updated = await prisma.category.update({ where: { id }, data: { imageUrl } });
    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error("PUT /api/admin/categories/[id]/image", error);
    return NextResponse.json({ error: "No se pudo procesar o guardar la imagen." }, { status: 500 });
  }
}
```

Si `saveCategoryImage` hoy está acoplada a una Server Action, extrae su operación de almacenamiento a un helper server-only reutilizable y haz que tanto la action actual como este endpoint lo llamen. No importar una Server Action como si fuera una utilidad genérica sin revisar su implementación. `imageUrl` debe conservar el formato que consumen las rutas actuales; no crear una segunda convención de nombres.

### 5.5 Lectura pública `GET /api/categories`

Este endpoint lo debe implementar la app que sirve `/menu` (o ubicarlo en el paquete/router compartido si ya existe una API central). No llames a `/api/admin/categories` desde mozo/cliente porque ese endpoint requiere autorización.

Archivo sugerido: `apps/mesero/app/api/categories/route.ts` (ajustar a la app real que expone `/menu`).

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ajustar a la DB compartida

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, key: true, name: true, slug: true, iconName: true, imageUrl: true, color: true, order: true, isActive: true },
  });
  return NextResponse.json({ categories }, { headers: { "Cache-Control": "no-store" } });
}
```

Si el proyecto usa server components y consulta Prisma directamente, se puede evitar el fetch interno, pero la fuente, filtro y orden deben ser idénticos.

---

## 6. Componente `AdminCategoryManager.tsx`

Archivo sugerido: `apps/admin/components/categories/AdminCategoryManager.tsx`.

Dependencias para esta implementación del drag & drop: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` y `lucide-react`. El informe confirma que DnD Kit no está instalado como dependencia real: añadirlas al workspace correcto con el gestor `pnpm` y actualizar el lockfile. Esta implementación usa la API estable legacy de `@dnd-kit/core` + `@dnd-kit/sortable`; no mezclarla con ejemplos de la API nueva `@dnd-kit/react`.

```tsx
"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Category = {
  id: string;
  key: string;
  name: string;
  slug: string;
  iconName: string;
  imageUrl: string | null;
  color: string;
  order: number;
  isActive: boolean;
};

type FormState = {
  name: string;
  slug: string;
  iconName: string;
  color: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  iconName: "Utensils",
  color: "#CE7A22",
  isActive: true,
};

// Lista de selección limitada a iconos Lucide comunes. Si un nombre no existe en la versión
// instalada, CategoryIcon muestra el fallback. Se pueden ampliar estas opciones sin cambiar BD.
const ICON_OPTIONS = [
  "Utensils", "Coffee", "Pizza", "Cake", "IceCream", "Soup", "Salad", "Flame",
  "Leaf", "Star", "Package", "ChefHat", "Apple", "Fish", "Carrot", "Egg", "Wheat",
];
const ICON_MAP = LucideIcons as unknown as Record<string, LucideIcon>;

function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? ICON_MAP.Utensils ?? ICON_MAP.Package;
  return <Icon size={size} aria-hidden="true" />;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function imageSrc(imageUrl: string | null) {
  if (!imageUrl) return null;
  // Conserva el mecanismo compartido que ya usa el POS para leer /images/menu.
  return imageUrl.startsWith("/images/menu/")
    ? imageUrl.replace(/^\/images\/menu\//, "/api/menu-image/")
    : imageUrl;
}

function SortableRow({
  category,
  onEdit,
  onToggle,
  onDeactivate,
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onToggle: (category: Category) => void;
  onDeactivate: (category: Category) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const src = imageSrc(category.imageUrl);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    position: "relative",
    zIndex: isDragging ? 2 : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-slate-100 bg-white hover:bg-slate-50">
      <td className="w-12 px-3 py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${category.name}`}
          title="Arrastra para reordenar"
          className="cursor-grab touch-none rounded p-2 text-slate-500 hover:bg-slate-100 active:cursor-grabbing"
        >
          <LucideIcons.GripVertical size={18} />
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100">
            {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <CategoryIcon name={category.iconName} size={22} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <span>{category.name}</span>
              {!category.isActive && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Inactiva</span>}
            </div>
            <div className="text-xs text-slate-500">key: {category.key}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-slate-600">/{category.slug}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded p-1.5" style={{ color: category.color, backgroundColor: `${category.color}18` }}>
            <CategoryIcon name={category.iconName} />
          </span>
          <span className="text-slate-600">{category.iconName}</span>
          <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: category.color }} title={category.color} />
        </div>
      </td>
      <td className="px-3 py-3 text-center tabular-nums text-sm text-slate-600">{category.order + 1}</td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onToggle(category)}
          aria-pressed={category.isActive}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${category.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
        >
          {category.isActive ? "Activa" : "Inactiva"}
        </button>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right">
        <button type="button" onClick={() => onEdit(category)} className="mr-3 text-sm font-medium text-blue-700 hover:underline">Editar</button>
        {category.isActive ? (
          <button type="button" onClick={() => onDeactivate(category)} className="text-sm font-medium text-red-700 hover:underline">Desactivar</button>
        ) : (
          <button type="button" onClick={() => onToggle(category)} className="text-sm font-medium text-emerald-700 hover:underline">Activar</button>
        )}
      </td>
    </tr>
  );
}

export default function AdminCategoryManager() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [slugWasEdited, setSlugWasEdited] = React.useState(false);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadCategories = React.useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/categories", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las categorías.");
      setCategories((data.categories as Category[]).slice().sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando categorías.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void loadCategories(); }, [loadCategories]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugWasEdited(false);
    setImageFile(null);
    setCurrentImageUrl(null);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setForm({ name: category.name, slug: category.slug, iconName: category.iconName, color: category.color, isActive: category.isActive });
    setSlugWasEdited(true);
    setImageFile(null);
    setCurrentImageUrl(category.imageUrl);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setImageFile(null);
    setCurrentImageUrl(null);
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = { ...form, name: form.name.trim(), slug: form.slug.trim() || slugify(form.name) };
      const response = await fetch(editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la categoría.");

      const savedCategory = data.category as Category;
      if (imageFile) {
        const formData = new FormData();
        formData.set("image", imageFile);
        const imageResponse = await fetch(`/api/admin/categories/${savedCategory.id}/image`, { method: "PUT", body: formData });
        const imageData = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imageData.error ?? "La categoría se guardó, pero no se pudo subir la imagen.");
      }

      setMessage(editingId ? "Categoría actualizada." : "Categoría creada.");
      setShowForm(false);
      setImageFile(null);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando la categoría.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: Category) {
    setError("");
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cambiar el estado.");
      setCategories((items) => items.map((item) => item.id === category.id ? data.category : item));
      setMessage(`Categoría ${data.category.isActive ? "activada" : "desactivada"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cambiando el estado.");
    }
  }

  async function deactivate(category: Category) {
    if (!window.confirm(`¿Desactivar “${category.name}”? Sus platos y pedidos históricos se conservarán.`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo desactivar la categoría.");
      setCategories((items) => items.map((item) => item.id === category.id ? data.category : item));
      setMessage(`“${category.name}” quedó inactiva.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desactivando la categoría.");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((item) => item.id === active.id);
    const newIndex = categories.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = categories;
    const reordered = arrayMove(categories, oldIndex, newIndex).map((category, order) => ({ ...category, order }));
    setCategories(reordered); // UI optimista
    setError("");
    try {
      const response = await fetch("/api/admin/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((category) => category.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el orden.");
      setMessage("Orden guardado.");
    } catch (err) {
      setCategories(previous); // rollback si falla el guardado
      setError(err instanceof Error ? err.message : "Error guardando el orden.");
    }
  }

  const activeCount = categories.filter((category) => category.isActive).length;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorías</h1>
          <p className="mt-1 text-sm text-slate-600">Administra nombres, iconos, imágenes, colores y el orden del menú.</p>
          <p className="mt-1 text-xs text-slate-500">{categories.length} en total · {activeCount} activas · Arrastra con el asa para cambiar el orden.</p>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
          <LucideIcons.Plus size={17} /> Agregar categoría
        </button>
      </header>

      {message && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {showForm && (
        <form onSubmit={saveCategory} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">{editingId ? "Editar categoría" : "Nueva categoría"}</h2>
            <button type="button" onClick={closeForm} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar formulario"><LucideIcons.X size={18} /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700">
              Nombre *
              <input required maxLength={80} value={form.name} onChange={(event) => {
                const name = event.target.value;
                setForm((old) => ({ ...old, name, ...(!slugWasEdited ? { slug: slugify(name) } : {}) }));
              }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Slug *
              <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(event) => {
                setSlugWasEdited(true);
                setForm((old) => ({ ...old, slug: slugify(event.target.value) }));
              }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Icono Lucide
              <select value={form.iconName} onChange={(event) => setForm((old) => ({ ...old, iconName: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                {ICON_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <span className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500"><CategoryIcon name={form.iconName} /> Vista previa</span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Color
              <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 p-2">
                <input aria-label="Elegir color" type="color" value={form.color} onChange={(event) => setForm((old) => ({ ...old, color: event.target.value.toUpperCase() }))} className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0" />
                <input aria-label="Color hexadecimal" value={form.color} onChange={(event) => setForm((old) => ({ ...old, color: event.target.value.toUpperCase() }))} pattern="#[0-9A-Fa-f]{6}" className="min-w-0 flex-1 px-1 py-1 font-mono text-sm outline-none" />
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Imagen de categoría (JPG, PNG o WebP; máximo 5 MB)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold" />
              {imageFile && <span className="mt-1 block truncate text-xs text-slate-500">Nueva imagen: {imageFile.name}</span>}
              {!imageFile && currentImageUrl && <span className="mt-1 block text-xs text-slate-500">Se conserva la imagen actual si no eliges otra.</span>}
            </label>
            <label className="flex items-center gap-3 self-center rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((old) => ({ ...old, isActive: event.target.checked }))} className="h-4 w-4 accent-orange-600" />
              Categoría activa y visible en el menú
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={closeForm} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Guardando…" : "Guardar categoría"}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Cargando categorías…</p> : categories.length === 0 ? (
          <div className="p-8 text-center"><p className="font-medium text-slate-800">Todavía no hay categorías.</p><button type="button" onClick={startCreate} className="mt-2 text-sm font-semibold text-orange-700 hover:underline">Crear la primera categoría</button></div>
        ) : (
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-3 font-semibold" aria-label="Arrastrar" /><th className="px-3 py-3 font-semibold">Categoría</th><th className="px-3 py-3 font-semibold">Slug</th><th className="px-3 py-3 font-semibold">Icono / color</th><th className="px-3 py-3 text-center font-semibold">Orden</th><th className="px-3 py-3 font-semibold">Estado</th><th className="px-3 py-3 text-right font-semibold">Acciones</th></tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {categories.map((category) => (
                    <SortableRow key={category.id} category={category} onEdit={startEdit} onToggle={toggleActive} onDeactivate={deactivate} />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        )}
      </div>
      <p className="text-xs text-slate-500">Las categorías desactivadas no aparecen en el menú del mozo/cliente. No se borran platos ni pedidos históricos.</p>
    </section>
  );
}
```

### Página `/admin/categorias`

Crea la página usando el layout/dashboard existente de admin (el informe confirma `apps/admin/app/(dashboard)/...`). Ejemplo orientativo para `apps/admin/app/(dashboard)/categorias/page.tsx`:

```tsx
import AdminCategoryManager from "@/components/categories/AdminCategoryManager";

export default function CategoriesPage() {
  return <AdminCategoryManager />;
}
```

Ajusta la ruta física para que la URL resultante sea exactamente `/admin/categorias`, sin duplicar el prefijo si el grupo `(dashboard)` ya resuelve el layout. Añade un enlace a Categorías en el menú lateral del administrador.

---

## 7. Componente `CategorySelector.tsx` para `/menu`

Archivo sugerido: `apps/mesero/components/pos/CategorySelector.tsx` o en la app real que presenta `/menu`. El componente recibe categorías por props para no duplicar el fetch y es compatible con un padre cliente o server/client boundary adecuado.

```tsx
"use client";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MenuCategory = {
  id: string;
  key: string;
  name: string;
  slug: string;
  iconName: string;
  imageUrl: string | null;
  color: string;
  order: number;
  isActive: boolean;
};

type CategorySelectorProps = {
  categories: MenuCategory[];
  selectedCategoryKey: string | null;
  onSelect: (categoryKey: string | null) => void;
};

const ICON_MAP = LucideIcons as unknown as Record<string, LucideIcon>;

function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? ICON_MAP.Utensils ?? ICON_MAP.Package;
  return <Icon size={size} aria-hidden="true" />;
}

function imageSrc(imageUrl: string | null) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("/images/menu/")
    ? imageUrl.replace(/^\/images\/menu\//, "/api/menu-image/")
    : imageUrl;
}

export default function CategorySelector({ categories, selectedCategoryKey, onSelect }: CategorySelectorProps) {
  const ordered = categories
    .filter((category) => category.isActive)
    .slice()
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const isIdle = selectedCategoryKey === null;

  if (isIdle) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" role="list" aria-label="Categorías del menú">
        {ordered.map((category) => {
          const src = imageSrc(category.imageUrl);
          return (
            <button
              key={category.id}
              type="button"
              role="listitem"
              onClick={() => onSelect(category.key)}
              className="group min-w-0 overflow-hidden rounded-xl bg-slate-900 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-label={`Abrir categoría ${category.name}`}
            >
              <div className="relative h-28 overflow-hidden bg-slate-200 sm:h-32" style={{ backgroundColor: `${category.color}20` }}>
                {src ? (
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ color: category.color }}>
                    <CategoryIcon name={category.iconName} size={38} />
                  </div>
                )}
              </div>
              <div className="flex min-h-12 items-center gap-2 bg-slate-900 px-3 py-3 text-white">
                <span className="shrink-0" style={{ color: category.color }}><CategoryIcon name={category.iconName} /></span>
                <span className="line-clamp-2 text-sm font-semibold leading-tight">{category.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2" aria-label="Categorías seleccionables">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
      >
        <LucideIcons.ArrowLeft size={18} />
        <span>Volver</span>
      </button>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categorías del menú">
        {ordered.map((category) => {
          const active = category.key === selectedCategoryKey;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={category.name}
              onClick={() => onSelect(category.key)}
              className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${active ? "min-w-32 px-4 shadow-sm" : "w-12 px-0 hover:bg-slate-100"}`}
              style={active ? { backgroundColor: category.color, color: "#FFFFFF" } : { backgroundColor: "#F1F5F9", color: category.color }}
            >
              <CategoryIcon name={category.iconName} size={21} />
              {active && <span className="max-w-48 truncate text-sm font-semibold">{category.name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### Integración requerida en el padre de `/menu`

- Obtener categorías mediante `GET /api/categories` o una consulta Prisma server-side con `where: { isActive: true }` y `orderBy: [{order:"asc"},{name:"asc"}]`.
- El estado de selección debe ser `string | null`, donde el string es `category.key` (el valor guardado en `MenuItem.category`).
- Al escoger una categoría, filtrar platos por ese `key`. Al pulsar Volver, volver a `null` y mostrar el grid de tarjetas.
- No volver a crear arreglos locales de categoría, orden, color o icono.
- Para el estado idle, el grid puede usar la imagen como zona superior y una banda inferior con icono + nombre. Sin imagen, mantener la misma altura con icono centrado y color/fondo suave.
- Para el estado seleccionado, mantener una barra horizontal desplazable, botones de 48 px para categorías no activas y la activa expandida con su nombre. Si el viewport es estrecho, el contenedor horizontal debe seguir siendo usable sin comprimir los iconos.

---

## 8. Refactor transversal obligatorio

Añadir categorías dinámicas solo al admin no basta: el informe enumera consumidores estáticos que se desincronizarían. OpenCode debe localizar y migrar los siguientes sitios:

1. `packages/types/src/index.ts`: `MenuCategory`, `MenuCategoryLabel`, `MenuCategoryList`.
2. `packages/db/prisma/schema.prisma`: enum `MenuCategory` y tipo de `MenuItem.category`.
3. `apps/cajero/components/pos/pos-terminal.tsx`: `MENU_PANE_ORDER`, `PANE_LABEL_SHORT`, `PANE_TITLE`.
4. `apps/cajero/components/pos/pos-category-bar.tsx`: `PANE_ICON`, `PANE_ICON_COLOR` y render del selector.
5. `apps/admin/app/(dashboard)/menu/menu-manager.tsx`: `CATEGORY_PANES`, `CARTA_CATEGORIES`, `CAFETERIA_CATEGORIES`.
6. `apps/admin/app/actions/print-report.ts` y `apps/admin/app/api/reports/daily/route.ts`: `CATEGORY_ORDER`. Para informes históricos, consultar la clave/orden de categoría de manera consistente y definir fallback para claves antiguas no encontradas.
7. `apps/mesero/components/pos/pos-terminal.tsx`: tabs basados en `MenuCategoryList`.
8. `apps/admin/app/(dashboard)/menu/page.tsx`: consultar categorías junto con platos; conservar/migrar las imágenes que hoy provienen de `CategoryConfig`.
9. `apps/cajero/actions/pos.ts`: incluir categorías activas/ordenadas en `getPosCatalog()` o en el endpoint de catálogo existente; no consultar la base por cada render. Respetar el mecanismo actual de refresco/polling.
10. Todo formulario de alta/edición de plato debe recibir categorías desde la BD. Para platos existentes, permitir ver la categoría inactiva asignada y pedir cambiarla antes de guardar si la aplicación no permite dejarla inactiva.

### Regla para consultas por categoría

- La clave técnica `MenuItem.category` corresponde a `Category.key`, no a `slug` ni al `id`.
- Los reportes pueden usar `Category.name` para mostrar nombres actuales, pero si se necesita exactitud histórica, almacenar un snapshot del nombre al cerrar/registrar la venta o definir claramente que los reportes usan la etiqueta actual.
- No filtrar productos existentes de forma que desaparezcan al desactivar una categoría; la desactivación debe ocultarla de la navegación del menú, no borrar platos/pedidos.
- Las categorías especiales (`ALMUERZO`, `BUBAS`, `SANDWICHES`) requieren una prueba manual específica. No eliminar la lógica de menú del día o de panes fusionados sin confirmar el comportamiento actual.

---

## 9. Seguridad, UX y robustez

- Proteger GET/POST/PATCH/DELETE/reorder/upload bajo `/api/admin/categories` con la sesión y rol de administrador existentes.
- No aceptar rutas de archivos ni nombres de archivo del cliente. Usar nombre generado por servidor basado en la `key` estable.
- Validar mimetype, tamaño máximo (5 MB), decodificar con Sharp, rotar según EXIF, recortar `cover` a 640×360 y convertir a WebP.
- No guardar clases Tailwind arbitrarias como color. Persistir hex `#RRGGBB` y aplicar `style={{ color }}`/`style={{ backgroundColor }}`.
- Los nombres de iconos son texto validado; nunca ejecutar contenido como código.
- Mostrar errores de servidor legibles, no sólo `console.error`; registrar internamente detalles sin exponer stack traces.
- Reordenamiento optimista con rollback si falla la API. El endpoint debe validar duplicados, categorías faltantes y IDs desconocidos.
- Evitar doble envío mientras `saving=true`; dar feedback después de guardar el orden, cambio de estado o imagen.
- El upload puede ocurrir después de crear/actualizar los datos de la categoría. Si falla la imagen, informar claramente que los datos se guardaron pero la imagen no; permitir reintentar sin duplicar la categoría.
- Usar `loading="lazy"` para miniaturas y fallback icono cuando falte la imagen o la carga falle.
- Añadir una decisión explícita sobre qué hacer si se intenta crear una categoría con un slug de una categoría inactiva: recomendado es responder 409 y permitir reactivar/editar la existente.

---

## 10. Pruebas y criterios de aceptación

### API / permisos

- Sin sesión admin, `/api/admin/categories` y cada mutación responden 401/403 según la convención del proyecto.
- GET admin devuelve activas e inactivas ordenadas por `order`, con todos los campos públicos del modelo.
- GET `/api/categories` no devuelve inactivas y ordena por `order ASC`.
- POST rechaza nombre vacío, slug inválido, color inválido y duplicados; crea una categoría con `key` única.
- PATCH puede cambiar nombre/slug/icono/color/estado, no permite modificar `id` o `key`, y detecta slugs duplicados.
- DELETE sólo cambia `isActive=false`; platos, tickets y reportes históricos permanecen.
- Reorder rechaza IDs duplicados, IDs desconocidos y arreglos incompletos; escribe valores `order` consecutivos comenzando en cero de forma atómica.
- Upload rechaza archivos no imagen, tipo no permitido y archivos mayores de 5 MB; acepta JPG/PNG/WebP y devuelve `imageUrl` persistida y usable por cajero, admin y mesero.

### Interfaz admin

- Crear, editar y desactivar/reactivar una categoría actualiza la tabla sin duplicar filas.
- Los campos nombre, slug, icono Lucide, imagen, color y estado se muestran y guardan correctamente.
- Se pueden crear muchas categorías, sin límites codificados de longitud de lista.
- Arrastrar una fila cambia la posición en pantalla y persiste tras recargar.
- Si el guardado del orden falla, la lista vuelve a su orden anterior y muestra un error.
- Una categoría inactiva queda visible en el admin con indicador claro, pero no aparece en el menú público.
- La imagen se transforma al formato/tamaño acordado y se muestra tanto en el admin como en las apps POS.

### `/menu` y POS

- Sin categoría seleccionada: grid de tarjetas grandes con imagen arriba e icono + nombre abajo.
- Seleccionando una categoría: barra horizontal compacta, activa expandida con nombre, las demás sólo icono, botón Volver.
- Volver restaura el grid inicial; cambiar de categoría no crea filas ni iconos duplicados.
- Las categorías aparecen en el mismo orden que en admin después de recargar todas las apps.
- Un plato existente sigue vinculado después de convertir `MenuItem.category` a `String`.
- Verificar `ALMUERZO`, `BUBAS`, `SANDWICHES`, `SANDWICH` y `PANINI` según la decisión de migración acordada.
- Revisar reportes diarios, impresión, catálogo de productos y flujo de mesero/cajero antes de retirar arrays fijos.

### Validaciones finales sugeridas

Ejecutar desde la raíz con los comandos reales del monorepo:

```bash
pnpm install
pnpm --filter <paquete-db> prisma:generate
pnpm --filter <paquete-db> prisma:migrate:dev
pnpm --filter <paquete-admin> typecheck
pnpm --filter <paquete-cajero> typecheck
pnpm --filter <paquete-mesero> typecheck
pnpm --filter <paquete-admin> lint
```

Los nombres de filtros/scripts anteriores son ejemplos, no asumir que existen literalmente: consultar `pnpm-workspace.yaml` y los `package.json` para elegir los comandos reales.

---

## 11. Orden de implementación recomendado

1. Hacer backup de SQLite, inspeccionar imports/auth/helpers de imágenes y capturar los órdenes visibles actuales.
2. Añadir modelo Prisma `Category`, convertir `MenuItem.category` a `String`, generar/revisar migración en una copia de DB.
3. Migrar categorías legadas e imágenes de `CategoryConfig` con seed idempotente; verificar cantidades.
4. Instalar DnD Kit en el paquete admin.
5. Implementar validación, GET/POST, PATCH/DELETE, reorder y upload con el guard de administrador real.
6. Crear `AdminCategoryManager.tsx`, la página `/admin/categorias` y el enlace del sidebar.
7. Implementar GET `/api/categories` y `CategorySelector.tsx` en la app que sirve `/menu`.
8. Migrar todos los consumidores transversales de la sección 8 y eliminar listas duplicadas una vez que las pruebas pasen.
9. Ejecutar typecheck/lint, probar admin/cajero/mesero en las URLs de desarrollo reales, recargar y confirmar que el orden persiste.
10. Ejecutar la migración en la base real sólo tras validar una copia y conservar un backup recuperable.

## Criterio final de éxito

El dueño puede entrar a `/admin/categorias`, crear tantas categorías como necesite, definir nombre, slug, icono, imagen y color, activar/desactivar y ordenar con drag & drop. El orden queda guardado en SQLite y todas las interfaces que usan categorías consumen la misma lista desde la BD, sin modificar código cada vez que se agrega una categoría.
