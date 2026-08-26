## Purpose

Permite al cajero dividir el cobro de un pedido entre dos métodos de pago (por ejemplo, parte en efectivo y parte por QR), registrando ambos en el pedido para que los reportes de ingresos reflejen la realidad de la transacción.

## ADDED Requirements

### Requirement: Pago dividido entre dos métodos

El sistema SHALL permitir al cajero registrar un pago dividido entre dos métodos de pago distintos (EFECTIVO y QR) al aceptar un pedido, indicando el monto asignado a cada método.

#### Scenario: Pago dividido correctamente

- **WHEN** el cajero selecciona "Cobro dividido", elige EFECTIVO como primer método con monto 20 y QR como segundo método con monto 10, y confirma para un pedido de 30 Bs
- **THEN** el sistema registra ambos métodos de pago con sus montos, marca el pedido como ACEPTADO y el total queda completamente cubierto

#### Scenario: Montos no suman el total

- **WHEN** el cajero intenta confirmar un pago dividido donde la suma de los montos no coincide con el total del pedido
- **THEN** el sistema rechaza la operación e informa que los montos deben sumar el total exacto

#### Scenario: Métodos de pago idénticos

- **WHEN** el cajero selecciona el mismo método de pago para ambas partes (por ejemplo, EFECTIVO + EFECTIVO)
- **THEN** el sistema rechaza la operación e informa que los métodos deben ser distintos

#### Scenario: Monto igual a cero

- **WHEN** el cajero asigna un monto de 0 a uno de los métodos de pago
- **THEN** el sistema rechaza la operación e informa que cada monto debe ser mayor a cero

### Requirement: Compatibilidad con pago simple

El sistema SHALL seguir soportando el registro de un solo método de pago sin división, manteniendo la funcionalidad actual.

#### Scenario: Pago simple sin cambios

- **WHEN** el cajero selecciona directamente "Cobro Efectivo" o "Cobro QR" sin usar la opción de dividir
- **THEN** el sistema registra un único método de pago como hasta ahora, sin requerir segundo método ni montos

### Requirement: Visualización del desglose de pago

El sistema SHALL mostrar al cajero y al administrador el desglose de pagos cuando un pedido tiene pago dividido.

#### Scenario: Pedido con pago dividido en la cola del cajero

- **WHEN** un pedido tiene pago dividido (paymentMethod + paymentMethod2)
- **THEN** la tarjeta del pedido en la cola muestra "Efectivo 20 Bs + QR 10 Bs" en lugar de un solo método

#### Scenario: Pedido con pago simple en la cola

- **WHEN** un pedido tiene un solo método de pago
- **THEN** la tarjeta del pedido muestra el método como hasta ahora

### Requirement: Contabilización en reportes de pagos

El sistema SHALL contabilizar los montos de ambos métodos de pago por separado en los reportes de desglose de pagos (reporte diario del cajero y reporte de cierre diario del admin).

#### Scenario: Reporte con pedidos divididos

- **WHEN** se genera un reporte de pagos del día
- **THEN** el monto de paymentMethod se contabiliza bajo ese método y el monto de paymentMethod2 se contabiliza bajo el segundo método, reflejando correctamente la distribución real de ingresos

#### Scenario: Reporte con mezcla de pedidos simples y divididos

- **WHEN** el día tiene pedidos con pago simple y pedidos con pago dividido
- **THEN** el desglose de pagos muestra la suma correcta de cada método considerando ambos tipos de pedido
