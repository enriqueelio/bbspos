## ADDED Requirements

### Requirement: Identificación de cliente en el terminal

El terminal del POS SHALL ofrecer un autocompletado en tiempo real sobre el campo NOMBRE: mientras el usuario escribe, SHALL consultar los clientes existentes que coincidan parcialmente con el texto escrito por nombre o teléfono y mostrar hasta 8 coincidencias. Al seleccionar una coincidencia, el terminal SHALL vincular `customerId` al pedido en curso y completar el campo con el nombre del cliente. Si el texto no coincide con ningún cliente, el envío a caja SHALL crear o vincular el cliente automáticamente (`upsert`), sin obligar al usuario a salir del terminal. El texto se sigue enviando en mayúsculas y `Order.customerName` se conserva denormalizado como copia de auditoría/historial.

#### Scenario: Coincidencia por nombre

- **WHEN** el cajero escribe un texto que coincide parcialmente con clientes registrados
- **THEN** aparece el listado de coincidencias (nombre y teléfono) y, al elegir una, el campo queda completo con el nombre del cliente y el pedido queda vinculado a ese `customerId`

#### Scenario: Coincidencia por teléfono

- **WHEN** el cajero escribe un número de teléfono que corresponde a un cliente
- **THEN** ese cliente se muestra entre las coincidencias y puede seleccionarse igual que por nombre

#### Scenario: Cliente nuevo sin coincidencia

- **WHEN** el cajero envía un pedido con un nombre (o teléfono) que no existe en la base
- **THEN** el sistema crea el cliente con `phone` opcional y vincula el pedido, sin bloquear el envío

#### Scenario: Campo sigue obligatorio

- **WHEN** el usuario intenta enviar un pedido con ítems pero sin escribir nada en el campo NOMBRE
- **THEN** el envío se bloquea con el mensaje existente de nombre faltante (sin cambio de comportamiento)

### Requirement: Acumulación de métricas y puntos al cobrar

Cuando un pedido con `customerId` vinculado registra `paidAt` (cobro), el sistema SHALL actualizar al cliente en la misma transacción: `totalVisits` +1, `totalSpent` + `total` del pedido, `lastVisitAt` = fecha del cobro y `points` + `total` (1 Bs = 1 punto, redondeado a entero). Pedidos sin `customerId` NO acumulan nada. Los valores acumulados se mantienen como caché para rankings rápidos, siendo `Order` con `paidAt` no nulo la fuente de verdad.

#### Scenario: Pedido cobrado con cliente vinculado

- **WHEN** se registra el cobro de un pedido que tiene `customerId`
- **THEN** el cliente suma una visita, su gasto total aumenta por el total del pedido, se actualiza su última visita y sus puntos aumentan en 1 por cada Bs del total

#### Scenario: Pedido sin cliente vinculado

- **WHEN** se registra el cobro de un pedido sin `customerId`
- **THEN** no se modifica ningún cliente

#### Scenario: Total del pedido descontado

- **WHEN** el pedido tiene `discountAmount` mayor que cero
- **THEN** la acumulación de gasto y puntos usa el total final efectivamente cobrado (total con descuento), no el total antes del descuento

### Requirement: Niveles de lealtad por regla

El sistema SHALL mantener reglas de beneficio configurables (`CustomerBenefitRule`) con nombre, descripción y umbral (Bs al mes, visitas al mes o puntos acumulados). Al consultar o acumular, el sistema SHALL calcular el nivel vigente del cliente según el período actual (mes en curso, zona `America/La_Paz`) y mostrarlo junto a sus métricas. Los cambios en reglas NO recalculan métricas históricas.

#### Scenario: Cliente alcanza un nivel

- **WHEN** el gasto del mes del cliente supera el umbral de una regla
- **THEN** el sistema lo clasifica en ese nivel y puede alertarlo en el terminal al momento de vincularlo

#### Scenario: Reglas configurables

- **WHEN** el administrador modifica los umbrales de una regla
- **THEN** los nuevos umbrales se aplican a partir de ese momento sin recalcular el histórico

### Requirement: Canje de puntos

El sistema SHALL permitir canjear puntos acumulados: valida que el saldo `points` sea suficiente, descuenta los puntos canjeados y registra un `CustomerReward` con tipo, puntos usados, descripción, fecha y referencia opcional a un pedido. Un canje con saldo insuficiente SHALL ser rechazado con mensaje claro y sin efectos.

#### Scenario: Canje exitoso

- **WHEN** se solicita un canje con puntos suficientes
- **THEN** el saldo de puntos se descuenta y queda registrado el canje con fecha, usuario responsable y descripción

#### Scenario: Saldo insuficiente

- **WHEN** se solicita un canje de más puntos de los que el cliente tiene
- **THEN** el sistema rechaza el canje con un mensaje de saldo insuficiente y no modifica nada

### Requirement: Ranking de clientes frecuentes

El admin SHALL ofrecer un ranking de clientes con periodo seleccionable (mes actual, últimos 30 días o histórico), ordenado de mayor a menor por gastado, con columnas de visitas, gastado y puntos, buscador por nombre o teléfono y acción de canje. El cálculo por período SHALL respetar la zona horaria `America/La_Paz` (UTC-4) sobre `paidAt` de `Order`, no solo los acumulados históricos de `Customer`.

#### Scenario: Top del mes

- **WHEN** el administrador abre el ranking con periodo "mes actual"
- **THEN** ve los 10 clientes que más gastaron en el mes, con visitas, gastado y puntos

#### Scenario: Histórico

- **WHEN** el administrador cambia el periodo a histórico
- **THEN** el ranking se reordena según los acumulados totales de los clientes

#### Scenario: Buscador en el ranking

- **WHEN** el administrador escribe un nombre o teléfono en el buscador del ranking
- **THEN** la lista se filtra mostrando solo los clientes que coinciden
