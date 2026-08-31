# Módulo de Reportes — Especificación Técnica (API)

Proyecto: Bubba (bubble tea) · App: `apps/admin` · DB: `packages/db` (Prisma + SQLite)
Versión: 1.0 · Moneda: BOB (enteros, igual que `Order.total`) · Timezone: `America/La_Paz`

---

## 1. Objetivo

Exponer al personal autenticado una suite de reportes de ventas, producto y personal sobre los datos persistidos por el módulo de pedidos (`Order` / `OrderItem` / `OrderItemTopping`), más extensiones de esquema para auditoría (staff, métodos de pago, anulaciones y descuentos).

## 2. Convenciones globales

| Aspecto | Decisión |
|---|---|
| Base path | `/api/reports/*` (route handlers en `apps/admin/app/api/reports/`) |
| Auth | Sesión NextAuth obligatoria. Sin sesión → `401` |
| Envelope | `{ "data": ..., "meta": {...} }` |
| Dinero | Enteros en BOB; promedios redondeados a entero |
| Fechas | Query params en `YYYY-MM-DD`; respuestas ISO-8601 con offset local |
| Rango máximo | 366 días entre `from` y `to`, salvo indicación contraria |
| Export | Todo reporte tabular acepta `format=csv` (default `json`). CSV con `,`, UTF-8 BOM, encabezados en español |
| Ventas computadas | Órdenes creadas en el rango. Fase 1: todas. Fase 2: se excluyen `ANULADO`. Param opcional `status` |

### 2.1 Envelope de respuesta

```json
{
  "data": {},
  "meta": {
    "report": "daily-summary",
    "from": "2026-08-24T00:00:00-04:00",
    "to": "2026-08-24T23:59:59-04:00",
    "generatedAt": "2026-08-24T20:15:30-04:00",
    "currency": "BOB"
  }
}
```

### 2.2 Errores

```json
{
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "La fecha 'from' debe ser anterior o igual a 'to'."
  }
}
```

| HTTP | `error.code` | Cuándo |
|---|---|---|
| 400 | `INVALID_PARAMETER` | Parámetro malformado (`date=31-12-2026`, `granularity=x`) |
| 400 | `MISSING_PARAMETER` | Falta `date`, o `from`/`to` |
| 400 | `INVALID_DATE_RANGE` | `from > to` |
| 401 | `UNAUTHENTICATED` | Sin sesión NextAuth |
| 404 | `NOT_FOUND` | Recurso inexistente (p. ej. `userId` desconocido) |
| 422 | `DATE_RANGE_TOO_LARGE` | Rango > 366 días |
| 501 | `NOT_IMPLEMENTED_SCHEMA` | Endpoint Fase 2 consultado antes de la migración |
| 500 | `INTERNAL_ERROR` | Error no controlado (se loguea; no se filtran detalles) |

---

## 3. Extensiones de esquema requeridas (Prisma)

Parte de lo pedido no está soportado por el modelo actual. Se divide en dos fases.

### Fase 1 — sin migración

Reportes: diario, rango de fechas, horas pico, top productos, baja rotación, ventas por categoría, resumen dashboard.

### Fase 2 — requiere migración

```prisma
enum OrderStatus {
  RECIBIDO
  EN_PREPARACION
  ENTREGADO
  ANULADO          // nuevo
}

enum PaymentMethod {
  EFECTIVO
  QR
  TARJETA
}

model Order {
  // ...campos actuales...
  userId         String?
  user           User?          @relation(fields: [userId], references: [id])
  paymentMethod  PaymentMethod?
  discountAmount Int            @default(0)
  discountReason String?
  discountedAt   DateTime?
  discountedById String?        // quien aplicó el descuento (FK -> User)
  discountedBy   User?          @relation("OrderDiscountedBy", fields: [discountedById], references: [id])
  cancelledAt    DateTime?
  cancelReason   String?
  canceledById   String?        // quien anuló el pedido (FK -> User)
  canceledBy     User?          @relation("OrderCanceledBy", fields: [canceledById], references: [id])
}

model User {
  // ...campos actuales...
  orders Order[]
  cancelledOrders Order[] @relation("OrderCanceledBy")
  discountedOrders Order[] @relation("OrderDiscountedBy")
}
```

> Índices recomendados: `@@index([createdAt])` en `Order`, `@@index([canceledById])` y `@@index([discountedById])`.

Los endpoints marcados **[Fase 2]** devuelven `501 NOT_IMPLEMENTED_SCHEMA` hasta aplicar la migración.

