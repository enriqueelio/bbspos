## Purpose

Administración del personal desde el panel admin: permite listar, crear, modificar y dar de baja usuarios del personal, asignando roles y restableciendo contraseñas sin tocar la base de datos a mano.

## ADDED Requirements

### Requirement: Listado de usuarios

El sistema SHALL mostrar al administrador la lista completa de usuarios del personal con su nombre, correo, rol y estado (activo o inactivo), indicando cuál es el usuario conectado.

#### Scenario: Lista visible para el admin

- **WHEN** un administrador abre la sección de usuarios
- **THEN** ve todos los usuarios con sus datos, rol, estado y una marca en su propia cuenta

### Requirement: Alta de usuario

El sistema SHALL permitir al administrador crear un usuario del personal indicando nombre, correo único, contraseña y rol (`ADMIN` o `CAJERO`); el usuario creado nace activo.

#### Scenario: Alta correcta

- **WHEN** el administrador registra un usuario con datos válidos
- **THEN** el sistema crea la cuenta activa con el rol elegido y esta aparece en el listado

#### Scenario: Correo duplicado

- **WHEN** el administrador intenta crear un usuario con un correo ya registrado
- **THEN** el sistema rechaza la operación e indica que el correo ya está en uso

### Requirement: Modificación de usuario

El sistema SHALL permitir al administrador editar el nombre y el rol de cualquier usuario, y restablecer su contraseña por una nueva sin conocer la anterior.

#### Scenario: Cambio de rol

- **WHEN** el administrador cambia el rol de un usuario y guarda
- **THEN** el nuevo rol aplica en el siguiente inicio de sesión del usuario

#### Scenario: Restablecimiento de contraseña

- **WHEN** el administrador define una nueva contraseña para un usuario
- **THEN** el usuario accede con la nueva contraseña y la anterior deja de ser válida

### Requirement: Baja y reactivación lógica

El sistema SHALL permitir al administrador desactivar (baja) y reactivar usuarios; la baja es lógica: los datos históricos conservan la atribución del usuario inactivo.

#### Scenario: Baja de un cajero

- **WHEN** el administrador desactiva un usuario
- **THEN** la cuenta queda inactivo visible como tal en el listado y sus pedidos históricos siguen mostrándolo como responsable

#### Scenario: Reactivación

- **WHEN** el administrador reactiva un usuario dado de baja
- **THEN** la cuenta vuelve a estar activa y puede iniciar sesión normalmente

### Requirement: Protección del último administrador

El sistema SHALL impedir que quede sin efecto la última cuenta `ADMIN` activa: ningún administrador puede desactivarse, quitarse el propio rol ni aplicar dichos cambios sobre el último administrador activo restante.

#### Scenario: Auto-desactivación bloqueada

- **WHEN** un administrador intenta desactivar su propia cuenta
- **THEN** el sistema rechaza la operación

#### Scenario: Último admin protegido

- **WHEN** el administrador intenta desactivar o degradar a `CAJERO` al único administrador activo (siendo otro u él mismo)
- **THEN** el sistema rechaza la operación e indica que debe existir al menos un administrador activo

### Requirement: Acceso restringido a administradores

La gestión de usuarios SHALL estar disponible únicamente para sesiones con rol `ADMIN`; cualquier otra sesión es redirigida o rechazada.

#### Scenario: Cajero intenta gestionar usuarios

- **WHEN** una sesión con rol `CAJERO` intenta abrir la sección de usuarios o ejecutar sus operaciones
- **THEN** el sistema rechaza el acceso
