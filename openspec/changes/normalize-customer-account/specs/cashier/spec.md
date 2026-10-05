# Spec Delta

## MODIFIED Requirements

### Requirement: Cierre de caja del día

La app del cajero SHALL ofrecer un cierre de caja por día que concilie el efectivo físicamente contado por denominación contra el efectivo esperado según el sistema. El cierre SHALL calcular los totales esperados por método de pago (efectivo, QR y tarjeta) sobre los pedidos entregados del día, prorrateando los pagos divididos entre sus métodos, y SHALL contemplar las cuentas de pensionados: **los consumos cobrados contra cuenta (pedidos con `paymentMethod = PENSION` vinculados a `CustomerAccount`) no entran a la caja y las recargas o pagos de deuda (movimientos en `CustomerLedger` con tipo `RECARGA` o `PAGO_DEUDA`) sí son ingresos del día**. Al guardar, el sistema SHALL persistir el cierre con la hora, el usuario responsable, las denominaciones contadas, el total contado, los contrastes del sistema, el sobrante/faltante resultante y una nota opcional, y SHALL permitir consultar el historial de cierres del día y reimprimir el ticket resumen.

#### Scenario: Pensionados con consumos y recargas (actualizado)
- **WHEN** en el día hay consumos de pensionados cobrados contra cuenta (`Order.paymentMethod = PENSION` con `accountId`) y recargas o pagos de deuda (`CustomerLedger.type = RECARGA` o `PAGO_DEUDA`)
- **THEN** los consumos no se suman como efectivo de caja y las recargas/pagos de deuda sí se suman (efectivo y QR por separado)

### Requirement: Cobro a cuenta en Nueva Venta (NUEVA - no existía explícitamente)
La pantalla de "Nueva Venta" del cajero SHALL mostrar la lista de pensionados disponibles para cobro a cuenta consultando `CustomerAccount` (existencia = pensionado). Solo clientes con `CustomerAccount` aparecen en el selector "Cuenta Pensionado". Al seleccionar uno, el cobro registra `paymentMethod = PENSION` y `accountId` en el `Order`, y descuenta el total del `balance` de la `CustomerAccount` (incrementa deuda en Postpago, reduce saldo en Prepago), validando límite de crédito si aplica.

#### Scenario: Seleccionar pensionado para cobro a cuenta
- **WHEN** cajero abre "Nueva Venta" y elige "Cuenta Pensionado"
- **THEN** ve lista de clientes con `CustomerAccount` (nombre, teléfono, saldo actual, modalidad)

#### Scenario: Cobro a cuenta Prepago
- **WHEN** cajero cobra pedido de 80 Bs a pensionado PREPAGO con `balance = 200`
- **THEN** `Order.paymentMethod = PENSION`, `Order.accountId` seteado, `CustomerAccount.balance = 120`

#### Scenario: Cobro a cuenta Postpago dentro de límite
- **WHEN** cajero cobra pedido de 100 Bs a pensionado POSTPAGO con `creditLimit = 500`, `balance = -200`
- **THEN** `Order.paymentMethod = PENSION`, `Order.accountId` seteado, `CustomerAccount.balance = -300`

#### Scenario: Cobro a cuenta Postpago excede límite
- **WHEN** cajero intenta cobrar 100 Bs a pensionado POSTPAGO con `creditLimit = 500`, `balance = -450`
- **THEN** error: "Límite de crédito excedido. Disponible: 50 Bs", pedido no se crea

#### Scenario: Cliente sin cuenta corriente no aparece
- **WHEN** cajero abre selector "Cuenta Pensionado"
- **THEN** solo aparecen clientes con `CustomerAccount` (no clientes de mostrador)