# Proposal: add-user-management

## Why

Con la llegada del rol `CAJERO` (cambio `add-cashier-app`), los usuarios solo pueden gestionarse editando el seed y ejecutándolo a mano. El administrador necesita administrar el personal desde el propio panel: dar de alta cajeros nuevos, corregir datos, restablecer contraseñas, cambiar roles y dar de baja al personal que deja de trabajar.

## What Changes

- Nueva sección **Usuarios** en el panel admin (solo rol `ADMIN`) con listado, alta, modificación y baja del personal.
- Baja **lógica**: nueva columna `User.active Boolean @default(true)`; un usuario inactivo no puede iniciar sesión pero conserva su nombre en pedidos y reportes históricos.
- Asignación de rol (`ADMIN` | `CAJERO`) en alta y modificación; cambio de contraseña por parte del admin (reset, sin conocer la anterior).
- Protecciones: nadie puede desactivarse o quitarse el rol a sí mismo, ni modificar al último `ADMIN` activo de forma que el sistema quede sin administrador.
- Ajustes en login (admin y cajero) para rechazar usuarios inactivos con mensaje claro.

## Capabilities

### New Capabilities

- `user-management`: Administración del personal desde el panel admin — listado, alta, modificación, asignación de roles, reseteo de contraseña y baja lógica con protecciones del último administrador.

### Modified Capabilities

- `admin-auth`: El requisito "Inicio de sesión del personal" pasa a exigir que el usuario esté activo; las credenciales de un usuario dado de baja se rechazan aunque sean correctas.

## Impact

- **packages/db**: columna `User.active Boolean @default(true)` + migración.
- **packages/types**: campo `active` en tipos de usuario y mensajes/labels asociados.
- **apps/admin**: nueva ruta `(dashboard)/users` (listado + diálogos de alta/edición/baja), server actions de CRUD con validaciones, item "Usuarios" en navegación; login filtra `active`.
- **apps/cajero**: login filtra `active`.
- **docker-compose/README**: sin cambios estructurales (solo documentación de la sección si aplica).
