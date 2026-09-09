## MODIFIED Requirements

### Requirement: Identificación del pedido

El sistema SHALL asignar a cada pedido un identificador único y registrar la fecha y hora de creación. El sistema SHALL además asignar a cada pedido un número de secuencia diario (`seq`) que comienza en 1 al inicio de cada día (zona horaria local del servidor) y se incrementa con cada pedido, de modo que el número visible del pedido se reinicia diariamente.

#### Scenario: Pedido identificable

- **WHEN** se consulta un pedido
- **THEN** el sistema devuelve su identificador único y su fecha de creación

#### Scenario: Número de secuencia diario

- **WHEN** un pedido se crea después de otro el mismo día
- **THEN** el sistema le asigna el siguiente número de secuencia del día (pedido 1, 2, 3, …)

#### Scenario: Reinicio diario de la secuencia

- **WHEN** se crea el primer pedido de un día nuevo
- **THEN** el sistema reinicia la secuencia a 1, independientemente del último número del día anterior

#### Scenario: Número mostrado en tres dígitos

- **WHEN** el sistema muestra el número del pedido en tickets, cola, comandas y reimpresiones
- **THEN** el número se formatea a tres dígitos (`001`, `024`, `999`), permitiendo hasta 999 pedidos por día antes de reiniciar el contador visual

### Requirement: Creación de pedido desde el carrito

El sistema SHALL permitir crear un pedido con los ítems del carrito, pudiendo ser cada ítem una bebida (con su configuración: categoría, sabor, tamaño y tipo de boba, y sus toppings con precio capturado) o un platillo del menú (con su nombre, sección/categoría, su precio fijo capturado y, cuando aplique, su variante con el precio de la variante capturado), persistiendo en cada caso la cantidad, el precio unitario capturado y el total del pedido en bolivianos. El pedido SHALL aceptar además indicaciones especiales opcionales del cliente.

#### Scenario: Pedido creado correctamente

- **WHEN** el cliente confirma el checkout con al menos un ítem en el carrito
- **THEN** el sistema crea el pedido con sus ítems (bebidas y/o platillos), el total calculado y un estado inicial, y vacía el carrito

#### Scenario: Checkout con carrito vacío

- **WHEN** el cliente intenta confirmar el checkout sin ítems en el carrito
- **THEN** el sistema rechaza la creación del pedido e informa que el carrito está vacío

#### Scenario: El pedido es inmutable en sus precios

- **WHEN** el catálogo cambia de precios después de creado un pedido
- **THEN** el pedido conserva los precios unitarios que tenía al momento de su creación, tanto para bebidas como para platillos

#### Scenario: Línea de platillo persistida en el pedido

- **WHEN** el carrito incluye un platillo del Menú del Día o de la carta
- **THEN** el ítem del pedido persiste el nombre del platillo, su sección/categoría, el precio fijo capturado y la cantidad, y se muestra correctamente en la comanda y en el listado de pedidos

#### Scenario: Línea de platillo con variante persistida

- **WHEN** el carrito incluye un platillo de la carta con variante elegida (ej: Milanesa de Res)
- **THEN** el ítem del pedido persiste además el nombre de la variante y el precio de la variante capturado al momento de la venta

#### Scenario: Pedido con indicaciones especiales

- **WHEN** el cliente envía el pedido con indicaciones especiales escritas
- **THEN** el pedido persiste las indicaciones y estas se muestran en la comanda y en la tarjeta expandida de la cola