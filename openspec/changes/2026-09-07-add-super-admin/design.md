# Design: add-super-admin

## Context

El sistema de usuarios ya tiene `User.role` con `ADMIN | CAJERO | MESERO`, NextAuth con rol en JWT/session, middleware por rol en cada app y server actions de gestión de usuarios en `apps/admin/app/actions/users.ts`. Este cambio introduce un rol de máximo nivel por encima de `ADMIN`. Ver proposal.md.

## Goals / Non-Goals

**Goals**

- Cuenta `SUPER_ADMIN` protegida contra baja y degradación (nadie, ni él mismo).
- Jerarquía clara: solo `SUPER_ADMIN` maneja admins; `ADMIN` maneja cajeros/meseros.
- `SUPER_ADMIN` con acceso hereditario a todas las apps (admin, cajero con cobros, mesero).

**Non-Goals**

- Multi-tenancy ni permisos granularies por recurso (por usuario).
- Eliminación física de usuarios (se mantiene la baja lógica con `active`).
- Auditoría de cambios sobre cuentas.

## Decisions

### D1. Nuevo valor de rol `SUPER_ADMIN` sin migración SQL

Se agrega `SUPER_ADMIN` al enum `Role` en `schema.prisma` y se regenera el cliente Prisma. En SQLite los enums se modelan como columnas `TEXT` sin CHECK constraints, por lo que `prisma migrate diff` devuelve un diff vacío y no se genera migración; la validación del valor queda en el cliente generado y en los `parseRole` de las actions. *Alternativa descartada*: tabla `roles` con permisos por recurso — sobre-ingeniería para el volumen actual.

### D2. Reglas de gestión centralizadas en `users.ts`

Se centraliza toda la autorización en dos puntos de la action layer (`assertUserEditAllowed` para edición y las comprobaciones de `setUserActive`/`createUser`), aplicadas en servidor (inviolables desde la UI):

- Destino `SUPER_ADMIN`: solo un actor `SUPER_ADMIN` lo modifica, y solo nombre/contraseña (rol y turno congelados); nadie lo da de baja ni lo reactiva.
- Destino `ADMIN`: solo el actor `SUPER_ADMIN` lo gestiona, salvo la autocuenta (rol y turno congelados si es el propio actor).
- Destino `CAJERO`/`MESERO`: gestionable por `ADMIN` y `SUPER_ADMIN`.
- Autoprotección: nadie desactiva su propia cuenta ni se cambia su propio rol.
- `ADMIN` no puede asignar roles `ADMIN` ni `SUPER_ADMIN` (solo `CAJERO`/`MESERO`).

La antigua regla del "último admin activo" se sustituye: como el `SUPER_ADMIN` siempre está activo (no puede darse de baja), no puede quedar el sistema sin autoridad gestionable.

### D3. Acceso hereditario en apps

`SUPER_ADMIN` se admite en: middleware del admin, `requireAdminSession` de catálogo y usuarios, `hasCashierAccess`/`hasBillingAccess` (cajero), `isBilling` de `queue-view` y `pos-terminal`, y `hasOrderAccess`/`ALLOWED_ROLES` (mesero). El login/las sesiones JWT ya transportan el rol, por lo que no hay cambios de sesión.

### D4. UI de usuarios con permisos por actor

La tabla recibe `currentUserRole`. Fila `SUPER_ADMIN`: badge warning y sin acciones (excepto otro `SUPER_ADMIN` puede editar nombre/contraseña con rol/turno bloqueados). Fila `ADMIN`: editar/baja/reactivar visibles solo para `SUPER_ADMIN`. Selector de roles: `SUPER_ADMIN` → todos; `ADMIN` → solo `CAJERO`/`MESERO`. Nunca se muestra el selector de rol de `SUPER_ADMIN` (bloqueado) y su turno tampoco.

### D5. Bootstrap con seed

El primer `SUPER_ADMIN` se crea por seed (usuario `superadmin`, contraseña `admin123`) vía upsert idempotente; a partir de ahí puede crearse desde la UI por otro `SUPER_ADMIN`.

## Risks / Trade-offs

- [Uno solo `SUPER_ADMIN` olvida su contraseña sin que exista otro] → Otro `SUPER_ADMIN` (o el admin de BD) puede resetearla; el turno/rol siguen protegidos.
- [Sesiones JWT con rol como claim no se invalidan al desactivar una cuenta] → Comportamiento ya existente; la desactivación de `CAJERO`/`MESERO`/`ADMIN` sigue siendo de baja lógica con corte en el siguiente login.
- [Cambio de jerarquía rompe flujos que asumían "admin gestiona admin"] → Se actualizan UI, actions y mensajes; la regla de autoprotección se conserva para todos.

## Migration Plan

1. Actualizar enum `Role` en schema → `prisma generate` (sin migración SQL).
2. Aplicar seed `superadmin` en el entorno local; para desplegar en producción, el archivo **bbs Antiguo.sql / DB remota** debe contener la cuenta o crear el usuario con rol `SUPER_ADMIN` tras regenerate.

## Open Questions

- Ninguna pendiente que afecte specs o tareas.