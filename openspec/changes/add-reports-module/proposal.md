## Why

El admin de Bubba no tiene visibilidad del negocio: no hay cierres de caja, tendencias de venta, horas pico ni rankings de productos. El personal toma decisiones a ciegas y la auditoría es imposible porque las órdenes no registran quién las procesó, cómo se pagaron ni si fueron anuladas o con descuento.

## What Changes

- Nueva suite de reportes en el admin (`/api/reports/*`, protegida por NextAuth) con export CSV: cierre de caja diario, evolución por rango de fechas, horas pico, ventas por categoría, top productos, baja rotación y resumen para el dashboard.
- **BREAKING** (schema): nuevo estado de orden `ANULADO`; nuevas columnas opcionales en `Order`: `userId` (staff que la procesó), `paymentMethod`, `discountAmount`, `discountReason`, `cancelledAt`, `cancelReason`.
- Reportes de auditoría: rendimiento por cajero/mesero y registro de anulaciones/descuentos.
- Los reportes de venta excluyen órdenes `ANULADO`; los reportes de staff/pagos se activan tras la migración (antes responden `501 NOT_IMPLEMENTED_SCHEMA`).
- Nuevo panel de Reportes en el dashboard del admin con filtros por fecha y export.

## Capabilities

### New Capabilities

- `reports`: Suite de reportes del negocio (ventas, producto, personal) expuesta al admin autenticado: endpoints, parámetros, respuestas, errores, export CSV y reglas de cómputo (timezone local, dinero entero BOB, exclusión de anulados).

### Modified Capabilities

- `ordering`: El estado de pedido incorpora `ANULADO` como estado terminal alcanzable desde cualquier estado; la orden registra opcionalmente el usuario staff que la procesó, el método de pago, y los datos de descuentos/anulaciones para auditoría.

## Impact

- `packages/db`: migración Prisma (enums `PaymentMethod`, `ANULADO`, columnas nuevas en `Order`, relación `User.orders`, índice `Order.createdAt`).
- `apps/admin/app/actions/orders.ts` y UI de pedidos: soportar anulación con motivo, selección de método de pago y atribución al usuario de sesión.
- `apps/admin/app/api/reports/*`: nuevos route handlers.
- `apps/admin/app/(dashboard)/reports/*`: nueva página de reportes.
- `packages/types`: tipos compartidos de reportes.
- Sin cambios en `apps/store`.
