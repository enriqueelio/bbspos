=== PROYECTO: BUBBA DRINKS (Bubble Drink / Bubble Tea POS) ===
FECHA: 26 de agosto de 2026
STACK: Next.js 15, App Router, React 19, TypeScript, Tailwind CSS 3, Prisma 6, SQLite (dev) / PostgreSQL (prod),
       pnpm workspaces + Turborepo, NextAuth v4 (JWT), Zustand (persistencia cliente), Radix UI,
       Lucide React (iconos), PowerShell (.NET System.Drawing) para impresion termica.

================================================================================
                        1. DESCRIPCION GENERAL
================================================================================

Bubba Drinks es un sistema punto de venta (POS) completo para una cadena de
tiendas de bubble tea (bebidas con boba) llamada "Bubble Drink". El sistema
esta disenhado para una operacion en Bolivia (moneda: Bolivianos / Bs, timezone:
America/La_Paz, UTC-4). Todos los textos de la interfaz estan en espanol (es-BO).

El flujo principal del negocio funciona asi: primero el CLIENTE usa la aplicacion
de tienda (store) en un tablet o pantalla publica para armar su bebida eligiendo
categoria de sabor (agua, leche o especial), sabor especifico, tamano del vaso,
tipo de boba y toppings opcionales. Al confirmar el pedido se imprime
automaticamente una comanda en una impresora termica de 80mm en mostrador. El
CAJERO recibe el pedido en su pantalla (cajero app) en estado "RECIBIDO",
registra el pago (efectivo o QR) pasandolo a "ACEPTADO", y finalmente marca
cuando el cliente recoge su bebida ("ENTREGADO"). El ADMINISTRADOR supervisa
todo desde el panel admin: gestiona el menu/precios, usuarios, visualiza pedidos,
aplica descuentos, anula pedidos con motivo, revisa reportes de ventas y
administra la impresora y el slideshow de imagenes.

El proyecto es un monorepo gestionado con pnpm workspaces y Turborepo. Contiene
3 aplicaciones Next.js independientes que corren en puertos distintos y comparten
una base de datos SQLite unica (en produccion se migra a PostgreSQL). Las 4
aplicaciones se ejecutan simultaneamente con el comando "pnpm dev" desde la raiz.

================================================================================
                    2. ARQUITECTURA Y CARPETAS
================================================================================

ARBOL DE CARPETAS DEL PROYECTO:

bubba/
  |- apps/
  |   |- store/           (Puerto 3000) - Tienda publica para clientes
  |   |- admin/           (Puerto 3001) - Panel de administracion
  |   |- cajero/          (Puerto 3002) - Pantalla del cajero/mostrador
  |
  |- packages/
  |   |- config/          - Configuracion compartida (Tailwind preset, tsconfig)
  |   |- db/              - Prisma schema, cliente, migraciones y seed
  |   |- types/           - Tipos TypeScript, enums y funciones utilitarias
  |   |- ui/              - Componentes UI compartidos (shadcn/ui-style)
  |
  |- scripts/             - Scripts de utilidad (db-sync.bat)
  |- docs/                - Documentacion de especificaciones
  |- openspec/            - Sistema de specs y cambios experimentales
  |- docker-compose.yml   - Orquestacion Docker
  |- Dockerfile           - Build multi-etapa para produccion
  |- pnpm-workspace.yaml  - Definicion de workspaces
  |- turbo.json           - Configuracion de Turborepo
  |- package.json         - Package.json raiz con scripts globales


DESCRIPCION DE CADA CARPETA IMPORTANTE:

apps/store/               Tienda web publica donde el cliente arma su bebida.
  |- app/
  |   |- page.tsx                    Pagina principal (hero + carousel de fotos)
  |   |- layout.tsx                  Layout raiz con SiteHeader
  |   |- build/page.tsx              Ensamblador de bebida (paso a paso)
  |   |- build/build-client.tsx      Componente cliente del ensamblador (~310 lineas)
  |   |- cart/page.tsx               Carrito de compras y checkout
  |   |- actions/order.ts            Server Action: crear pedido + imprimir comanda
  |   |- actions/payment.ts          Server Action: obtener QR de pago
  |- components/
  |   |- site-header.tsx             Barra de navegacion con contador de carrito
  |   |- photo-carousel.tsx          Carrusel automatico de imagenes del slideshow
  |   |- start-builder-button.tsx    Boton "Arma tu boba" con modal de nombre
  |- lib/
  |   |- catalog.ts                  Consulta del catalogo completo a Prisma
  |   |- printing.ts                 Impresion termica via PowerShell/.NET
  |   |- use-has-hydrated.ts         Hook para evitar errores de hidratacion
  |   |- store/
  |       |- cart-store.ts           Estado del carrito (Zustand + persist localStorage)
  |       |- builder-store.ts        Estado del ensamblador (Zustand + persist)
  |- public/
  |   |- slideshow.json              Configuracion del carousel (intervalo + imagenes)
  |   |- images/                     Imagenes del slideshow (JPG, SVG)
  |- printing.json                   Config de impresora (generado por admin, no en git)

