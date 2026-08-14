## Context

Ver proposal.md — Why. El proyecto parte de cero (no hay código ni specs previas): se necesita un monorepo sobre el que construir la tienda de clientes y el panel admin de un restaurante de bubble drinks, con catálogo persistente y pedidos. Requisitos de comportamiento definidos en specs/drink-catalog, drink-builder, ordering, admin-auth y monorepo-scaffold.

## Goals / Non-Goals

**Goals:**
- Monorepo en TypeScript con dos apps Next.js (store y admin) y paquetes compartidos.
- Orquestación de tareas (dev/build/lint/typecheck) desde la raíz con ejecución en paralelo.
- Un único esquema de datos y un único cliente de base de datos compartido por ambas apps.
- Configurador de bebida con estado local del cliente (tamaño, sabor, boba) y cálculo de precio en tiempo real.
- Semilla inicial del catálogo para que la tienda funcione desde el primer arranque.

**Non-Goals:**
- No se diseña pagos en línea ni pasarela de cobro (el pago se realiza en tienda).
- No se incluye app móvil nativa ni PWA en esta iteración.
- No se define un sistema de inventario con conteo de stock físico por ingrediente.
- No se implementa multiusuario avanzado (roles/perfiles) más allá de la autenticación del personal.

## Decisions

### 1. pnpm workspaces + Turborepo
Gestión de dependencias con **pnpm** (workspaces nativos, instalación única y eficiente en disco) y orquestación de tareas con **Turborepo** (`turbo.json` con tareas `dev`, `build`, `lint`, `typecheck`). Alternativas consideradas: npm/yarn workspaces (funcionales pero sin pipeline de tareas ni cache) y Nx (más complejo de lo necesario para dos apps).

### 2. Dos apps Next.js 15 con App Router, paquete de UI compartido
`apps/store` y `apps/admin` comparten `packages/ui` (componentes construidos sobre Tailwind CSS + shadcn/ui). Los componentes de UI se importan por nombre de paquete, no por ruta relativa. Alternativa: componentes inline por app — descartada por duplicación y estilo inconsistente.

### 3. Prisma como capa de datos única en `packages/db`
Un solo esquema (`packages/db/prisma/schema.prisma`) y un solo cliente generado. **SQLite** en desarrollo (cero infraestructura) y **Postgres** en producción vía `DATABASE_URL`. Alternativa: Drizzle — válida, pero Prisma ofrece migraciones y seed integrados que aceleran el arranque del proyecto.

### 4. Lectura con Server Components / Server Actions para escrituras
El catálogo se lee en el servidor (Server Components/RSC) y las mutaciones (crear pedido, CRUD del admin, cambio de estado) se exponen como Server Actions con validación de sesión. Alternativa: API REST con route handlers — descartada por más superficie y boilerplate; se adopta si más adelante hacen falta clientes externos.

### 5. Estado del configurador con Zustand en el cliente
El flujo de 3 pasos (tamaño → sabor → boba) y el carrito se mantienen en un store Zustand (persistencia opcional en `localStorage`). Alternativa: estado local con props/lifting — descartada porque el carrito debe sobrevivir a la navegación entre rutas.

### 6. Autenticación con Auth.js (NextAuth) y provider de credenciales
El panel admin protege sus rutas con una sesión de Auth.js; el login es por correo/contraseña de un usuario sembrado en la BD. Alternativa: auth casera con cookies/JWT — descartada por riesgo de seguridad; Auth.js gestiona sesión, CSRF y cookies.

### 7. Tipos de dominio en `packages/types`
Los contratos compartidos (`Size`, `Flavor`, `FlavorCategory`, `BobaType`, `Drink`, `Order`, `OrderStatus`) viven en `packages/types` para que apps, ui y db los referencien sin duplicación. `packages/config` agrupa `tsconfig.base.json`, ESLint y un preset de Tailwind.

### 8. Configuración por entorno
Variables de entorno por app (`apps/*/.env`) con `DATABASE_URL` en la raíz o en `packages/db` y datos de sesión (secret de Auth.js) en el admin. Se documentan plantillas `.env.example`.

## Risks / Trade-offs

- [Prisma en monorepo: generar el cliente y compilar un solo esquema] → Centralizar el esquema en `packages/db`; el cliente se genera con `prisma generate` en el postinstall del paquete y se comparte entre apps. Migraciones y seed se ejecutan desde `packages/db`.
- [Auth.js + App Router: config middleware/sesión fácil de romper] → Envolver la lógica en `packages/config` o directamente en `apps/admin` con un helper de sesión único, y probar el flujo de login/cierre al integrar.
- [Windows/PowerShell bloquea scripts .ps1] → Todos los comandos se exponen como scripts npm (`pnpm dev`, `pnpm db:seed`) para evitar invocar binarios .ps1 directamente.
- [Zustand con `localStorage`: carrito huérfano si cambia el catálogo] → Validar contra el catálogo vigente al mostrar el carrito y al confirmar el pedido; eliminar bebidas con referencias inválidas.
- [Server Actions mutan datos de forma directa] → Cada acción valida sesión (escrituras) y datos de entrada antes de persistir; el estado de pedido solo avanza según la secuencia definida en la spec.

## Migration Plan

1. Scaffold del monorepo (workspaces, turbo, packages/config) en la raíz.
2. `packages/db`: schema, migración inicial, seed y cliente generado.
3. `packages/types` y `packages/ui` (componentes del configurador y layout base).
4. `apps/store`: landing, configurador en 3 pasos, carrito y checkout → pedido.
5. `apps/admin`: login (Auth.js), dashboard, CRUD de catálogo y gestión de pedidos.
6. Verificación final: `pnpm lint`, `pnpm typecheck`, `pnpm build` desde la raíz.

Rollback: al ser proyecto nuevo, basta con revertir commits del monorepo; no hay datos de producción que migrar en esta fase.

## Open Questions

Ninguna bloqueante. Detalles diferibles sin cambiar specs ni arquitectura: nombre/branding visual de la tienda, lista exacta de sabores de la semilla y si el checkout pedirá nombre del cliente para recoger en tienda.
