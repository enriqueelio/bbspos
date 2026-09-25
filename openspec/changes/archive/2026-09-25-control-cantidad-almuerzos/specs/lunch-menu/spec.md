# Spec Delta

## MODIFIED Requirements

### Requirement: Entrega del Menú del Día a las terminales

El sistema SHALL entregar a las terminales de mesero y cajero —y al catálogo público de la tienda— únicamente los platos disponibles con la bandera de Menú del Día vigente para la jornada actual, cada uno con su precio fijo y con el estado de cantidad de la jornada: cuántas unidades se programaron para el día, cuántas se vendieron, cuántas hay apartadas en tickets en curso y cuántas quedan disponibles. La cantidad disponible SHALL descontar los apartados de las otras cajas y no los de la caja que consulta, de modo que el número de la tarjeta no se mueva cuando el propio cajero suma líneas y las demás cajas sí vean esas unidades descontadas. Cuando nadie ha programado una cantidad para ese plato en la jornada, el sistema SHALL entregarlo sin cantidad controlada. La cantidad SHALL corresponder a la jornada en que el plato se produce, de modo que un pedido reservado para otra fecha consuma la cantidad de esa otra fecha.

#### Scenario: La terminal muestra los platos del día

- **WHEN** el personal de mesero o cajero abre la sección de Almuerzos en la terminal
- **THEN** la sección muestra los platos disponibles con Menú del Día vigente para la jornada, su precio fijo y su cantidad disponible

#### Scenario: Plato disponible pero no del día

- **WHEN** un plato está disponible pero no tiene la bandera de Menú del Día vigente
- **THEN** el plato no aparece en la sección de Almuerzos de las terminales

#### Scenario: Sin platos del día

- **WHEN** no hay platos con Menú del Día vigente
- **THEN** la sección de Almuerzos no muestra platos en las terminales (se muestra vacía o se oculta)

#### Scenario: Plato del día sin cantidad

- **WHEN** un plato del Menú del Día no tiene cantidad asignada para la jornada actual
- **THEN** el sistema lo entrega a la terminal sin cantidad controlada, sus ventas no consumen ninguna cantidad de la jornada y la terminal del cajero no lo ofrece a la venta hasta que se le asigne una

## ADDED Requirements

### Requirement: Cantidad por jornada de los almuerzos del día

El sistema SHALL controlar, por plato del Menú del Día y por jornada, la cantidad de unidades que la cocina prepara para vender ese día. El sistema SHALL mantener tres valores: la cantidad **programada** (la que se cocina el día, sin número al principio), los **ajustes** manuales que el personal registra sobre ella y la cantidad **vendida**, que SHALL derivarse de los pedidos del día. La cantidad disponible SHALL ser la programada más la suma de los ajustes menos la vendida, y SHALL recalcularse a partir de los pedidos en lugar de mantenerse en un contador, de modo que nunca se desincronice.

La programación y los ajustes SHALL realizarse desde la app del cajero, por personal con sesión iniciada, sin requerir permisos especiales de administración, y cada ajuste SHALL quedar registrado con su monto, la fecha y hora, y el usuario que lo realizó. El sistema SHALL rechazar la programación o el ajuste de un plato que no pertenece al Menú del Día de la jornada, o de una jornada distinta a la actual.

El sistema SHALL impedir agregar al ticket en curso un plato cuya cantidad disponible haya llegado a cero o sea negativa, dejando disponible la vía para reponer unidades y rehabilitarlo. El bloqueo SHALL operar sobre el alta del plato en el ticket y SHALL sostenerse en el servidor, no solo en la pantalla: agregar un plato del Menú del Día al ticket SHALL apartar sus unidades para esa caja antes de agregarlo, y si ya no alcanzan, el servidor SHALL rechazar el alta y la línea no SHALL quedar en el ticket. La cantidad de cada jornada SHALL conservarse como histórico para poder comparar lo programado con lo vendido, y el personal del admin SHALL poder consultar esa comparación por jornada sin poder modificar las cantidades desde el admin.

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
- **THEN** ve la cantidad programada, la vendida, la apartada en tickets en curso y la disponible de cada plato del Menú del Día, sin poder modificarlas

#### Scenario: El admin compara jornadas

- **WHEN** el admin consulta el histórico de almuerzos
- **THEN** ve por fecha y plato lo que se programó, lo que se vendió, lo que está apartado y lo que quedó, de jornadas anteriores

#### Scenario: Ajuste sobre un plato que no es del Menú del Día

- **WHEN** el personal intenta programar o ajustar la cantidad de un plato que no pertenece al Menú del Día vigente
- **THEN** el sistema rechaza la operación y no altera ninguna cantidad

