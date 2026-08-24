# Design: add-user-management

## Context

Tras `add-cashier-app`, el modelo ya tiene `User.role (ADMIN|CAJERO)`, NextAuth con rol en JWT/session en ambas apps y middleware por rol. El CRUD de usuarios se agrega al panel admin existente, que ya usa server actions + revalidatePath para catálogo y pedidos. Ver proposal.md.

## Goals / Non-Goals

**Goals**

- Gestión completa del personal desde el admin: alta, edición, reset de contraseña, baja/reactivación lógica.
- Garantizar que siempre exista un administrador activo con sesión válida.

**Non-Goals**

- Auto-servicio del personal (cambiar su propia contraseña), recuperación por correo o invitaciones.
- Eliminación física de usuarios ni auditoría de cambios de cuentas.
- Paginación: el volumen de personal es pequeño; listado completo sin paginar.

## Decisions

### D1. Baja lógica con columna `User.active`

`active Boolean @default(true)` en el modelo User. Los logins (admin y cajero) filtran/verifican `active`; los reportes y atribuciones históricas siguen resolviendo la relación normalmente. *Alternativa descartada*: DELETE físico — rompería la atribución de pedidos (`SetNull` en la FK) y perdería el historial.

### D2. Validación de último admin en las server actions

Regla centralizada en una única acción transaccional: antes de escribir, si el objetivo es ADMIN activo y el cambio lo desactiva o degrada, contar admins activos restantes; si quedaría 0 → rechazar con error claro. Además bloqueo explícito de auto-modificación (desactivarse o degradarse a sí mismo). *Alternativa descartada*: validar solo en UI — evadible.

### D3. Reset de contraseña como parte de la edición

Campo opcional "nueva contraseña" dentro del diálogo de edición; vacío = sin cambio. Hash bcryptjs igual que el seed. No se exige contraseña actual porque el flujo es administrativo (el admin ya tiene sesión privilegiada).

### D4. Reutilización del patrón de UI existente

Sección nueva `(dashboard)/users` con tabla tipo DataTable del panel de reportes + diálogos inline estilo orders-client (paneles con confirm). Server actions en `app/actions/users.ts` siguiendo el formato de `orders.ts`. Sin nuevas dependencias.

## Risks / Trade-offs

- [Un admin inactivo por seed manual deja sin acceso al panel] → La migración marca todo `active=true` por defecto; la acción de baja impide llegar a 0 admins activos.
- [Sesiones activas de un usuario recién dado de baja] → El login rechaza en el siguiente acceso; invalidar JWT vigentes requeriría versionado de tokens (fuera de alcance).
- [Correo como identidad única] → Ya existente (`@unique`); el alta valida duplicado devolviendo error claro.

## Migration Plan

1. Migración única: agregar `User.active` con default `true` (SQLite ALTER ADD COLUMN soportado).
2. Deploy normal del monorepo; no requiere backfill de datos.

## Open Questions

- Ninguna pendiente que afecte specs o tareas.
