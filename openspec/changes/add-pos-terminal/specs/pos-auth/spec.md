## Purpose

Autenticación por username en lugar de email en las apps admin y cajero — simplifica el login con un campo de usuario, valida角色, y maneja cookies de sesión de navegador.

## ADDED Requirements

### Requirement: Login por username

Las apps admin y cajero SHALL autenticar usuarios mediante username (campo de texto) y contraseña, en lugar de email. El username SHALL ser ignorando mayúsculas/minúsculas (case-insensitive).

#### Scenario: Login exitoso con username

- **WHEN** un usuario ingresa un username válido y contraseña correcta
- **THEN** el sistema lo autentica y establece su sesión

#### Scenario: Login fallido con username incorrecto

- **WHEN** un usuario ingresa un username que no existe
- **THEN** el sistema muestra "Credenciales inválidas"

#### Scenario: Login case-insensitive

- **WHEN** un usuario ingresa "CAJERO1" y su contraseña es correcta
- **THEN** el sistema lo autentica correctamente (el username se busca en minúsculas)

### Requirement: Validación de角色 post-login

El sistema SHALL validar que el usuario autenticado tenga un角色 permitido (ADMIN, CAJERO, o MESERO) después del login. Si no tiene角色 válido, SHALL cerrar sesión y mostrar mensaje de error.

#### Scenario: Usuario con角色 válido

- **WHEN** un usuario conrol ADMIN, CAJERO o MESERO completa el login
- **THEN** se establece su sesión con su角色 y es redirigido a la aplicación

#### Scenario: Usuario sin角色 válido

- **WHEN** un usuario sinrol ADMIN, CAJERO o MESERO completa el login
- **THEN** el sistema cierra sesión y muestra "Esta cuenta no tiene permisos de cajero"

### Requirement: Cuenta desactivada

El sistema SHALL detectar cuando las credenciales son correctas pero la cuenta está desactivada, y SHALL mostrar un mensaje diferenciado "Esta cuenta está desactivada" en lugar de "Credenciales inválidas".

#### Scenario: Cuenta activa con contraseña correcta

- **WHEN** un usuario con cuenta activa ingresa credenciales correctas
- **THEN** el sistema lo autentica normalmente

#### Scenario: Cuenta desactivada

- **WHEN** un usuario con cuenta desactivada ingresa credenciales correctas
- **THEN** el sistema muestra "Esta cuenta está desactivada" en lugar de autenticarlo

### Requirement: Cookie de sesión de navegador

La app del cajero SHALL usar una cookie de sesión de navegador (sin `Expires` ni `Max-Age`) que se borra automáticamente al cerrar el navegador.

#### Scenario: Cerrar navegador

- **WHEN** el usuario cierra el navegador teniendo una sesión activa en el cajero
- **THEN** la cookie de sesión se elimina automáticamente y la próxima vez que abra la app deberá iniciar sesión nuevamente

#### Scenario: Mantener sesión abierta

- **WHEN** el usuario mantiene el navegador abierto
- **THEN** la sesión persiste mientras la cookie no expira

### Requirement: Protección de rutas por角色

El middleware de la app del cajero SHALL proteger todas las rutas excepto `/login`, `/api/auth/*`, `/_next/*` y `favicon.ico`, verificando que el token de sesión exista y tenga un角色 permitido.

#### Scenario: Ruta protegida sin sesión

- **WHEN** un usuario sin sesión intenta acceder a una ruta protegida
- **THEN** el middleware lo redirige al login

#### Scenario: Ruta protegida con角色 no permitido

- **WHEN** un usuario conrol no permitido intenta acceder a una ruta protegida
- **THEN** el middleware lo redirige al login
