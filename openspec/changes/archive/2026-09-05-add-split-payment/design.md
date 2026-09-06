## Context

El sistema actual registra un único campo `paymentMethod` en la tabla `Order` al aceptar un pedido. Los reportes de pagos (daily, cashier report) agrupan ingresos por este campo. Los clientes frecuentemente pagan dividiendo el monto entre efectivo y QR, pero el cajero no tiene forma de registrar esto correctamente.

La base de datos es SQLite en desarrollo (PostgreSQL en produccion). Las migraciones se gestionan con Prisma Migrate.

## Goals / Non-Goals

**Goals:**
- Permitir al cajero dividir el cobro de un pedido entre EFECTIVO y QR
- Mantener compatibilidad total con pedidos de pago simple (sin dividir)
- Reflejar correctamente el desglose en reportes de pagos del cajero y del admin
- Validar que los montos sumen el total y que los métodos sean distintos

**Non-Goals:**
- Soportar mas de dos métodos de pago (solo efectivo + QR)
- Permitir división de pago desde el admin (solo desde el cajero)
- Cambiar la lógica de anulación o descuentos
- Agregar TARJETA como método aceptado por el cajero

## Decisions

### 1. Dos campos nullable en Order en lugar de tabla separada

**Decisión**: Agregar `paymentMethod2` (PaymentMethod? nullable) y `paymentAmount2` (Int? nullable) directamente en el modelo `Order`.

**Alternativa considerada**: Crear una tabla `OrderPayment` con registros múltiples por pedido. Más normalizada pero adds complejidad innecesaria para un caso de uso de max 2 registros.

**Razón**: Un pedido solo puede tener max 2 métodos de pago. Dos campos nullable en la misma tabla son simples, fáciles de consultar en reportes, y no requieren JOINs adicionales. Los campos null significan "pago simple" (compatibilidad total).

### 2. El monto del segundo pago se almacena explícitamente

**Decisión**: `paymentAmount2` almacena el monto del segundo método en Bs. El primer monto se calcula como `total - paymentAmount2`.

**Razón**: Almacenar ambos montos explícitamente introduce riesgo de inconsistencia (que no sumen el total). Con un solo campo `paymentAmount2`, el primer monto queda determinado por el total del pedido.

### 3. Modal en la UI del cajero para cobro dividido

**Decisión**: Agregar un tercer botón "Cobro dividido" junto a "Cobro Efectivo" y "Cobro QR". Al hacer clic se abre un dialog/modal donde el cajero asigna montos.

**Alternativa considerada**: Convertir los botones existentes en un dropdown con opción "Dividir". Menos visible para el cajero.

**Razón**: El botón separado es más discoverable en un entorno de mostrador con prisa. El modal permite validación visual (barra de progreso mostrando cuánto falta para cubrir el total).

### 4. Validación en el cliente y en el servidor

**Decisión**: Validar en el cliente (suma de montos, métodos distintos, montos > 0) antes de llamar al Server Action, y re-validar en el Server Action como segunda línea de defensa.

**Razón**: El cajero necesita feedback inmediato sin round-trip al servidor. La validación server-side previene manipulación directa de la action.

## Risks / Trade-offs

- **[Riesgo]** Pedidos creados antes de la migración tienen paymentMethod null. **Mitigación**: Los reportes ya filtran `if (!order.paymentMethod) continue`, así que pedidos sin pago no afectan el desglose.
- **[Trade-off]** El campo paymentAmount2 es nullable y se ignora si paymentMethod2 es null. **Mitigación**: La Server Action siempre setea ambos campos juntos o ninguno.
- **[Riesgo]** Un cajero podría dividir el pago incorrectamente (montos que no suman). **Mitigación**: Validación server-side estricta que rechaza la operación.

## Migration Plan

1. Ejecutar `prisma migrate dev --name add_split_payment` para crear los campos `paymentMethod2` y `paymentAmount2` en la tabla Order.
2. Los campos son nullable, por lo que no hay pérdida de datos ni afectación a pedidos existentes.
3. Rollback: Eliminar los campos con una migración reversa (Prisma no soporta rollback automático, pero eliminar columnas nullable es seguro).

## Open Questions

Ninguno. El diseño está completo para la implementación.
