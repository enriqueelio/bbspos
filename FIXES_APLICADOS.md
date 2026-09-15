# FIXES APLICADOS

Cierre de bugs / mejoras de UX no silenciosa en el POS (terminales cajero y
mesero) y gestión del menú (admin).

## 1. Toppings ya no se borran al cambiar de sabor

- **Antes:** `selectFlavor` reiniciaba `toppingIds` al tocar otro sabor; el
  cajero/mesero perdía los extras elegidos y debía re-marcarlos.
- **Ahora:** los toppings se conservan al cambiar de sabor. Solo se reinician
  al cambiar de categoría de Bubble Drinks, confirmar el producto, enviar el
  pedido, limpiar o reiniciar la venta.
- **Archivos:** `apps/cajero/components/pos/pos-terminal.tsx`,
  `apps/mesero/components/pos/pos-terminal.tsx`.

## 2. Mensaje explícito cuando "Confirmar producto" está deshabilitado

- **Antes:** el botón quedaba deshabilitado sin explicación (UX silenciosa).
- **Ahora:** bajo el subtotal se muestra el motivo exacto:
  - `⚠ Falta elegir tamaño/boba` cuando falta tamaño o tipo de boba.
  - `⚠ Combinación no disponible` cuando el combo tamaño+boba no tiene precio.
- **Archivos:** `apps/cajero/components/pos/pos-terminal.tsx`,
  `apps/mesero/components/pos/pos-terminal.tsx` (`productBlockReason`).

## 3. Stepper de cantidad en el panel "Producto en curso"

- **Ahora:** el panel muestra una fila **Cantidad** con botones `−` / `+`.
  El **Subtotal** se multiplica por la cantidad y el botón confirma
  `Confirmar producto × N`. El agregado al carrito suma `N` unidades (si la
  misma combinación ya existe, se acumula).
- El selector se reinicia a `1` al cambiar de sabor/categoría, confirmar,
  enviar, limpiar o reiniciar.
- `addPosItem` ahora acepta un segundo parámetro `quantity` (default `1`).
- **Archivos:**
  - `apps/cajero/components/pos/pos-terminal.tsx`
  - `apps/cajero/components/pos/pos-cart-store.ts`
  - `apps/mesero/components/pos/pos-terminal.tsx`
  - `apps/mesero/components/pos/pos-cart-store.ts`

## 4. Admin: Tab "Salsas Alitas" con CRUD de `AlitaSauce`

- La página "Gestión del menú" ahora usa **barra de tabs** (una sección a la
  vez): **Almuerzos / Platos a la carta / Bebidas / Cafetería / Bubas /
  Salsas Alitas**.
- El tab **Salsas Alitas** permite administrar el catálogo que usan los
  terminales para las Alitas Mixtas:
  - Crear salsa (con validación de nombre duplicado).
  - Editar nombre (diálogo).
  - Activar / Desactivar disponibilidad (la API `/api/alita-sauces` solo
    sirve las `available = true`, así que al desactivar desaparece del POS).
  - Eliminar (solo SUPER_ADMIN), con confirmación previa.
- **Archivos:**
  - `apps/admin/app/(dashboard)/menu/menu-manager.tsx`
  - `apps/admin/app/(dashboard)/menu/page.tsx`
  - `apps/admin/app/actions/catalog.ts` (`createAlitaSauce`,
    `updateAlitaSauce`, `deleteAlitaSauce`)

## Verificación

- `pnpm -r typecheck`: sin errores.
- `pnpm -r lint`: 0 errores (solo warnings pre-existentes en store/admin).
- Servidores admin (`:3001`), cajero (`:3002`) y mesero (`:3003`) compilando
  sin errores (`/menu` en admin, `/login` y rutas del POS en terminales).