apps/admin/               Panel de administracion para el dueño/gerente.
  |- app/
  |   |- layout.tsx                  Layout raiz
  |   |- login/page.tsx              Pagina de login
  |   |- login/login-form.tsx        Formulario de login (cliente)
  |   |- (dashboard)/                Grupo de rutas protegidas
  |   |   |- layout.tsx              Layout del dashboard con sidebar de navegacion
  |   |   |- page.tsx                Home: KPIs del dia, pedidos recientes
  |   |   |- menu/page.tsx           Gestion de menu (sabores, tamanos, boba, precios)
  |   |   |- menu/menu-manager.tsx   Componente cliente del CRUD de menu
  |   |   |- orders/page.tsx         Lista de todos los pedidos con filtros
  |   |   |- orders/orders-client.tsx Componente cliente de pedidos
  |   |   |- payments/page.tsx       Gestion de imagen QR de pago
  |   |   |- payments/payments-client.tsx Componente cliente de pagos
  |   |   |- users/page.tsx          Gestion de usuarios y roles
  |   |   |- users/users-client.tsx  Componente cliente de usuarios
  |   |   |- reports/page.tsx        Panel de reportes (9 tipos)
  |   |   |- reports/reports-client.tsx Componente cliente de reportes
  |   |   |- printer/page.tsx        Configuracion de impresora termica
  |   |   |- slideshow/page.tsx      Administracion del carousel de imagenes
  |   |- actions/
  |       |- auth.ts                 Verificacion de cuenta inactiva
  |       |- catalog.ts              CRUD de menu y matriz de precios
  |       |- orders.ts               Aceptar, entregar, cancelar, descontar, reimprimir
  |       |- payment.ts              Guardar/eliminar QR de pago
  |       |- users.ts                Crear/editar/activar usuarios
  |   |- api/
  |       |- auth/[...nextauth]/     Handler de NextAuth
  |       |- printer/                CRUD de impresora (listar, conectar, probar)
  |       |- slideshow/              CRUD del carousel (subir, listar, servir imagenes)
  |       |- reports/                9 endpoints REST para reportes
  |- components/
  |   |- admin-nav.tsx               Navegacion lateral del admin
  |- lib/
  |   |- auth.ts                     Configuracion de NextAuth (credentials provider)
  |   |- session.ts                  Helper para obtener sesionrequerida
  |   |- printing.ts                 Impresion termica (reutilizada del store)
  |   |- reports/                    Utilidades de reportes
  |       |- csv.ts                  Serializador CSV
  |       |- guard.ts                Proteccion de endpoints de reportes
  |       |- params.ts               Schemas de validacion con Zod
  |       |- range.ts                Utilidades de rango de fechas (timezone La Paz)
  |       |- response.ts             Envelope estandar de respuestas
  |       |- sales.ts                Filtros de ventas por fecha
  |- middleware.ts                    Proteccion de rutas (solo ADMIN autorizado)
  |- types/next-auth.d.ts            Extension de tipos de NextAuth (id, role)

apps/cajero/              Pantalla simplificada para el cajero/mostrador.
  |- app/
  |   |- page.tsx                    Pagina principal con 2 tabs (preparar/reporte)
  |   |- layout.tsx                  Layout raiz
  |   |- login/page.tsx              Login del cajero
  |   |- login/login-form.tsx        Formulario de login (cliente)
  |   |- actions/
  |   |   |- auth.ts                 Verificacion de rol cajero
  |   |   |- orders.ts               Aceptar con pago, entregar pedido
  |   |   |- printing.ts             Reimprimir comanda
  |   |- api/auth/[...nextauth]/     Handler de NextAuth
  |- components/
  |   |- queue-view.tsx              Cola de pedidos con auto-refresh cada 15s
  |   |- report-view.tsx             Reporte del dia del cajero
  |- lib/
  |   |- auth.ts                     Configuracion NextAuth (cookie personalizada)
  |   |- session.ts                  Helper de sesion + verificacion de rol cajero
  |   |- day.ts                      Utilidades de timezone (America/La_Paz)
  |   |- printing.ts                 Impresion termica
  |   |- report.ts                   Datos del reporte diario del cajero
  |- middleware.ts                    Proteccion: solo CAJERO o ADMIN

packages/config/          Configuracion compartida.
  |- src/tailwind.ts                 Preset de Tailwind con colores del tema naranja
  |- tsconfig.base.json              Config base de TypeScript
  |- tsconfig.next.json              Config de TypeScript para Next.js

packages/db/              Capa de base de datos.
  |- src/index.ts                    Exporta PrismaClient (singleton global)
  |- prisma/
  |   |- schema.prisma               Schema completo de Prisma
  |   |- seed.ts                     Script de semilla (datos iniciales)
  |   |- dev.db                      Base de datos SQLite (desarrollo)
  |   |- migrations/                 11 migraciones chronologicas
  |- scripts/seed-reports-test.mjs   Generador de datos de prueba para reportes

packages/types/           Tipos y constantes compartidas.
  |- src/index.ts                    Enums, interfaces, funciones de formato (~426 lineas)

packages/ui/              Componentes de interfaz compartidos.
  |- src/
  |   |- index.ts                    Re-exports de todos los componentes
  |   |- lib/utils.ts                Funcion cn() (clsx + tailwind-merge)
  |   |- components/
  |       |- ui/                     Componentes basicos: button, card, badge, dialog, input, label, select
  |       |- builder/                Componentes del ensamblador: step-indicator, size-selector, flavor-picker, boba-picker
  |       |- cart/                   Componentes del carrito: cart-item, cart-summary, quantity-control

scripts/
  |- db-sync.bat                     Script Windows para sincronizar BD (parar servers, migrate, reiniciar)

docs/
  |- modulo-reportes-spec.md         Especificacion tecnica del modulo de reportes

openspec/                Sistema de especificaciones y control de cambios.
  |- specs/                          6 specs activos (admin-auth, drink-builder, drink-catalog, monorepo-scaffold, ordering, payment)
  |- changes/                        5 cambios activos (todos completados)
  |- changes/archive/                 3 cambios archivados

================================================================================
                3. MODELO DE DATOS / PRISMA SCHEMA
================================================================================

Base de datos: SQLite en desarrollo (file:./dev.db), PostgreSQL en produccion.
Schema completo en: packages/db/prisma/schema.prisma

TABLAS Y CAMPOS:

1. USER (Usuarios del sistema)
   - id: String (CUID, auto-generado, clave primaria)
   - email: String (unico, login del usuario)
   - name: String (nombre completo visible en la UI)
   - password: String (hash bcrypt de la contrasena)
   - role: Role enum (ADMIN o CAJERO, default CAJERO)
   - active: Boolean (default true, permite desactivar sin borrar)
   - createdAt: DateTime (auto-generado)
   - orders: Relation 1:N con Order

2. SIZE (Tamanos de vaso)
   - id: String (CUID)
   - name: String (unico, ej: "Grande", "Extragrande")
   - oz: Integer (capacity in ounces, ej: 16, 21)
   - available: Boolean (default true)
   - createdAt: DateTime
   - drinkPrices: Relation 1:N con DrinkPrice

3. FLAVOR (Sabores de bebida)
   - id: String (CUID)
   - name: String (unico, ej: "Taro", "Chocolate")
   - available: Boolean (default true)
   - createdAt: DateTime
   - categories: Relation 1:N con FlavorCategoryLink

