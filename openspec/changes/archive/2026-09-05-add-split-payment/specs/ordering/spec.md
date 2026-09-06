## MODIFIED Requirements

### Requirement: Registro de pago del pedido

El sistema SHALL registrar el método de pago al aceptar un pedido. El cajero puede registrar un pago simple (un método) o un pago dividido (dos métodos con montos explícitos que sumen el total).

#### Scenario: Pago simple

- **WHEN** el cajero acepta un pedido seleccionando un método de pago directamente
- **THEN** el sistema registra el método de pago y marca el pedido como ACEPTADO

#### Scenario: Pago dividido

- **WHEN** el cajero acepta un pedido usando la opción de cobro dividido, indicando dos métodos distintos y montos que sumen el total
- **THEN** el sistema registra ambos métodos de pago con sus montos y marca el pedido como ACEPTADO

#### Scenario: Pago dividido con montos inválidos

- **WHEN** el cajero intenta registrar un pago dividido pero los montos no suman el total, los métodos son iguales, o alguno es cero
- **THEN** el sistema rechaza la operación y muestra un mensaje de error descriptivo
