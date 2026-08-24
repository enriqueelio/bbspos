## MODIFIED Requirements

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
