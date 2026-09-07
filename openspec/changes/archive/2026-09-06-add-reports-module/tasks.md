## 1. Infraestructura compartida de reportes

- [x] 1.1 Crear `lib/reports/range.ts` en `apps/admin`: helper de fechas locales → límites UTC (`America/La_Paz`), validación de rango ≤ 366 días y bucketing por día/semana ISO/mes
- [x] 1.2 Crear parser/validador compartido de query params con zod (`date`, `from`, `to`, `granularity`, `limit`, `format`, etc.) que mapee errores a códigos tipados
- [x] 1.3 Implementar envelope de respuesta (`data`/`meta`) y serializador de errores `{ error: { code, message } }` con los códigos de design.md
- [x] 1.4 Implementar guard de sesión NextAuth para `/api/reports/*` y stub de `501 NOT_IMPLEMENTED_SCHEMA` reutilizable
- [x] 1.5 Implementar serializador CSV (UTF-8 BOM, coma, encabezados en español) y manejo de `Content-Disposition`
- [x] 1.6 Agregar tipos de reportes a `packages/types`

## 2. Reportes Fase 1 (sin migración)

- [x] 2.1 Endpoint `GET /api/reports/daily`: totales del día, ticket promedio, bebidas vendidas, ingreso por toppings, desglose por categoría; campos de pago/descuento/anulación en `null`
- [x] 2.2 Endpoint `GET /api/reports/sales-range`: serie por granularidad day/week/month + resumen (mejor día, comparación contra periodo previo)
- [x] 2.3 Endpoint `GET /api/reports/peak-hours`: distribución 0–23 h con hora pico y hora tranquila, filtro opcional por día de semana
- [x] 2.4 Endpoint `GET /api/reports/category-sales`: unidades, ingresos, share % y ticket promedio por ítem por categoría
- [x] 2.5 Endpoint `GET /api/reports/top-products`: ranking con groupBy drink/flavor/size/bobaType/topping, métrica quantity/revenue y limit
- [x] 2.6 Endpoint `GET /api/reports/slow-movers`: anti-join matriz `DrinkPrice` vs ventas, orden ascendente, `includeZero`
- [x] 2.7 Endpoint `GET /api/reports/dashboard-summary`: hoy vs ayer, delta %, últimos 7 días y órdenes pendientes, con cache corto
- [x] 2.8 Habilitar `format=csv` en todos los endpoints tabulares

## 3. Migración de esquema

- [x] 3.1 Agregar enum `PaymentMethod`, estado `ANULADO` y columnas nuevas en `Order` (`userId`, `paymentMethod`, `discountAmount`, `discountReason`, `discountedAt`, `cancelledAt`, `cancelReason`) al schema Prisma
- [x] 3.2 Agregar relación `User.orders` e índice `@@index([createdAt])` en `Order`
- [x] 3.3 Generar y aplicar migración; regenerar cliente Prisma y verificar contra SQLite local

## 4. Pedidos: anulación, descuentos y atribución

- [x] 4.1 Poblar `Order.userId` automáticamente desde la sesión al crear/procesar pedidos en las server actions existentes
- [x] 4.2 Implementar transición a `ANULADO` (desde cualquier estado, irreversible) exigiendo motivo y registrando `cancelledAt`/usuario
- [x] 4.3 Implementar registro de método de pago en el cobro del pedido
- [x] 4.4 Implementar aplicación de descuento (monto + motivo) ajustando el total y registrando responsable
- [x] 4.5 Actualizar UI de pedidos en el admin: acciones de anular/descontar/cobrar con sus formularios y confirmaciones

## 5. Reportes Fase 2 (post-migración)

- [x] 5.1 Excluir órdenes `ANULADO` del cómputo de ventas en el helper compartido y verificar todos los reportes Fase 1
- [x] 5.2 Poblar en `daily` el desglose por método de pago, total descontado y cantidad de anulaciones (reemplazar los `null`)
- [x] 5.3 Activar `GET /api/reports/staff-performance` (ranking por recaudación, share %, filtro por userId)
- [x] 5.4 Activar `GET /api/reports/adjustments` (auditoría paginada con filtros type/userId y resumen de montos)

## 6. Panel de Reportes en el admin

- [x] 6.1 Crear ruta `(dashboard)/reports` con navegación y selectores de rango/granularidad reutilizables
- [x] 6.2 Vistas de cada reporte consumiendo los endpoints (tablas, series simples y tarjetas KPI) con estados vacíos y de carga
- [x] 6.3 Botones de export CSV por reporte

## 7. Verificación

- [x] 7.1 Probar escenarios de specs: sin sesión (401), parámetros inválidos (400), rango > 366 días (422), día sin movimiento, usuario inexistente (404), endpoints pre-migración (501)
- [x] 7.2 Verificar timezone: ventas nocturnas caen en el día/hora correcta local y el bucketing semanal usa semana ISO
- [x] 7.3 Verificar precios históricos: cambiar catálogo no altera reportes pasados
- [x] 7.4 Ejecutar lint/typecheck/build del monorepo y validar el cambio con `openspec validate add-reports-module --strict`
