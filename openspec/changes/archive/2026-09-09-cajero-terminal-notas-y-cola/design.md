# Design: cajero-terminal-notas-y-cola

## Context

La app del cajero ya tenía un `QueueView` (cola de preparación) y un `PosTerminal` (Nueva Venta) separados por pestañas, y el flujo de envío solo exigía ítems en el carrito. El pedido no registraba notas del cliente y el número de pedido era global (no se reiniciaba). Ver proposal.md.

## Goals / Non-Goals

**Goals**

- Ver la cola de pedidos en vivo mientras se toma un pedido nuevo (3 columnas).
- No permitir enviar sin nombre/mesa y sin tipo de entrega (cajero/admin).
- Capturar indicaciones especiales y reflejarlas en comanda, ticket y tarjeta de cola.
- Número de pedido diario en 3 dígitos y consistente entre apps.

**Non-Goals**

- Cobrar directamente desde la cola del terminal (sigue realizándose en la vista de cola).
- Notas en el terminal del mesero (fuera de alcance: el mesero sigue sin campo de notas).
- Reimpresión por tarjeta individual en la cola (se centraliza en el menú ⚙️).

## Decisions

### D1. Terminal de tres columnas reutilizando componentes existentes

`PosTerminal` (cajero) ahora renderiza: `<aside>` cola (`QueueView compact`, `w-1/5 min-w-[300px]`), `<section>` ticket (`w-1/5 min-w-[280px]`) y `<section>` catálogo (`w-3/5`). La cola usa el mismo `QueueView`, reducido en densidad, y el campo de notas se agrega sobre el área de pago del ticket.

### D2. Validaciones obligatorias antes del envío

`submit()` en el terminal valida primero: carrito no vacío, `customerName` no vacío (trim, mayúsculas) y, si el rol es cajero/admin, `deliveryType` distinto de `""`. Ante fallos se muestra el mensaje específico (`Falta el nombre o la mesa…` / `Falta elegir Para mesa o Para llevar…`). El botón de envío permanece deshabilitado (`formOk`) y se resalta el campo faltante (`needsName`/`needsDelivery` con glow ámbar).

### D3. Notas en el carrito y en el pedido

El store del carrito (`pos-cart-store.ts`) incorpora `notes` en su snapshot y lo persiste en `localStorage`; `setPosNotes` fuerza mayúsculas desde la UI. `createPosOrder` recibe `notes` y las guarda en `Order.notes`. `OrderCard` (expandida) muestra una fila `Indicaciones especiales` con `border-t` cuando existen. La comanda imprime las notas junto al detalle.

### D4. Secuencia diaria del número de pedido

Las tres fuentes de creación de pedidos (cajero, mesero, tienda) calculan `seq` como `(último seq de pedidos creados desde el inicio del día) + 1` (`where: { createdAt: { gte: startOfDay } }`). El número se formatea con `formatOrderCode` (`padStart(3).slice(-3)`) para tickets, cola, comanda y reimpresión. No se introduce ninguna columna: `seq` sigue siendo nullable y se calcula por consulta.

### D5. Cola compacta con acordeón único

`QueueView` recibe `compact` y, en ese modo, usa `expandedId` compartido para una sola tarjeta expandida a la vez (acordeón). Las tarjetas contraídas muestran `#seq + nombre`, total y hora en una cuadrícula de 4 columnas; la expandida agrega items, nota, total, pago y botones. El ordenamiento prioriza el estado (`RECIBIDO → ACEPTADO → ENTREGADO sin pagar → finalizado`) y luego el más reciente. Búsqueda por número, nombre/mesa y hora.

### D6. Rueda dentada con navegación y reimpresión

Nuevo componente `SettingsMenu` en el encabezado: botón ⚙️ que abre menú flotante (cierre por clic fuera o Escape) con Ventas, Reportes y Reimpresión. El submenú Reimpresión carga `printableOrders` (pedidos imprimibles del día con `#seq`, nombre y hora 24 h) y llama a `reprintOrder`.

### D7. Horas en formato 24 h

La cola y el submenú de reimpresión muestran la hora de creación con `HH:MM` sin a.m./p.m. (helper `hora24h`).

### D8. La cola mantiene el flujo de cobro existente

El modo compacto reutiliza `ChargeButton` (portal flotante), diálogos de pago dividido y pensionado, confirmación de entrega y `ConfirmDialog`; no introduce cambios de negocio en el cobro.

## Risks / Trade-offs

- [Columna de cola estrecha (20 %) en pantallas 1280×1024] → Se mantiene `min-w-[300px]` con scroll propio; el diseño sigue siendo fluido.
- [Notas largas pueden quedar truncadas en la tarjeta] → Se renderizan completas en la expandida; la comanda las imprime íntegras.
- [Reinicio diario de `seq` depende de la zona horaria del servidor] → Se usa `startOfDay` local del servidor; consistente con el resto de los reportes del día.

## Migration Plan

1. Migración Prisma `add_order_notes` (agrega `Order.notes`).
2. Regenerar cliente Prisma.
3. Salida a dev: verificar cola en vivo, notas y secuencia diaria. No hay migración de datos.

## Open Questions

- Ninguna pendiente que afecte specs o tareas.