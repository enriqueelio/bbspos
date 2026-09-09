# Proposal: cajero-terminal-notas-y-cola

## Why

La pantalla de Nueva Venta del cajero mezclaba el terminal POS y la cola en pestañas separadas, obligando a cambiar de pestaña para cobrar y preparar. El negocio necesita ver la cola mientras se toma el pedido, marcar datos obligatorios antes de enviar, e incluir indicaciones especiales del cliente que se conserven en el pedido y se muestren en la comanda y en la tarjeta de la cola.

## What Changes

- **Terminal de tres columnas** en Nueva Venta: cola de pedidos (20 %), ticket en curso (20 %) y catálogo (60 %), cada columna con scroll propio y la cola visible en vivo mientras se arma el pedido.
- **Datos obligatorios antes de enviar**: el cajero/admin debe ingresar nombre o mesa y elegir "Para mesa" o "Para llevar"; el formulario pide de forma visible el dato faltante y deshabilita el envío hasta completarlo.
- **Indicaciones especiales**: campo opcional en el ticket en curso, escrito en mayúsculas, que viaja con el pedido (`Order.notes`), se imprime en la comanda y se muestra en la tarjeta expandida de la cola.
- **Entrada normalizada**: nombre/mesa y notas se transforman a mayúsculas automáticamente; los mensajes de confirmación (`Pedido #001 creado …`) se limpian al seleccionar un producto.
- **Cola compacta**: tarjetas contraídas por defecto con acordeón único (una expandida a la vez), búsqueda por número/nombre/mesa/hora, bordes de color por estado, hora en formato 24 h, badge de estado alineado a la derecha y scrollbar oculta.
- **Menú de rueda dentada** en el encabezado del cajero: navegación a Ventas/Reportes y submenú de Reimpresión de comandas con la hora del pedido en 24 h.
- **Secuencia diaria del ticket**: el número de pedido se reinicia cada día (formato `#001`–`#999` en 3 dígitos) tanto en cajero, mesero como en la tienda; la comanda impresa también usa 3 dígitos.

## Capabilities

### New Capabilities

- (ninguna nueva)

### Modified Capabilities

- `pos-terminal`: Layout de tres columnas, nombre/mesa y tipo de entrega obligatorios, notas de indicaciones especiales, mayúsculas automáticas y mantenimiento de la cola en pantalla.
- `cashier`: Cola compacta con acordeón, búsqueda, colores de estado, hora 24 h, nota en tarjeta expandida y menú de rueda dentada con reimpresión.
- `ordering`: Número de pedido secuencial diario en 3 dígitos y persistencia de `Order.notes`.
- `printer-management`: Comanda con número de 3 dígitos e indicaciones especiales; reimpresión desde el menú de opciones del cajero.

## Impact

- **packages/types**: `formatOrderCode` normaliza a 3 dígitos (`padStart(3).slice(-3)`).
- **packages/db**: migración `add_order_notes` con `Order.notes String?`; secuencia calculada por día (sin columna nueva; `seq` se calcula sobre pedidos del día).
- **apps/cajero**: `pos-terminal` en 3 columnas con `QueueView compact`, `settings-menu` (⚙️), validaciones obligatorias, `pos-cart-store` con notas, y `queue-view` compacto.
- **apps/mesero**: secuencia diaria en su `createPosOrder` (el terminal del mesero no incorpora la cola ni las notas).
- **apps/store**: `createOrder` con secuencia diaria.
- No requiere migración de base de datos adicional.