# Design

## Context

El terminal del cajero (`apps/cajero/components/pos/pos-terminal.tsx`) ya implementa autocompletado de clientes con debounce (`getCustomerSuggestions`) y vinculación/creación vía `upsertCustomerForOrder` (customers.ts). El problema: `upsertCustomerForOrder` **crea** el cliente si no existe. Un `Customer` ya tiene `name`, `phone String? @unique` y campos de lealtad; hay un ranking/lealtad asociado a `Order.customerId`. El formulario de cliente en Admin (`customers-client.tsx`) crea/edita nombre, CI, teléfono y pensión. El campo `nickname` no existe aún.

Ver proposal.md - Why para la motivación.

## Goals / Non-Goals

**Goals:**
- La venta con nombre rápido nunca crea clientes (guest por defecto).
- Vinculación solo para clientes existentes (autocompletado o teléfono exacto), sin creación implícita.
- Registro explícito desde el terminal (básico: nombre + teléfono opcional), que además vincula.
- `nickname` en `Customer`: auto-first-name, editable en Admin, usado como nombre corto en pedidos/cola/comanda.
- Solo terminal del cajero.

**Non-Goals:**
- No tocar el flujo del mesero (sigue sin vincular).
- No cambiar la acumulación de lealtad existente (`acceptOrder`/`acceptPensionOrder`): solo se dispara con `customerId`.
- No agregar pensión/alimentación de clientes desde el terminal (se completa luego en Admin).
- No deduplicar los clientes ya creados duplicados por el comportamiento anterior.

## Decisions

### D1. Nombre corto = apodo o primer nombre, derivado en la misma operación
El pedido guarda como `customerName` el nombre **corto** en mayúsculas. Para un cliente vinculado → `nickname ?? primerNombre(name)`. Para invitado → el texto que escribió el cajero (que ya es corto). Así cola, pago y comanda muestran "MARIA" sin tocar `queue-view.tsx` ni `printing.ts`: ambos ya imprimen `order.customerName`.
Racional: no agrega lógica de display en capas existentes; el dato vive en la orden. Deriva primer nombre con `name.trim().split(/\s+/)[0]`.
Alternativa descartada: resolver el corto en la tarjeta (transformar en cada componente) → más puntos de cambio y riesgo de inconsistencias entre cola, pago y comanda.

### D2. `getCustomerSuggestions` devuelve `nickname`
Se agrega `nickname` a `CustomerSuggestion` y se completa el input con `shortName = nickname ?? primerNombre(name)` al seleccionar. La búsqueda sigue `contains` por `name`/`phone`, tope 8, `lastVisitAt` desc (sin cambios de orden).
Racional: el upsert *de display* ocurre en el cliente; el server expone el dato.

### D3. `upsertCustomerForOrder` → vínculo sin creación
Se reemplaza por `linkCustomerByText(text)`: normaliza teléfono; si parece teléfono busca `phone` exacto; si no, busca `name` exacto; devuelve la vista de lealtad o `null`. **Nunca crea.** El terminal: `customerId` seleccionado → `getCustomerLoyalty`; si no → `linkCustomerByText`; si `null` → invitado (se pasa `customerId` `null` a `createPosOrder`).
Racional: el principio "nunca crear por defecto" vive en una sola función fácil de auditar.

### D4. Registro explícito como server action separada
Nueva `registerCustomerAtPos({ name, phone? })` (cajero): valida role ≠ MESERO, nombre obligatorio, teléfono opcional normalizado; si el teléfono existe → error claro "El teléfono X ya está registrado para <cliente>"; crea con `nickname = primerNombre(name)`, `pensionType PREPAGO`, saldo 0, y devuelve `CustomerLoyaltyView`. El terminal abre un diálogo, llama la acción y al éxito fija `customerName` corto + `customerId`.
Racional: separa el "registrar" (acción que crea, intencional) del "vender" (nunca crea). Reutiliza el patrón de diálogo/UI existente y el typed `CustomerLoyaltyView`.

### D5. `nickname` en schema + migración SQL manual con backfill
`nickname String?` en `Customer`. Migración manual:
1. `ALTER TABLE Customer ADD COLUMN nickname TEXT;`
2. Backfill: `UPDATE Customer SET nickname = substr(trim(name), 1, instr(trim(name) || ' ', ' ') - 1);` (primer token; si `name` es una sola palabra, `instr(trim(name)||' ',' ')` devuelve la posición del espacio añadido = longitud+1 → substr coge toda la palabra).
3. Índice no necesario (p. ej. no se filtra por apodo aún); si se busca por apodo ya hay `@@index([name])`.
El create del seed y el formulario Admin rellenan `nickname` con first-name cuando venga vacío. Aplicar con `prisma migrate deploy` (NO `migrate dev`) y `prisma generate` matando procesos Node (EPERM).

### D6. Admin: edición de apodo y autofill
En `customers-client.tsx` se agrega input "Apodo" (opcional) al diálogo crear/editar y la columna de cliente lo muestra. Server actions `createCustomer`/`updateCustomer` aceptan `nickname?`; si llega vacío/ausente → `nickname = primerNombre(name)`. `PensionCustomer` recibe `nickname: string | null` (o el value corto) — se muestra en lista. No cambia la obligatoriedad del nombre completo.

### D7. Sin cambios de BD ni de acciones en mesero/store
`createPosOrder` acepta `customerId` opcional; mesero seguirá pasándolo `undefined` (invitado). Las órdenes de la tienda web tampoco cambian. El hook de lealtad queda igual.

## Risks / Trade-offs

- **Clientes duplicados históricos**: los creados antes por el auto-upsert (varios "MARIA") seguirán existiendo. → No se purgan en este cambio; el autocompletado los lista y el cajero elige (o registra uno nuevo). Limpieza manual/Admin como mejora futura.
- **Nombre corto en comanda pierde el apellido**: es el objetivo buscado para cocina/colas; la ficha del cliente conserva el nombre completo para Admin/ranking/reportes.
- **Vínculo por nombre exacto pierde fuerza** si el cajero teclea variantes ("Maria" vs "MARIA LOPEZ"): se mantiene exact match + autocompletado + teléfono; un nombre incompleto sin selección queda invitado (comportamiento deseado para no ensuciar).
- **Backfill de apodo con primer nombre**: clientes con `name` de una sola palabra quedan con apodo = nombre completo. Correcto por definición (primer token).
- **`nickname` nullable**: se maneja siempre con fallback `nickname ?? primerNombre` al construir el nombre corto para no romper clientes legacy.

## Migration Plan

1. Editar `schema.prisma` (`nickname String?`).
2. Escribir migración SQL manual `20260922xxxxxx_customer_nickname` (ALTER + backfill) y aplicar `prisma migrate deploy`.
3. Matar procesos Node → `prisma generate`.
4. Actualizar seed (sin cambios funcionales, solo si creara clientes).
5. Server actions: `linkCustomerByText`, `registerCustomerAtPos`, ajustar `getCustomerSuggestions`; Admin: `nickname` en create/update y UI.
6. Terminal: dropdown "Registrar nuevo cliente", diálogo, short-name en selección; invitar en submit.
7. Verificación: `pnpm -r typecheck` y `pnpm -r lint`; flujo manual (invitado, vínculo, registro, teléfono duplicado, apodo en cola/comanda).

Rollback: revertir el commit; la columna `nickname` es aditiva y el backfill es idempotente, no requiere revertir datos.