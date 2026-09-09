## MODIFIED Requirements

### Requirement: Cola de preparación

La cola del cajero SHALL mostrar los pedidos del día considerados pendientes — `RECIBIDO` (por cobrar) y `ACEPTADO` (cobrado y/o por entregar), así como `ENTREGADO` sin pago registrado — ordenados por estado y luego del más reciente al más antiguo. En modo compacto (columna de Nueva Venta) cada pedido SHALL mostrarse como tarjeta contraída con `#número`, nombre del cliente, total y hora de ingreso, y expandirse a su detalle completo con un acordeón único (solo una tarjeta expandida a la vez).

#### Scenario: Cola con pedidos pendientes

- **WHEN** el cajero abre la cola y existen pedidos en estados pendientes
- **THEN** ve la lista priorizada por estado y dentro de cada estado del más reciente al más antiguo

#### Scenario: Orden priorizado por estado

- **WHEN** existen simultáneamente pedidos `RECIBIDO`, `ACEPTADO` y `ENTREGADO` sin pago
- **THEN** la cola muestra primero los `RECIBIDO`, luego los `ACEPTADO` y después los `ENTREGADO` sin pago

#### Scenario: Acordeón único en cola compacta

- **WHEN** el cajero expande una tarjeta y hay otra tarjeta expandida
- **THEN** la tarjeta anterior se contrae y solo la nueva permanece expandida

#### Scenario: Cola vacía

- **WHEN** no existen pedidos en estados pendientes
- **THEN** la app muestra un estado vacío indicando que no hay pedidos por preparar

### Requirement: Actualización de la cola

La app del cajero SHALL reflejar los cambios recientes de la cola (nuevos pedidos ingresados, cobros y entregas propias) sin requerir una recarga manual completa de la aplicación.

#### Scenario: Entra un pedido nuevo mientras se trabaja

- **WHEN** un cliente confirma un pedido estando la cola abierta
- **THEN** el pedido nuevo aparece en la cola con su hora de ingreso sin que el cajero recargue la página

## ADDED Requirements

### Requirement: Hora en formato 24 horas

La cola SHALL mostrar la hora de ingreso de cada pedido en formato de 24 horas (HH:MM) sin marcador de a.m./p.m., tanto en la tarjeta contraída como en la expandida.

#### Scenario: Hora de ingreso en 24 h

- **WHEN** el cajero ve un pedido en la cola
- **THEN** la hora de ingreso aparece como "HH:MM" de 24 horas (p. ej. "14:05"), seguida de la antigüedad transcurrida

### Requirement: Semáforo de demora por estado

La tarjeta SHALL indicar visualmente la urgencia del pedido: borde/glow azul para el recién ingresado por cobrar, verde para el cobrado pendiente de entrega y rojo para el entregado sin pago registrado.

#### Scenario: Pedido por cobrar recién ingresado

- **WHEN** un pedido está en `RECIBIDO` o cobrado sin registrar el cobro
- **THEN** la tarjeta resalta con borde azul pulsante

#### Scenario: Pedido cobrado sin entregar

- **WHEN** un pedido está en `ACEPTADO` con pago registrado y sin entrega
- **THEN** la tarjeta resalta con borde verde pulsante

#### Scenario: Pedido entregado sin pago

- **WHEN** un pedido está `ENTREGADO` sin pago registrado
- **THEN** la tarjeta resalta con borde rojo pulsante y el total se muestra en rojo

### Requirement: Búsqueda en la cola

La app del cajero SHALL ofrecer una búsqueda libre sobre la cola que filtre por número de pedido, nombre/mesa u hora de ingreso.

#### Scenario: Búsqueda por número, nombre u hora

- **WHEN** el cajero escribe un término de búsqueda
- **THEN** la cola muestra solo los pedidos cuyo número, nombre/mesa u hora coinciden con el término

#### Scenario: Sin resultados

- **WHEN** ningún pedido coincide con el término buscado
- **THEN** la app muestra un mensaje de "sin resultados" en lugar de la lista

### Requirement: Scrollbar oculta en la cola

La columna de cola SHALL permitir desplazarse verticalmente sin mostrar la barra de scroll en navegadores modernos.

#### Scenario: Cola extensa con scroll propio

- **WHEN** la cola supera la altura visible de su columna
- **THEN** se desplaza verticalmente dentro de su columna sin que la barra de scroll sea visible

### Requirement: Menú de opciones de la app del cajero

La app del cajero SHALL mostrar un menú de opciones accesible desde la rueda del encabezado con navegación a las vistas Ventas y Reportes, y un submenú de Reimpresión de comandas.

#### Scenario: Navegación a Ventas y Reportes

- **WHEN** el cajero abre el menú de opciones y elige Ventas o Reportes
- **THEN** la app navega a la vista elegida y cierra el menú

#### Scenario: Abrir el submenú de Reimpresión

- **WHEN** el cajero abre el menú de opciones y elige Reimpresión
- **THEN** aparece el submenú con los pedidos imprimibles del día (`#número`, nombre y hora en 24 h) y la opción de Volver

### Requirement: Reimpresión de comanda desde el menú de opciones

El submenú de Reimpresión SHALL permitir reimprimir la comanda de un pedido mostrando el resultado de la operación.

#### Scenario: Reimpresión exitosa

- **WHEN** el cajero pulsa el botón de reimpresión de un pedido y la impresión se envía
- **THEN** el submenú muestra un mensaje de éxito con el número de la comanda

#### Scenario: Fallo de reimpresión

- **WHEN** el cajero pulsa el botón de reimpresión y la impresión falla
- **THEN** el submenú muestra el motivo del fallo sin salir del menú