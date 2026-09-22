# Design

## Context

El terminal del cajero (`apps/cajero/components/pos/pos-terminal.tsx`) ya implementa autocompletado de clientes con debounce (`getCustomerSuggestions`) y vinculación/creación vía `upsertCustomerForOrder` (customers.ts). El problema: `upsertCustomerForOrder` **crea** el cliente si no existe. Un `Customer` ya tiene `name`, `phone String? @unique` y campos de lealtad; hay un ranking/lealtad asociado a `Order.customerId`. El formulario de cliente en Admin (`customers-client.tsx`) crea/edita nombre, CI, teléfono y pensión. Cola y comanda imprimen `Order.customerName`.

Ver proposal.md - Why para la motivación.

## Goals / Non-Goals

**Goals:**
- La venta con nombre rápido nunca crea clientes (guest por defecto).
- Vinculación solo para clientes existentes (autocompletado o teléfono exacto), sin creación implícita.
- Registro explícito desde el terminal (básico: nombre + teléfono opcional), que además vincula.
- Nombre corto derivado (primer nombre + apellido paterno) en pedidos/cola/comanda, sin campo de BD.
- Solo terminal del cajero.

**Non-Goals:**
- No tocar el flujo del mesero (sigue sin vincular).
- No cambiar la acumulación de lealtad existente (`acceptOrder`/`acceptPensionOrder`): solo se dispara con `customerId`.
- No agregar pensión/alimentación de clientes desde el terminal (se completa luego en Admin).
- No deduplicar los clientes ya creados duplicados por el comportamiento anterior.
- No agregar un campo de apodo/nombre corto al esquema.

## Decisions

### D1. Nombre corto derivado = primer nombre + apellido paterno, sin campo en BD
El pedido guarda como `customerName` el nombre **corto** en mayúsculas. Para un cliente vinculado → `shortCustomerName(name)` = los dos primeros tokens de `name` (`"MARIA FERNANDEZ LOPEZ"` → `"MARIA FERNANDEZ"`; nombres de una sola palabra se usan completos). Para invitado → el texto que escribió el cajero. Así cola, pago y comanda muestran el nombre corto sin tocar `queue-view.tsx` ni `printing.ts`: ambos ya imprimen `order.customerName`. Sin cambios de esquema.
Racional: "MARIA" solo es ambiguo (hay varios clientes con el mismo primer nombre); con apellido paterno se desambigua sin llegar al nombre completo. Un campo persistente se habría explorado y descartado: los duplicados del upsert antiguo (varios "MARIA", varios "ANDRES") lo volvían confuso y obligaba a editar en Admin.
Detalle: `shortCustomerName` es un helper **client-safe** en `@bbspos/types` (los módulos `"use server"` solo exportan funciones async; el terminal lo importa del paquete de tipos).
Alternativa descartada: resolver el corto en la tarjeta (transformar en cada componente) → más puntos de cambio y riesgo de inconsistencias entre cola, pago y comanda.

### D2. `getCustomerSuggestions` se deja igual (sin `nickname`)
`CustomerSuggestion`/`CustomerLoyaltyView` no cambian: `name`, `phone`, `lastVisitAt`. Al seleccionar, el input se completa con `shortCustomerName(name).toUpperCase()`. La búsqueda sigue `contains` por `name`/`phone`, tope 8, `lastVisitAt` desc.

### D3. `upsertCustomerForOrder` → vínculo sin creación
Se reemplaza por `linkCustomerByText(text)`: normaliza teléfono; si parece teléfono busca `phone` exacto; si no, busca `name` exacto; devuelve la vista de lealtad o `null`. **Nunca crea.** El terminal: `customerId` seleccionado → `getCustomerLoyalty`; si no → `linkCustomerByText`; si `null` → invitado (se pasa `customerId` `null` a `createPosOrder`).
Racional: el principio "nunca crear por defecto" vive en una sola función fácil de auditar.

### D4. Registro explícito como server action separada
Nueva `registerCustomerAtPos({ name, phone? })` (cajero): valida role ≠ MESERO, nombre obligatorio, teléfono opcional normalizado; si el teléfono existe → error claro "El teléfono X ya está registrado para <cliente>"; crea el cliente con `pensionType PREPAGO` y saldo 0 (sin campos extra) y devuelve `CustomerLoyaltyView`. El terminal abre un diálogo, llama la acción y al éxito fija `customerName` corto + `customerId`.
Racional: separa el "registrar" (acción que crea, intencional) del "vender" (nunca crea). Reutiliza el patrón de diálogo/UI existente y el typed `CustomerLoyaltyView`.

### D5. Sin cambios de BD
`schema.prisma` no cambia. Se conservan en el historial las migraciones transitorias aplicadas durante la implementación (`20260922110000_customer_nickname` add + backfill y `20260922120000_drop_customer_nickname` drop); el estado final del esquema y de la BD es idéntico al previo. Aplicados con `prisma migrate deploy` y `prisma generate` matando procesos Node (EPERM).

### D6. Sin cambios en Admin
El formulario de cliente y la lista de Admin se mantienen como estaban (nombre, CI, teléfono, pensión). Los clientes ya registrados conservan su nombre completo intacto.

### D7. Sin cambios de BD ni de acciones en mesero/store
`createPosOrder` acepta `customerId` opcional; mesero seguirá pasándolo `undefined` (invitado). Las órdenes de la tienda web tampoco cambian. El hook de lealtad queda igual.

## Risks / Trade-offs

- **Clientes duplicados históricos**: los creados antes por el auto-upsert (varios "MARIA", "ANDRES") seguirán existiendo. → No se purgan en este cambio; el autocompletado los lista y el cajero elige (o registra uno nuevo). Limpieza manual/Admin como mejora futura.
- **Nombre corto pierde apellido materno**: es el objetivo buscado para cocina/colas; el apellido paterno se conserva para desambiguar; la ficha del cliente conserva el nombre completo para Admin/ranking/reportes.
- **Vínculo por nombre exacto pierde fuerza** si el cajero teclea variantes ("Maria" vs "MARIA LOPEZ"): se mantiene exact match + autocompletado + teléfono; un nombre incompleto sin selección queda invitado (comportamiento deseado para no ensuciar).
- **Nombre corto derivado puede repetirse** (dos "MARIA FERNANDEZ"): la tarjeta/cola no es el sitio de identificación unívoca; la ficha y el vínculo (id) sí lo son. El cajero ve el nivel/visitas al seleccionar y elige el correcto.

## Migration Plan

1. (Hecho) Migraciones transitorias de una columna provisional (add + backfill) y su posterior drop, aplicadas con `prisma migrate deploy` y `prisma generate`. Estado final del esquema: sin cambios.
2. Server actions: `linkCustomerByText`, `registerCustomerAtPos` (cajero); `shortCustomerName` en `@bbspos/types`.
3. Terminal: dropdown "Registrar nuevo cliente", diálogo, short-name en selección; invitar en submit.
4. Verificación: `pnpm -r typecheck` y `pnpm -r lint`; flujo manual (invitado, vínculo, registro, teléfono duplicado, nombre corto en cola/comanda).

Rollback: revertir el commit; los pedidos quedan tal cual y el esquema no cambió (los migraciones transitivas no dejan residuo).