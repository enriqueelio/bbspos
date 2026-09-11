# Cashier Specification

## Purpose

Aplicación del cajero: le muestra al personal de mostrador qué pedidos debe preparar y entregar, le permite marcar cada entrega y consultar su reporte del día con su propio rendimiento.

## Requirements

### Requirement: Inicio de sesión en la app del cajero

La aplicación del cajero SHALL autenticar mediante **username** (campo de texto) y contraseña, únicamente a usuarios con rol `CAJERO`, `ADMIN` o `MESERO`, y SHALL rechazar el acceso a usuarios sin rol válido o con credenciales inválidas. El sistema SHALL diferenciar entre credenciales inválidas y cuenta desactivada.

#### Scenario: Cajero inicia sesión

- **WHEN** un usuario con rol `CAJERO` inicia sesión con username y contraseña correctos
- **THEN** la aplicación establece su sesión y lo lleva a la pestaña de preparación con su nombre visible

#### Scenario: Mesero inicia sesión

- **WHEN** un usuario con rol `MESERO` inicia sesión con username y contraseña correctos
- **THEN** la aplicación establece su sesión y lo redirige al terminal POS (pestaña "Nueva Venta")

#### Scenario: Usuario sin rol permitido

- **WHEN** un usuario sin rol `CAJERO`, `ADMIN` ni `MESERO` intenta iniciar sesión
- **THEN** la aplicación rechaza el acceso e indica que la cuenta no tiene permisos de cajero

#### Scenario: Cuenta desactivada

- **WHEN** un usuario con cuenta desactivada ingresa credenciales correctas
- **THEN** la aplicación muestra "Esta cuenta está desactivada" en lugar de "Credenciales inválidas"

#### Scenario: Acceso sin sesión

- **WHEN** un visitante sin sesión abre cualquier ruta de la app del cajero
- **THEN** la aplicación lo redirige al inicio de sesión

#### Scenario: Cookie de sesión de navegador

- **WHEN** el usuario cierra el navegador
- **THEN** la cookie de sesión se elimina automáticamente (sin `Expires` ni `Max-Age`)

### Requirement: Cola de preparación

La cola del cajero SHALL mostrar los pedidos del día: primero los pendientes — `RECIBIDO` (por cobrar) y `ACEPTADO` (cobrado y/o por entregar), así como `ENTREGADO` sin pago registrado — ordenados por estado y luego del más reciente al más antiguo, y después los completados (`ENTREGADO` con pago registrado y `ANULADO`). En modo compacto (columna de Nueva Venta) cada pedido SHALL mostrarse como tarjeta contraída con `#número`, nombre del cliente, total y hora de ingreso, y expandirse a su detalle completo con un acordeón único (solo una tarjeta expandida a la vez).

#### Scenario: Cola con pedidos pendientes

- **WHEN** el cajero abre la cola y existen pedidos en estados pendientes
- **THEN** ve la lista priorizada por estado y dentro de cada estado del más reciente al más antiguo

#### Scenario: Orden priorizado por estado

- **WHEN** existen simultáneamente pedidos `RECIBIDO`, `ACEPTADO` y `ENTREGADO` sin pago
- **THEN** la cola muestra primero los `RECIBIDO`, luego los `ACEPTADO` y después los `ENTREGADO` sin pago

#### Scenario: Pedidos completados al final

- **WHEN** existen simultáneamente pedidos pendientes y pedidos completados (entregados con pago registrado o anulados)
- **THEN** los pendientes se muestran primero y los completados quedan agrupados después

#### Scenario: Iconos de pago y entrega en la tarjeta

- **WHEN** el cajero ve una tarjeta contraída con un tipo de entrega
- **THEN** el tipo de entrega se muestra a la derecha como icono (moto, cubiertos o bolsa) con color y tooltip

#### Scenario: Icono de método de pago en la tarjeta expandida

- **WHEN** el cajero expande una tarjeta de un pedido con método de pago
- **THEN** el icono del método (efectivo, QR, tarjeta, pensionado o dividido) aparece junto al total con color y tooltip

#### Scenario: Monto en un solo bloque

- **WHEN** se muestra el total de un pedido (p. ej. 45 Bs y 9999 Bs)
- **THEN** el total aparece en un solo bloque sin espacio doble ni quiebre de línea ("45 Bs")

#### Scenario: Acordeón único en cola compacta

- **WHEN** el cajero expande una tarjeta y hay otra tarjeta expandida
- **THEN** la tarjeta anterior se contrae y solo la nueva permanece expandida

#### Scenario: Cola vacía

- **WHEN** no existen pedidos en estados pendientes
- **THEN** la app muestra un estado vacío indicando que no hay pedidos por preparar

### Requirement: Marcar pedido como entregado

La app del cajero SHALL permitir marcar un pedido en estado `INGRESADO` como entregado mediante una acción explícita de confirmación; al confirmar, el sistema registra el momento exacto de la entrega en `deliveredAt`, atribuye el pedido al usuario cajero conectado y avanza el estado a `ENTREGADO`.

#### Scenario: Entrega confirmada

- **WHEN** el cajero confirma la entrega de un pedido en estado `INGRESADO`
- **THEN** el sistema registra `deliveredAt`, asigna su usuario como responsable, cambia el estado a `ENTREGADO` y el pedido sale de la cola

#### Scenario: La entrega no es reversible desde la app del cajero

- **WHEN** un pedido ya está en estado `ENTREGADO`
- **THEN** la app del cajero no ofrece ninguna acción para modificarlo

### Requirement: Actualización de la cola

La app del cajero SHALL reflejar los cambios recientes de la cola (nuevos pedidos ingresados, cobros y entregas propias) sin requerir una recarga manual completa de la aplicación.

