## MODIFIED Requirements

### Requirement: Inicio de sesión en la app del cajero

La aplicación del cajero SHALL autenticar mediante **username** (campo de texto) y contraseña, únicamente a usuarios con rol `CAJERO`, `ADMIN` o `MESERO`, y SHALL rechazar el acceso a usuarios sin rol válido o con credenciales inválidas. El sistema SHALL diferenciar entre credenciales inválidas y cuenta desactivada.

#### Scenario: Cajero inicia sesión

- **WHEN** un usuario con rol `CAJERO` inicia sesión con username y contraseña correctos
- **THEN** la aplicación establece su sesión y lo lleva a la pestaña de preparación con su nombre visible

#### Scenario: Mesero inicia sesión

- **WHEN** un usuario con rol `MESERO` inicia sesión con username y contraseña correctos
- **THEN** la aplicación establece su sesión y lo redirige al terminal POS (pestaña "Nueva Venta")

#### Scenario: Usuario sin rol permitido

- **WHEN** un usuario sin rol `CAJERO`, `ADMIN` ni `MESERO` intenta iniciar sesión
- **THEN** la aplicación rechaza el acceso e indica que la cuenta no tiene permisos de cajero

#### Scenario: Cuenta desactivada

- **WHEN** un usuario con cuenta desactivada ingresa credenciales correctas
- **THEN** la aplicación muestra "Esta cuenta está desactivada" en lugar de "Credenciales inválidas"

#### Scenario: Acceso sin sesión

- **WHEN** un visitante sin sesión abre cualquier ruta de la app del cajero
- **THEN** la aplicación lo redirige al inicio de sesión

#### Scenario: Cookie de sesión de navegador

- **WHEN** el usuario cierra el navegador
- **THEN** la cookie de sesión se elimina automáticamente (sin `Expires` ni `Max-Age`)