4. FLAVOR_CATEGORY_LINK (Relacion sabor-categoria, tabla puente)
   - id: String (CUID)
   - flavorId: String (FK -> Flavor, cascade delete)
   - flavor: Relation N:1 con Flavor
   - category: FlavorCategory enum (MILK, WATER o SPECIAL)
   - createdAt: DateTime
   - @@unique([flavorId, category]) - Un sabor solo aparece una vez por categoria

   NOTA: Un sabor puede pertenecer a multiples categorias. Por ejemplo,
   "Frutilla" esta en WATER y MILK simultaneamente.

5. BOBA_TYPE (Tipos de boba)
   - id: String (CUID)
   - name: String (unico, ej: "Tapioca", "Explosivas")
   - kind: BobaKind enum (TAPIOCA o POPPING)
   - available: Boolean (default true)
   - createdAt: DateTime
   - drinkPrices: Relation 1:N con DrinkPrice

6. DRINK_PRICE (Matriz de precios: categoria x tamano x tipo de boba)
   - id: String (CUID)
   - category: FlavorCategory enum (MILK, WATER o SPECIAL)
   - sizeId: String (FK -> Size, cascade delete)
   - bobaTypeId: String (FK -> BobaType, cascade delete)
   - price: Integer (precio en Bolivianos, enteros, ej: 16 = 16 Bs)
   - createdAt: DateTime
   - @@unique([category, sizeId, bobaTypeId])

   EJEMPLO DE PRECIOS (del seed):
   - SPECIAL: Grande+Tapioca=20Bs, Grande+Explosivas=25Bs, Extragrande+Tapioca=30Bs, Extragrande+Explosivas=35Bs
   - WATER:   Grande+Tapioca=16Bs, Grande+Explosivas=20Bs, Extragrande+Tapioca=25Bs, Extragrande+Explosivas=30Bs
   - MILK:    Grande+Tapioca=18Bs, Grande+Explosivas=22Bs, Extragrande+Tapioca=28Bs, Extragrande+Explosivas=32Bs

7. TOPPING (Toppings opcionales)
   - id: String (CUID)
   - name: String (unico, ej: "Boba de tapioca extra")
   - price: Integer (precio adicional en Bs, ej: 4)
   - available: Boolean (default true)
   - createdAt: DateTime

8. ORDER (Pedidos)
   - id: String (CUID, clave primaria)
   - seq: Integer? (unico, numero secuencial del pedido, ej: 1, 2, 3... formateado como 00001)
   - status: OrderStatus enum (default RECIBIDO)
   - customerName: String? (nombre del cliente, opcional)
   - total: Integer (total en Bolivianos)
   - createdAt: DateTime (auto-generado, indexado)
   - paidAt: DateTime? (momento del pago)
   - deliveredAt: DateTime? (momento de entrega al cliente)
   - cancelledAt: DateTime? (momento de anulacion)
   - cancelReason: String? (motivo de anulacion)
   - discountAmount: Integer (default 0, monto del descuento en Bs)
   - discountReason: String? (motivo del descuento)
   - discountedAt: DateTime? (momento del descuento)
   - userId: String? (FK -> User, SET NULL on delete - cajero que atendio)
   - user: Relation N:1 con User
   - paymentMethod: PaymentMethod? enum (EFECTIVO, QR o TARJETA)
   - items: Relation 1:N con OrderItem

9. ORDER_ITEM (Items dentro de un pedido)
   - id: String (CUID)
   - orderId: String (FK -> Order, cascade delete)
   - order: Relation N:1 con Order
   - sizeName: String (nombre del tamano, ej: "Grande")
   - flavorName: String (nombre del sabor, ej: "Taro")
   - flavorCategory: FlavorCategory enum (MILK, WATER o SPECIAL)
   - bobaTypeName: String (nombre del tipo de boba, ej: "Tapioca")
   - unitPrice: Integer (precio unitario en Bs, SIN toppings)
   - quantity: Integer (cantidad de este item)
   - toppings: Relation 1:N con OrderItemTopping

10. ORDER_ITEM_TOPPING (Toppings de cada item)
    - id: String (CUID)
    - orderItemId: String (FK -> OrderItem, cascade delete)
    - orderItem: Relation N:1 con OrderItem
    - toppingName: String (nombre del topping, ej: "Boba de tapioca extra")
    - unitPrice: Integer (precio del topping en Bs)

11. PAYMENT_CONFIG (Configuracion de pago QR - fila unica)
    - id: String (default "default", siempre es la misma fila)
    - qrImage: String (imagen QR en formato data URI base64)
    - mimeType: String (tipo MIME de la imagen, ej: "image/png")
    - updatedAt: DateTime (auto-actualizado)


ENUMS:

- FlavorCategory: MILK | WATER | SPECIAL
  (Con leche, Con agua, Especiales)

- BobaKind: TAPIOCA | POPPING
  (Tapioca clasica, Bobas explosivas)

- OrderStatus: RECIBIDO | ACEPTADO | ENTREGADO | ANULADO
  (El flujo normal es: RECIBIDO -> ACEPTADO -> ENTREGADO.
   ANULADO puede ocurrir desde cualquier estado anterior a ENTREGADO.)

- Role: ADMIN | CAJERO
  (Administrador, Cajero)

- PaymentMethod: EFECTIVO | QR | TARJETA
  (Efectivo, Pago QR movil, Tarjeta - pero el cajero solo puede
   registrar EFECTIVO y QR; TARJETA esta definido pero no se usa aun)


RELACIONES (Diagrama simplificado):

  User 1---N Order 1---N OrderItem 1---N OrderItemTopping

  Size 1---N DrinkPrice N---1 BobaType
  FlavorCategoryLink N---1 Flavor

  DrinkPrice contiene: category + sizeId + bobaTypeId + price
  (No hay relacion directa Flavor->Price; el precio depende de la
   categoria del sabor, no del sabor individual)

SEMILLA (seed):
  - 2 tamanos: Grande (16oz), Extragrande (21oz)
  - 2 tipos de boba: Tapioca (TAPIOCA), Explosivas (POPPING)
  - 18 sabores (8 SPECIAL, 6 WATER, 5 MILK, con Frutilla en WATER+MILK)
  - 12 combinaciones de precio (3 categorias x 2 tamanos x 2 bobas)
  - 2 toppings: Boba de tapioca extra (4Bs), Bobas explosivas extra (5Bs)
  - 2 usuarios: admin@bubba.mx/admin123 (ADMIN), cajero@bubba.mx/cajero123 (CAJERO)

