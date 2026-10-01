# Spec Delta

## ADDED Requirements

### Requirement: Elegibilidad a la fidelización según tipo de cuenta y método de pago

El sistema SHALL determinar, para cada cobro, si ese movimiento genera lealtad. La elegibilidad se decidirá a partir de dos datos: las características del cliente (`isPension` y `pensionType`) y el método de pago del pedido.

- Un cliente que **no** es pensionado (`isPension = false`) SHALL ser fidelizable con cualquier método de pago.
- Un pensionado **PREPAGO** SHALL ser fidelizable con cualquier método de pago, incluido el consumo de su saldo adelantado.
- Un pensionado **POSTPAGO** SHALL ser **no fidelizable** cuando el pedido se cobra con el método de la cuenta de pensionado (`PENSION`), porque ese pago diferido es su propio beneficio y sumarle lealtad lo duplicaría.
- Un pensionado **POSTPAGO** SHALL ser **fidelizable** cuando compra y paga en efectivo, QR o tarjeta: en ese caso la plata entra de verdad al local y sí genera lealtad.

Los puntos SHALL ganarse al **comprar**, nunca al mover la cuenta corriente. Abonar saldo a una cuenta —recargar saldo de un PREPAGO o pagar deuda de un POSTPAGO— SHALL NOT generar puntos, visitas, gasto ni puntos de nivel, aunque haya dinero real de por medio.

El campo `pensionType` SHALL NOT interpretarse por sí solo como indicador de que el cliente es pensionado: el esquema le asigna `PREPAGO` por defecto, de modo que los clientes no pensionados también lo tienen almacenado. La elegibilidad SHALL decidirse siempre por `isPension` primero, y `pensionType` solo se consultará cuando el cliente sea pensionado.

Esta elegibilidad SHALL ser una única decisión compartida por todos los puntos del sistema que otorgan o consumen lealtad, de modo que ninguna vía de acumulación, consulta o canje aplique un criterio distinto.

#### Scenario: Cliente no pensionado con cualquier método de pago

- **WHEN** se cobra un pedido de un cliente con `isPension = false`
- **THEN** el cliente acumula visitas, gasto y puntos, sea cual sea el método de pago

#### Scenario: Pensionado PREPAGO consume su saldo

- **WHEN** un pensionado PREPAGO consume de su saldo y el pedido se cobra con el método de la cuenta de pensionado
- **THEN** el cliente acumula visitas, gasto y puntos por el total del pedido

#### Scenario: Pensionado POSTPAGO consume a cuenta

- **WHEN** un pensionado POSTPAGO consume y el pedido se cobra con el método de la cuenta de pensionado
- **THEN** el cliente NO suma visitas, ni gasto, ni puntos, ni se actualiza su última visita

#### Scenario: Pensionado POSTPAGO compra pagando en el local

- **WHEN** un pensionado POSTPAGO compra y el pedido se cobra en efectivo, QR o tarjeta
- **THEN** el cliente acumula visitas, gasto y puntos por el total del pedido

#### Scenario: Recargar saldo no genera lealtad

- **WHEN** se abona saldo a la cuenta de un pensionado PREPAGO mediante una recarga
- **THEN** el cliente NO suma puntos, visitas ni gasto; los puntos se generan más adelante, cuando consuma de ese saldo

#### Scenario: Pagar deuda no genera lealtad

- **WHEN** un pensionado POSTPAGO liquida su deuda con efectivo o QR
- **THEN** el cliente NO suma puntos, visitas ni gasto por ese abono

#### Scenario: Cliente no pensionado no se confunde con PREPAGO

- **WHEN** un cliente con `isPension = false` tiene `pensionType = "PREPAGO"` almacenado por el valor por defecto del esquema
- **THEN** el sistema lo trata como cliente de mostrador y no como pensionado prepago

## MODIFIED Requirements

### Requirement: Acumulación de métricas y puntos al cobrar

Cuando un pedido con `customerId` vinculado registra `paidAt` (cobro), el sistema SHALL actualizar al cliente en la misma transacción: `totalVisits` +1, `totalSpent` + `total` del pedido, `lastVisitAt` = fecha del cobro y `points` + `total` (1 Bs = 1 punto, redondeado a entero). Pedidos sin `customerId` NO acumulan nada. Los valores acumulados se mantienen como caché para rankings rápidos, siendo `Order` con `paidAt` no nulo la fuente de verdad.

