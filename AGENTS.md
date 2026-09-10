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

## Tarea pendiente (mañana)

Refactorizar `apps/admin/app/(dashboard)/orders/orders-client.tsx` para usar CVA, igual que la cola del cajero.

- Centralizar los colores en un archivo de variantes (p. ej. reutilizar/adaptar `apps/cajero/components/orders/statusVariants.ts`: `orderBadgeVariants`, `orderCardVariants`, `visualStateOf`).
- Reemplazar la función `statusVariant()` inline (mueve los colores al CVA).
- Paleta de 5 estados: RECIBIDO = badge gris / borde azul · ACEPTADO = badge azul / borde amarillo · ENTREGADO sin cobrar = badge verde / borde rojo pulsante · ENTREGADO cobrado = badge verde / borde verde fijo · PAGADO sin entregar = badge naranja / borde verde.
- No borrar lógica (filtros, sorting, acciones de anular/descontar/cobrar/entregar/reimprimir). Solo estilos con CVA.
- Verificar `pnpm -r typecheck` y `pnpm -r lint` al terminar.