## MODIFIED Requirements

### Requirement: Nombre del cliente obligatorio

El terminal SHALL incluir un campo de texto obligatorio para el nombre o mesa del cliente en el momento del envío, convertido a mayúsculas automáticamente, con autocompletado en tiempo real que consulta clientes existentes por nombre o teléfono (hasta 8 coincidencias). Al seleccionar una coincidencia se vincula su `customerId` al pedido; si no hay coincidencia, el envío crea el cliente automáticamente. El campo sigue siendo obligatorio: si está vacío habiendo ítems en el ticket, el envío se bloquea y el campo se resalta indicando el dato faltante.

#### Scenario: Envío sin nombre o mesa

- **WHEN** el usuario intenta enviar un pedido con al menos un ítem pero sin nombre o mesa
- **THEN** el sistema rechaza el envío, muestra "Falta el nombre o la mesa del cliente. Es un dato obligatorio." y resalta el campo

#### Scenario: Nombre escrito en mayúsculas

- **WHEN** el usuario escribe el nombre o mesa
- **THEN** el texto se muestra y se envía en mayúsculas, sin importar cómo se tecleó

#### Scenario: Autocompletado de clientes existentes

- **WHEN** el usuario escribe un texto que coincide con clientes registrados (por nombre o teléfono)
- **THEN** aparece el listado de coincidencias y, al elegir una, el pedido queda vinculado a ese `customerId` con el campo completado

#### Scenario: Cliente nuevo sin coincidencia

- **WHEN** el usuario envía un pedido con un nombre (o teléfono) inexistente
- **THEN** el sistema crea el cliente y vincula el pedido sin bloquear el envío

#### Scenario: Cliente sin nombre

- **WHEN** el campo de nombre está vacío y el ticket no tiene ítems
- **THEN** el pedido no se puede enviar (no hay carrito que enviar)
