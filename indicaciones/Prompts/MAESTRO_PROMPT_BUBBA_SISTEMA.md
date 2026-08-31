# PROMPT MAESTRO DE INGENIERÍA INVERSA — SISTEMA POS BUBBA

Actúa como un desarrollador full-stack de Next.js. Recrea EXACTAMENTE el sistema POS de una tienda de bubble drinks ("Bubble Drinks") descrito a continuación, siguiendo la arquitectura, los módulos, el esquema de base de datos y la lógica de negocio al pie de la letra. No inventes características; reproduce todo lo que aquí se especifica.

---

## 1. ARQUITECTURA Y STACK

- **Monorepo** gestionado con pnpm.
- **Next.js 14+ con App Router** (server components + server actions + client components).
- **Prisma ORM con SQLite** como base de datos (`provider = "sqlite"`).
- **Tailwind CSS** con tema oscuro semántico (variables CSS HSL en `:root`, sin toggle claro/oscuro).
- **NextAuth con estrategia JWT** y provider de credenciales (username + password).
- Estructura de paquetes:
  - `packages/db` — esquema Prisma y cliente.
  - `packages/types` — tipos compartidos, enums, labels y constantes del catálogo.
  - `packages/ui` — componentes UI base (Badge, Button, Card, CardContent, CardHeader, CardTitle).
  - `apps/cajero` — aplicación principal (puerto distinto), contiene el Módulo Mesero y el Módulo Cajero.
  - `apps/admin` — panel de administración.
  - `apps/store` — tienda pública del cliente.
- Las apps comparten `@bubba/db`, `@bubba/types`, `@bubba/ui`.

### Autenticación
- Login por **username** (no email), case-insensitive (se normaliza a minúsculas en la búsqueda) + password.
- El usuario tiene `role` (`ADMIN | CAJERO | MESERO`) y `active` (bool).
- Mensajes diferenciados: "Esta cuenta está desactivada." (cuando username+password son correctos pero `active=false`) vs "Credenciales inválidas." (cuando son incorrectos).
- Tras el login se valida el rol permitido; si no lo tiene, se cierra sesión y se muestra "Esta cuenta no tiene permisos de cajero".
- **Cookie de sesión tipo navegador**: el handler de NextAuth elimina `Expires` y `Max-Age` de la cookie de sesión para que se borre al cerrar el navegador.
- Middleware de protección de rutas: todas excepto `/login`, `/api/auth/*`, `/_next/*`, `favicon.ico` requieren sesión con rol `CAJERO | ADMIN | MESERO`.

### Roles y permisos
- `hasCashierAccess(role)` → true para `CAJERO | ADMIN | MESERO` (puede entrar a la app y ver/tomar pedidos).
- `hasBillingAccess(role)` → true solo para `CAJERO | ADMIN` (puede registrar pagos).
- `MESERO` NO puede: registrar pagos (la server action `acceptOrder` lanza "No autorizado"), ver la cola de cobro, navegar a reportes, ni elegir tipo de entrega (siempre MESA).

---

## 2. BASE DE DATOS Y TRANSACCIONES (Schema Prisma)

Replica este esquema con **relaciones limpias** y sin errores de llaves foráneas (usar `cuid()` como id con `@default(cuid())`, `onDelete: Cascade` en las relaciones hijas).