MIGRACIONES (11 en orden cronologico):
  1. init - Tablas base (User, Size, Flavor, BobaType, Order, OrderItem)
  2. price_matrix - DrinkPrice, Topping, OrderItemTopping; quita precios de Size/Flavor/BobaType
  3. flavor_categories - FlavorCategoryLink (sabores multi-categoria)
  4. size_ounces - Renombra ml -> oz en Size
  5. payment_config - Tabla PaymentConfig para QR de pago
  6. order_customer_name - Agrega customerName a Order
  7. order_seq - Agrega seq (numero secuencial) a Order
  8. reports_audit_fields - Agrega userId, paymentMethod, discountAmount, discountReason, cancelledAt, cancelReason a Order
  9. cashier_two_states - Agrega deliveredAt y role a User
  10. add_user_active - Agrega active a User
  11. aceptado_three_states - Agrega paidAt, renombra INGRESADO -> RECIBIDO

================================================================================
                    4. RUTAS Y PAGINAS
================================================================================

--- APP: STORE (Puerto 3000, sin autenticacion) ---

GET /                         Pagina principal.
  - Server Component.
  - Lee slideshow.json y muestra carousel de imagenes.
  - Boton "Arma tu boba ahora" que pide nombre y redirige a /build.

GET /build                    Ensamblador de bebida paso a paso.
  - Server Component que carga catalogo (sizes, flavors, bobaTypes, drinkPrices, toppings).
  - Pasa datos a BuildClient (componente cliente).
  - Usa builder-store (Zustand) para mantener estado del ensamblador.
  - 3 pasos: (1) Categoria + sabor, (2) Tamano + tipo de boba con precio visible,
    (3) Toppings opcionales.
  - Al agregar al carrito, usa cart-store (Zustand persistido en localStorage).

GET /cart                     Carrito de compras y checkout.
  - Componente "use client" completo.
  - Lista items del carrito con cantidades editables.
  - Input de nombre del cliente (requerido).
  - Al confirmar: llama createOrder (Server Action).
  - Muestra pantalla de exito con: numero de comanda, total, QR de pago.
  - La impresion de la comanda es automatica y best-effort (no bloquea el pedido).

  Server Actions usados:
  - createOrder(items, customerName) -> crea order + items en DB + imprime comanda
  - getPaymentQr() -> obtiene imagen QR de PaymentConfig


--- APP: ADMIN (Puerto 3001, requiere rol ADMIN) ---

GET /login                   Login del administrador.
  - Formulario email/password.
  - Verifica si la cuenta esta desactivada y muestra mensaje apropiado.
  - Redirige a / despues de login exitoso.

GET /                        Dashboard principal (ruta protegida).
  - Server Component.
  - Muestra: pedidos del dia, pedidos pendientes, ingresos del dia, 5 pedidos recientes.
  - KPI cards con badges de estado (RECIBIDO/ACEPTADO/ENTREGADO/ANULADO).

GET /menu                    Gestion del menu.
  - Server Component que carga catalogo completo.
  - MenuManager (cliente): CRUD de tamanos, sabores, tipos de boba, toppings.
  - Matriz de precios editable: categoria x tamano x boba.
  - Toggle de disponibilidad para cada item.
  - Los sabores pueden tener multiples categorias (botones toggle).

  Server Actions usados:
  - createSize, updateSize, toggleSize
  - createFlavor, updateFlavor, toggleFlavor, updateFlavorCategories
  - createBobaType, updateBobaType, toggleBobaType
  - createTopping, updateTopping, toggleTopping
  - upsertDrinkPrice (varias)

GET /orders                  Lista de todos los pedidos.
  - Server Component.
  - OrdersClient (cliente): pestañas de filtro (Todos/Recibidos/Aceptados/Entregados/Anulados).
  - Acciones por pedido: cobrar (registrar pago), entregar, descontar, anular, reimprimir comanda.
  - El descuento requiere monto + motivo.
  - La anulacion requiere motivo obligatorio.

  Server Actions usados:
  - acceptOrder(orderId, method) -> RECIBIDO -> ACEPTADO con metodo de pago
  - deliverOrder(orderId) -> ACEPTADO -> ENTREGADO
  - cancelOrder(orderId, reason) -> RECIBIDO/ACEPTADO -> ANULADO
  - applyDiscount(orderId, amount, reason) -> aplica descuento al total
  - reprintOrder(orderId) -> reimprime comanda termica

GET /payments                Gestion de QR de pago.
  - PaymentsClient (cliente): subir imagen QR, previsualizar, reemplazar, eliminar.
  - La imagen se guarda como base64 data URI en PaymentConfig.

  Server Actions usados:
  - savePaymentQr(base64, mimeType) -> crea/actualiza PaymentConfig
  - removePaymentQr() -> elimina la configuracion

GET /users                   Gestion de usuarios.
  - UsersClient (cliente): tabla con todos los usuarios.
  - Crear usuario: nombre, email, contrasena, rol.
  - Editar usuario: cambiar nombre, email, rol, contrasena.
  - Activar/desactivar cuentas.
  - Proteccion: no puedes desactivarte a ti mismo, no puedes eliminar al ultimo admin.

  Server Actions usados:
  - createUser(name, email, password, role)
  - updateUser(id, data)
  - setUserActive(userId, active)

GET /reports                 Panel de reportes.
  - ReportsClient (cliente): selector de rango de fechas, granularidad (dia/semana/mes).
  - 9 tipos de reportes con graficos y tablas:
    1. Resumen del dashboard (hoy vs ayer, ultimos 7 dias)
    2. Cierre diario (ingresos, categorias, pagos, descuentos, anulaciones)
    3. Evolucion de ventas (serie temporal con comparacion al periodo anterior)
    4. Horas pico (distribucion por hora, hora mas/menos ocupada)
    5. Ventas por categoria (MILK/WATER/SPECIAL con share %)
    6. Top productos (rankings por cantidad o ingreso, agrupables)
    7. Productos lentos (menos vendidos del catalogo activo)
    8. Rendimiento del personal (ordenes, ingreso, ticket promedio por cajero)
    9. Ajustes (auditoria de descuentos y anulaciones, paginado)
  - Exportacion a CSV para todos los reportes.

  API Routes (REST):
  - GET /api/reports/dashboard-summary
  - GET /api/reports/daily
  - GET /api/reports/sales-range
  - GET /api/reports/peak-hours
  - GET /api/reports/category-sales
  - GET /api/reports/top-products
  - GET /api/reports/slow-movers
  - GET /api/reports/staff-performance
  - GET /api/reports/adjustments

