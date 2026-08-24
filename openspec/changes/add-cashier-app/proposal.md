# Proposal: add-cashier-app

## Why

La operación actual mezcla en un solo panel (admin) la gestión del catálogo y la atención del mostrador. El cajero es quien prepara y entrega las bebidas y solo necesita una cola clara de trabajo y su propio desempeño; además el flujo real solo tiene dos momentos: el cliente ingresa el pedido y el cajero lo entrega. Simplificar los estados a dos permite medir con exactitud cuánto tarda cada cajero desde que el pedido fue ingresado hasta que fue entregado.

## What Changes

- **BREAKING** Se elimina el estado `EN_PREPARACION`. La secuencia de estados queda en dos valores: `INGRESADO` (creado por el cliente; renombra al actual `RECIBIDO`) y `ENTREGADO` (entregado por el cajero).
- **BREAKING** Migración de datos: los pedidos existentes en `EN_PREPARACION` pasan a `INGRESADO`; el valor `RECIBIDO` se renombra a `INGRESADO`.
- Nueva columna `deliveredAt` en `Order` que registra el momento exacto de la entrega, base para la métrica de tiempo de entrega.
- Nuevo campo `role` en el modelo `User` (`ADMIN` | `CAJERO`) con seed actualizado; el acceso a cada aplicación depende del rol.
- Nueva aplicación `apps/cajero` (Next.js, puerto 3002) con:
  - Inicio de sesión propio (solo usuarios con rol `CAJERO`; un `ADMIN` también puede entrar).
  - Pestaña **Preparar**: cola de pedidos en estado `INGRESADO` con bebidas, toppings, totales, antigüedad y botón para marcar como entregado (atribuye el pedido al cajero que entrega).
  - Pestaña **Reporte**: resumen del día (ingresos, pedidos, ticket promedio, tiempo promedio de entrega) y rendimiento exclusivo del usuario conectado.
- Ajustes en apps/admin y apps/store por el cambio de estados (etiquetas, filtros, avance de un paso, contadores).

## Capabilities

### New Capabilities

- `cashier`: Aplicación del cajero — autenticación por rol, cola de preparación con marca de entrega y reporte diario personal.

### Modified Capabilities

- `ordering`: Requisito "Estados de pedido" pasa a una secuencia de dos estados (`INGRESADO` → `ENTREGADO`), elimina `EN_PREPARACION`, exige registrar `deliveredAt` y atribuir la entrega al usuario cajero.
- `admin-auth`: Nuevos requisitos de roles — cada usuario tiene rol `ADMIN` o `CAJERO`; el panel admin queda restringido a `ADMIN` y las operaciones de entrega quedan asociadas al rol `CAJERO`.

## Impact

- **packages/db**: enum `OrderStatus` (renombra `RECIBIDO`→`INGRESADO`, elimina `EN_PREPARACION`), columnas nuevas `Order.deliveredAt` e `User.role` + migración de datos.
- **packages/types**: `OrderStatus`, etiquetas, `Role` y tipos del reporte del cajero (tiempo promedio de entrega).
- **apps/cajero** (nueva): app Next.js + NextAuth con credenciales propias en puerto 3002.
- **apps/admin**: acciones y UI de pedidos sin `EN_PREPARACION`; dashboard-summary cuenta pendientes solo con `INGRESADO`; restricción de acceso por rol `ADMIN`.
- **apps/store**: etiquetas/textos que mencionen "en preparación"; confirmación sigue mostrando `INGRESADO`.
- **docker-compose.yml**: nuevo servicio/puerto 3002 para la app del cajero.
