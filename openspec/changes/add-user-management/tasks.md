## 1. Datos y tipos

- [x] 1.1 Agregar `User.active Boolean @default(true)` al schema Prisma, crear y aplicar migración, regenerar cliente
- [x] 1.2 Actualizar `packages/types`: `active` en tipos de sesión/usuario y labels de estado si aplica

## 2. Backend del panel admin

- [x] 2.1 Crear `apps/admin/app/actions/users.ts`: `createUser`, `updateUser` (nombre, rol, reset opcional de contraseña), `setUserActive` (baja/reactivación) con validaciones: correo único, rol válido, contraseña mínima 6 caracteres
- [x] 2.2 Implementar protecciones en las acciones: bloquear auto-baja/auto-degradación y rechazar cualquier cambio que deje el sistema sin administradores activos (cálculo transaccional)
- [x] 2.3 Excluir usuarios inactivos del login de admin (`lib/auth.ts`) con mensaje "cuenta desactivada" diferenciado de credenciales inválidas

## 3. UI de la sección Usuarios

- [x] 3.1 Ruta `(dashboard)/users/page.tsx` con listado (nombre, correo, rol, estado, marca "tú") y acceso restringido a rol ADMIN
- [x] 3.2 Diálogo de alta con nombre, correo, contraseña y selector de rol; errores visibles (correo duplicado, validaciones)
- [x] 3.3 Diálogo de edición con nombre, rol y campo opcional "nueva contraseña"
- [x] 3.4 Acciones de baja/reactivación con confirmación inline y badges de estado; botones deshabilitados según protecciones
- [x] 3.5 Item "Usuarios" en `admin-nav.tsx`

## 4. Login del cajero

- [x] 4.1 Filtrar usuarios inactivos en `apps/cajero/lib/auth.ts` y mostrar mensaje de cuenta desactivada

## 5. Verificación

- [x] 5.1 Probar alta: usuario nuevo aparece activo; correo duplicado rechazado; contraseña corta rechazada
- [x] 5.2 Probar modificación: cambio de rol aplica tras re-login; reset de contraseña deja la anterior inválida
- [x] 5.3 Probar baja/reactivación: inactivo no puede iniciar sesión (mensaje claro) y conserva atribución histórica; reactivación restaura acceso
- [x] 5.4 Probar protecciones: auto-desactivación rechazada; degradar/desactivar al último admin activo rechazado
- [x] 5.5 Ejecutar lint/typecheck/build del monorepo y validar con `openspec validate add-user-management --strict`