```prisma
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  name      String
  password  String
  role      Role     @default(CAJERO)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  orders    Order[]
}

model Size        { id, name String @unique, oz Int, available Boolean @default(true), drinkPrices DrinkPrice[] }
model Flavor      { id, name String @unique, categories FlavorCategoryLink[], available Boolean @default(true) }
model FlavorCategoryLink { id, flavorId, flavor Flavor @relation(..., onDelete: Cascade), category FlavorCategory, @@unique([flavorId, category]) }
model BobaType    { id, name String @unique, kind BobaKind, available Boolean @default(true), drinkPrices DrinkPrice[] }

model DrinkPrice {  // matriz de precios: categoría × tamaño × boba
  id; category FlavorCategory; sizeId; size Size @relation(onDelete: Cascade)
  bobaTypeId; bobaType BobaType @relation(onDelete: Cascade); price Int
  @@unique([category, sizeId, bobaTypeId])
}

model Topping { id; name String @unique; price Int; available Boolean @default(true) }

model Order {
  id String @id @default(cuid())
  seq           Int?            @unique          // número de pedido legible
  status        OrderStatus     @default(RECIBIDO)
  customerName  String?
  deliveryType  DeliveryType?
  total         Int
  createdAt     DateTime        @default(now())
  paidAt        DateTime?                        // momento del cobro
  deliveredAt   DateTime?                        // momento de la entrega
  items         OrderItem[]
  userId        String?
  user          User?          @relation(...)
  paymentMethod  PaymentMethod?                  // primer método (o único)
  paymentMethod2 PaymentMethod?                  // segundo método para cobro dividido
  paymentAmount2 Int?                            // monto pagado con el segundo método
  discountAmount Int @default(0)
  discountReason String?
  discountedAt   DateTime?
  cancelledAt    DateTime?
  cancelReason   String?
  delayNotified  Boolean @default(false)         // para alertas de Telegram (mutex)
  @@index([createdAt, status]); @@index([deliveredAt]); @@index([userId, status])
}

model OrderItem {  // y denormaliza nombre/tipo/precio para mantener histórico estable
  id; orderId; order Order @relation(onDelete: Cascade)
  sizeName; flavorName; flavorCategory FlavorCategory; bobaTypeName
  unitPrice Int; quantity Int; toppings OrderItemTopping[]
  @@index([orderId])
}

model OrderItemTopping { id; orderItemId; orderItem OrderItem @relation(onDelete: Cascade); toppingName; unitPrice Int }
model PaymentConfig { id String @id @default("default"); qrImage; mimeType; updatedAt }
model DailyReportLog { date String @id; sentAt DateTime @default(now()) }

enum FlavorCategory { MILK WATER SPECIAL }         // CON AGUA / CON LECHE / ESPECIALES
enum BobaKind       { TAPIOCA POPPING }
enum OrderStatus    { RECIBIDO ACEPTADO ENTREGADO ANULADO }
enum Role           { ADMIN CAJERO MESERO }
enum PaymentMethod  { EFECTIVO QR TARJETA }
enum DeliveryType   { MESA LLEVAR }
```

### Lógica de transacciones de pedido
- `createPosOrder(items, customerName?, deliveryType?)` — crea la `Order` con todos los `OrderItem` (y sus toppings), asigna `seq`, calcula `total` a partir de las líneas. `deliveryType` queda `null` si el cajero no eligió uno.
- `acceptOrder(orderId, method, method2?, amount2?)` — valida que el pedido esté `RECIBIDO` o `ACEPTADO` sin pagar, exige `method` válido (`EFECTIVO` o `QR`), aplica cobro opcional dividido (métodos distintos, montos > 0, y `amount2` < total), setea `paidAt`, `paymentMethod(2)`/`paymentAmount2`, y avanza a `ACEPTADO`. **Bloquea a rol `MESERO` ("No autorizado")**.
- `deliverOrder(orderId)` — valida estado `ACEPTADO`, setea `deliveredAt` + `ENTREGADO` + atribuye `userId` al cajero/mesero conectado. No es reversible.
- La atención real tiene DOS momentos: pedido `RECIBIDO` (por cobrar) y `ACEPTADO` (por entregar, o ya entregado pendiente de cobro).

---

## 3. MÓDULO CAJERO (Escritorio / monitor ~19 pulgadas)

Es el mismo `apps/cajero`, pero orientado para pantalla grande. Es una **cola de pedidos** con control estricto del estado de pago y de entrega.

### Vistas / navegación por rol
- `page.tsx` decide el routing según el rol de la sesión:
  - `MESERO` → siempre aterriza en `?tab=venta` (terminal POS) y NO ve la barra de navegación (está bloqueado en la toma de pedidos).
  - `CAJERO / ADMIN` → default `?tab=preparar`, con navegación completa: **Preparar** (cola), **Nueva Venta** (POS), **Reporte del día**.

