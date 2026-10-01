# Proposal

## Why

La cuenta corriente del cliente permite que un abono entre como ingreso real de caja (queda en el cierre del día y en el reporte diario) y que ese dinero se gaste después en el mostrador descontándolo del saldo. Hoy el sistema **no garantiza que exista una forma de gastar ese saldo**: el abono acepta a cualquier cliente, pero solo un pensionado puede ser cobrado a cuenta.

El resultado es plata que entra, se contabiliza como venta y no se puede gastar. Y no es hipotético: el botón de recarga está visible para todos los clientes de la tabla, y la única defensa es el filtro `isPension` de la lista del cajero y un error del servidor en `acceptPensionOrder`.

Hay **dos puertas** al mismo estado inválido, no una:

1. `addCustomerFunds` no comprueba `isPension`: un cliente de mostrador puede recibir un abono.
2. `updateCustomer` permite desmarcar "Es pensionado" sin mirar el saldo: un pensionado con saldo o con deuda se convierte en mostrador y su cuenta corriente queda fuera del alcance del cajero.

Regla de negocio decidida: **un cliente que no es pensionado no tiene cuenta corriente, y su saldo es siempre cero.** El saldo a favor pertenece a los pensionados.

## What Changes

- **El abono exige cuenta corriente**: `addCustomerFunds` rechaza el abono cuando el cliente no es pensionado, con un mensaje que dice que hay que marcarlo como pensionado primero. El rechazo es en el servidor, no solo en la UI.
- **No se puede cerrar una cuenta con saldo**: `updateCustomer` rechaza desmarcar "Es pensionado" mientras el saldo sea distinto de cero, tanto a favor como en deuda. La deuda también queda fuera del alcance del cajero si se desmarca, así que la invariante es `isPension = false ⇒ saldo = 0`.
- **La UI acompaña la regla**: el botón de recarga deja de mostrarse para clientes de mostrador, y la ayuda del toggle "Es pensionado" explica que el saldo obliga a mantener la cuenta marcada. La decisión final siempre es del servidor.
- **El pensionado prepago consume su saldo en el cajero, y eso queda especificado**: un abono de 1.000 Bs a un pensionado PREPAGO le deja saldo a favor que el cajero ve en el cobro a cuenta, descuenta pedido por pedido, y le suma puntos mientras le quede saldo. Ese flujo ya funciona; este change lo fija como comportamiento requerido en vez de dejarlo como efecto colateral del código.
- **Auditoría del invariante**: script de solo lectura que lista clientes no pensionados con saldo distinto de cero, para confirmar que la base real no tiene ninguno. No escribe nada.
- **Sin cambios de esquema**: no hay migraciones. `isPension` y `balance` ya existen y ya significan lo que esta regla exige.

## Capabilities

### New Capabilities
- `customer-account`: la cuenta corriente del cliente (quién puede tener saldo, cómo se recarga, cómo la consume el cajero y por qué el saldo obliga a mantener la cuenta marcada).

### Modified Capabilities
- (ninguna; la regla de lealtad del POSTPAGO ya la fija `excluir-postpago-de-fidelizacion` y este change no la toca)

## Impact

- **`apps/admin/app/actions/customers.ts`**: `addCustomerFunds` valida `isPension` antes de bonificar; `updateCustomer` valida que no se desmarque la cuenta con saldo distinto de cero. El tipo de movimiento sigue decidiéndose por `isPension` (de `ee4bb84`).
- **`apps/admin/app/(dashboard)/customers/customers-client.tsx`**: el botón de recarga se muestra solo a pensionados; la ayuda del toggle menciona el compromiso del saldo. El `FundDialog` deja de depender de `pensionType` para decidir el título, porque solo se abre para pensionados.
- **`packages/db/scripts/verify-cuenta-solo-pensionados.ts`**: auditoría de solo lectura del invariante.
- **Datos existentes**: verificado sobre `dev.db` que no hay clientes no pensionados con saldo (3 mostradores con saldo 0, 1 pensionado POSTPAGO con −290 Bs, cero recargas en todo el libro). La migración `20260930180000_customer_is_pension` ya marcó como pensionados a todos los que tenían saldo movido, así que el backfill no dejó este caso. La auditoría sirve para confirmarlo sobre la base real.
- **Sin tocar**: la lista del cajero (`isPension: true`), `acceptPensionOrder`, el cierre de caja y el reporte diario. Sus reglas ya son correctas; lo que estaba mal era que existiera un saldo que no podían alcanzar.