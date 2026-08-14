## 1. Scaffold del monorepo

- [x] 1.1 Inicializar repo: `package.json` raíz, `pnpm-workspace.yaml` (apps/*, packages/*), `turbo.json` con tareas dev/build/lint/typecheck y `.gitignore`
- [x] 1.2 Instalar dependencias raíz (typescript, eslint, turbo, pnpm tooling) y verificar `pnpm install` desde la raíz
- [x] 1.3 Crear `packages/config` con `tsconfig.base.json`, configuración de ESLint y preset de Tailwind compartido

## 2. Paquetes de dominio

- [x] 2.1 Crear `packages/types` con los tipos de dominio: `Size`, `Flavor`, `FlavorCategory` (MILK|WATER|SPECIAL), `BobaType`, `BobaKind` (TAPIOCA|POPPING), `Drink`, `Order`, `OrderStatus` (RECIBIDO|EN_PREPARACION|ENTREGADO)
- [x] 2.2 Crear `packages/db` con Prisma: `schema.prisma` con modelos `Size`, `Flavor`, `BobaType`, `Order`, `OrderItem` y `User` (admin)
- [x] 2.3 Configurar `DATABASE_URL` (SQLite en dev) con `.env.example` y scripts `db:migrate`, `db:seed`, `db:generate` en `packages/db`
- [x] 2.4 Escribir seed con catálogo inicial: 3 tamaños, sabores de leche/agua/especiales y los 2 tipos de boba, más un usuario admin
- [x] 2.5 Aplicar migración inicial y ejecutar seed; verificar que `prisma generate` compila el cliente en el paquete

## 3. Paquete de UI compartido

- [x] 3.1 Crear `packages/ui` con configuración de shadcn/ui y Tailwind integrados
- [x] 3.2 Implementar componentes base: botones, tarjetas, badges, diálogos y formularios
- [x] 3.3 Implementar componentes del configurador: `SizeSelector`, `FlavorPicker` (agrupado por categoría), `BobaPicker` y `StepIndicator`
- [x] 3.4 Implementar componentes de carrito: `CartSummary`, `CartItem` y `QuantityControl`

## 4. App de clientes (store)

- [x] 4.1 Scaffold `apps/store` con Next.js App Router + TypeScript + Tailwind, conectado a `packages/ui`, `packages/db` y `packages/types`
- [x] 4.2 Landing/menú (`/`) que lista el catálogo vigente leído del servidor
- [x] 4.3 Configurador (`/build`): flujo de 3 pasos tamaño → sabor → boba con avance bloqueado hasta completar cada paso y regreso conservando selección
- [x] 4.4 Store Zustand del configurador y carrito con cálculo de precio en tiempo real (tamaño + sabor + boba) y persistencia en localStorage
- [x] 4.5 Página de carrito (`/cart`) con resumen, cantidades ajustables y opción de quitar bebidas
- [x] 4.6 Checkout (`/cart` → confirmar): crear pedido vía Server Action validando carrito no vacío, persistir bebidas con precio unitario capturado y vaciar el carrito

## 5. Panel admin (admin)

- [x] 5.1 Scaffold `apps/admin` con Next.js App Router + TypeScript + Tailwind, conectado a los paquetes compartidos
- [x] 5.2 Autenticación con Auth.js: login por credenciales contra el usuario sembrado, logout y protección de rutas admin con redirección a `/login`
- [x] 5.3 Dashboard (`/`) con resumen de pedidos y métricas simples del día
- [x] 5.4 CRUD de catálogo: gestión de tamaños, sabores (con categoría leche/agua/especiales) y tipos de boba, incluyendo disponibilidad, con validación de sesión en las escrituras
- [x] 5.5 Gestión de pedidos (`/orders`): listado con filtro por estado, detalle con bebidas/cantidades/precios y avance de estado en la secuencia definida (sin retroceso)

## 6. Verificación final

- [x] 6.1 Ejecutar `pnpm lint` y `pnpm typecheck` desde la raíz sobre todos los workspaces y corregir errores
- [x] 6.2 Ejecutar `pnpm build` desde la raíz y verificar que ambos apps compilan
- [x] 6.3 Prueba de humo end-to-end: armar una bebida en store, crear pedido, verlo en admin y avanzar su estado