### La cola (`queue-view.tsx`)
- Ordena los pedidos por prioridad de estado: primero `RECIBIDO`, luego `ACEPTADO`, luego `ENTREGADO`; y dentro del mismo estado, del más reciente abajo.
- Contador de "PEDIDOS EN COLA" que solo cuenta `RECIBIDO` + `ACEPTADO`.
- **Refresco automático** cada 15 s, pausado cuando la pestaña está oculta (`visibilitychange`), con refresh inmediato al volver a primer plano.
- Cada tarjeta de pedido muestra:
  - `Pedido #X` (secuencial), nombre del cliente ("Para: ...").
  - Badge de estado (Recibido/Aceptado/Entregado/Anulado) con colores (azul recibido, verde aceptado/entregado).
  - **Badge de antigüedad (semáforo)** — texto limpio, sin redundancias: "Ingresado hace Xm"; para entregados "⏱ Tardó Xm" (tiempo desde ingreso hasta entrega). Auditorías de color: ≥10 min rojo pulsante (`animate-pulse`), ≥7 min ámbar, <7 min gris.
  - Hora de ingreso (`HH:MM` local).
  - Detalle de ítems: `cantidad× sabor (tamaño) · boba`, toppings en línea debajo, subtotal por línea.
  - **Total** en grande (tipografía mono, `text-4xl`).
  - Método(s) de pago y desglose; pago dividido como "Efectivo 20 Bs + QR 10 Bs".

### Control estricto de estado de pago — pedidos entregados sin cobrar
- Un pedido está "por cobrar" si: está `RECIBIDO`, o está `ACEPTADO` sin `paidAt`, o está `ENTREGADO` sin `paidAt`.
- **Alerta visual obligatoria y parpadeante**: cuando un pedido está `ENTREGADO` pero **no** `paidAt`, se muestra un badge rojo pulsante con el texto **"¡Falta Pagar!"** (fondo rojo, texto blanco, `animate-pulse`, con sombra roja `shadow-[0_0_10px_rgba(220,38,38,0.5)]`).
- **Montos de deuda en rojo**: en ese mismo pedido, el monto total se muestra en **rojo** (`text-red-500`) en vez de blanco, indicando el saldo pendiente.
- El cajero puede registrar el cobro de un pedido ya entregado en cualquier momento (retroactivo) mediante la rejilla de cobro.

### Rejilla de cobro (solo `CAJERO / ADMIN`)
- Botones `EFECTIVO` y `QR` (grandes, `h-14`, texto en negrita), botón `Cobro dividido` y botón `Reimprimir`.
- **Cobro dividido**: diálogo con teclado numérico para el primer método y el monto, muestra el restante para el segundo; valida que ambos montos sean positivos, el primero < total, y métodos distintos.
- Para `MESERO`, en vez de la rejilla de cobro se muestra el badge "Esperando pago en caja..." (RECIBIDO) o "Pendiente de pago" (ACEPTADO).
- Pedido `ACEPTADO`: botón verde **"Marcar entregado"** con confirmación ("¿Confirmas la entrega de este pedido? Esta acción no se puede deshacer.") — disponible para todas las roles.

### Alertas y feedback
- **Alertas Telegram**: cuando un pedido lleva ≥10 min en `RECIBIDO`/`ACEPTADO`, se envía notificación a Telegram **una sola vez** (mutex con `delayNotified` + flag local). Si falla el envío, se libera el flag para reintentar en el siguiente tick.
- **Glow** en pedidos "frescos" (RECIBIDO o ACEPTADO sin pagar): borde primario + `animate-glow` (pulso azul).
- Overlay de error a pantalla completa (fondo rojo) con botón "Aceptar"; notificaciones de éxito en verde.
- Estado vacío: "No hay pedidos por preparar".

---

