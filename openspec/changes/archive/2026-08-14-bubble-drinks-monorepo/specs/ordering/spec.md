## Purpose

Gestiona los pedidos del restaurante: creación de un pedido desde el carrito del cliente, persistencia de sus bebidas con el precio capturado, y seguimiento de su estado por el personal del restaurante.

## ADDED Requirements

### Requirement: Creación de pedido desde el carrito

El sistema SHALL permitir crear un pedido con las bebidas del carrito, persistiendo cada bebida con su configuración (tamaño, sabor, tipo de boba), cantidad y precio unitario, junto con el total del pedido.

#### Scenario: Pedido creado correctamente

- **WHEN** el cliente confirma el checkout con al menos una bebida en el carrito
- **THEN** el sistema crea el pedido con sus bebidas, el total calculado y un estado inicial, y vacía el carrito

#### Scenario: Checkout con carrito vacío

- **WHEN** el cliente intenta confirmar el checkout sin bebidas en el carrito
- **THEN** el sistema rechaza la creación del pedido e informa que el carrito está vacío

#### Scenario: El pedido es inmutable en sus precios

- **WHEN** el catálogo cambia de precios después de creado un pedido
- **THEN** el pedido conserva los precios unitarios que tenía al momento de su creación

### Requirement: Identificación del pedido

El sistema SHALL asignar a cada pedido un identificador único y registrar la fecha y hora de creación.

#### Scenario: Pedido identificable

- **WHEN** se consulta un pedido
- **THEN** el sistema devuelve su identificador único y su fecha de creación

### Requirement: Estados de pedido

El sistema SHALL mantener el estado de cada pedido dentro de una secuencia definida: recibido, en preparación y entregado.

#### Scenario: Avance de estado

- **WHEN** el personal del restaurante marca un pedido recibido como en preparación y luego como entregado
- **THEN** el estado del pedido avanza en la secuencia definida

#### Scenario: No retroceder de estado

- **WHEN** el personal intenta regresar un pedido a un estado anterior
- **THEN** el sistema rechaza la transición

### Requirement: Listado de pedidos en el admin

El sistema SHALL mostrar al personal del restaurante la lista de pedidos con sus bebidas, totales, estado y antigüedad, permitiendo filtrar por estado.

#### Scenario: Listado con filtro por estado

- **WHEN** el admin consulta los pedidos filtrando por un estado
- **THEN** el sistema devuelve únicamente los pedidos en ese estado

#### Scenario: Detalle de un pedido

- **WHEN** el admin selecciona un pedido
- **THEN** el sistema muestra sus bebidas con configuración, cantidades, precios y total
