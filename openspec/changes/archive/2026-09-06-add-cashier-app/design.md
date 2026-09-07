# Design: add-cashier-app

## Context

Monorepo pnpm+turbo con `apps/store` (cliente), `apps/admin` (Next.js 15 + NextAuth credentials, puerto 3001) y `packages/db` (Prisma 6 + SQLite). El cambio `add-reports-module` ya dejó: enum `OrderStatus { RECIBIDO, EN_PREPARACION, ENTREGADO, ANULADO }`, atribución `Order.userId`, timestamps de auditoría (`discountedAt`, `cancelledAt`) y helpers de zona horaria (`America/La_Paz`) en `apps/admin/lib/reports/range.ts`. Ver proposal.md para la motivación.

## Goals / Non-Goals

**Goals**

- Nueva app `apps/cajero` autónoma con su propio NextAuth y puerto 3002.
- Flujo de dos estados con medición exacta del tiempo de entrega.
- Roles mínimos (`ADMIN` | `CAJERO`) que separen el acceso admin/cajero.

**Non-Goals**

- Anulación de pedidos desde la app del cajero (sigue siendo operación de admin).
- Reportes multiusuario o exportación CSV en la app del cajero.
- Notificaciones push/sonido; la cola se refresca por polling.

## Decisions

### D1. Enum de dos estados con renombre en migración

`enum OrderStatus { INGRESADO, ENTREGADO, ANULADO }`. SQLite no soporta ALTER de enums (se guardan como texto): la migración ejecuta UPDATEs de datos (`RECIBIDO` → `INGRESADO`, `EN_PREPARACION` → `INGRESADO`) antes de reescribir los valores en el schema Prisma. *Alternativa descartada*: mantener `RECIBIDO` como nombre — se respeta el lenguaje del negocio ("ingresado").

### D2. `deliveredAt` explícito, no `updatedAt`

Columna nueva `DateTime? deliveredAt`. `updatedAt` es mutable por cualquier edición y no garantiza el momento de entrega. Se llena una sola vez al pasar a `ENTREGADO`; si ya tiene valor no se sobreescribe (idempotencia).

### D3. Rol como enum en `User`

`enum Role { ADMIN, CAJERO }` con `default CAJERO` para usuarios existentes tras migración (el seed actual crea el administrador → ese upsert pasa a `role ADMIN`). Middleware de cada app valida rol además de sesión: admin exige `ADMIN`; cajero admite `CAJERO` o `ADMIN`. *Alternativa descartada*: tabla separada de roles — innecesaria con dos valores fijos.

### D4. App del cajero con servidor directo, sin API HTTP propia

`apps/cajero` consulta Prisma directamente en server components y usa server actions (mismo patrón que el dashboard de admin). Evita duplicar la capa REST `/api/reports/*` (que pertenece a admin) y su guard de sesión cruzado entre dos NextAuth distintos. La pestaña de reporte calcula KPIs con las mismas convenciones de `add-reports-module`: dinero entero BOB, día local `America/La_Paz`, pedidos entregados (`status ENTREGADO`).

### D5. Refresco de la cola por polling ligero

Router refresh cada 15 s más refresh tras cada acción de entrega. *Alternativas descartadas*: WebSocket/SSE — infraextra para un mostrador con una tablet; el polling cubre el requisito de "sin recarga manual".

### D6. Reutilización de UI

La app del cajero consume `@bbspos/ui` (Badge, Button, Card, Input, Label), `@bbspos/types` y `@bbspos/db`; copia el patrón de estructura de `apps/admin` (layout con nav simple, página login, carpeta app router). Dos pestañas por query param `?tab=` (preparar | reporte), igual que el patrón existente.

## Risks / Trade-offs

- [Renombre de enum rompe textos/labels existentes] → Barrido completo de `RECIBIDO|EN_PREPARACION|Entregados|En preparación` en apps/store y apps/admin dentro de tasks.md; types centraliza etiquetas (`OrderStatusLabel`).
- [`EN_PREPARACION` en DB histórica distorsiona métricas viejas] → Los pedidos migrados a `INGRESADO` quedan sin `deliveredAt`; los reportes solo miden entregas con ambos timestamps presentes.
- [Dos NextAuth independientes] → Secretos y cookie names distintos por app (`NEXTAUTH_SECRET_CAJERO`, cookie `cajero.session-token`) para evitar colisiones de sesión en mismo navegador.
- [Polling en tablet con pestaña olvidada] → Pausar el intervalo cuando `document.hidden`.

## Migration Plan

1. Migración Prisma única: renombres de estado + columnas `deliveredAt` y `User.role`.
2. Desplegar paquetes compartidos y `apps/admin` actualizados junto con `apps/cajero` (monorepo, un solo deploy docker-compose con servicio nuevo en 3002).
3. Rollback: revertir código; los datos migrados son compatibles hacia atrás salvo el renombre de estados, que requiere los UPDATEs inversos si se vuelve a una versión previa.

## Open Questions

- Ninguna pendiente que afecte specs o tareas.
