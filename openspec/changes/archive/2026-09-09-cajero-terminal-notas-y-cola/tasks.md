## 1. Datos y tipos

- [x] 1.1 Migración `add_order_notes`: agregar `Order.notes String?` en `schema.prisma` y regenerar el cliente Prisma
- [x] 1.2 `formatOrderCode` con `padStart(3, "0").slice(-3)` en `packages/types`

## 2. Terminal POS del cajero

- [x] 2.1 Layout de tres columnas en Nueva Venta: cola (20 %), ticket (20 %) y catálogo (60 %)
- [x] 2.2 Validación obligatoria de nombre o mesa y tipo de entrega para cajero/admin antes de enviar
- [x] 2.3 Campo de indicaciones especiales en el ticket (mayúsculas automáticas) y persistencia en el carrito (`notes` en snapshot + `localStorage`)
- [x] 2.4 Mensaje "Pedido #… creado" que se limpia al seleccionar un producto o confirmar otro
- [x] 2.5 Entrada de nombre/mesa en mayúsculas automáticas
- [x] 2.6 Los selectores se reinician al enviar el pedido

## 3. Cola compacta del cajero

- [x] 3.1 Modo compacto en `QueueView`: tarjetas contraídas, acordeón único (`expandedId` compartido)
- [x] 3.2 Fila contraída con `#seq + nombre`, total y hora en cuadrícula de 4 columnas
- [x] 3.3 Hora de creación en 24 h (sin a.m./p.m.)
- [x] 3.4 Bordes/glow por estado (azul fresco por cobrar, verde pagado sin entregar, rojo entregado sin pagar)
- [x] 3.5 Indicaciones especiales en la tarjeta expandida con `border-t`
- [x] 3.6 Búsqueda por número de pedido, nombre/mesa u hora
- [x] 3.7 Scrollbar oculta en el contenedor de la cola

## 4. Rueda dentada del cajero

- [x] 4.1 `SettingsMenu` (⚙️) en el encabezado con navegación a Ventas/Reportes
- [x] 4.2 Submenú de Reimpresión con pedidos del día (`#seq`, nombre, hora 24 h)
- [x] 4.3 Acción `reprintOrder` desde el menú

## 5. Secuencia diaria del número de pedido

- [x] 5.1 Cajero: `createPosOrder` calcula `seq` desde el inicio del día
- [x] 5.2 Mesero: `createPosOrder` calcula `seq` desde el inicio del día
- [x] 5.3 Tienda: `createOrder` calcula `seq` desde el inicio del día
- [x] 5.4 Comanda impresa con `#` de 3 dígitos

## 6. Verificación

- [x] 6.1 Typecheck y lint verdes en types, cajero, mesero, store y admin
- [x] 6.2 Prueba manual: cola en vivo, validaciones, notas y secuencia diaria
- [x] 6.3 Documentar change openspec y sincronizar specs canónicas