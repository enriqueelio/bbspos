# Spec Delta

## ADDED Requirements

### Requirement: Consumo de la cantidad diaria de almuerzos al crear y anular pedidos

Todo pedido que incluya unidades de un plato del Menú del Día SHALL consumirlas de la cantidad disponible de la jornada en que ese plato se produce: la jornada de la fecha pactada cuando el pedido es una reserva, y la jornada de creación del pedido en cualquier otro caso. El consumo SHALL derivarse de los ítems del pedido, de modo que se compute igual sin importar desde qué terminal, rol o dispositivo se creó el pedido.

Anular un pedido SHALL restituir automáticamente las unidades que ese pedido consumió en la jornada correspondiente, devolviendo la cantidad disponible al valor que tendría si el pedido nunca se hubiera creado, y sin que el personal deba corregir la cantidad a mano.

#### Scenario: La venta descuenta la cantidad del día

- **WHEN** se crea un pedido con tres unidades de un plato del Menú del Día
- **THEN** la cantidad disponible de ese plato para la jornada disminuye en tres

#### Scenario: La reserva descuenta en su fecha

- **WHEN** se crea un pedido reserva con unidades de un plato del Menú del Día para una fecha posterior
- **THEN** las unidades se descuentan de la cantidad disponible de esa fecha y no de la del día de creación

#### Scenario: La anulación restituye

- **WHEN** un pedido con unidades de un plato del Menú del Día es anulado
- **THEN** la cantidad disponible del plato vuelve a incluir esas unidades

#### Scenario: La entrega no restituye

- **WHEN** un pedido con unidades de un plato del Menú del Día se marca como entregado
- **THEN** la cantidad disponible del plato no cambia, porque las unidades se consumieron al crearse el pedido

#### Scenario: Venta desde otra terminal

- **WHEN** un pedido con unidades de un plato del Menú del Día se crea desde una terminal distinta a la del cajero que programa la cantidad
- **THEN** esa venta también descuenta de la cantidad disponible de la jornada

#### Scenario: Venta desde el POS del mesero

- **WHEN** un pedido con unidades de un plato del Menú del Día se crea desde el POS del mesero, que no muestra contadores ni aparta unidades
- **THEN** el sistema comprueba el cupo de todas formas al guardar y rechaza el pedido si ya no alcanza, contando como tomado lo que cualquier caja tenga apartado

### Requirement: El pedido se rechaza si el cupo ya no alcanza

Al guardar un pedido, el sistema SHALL comprobar, dentro de la misma transacción que lo crea o actualiza, que la cantidad disponible de cada plato del Menú del Día incluido en el pedido alcanza para la jornada donde va a contar la venta, y SHALL rechazar el pedido si no alcanza. La comprobación SHALL excluir de lo vendido el pedido que se está editando, para que sus ítems anteriores no se cuenten dos veces, y SHALL considerar el apartado propio de la caja como disponible porque esas unidades ya son suyas.

Un rechazo por cupo SHALL informar al cajero qué plato se quedó sin unidades y SHALL distinguirse de un fallo técnico, para que la interfaz lo muestre como aviso de cantidad y no como un error genérico al cobrar.

#### Scenario: El cupo se agota entre el alta y el cobro

- **WHEN** una caja tiene un plato en su ticket y, antes de cobrar, otra caja agota las unidades que quedaban
- **THEN** al guardar el pedido el sistema lo rechaza e informa que ese plato ya no queda, sin crear el pedido

#### Scenario: Editar un pedido no cuenta sus propias unidades dos veces

- **WHEN** se actualiza un pedido ya registrado para cambiar sus unidades de un plato del Menú del Día
- **THEN** la comprobación de cupo no cuenta como vendidas las unidades que ese mismo pedido ya tenía, y solo exige el incremento

#### Scenario: La reserva se valida contra su fecha

- **WHEN** se guarda un pedido reserva con un plato del Menú del Día para una fecha en la que ese plato no tiene cantidad programada
- **THEN** el sistema rechaza el pedido e informa que el plato no tiene cantidad asignada para esa fecha
