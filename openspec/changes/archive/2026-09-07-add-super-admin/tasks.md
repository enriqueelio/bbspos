## 1. Datos y tipos

- [x] 1.1 Agregar valor `SUPER_ADMIN` al enum `Role` en `schema.prisma` y regenerar el cliente Prisma (sin migración SQL: en SQLite no hay CHECK constraints)
- [x] 1.2 Actualizar `packages/types`: `Role`/`RoleLabel` ("Super Admin") y nuevo `RoleListAll`; `RoleList` como lista restringida

## 2. Backend del panel admin

- [x] 2.1 `middleware.ts` del admin: permitir `ADMIN` o `SUPER_ADMIN`
- [x] 2.2 Server actions de catálogo (`catalog.ts`): admitir `SUPER_ADMIN` en `requireAdminSession`
- [x] 2.3 `users.ts`: permitir ambos roles en `requireAdminSession`; reglas por actor: destino `SUPER_ADMIN` protegido (sin baja, rol/turno congelados, solo editable nombre/contraseña por otro `SUPER_ADMIN`), destino `ADMIN` gestionable solo por `SUPER_ADMIN`, `ADMIN` solo asigna `CAJERO`/`MESERO`, autoprotección (nadie desactiva su propia cuenta ni cambia su propio rol)

## 3. UI de usuarios

- [x] 3.1 Pasar `currentUserRole` desde `users/page.tsx` a `UsersClient`
- [x] 3.2 Badge "Super Admin" (warning), ocultar acciones de baja para cuentas protegidas, botones de admin visibles solo para `SUPER_ADMIN`, y selector de rol según actor
- [x] 3.3 Diálogo: rol/turno del `SUPER_ADMIN` bloqueados; rol del propio usuario bloqueado

## 4. Acceso en cajero y mesero

- [x] 4.1 Cajero: middleware, `hasCashierAccess`/`hasBillingAccess`, `queue-view` y `pos-terminal` incluyen `SUPER_ADMIN`
- [x] 4.2 Mesero: middleware, `hasOrderAccess` y `ALLOWED_ROLES` incluyen `SUPER_ADMIN`

## 5. Seed

- [x] 5.1 Upsert idempotente del usuario `superadmin` (Super Admin)

## 6. Verificación

- [x] 6.1 `typecheck` y `lint` verdes en types, db, admin, cajero y mesero
- [x] 6.2 Seed aplicado y verificado: `superadmin` con rol `SUPER_ADMIN` activo en la BD local
- [x] 6.3 Dev server del admin compila `/users` sin errores
- [x] 6.4 Documentar change openspec y sincronizar specs canónicas