#### Scenario: Entra un pedido nuevo mientras se trabaja

- **WHEN** un cliente confirma un pedido estando la cola abierta
- **THEN** el pedido nuevo aparece en la cola con su hora de ingreso sin que el cajero recargue la página

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

### Requirement: Reporte del día del cajero

La app del cajero SHALL mostrar en una segunda pestaña el resumen del día en curso en zona horaria local: ingresos totales, número de pedidos entregados, ticket promedio, tiempo promedio de entrega y desglose por método de pago, calculados solo sobre pedidos entregados del día.

#### Scenario: Resumen con actividad

- **WHEN** el cajero abre la pestaña de reporte habiendo pedidos entregados hoy
- **THEN** ve sus KPIs del día incluyendo el tiempo promedio de entrega calculado desde el ingreso hasta `deliveredAt`

#### Scenario: Día sin actividad

- **WHEN** no hay pedidos entregados en el día en curso
- **THEN** la pestaña muestra el resumen en ceros y el tiempo promedio como sin datos

### Requirement: Rendimiento exclusivo del propio usuario

El reporte de la app del cajero SHALL limitar las métricas de rendimiento (pedidos entregados y tiempo promedio de entrega) a los pedidos atribuidos al usuario autenticado, sin exponer datos de otros cajeros.

#### Scenario: Solo pedidos propios

- **WHEN** el cajero consulta su pestaña de reporte
- **THEN** las métricas de rendimiento corresponden únicamente a los pedidos que él mismo entregó

### Requirement: Cierre de caja del día

La app del cajero SHALL ofrecer un cierre de caja por día que concilie el efectivo físicamente contado por denominación contra el efectivo esperado según el sistema. El cierre SHALL calcular los totales esperados por método de pago (efectivo, QR y tarjeta) sobre los pedidos entregados del día, prorrateando los pagos divididos entre sus métodos, y SHALL contemplar las cuentas de pensionados: los consumos cobrados contra cuenta no entran a la caja y las recargas o pagos de deuda sí son ingresos del día. Al guardar, el sistema SHALL persistir el cierre con la hora, el usuario responsable, las denominaciones contadas, el total contado, los contrastes del sistema, el sobrante/faltante resultante y una nota opcional, y SHALL permitir consultar el historial de cierres del día y reimprimir el ticket resumen.

#### Scenario: Contraste con pedidos entregados

- **WHEN** el cajero abre la pestaña Cierre de un día con pedidos entregados
- **THEN** el sistema muestra los totales esperados por método (efectivo, QR, tarjeta) prorrateando los pagos divididos y la cantidad de pedidos entregados

#### Scenario: Pensionados con consumos y recargas

- **WHEN** en el día hay consumos de pensionados cobrados contra cuenta y recargas o pagos de deuda
- **THEN** los consumos no se suman como efectivo de caja y las recargas/pagos de deuda sí se suman (efectivo y QR por separado)

#### Scenario: Arqueo y sobrante/faltante

- **WHEN** el cajero completa el arqueo por denominación y guarda el cierre
- **THEN** el sistema calcula el total contado, lo contrasta con el efectivo esperado y guarda el sobrante o faltante con nota opcional y usuario responsable

### Requirement: Arqueo de efectivo tipo Excel

El arqueo de caja SHALL presentar una grilla con las denominaciones de Bs 200, 100, 50, 20, 10, 5, 2, 1 y la moneda de 0,50, con encabezados y pie fijos (sticky) y scroll propio. Las celdas de cantidad SHALL ser navegables con el teclado (flecha abajo y Enter avanzan a la siguiente denominación, flecha arriba retrocede) y SHALL recibir el foco automático en la denominación mayor al abrir. La grilla SHALL resaltar las filas con cantidad mayor que cero y recalcular el total contado en vivo.

#### Scenario: Navegación por teclado

- **WHEN** el cajero está en una celda de cantidad y presiona ↓ o Enter
- **THEN** el foco pasa a la siguiente denominación (↑ a la anterior) sin tocar el mouse

#### Scenario: Foco inicial en Bs 200

- **WHEN** se abre el arqueo
- **THEN** el foco queda en la celda de la denominación de Bs 200

#### Scenario: Total con moneda de 0,50

- **WHEN** el cajero ingresa cantidades que incluyen monedas de 0,50
- **THEN** el total contado se recalcula en vivo y muestra dos decimales cuando la fracción lo requiere

### Requirement: Pantalla objetivo del módulo de cajero

El módulo de cajero SHALL estar optimizado para el monitor de escritorio del local: panel de **19"**, relación de aspecto **16:10**, resolución **1440×900 px** (densidad ≈ 89 PPI), área útil de aproximadamente **409 × 256 mm**. El layout SHALL ser fluido (sin anchos fijos al límite), con el ticket de cobro en la columna izquierda (~30–35 % ≈ 430–505 px) y la cola de pedidos/gestión en la derecha (~65–70 % ≈ 935–1005 px); la interfaz SHALL conservar compatibilidad con resoluciones menores, como mínimo 1280×1024 (5:4).

#### Scenario: Sala del cajero a 1440×900

- **WHEN** el cajero usa la terminal en el monitor 16:10 de 1440×900
- **THEN** la interfaz aprovecha todo el ancho sin scroll horizontal, con el ticket fijo a la izquierda y la cola a la derecha

#### Scenario: Reducción a 1280×1024

- **WHEN** la terminal se usa en un monitor 5:4 de 1280×1024
- **THEN** la interfaz se redimensiona fluidamente conservando la misma estructura de dos columnas sin desbordes