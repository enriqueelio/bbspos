# Admin Auth Specification

## Purpose

Controla el acceso al panel administrativo del restaurante, permitiendo que solo el personal autenticado pueda gestionar el catálogo y los pedidos.

## Requirements

### Requirement: Inicio de sesión del personal

El sistema SHALL autenticar al personal del restaurante mediante credenciales válidas (correo y contraseña) y establecer una sesión persistente. Las credenciales de un usuario dado de baja (inactivo) SHALL ser rechazadas aunque sean correctas, sin revelar si el fallo fue el correo o la contraseña.

#### Scenario: Credenciales válidas

- **WHEN** un miembro del personal activo inicia sesión con credenciales correctas
- **THEN** el sistema establece una sesión y lo redirige a su panel correspondiente

#### Scenario: Credenciales inválidas

- **WHEN** un usuario intenta iniciar sesión con credenciales incorrectas
- **THEN** el sistema rechaza el acceso y muestra un mensaje de error sin revelar si el fallo fue el correo o la contraseña

#### Scenario: Usuario inactivo

- **WHEN** un usuario dado de baja introduce credenciales correctas
- **THEN** el sistema rechaza el acceso e indica que la cuenta está desactivada

### Requirement: Roles de usuario

El sistema SHALL asignar a cada usuario del personal un rol: `ADMIN` o `CAJERO`. El rol SHALL determinar a qué aplicaciones y operaciones tiene acceso el usuario.

#### Scenario: Usuario con rol definido

- **WHEN** se crea un usuario del personal
- **THEN** el sistema le asigna un rol `ADMIN` o `CAJERO`

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

### Requirement: Cierre de sesión

El sistema SHALL permitir al personal cerrar su sesión desde el panel admin.

#### Scenario: Cierre de sesión

- **WHEN** un usuario autenticado cierra su sesión
- **THEN** el sistema termina la sesión y redirige al inicio de sesión, bloqueando las rutas admin posteriores

### Requirement: Protección de operaciones de escritura

El sistema SHALL restringir toda operación de escritura sobre el catálogo y el estado de los pedidos a sesiones autenticadas.

#### Scenario: Operación de escritura sin autenticación

- **WHEN** un usuario no autenticado intenta crear, modificar o eliminar catálogo o cambiar el estado de un pedido
- **THEN** el sistema rechaza la operación
