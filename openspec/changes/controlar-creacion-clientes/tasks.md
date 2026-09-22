# Tasks

## 1. Modelo y migración

- [ ] 1.1 Agregar `nickname String?` a `Customer` en `packages/db/prisma/schema.prisma` y verificar `pnpm --filter @bbspos/db typecheck`
- [ ] 1.2 Escribir migración SQL manual `20260922xxxxxx_customer_nickname` (ALTER TABLE + backfill `substr(trim(name),1,instr(trim(name)||' ',' ')-1)`) y aplicarla con `npx prisma migrate deploy`
- [ ] 1.3 Matar procesos Node y ejecutar `prisma generate` (evitar EPERM)
- [ ] 1.4 Verificar backfill: consultar clientes existentes y comprobar que `nickname` = primer nombre (p. ej. 1 query de lectura)

## 2. Server actions (cajero)

- [ ] 2.1 Reemplazar `upsertCustomerForOrder` por `linkCustomerByText(text)`: vincula por `phone` exacto o `name` exacto y devuelve `CustomerLoyaltyView | null` SIN crear; verificar typecheck
- [ ] 2.2 Nueva `registerCustomerAtPos({ name, phone? })` con role ≠ MESERO, teléfono opcional, rechazo de teléfono duplicado con error claro, `nickname` = primer nombre; verificar con typecheck
- [ ] 2.3 Ampliar `getCustomerSuggestions` / `CustomerSuggestion` con `nickname`; verificar typecheck

## 3. Terminal POS (cajero)

- [ ] 3.1 `submit()`: vender como invitado cuando no hay `customerId` seleccionado ni coincide un registro (pasar `customerId: null` a `createPosOrder`, sin llamar a ninguna creación); verificar typecheck
- [ ] 3.2 Al seleccionar un cliente del autocompletado, completar el input con el nombre corto (`nickname ?? primer nombre`) y fijar `customerId`; verificar en pantalla que el ticket muestra el nombre corto
- [ ] 3.3 Agregar opción "Registrar nuevo cliente" en el dropdown y diálogo básico (nombre + teléfono opcional) que llama `registerCustomerAtPos` y vincula; verificar flujo en pantalla (crea, vincula y muestra apodo)
- [ ] 3.4 Ocultar "Registrar" para rol MESERO y mantener validación de nombre obligatorio y envío en mayúsculas (sin regresiones); verificar con typecheck

## 4. Admin (apodo)

- [ ] 4.1 Server actions `createCustomer`/`updateCustomer` aceptan `nickname?` con autofill a primer nombre si llega vacío; verificar typecheck
- [ ] 4.2 Diálogo crear/editar de `customers-client.tsx` con input "Apodo" y mostrar apodo en la lista; `PensionCustomer` con `nickname`; verificar pantalla Admin y typecheck

## 5. Comercialización del nombre corto en cola/comanda

- [ ] 5.1 Verificar que cola y comanda imprimen `order.customerName` (ya corto) sin cambios de código, con un pedido vinculado y uno invitado en pantalla

## 6. Verificación

- [ ] 6.1 `pnpm -r typecheck` y `pnpm -r lint` verdes
- [ ] 6.2 Flujo manual: venta invitado sin crear cliente en BD (query `Customer` antes/después), vínculo por autocompletado y por teléfono, registro explícito, teléfono duplicado rechazado
- [ ] 6.3 Verificar apodo en cola/comanda y en Admin (editable), y que la lealtad solo se acumula para pedidos vinculados (no invitados)