## 4. MÓDULO MESERO (Tablet / ~8 pulgadas)

Es la pestaña **Nueva Venta** (`?tab=venta`) = componente `PosTerminal`. Interfaz **simplificada y táctil** enfocada únicamente en la **toma rápida de pedidos** y su envío al sistema. Sin administración ni cobro.

### Layout: dos columnas responsive (`flex-col lg:flex-row`, fondo `bg-slate-950`)
- **Izquierda (flex-1, scrolleable)**: catálogo de menú, con el contenido centrado en un contenedor `max-w-4xl`.
- **Derecha (`lg:w-[420px]`, barra lateral fija)**: ticket en curso + área de cobro inferior fija.

### Columna izquierda — selector de productos (todo táctil, feedback `active:scale-95`)
1. **Pestañas de categorías** (`MILK/WATER/SPECIAL` → CON LECHE / CON AGUA / ESPECIALES): botones `h-12`; categorías sin sabores disponibles deshabilitadas al 30% de opacidad; categoría activa con `bg-primary`.
2. **Grilla de sabores**: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, botones `h-16` con texto que quiebra línea; al tocar un sabor se inicia el producto en construcción (si ya había otro sabor se reinicia la selección).
3. **Tamaño**: botones `h-16`, muestran `Nombre · oz` (ej. "Grande · 24 oz").
4. **Tipo de boba**: botones `h-16` (Tapioca / Explosivas).
5. **Extras (toppings opcionales)**: fila de botones `h-11` con `+ Nombre · precio`, selección múltiple (toggle).
6. **Pre-ticket "Producto en curso"** (solo si hay un sabor elegido): muestra sabor, tamaño · boba, toppings, **subtotal** en frente mono, y botón grande verde **"Confirmar producto"** (`h-16`, `bg-emerald-600`) — deshabilitado hasta que haya tamaño + boba + sabor. Al confirmar, el producto se agrega al ticket y los selectores se resetean.

### Columna derecha — ticket en curso y envío
- Encabezado "Ticket en curso" + botón **"Limpiar"** (vacía carrito y selección).
- Botones **+ / −** grandes (`h-14 w-14`) para cambiar cantidad (mínimo 1) y botón **"Quitar"** rojo por línea.
- Cuerpo del ticket scrolleable (`max-h-[70vh]`).
- **Área de pago fija al fondo**:
  - Input "Nombre del cliente (opcional)".
  - Selector de entrega **MESA / LLEVAR** (grid de 2). Para el mesero está **forzado a MESA** (sin importar su elección) — solo el cajero/admin puede elegir libremente o dejar en blanco (`null`).
  - **Total** en grande (frente mono).
  - Botón de envío según rol:
    - **CAJERO/ADMIN**: azul `bg-blue-600`, texto **"Enviar y Cobrar"** + monto total; tras enviar navega a `/?tab=preparar`.
    - **MESERO**: gris `bg-slate-700`, texto **"Enviar a Caja"**, sin monto; tras enviar permanece en `/?tab=venta` para seguir tomando órdenes.
- **Persistencia del carrito**: store externo con `useSyncExternalStore` que persiste en `localStorage` (clave `bubba-pos-cart`) — sobrevive recargas; pero al montar el `PosTerminal` se **limpia** el carrito y los selectores para que el mesero no herede un pedido anterior. API: `addItem`, `updateQuantity`, `removeItem`, `setCustomerName`, `setDeliveryType`, `clear`.
- Después de enviar, muestra aviso verde "Pedido #X creado · Total Y Bs" y resetea todo.

### Touch del mesero (resumen)
- Flujo completo: tocar un sabor → elegir tamaño y boba → (opcional) toppings → "Confirmar producto" → repetir → (opcional) nombre → **"Enviar a Caja"**. El mesero NUNCA ve ni maneja montos de cobro; solo ve el total informativo del ticket.

---

## 5. TEMA OSCURO Y ESTILOS