El cobro SHALL aplicar el guard de elegibilidad dentro del propio proceso de acumulación, no solo en la capa que lo invoca: si ese movimiento no genera lealtad, la operación SHALL terminar sin efectos sobre el cliente. El guard SHALL recibir tanto el cliente como el método de pago del pedido, de modo que ninguna ruta de cobro pueda omitirlo ni evaluar la regla con información incompleta. Ninguna ruta —incluido el cobro de la cuenta de pensionado y el cobro de un pedido de un pensionado POSTPAGO con otro método de pago— SHALL omitir este guard.

Los cambios en la elegibilidad del cliente NO recalculan métricas históricas ya acumuladas.

#### Scenario: Pedido cobrado con cliente vinculado

- **WHEN** se registra el cobro de un pedido que tiene `customerId` de un cliente fidelizable para ese movimiento
- **THEN** el cliente suma una visita, su gasto total aumenta por el total del pedido, se actualiza su última visita y sus puntos aumentan en 1 por cada Bs del total

#### Scenario: Pedido sin cliente vinculado

- **WHEN** se registra el cobro de un pedido sin `customerId`
- **THEN** no se modifica ningún cliente

#### Scenario: Total del pedido descontado

- **WHEN** el pedido tiene `discountAmount` mayor que cero
- **THEN** la acumulación de gasto y puntos usa el total final efectivamente cobrado (total con descuento), no el total antes del descuento

#### Scenario: Consumo a cuenta de un pensionado POSTPAGO

- **WHEN** se registra el cobro de un pedido de un pensionado POSTPAGO con el método de la cuenta de pensionado
- **THEN** el cliente NO suma visitas, ni gasto, ni puntos, ni se actualiza su última visita

#### Scenario: Compra en efectivo de un pensionado POSTPAGO

- **WHEN** se registra el cobro de un pedido de un pensionado POSTPAGO en efectivo, QR o tarjeta
- **THEN** el cliente sí suma visitas, gasto y puntos

#### Scenario: Cambio de elegibilidad no altera el histórico

- **WHEN** un cliente que ya acumuló métricas cambia su tipo de cuenta o su forma de pago
- **THEN** sus métricas acumuladas previamente se conservan hasta que una operación explícita de depuración las modifique

### Requirement: Niveles de lealtad por regla

El sistema SHALL mantener reglas de beneficio configurables (`CustomerBenefitRule`) con nombre, descripción y umbral (Bs al mes, visitas al mes o puntos acumulados). Al consultar o acumular, el sistema SHALL calcular el nivel vigente del cliente según el período actual (mes en curso, zona `America/La_Paz`) y mostrarlo junto a sus métricas. Los cambios en reglas NO recalculan métricas históricas.

El cálculo de nivel SHALL contar únicamente los pedidos que generaron lealtad, es decir, los mismos que la acumulación toma en cuenta. El consumo a cuenta de un pensionado POSTPAGO SHALL NOTlinfla su nivel, porque tampoco le sumó puntos; sus compras pagadas en efectivo, QR o tarjeta sí SHALL contarlo. Un pensionado POSTPAGO SHALL poder alcanzar nivel con sus compras pagadas en el local.

#### Scenario: Cliente alcanza un nivel

- **WHEN** el gasto del mes de un cliente, contado solo con pedidos que generaron lealtad, supera el umbral de una regla
- **THEN** el sistema lo clasifica en ese nivel y puede alertarlo en el terminal al momento de vincularlo

#### Scenario: Reglas configurables

- **WHEN** el administrador modifica los umbrales de una regla
- **THEN** los nuevos umbrales se aplican a partir de ese momento sin recalcular el histórico

#### Scenario: El consumo a cuenta no sube de nivel

- **WHEN** un pensionado POSTPAGO consume a cuenta durante el mes y sus compras en efectivo o QR quedan por debajo del umbral
- **THEN** el sistema no le asigna nivel por los consumos cargados a su cuenta

#### Scenario: Las compras en efectivo sí suben de nivel

