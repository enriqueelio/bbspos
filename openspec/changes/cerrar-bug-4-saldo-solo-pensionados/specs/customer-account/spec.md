# Spec Delta

## Purpose

Cuenta corriente del cliente: quién puede tener saldo, cómo se bonifica, cómo lo consume el cajero al cobrar a cuenta y por qué un saldo obliga a mantener la cuenta marcada como pensionado.

## ADDED Requirements

### Requirement: La cuenta corriente es exclusiva del pensionado

El sistema SHALL rechazar cualquier abono a la cuenta corriente de un cliente que no está marcado como pensionado, y SHALL rechazar quitar esa marca a un cliente cuyo saldo sea distinto de cero. La regla que sostiene ambas cosas es que un cliente no pensionado no tiene cuenta corriente y su saldo es siempre cero.

El rechazo SHALL ocurrir en el servidor, con un mensaje que explique qué hacer. La interfaz SHALL ocultar la acción de abono a los clientes no pensionados, pero esa ocultación es una ayuda visual y no la garantía: una petición que llegue sin pasar por la interfaz también SHALL ser rechazada.

#### Scenario: Abono a un cliente de mostrador

- **WHEN** se intenta bonificar a un cliente que no está marcado como pensionado
- **THEN** el sistema rechaza la operación, no modifica el saldo ni registra ningún movimiento, e indica que hay que marcarlo como pensionado antes de bonificarle

#### Scenario: Quitar la marca de pensionado con saldo a favor

- **WHEN** se intenta quitar la marca de pensionado a un cliente cuyo saldo es mayor que cero
- **THEN** el sistema rechaza la operación y explica que el saldo a favor se gasta en el mostrador, por lo que la cuenta debe seguir marcada

#### Scenario: Quitar la marca de pensionado con deuda

- **WHEN** se intenta quitar la marca de pensionado a un cliente cuyo saldo es menor que cero
- **THEN** el sistema rechaza la operación y explica que la deuda se cobra en el mostrador, por lo que la cuenta debe seguir marcada

#### Scenario: Cliente de mostrador sin saldo

- **WHEN** se consulta la ficha de un cliente no pensionado cuyo saldo es cero
- **THEN** el sistema no ofrece ninguna acción de abono para ese cliente

### Requirement: Bonificación de saldo y pago de deuda

El sistema SHALL permitir bonificar la cuenta corriente de un pensionado con un monto positivo recibido en efectivo o QR, y SHALL aumentar su saldo con ese monto, registrar el movimiento correspondiente y contabilizarlo como ingreso real del día.

El tipo de movimiento SHALL decidirse por la marca de pensionado y la modalidad de la cuenta, no por el valor de modalidad almacenado: un pensionado prepago genera una recarga de saldo y un pensionado postpago genera un pago de deuda. La bonificación no SHALL generar puntos, visitas ni gasto acumulado, porque los puntos se ganan al comprar y no al mover la cuenta corriente.

#### Scenario: Recarga a un pensionado prepago

- **WHEN** se bonifica a un pensionado prepago con 1.000 Bs en efectivo
- **THEN** su saldo sube a 1.000 Bs, queda registrado como recarga de saldo con medio de pago efectivo, el monto cuenta como ingreso del día y sus puntos, visitas y gasto acumulado no cambian

#### Scenario: Pago de deuda de un pensionado postpago

- **WHEN** se bonifica a un pensionado postpago que tiene 290 Bs de deuda
- **THEN** el movimiento queda registrado como pago de deuda, el saldo baja en el monto bonificado y sus puntos, visitas y gasto acumulado no cambian

#### Scenario: Bono de un monto no válido

- **WHEN** se intenta bonificar un monto cero o negativo
- **THEN** el sistema rechaza la operación sin modificar el saldo ni registrar movimientos

### Requirement: Consumo del saldo en el cobro a cuenta

El sistema SHALL permitir cobrar un pedido contra la cuenta corriente de un pensionado, descontando el total del saldo y registrando el consumo en el libro de movimientos de esa cuenta. El cobro a cuenta no SHALL registrar ese consumo como ingreso de caja del día, porque esa plata ya entró cuando se bonificó la cuenta.

Solo SHALL aparecer en la lista de cobro a cuenta un cliente marcado como pensionado. Para un pensionado prepago, el cobro SHALL exigir que el saldo cubra el total del pedido y SHALL rechazar el cobro cuando no lo cubra, indicando cuánto falta y que hay que recargar en Administración. Para un pensionado postpago, el saldo SHALL poder quedar en deuda y el cobro SHALL rechazarse cuando la deuda resultante supere el límite de crédito configurado.

Consumir saldo de un pensionado prepago SHALL contar como compra: SHALL sumar una visita, el total gastado y los puntos del pedido. Esta regla es la misma que aplica al resto de las compras en efectivo, QR o tarjeta. El consumo a cuenta de un pensionado postpago no SHALL sumar nada, porque su pago diferido ya es su beneficio.

#### Scenario: Consumo de saldo de un pensionado prepago

- **WHEN** se cobra a cuenta un pedido de 120 Bs contra un pensionado prepago con 1.000 Bs de saldo
- **THEN** el pedido queda cobrado, el saldo del cliente pasa a 880 Bs, el consumo queda registrado en su libro, el pedido suma una visita, 120 Bs de gasto y 120 puntos, y el consumo no aparece como ingreso de caja del día

#### Scenario: Saldo insuficiente en un pensionado prepago

- **WHEN** se cobra a cuenta un pedido cuyo total supera el saldo disponible del pensionado prepago
- **THEN** el sistema rechaza el cobro sin modificar el saldo ni el pedido, e indica cuánto saldo falta y que la recarga se hace en Administración

#### Scenario: Cliente no pensionado en la lista de cobro a cuenta

- **WHEN** se abre la lista de clientes para el cobro a cuenta
- **THEN** solo aparecen los clientes marcados como pensionado, aunque alguno de los demás tenga saldo a favor

#### Scenario: Consumo de saldo de un pensionado postpago

- **WHEN** se cobra a cuenta un pedido de 120 Bs contra un pensionado postpago con 290 Bs de deuda
- **THEN** la deuda pasa a 410 Bs, el consumo queda registrado en su libro y el pedido no suma visitas, gasto ni puntos, porque su pago diferido ya es su beneficio