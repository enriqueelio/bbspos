## MODIFIED Requirements

### Requirement: Creación de pedido desde el carrito

El sistema SHALL permitir crear un pedido con las bebidas del carrito, persistiendo cada bebida con su configuración (categoría, sabor, tamaño y tipo de boba), sus toppings con su precio capturado, la cantidad, el precio unitario (precio base de la matriz más toppings) y el total del pedido en bolivianos.

#### Scenario: Pedido creado correctamente

- **WHEN** el cliente confirma el checkout con al menos una bebida en el carrito
- **THEN** el sistema crea el pedido con sus bebidas y toppings, el total calculado y un estado inicial, y vacía el carrito

#### Scenario: Checkout con carrito vacío

- **WHEN** el cliente intenta confirmar el checkout sin bebidas en el carrito
- **THEN** el sistema rechaza la creación del pedido e informa que el carrito está vacío

#### Scenario: El pedido es inmutable en sus precios

- **WHEN** el catálogo cambia de precios después de creado un pedido
- **THEN** el pedido conserva los precios unitarios y de toppings que tenía al momento de su creación

### Requirement: Listado de pedidos en el admin

El sistema SHALL mostrar al personal del restaurante la lista de pedidos con sus bebidas, toppings, totales, estado y antigüedad, permitiendo filtrar por estado.

#### Scenario: Listado con filtro por estado

- **WHEN** el admin consulta los pedidos filtrando por un estado
- **THEN** el sistema devuelve únicamente los pedidos en ese estado

#### Scenario: Detalle de un pedido

- **WHEN** el admin selecciona un pedido
- **THEN** el sistema muestra sus bebidas con configuración, toppings, cantidades, precios unitarios y total