GET /printer                 Configuracion de impresora.
  - Lista impresoras instaladas via PowerShell (Get-CimInstance Win32_Printer).
  - Seleccionar impresora predeterminada.
  - Conectar impresora de red compartida (ruta UNC).
  - Enviar pagina de prueba.

  API Routes:
  - GET /api/printer -> listar impresoras + configuracion actual
  - PUT /api/printer -> guardar seleccion de impresora
  - POST /api/printer/connect -> conectar impresora compartida (UNC)
  - POST /api/printer/test -> enviar prueba de impresion

GET /slideshow               Administracion del carousel.
  - Subir imagenes (auto-comprimidas a JPEG <1600px).
  - Reordenar imagenes.
  - Editar texto alternativo.
  - Configurar intervalo de rotacion.
  - Las imagenes se guardan en apps/store/public/images/.
  - La configuracion se guarda en apps/store/public/slideshow.json.

  API Routes:
  - GET /api/slideshow -> obtener configuracion actual
  - PUT /api/slideshow -> actualizar configuracion (orden, intervalo)
  - DELETE /api/slideshow -> eliminar imagen
  - POST /api/slideshow/upload -> subir nueva imagen
  - GET /api/slideshow/media/[name] -> servir imagen


--- APP: CAJERO (Puerto 3002, requiere rol CAJERO o ADMIN) ---

GET /login                   Login del cajero.
  - Mismo patron que admin pero con cookie de sesion personalizada.

GET /                        Pagina principal con 2 tabs.
  - Tab "preparar" (default): Cola de pedidos del dia actual con estados
    RECIBIDO, ACEPTADO y ENTREGADO.
    - Auto-refresh cada 15 segundos (pausa cuando el tab no esta visible).
    - Botones: "Cobro Efectivo", "Cobro QR" (para RECIBIDO), "Reimprimir" (para RECIBIDO),
      "Marcar entregado" (para ACEPTADO).
    - Muestra: numero de comanda, nombre del cliente, badge de estado, tiempo transcurrido,
      detalles de items, precio.

  - Tab "reporte": Reporte del dia del cajero actual.
    - Ingresos totales del dia, ordenes entregadas, ticket promedio, tiempo promedio de entrega.
    - Rendimiento personal del cajero logueado.
    - Desglose por metodo de pago.

  Server Actions usados:
  - acceptOrder(orderId, method) -> RECIBIDO -> ACEPTADO
  - deliverOrder(orderId) -> ACEPTADO -> ENTREGADO
  - reprintOrder(orderId) -> reimprimir comanda

  API Routes:
  - GET /api/auth/[...nextauth] -> handler de NextAuth


--- RUTAS COMUNES A LAS 3 APPS ---

GET /api/auth/[...nextauth]  Handler de autenticacion NextAuth (credentials provider).
  - Las 3 apps tienen su propio handler con configuracion independiente.
  - Store: sin cookies personalizadas (no requiere login).
  - Admin: cookie "admin.session-token" (solo ADMIN).
  - Cajero: cookie "cajero.session-token" (CAJERO o ADMIN).

================================================================================
                    5. COMPONENTES CLAVE
================================================================================

--- COMPONENTES DEL PAQUETE @bubba/ui ---

Button                      Boton con variantes (default, destructive, outline, secondary, ghost, link)
                            y tamanos (default, sm, lg, icon). Soporta asChild para usar como Link.

Card / CardHeader / CardTitle / CardDescription / CardContent / CardFooter
                            Tarjeta con bordes redondeados y sombra.

Badge                       Etiqueta con variantes: default, secondary, destructive, outline, success, warning.

Dialog / DialogContent / DialogHeader / DialogTitle / DialogDescription / DialogFooter / DialogClose
                            Modal basado en Radix UI Dialog. Overlay con animaciones.

Input                       Campo de texto basico.

Label                       Etiqueta HTML basada en Radix Label.

Select / SelectTrigger / SelectContent / SelectItem / SelectValue
                            Selector desplegable basado en Radix Select.

StepIndicator               Indicador de progreso del ensamblador (pasos 1-2-3 con labels).

SizeSelector                Grid de botones para seleccionar tamano (muestra oz y nombre).

FlavorPicker                Selector de sabores filtrado por categoria. Muestra nombre del sabor.

BobaPicker                  Grid de botones para seleccionar tipo de boba (muestra nombre y kind).

QuantityControl              Controles +/- para cantidad de items en el carrito.

CartItemRow                 Fila de item en el carrito: tamano, sabor, boba, toppings, precio, controles de cantidad.

CartSummary                 Resumen del carrito: subtotal, toppings, total general. Muestra precio en Bs.

cn()                        Utilidad para combinar clases de Tailwind (clsx + tailwind-merge).


--- COMPONENTES DE apps/store ---

SiteHeader                  Barra de navegacion fija arriba. Logo "Bubble Drink", boton carrito con contador.

PhotoCarousel               Carrusel automatico de imagenes. Pausa al hacer hover. Flechas y dots de navegacion.
                            Props: images (src+alt), intervalMs (default 4000).

StartBuilderButton          Boton "Arma tu boba ahora" que abre modal para escribir nombre del cliente.
                            Guarda nombre en cart-store y redirige a /build.

BuildClient                 Componente cliente completo del ensamblador (~310 lineas).
                            3 pasos: (1) Seleccionar categoria + sabor, (2) Tamano + boba con precio visible,
                            (3) Toppings opcionales. Boton "Agregar al carrito".


--- COMPONENTES DE apps/admin ---

AdminNav                    Navegacion lateral del dashboard. Links a: Inicio, Menu, Pedidos, Pagos,
                            Usuarios, Reportes, Impresora, Slideshow.

MenuManager                 CRUD completo del menu (~varias lineas). Tabs para: Tamanos, Sabores,
                            Tipos de boba, Toppings, Matriz de precios. Incluye dialogos de edicion,
                            toggles de disponibilidad, y editor de categorias de sabor.

