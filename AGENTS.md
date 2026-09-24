# AGENTS.md

## Proyecto

Monorepo pnpm `bbspos`: POS de té (Bubble Tea). Apps Next.js: `apps/admin` (3001), `apps/cajero` (3002), `apps/mesero`, `apps/store`. Paquetes: `packages/db` (Prisma + SQLite), `packages/types`, `packages/ui`, `packages/config`. Usuario trabaja en español.

## Convenciones

- Migraciones Prisma: escribir SQL a mano y aplicar con `npx prisma migrate deploy` (NO `migrate dev`: es interactivo y falla en este entorno).
- `prisma generate` requiere matar todos los procesos node (workers tsx, dev servers) o falla con EPERM.
- Zona horaria fija `America/La_Paz` (UTC-4). En SQLite, `createdAt` se guarda como entero ms → usar `date("createdAt" / 1000, 'unixepoch', '-4 hours')` en SQL raw.
- Ticket visible = `daySeq` diario (#001...); `seq` es únicamente global. Mostrar `daySeq ?? seq`.
- Estados de pedido en BD: `RECIBIDO`, `ACEPTADO`, `ENTREGADO`, `ANULADO`. Cobrado = `paidAt`, entregado = `deliveredAt`.

## Comandos

- `pnpm -r typecheck` · `pnpm -r lint` · `pnpm --filter @bbspos/cajero dev` (puerto 3002)

## Nota

- La tabla de pedidos del admin usa CVA (`apps/admin/components/orders/statusVariants.ts`, adaptado del cajero, incluye `ANULADO` como estado visual). El pulso rojo del borde usa `animate-border-pulse`, definido en `apps/admin/app/globals.css`.