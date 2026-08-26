## 1. Schema y tipos

- [x] 1.1 Agregar campos `paymentMethod2` (PaymentMethod? nullable) y `paymentAmount2` (Int? nullable) al modelo `Order` en `packages/db/prisma/schema.prisma`
- [x] 1.2 Ejecutar `prisma migrate dev --name add_split_payment` para crear la migración
- [x] 1.3 Agregar `paymentMethod2` y `paymentAmount2` a la interfaz `Order` en `packages/types/src/index.ts`

## 2. Server Actions - Cajero

- [x] 2.1 Modificar `acceptOrder` en `apps/cajero/app/actions/orders.ts` para aceptar parámetros opcionales `method2` y `amount2`, validar que sumen el total, métodos distintos y montos > 0, y persistir ambos campos
- [x] 2.2 Modificar `acceptOrder` en `apps/admin/app/actions/orders.ts` con la misma lógica de pago dividido

## 3. UI - Cajero (cobro dividido)

- [x] 3.1 Crear componente `SplitPaymentDialog` en `apps/cajero/components/` con modal donde el cajero selecciona dos métodos de pago y asigna montos, con validación visual (suma vs total)
- [x] 3.2 Agregar botón "Cobro dividido" en `OrderCard` dentro de `apps/cajero/components/queue-view.tsx` que abre el `SplitPaymentDialog`
- [x] 3.3 Actualizar la visualización de pago en `OrderCard` para mostrar desglose cuando `paymentMethod2` existe (ej: "Efectivo 20 Bs + QR 10 Bs")

## 4. Reportes y desglose de pagos

- [x] 4.1 Actualizar `getCashierDailyData` en `apps/cajero/lib/report.ts` para contabilizar `paymentAmount2` bajo `paymentMethod2` en el desglose de pagos
- [x] 4.2 Actualizar el endpoint `/api/reports/daily` en `apps/admin/app/api/reports/daily/route.ts` para contabilizar pagos divididos en el desglose
- [x] 4.3 Actualizar `payments-client.tsx` en `apps/admin` para mostrar desglose de pagos divididos en la lista de pedidos

## 5. Verificación

- [x] 5.1 Ejecutar `pnpm typecheck` desde la raíz del monorepo para verificar que no hay errores de tipo
- [x] 5.2 Verificar que la migración se aplica correctamente sin pérdida de datos
- [ ] 5.3 Probar flujo completo: crear pedido -> cobro dividido -> verificar en cola del cajero -> verificar en reporte diario
