## MODIFIED Requirements

### Requirement: Estados de pedido

El sistema SHALL mantener el estado de cada pedido dentro de una secuencia definida: `RECIBIDO` (comanda impresa esperando en caja), `ACEPTADO` (pago registrado por el cajero) y `ENTREGADO` (bebidas entregadas al cliente), además del estado terminal `ANULADO`. Todo pedido SHALL pasar obligatoriamente por `ACEPTADO` antes de poder entregarse, sin retrocesos ni saltos de estado.

#### Scenario: Avance de estado

- **WHEN** el personal del restaurante registra el pago de un pedido recibido y luego entrega las bebidas
- **THEN** el estado del pedido avanza de `RECIBIDO` a `ACEPTADO` y luego a `ENTREGADO`

#### Scenario: No retroceder de estado

- **WHEN** el personal intenta regresar un pedido a un estado anterior
- **THEN** el sistema rechaza la transición

#### Scenario: Entrega sin pago bloqueada

- **WHEN** el personal intenta entregar un pedido que sigue en `RECIBIDO` sin registrar su pago
- **THEN** el sistema rechaza la operación e indica que primero debe registrarse el pago

## ADDED Requirements

### Requirement: Registro de pago del pedido

El sistema SHALL permitir al cajero aceptar un pedido en estado `RECIBIDO` registrando el método de pago elegido por el cliente, únicamente **Efectivo** o **QR**, junto con la fecha de pago y el usuario que lo registró; el pedido pasa a `ACEPTADO`.

#### Scenario: Aceptación con Efectivo

- **WHEN** el cajero registra el pago de un pedido recibido seleccionando Efectivo
- **THEN** el pedido pasa a `ACEPTADO` con método Efectivo, fecha de pago y responsable registrados

#### Scenario: Aceptación con QR

- **WHEN** el cajero registra el pago de un pedido recibido seleccionando QR
- **THEN** el pedido pasa a `ACEPTADO` con método QR, fecha de pago y responsable registrados

#### Scenario: Aceptación exige método

- **WHEN** el cajero intenta aceptar un pedido sin seleccionar un método de pago válido
- **THEN** el sistema rechaza la operación
