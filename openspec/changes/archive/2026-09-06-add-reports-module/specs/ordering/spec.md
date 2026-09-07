## MODIFIED Requirements

### Requirement: Estados de pedido

El sistema SHALL mantener el estado de cada pedido dentro de una secuencia definida: recibido, en preparación y entregado, y SHALL permitir además anular un pedido desde cualquier estado como transición terminal irreversible.

#### Scenario: Avance de estado

- **WHEN** el personal del restaurante marca un pedido recibido como en preparación y luego como entregado
- **THEN** el estado del pedido avanza en la secuencia definida

#### Scenario: No retroceder de estado

- **WHEN** el personal intenta regresar un pedido a un estado anterior
- **THEN** el sistema rechaza la transición

#### Scenario: Anulación de un pedido

- **WHEN** el personal anula un pedido indicando el motivo
- **THEN** el pedido pasa al estado anulado con su motivo y momento registrados, y no puede volver a ningún otro estado

## ADDED Requirements

### Requirement: Atribución del pedido al personal

El sistema SHALL registrar el usuario del personal que procesa cada pedido para permitir reportes de rendimiento por usuario.

#### Scenario: Pedido atribuido automáticamente

- **WHEN** un miembro del personal autenticado crea o procesa un pedido
- **THEN** el pedido queda asociado a ese usuario sin acción manual adicional

### Requirement: Registro del método de pago

El sistema SHALL permitir registrar en el pedido el método de pago con el que se cobró entre los métodos habilitados por el negocio.

#### Scenario: Cobro con método registrado

- **WHEN** el personal marca el cobro de un pedido indicando el método utilizado
- **THEN** el pedido queda asociado a ese método de pago para el cierre de caja

### Requirement: Descuentos con trazabilidad

El sistema SHALL permitir aplicar un descuento a un pedido registrando su monto y motivo, y SHALL reflejarlo en el total del pedido.

#### Scenario: Descuento aplicado con motivo

- **WHEN** el personal aplica un descuento indicando monto y motivo
- **THEN** el total del pedido se ajusta y quedan registrados el descuento, su motivo y el usuario responsable
