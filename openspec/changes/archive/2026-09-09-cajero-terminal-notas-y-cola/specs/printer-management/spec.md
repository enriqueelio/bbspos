## MODIFIED Requirements

### Requirement: Impresión automática de comanda

El sistema SHALL enviar a la impresora de comandas configurada el ticket del pedido (número en tres dígitos, cliente, fecha, bebidas con toppings e indicaciones especiales si las hay, total) inmediatamente después de confirmarse el pedido.

#### Scenario: Pedido confirmado con impresora configurada

- **WHEN** un cliente confirma un pedido y existe una impresora de comandas configurada
- **THEN** el servidor imprime la comanda con los datos del pedido sin intervención del cliente, incluidas las indicaciones especiales cuando las haya

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