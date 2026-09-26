## MODIFIED Requirements

### Requirement: Cantidad por jornada de los almuerzos del día

El sistema SHALL controlar, por plato del Menú del Día y por jornada, la cantidad de unidades que la cocina prepara para vender ese día. El sistema SHALL mantener tres valores: la cantidad **programada** (la que se cocina el día, sin número al principio), los **ajustes** manuales que el personal registra sobre ella y la cantidad **vendida**, que SHALL derivarse de los pedidos del día. La cantidad disponible SHALL ser la programada más la suma de los ajustes menos la vendida, y SHALL recalcularse a partir de los pedidos en lugar de mantenerse en un contador, de modo que nunca se desincronice.

La programación y los ajustes SHALL realizarse desde la app del cajero, por personal con sesión iniciada, sin requerir permisos especiales de administración, y cada ajuste SHALL quedar registrado con su monto, la fecha y hora, y el usuario que lo realizó. El sistema SHALL rechazar la programación o el ajuste de un plato que no pertenece al Menú del Día de la jornada, o de una jornada distinta a la actual.

El sistema SHALL impedir agregar al ticket en curso un plato cuya cantidad disponible haya llegado a cero o sea negativa, dejando disponible la vía para reponer unidades y rehabilitarlo. El bloqueo SHALL operar sobre el alta del plato en el ticket y SHALL sostenerse en el servidor, no solo en la pantalla: agregar un plato del Menú del Día al ticket SHALL apartar sus unidades para esa caja antes de agregarlo, y si ya no alcanzan, el servidor SHALL rechazar el alta y la línea no SHALL quedar en el ticket. La cantidad de cada jornada SHALL conservarse como histórico para poder comparar lo programado con lo vendido.

Las cantidades de la jornada y su comparación por jornada SHALL appartener exclusivamente a la app del cajero, que las programa, ajusta y muestra en la tarjeta de cada plato. La gestión de menú del admin SHALL limitarse a definir qué almuerzos se ofrecen en la jornada y a qué precio: no SHALL mostrar la cantidad programada, la vendida, la apartada ni la disponible, ni el histórico por jornada, y no SHALL ofrecer ninguna vía para programarlas o ajustarlas.

#### Scenario: El personal programa la cantidad del día

- **WHEN** el cajero define la cantidad de unidades de un plato del Menú del Día
- **THEN** el sistema registra la cantidad programada de esa jornada y la cantidad disponible del plato pasa a ser esa cantidad menos lo ya vendido

#### Scenario: El personal corrige un cálculo

- **WHEN** el cajero registra un ajuste sobre la cantidad disponible de un plato del día
- **THEN** la cantidad disponible del plato refleja el ajuste, queda registrado quién lo hizo, cuándo y con qué nota, y no se altera la cantidad ya vendida

#### Scenario: La cantidad baja con cada venta

- **WHEN** se crea un pedido que incluye unidades de un plato del Menú del Día
- **THEN** la cantidad disponible del plato para esa jornada disminuye en la cantidad de unidades vendidas

#### Scenario: La cantidad sube al anular un pedido

- **WHEN** un pedido que consumió unidades de un plato del Menú del Día es anulado
- **THEN** la cantidad disponible del plato para esa jornada se restituye automáticamente, sin que nadie tenga que corregirla a mano

#### Scenario: La reserva descuenta en su fecha

- **WHEN** un pedido reserva un plato del Menú del Día para una fecha distinta a la de su creación
- **THEN** la cantidad que se consume es la de la fecha pactada de la reserva

#### Scenario: Comienza una nueva jornada

- **WHEN** cambia la fecha y se activa un plato del Menú del Día para la nueva jornada
- **THEN** ese plato aparece sin cantidad y bloqueado para la venta hasta que el personal le asigne una, y la cantidad de la jornada anterior se conserva como histórico

#### Scenario: Se agota la cantidad

- **WHEN** la cantidad disponible de un plato del Menú del Día llega a cero o menos
- **THEN** el sistema informa que el plato se agotó, deja de agregarlo al ticket en curso y permite reponer unidades para volver a habilitarlo

#### Scenario: El admin consulta el día en curso

- **WHEN** el admin abre la gestión de almuerzos durante la jornada
- **THEN** ve el nombre, el precio y las acciones de cada plato del Menú del Día, y no ve la cantidad programada, la vendida, la apartada ni la disponible

#### Scenario: El admin compara jornadas

- **WHEN** el admin busca consultar el histórico de almuerzos por jornada
- **THEN** la gestión de menú no le ofrece esa comparación, aunque el histórico de cantidades de esas jornadas siga conservado

#### Scenario: El admin no programa cantidades

- **WHEN** el admin intenta cambiar la cantidad programada, la apartada o la disponible de un plato del Menú del Día
- **THEN** la interfaz no le ofrece ninguna vía para hacerlo y la jornada conserva las cantidades que fijó el cajero

#### Scenario: Ajuste sobre un plato que no es del Menú del Día

- **WHEN** el personal intenta programar o ajustar la cantidad de un plato que no pertenece al Menú del Día vigente
- **THEN** el sistema rechaza la operación y no altera ninguna cantidad

#### Scenario: El admin activa un almuerzo del día

- **WHEN** el admin activa un plato como parte del Menú del Día de la jornada
- **THEN** la activación no solicita monto ni cantidad de unidades, y el plato queda habilitado con el precio de su ficha de catálogo
