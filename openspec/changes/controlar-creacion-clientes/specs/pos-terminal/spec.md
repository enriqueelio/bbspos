# Spec Delta

## MODIFIED Requirements

### Requirement: Nombre del cliente obligatorio

El terminal SHALL incluir un campo de texto obligatorio para el nombre o mesa del cliente en el momento del envío. El campo se convierte a MAYÚSCULAS automáticamente y, si está vacío habiendo ítems en el ticket, el envío se bloquea y el campo se resalta indicando el dato faltante. Escribir solo el nombre o mesa SHALL crear el pedido como **invitado**: se guarda `customerName` en la orden pero NO se crea ni se vincula ningún cliente en la base de clientes (no acumula lealtad ni puntúa en el ranking).

#### Scenario: Envío sin nombre o mesa

- **WHEN** el usuario intenta enviar un pedido con al menos un ítem pero sin nombre o mesa
- **THEN** el sistema rechaza el envío, muestra "Falta el nombre o la mesa del cliente. Es un dato obligatorio." y resalta el campo

#### Scenario: Nombre escrito en mayúsculas

- **WHEN** el usuario escribe el nombre o mesa
- **THEN** el texto se muestra y se envía en mayúsculas, sin importar cómo se tecleó

#### Scenario: Venta invitado sin registro

- **WHEN** el usuario escribe un nombre rápido (p. ej. "MARIA") que no coincide con ningún cliente registrado y envía el pedido
- **THEN** el pedido se crea con `customerName` "MARIA", la base de clientes no recibe ningún registro nuevo y ningún cliente queda vinculado al pedido

#### Scenario: Cliente sin nombre

- **WHEN** el campo de nombre está vacío y el ticket no tiene ítems
- **THEN** el pedido no se puede enviar (no hay carrito que enviar)

## ADDED Requirements

### Requirement: Vinculación con cliente registrado

El terminal SHALL sugerir clientes registrados mientras el cajero escribe (autocompletado por nombre o teléfono). Al elegir una coincidencia, el sistema SHALL completar el campo con el nombre corto del cliente (primer nombre + apellido paterno) y vincular su `customerId` al pedido. Si el texto escrito es un teléfono y coincide exactamente con un cliente existente, el sistema SHALL vincularlo automáticamente. La vinculación SHALL habilitar la acumulación de lealtad al cobrar. Ninguna de estas rutas crea un cliente: si no hay coincidencia, la venta queda como invitado.

#### Scenario: Seleccionar cliente del autocompletado

- **WHEN** el cajero escribe "MAR" y elige la coincidencia "MARIA FERNANDA LOPEZ" del dropdown
- **THEN** el campo muestra "MARIA FERNANDA", el pedido queda vinculado a esa clienta y acumula lealtad al cobrarse

#### Scenario: Teléfono de cliente existente

- **WHEN** el cajero escribe "70094966" y existe un cliente con ese teléfono
- **THEN** el pedido se vincula automáticamente a ese cliente y acumula lealtad al cobrarse

#### Scenario: Sin coincidencia no crea

- **WHEN** el cajero escribe un nombre o teléfono que no coincide con ningún cliente
- **THEN** el pedido se crea como invitado y no se añade ningún cliente a la base de clientes

### Requirement: Registro de cliente desde el terminal

El terminal del cajero SHALL ofrecer un acceso "Registrar" junto al campo de nombre que abre un formulario básico (nombre y teléfono opcional). Al confirmar, el sistema SHALL crear el cliente en la base de clientes, vincularlo al pedido actual y mostrar su nombre corto. Si el teléfono ya pertenece a otro cliente, el sistema SHALL rechazar el registro con un error claro. El acceso "Registrar" SHALL estar disponible solo para roles que cobran (cajero/admin/superadmin).

#### Scenario: Registrar cliente nuevo

- **WHEN** el cajero abre "Registrar", escribe "MARIA FERNANDA LOPEZ" y teléfono "70012345" y confirma
- **THEN** se crea el cliente, el pedido queda vinculado y el campo muestra "MARIA FERNANDA"

#### Scenario: Registrar sin teléfono

- **WHEN** el cajero registra solo con el nombre
- **THEN** el cliente se crea sin teléfono (campo opcional) y se vincula al pedido

#### Scenario: Teléfono duplicado

- **WHEN** el cajero intenta registrar un cliente cuyo teléfono ya existe en otro cliente
- **THEN** el sistema muestra un error claro indicando que ese teléfono ya está registrado y no crea el cliente

#### Scenario: Registro por rol no permitido

- **WHEN** un mesero intenta usar el acceso "Registrar"
- **THEN** el acceso no está disponible (el mesero no vincula clientes)

### Requirement: Nombre corto en pedidos y comandas

En los pedidos vinculados a un cliente registrado, el nombre que identifica al pedido en la tarjeta del ticket en curso, en la cola y en la comanda impresa SHALL ser el nombre corto del cliente (primer nombre + apellido paterno). El nombre completo sigue guardado en la ficha del cliente.

#### Scenario: Pedido vinculado con nombre corto

- **WHEN** un pedido vinculado se muestra en la cola y se imprime la comanda
- **THEN** ambas muestran solo el nombre corto del cliente (p. ej. "MARIA FERNANDA")

#### Scenario: Pedido invitado con nombre corto

- **WHEN** un pedido invitado se envía con el nombre "MARIA"
- **THEN** la cola y la comanda muestran "MARIA", sin datos adicionales

### Requirement: Persistencia sin campos adicionales

El modelo de cliente SHALL conservar únicamente su nombre completo (sin campo de apodo ni nombre corto). El nombre corto usado en cola/comanda SHALL derivarse del nombre completo en el momento de la vinculación, sin agregar columnas a la base de datos.

#### Scenario: Cliente sin cambios de esquema

- **WHEN** se vincula o registra un cliente y se abre su ficha en Administración
- **THEN** la ficha muestra el nombre completo tal como se registró y no existe ningún campo extra de apodo