# User Management Specification

## Purpose

Administración del personal desde el panel admin: permite listar, crear, modificar y dar de baja usuarios del personal, asignando roles y restableciendo contraseñas sin tocar la base de datos a mano. Define una jerarquía de roles con una cuenta protegida de máximo nivel (`SUPER_ADMIN`).

## Requirements

### Requirement: Listado de usuarios

El sistema SHALL mostrar a la persona con acceso la lista completa de usuarios del personal con su nombre, usuario, rol, turno y estado (activo o inactivo), indicando cuál es el usuario conectado, y distinguir visualmente la cuenta `SUPER_ADMIN`.

#### Scenario: Lista visible para el personal autorizado

- **WHEN** una sesión `ADMIN` o `SUPER_ADMIN` abre la sección de usuarios
- **THEN** ve todos los usuarios con sus datos, rol, estado y una marca en su propia cuenta, y la cuenta `SUPER_ADMIN` se distingue con su propio badge

### Requirement: Alta de usuario

El sistema SHALL permitir crear un usuario del personal indicando nombre, usuario único, contraseña y rol; el usuario creado nace activo. Una sesión `ADMIN` SHALL poder asignar únicamente los roles `CAJERO` o `MESERO`; una sesión `SUPER_ADMIN` SHALL poder asignar cualquier rol, incluidos `ADMIN` y `SUPER_ADMIN`.

#### Scenario: Alta correcta

- **WHEN** una sesión autorizada registra un usuario con datos válidos
- **THEN** el sistema crea la cuenta activa con el rol elegido y esta aparece en el listado

#### Scenario: Respeto de la jerarquía por el ADMIN

- **WHEN** una sesión `ADMIN` intenta crear un usuario con rol `ADMIN` o `SUPER_ADMIN`
- **THEN** el sistema rechaza la operación e indica que no tiene permisos para asignar ese rol

#### Scenario: Usuario duplicado

- **WHEN** se intenta crear un usuario con un nombre de usuario ya registrado
- **THEN** el sistema rechaza la operación e indica que ese usuario ya está registrado

### Requirement: Modificación de usuario

El sistema SHALL permitir editar el nombre, el turno y, si aplica, el rol de un usuario, y restablecer su contraseña por una nueva sin conocer la anterior, respetando la jerarquía de roles.

#### Scenario: Cambio de rol

- **WHEN** una sesión autorizada cambia el rol de un usuario y guarda
- **THEN** el nuevo rol aplica en el siguiente inicio de sesión del usuario

#### Scenario: Cambio de rol de un ADMIN por un ADMIN

- **WHEN** una sesión `ADMIN` intenta editar a otro usuario con rol `ADMIN`
- **THEN** el sistema rechaza la operación e indica que solo el `SUPER_ADMIN` gestiona administradores

#### Scenario: Restablecimiento de contraseña

- **WHEN** una sesión autorizada define una nueva contraseña para un usuario
- **THEN** el usuario accede con la nueva contraseña y la anterior deja de ser válida

### Requirement: Baja y reactivación lógica

El sistema SHALL permitir desactivar (baja) y reactivar usuarios cuya cuenta no esté protegida; la baja es lógica: los datos históricos conservan la atribución del usuario inactivo. La cuenta `SUPER_ADMIN` SHALL nunca poder darse de baja ni reactivarse.

#### Scenario: Baja de un cajero

- **WHEN** una sesión autorizada desactiva un usuario `CAJERO` o `MESERO`
- **THEN** la cuenta queda visible como inactiva y sus pedidos históricos siguen mostrándolo como responsable

#### Scenario: Baja de un ADMIN por un ADMIN

- **WHEN** una sesión `ADMIN` intenta desactivar a otro usuario con rol `ADMIN`
- **THEN** el sistema rechaza la operación e indica que solo el `SUPER_ADMIN` gestiona administradores

#### Scenario: Reactivación

- **WHEN** una sesión autorizada reactiva un usuario dado de baja
- **THEN** la cuenta vuelve a estar activa y puede iniciar sesión normalmente

### Requirement: Cuenta Super Admin protegida

Nadie SHALL poder desactivar a una cuenta `SUPER_ADMIN`, ni cambiarle el rol ni el turno. Una cuenta `SUPER_ADMIN` solo SHALL poder ser modificada por otra sesión `SUPER_ADMIN`, y únicamente en nombre y contraseña.

#### Scenario: Baja del Super Admin bloqueada

- **WHEN** cualquier sesión intenta dar de baja a la cuenta `SUPER_ADMIN`
- **THEN** el sistema rechaza la operación e indica que es una cuenta protegida

#### Scenario: Rol congelado del Super Admin

- **WHEN** una sesión `SUPER_ADMIN` intenta cambiar el rol o el turno de otra cuenta `SUPER_ADMIN`
- **THEN** el sistema rechaza la operación y deja la cuenta protegida con sus datos de escalafón intactos

#### Scenario: Edición de nombre/contraseña entre Super Admins

- **WHEN** una sesión `SUPER_ADMIN` edita únicamente el nombre o la contraseña de otra cuenta `SUPER_ADMIN`
- **THEN** el sistema acepta la operación

### Requirement: Protección de la cuenta propia

El sistema SHALL impedir que cualquier usuario desactive su propia cuenta o se cambie su propio rol.

#### Scenario: Auto-desactivación bloqueada

- **WHEN** un usuario intenta desactivar su propia cuenta
- **THEN** el sistema rechaza la operación

#### Scenario: Autocambio de rol bloqueado

- **WHEN** un usuario intenta cambiarse su propio rol en su cuenta
- **THEN** el sistema rechaza la operación y conserva su rol

### Requirement: Acceso restringido a administradores

La gestión de usuarios SHALL estar disponible únicamente para sesiones con rol `ADMIN` o `SUPER_ADMIN`; cualquier otra sesión es redirigida o rechazada.

#### Scenario: Cajero intenta gestionar usuarios

- **WHEN** una sesión con rol `CAJERO` intenta abrir la sección de usuarios o ejecutar sus operaciones
- **THEN** el sistema rechaza el acceso