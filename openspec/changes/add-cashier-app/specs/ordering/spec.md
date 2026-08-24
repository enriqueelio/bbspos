## MODIFIED Requirements

### Requirement: Estados de pedido

El sistema SHALL mantener el estado de cada pedido dentro de una secuencia de dos valores: `INGRESADO` (creado por el cliente) y `ENTREGADO` (entregado por el cajero). El sistema SHALL eliminar el estado `EN_PREPARACION` y SHALL registrar el momento exacto de la entrega (`deliveredAt`) y el usuario cajero responsable al alcanzar el estado `ENTREGADO`.

#### Scenario: Avance de estado

- **WHEN** el cajero marca un pedido en estado `INGRESADO` como entregado
- **THEN** el estado avanza a `ENTREGADO`, queda registrado `deliveredAt` con el momento exacto y el pedido queda atribuido al cajero que lo entregó

#### Scenario: No retroceder de estado

- **WHEN** el personal intenta regresar un pedido en estado `ENTREGADO` a `INGRESADO`
- **THEN** el sistema rechaza la transición

#### Scenario: Pedido anulado no avanza

- **WHEN** el personal intenta marcar como entregado un pedido en estado `ANULADO`
- **THEN** el sistema rechaza la transición y el estado permanece en `ANULADO`