- App **dark-only**, sin toggle. Variables CSS semánticas en `:root` (valores HSL):
  - `--background: 222.2 47.4% 11.2%` (azul muy oscuro)
  - `--foreground: 210 40% 98%`
  - `--card: 222.2 84% 4.9%`
  - `--primary: 221.2 83.2% 53.3%` (azul vibrante)
  - `--success: 160.1 84.1% 39.4%` (verde)
  - `--destructive: 346.8 77.2% 49.8%` (rojo)
  - `--warning: 37.7 92.1% 50.2%` (ámbar)
- Body: `bg-slate-950 text-slate-50`. Componentes con clases Tailwind oscuras explícitas (`bg-slate-900/800/700`, `text-white`, bordes `border-slate-700/800`).
- Animaciones: `card-enter` (slide-up fade-in para tarjetas), `animate-glow` (pulso de sombra azul para pedidos frescos), `animate-pulse` (alertas rojas).
- `@media print`: ocultar todo excepto `.print-report-area` para exportar reporte a PDF/impresión.

---

## 6. MÓDULO ADMIN (apps/admin — panel de administración)

Panel web de gestión para `ADMIN`, separado de la app del cajero. Login por **username** (igual que cajero), restringido a rol `ADMIN`; usuarios `CAJERO/MESERO` no entran.

### Estructura del dashboard
- Layout con navegación lateral (`admin-nav.tsx`). Secciones: **Menu**, **Pedidos**, **Pagos**, **Impresora**, **Reportes**, **Presentación (slideshow)**, **Usuarios**.
- Acceso restringido por rol `ADMIN` en todas las rutas del dashboard.

### Gestión de menú / catálogo
- CRUD de sabores, tamaños (con `oz`), tipos de boba (Tapioca/Explosivas), toppings (con `price`) y la **matriz de precios** `DrinkPrice` por (categoría × tamaño × boba).
- Control de disponibilidad (`available`): un sabor/categoría sin habilitados se oculta del catálogo del POS y de la tienda.

### Gestión de pedidos
- Listado de pedidos con filtros por estado: **Todos / Recibidos / Aceptados / Entregados / Anulados**.
- Badges de estado y botones según estado:
  - `RECIBIDO` → botón "Registrar pago" con selector **Efectivo | QR** (o **Cobro dividido**).
  - `ACEPTADO` → botón "Entregar".
- Muestra método de pago, hora de aceptación, entrega, y desglose de pago dividido.
- Botón "Reimprimir" por pedido (reimprime la comanda a la impresora térmica).
- Control de **descuentos** (`applyDiscount`: `discountAmount`, `discountReason`, `discountedAt`) y **cancelaciones/anulaciones** (`cancelledAt`, `cancelReason`) con sus reportes asociados.
- Al igual que en cajero, el estado de pago es estricto: un pedido entregado sin `paidAt` queda marcado como deuda pendiente de cobro.

### Sección Reportes (apps/admin)
Módulo analítico con múltiples reportes sobre pedidos cobrados/entregados. Se sirven por API REST (`/api/reports/...`) y se presentan con UI de gráficos/listas. Constantes compartidas: `BUSINESS_TIME_ZONE = "America/La_Paz"`, `MANUAL_REPORT_CUTOFF = "23:10"` (hora mínima para cierre manual). Tipos: `ReportEnvelope<T>` con `meta` (report, from, to, generatedAt, currency="BOB").
- **daily** (`/api/reports/daily`) — por día: ingresos, órdenes, ticket promedio, ítems vendidos, ingresos por toppings, desglose por categoría y por método de pago (incluye pagos divididos), descuentos y cancelaciones.
- **dashboard-summary** — KPIs del panel: hoy vs ayer (ingresos, órdenes, ticket promedio), delta porcentual, últimos 7 días, y `pendingOrders` (cuenta solo `RECIBIDO`).
- **sales-range** — serie por bucket (día/semana/mes): órdenes, ingresos, ticket promedio, mejor día, comparación vs periodo anterior.
- **top-products** — ranking de productos por unidades/ingresos, agrupable por `drink | flavor | size | bobaType | topping`.
- **category-sales** — ventas por categoría (unidades, ingresos, % de participación, mejor categoría).
- **peak-hours** — horas pico: ingresos y órdenes por hora del día, hora pico y hora muerta.
- **slow-movers** — productos de baja rotación (los que menos se venden).
- **staff-performance** — rendimiento por usuario: órdenes procesadas, ingresos, ticket promedio, % de participación (basado en `userId`/entrega).
- **adjustments** — descuentos y cancelaciones con motivo, monto, usuario y fecha.

