# Tasks

## 1. Server actions (cajero)

- [x] 1.1 Reemplazar `upsertCustomerForOrder` por `linkCustomerByText(text)`: vincula por `phone` exacto o `name` exacto y devuelve `CustomerLoyaltyView | null` SIN crear; verificar typecheck
- [x] 1.2 Nueva `registerCustomerAtPos({ name, phone? })` con role ≠ MESERO, teléfono opcional, rechazo de teléfono duplicado con error claro; verificar typecheck
- [x] 1.3 `getCustomerSuggestions` / `CustomerSuggestion` sin cambios (sin `nickname`); nuevo helper client-safe `shortCustomerName` en `@bbspos/types` (primer nombre + apellido paterno); verificar typecheck

## 2. Terminal POS (cajero)

- [x] 2.1 `submit()`: vender como invitado cuando no hay `customerId` seleccionado ni coincide un registro (pasar `customerId: null` a `createPosOrder`, sin llamar a ninguna creación); verificar typecheck
- [x] 2.2 Al seleccionar un cliente del autocompletado, completar el input con el nombre corto (`shortCustomerName` → primer nombre + apellido paterno) y fijar `customerId`; verificar en pantalla que el ticket muestra el nombre corto
- [x] 2.3 Agregar opción "Registrar nuevo cliente" en el dropdown y diálogo básico (nombre + teléfono opcional) que llama `registerCustomerAtPos` y vincula; verificar flujo en pantalla (crea, vincula y muestra nombre corto)
- [x] 2.4 Ocultar "Registrar" para rol MESERO y mantener validación de nombre obligatorio y envío en mayúsculas (sin regresiones); verificar con typecheck

## 3. Esquema

- [x] 3.1 Sin cambios en `schema.prisma`; migraciones transitorias de columna provisional (add + backfill y posterior drop) aplicadas con `prisma migrate deploy`; `prisma generate` matando procesos Node; confirmar que el esquema final no tiene la columna

## 4. Admin

- [x] 4.1 Sin cambios en `createCustomer`/`updateCustomer` ni en la UI de `customers-client.tsx` (se revierte cualquier edición de apodo); verificar typecheck y pantalla Admin

## 5. Comercialización del nombre corto en cola/comanda

- [ ] 5.1 Verificar que cola y comanda imprimen `order.customerName` (ya corto) sin cambios de código, con un pedido vinculado y uno invitado en pantalla

## 6. Verificación

- [x] 6.1 `pnpm -r typecheck` y `pnpm -r lint` verdes
- [ ] 6.2 Flujo manual: venta invitado sin crear cliente en BD (query `Customer` antes/después), vínculo por autocompletado y por teléfono, registro explícito, teléfono duplicado rechazado
- [ ] 6.3 Verificar nombre corto en cola/comanda (primer nombre + apellido paterno), ausencia del campo apodo en Admin y que la lealtad solo se acumula para pedidos vinculados (no invitados)