---

## 4. Endpoints

### 4.1 Reporte Diario (Cierre de caja)

`GET /api/reports/daily`

Resumen de un día calendario: ingresos, total de órdenes, ticket promedio y desgloses.

**Query params**

| Param | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `date` | `YYYY-MM-DD` | no | hoy (local) | |
| `format` | `json\|csv` | no | `json` | |

**Response `data`** *(Fase 1)*

```json
{
  "date": "2026-08-24",
  "revenueTotal": 4850,
  "ordersTotal": 62,
  "avgTicket": 78,
  "itemsSold": 71,
  "toppingsRevenue": 430,
  "byCategory": [
    { "category": "MILK",    "orders": 34, "units": 38, "revenue": 2790 },
    { "category": "WATER",   "orders": 18, "units": 20, "revenue": 1210 },
    { "category": "SPECIAL", "orders": 10, "units": 13, "revenue": 850 }
  ],
  "paymentBreakdown": null,
  "discountsTotal": null,
  "cancellationsCount": null
}
```

- `paymentBreakdown`, `discountsTotal`, `cancellationsCount`: `null` en Fase 1; poblados en Fase 2:
  - `paymentBreakdown`: `[{ "method": "EFECTIVO", "orders": 20, "revenue": 1560 }, ...]`
  - `discountsTotal`: suma de `discountAmount`
  - `cancellationsCount`: órdenes `ANULADO` del día

**Errores:** `400 INVALID_PARAMETER`, `401 UNAUTHENTICATED`, `500 INTERNAL_ERROR`.

---

### 4.2 Reporte por Rango de Fechas (Evolución de ventas)

`GET /api/reports/sales-range`

Serie temporal de ventas entre dos fechas para ver tendencias y detectar los días de mayor venta.

**Query params**

| Param | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `from` | `YYYY-MM-DD` | sí | — | inclusive |
| `to` | `YYYY-MM-DD` | sí | — | inclusive, máx 366 días |
| `granularity` | `day\|week\|month` | no | `day` | Agrupación de la serie |
| `status` | enum `OrderStatus` | no | todos | Fase 2 permite excluir `ANULADO` |
| `format` | `json\|csv` | no | `json` | |

**Response `data`**

```json
{
  "summary": {
    "revenueTotal": 31450,
    "ordersTotal": 401,
    "avgTicket": 78,
    "bestDay": { "date": "2026-08-21", "revenue": 6120 },
    "comparisonPrevPeriod": { "revenueDeltaPct": 12.4 }
  },
  "series": [
    { "bucket": "2026-08-17", "orders": 55, "revenue": 4290, "avgTicket": 78 },
    { "bucket": "2026-08-18", "orders": 61, "revenue": 4770, "avgTicket": 78 }
  ]
}
```

- `bucket` respeta `granularity` (`YYYY-MM-DD`, semana ISO `2026-W34`, o `YYYY-MM`).
- `comparisonPrevPeriod`: mismo largo de rango inmediatamente anterior; `null` si no hay datos previos.

**Errores:** `400 MISSING_PARAMETER`, `400 INVALID_PARAMETER`, `400 INVALID_DATE_RANGE`, `422 DATE_RANGE_TOO_LARGE`, `401`, `500`.

---

### 4.3 Reporte de Horas Pico

`GET /api/reports/peak-hours`

Volumen de transacciones por hora del día para identificar los momentos de mayor flujo.

**Query params**

| Param | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `from` | `YYYY-MM-DD` | sí | — | |
| `to` | `YYYY-MM-DD` | sí | — | máx 366 días |
| `weekday` | int `0-6` (0=lunes) | no | todos | Permite comparar, p. ej., solo sábados |
| `format` | `json\|csv` | no | `json` | |

**Response `data`**

```json
{
  "hourly": [
    { "hour": 12, "orders": 210, "revenue": 16380 },
    { "hour": 13, "orders": 264, "revenue": 20590 },
    { "hour": 19, "orders": 180, "revenue": 14040 }
  ],
  "peakHour":  { "hour": 13, "orders": 264 },
  "quietHour": { "hour": 16, "orders": 22 }
}
```

- `hourly` contiene siempre las 24 horas (0–23); horas sin movimiento van en `0`.
- Hora tomada de `Order.createdAt` convertida a timezone local.

**Errores:** ídem 4.2 + `400 INVALID_PARAMETER` si `weekday ∉ [0..6]`.

