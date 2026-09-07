# Proposal: add-super-admin

## Why

El panel admin hoy solo distingue `ADMIN | CAJERO | MESERO` y todos los administradores tienen el mismo poder, incluyendo poder desactivar a otro administrador (con la única restricción de no dejar el sistema sin al menos uno activo). El negocio necesita una cuenta de máximo nivel, protegida e indestructible, que pueda administrar a los propios administradores sin perder el sistema.

## What Changes

- Nuevo rol `SUPER_ADMIN`, por encima de `ADMIN`, con acceso a todas las aplicaciones (panel admin, cajero con cobros y mesero).
- La cuenta `SUPER_ADMIN` es **protegida**: nadie puede darle de baja, ni cambiarle el rol ni el turno; solo puede editarse su nombre/contraseña y únicamente por otro `SUPER_ADMIN`.
- Solo el `SUPER_ADMIN` gestiona a los usuarios con rol `ADMIN` (editar, dar de baja, reactivar, promover). El `ADMIN` solo gestiona `CAJERO`/`MESERO` y no puede asignar ni el rol `ADMIN` ni `SUPER_ADMIN`.
- El rol `SUPER_ADMIN` se puede asignar desde la UI (alta o promoción) pero el selector solo es visible para sesiones `SUPER_ADMIN`.
- Seed con el primer `SUPER_ADMIN` (`superadmin`), bootstrap de la jerarquía.
- No requiere migración de BD: en SQLite los enums son a nivel de aplicación (sin CHECK constraints); basta regenerar el cliente Prisma.

## Capabilities

### New Capabilities

- (ninguna nueva; la jerarquía de roles se modela dentro de las capacidades existentes)

### Modified Capabilities

- `user-management`: Protección de la cuenta `SUPER_ADMIN`, gestión exclusiva de admins por el `SUPER_ADMIN`, y limitación de roles asignables por actor.
- `admin-auth`: Los roles del personal pasan a `SUPER_ADMIN | ADMIN | CAJERO | MESERO`; el panel admin y sus operaciones de escritura aceptan `SUPER_ADMIN` además de `ADMIN`.

## Impact

- **packages/db**: valor `SUPER_ADMIN` en el enum `Role` del schema + regeneración del cliente (sin migración SQL).
- **packages/types**: `Role`, `RoleLabel` ("Super Admin") y nuevo `RoleListAll`; `RoleList` queda como lista restringida.
- **apps/admin**: middleware y server actions (catálogo y usuarios) admiten ambos roles; permisos de gestión de usuarios con reglas por actor; UI de usuarios con badges, botones protegidos y selectores de rol según actor.
- **apps/cajero**: middleware, `hasCashierAccess`/`hasBillingAccess` y gates de cobro (`queue-view`, `pos-terminal`) incluyen `SUPER_ADMIN`.
- **apps/mesero**: middleware, `hasOrderAccess` y `ALLOWED_ROLES` incluyen `SUPER_ADMIN`.
- **packages/db/prisma/seed.ts**: alta idempotente del usuario `superadmin`.