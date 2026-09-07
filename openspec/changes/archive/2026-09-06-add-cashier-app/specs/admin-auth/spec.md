## ADDED Requirements

### Requirement: Roles de usuario

El sistema SHALL asignar a cada usuario del personal un rol: `ADMIN` o `CAJERO`. El rol SHALL determinar a qué aplicaciones y operaciones tiene acceso el usuario.

#### Scenario: Usuario con rol definido

- **WHEN** se crea un usuario del personal
- **THEN** el sistema le asigna un rol `ADMIN` o `CAJERO`

## MODIFIED Requirements

### Requirement: Protección de rutas del admin

El sistema SHALL impedir el acceso a las rutas del panel admin a usuarios sin sesión activa y SHALL restringir el panel admin a usuarios con rol `ADMIN`; cualquier otro caso se redirige al inicio de sesión.

#### Scenario: Acceso sin sesión

- **WHEN** un usuario no autenticado intenta abrir una ruta del panel admin
- **THEN** el sistema lo redirige a la página de inicio de sesión

#### Scenario: Acceso con sesión activa

- **WHEN** un usuario autenticado con rol `ADMIN` abre una ruta del panel admin
- **THEN** el sistema le permite acceder a la ruta

#### Scenario: Acceso de un cajero al admin

- **WHEN** un usuario autenticado con rol `CAJERO` intenta abrir una ruta del panel admin
- **THEN** el sistema rechaza el acceso y lo redirige a su inicio de sesión correspondiente