OrdersClient                Lista de pedidos con filtros por estado (tabs). Muestra cards con:
                            numero de comanda, nombre cliente, items, total, estado, acciones.

PaymentsClient              Interfaz para subir/reemplazar/eliminar imagen QR de pago. Muestra preview.

UsersClient                 Tabla de usuarios con acciones: crear, editar, activar/desactivar.
                            Proteccion contra auto-desactivacion y eliminacion del ultimo admin.

ReportsClient               Panel de reportes con selector de rango de fechas y tipo de reporte.
                            Muestra graficos y tablas. Boton de exportacion CSV.


--- COMPONENTES DE apps/cajero ---

QueueView                   Cola de pedidos con auto-refresh (15s). Cards con: numero de comanda,
                            nombre cliente, badge de estado (coloreado), tiempo transcurrido,
                            items detallados, precio, botones de accion segun estado.

ReportView                  Reporte del dia del cajero: KPI cards (ingreso, ordenes, ticket promedio,
                            tiempo promedio), rendimiento personal, desglose por metodo de pago.

================================================================================
                6. LOGICA DE NEGOCIO CRITICA
================================================================================

--- COMO SE CREA UN PEDIDO ---

1. El cliente abre la tienda (store) en el navegador (puerto 3000).
2. Hace clic en "Arma tu boba ahora" -> aparece modal para escribir su nombre.
3. El sistema guarda el nombre en el carrito (Zustand persistido en localStorage).
4. El cliente es llevado al ensamblador (/build) donde sigue 3 pasos:
   a. Selecciona categoria (Agua, Leche, Especial) y sabor.
   b. Selecciona tamano (Grande/Extragrande) y tipo de boba (Tapioca/Explosivas).
      El precio se calcula en tiempo real desde la matriz DrinkPrice.
   c. Opcionalmente agrega toppings (cada uno tiene precio adicional).
5. Hace clic en "Agregar al carrito" -> vuelve al paso 1 o va al carrito.
6. En el carrito (/cart) puede modificar cantidades o eliminar items.
7. Al dar clic en "Confirmar pedido":
   a. Se ejecuta createOrder (Server Action).
   b. Se busca el ultimo seq en la BD y se incrementa en 1.
   c. Se crea la Order con status RECIBIDO, customerName y total calculado.
   d. Se crean los OrderItem con precios congelados (capturados en el momento).
   e. Se crean los OrderItemTopping correspondientes.
   f. Despues de crear el pedido (fuera del request, con after()):
      - Se busca la configuracion de impresora (printing.json).
      - Se imprime la comanda termica de forma best-effort.
      - Si falla la impresora, el pedido NO se pierde.
   g. Se muestra pantalla de exito con numero de comanda, total y QR de pago.
8. La comanda se imprime automaticamente en la impresora termica de mostrador.

--- COMO SE ACEPTA UN PEDIDO (CAJERO) ---

1. El cajero ve el pedido en estado RECIBIDO en su cola (auto-refresh cada 15s).
2. Hace clic en "Cobro Efectivo" o "Cobro QR".
3. Se ejecuta acceptOrder(orderId, method):
   a. Verifica que el pedido exista y este en estado RECIBIDO.
   b. Verifica que el metodo de pago sea EFECTIVO o QR.
   c. Actualiza el estado a ACEPTADO, registra paidAt y paymentMethod.
   d. Asigna el userId del cajero actual si el pedido no tenia usuario asignado.
   e. La cola se actualiza automaticamente por el refresh.

--- COMO SE ENTREGA UN PEDIDO (CAJERO) ---

1. El cajero ve el pedido en estado ACEPTADO.
2. Hace clic en "Marcar entregado".
3. Se ejecuta deliverOrder(orderId):
   a. Verifica que el pedido este en estado ACEPTADO.
   b. Actualiza estado a ENTREGADO y registra deliveredAt.
   c. El pedido desaparece de la cola activa.

--- COMO SE ANULA UN PEDIDO (ADMIN) ---

1. El administrador va a /orders.
2. Selecciona un pedido y hace clic en "Anular".
3. Se le pide un motivo obligatorio.
4. Se ejecuta cancelOrder(orderId, reason):
   a. Verifica que el pedido no este ya anulado ni entregado.
   b. Actualiza estado a ANULADO, registra cancelledAt y cancelReason.

--- COMO SE APLICA UN DESCUENTO (ADMIN) ---

1. El administrador va a /orders.
2. Selecciona un pedido y hace clic en "Descuento".
3. Ingresa monto (en Bs) y motivo.
4. Se ejecuta applyDiscount(orderId, amount, reason):
   a. Se registra discountAmount, discountReason y discountedAt.
   b. El total del pedido NO se modifica en la BD; el descuento se registra por separado.

--- COMO FUNCIONA EL CIERRE DE CAJA / REPORTE DIARIO ---

No hay un "cierre de caja" formal que cambie estados. El sistema funciona con
reportes en tiempo real:

CAJERO (app cajero, tab "reporte"):
- Muestra los pedidos ENTREGADOS del dia actual filtrados por deliveredAt.
- Calcula: ingreso total, cantidad de ordenes, ticket promedio, tiempo promedio de entrega.
- Filtra por userId para mostrar solo el rendimiento del cajero logueado.
- Muestra desglose por metodo de pago (EFECTIVO, QR).

ADMIN (app admin, /reports):
- Reporte "Cierre diario" (GET /api/reports/daily): resumen completo de un dia.
  Incluye ingresos, ordenes, ticket promedio, items vendidos, ingreso por toppings,
  desglose por categoria, desglose por metodo de pago, total de descuentos,
  cantidad de anulaciones.
- Reporte "Resumen del dashboard" (GET /api/reports/dashboard-summary):
  Compara hoy vs ayer, muestra ultimos 7 dias, cuenta ordenes pendientes.

--- COMO SE MANEJA EL INVENTARIO ---

No existe un sistema formal de inventario/stock. El manejo es por DISPONIBILIDAD:

1. Cada item del catalogo (Size, Flavor, BobaType, Topping) tiene un campo "available".
2. El admin puede activar/desactivar cada item desde /menu.
3. Los items desactivados NO aparecen en el ensamblador del store.
4. Los precios se configuran en la matriz DrinkPrice (categoria x tamano x boba).
5. Si un precio falta en la matriz, el ensamblador muestra "Precio no disponible"
   y no deja agregar esa combinacion al carrito.