---

### 4.4 Rendimiento por Cajero/Mesero [Fase 2]

`GET /api/reports/staff-performance`

Órdenes procesadas, total recaudado y promedios por usuario (requiere `Order.userId`).

**Query params**

| Param | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `from` | `YYYY-MM-DD` | sí | — | |
| `to` | `YYYY-MM-DD` | sí | — | |
| `userId` | string (cuid) | no | todos | Filtra a un solo usuario |
| `format` | `json\|csv` | no | `json` | |

**Response `data`**

```json
[
  {
    "user": { "id": "ckx...", "name": "María" },
    "ordersProcessed": 142,
    "revenueTotal": 11076,
    "avgTicket": 78,
    "shareOfRevenuePct": 35.2
  }
]
```

Ordenado por `revenueTotal` descendente.

**Errores:** ídem globales + `404 NOT_FOUND` si `userId` no existe + `501 NOT_IMPLEMENTED_SCHEMA` antes de migrar.

---

### 4.5 Anulaciones y Descuentos [Fase 2]

`GET /api/reports/adjustments`

Registro de auditoría de descuentos aplicados y órdenes anuladas.

**Query params**

| Param | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `from` | `YYYY-MM-DD` | sí | — | |
| `to` | `YYYY-MM-DD` | sí | — | |
| `type` | `discount\|cancellation\|all` | no | `all` | |
| `userId` | string | no | todos | Quién realizó la acción (ver nota de atribución) |
| `page` | int ≥ 1 | no | `1` | Paginación, 50 registros/página |
| `format` | `json\|csv` | no | `json` | |

> **Atribución (`byUser`):** para las **anulaciones** se usa `Order.canceledBy` (quién ejecutó la anulación) y para los **descuentos** `Order.discountedBy` (quién aplicó el descuento). Si ese registro es anterior a la migración (sin `canceledById`/`discountedById`), se hace *fallback* al `Order.user` original. El filtro `userId` aplica al campo de atribución correspondiente según `type`.

**Response `data`**

```json
{
  "summary": {
    "discountsCount": 8,
    "discountsTotal": 350,
    "cancellationsCount": 3,
    "cancellationsLostRevenue": 234
  },
  "items": [
    {
      "type": "cancellation",
      "orderId": "cky...",
      "orderSeq": 512,
      "amount": 120,
      "reason": "Pedido duplicado",
      "byUser": { "id": "ckx...", "name": "Juan" },
      "at": "2026-08-23T14:32:10-04:00"
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "totalItems": 11, "totalPages": 1 }
}
```

**Errores:** ídem 4.4 (`501 NOT_IMPLEMENTED_SCHEMA` antes de migrar).

---

### 4.6 Top Productos (más vendidos)

`GET /api/reports/top-products`

Ranking de lo más vendido por cantidad y por ingresos, sobre `OrderItem`.

**Query params**

| Param | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `from` | `YYYY-MM-DD` | sí | — | |
| `to` | `YYYY-MM-DD` | sí | — | |
| `groupBy` | `drink\|flavor\|size\|bobaType\|topping` | no | `flavor` | `drink` = combinación sabor+tamaño+boba |
| `metric` | `quantity\|revenue` | no | `quantity` | Criterio del ranking |
| `limit` | int 1–100 | no | `10` | |
| `format` | `json\|csv` | no | `json` | |

**Response `data`** (ejemplo con defaults)

```json
[
  { "rank": 1, "key": "Taro",      "unitsSold": 84, "revenue": 6552, "unitPriceAvg": 78 },
  { "rank": 2, "key": "Matcha",    "unitsSold": 61, "revenue": 4770, "unitPriceAvg": 78 },
  { "rank": 3, "key": "Chocolate", "unitsSold": 45, "revenue": 3510, "unitPriceAvg": 78 }
]
```

Con `groupBy=topping`, `key` es el nombre del topping y `revenue` incluye solo el precio del topping (no la bebida base). Con `groupBy=drink`, `key` usa el formato `"Matcha · L · Tapioca"`.

**Errores:** ídem globales.

---

### 4.7 Productos de Baja Rotación

`GET /api/reports/slow-movers`

Productos del catálogo activo con menor (o nulo) movimiento en un periodo.

**Query params**

| Param | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `from` | `YYYY-MM-DD` | sí | — | |
| `to` | `YYYY-MM-DD` | sí | — | |
| `limit` | int 1–100 | no | `10` | Cantidad de productos a listar |
| `includeZero` | boolean | no | `true` | Incluir combos sin ninguna venta |
| `format` | `json\|csv` | no | `json` | |