- **WHEN** un pensionado POSTPAGO compra y paga en efectivo o QR, y ese gasto del mes supera el umbral de una regla
- **THEN** el sistema le asigna ese nivel

### Requirement: Canje de puntos

El sistema SHALL permitir canjear puntos acumulados: valida que el saldo `points` sea suficiente, descuenta los puntos canjeados y registra un `CustomerReward` con tipo, puntos usados, descripción, fecha y referencia opcional a un pedido. Un canje con saldo insuficiente SHALL ser rechazado con mensaje claro y sin efectos.

La validación SHALL atender únicamente al saldo de puntos. No SHALL existir una restricción de elegibilidad al canje: todo cliente con saldo suficiente puede canjear, incluido un pensionado POSTPAGO, que puede haber.points por sus compras pagadas en efectivo, QR o tarjeta.

#### Scenario: Canje exitoso

- **WHEN** se solicita un canje de un cliente con puntos suficientes
- **THEN** el saldo de puntos se descuenta y queda registrado el canje con fecha, usuario responsable y descripción

#### Scenario: Saldo insuficiente

- **WHEN** se solicita un canje de más puntos de los que el cliente tiene
- **THEN** el sistema rechaza el canje con un mensaje de saldo insuficiente y no modifica nada

#### Scenario: Un pensionado POSTPAGO con puntos puede canjear

- **WHEN** se solicita un canje de un pensionado POSTPAGO que tiene puntos suficientes por sus compras pagadas en el local
- **THEN** el canje se concede y se descuenta su saldo normalmente

### Requirement: Ranking de clientes frecuentes

El admin SHALL ofrecer un ranking de clientes con periodo seleccionable (mes actual, últimos 30 días o histórico), ordenado de mayor a menor por gastado, con columnas de visitas, gastado y puntos, buscador por nombre o teléfono y acción de canje. El cálculo por período SHALL respetar la zona horaria `America/La_Paz` (UTC-4) sobre `paidAt` de `Order`, no solo los acumulados históricos de `Customer`.

El ranking SHALL contar únicamente los pedidos que generaron lealtad y SHALL excluir los pedidos anulados del conteo de visitas, gasto y puntos. El consumo a cuenta de un pensionado POSTPAGO SHALL NOT computar en el ranking, pero el cliente SHALL seguir apareciendo en él por el resto de sus movimientos: un pensionado POSTPAGO que compró en efectivo o QR SHALL ocupar posición con esos pedidos, y el buscador por nombre o teléfono SHALL encontrarlo.

#### Scenario: Top del mes

- **WHEN** el administrador abre el ranking con periodo "mes actual"
- **THEN** ve los 10 clientes con mayor gasto contado sobre pedidos que generaron lealtad, con visitas, gastado y puntos

#### Scenario: Histórico

- **WHEN** el administrador cambia el periodo a histórico
- **THEN** el ranking se reordena según los acumulados totales de los clientes

#### Scenario: Buscador en el ranking

- **WHEN** el administrador escribe un nombre o teléfono en el buscador del ranking
- **THEN** la lista se filtra mostrando solo los clientes que coinciden

#### Scenario: El consumo a cuenta no compite en el ranking

- **WHEN** un pensionado POSTPAGO tiene pedidos cargados a su cuenta y además compras pagadas en efectivo o QR
- **THEN** el ranking muestra solo las compras pagadas en el local, y su consumo a cuenta no suma visitas, gasto ni puntos

#### Scenario: Un pensionado POSTPAGO sí aparece si pagó de verdad

- **WHEN** un pensionado POSTPAGO tiene al menos un pedido pagado en efectivo, QR o tarjeta dentro del periodo consultado
- **THEN** aparece en el ranking con el gasto y los puntos de esos pedidos, y el buscador lo devuelve

#### Scenario: Un pensionado POSTPAGO sin compras pagadas no aparece

- **WHEN** un pensionado POSTPAGO solo tiene pedidos cargados a su cuenta
- **THEN** no ocupa ninguna posición en el ranking

#### Scenario: Pedidos anulados no cuentan

- **WHEN** un cliente tiene pedidos en estado `ANULADO` dentro del periodo consultado
- **THEN** esos pedidos no suman visitas, gasto ni puntos en el ranking