### Gestión de usuarios
- Listado: nombre, username, rol, estado (activo/inactivo), marca "tú".
- Alta con nombre, username, password (mínimo 6 caracteres) y rol; correo/username duplicado rechazado.
- Edición de nombre, rol, y reset opcional de contraseña.
- **Baja/reactivación** (`setUserActive`) con confirmación inline y badges.
- **Protecciones**: no permitir auto-baja/auto-degradación, ni dejar el sistema sin administradores activos (cálculo transaccional). Usuarios inactivos no pueden iniciar sesión ("cuenta desactivada").
- Usuarios `CAJERO-MESERO` se gestionan aquí y luego entran a `apps/cajero`.

### Gestión de impresora (apps/admin)
- **API**: `GET/PUT /api/printer` (listar impresoras del servidor con `Get-Printer` + guardar la configurada), `POST /api/printer/connect`, `POST /api/printer/test` (imprime página de prueba). Config persistida en `apps/store/printing.json` (`{ printerName }`).
- **UI** (`(dashboard)/printer`): listado de impresoras con marca de predeterminada, selector, botones "Guardar" y "Probar impresión" (resultado visible).
- Motor de impresión (compartido con cajero): PowerShell + `System.Drawing.Printing` para impresora térmica 80mm; `formatComanda`, `formatDailyReport`, `formatSummaryReport`, `formatTestPage` en texto plano 32-42 columnas, sin acentos (ASCII-safe).

### Presentación / Slideshow (apps/store)
- **API**: `GET/POST /api/slideshow/media` + `POST /api/slideshow/upload` (sube imagen) + `GET /api/slideshow/media/[name]` (sirve archivo). Config persistida en `apps/store/public/slideshow.json` (`intervalMs` + lista de imágenes con `src`/`alt`).
- **UI** (`(dashboard)/slideshow`): subir/ordenar/quitar imágenes del carrusel y ajustar el intervalo. Alimenta el carrusel de la portada de la tienda.

---

## 7. MÓDULO STORE (apps/store — kiosco / tienda pública)

App pública orientada al **kiosco táctil** del local, donde el cliente arma su pedido y lo envía a la cocina (cola del cajero). Sin autenticación.

### Portada (kiosco)
- Ruta `/` (`app/page.tsx`): carrusel de fotos a pantalla completa (`PhotoCarousel`) leyendo `public/slideshow.json` (intervalo e imágenes) + un **botón grande "Comenzar"** (`StartBuilderButton`).
- `kiosk-timeout.tsx`: vuelve al inicio tras un tiempo de inactividad (comportamiento de kiosco).

### Armado de bebida (build)
- Flujo de 3 pasos para construir cada bebida con el catálogo (`Catalog` → `/api/catalog`): caja de categoría, sabor, tamaño, tipo de boba y toppings; precio base por la matriz `DrinkPrice` + suma de toppings (`computeBasePrice`/`sumToppings`/`computeItemPrice`).
- Botones táctiles grandes aptos para pantalla táctil.
- El cliente añade bebidas al carrito (store global tipo Zustand, persistido en localStorage — `lib/store/cart-store`), con una sola reutilización de la selección para agregar varios.

