# Bubba Drinks

Monorepo de la tienda de bubble drinks "Bubba": una app de clientes para armar y pedir bebidas y un panel admin para gestionar el catálogo y los pedidos.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Apps**: Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **Paquetes compartidos**: `@bubba/config`, `@bubba/types`, `@bubba/db`, `@bubba/ui`
- **Base de datos**: Prisma (SQLite en desarrollo, configurable a Postgres)

## Estructura

```
apps/
  store/    App de clientes (http://localhost:3000)
  admin/    Panel admin (http://localhost:3001)
  cajero/   Pantalla del cajero (http://localhost:3002)
packages/
  config/   tsconfigs y preset de Tailwind compartidos
  types/    Tipos de dominio y helpers de precio
  db/       Prisma: schema, migraciones y seed
  ui/       Componentes compartidos (configurador, carrito, UI base)
```

## Requisitos

- Node.js >= 20.9
- pnpm >= 9 (`npm.cmd install -g pnpm`)

## Puesta en marcha

```bash
pnpm install          # instala todos los workspaces
pnpm db:migrate       # aplica las migraciones
pnpm db:seed          # siembra catálogo + usuarios (admin y cajero)
pnpm dev              # arranca store (3000), admin (3001) y cajero (3002)
```

- **Store**: http://localhost:3000
- **Admin**: http://localhost:3001 — login: `admin@bubba.mx` / `admin123` (rol ADMIN)
- **Cajero**: http://localhost:3002 — login: `cajero@bubba.mx` / `cajero123` (rol CAJERO)

## Scripts raíz

| Comando            | Descripción                                |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Arranca las tres apps en desarrollo        |
| `pnpm build`       | Compila todos los workspaces               |
| `pnpm lint`        | ESLint en todos los workspaces             |
| `pnpm typecheck`   | Verificación de tipos en todos los workspaces |
| `pnpm db:migrate`  | Aplica migraciones de Prisma               |
| `pnpm db:seed`     | Siembra catálogo y usuarios                |
| `pnpm db:generate` | Regenera el cliente de Prisma              |

## Funcionalidades

**Store**
- Landing con el catálogo vigente.
- Configurador en 3 pasos: tamaño → sabor (leche/agua/especiales) → boba, con precio en tiempo real.
- Carrito persistente (localStorage) con cantidades ajustables y checkout que crea el pedido.

**Admin**
- Login por credenciales (Auth.js) y rutas protegidas (solo rol ADMIN).
- Dashboard con métricas de pedidos del día y reportes.
- CRUD de tamaños, sabores y tipos de boba.
- Gestión de pedidos: filtro por estado, cobro, descuentos, anulación y entrega.

**Cajero**
- Login exclusivo para personal de mostrador (rol CAJERO o ADMIN).
- Cola de preparación con antigüedad y botón "Marcar entregado" (registra el tiempo de entrega).
- Reporte del día con KPIs, tiempo promedio de entrega y rendimiento propio.

## Base de datos

La configuración de Prisma vive en `packages/db/prisma/` (`schema.prisma`, `.env` con `DATABASE_URL`). En producción apunta `DATABASE_URL` a Postgres y ejecuta `pnpm db:migrate` como paso del deploy.

## Deploy

Docker:

```bash
docker compose up --build
```

Expone store en `:3000` y admin en `:3001` y persiste la base SQLite en un volumen.