#### Scenario: El admin activa un almuerzo del día

- **WHEN** el admin activa un plato como parte del Menú del Día de la jornada
- **THEN** la activación no solicita monto ni cantidad de unidades, y el plato queda habilitado con el precio de su ficha de catálogo

### Requirement: Apartado de cupo por caja

El sistema SHALL apartar las unidades de un plato del Menú del Día para la caja que las metió a su ticket en curso, de modo que el primero que las agarre gane y dos cajas no puedan vender las mismas unidades. El apartado SHALL vivir en la base de datos (no en el navegador) y SHALL tener un vencimiento corto: si la caja no lo renueva, las unidades vuelven a estar libres sin que nadie limpie nada a mano.

Al agregar un plato del Menú del Día a un ticket de una caja, el sistema SHALL apartar las unidades para esa caja antes de confirmar la línea. Las demás cajas SHALL ver la cantidad disponible ya descontada. Si al apartarlas ya no alcanzan, el sistema SHALL rechazar el alta, no agregar la línea al ticket e informar al cajero que otra caja se las llevó.

Al aumentar la cantidad de un plato ya presente en el ticket, el sistema SHALL apartar la diferencia con la misma regla. Al bajar la cantidad o al quitar la línea, SHALL devolver las unidades apartadas. Al vaciar el ticket, SHALL soltar todos sus apartados. Al confirmar el pedido, los apartados de esa caja se SHALL convertir en unidades vendidas.

Un apartado vencido SHALL contar como unidad libre, y la caja que lo tenía SHALL poder volver a apartar unidades del mismo plato. Un ticket que se restaura del navegador SHALL reconciliarse con los apartados vigentes: lo que ya no está en el ticket se suelta, lo que falta se vuelve a pedir, y si otra caja se llevó alguna unidad, el sistema SHALL avisar al cajero para que quite esa línea antes de cobrar.

Una reserva pactada para una fecha distinta de la jornada vigente SHALL NOT apartar unidades de la jornada vigente, porque esa reserva no consume el cupo de hoy; su cupo SHALL validarse contra la fecha pactada al guardar el pedido.

#### Scenario: La primera caja aparta y la segunda ve el número Bajado

- **WHEN** una caja agrega un plato del Menú del Día a su ticket y otra caja tiene el POS abierto
- **THEN** la segunda caja ve la cantidad disponible de ese plato reducida en las unidades apartadas, y el número de la primera caja no cambia

#### Scenario: Dos cajas chocan por la última unidad

- **WHEN** dos cajas intentan apartar la última unidad disponible de un plato al mismo tiempo
- **THEN** el servidor acepta el apartado de una sola de ellas, rechaza el de la otra con un mensaje que la informa que otra caja se lo llevó, y esa segunda línea no queda en el ticket

#### Scenario: Nunca se superan las unidades programadas

- **WHEN** dos cajas van pidiendo unidades de un plato entre las dos
- **THEN** la suma de lo apartado por todas las cajas nunca excede la cantidad disponible para las demás, y una caja que ya tiene todas las unidades libres en su propio ticket no puede pedir una más

#### Scenario: Quitar la línea libera el cupo

- **WHEN** el cajero quita del ticket una línea de almuerzo, o le baja la cantidad, o limpia el ticket
- **THEN** las unidades correspondientes se liberan y vuelven a estar disponibles para las demás cajas

#### Scenario: Cobrar convierte el apartado en venta

- **WHEN** el cajero confirma el pedido
- **THEN** los apartados de esa caja se eliminan y esas unidades pasan a contar como vendidas, sin alterar la cantidad de la jornada más allá de la venta

#### Scenario: Un apartado sin renovación se libera solo

- **WHEN** una caja deja un plato en su ticket y no vuelve a abrir el POS
- **THEN** su apartado vence y las unidades vuelven a estar disponibles para las demás cajas sin intervención de nadie

#### Scenario: El POS se reabre con el ticket a medias

- **WHEN** el POS se reabre y el carrito del navegador tiene líneas de almuerzo
- **THEN** el sistema reconcilia los apartados con esas líneas, y si alguna ya no se puede apartar porque otra caja se la llevó, avisa al cajero para que la quite del ticket

#### Scenario: Todo lo que queda ya está en mi ticket

- **WHEN** una caja tiene en su ticket todas las unidades que quedan disponibles de un plato del Menú del Día
- **THEN** la tarjeta de ese plato deja de admitir más unidades y se marca como "En tu ticket", sin declararlo agotado, y vuelve a admitir unidades cuando el cajero libera alguna línea
