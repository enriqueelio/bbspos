# Printer Management Specification

## Purpose

Gestión de la impresora de comandas instalada en el servidor: el administrador elige entre las impresoras disponibles de Windows, la valida con una página de prueba y el sistema envía automáticamente cada comanda al confirmarse un pedido.

## Requirements

### Requirement: Listado de impresoras del servidor

El sistema SHALL mostrar al administrador la lista de impresoras instaladas en el sistema operativo del servidor, indicando cuál es la predeterminada de Windows y cuál está configurada como impresora de comandas.

#### Scenario: Lista visible para el admin

- **WHEN** un administrador abre la pestaña de impresora
- **THEN** ve todas las impresoras instaladas en el servidor con su nombre y una marca en la configurada para comandas

### Requirement: Selección de la impresora de comandas

El sistema SHALL permitir al administrador guardar como impresora de comandas cualquiera de las impresoras listadas, y SHALL validar la elección imprimiendo una página de prueba.

#### Scenario: Guardar selección

- **WHEN** el administrador elige una impresora y guarda
- **THEN** el sistema la registra como destino de comandas y queda marcada en el listado

#### Scenario: Prueba de impresión

- **WHEN** el administrador solicita imprimir la página de prueba
- **THEN** el sistema envía un documento de prueba a la impresora seleccionada e informa si la impresión se envió correctamente o falló

### Requirement: Impresión automática de comanda

El sistema SHALL enviar a la impresora de comandas configurada el ticket del pedido (número en tres dígitos, cliente, fecha, bebidas con toppings e indicaciones especiales si las hay, total) inmediatamente después de confirmarse el pedido.

#### Scenario: Pedido confirmado con impresora configurada

- **WHEN** un cliente confirma un pedido y existe una impresora de comandas configurada
- **THEN** el servidor imprime la comanda con los datos del pedido sin intervención del cliente, incluidas las indicaciones especiales cuando las haya

### Requirement: Tolerancia a fallos de impresión

La creación del pedido SHALL completarse aunque no exista impresora configurada o la impresión falle; el sistema SHALL registrar el estado de impresión del pedido para que pueda reimprimirse desde el panel admin.

#### Scenario: Sin impresora configurada

- **WHEN** un cliente confirma un pedido sin impresora de comandas configurada
- **THEN** el pedido se crea normalmente y queda marcado como pendiente de impresión

#### Scenario: Falla de impresión

- **WHEN** la impresión de la comanda falla por un problema de la impresora
- **THEN** el pedido se crea normalmente, se marca como con error de impresión y el cliente no ve ningún mensaje de error

### Requirement: Reimpresión de comandas

El sistema SHALL permitir al personal reimprimir la comanda de cualquier pedido desde el panel admin y desde la cola del cajero, usando la impresora configurada actualmente.

#### Scenario: Reimpresión desde el admin

- **WHEN** el personal pulsa "Reimprimir" sobre un pedido en el panel admin
- **THEN** el servidor envía nuevamente la comanda del pedido a la impresora configurada e informa el resultado

#### Scenario: Reimpresión desde el cajero

- **WHEN** el cajero reimprime un pedido desde el submenú de Reimpresión del menú de opciones de la cola
- **THEN** el servidor envía nuevamente la comanda del pedido a la impresora configurada e informa el resultado

#### Scenario: Reimpresión rechazada

- **WHEN** el personal intenta reimprimir sin impresora configurada
- **THEN** el sistema rechaza la operación e indica que primero debe configurarse la impresora