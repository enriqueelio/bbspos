## MODIFIED Requirements

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

## ADDED Requirements

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