6. No hay control de stock ni alertas de agotamiento.

--- COMO FUNCIONA LA IMPRESION ---

1. La configuracion de impresora se guarda en apps/store/printing.json:
   { "printerName": "Nombre de la Impresora" }
2. El admin configura la impresora desde /printer (lista impresoras del sistema Windows,
   puede conectar impresoras de red compartida por UNC).
3. Cuando se crea un pedido (createOrder), se imprime automaticamente una comanda.
4. El formato es texto plano optimizado para impresora termica de 80mm:
   - Borde superior con "BUBBLE DRINK"
   - Numero de comanda (5 digitos: 00001)
   - Nombre del cliente, fecha/hora
   - Lista de items con cantidades, tamanos, sabores, boba, toppings
   - Total en Bs
   - Mensaje "Presente esta comanda en mostrador"
5. La impresion es best-effort: si falla, el pedido sigue valido.
6. Se puede reimprimir desde admin (/orders) y cajero (cola de pedidos).
7. La impresion usa PowerShell + .NET System.Drawing.Printing:
   - Convierte el texto a base64.
   - Usa Consolas Bold con tamanho auto-ajustado para caber en 80mm.
   - Detecta automaticamente el paper size de la impresora.

================================================================================
                7. VARIABLES DE ENTORNO
================================================================================

Las 3 apps tienen su propio archivo .env. El paquete db tambien tiene uno.

--- apps/store/.env ---
  DATABASE_URL    Ruta a la base de datos. Default: "file:./dev.db"
                  En PostgreSQL seria: "postgresql://user:pass@host:5432/bubba"

--- apps/admin/.env ---
  DATABASE_URL    Ruta a la base de datos (mismo valor que store).
  NEXTAUTH_URL    URL base de la app admin. Default: "http://localhost:3001"
  NEXTAUTH_SECRET Secreto para firmar JWT de sesion. Ejemplo: "change-me-en-produccion"

--- apps/cajero/.env ---
  DATABASE_URL    Ruta a la base de datos (mismo valor que store).
  NEXTAUTH_URL    URL base de la app cajero. Default: "http://localhost:3002"
  NEXTAUTH_SECRET Secreto para firmar JWT de sesion (puede ser distinto al admin).

--- packages/db/prisma/.env ---
  DATABASE_URL    Usado por Prisma CLI (migrate, seed, generate). Default: "file:./dev.db"

--- docker-compose.yml (variables internas del contenedor) ---
  DATABASE_URL="file:/app/packages/db/prisma/dev.db"
  NEXTAUTH_SECRET="cambia-este-secreto-por-uno-seguro"
  NEXTAUTH_URL="http://localhost:3001"
  NEXTAUTH_SECRET_CAJERO="cambia-este-secreto-cajero-tambien"
  NEXTAUTH_URL_CAJERO="http://localhost:3002"

--- Archivos de configuracion generados (no son .env pero afectan el funcionamiento) ---
  apps/store/printing.json    Configuracion de impresora termica.
                              Generado desde /printer en admin.
                              Contenido: { "printerName": "Nombre" }

  apps/store/public/slideshow.json   Configuracion del carousel de imagenes.
                                     Generado desde /slideshow en admin.
                                     Contenido: { intervalMs: number, images: [{src, alt}] }

================================================================================
                8. COMANDOS PARA EJECUTAR
================================================================================

PREREQUISITOS:
  - Node.js >= 20.9.0
  - pnpm 11.21.0 (se instala automaticamente via corepack)
  - Windows (la impresion termica usa PowerShell/.NET)

INSTALACION:
  pnpm install

MIGRACION DE BASE DE DATOS:
  pnpm db:generate       Genera el cliente de Prisma
  ppn db:migrate         Aplica migraciones pendientes (prisma migrate dev)
  pnpm db:seed           Crea datos iniciales (sabores, precios, usuarios)

  Alternativa manual:
  npx prisma generate --filter=@bubba/db
  npx prisma migrate dev --filter=@bubba/db
  npx prisma db seed --filter=@bubba/db

DESARROLLO:
  pnpm dev               Inicia las 3 apps simultaneamente
                         Store:   http://localhost:3000
                         Admin:   http://localhost:3001
                         Cajero:  http://localhost:3002

BUILD:
  pnpm build             Build de produccion de las 3 apps

VERIFICACION:
  pnpm lint              Linting en todos los paquetes
  pnpm typecheck         Type-check en todos los paquetes

DOCKER:
  docker compose up --build    Construye y ejecuta todo en un contenedor

DATOS DE PRUEBA PARA REPORTES:
  cd packages/db
  npx tsx scripts/seed-reports-test.mjs
  (Genera 600 pedidos ficticios: 3 cajeros x 200 ventas en 7 dias)

CREDENCIALES DE ACCESO:
  Admin:   admin@bubba.mx  / admin123
  Cajero:  cajero@bubba.mx / cajero123

SCRIPTS ADICIONALES:
  scripts/db-sync.bat    Script Windows: para servers, migra, reinicia.
                         Uso: scripts\db-sync.bat [migrate|generate] [nombre-migracion]

================================================================================
                    9. USUARIOS Y ROLES
================================================================================

El sistema tiene 2 roles definidos en el enum Role:

--- ADMIN (Administrador) ---
  Puede hacer TODO lo que un cajero mas:
  - Acceso al panel completo de administracion (apps/admin en puerto 3001)
  - Gestiona el menu: crear/editar/activar sabores, tamanos, tipos de boba, toppings
  - Gestiona la matriz de precios (categoria x tamano x boba)
  - Gestiona usuarios: crear, editar, activar/desactivar, asignar roles
  - Ve y administra TODOS los pedidos: aceptar, entregar, anular, descontar, reimprimir
  - Configura la impresora termica
  - Administra el slideshow de imagenes
  - Ve todos los reportes (9 tipos) con exportacion CSV
  - Puede usar la app de cajero simultaneamente (el middleware admin acepta ADMIN)
  - Proteccion: no puede desactivarse a si mismo, no puede eliminar al ultimo admin