**Response `data`**

```json
[
  { "key": "Lavanda · M · Popping", "unitsSold": 0,  "revenue": 0,    "available": true },
  { "key": "Frutilla · S · Tapioca","unitsSold": 2,  "revenue": 136,  "available": true }
]
```

- Universo: matriz vigente de `DrinkPrice` (categoría × tamaño × tipo de boba) cruzada con ventas reales del periodo.
- Ordenado ascendente por `unitsSold`; los sin ventas primero.
- Los toppings también pueden analizarse con `toppings=true` (param opcional) usando `Topping.available`.

**Errores:** ídem globales.

---

### 4.8 Ventas por Categoría

`GET /api/reports/category-sales`

Desempeño comparado por categoría (`MILK`, `WATER`, `SPECIAL`) sobre `OrderItem.flavorCategory`.

**Query params**

| Param | Tipo | Requerido | Default | Notas |
|---|---|---|---|---|
| `from` | `YYYY-MM-DD` | sí | — | |
| `to` | `YYYY-MM-DD` | sí | — | |
| `format` | `json\|csv` | no | `json` | |

**Response `data`**

```json
{
  "categories": [
    { "category": "MILK",    "unitsSold": 380, "revenue": 29640, "sharePct": 62.5, "avgTicketItem": 78 },
    { "category": "WATER",   "unitsSold": 140, "revenue":  8470, "sharePct": 17.9, "avgTicketItem": 60 },
    { "category": "SPECIAL", "unitsSold":  90, "revenue":  9270, "sharePct": 19.6, "avgTicketItem": 103 }
  ],
  "bestCategory": "MILK"
}
```

**Errores:** ídem globales.

---

### 4.9 Resumen Dashboard (extra de alto valor)

`GET /api/reports/dashboard-summary`

Un solo endpoint para la pantalla principal del admin: KPIs de hoy contra ayer y la semana.

**Query params:** ninguno.

**Response `data`**

```json
{
  "today":     { "revenue": 4850, "orders": 62, "avgTicket": 78 },
  "yesterday": { "revenue": 4210, "orders": 55, "avgTicket": 76 },
  "deltaPct":  { "revenue": 15.2, "orders": 12.7 },
  "last7Days": { "revenue": 31450, "orders": 401, "avgTicket": 78 },
  "pendingOrders": 4
}
```

**Errores:** `401 UNAUTHENTICATED`, `500 INTERNAL_ERROR`.

---

### 4.10 Exportación CSV

Cualquier reporte tabular con `format=csv` responde:

```
200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="ventas-diarias-2026-08-24.csv"
```

En CSV no aplica el envelope; la primera fila son encabezados en español. Errores siguen respondiendo JSON.

---

## 5. Matriz de decisiones clave

| Decisión | Justificación |
|---|---|
| Dinero como entero BOB | Consistente con `Order.total` / `unitPrice` existentes; evita errores de redondeo |
| Reportes solo en admin | Datos sensibles del negocio; el store no consume ninguno de estos endpoints |
| Fase 1 / Fase 2 | Permitir lanzar lo reportable hoy sin bloquear por migraciones |
| Denormalizado de `OrderItem` para rankings | Ya captura nombre/precio al momento de la venta; no requiere joins al catálogo |
| Timezone fija local | SQLite guarda UTC; todo bucketing se hace convirtiendo a `America/La_Paz` |

## 6. Rendimiento

- Agregaciones en SQL (Prisma `groupBy` / `aggregate`) cuando sea posible; evitar traer filas crudas.
- Índice `Order(createdAt)` obligatorio antes de producción.
- Cache corto recomendado (30–60 s) en `dashboard-summary`.
- Límite de rango (366 días) acota el costo de cualquier consulta.

## 7. Roadmap sugerido

1. **Fase 1**: helpers de rango/tz + endpoints `daily`, `sales-range`, `peak-hours`, `category-sales`, `top-products`, `slow-movers`, `dashboard-summary`.
2. **Fase 2**: migración Prisma (staff/pagos/anulaciones) → endpoints `staff-performance`, `adjustments`; poblar campos `null` de `daily`; excluir `ANULADO` de todos los reportes de venta.
3. **Fase 3 (opcional)**: export PDF, comparativas personalizadas, alertas por umbral de baja rotación.

