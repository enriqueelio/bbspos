## Purpose

Controla el acceso al panel administrativo del restaurante, permitiendo que solo el personal autenticado pueda gestionar el catálogo y los pedidos.

## ADDED Requirements

### Requirement: Inicio de sesión del personal

El sistema SHALL autenticar al personal del restaurante mediante credenciales válidas (correo y contraseña) y establecer una sesión persistente.

#### Scenario: Credenciales válidas

- **WHEN** un miembro del personal inicia sesión con credenciales correctas
- **THEN** el sistema establece una sesión y lo redirige al panel admin

#### Scenario: Credenciales inválidas

- **WHEN** un usuario intenta iniciar sesión con credenciales incorrectas
- **THEN** el sistema rechaza el acceso y muestra un mensaje de error sin revelar si el fallo fue el correo o la contraseña

### Requirement: Protección de rutas del admin

El sistema SHALL impedir el acceso a las rutas del panel admin a usuarios sin sesión activa y redirigirlos al inicio de sesión.

#### Scenario: Acceso sin sesión

- **WHEN** un usuario no autenticado intenta abrir una ruta del panel admin
- **THEN** el sistema lo redirige a la página de inicio de sesión

#### Scenario: Acceso con sesión activa

- **WHEN** un usuario autenticado abre una ruta del panel admin
- **THEN** el sistema le permite acceder a la ruta

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
