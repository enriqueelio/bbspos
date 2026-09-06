# Ordering Specification

## Purpose

Gestiona los pedidos del restaurante: creación de un pedido desde el carrito del cliente, persistencia de sus bebidas con el precio capturado, y seguimiento de su estado por el personal del restaurante.

## Requirements

### Requirement: Creación de pedido desde el carrito

El sistema SHALL permitir crear un pedido con los ítems del carrito, pudiendo ser cada ítem una bebida (con su configuración: categoría, sabor, tamaño y tipo de boba, y sus toppings con precio capturado) o un platillo del menú (con su nombre, sección/categoría y precio fijo capturado), persistiendo en cada caso la cantidad, el precio unitario capturado y el total del pedido en bolivianos.

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

- **WHEN** el carrito incluye un platillo del Menú del Día
- **THEN** el ítem del pedido persiste el nombre del platillo, su sección/categoría, el precio fijo capturado y la cantidad, y se muestra correctamente en la comanda y en el listado de pedidos

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

El sistema SHALL mostrar al personal del restaurante la lista de pedidos con sus bebidas, toppings, totales, estado y antigüedad, permitiendo filtrar por estado.

#### Scenario: Listado con filtro por estado

- **WHEN** el admin consulta los pedidos filtrando por un estado
- **THEN** el sistema devuelve únicamente los pedidos en ese estado

#### Scenario: Detalle de un pedido

- **WHEN** el admin selecciona un pedido
- **THEN** el sistema muestra sus bebidas con configuración, toppings, cantidades, precios unitarios y total

### Requirement: Anulación de un pedido por el admin

El sistema SHALL permitir al admin anular un pedido mediante un diálogo flotante de confirmación donde se pide el motivo, persistir el motivo, la fecha/hora y el usuario que ejecutó la anulación, y ocultar las acciones secundarias (Descontar/Anular) una vez anulado.

#### Scenario: Anulación confirmada con motivo

- **WHEN** el admin selecciona Anular, escribe el motivo obligatorio en el diálogo flotante y confirma
- **THEN** el sistema cambia el pedido a `ANULADO`, guarda `cancelReason`, `cancelledAt` y `canceledById`, y la tarjeta muestra "Anulado por: {usuario} ({rol}) · Motivo: {motivo} · {fecha/hora}"

#### Scenario: Anulación sin motivo

- **WHEN** el admin intenta confirmar la anulación sin haber escrito un motivo
- **THEN** el sistema deshabilita la confirmación hasta que el motivo esté presente

#### Scenario: Pedido anulado sin acciones secundarias

- **WHEN** un pedido está en estado `ANULADO`
- **THEN** la tarjeta oculta los botones Descontar y Anular; solo conserva acciones permitidas como "Reimprimir comanda"

### Requirement: Descuento a un pedido por el admin

El sistema SHALL permitir al admin aplicar un descuento mediante un diálogo flotante de confirmación con monto y motivo, persistir quién lo aplicó, y reflejar el saldo y el monto descontado en la tarjeta.

#### Scenario: Descuento confirmado con motivo

- **WHEN** el admin selecciona Descontar, ingresa el monto y el motivo obligatorio en el diálogo y confirma
- **THEN** el sistema reduce el `total`, incrementa `discountAmount`, guarda `discountReason`, `discountedAt` y `discountedById`, y la tarjeta muestra el saldo junto a "Descuento de {monto}"

#### Scenario: Descuento sin motivo

- **WHEN** el admin intenta confirmar el descuento sin haber escrito el motivo
- **THEN** el sistema deshabilita la confirmación hasta que el motivo esté presente

### Requirement: Gestos y desbordamiento táctil en la terminal de tablet

El sistema SHALL fijar la terminal del mesero a la altura visible de la pantalla (`100dvh`), bloquear el pull-to-refresh del navegador y evitar el rebote del desbordamiento vertical para que la interfaz se comporte como una app nativa en tablet.

#### Scenario: Interfaz fija a pantalla completa

- **WHEN** el mesero usa la terminal en una tablet
- **THEN** el contenedor raíz ocupa exactamente la altura visible (`h-dvh` con `overflow:hidden` en el cuerpo) y el contenido interno hace scroll sin mostrar barras de navegación flotantes

#### Scenario: Sin recarga por deslizamiento accidental

- **WHEN** el mesero desliza hacia abajo en el catálogo
- **THEN** la página no se recarga (pull-to-refresh desactivado vía `overscroll-behavior-y: none`) y el avance del pedido actual no se pierde

### Requirement: Despliegue del QR de pago en la confirmación

El sistema SHALL mostrar el QR de pago configurado en la pantalla de confirmación del pedido, junto al número de pedido, cuando exista un QR de pago activo.

#### Scenario: Confirmación con QR configurado

- **WHEN** el cliente confirma un pedido y existe un QR de pago activo
- **THEN** la pantalla de confirmación muestra el QR de pago junto al número de pedido para que el cliente pueda escanearlo y pagar

#### Scenario: Confirmación sin QR configurado

- **WHEN** el cliente confirma un pedido y no hay un QR de pago activo
- **THEN** la pantalla de confirmación se muestra sin QR de pago
