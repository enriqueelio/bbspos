## Why

El restaurante de bubble drinks necesita digitalizar su operación: hoy el menú, los precios y los pedidos se gestionan de forma manual. Se quiere una plataforma en monorepo basada en Next.js donde los clientes puedan armar su bebida (tamaño, sabor y tipo de boba) y el restaurante pueda gestionar el catálogo y los pedidos desde un panel admin, con datos persistentes.

## What Changes

- Crear un monorepo con **pnpm + Turborepo** y dos apps Next.js (App Router + TypeScript).
- Crear la **app de clientes** (`store`): landing/menú, configurador paso a paso de bebida y carrito.
- Crear el **panel admin** (`admin`): autenticación, dashboard, CRUD del catálogo y gestión de pedidos.
- Crear paquetes compartidos: `packages/ui` (componentes), `packages/db` (Prisma), `packages/types` (tipos de dominio) y `packages/config` (configs de TS/ESLint/Tailwind).
- Persistir el catálogo (tamaños, sabores, tipos de boba) y los pedidos en una base de datos relacional con Prisma (SQLite en dev, Postgres en producción).
- Semillas (`seed`) para precargar el catálogo inicial.
- Configurador de bebida con 3 pasos: **tamaño** (Chico/Mediano/Grande), **sabor** (Leche/Agua/Especiales) y **boba** (Tapioca/Explosivas), con cálculo de precio por unidad.

## Capabilities

### New Capabilities

- `drink-catalog`: catálogo de bebidas — tamaños, sabores agrupados por categoría (leche/agua/especiales) y tipos de boba, cada uno con precio y disponibilidad. Legible por la tienda, editable por el admin.
- `drink-builder`: configurador paso a paso donde el cliente elige tamaño, sabor y tipo de boba, ve el precio total y agrega la bebida al carrito.
- `ordering`: creación de pedidos desde el carrito y gestión de su estado (recibido/en preparación/entregado) desde el panel admin.
- `admin-auth`: autenticación del personal del restaurante para acceder al panel admin.
- `monorepo-scaffold`: estructura base del monorepo — workspaces pnpm, orquestación con Turborepo, paquetes compartidos y configuración de tooling.

### Modified Capabilities

Ninguna (no existen specs previas).

## Impact

- **Apps**: `apps/store`, `apps/admin` (Next.js 15 App Router, TypeScript).
- **Paquetes**: `packages/ui`, `packages/db`, `packages/types`, `packages/config`.
- **Dependencias principales**: next, react, typescript, tailwindcss, prisma, @prisma/client, next-auth, zustand (estado del configurador), shadcn/ui.
- **Datos**: esquema Prisma con `Size`, `Flavor`, `BobaType`, `Order`, `OrderItem`; semillas iniciales.
- **Sistemas**: base de datos SQLite (dev) / Postgres (prod); npm registry para paquetes.
