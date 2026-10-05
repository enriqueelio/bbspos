# Spec Delta

## MODIFIED Requirements

### Requirement: Acumulación de métricas y puntos al cobrar

Cuando un pedido con `customerId` vinculado registra `paidAt` (cobro), el sistema SHALL actualizar al cliente en la misma transacción: `totalVisits` +1, `totalSpent` + `total` del pedido, `lastVisitAt` = fecha del cobro y `points` + `total` (1 Bs = 1 punto, redondeado a entero). **La elegibilidad para acumular puntos se determina por la existencia de `CustomerAccount` y su `pensionType`: un cliente con cuenta POSTPAGO que paga con método PENSION (a cuenta) NO acumula; el resto SÍ acumula.** Pedidos sin `customerId` NO acumulan nada. Los valores acumulados se mantienen como caché para rankings rápidos, siendo `Order` con `paidAt` no nulo la fuente de verdad.

#### Scenario: Pedido cobrado con cliente vinculado sin cuenta corriente
- **WHEN** se registra el cobro de un pedido que tiene `customerId` y el cliente NO tiene `CustomerAccount`
- **THEN** el cliente suma una visita, su gasto total aumenta por el total del pedido, se actualiza su última visita y sus puntos aumentan en 1 por cada Bs del total

#### Scenario: Pedido cobrado con cliente Prepago (cuenta corriente)
- **WHEN** se registra el cobro de un pedido con `customerId` vinculado a `CustomerAccount` con `pensionType = PREPAGO`
- **THEN** el cliente acumula visita, gasto y puntos normalmente (paga en mostrador)

#### Scenario: Pedido cobrado con cliente Postpago pagando en efectivo/QR
- **WHEN** se registra el cobro de un pedido con `customerId` vinculado a `CustomerAccount` con `pensionType = POSTPAGO` y `paymentMethod` = EFECTIVO o QR
- **THEN** el cliente acumula visita, gasto y puntos normalmente

#### Scenario: Pedido cobrado con cliente Postpago a cuenta (PENSION)
- **WHEN** se registra el cobro de un pedido con `customerId` vinculado a `CustomerAccount` con `pensionType = POSTPAGO` y `paymentMethod` = PENSION
- **THEN** NO se acumula visita, gasto ni puntos (el consumo va a su cuenta corriente)

#### Scenario: Pedido sin cliente vinculado
- **WHEN** se registra el cobro de un pedido sin `customerId`
- **THEN** no se modifica ningún cliente

#### Scenario: Total del pedido descontado
- **WHEN** el pedido tiene `discountAmount` mayor que cero
- **THEN** la acumulación de gasto y puntos usa el total final efectivamente cobrado (total con descuento), no el total antes del descuento

### Requirement: Ranking de clientes frecuentes

El admin SHALL ofrecer un ranking de clientes con periodo seleccionable (mes actual, últimos 30 días o histórico), ordenado de mayor a menor por gastado, con columnas de visitas, gastado y puntos, buscador por nombre o teléfono y acción de canje. El cálculo por período SHALL respetar la zona horaria `America/La_Paz` (UTC-4) sobre `paidAt` de `Order`, no solo los acumulados históricos de `Customer`. **El filtro excluye pedidos de pensionados POSTPAGO cobrados a cuenta (`paymentMethod = PENSION`), ya que esos no generan fidelidad.**

#### Scenario: Top del mes excluye consumos a cuenta Postpago
- **WHEN** el administrador abre el ranking con periodo "mes actual"
- **THEN** ve los 10 clientes que más gastaron en el mes (excluyendo consumos a cuenta de Postpago), con visitas, gastado y puntos

#### Scenario: Histórico
- **WHEN** el administrador cambia el periodo a histórico
- **THEN** el ranking se reordena según los acumulados totales de los clientes (excluyendo consumos a cuenta de Postpago)

#### Scenario: Buscador en el ranking
- **WHEN** el administrador escribe un nombre o teléfono en el buscador del ranking
- **THEN** la lista se filtra mostrando solo los clientes que coinciden