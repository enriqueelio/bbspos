## Context

Monorepo pnpm + turbo con `apps/admin` (Next.js App Router + NextAuth) y `packages/db` (Prisma + SQLite). Los pedidos ya persisten datos denormalizados de venta (`OrderItem` guarda sabor/tamaño/boba/toppings con precio capturado), lo que permite reportar sin joins al catálogo. El detalle completo de endpoints, parámetros y esquemas está en `docs/modulo-reportes-spec.md`; este documento registra las decisiones.

## Goals / Non-Goals

**Goals:**
- Suite `/api/reports/*` protegida por NextAuth, con envelope común, errores tipados y export CSV.
- Agregaciones empujadas a SQL; sin cargar filas crudas.
- Migración Prisma acotada para habilitar staff, métodos de pago, descuentos y anulaciones.
- Panel de Reportes en el dashboard del admin.

**Non-Goals:**
- Export PDF, alertas automáticas o BI externo.
- Cambios en `apps/store`.
- Reportes multi-local / multi-sucursal.

## Decisions

1. **Route handlers REST vs Server Actions** → Route handlers en `app/api/reports/*`. Razón: export CSV necesita `Content-Type`/`Content-Disposition` propios, y los reportes se consumen también como recursos consultables (URL compartible con filtros). Alternativa descartada: solo server actions (no modelan bien descargas ni códigos HTTP).
2. **Fases de entrega** → Fase 1 usa el esquema actual (diario, rango, horas pico, categoría, top, baja rotación, resumen); Fase 2 aplica la migración y habilita `staff-performance`, `adjustments`, desglose por método de pago y exclusión de anulados. Antes de migrar, esos endpoints responden `501 NOT_IMPLEMENTED_SCHEMA`. Razón: desbloquea valor inmediato sin acoplar la suite a la migración.
3. **Dinero como enteros BOB** → consistente con `Order.total`/`unitPrice`; promedios redondeados a entero. Sin decimales nuevos.
4. **Timezone** → SQLite guarda UTC; todo bucketing (día/hora/semana/mes) convierte a `America/La_Paz` mediante helper único (`lib/reports/range.ts`) que produce límites UTC a partir de fechas locales. Un solo helper evita divergencias entre endpoints.
5. **Agregación** → Prisma `aggregate`/`groupBy` sobre `createdAt`, `status` y columnas denormalizadas de `OrderItem`. Para horas pico y series se agrupa en SQL cuando el driver lo permite; si no, agregación en memoria sobre proyección mínima (`createdAt`, `total`) — el límite de 366 días acota el costo. Alternativa descartada: raw SQL extenso (acoplado al dialecto SQLite).
6. **Baja rotación** → universo = matriz vigente `DrinkPrice` (categoría × tamaño × boba); anti-join con ventas del periodo. No se reconstruye desde `OrderItem` porque los productos nunca vendidos no existen ahí.
7. **Anulación** → estado terminal `ANULADO` con `cancelledAt`/`cancelReason`; transición válida desde cualquier estado e irreversible. Los reportes de venta filtran `ANULADO` en Fase 2; en Fase 1 no existe ese estado.
8. **Atribución de staff** → columna opcional `Order.userId` poblada automáticamente con el usuario de sesión al crear/procesar; nullable para no romper pedidos históricos. Los descuentos llevan además `discountedAt` para registrar el momento del ajuste (exigido por auditoría).
9. **Envelope y errores** → `{ data, meta }` para éxito; `{ error: { code, message } }` para fallo, con tabla de códigos estable (`INVALID_PARAMETER`, `MISSING_PARAMETER`, `INVALID_DATE_RANGE`, `UNAUTHENTICATED`, `NOT_FOUND`, `DATE_RANGE_TOO_LARGE`, `NOT_IMPLEMENTED_SCHEMA`, `INTERNAL_ERROR`). Validación con zod en un parser compartido.
10. **CSV** → serializador propio pequeño (UTF-8 BOM, coma, encabezados en español) reutilizado por todos los reportes tabulares vía `format=csv`. Sin dependencia nueva.

## Risks / Trade-offs

- [SQLite limita agregaciones complejas] → mantener consultas simples y acotadas por rango; si crece, migrar a Postgres sin cambiar contratos.
- [Órdenes históricas sin userId/paymentMethod] → los reportes Fase 2 muestran "sin atribuir"; se documenta, no se retro-migra.
- [`ANULADO` cambia la semántica de ventas existente] → filtro aplicado en un único helper de cómputo para evitar inconsistencias entre reportes.
- [Rangos amplios pueden ser lentos] → índice `Order(createdAt)` + tope de 366 días + cache corto (30–60 s) en `dashboard-summary`.

## Migration Plan

1. Migrar Prisma (enums, columnas nuevas, índice). Aditiva; sin breaking para datos existentes.
2. Desplegar Fase 1 (reportes base) — independiente de la migración.
3. Desplegar Fase 2 (UI de anulación/descuento/método de pago en pedidos + reportes de auditoría/staff).
4. Rollback: los endpoints son aditivos; revertir código basta. La migración es reversible (columnas nullable, enums con default).

## Open Questions

- ¿El cierre de caja diario debe fijarse a una hora de corte distinta de medianoche (ej. 03:00)? Hoy: día calendario local.