--- CAJERO (Cajero/Mostrador) ---
  Acceso a la app cajero (apps/cajero en puerto 3002):
  - Ve la cola de pedidos del dia (auto-refresh cada 15 segundos)
  - Registra pagos: acepta pedidos RECIBIDO con metodo EFECTIVO o QR
  - Marca pedidos como ENTREGADO cuando el cliente recoge
  - Reimprime comandas de pedidos RECIBIDO
  - Ve su reporte personal del dia (ordenes entregadas, ticket promedio, tiempo promedio)
  - NO puede: crear/cancelar pedidos, aplicar descuentos, ver reportes avanzados,
    gestionar menu, gestionar usuarios, acceder al admin

--- ACCESO POR APLICACION ---

  App Store (3000):  Sin autenticacion. Cualquier persona puede usarla.
  App Admin (3001):  Solo usuarios con rol ADMIN. Middleware verifica JWT + role.
  App Cajero (3002): Usuarios con rol CAJERO o ADMIN. Cookie de sesion personalizada.

--- DIFERENCIAS CLAVE ENTRE SESIONES ---

  Admin y Cajero usan cookies de sesion con nombres distintos para poder
  tener sesiones simultaneas en el mismo navegador:
  - Admin: "admin.session-token" (o ".dev" en desarrollo)
  - Cajero: "cajero.session-token" (o ".dev" en desarrollo)
  Cada app solo lee su propia cookie.

--- DETECCION DE CUENTA DESACTIVADA ---

  Al hacer login, si las credenciales son correctas pero el usuario tiene
  active=false, el sistema muestra: "Esta cuenta esta desactivada. Contacta al
  administrador." en lugar de "Credenciales invalidas". Esto protege la
  seguridad sin revelar si el correo existe o no a usuarios no autenticados.

================================================================================
            10. PUNTOS DE ATENCION / DEUDA TECNICA
================================================================================

--- COSAS QUE FALTAN O ESTAN INCOMPLETAS ---

1. PAYMENT METHOD "TARJETA": El enum PaymentMethod incluye TARJETA pero el
   cajero solo puede registrar EFECTIVO y QR (via AcceptablePayment). El soporte
   para tarjeta no esta implementado en la UI.

2. SIN MIDDLEWARE EN STORE: La app store no tiene middleware.ts. No hay proteccion
   de rutas ni rate limiting en el lado del servidor para el cliente publico.

3. SIN LOADING/ERROR BOUNDARIES: Ninguna de las 3 apps tiene archivos loading.tsx,
   error.tsx o not-found.tsx. Los errores de servidor muestran la pagina de error
   por defecto de Next.js.

4. IMPRESION WINDOWS-ONLY: El sistema de impresion termica depende de PowerShell
   y .NET System.Drawing, que solo funcionan en Windows. No hay fallback para
   Linux/Mac (seria necesario usar CUPS o una libreria cross-platform).

5. BASE DE DATOS SQLite EN PRODUCCION: El docker-compose usa SQLite
   (file:./dev.db) en lugar de PostgreSQL. Para produccion real se necesita
   cambiar DATABASE_URL a una cadena de PostgreSQL y ejecutar las migraciones.

6. SIN TESTS: No hay archivos de prueba (ni unit, ni integration, ni e2e).
   No hay testing framework configurado.

7. IMPRESION COMO FIRE-AND-FORGET: La impresion se ejecuta con after() despues
   de crear el pedido. Si la impresora falla, no hay reintento ni cola de
   impresion pendiente. La comanda simplemente no se imprime.

8. CACHE MINIMO EN REPORTES: Solo el endpoint dashboard-summary tiene cache
   (30 segundos, in-memory). Los demas 8 endpoints de reportes consultan la
   BD en cada request, lo que puede ser lento con muchos datos.

9. NO HAY DESHACER: Las acciones de entregar, anular y aplicar descuentos
   son irreversibles. No hay boton de "deshacer" ni historial de cambios.

10. TOTAL DEL PEDIDO SIN DESCUENTO EN UI: El campo discountAmount se registra
    en la BD pero el total mostrado en la UI del cajero y admin NO descuenta
    el monto. El descuento es solo un registro de auditoria.

--- COSAS A TENER EN CUENTA ---

11. TIMEZONE HARD-CODED: Todas las fechas usan America/La_Paz (UTC-4). El
    sistema no soporta multiples zonas horarias. El calculo de dayBounds()
    en lib/day.ts es manual (sin libreria de timezone) y podria tener edge
    cases con cambios de horario (aunque Bolivia no los tiene).

12. SECUENCIAL DE PEDIDOS: El numero seq se incrementa globalmente. Si hay
    multiples requests concurrentes creando pedidos, podria haber colisiones
    (aunque el campo es unique, Prisma lanzaria error). No hay mutex o cola.

13. CARRITO EN LOCALSTORAGE: El carrito del store se persiste en localStorage
    via Zustand. Si el cliente cambia de dispositivo o borra el storage,
    pierde el carrito. No hay sincronizacion con el servidor.

14. PASSWORDS EN SEED: Las contrasenas del seed (admin123, cajero123) estan
    hardcodeadas con hash bcrypt. En produccion se deben cambiar inmediatamente.

15. ARCHIVOS DE IMAGEN EN PUBLIC: Las imagenes del slideshow se guardan
    directamente en public/images/ del store. No hay limpieza automatica de
    imagenes eliminadas del slideshow.

16. CONEXION DE IMPRESORA COMPARTIDA: El admin puede conectar impresoras de
    red via UNC (\\server\printer). Esta operacion requiere privilegios de
    administrador de Windows y puede fallar en entornos restringidos.

17. MONEDA FIJA: Todos los precios estan en Bolivianos (Bs / BOB) como
    enteros. No hay soporte para decimales ni para cambiar de moneda.

18. SIN PAGINACION EN PEDIDOS: La lista de pedidos en admin y cajero carga
    todos los registros del dia/rango sin paginacion. Con mucho volumen
    podria haber problemas de rendimiento.

19. NEXTAUTH V4: El proyecto usa NextAuth v4 (no v5/Auth.js). NextAuth v4
    esta en modo mantenimiento y eventualmente se deprecara.

20. SHARED PACKAGES SIN BUILD: Los packages (db, types, ui, config) se
    importan directamente desde TypeScript (no compilados). Las apps usan
    transpilePackages en next.config para procesarlos. Esto funciona en
    desarrollo pero en produccion el build de Docker hace prisma generate
    y pnpm build que compila todo.

================================================================================
                        FIN DEL README
================================================================================
