## Why

Los clientes a veces pagan dividiendo el monto entre efectivo y QR (por ejemplo, 20 Bs en efectivo y 10 Bs en QR). Actualmente el cajero solo puede seleccionar un único método de pago al aceptar un pedido, lo que obliga a registrar pagos parciales de forma incorrecta o ignorar la realidad de la transacción. Esto afecta la exactitud del desglose de pagos en los reportes diarios y el cierre de caja.

## What Changes

- Se agregan campos `paymentMethod2` (enum PaymentMethod nullable) y `paymentAmount2` (entero nullable) al modelo `Order` para registrar un segundo método de pago cuando se divide el cobro.
- La Server Action `acceptOrder` acepta parámetros opcionales `method2` y `amount2` para soportar pagos divididos.
- La interfaz del cajero (queue-view) agrega un botón "Cobro dividido" que abre un modal donde el cajero selecciona dos métodos de pago y asigna montos que sumen el total del pedido.
- Los reportes de pago (daily, cashier report) contabilizan ambos métodos de pago: el monto de `paymentMethod` se registra completo y el monto de `paymentMethod2` se suma por separado.
- El tipo `Order` en `@bubba/types` se extiende con los nuevos campos.

## Capabilities

### New Capabilities

- `split-payment`: División de cobro entre dos métodos de pago (efectivo + QR) en el momento de aceptar un pedido desde la pantalla del cajero.

### Modified Capabilities

- `ordering`: El requisito de "Registro de pago del pedido" ahora soporta pago simple (un método) o dividido (dos métodos con montos explícitos).

## Impact

- **Schema**: Migración Prisma para agregar `paymentMethod2` y `paymentAmount2` a `Order`.
- **Server Actions**: `acceptOrder` en `apps/cajero/app/actions/orders.ts` y `apps/admin/app/actions/orders.ts`.
- **UI**: `apps/cajero/components/queue-view.tsx` — nuevo modal de cobro dividido.
- **Types**: `packages/types/src/index.ts` — interfaz `Order` expandida.
- **Reportes**: `apps/cajero/lib/report.ts`, `apps/admin/app/api/reports/daily/route.ts` — desglose de pagos considera ambos campos.
- **Admin orders**: `apps/admin/app/(dashboard)/orders/orders-client.tsx` — visualización del desglose de pago en pedidos divididos.