### Carrito y checkout (`app/cart/page.tsx`)
- **"Mi carrito"**: lista de ítems (fila `CartItemRow` de `@bubba/ui`) con cantidad/eliminar, contador de bebidas, botón "Cancelar" (limpia y vuelve al inicio).
- **Tipo de entrega**: botones "Para Servirse" (MESA) / "Para Llevar" (LLEVAR).
- **Total a pagar** calculado sobre ítems + toppings (`unitPrice + sumToppings(toppings)) * quantity`).
- **Checkout**: exige nombre del cliente ("Escribe tu nombre para que podamos entregarte el pedido."), invoca `createOrder(items, customerName, deliveryType)`, y tras confirmar muestra pantalla **"¡Pedido confirmado!"** con:
  - número de pedido `#XXXXX` (`formatOrderCode`),
  - nombre del cliente,
  - **total a pagar** en grande,
  - **código QR de pago** (si está configurado, desde `PaymentConfig`) para escanear,
  - botón "Volver al inicio" y nota "Tu comanda ya se está imprimiendo en mostrador."
- HTTP redirect automático al inicio si el carrito está vacío después de hidratar.

### Creación del pedido (`createOrder`)
- Server action `app/actions/order.ts`: asigna `seq` secuencial único, crea la `Order` con estado `RECIBIDO` y todos sus `OrderItem`/toppings **en una transacción** (evita errores de llaves foráneas parciales).
- Tras crear el pedido invoca la impresión de la comanda **best-effort** (usando `printing.json`) — si falla la impresora, el pedido no se bloquea.
- El pedido entra a la cola del cajero como `RECIBIDO` ("por cobrar"), idéntico a los pedidos generados desde el POS.

### QR de pago
- `getPaymentQr` (server action) lee `PaymentConfig` (fila con `id="default"`) y devuelve la imagen del QR (`qrImage`, `mimeType`) si existe; el cliente la escanea para pagar de forma autónoma.

---

## 8. PUNTOS CLAVE A NO PERDER (CHECKLIST DE VALIDACIÓN)

1. Roles `ADMIN | CAJERO | MESERO`, y que `MESERO` nunca pueda cobrar (bloqueado en UI **y** en la server action).
2. El mesero aterriza y permanece en la toma de pedidos; el cajero/admin navega entre cola/POS/reporte.
3. Entrega forzada a MESA para mesero; libertad MESA/LLEVAR/ninguna para cajero/admin.
4. Alerta "¡Falta Pagar!" parpadeante + monto en rojo para pedidos ENTREGADO sin cobrar.
5. Semáforo de antigüedad con textos limpios (sin redundancia): "Ingresado hace Xm" / "⏱ Tardó Xm".
6. Cobro dividido (dos métodos, montos validados).
7. Persistencia del carrito en localStorage pero limpieza al montar.
8. Login por username case-insensitive, cuentas desactivadas, cookie de sesión que expira al cerrar el navegador.
9. Matriz de precios por (categoría × tamaño × boba) resuelta desde `DrinkPrice`.
10. `Order.userId` atribuye la entrega al usuario que la marcó; `deliveredAt` se registra una sola vez.
11. **Admin**: acceso restringido a rol `ADMIN`; pedidos con filtro por estado; reportes múltiples sobre métricas de ventas; gestión de usuarios con protecciones (no auto-baja, no quedarse sin admin); gestión de impresora y slideshow.
12. **Store**: kiosco táctil — portada con carrusel, builder de 3 pasos, carrito con entrega MESA/LLEVAR, `createOrder` transaccional con estado `RECIBIDO` que alimenta la cola del cajero, confirmación con QR de pago, impresión best-effort.
13. El flujo end-to-end queda conectado: **Store/POS** crean pedidos `RECIBIDO` → **Cajero** cobra (acepta→`ACEPTADO`) y entrega (`ENTREGADO`+`deliveredAt`) → **Admin** reporta y administra catálogo/usuarios/impresora/slideshow.
14. Reportes usan la zona horaria `America/La_Paz` y el cierre de caja manual se habilita a partir de `23:10` local.

Genera la implementación completa respetando todas las reglas anteriores. Si algo no está especificado aquí, usa el criterio de menor implementación para que el sistema funcione de forma coherente con lo descrito.
