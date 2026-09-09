# Ordering Specification

## Purpose

Gestiona los pedidos del restaurante: creación de un pedido desde el carrito del cliente, persistencia de sus bebidas con el precio capturado, y seguimiento de su estado por el personal del restaurante.

## Requirements

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

### Requirement: Estados de pedido

El sistema SHALL mantener el estado de cada pedido dentro de una secuencia definida: `RECIBIDO` (comanda impresa esperando en caja), `ACEPTADO` (pago registrado por el cajero) y `ENTREGADO` (bebidas entregadas al cliente), además del estado terminal `ANULADO`. Todo pedido SHALL pasar obligatoriamente por `ACEPTADO` antes de poder entregarse, sin retrocesos ni saltos de estado. El sistema SHALL permitir anular un pedido desde cualquier estado como transición terminal irreversible, registrando el motivo y el momento de la anulación.

#### Scenario: Avance de estado

- **WHEN** el personal del restaurante registra el pago de un pedido recibido y luego entrega las bebidas
- **THEN** el estado del pedido avanza de `RECIBIDO` a `ACEPTADO` y luego a `ENTREGADO`

#### Scenario: No retroceder de estado

- **WHEN** el personal intenta regresar un pedido a un estado anterior
- **THEN** el sistema rechaza la transición

#### Scenario: Entrega sin pago bloqueada

- **WHEN** el personal intenta entregar un pedido que sigue en `RECIBIDO` sin registrar su pago
- **THEN** el sistema rechaza la operación e indica que primero debe registrarse el pago

#### Scenario: Pedido anulado no avanza

- **WHEN** el personal intenta marcar como entregado un pedido en estado `ANULADO`
- **THEN** el sistema rechaza la transición y el estado permanece en `ANULADO`

#### Scenario: Anulación de un pedido

- **WHEN** el personal anula un pedido indicando el motivo
- **THEN** el pedido pasa al estado anulado con su motivo y momento registrados, y no puede volver a ningún otro estado

### Requirement: Registro de pago del pedido

El sistema SHALL permitir al cajero aceptar un pedido en estado `RECIBIDO` registrando el método de pago elegido por el cliente, únicamente **Efectivo** o **QR**, junto con la fecha de pago y el usuario responsable; el pedido pasa a `ACEPTADO`. El cajero puede registrar un pago simple (un método) o un pago dividido (dos métodos con montos explícitos que sumen el total).

#### Scenario: Aceptación con Efectivo

- **WHEN** el cajero registra el pago de un pedido recibido seleccionando Efectivo
- **THEN** el pedido pasa a `ACEPTADO` con método Efectivo, fecha de pago y responsable registrados

#### Scenario: Aceptación con QR

- **WHEN** el cajero registra el pago de un pedido recibido seleccionando QR
- **THEN** el pedido pasa a `ACEPTADO` con método QR, fecha de pago y responsable registrados

#### Scenario: Pago dividido

- **WHEN** el cajero acepta un pedido usando la opción de cobro dividido, indicando dos métodos distintos y montos que sumen el total
- **THEN** el sistema registra ambos métodos de pago con sus montos y marca el pedido como ACEPTADO

#### Scenario: Aceptación exige método

- **WHEN** el cajero intenta aceptar un pedido sin seleccionar un método de pago válido
- **THEN** el sistema rechaza la operación

#### Scenario: Pago dividido con montos inválidos

- **WHEN** el cajero intenta registrar un pago dividido pero los montos no suman el total, los métodos son iguales, o alguno es cero
- **THEN** el sistema rechaza la operación y muestra un mensaje de error descriptivo

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

### Requirement: Atribución del pedido al personal

El sistema SHALL registrar el usuario del personal que procesa cada pedido para permitir reportes de rendimiento por usuario.

#### Scenario: Pedido atribuido automáticamente

- **WHEN** un miembro del personal autenticado crea o procesa un pedido
- **THEN** el pedido queda asociado a ese usuario sin acción manual adicional

### Requirement: Registro del método de pago

El sistema SHALL permitir registrar en el pedido el método de pago con el que se cobró entre los métodos habilitados por el negocio.

#### Scenario: Cobro con método registrado

- **WHEN** el personal marca el cobro de un pedido indicando el método utilizado
- **THEN** el pedido queda asociado a ese método de pago para el cierre de caja

### Requirement: Descuentos con trazabilidad

El sistema SHALL permitir aplicar un descuento a un pedido registrando su monto y motivo, y SHALL reflejarlo en el total del pedido.

#### Scenario: Descuento aplicado con motivo

- **WHEN** el personal aplica un descuento indicando monto y motivo
- **THEN** el total del pedido se ajusta y quedan registrados el descuento, su motivo y el usuario responsable
