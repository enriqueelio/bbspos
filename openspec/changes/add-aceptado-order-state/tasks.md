## 1. Datos y tipos

- [x] 1.1 Actualizar schema Prisma: `OrderStatus { RECIBIDO, ACEPTADO, ENTREGADO, ANULADO }`, default `RECIBIDO`, columna `paidAt DateTime?` en Order
- [x] 1.2 Crear migración con remapeo `UPDATE status INGRESADO→RECIBIDO`, aplicarla con servidores detenidos y regenerar cliente Prisma
- [x] 1.3 packages/types: nuevos valores de `OrderStatus`, secuencia `[RECIBIDO, ACEPTADO, ENTREGADO]`, labels (Recibido/Aceptado/Entregado/Anulado), `AcceptablePayment = ["EFECTIVO","QR"]` y `Order.paidAt?`

## 2. Backend

- [x] 2.1 apps/admin actions: crear `acceptOrder(orderId, method)` (valida RECIBIDO + método EFECTIVO|QR, setea ACEPTADO/paidAt/paymentMethod/userId); `deliverOrder` exige ACEPTADO; eliminar `markOrderPaid`; ajustar `applyDiscount` si referencia estados
- [x] 2.2 apps/cajero actions: reemplazar `deliverOrder` por `acceptOrder` + `deliverOrder` con las mismas validaciones
- [x] 2.3 Dashboard admin: contador "Pedidos por cobrar" sobre RECIBIDO; dashboard-summary igual criterio
- [x] 2.4 apps/admin lib/reports/params.ts: orderStatusValues actualizados

## 3. Panel admin

- [x] 3.1 Pedidos: filtros Todos/Recibidos/Aceptados/Entregados/Anulados, badges por estado y botones según estado (RECIBIDO → "Registrar pago" con selector Efectivo|QR; ACEPTADO → "Entregar")
- [x] 3.2 Mostrar método de pago y hora de aceptación en el detalle/fila cuando existan

## 4. App del cajero

- [x] 4.1 Cola en dos secciones: "Por cobrar" (RECIBIDO del día, botones Efectivo/QR) y "Por entregar" (ACEPTADO, botón Entregar con urgencia ≥15 min); polling sin cambios
- [x] 4.2 Reporte diario del cajero intacto (cuenta ENTREGADO por deliveredAt); verificar labels

## 5. Verificación

- [x] 5.1 Migración: datos de prueba ENTREGADO/ANULADO intactos; ningún INGRESADO residual
- [x] 5.2 Flujo completo en cajero: pedido RECIBIDO → aceptar con QR → ACEPTADO → entregar → ENTREGADO con deliveredAt
- [x] 5.3 Bloqueos: entregar RECIBIDO rechazado; aceptar sin método rechazado; retroceso rechazado; TARJETA no ofrecido
- [x] 5.4 Admin: filtros por estado correctos; dashboard refleja "por cobrar"; reportes sin regresión (staff/daily con datos de prueba)
- [x] 5.5 Lint/typecheck/build del monorepo y `openspec validate add-aceptado-order-state --strict`

