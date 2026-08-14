## ADDED Requirements

### Requirement: Despliegue del QR de pago en la confirmación

El sistema SHALL mostrar el QR de pago configurado en la pantalla de confirmación del pedido, junto al número de pedido, cuando exista un QR de pago activo.

#### Scenario: Confirmación con QR configurado

- **WHEN** el cliente confirma un pedido y existe un QR de pago activo
- **THEN** la pantalla de confirmación muestra el QR de pago junto al número de pedido para que el cliente pueda escanearlo y pagar

#### Scenario: Confirmación sin QR configurado

- **WHEN** el cliente confirma un pedido y no hay un QR de pago activo
- **THEN** la pantalla de confirmación se muestra sin QR de pago
