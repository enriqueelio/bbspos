## 1. Datos y tipos compartidos

- [x] 1.1 Actualizar `packages/db/prisma/schema.prisma`: enum `Role { ADMIN, CAJERO }` + `User.role`, enum `OrderStatus` con `INGRESADO|ENTREGADO|ANULADO` (sin `RECIBIDO` ni `EN_PREPARACION`) y columna `Order.deliveredAt DateTime?`
- [x] 1.2 Crear migración con UPDATEs de datos (`RECIBIDO`→`INGRESADO`, `EN_PREPARACION`→`INGRESADO`), aplicar y regenerar cliente Prisma
- [x] 1.3 Actualizar seed: usuario administrador con `role ADMIN` y crear usuario cajero de prueba (`cajero@bubba.mx`)
- [x] 1.4 Actualizar `packages/types`: `OrderStatus`, `Role`, `OrderStatusLabel`, `RoleLabel`, campo `deliveredAt?: string | null` en `Order` y tipo `CashierDailyData` (KPIs del día con tiempo promedio de entrega)

## 2. Apps existentes adaptadas al nuevo flujo

- [x] 2.1 `apps/admin`: reescribir acciones de pedidos para flujo de dos estados (entregar directo desde `INGRESADO`, registrar `deliveredAt` una sola vez); eliminar lógica de `EN_PREPARACION`
- [x] 2.2 `apps/admin`: actualizar UI de pedidos — filtros/etiquetas sin "En preparación", botón único "Entregar", badge de entregado con hora
- [x] 2.3 `apps/admin`: ajustar dashboard-summary (`pendingOrders` solo cuenta `INGRESADO`), reportes que usan estados y restricción de acceso por rol `ADMIN`
- [x] 2.4 `apps/store`: actualizar etiquetas/textos de estados mostrados al cliente (confirmación muestra `INGRESADO`)

## 3. App del cajero

- [x] 3.1 Scaffold de `apps/cajero`: Next.js + TypeScript + Tailwind en puerto 3002, dependencias compartidas (`@bbspos/db`, `@bbspos/ui`, `@bbspos/types`), `.env` propio y script dev/build
- [x] 3.2 Configurar NextAuth credentials con cookie y secreto propios; middleware de rutas que exige sesión con rol `CAJERO` o `ADMIN`
- [x] 3.3 Página de login del cajero con mensaje específico cuando la cuenta no tiene permisos
- [x] 3.4 Pestaña Preparar: server component con cola de pedidos `INGRESADO` del día (más antiguo primero) con detalle completo y antigüedad; estado vacío
- [x] 3.5 Server action `deliverOrder(orderId)` con confirmación: valida estado, setea `ENTREGADO` + `deliveredAt` + `userId`, revalida la cola
- [x] 3.6 Refresco automático de la cola cada 15 s (pausado con pestaña oculta) más refresh tras cada entrega
- [x] 3.7 Pestaña Reporte: KPIs del día local (ingresos, entregados, ticket promedio, tiempo promedio de entrega, desglose por método de pago) calculados solo sobre entregados
- [x] 3.8 Rendimiento exclusivo del usuario conectado: pedidos entregados por él y su tiempo promedio, sin datos de otros cajeros

## 4. Infraestructura y verificación

- [x] 4.1 Agregar servicio del cajero a `docker-compose.yml` (puerto 3002) y actualizar README con las tres apps
- [x] 4.2 Probar escenarios: cajero entra y ve cola ordenada; entrega un pedido (sale de la cola, queda atribuido con `deliveredAt`); no puede reentregar; admin no ve "En preparación"; pedidos históricos migrados visibles
- [x] 4.3 Probar accesos: sin sesión → login; `CAJERO` no entra a `/admin`; `ADMIN` sí entra a la app del cajero; credenciales inválidas rechazadas
- [x] 4.4 Verificar reporte del cajero: día con entregas muestra KPIs y tiempo promedio correcto (comparar contra `createdAt`/`deliveredAt`); día vacío en ceros; métricas limitadas al usuario conectado
- [x] 4.5 Ejecutar lint/typecheck/build del monorepo completo y validar con `openspec validate add-cashier-app --strict`
