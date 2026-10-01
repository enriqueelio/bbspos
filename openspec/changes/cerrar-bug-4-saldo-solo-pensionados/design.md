# Design

## Context

Estado actual verificado en el código (ver `proposal.md` para la motivación):

- `addCustomerFunds` (`apps/admin/app/actions/customers.ts:174`) valida monto y medio de pago, lee al cliente y bonifica. No mira `isPension`. El tipo de movimiento lo decide por `isPension && pensionType === POSTPAGO` (de `ee4bb84`), así que un mostrador produce `RECARGA`.
- `updateCustomer` (`customers.ts:115`) escribe `isPension: input.isPension` sin mirar el saldo. Cuando viene desmarcado, ni siquiera toca `pensionType`/`creditLimit` (línea 154), así que el cliente queda con `isPension = false` y valores de pensionado guardados.
- `registerCustomerAtPos` (`apps/cajero/app/actions/customers.ts:189`) crea clientes del mostrador con `prisma.customer.create({ data: { name, phone } })`: nace con `isPension = false`, `pensionType = "PREPAGO"` (default del esquema) y `balance = 0`. O sea, la invariante se cumple por construcción en esa vía.
- La lista de cobro a cuenta del cajero (`apps/cajero/app/page.tsx:135`) filtra `where: { isPension: true }`.
- `acceptPensionOrder` (`apps/cajero/app/actions/orders.ts:316`) rechaza con error si `!customer.isPension`, y para PREPAGO exige `balance >= total`.
- El cierre de caja (`apps/cajero/lib/cash-close.ts:60`) suma `RECARGA` y `PAGO_DEUDA` como ingreso del día y excluye `CONSUMO`. Igual el reporte diario (`packages/db/src/daily-report.ts:255`).
- `createCustomer` y `updateCustomer` solo escriben `creditLimit` cuando `isPension` es verdadero.

Estado de los datos, verificado sobre `dev.db`: 4 clientes. 3 no pensionados, los tres con `balance = 0`. 1 pensionado POSTPAGO con `balance = -290` y `creditLimit = 1000`. 6 movimientos `CONSUMO` en todo el libro, **cero** `RECARGA` y cero `PAGO_DEUDA`.

Restricciones del repo: Prisma + SQLite, server actions de Next.js como única puerta de escritura, `pensionType` con `@default(PREPAGO)` no nullable (queda como trampasdocumentada en `packages/types`), scripts de datos en `packages/db/scripts` con dry-run por defecto.

## Goals / Non-Goals

**Goals:**
- La invariante `isPension = false ⇒ balance = 0` pasa a ser una garantía del servidor, no una consecuencia afortunada del flujo de alta.
- Las dos entradas que la pueden romper (bonificar, desmarcar) quedan cerradas en la capa que escribe.
- La UI refleja la regla para que el error no haya que discoverlo con un rechazo.
- Un invariante verificable sobre la base real, sin escribir nada.

**Non-Goals:**
- No se toca la lista del cajero, `acceptPensionOrder`, el cierre de caja ni el reporte diario: sus reglas ya son correctas.
- No se cambia el flujo de alta del mostrador ni el de los puntos.
- Sin migración ni cambios de esquema.
- No se rediseña la pantalla de clientes (buscador, paginación, etiquetas de saldo): son pendientes de prioridad aparte.

## Decisions

### 1. La invariante se hace imposible en el servidor, y la UI solo la acompaña

El rechazo va en `addCustomerFunds` y en `updateCustomer`, que son las únicas dos acciones que pueden crear el estado. Ocultar el botón sin validar no sirve: `isPension` se puede desmarcar desde el propio formulario de edición, o `addCustomerFunds` se puede llamar desde cualquier pestaña de desarrollo. La UI se ajusta para que el rechazo sea la excepción y no la norma de uso.

Alternativa descartada: solo ocultar el botón. Deja el bug abierto por la vía del formulario de edición, que es la segunda puerta y la más fácil de no notar.

### 2. El bloqueo de desmarcar mira saldo distinto de cero, no solo saldo a favor

La regla de negocio que se decidió es "un cliente no pensionado no tiene cuenta corriente". Si eso es cierto, aplica igual en los dos sentidos: un saldo a favor que nadie puede gastar y una deuda que nadie puede cobrar son el mismo defecto, y la deuda es el peor de los dos porque además se pierde plata. Bloquear solo el saldo a favor dejaría una deuda Huérfana.

El mensaje de error también cambia según el signo, porque la explicación es distinta: con saldo a favor, la plata se gasta en el mostrador; con deuda, se cobra en el mostrador.

Alternativa descartada: permitir desmarcar y poner el saldo en cero automáticamente. Perdería el libro de movimientos y dejaría al cliente con deuda sin registro de a dónde se fue.

### 3. El saldo se lee antes de escribir, y el rechazo no toca datos

`updateCustomer` ya lee al cliente para validar el teléfono (`customers.ts:135`). La validación del saldo encaja en esa misma lectura: si va a fallar, falla antes de la transacción. Igual en `addCustomerFunds`, que ya lee al cliente para decidir el tipo de movimiento. Ninguna de las dos acciones escribe nada antes de validar.

### 4. Un solo predicado, reutilizado por ambas validaciones

La condición "tiene saldo" es `balance !== 0`, y la condición "es pensionado" es `isPension`. Ambas validaciones son distintas pero comparten el mismo par de campos. Se implementan como un chequeo corto y explícito en cada acción en vez de como un helper compartido en `@bbspos/types`, porque:

- No hay una regla de negocio nueva que abstraer: son dos literales sobre dos columnas.
- `@bbspos/types` ya tiene el predicado de lealtad (`isFidelizable`), y mezclar ahí una regla de cuenta corriente haría que ese módulo dejara de ser "la regla del programa de puntos".
- Un helper compartido por dos call sites no reduce el riesgo real (que es que alguien escriba la condición al revés).

Alternativa descartada: `assertCuentaCorriente(cliente)` en `@bbspos/types`. Más elegante en apariencia, pero mete una regla de saldo en el módulo de lealtad y deja el chequeo de `updateCustomer` (que es distinto: saldodistinto de cero, no `isPension`) sin un lugar natural donde vivir.

### 5. El tipo de movimiento se decide por `isPension` primero (de `ee4bb84`, se mantiene)

`pensionType` tiene `@default(PREPAGO)` para todos, así que un cliente de mostrador lo tiene almacenado como PREPAGO. Con la invariante nueva, `addCustomerFunds` solo se ejecuta sobre pensionados, así que la rama `POSTPAGO` ya no necesita el `customer.isPension &&` de hoy. **Se deja igual de todas formas**: es la forma correcta de escribirlo y no depende de que hoy todos los que llegan sean pensionados.

### 6. La auditoría es un script de solo lectura, y sale con código plano

`verify-cuenta-solo-pensionados.ts` en `packages/db/scripts`, siguiendo la convención de `verify:lunch` (crea y borra su propio dato) pero sin tocar nada: solo lista. Se ejecuta sobre `dev.db` como parte de la verificación del change, y queda disponible para correr sobre la base real.

Cubre tres consultas, porque hay tres formas de romper la invariante y solo una se ve en la tabla de clientes:
1. No pensionados con `balance !== 0` (el caso de BUG-4).
2. No pensionados con movimientos en `CustomerLedger` (plata que ya entró).
3. Pensionados con `creditLimit > 0` y `pensionType = PREPAGO` (dato incoherente; no rompe la invariante, pero el mismo backfill lo dejó así).

Alternativa descartada: una migración que normalice. No hay nada que normalizar — la consulta de `dev.db` devuelve vacío — y una migración que no cambia nada solo agrega riesgo al próximo `migrate deploy`.

## Risks / Trade-offs

- **Un pensionado mal clasificado por el backfill queda con saldo y no gastable** → el backfill `20260930180000_customer_is_pension` marcó como pensionado a todo el que tuviera CI, límite, saldo movido o movimientos, así que un cliente con saldo es pensionado por construcción. La auditoría lo confirma sobre la base real; si apareciera alguno, el arreglo es marcarlo en Administración, no código.
- **Un usuario que ya estaba recargando a mostradores pierde esa vía** → es el objetivo. El mensaje de error dice exactamente qué hacer (marcarlo como pensionado), así que no parece un bloqueo arbitrario.
- **El formulario de edición ahora puede rechazar un guardado** → solo cuando se desmarca con saldo. El mensaje lo explica. Un cliente de mostrador con saldo 0 se sigue editando sin cambios.
- **La regla no está a nivel de base de datos** → un `UPDATE` manual en la base podría romperla. Se acepta: no hay otros invariantes de negocio forzados en SQLite y el repo no edita la base a mano salvo con scripts documentados.

## Migration Plan

Sin migración. Pasos de despliegue: los dos guards en las server actions y el ajuste de la UI, que pueden ir en el mismo despliegue porque no hay orden entre ellos (con los guards primero, la UI es solo confirmation; al revés, la UI previene el uso normal pero el servidor igual rechaza).

Rollback: revertir `addCustomerFunds` y `updateCustomer` devuelve el comportamiento anterior. No hay datos que deshacer, porque el cambio no escribe nada nuevo.

Verificación posterior: correr la auditoría sobre la base real. Si devuelve vacío, el invariante se cumple.

## Open Questions

- Quién decide qué hacer con un saldo a favor que el cliente nunca gasta (devolución, vencimiento, traspaso). No cambia esta implementación: el saldo sigue ahí y gastable, solo documenta que la deuda de devolverlo existe.
- Si en el futuro se admite pagar deuda con saldo a favor (un postpago que prepaga), esa es la tarea 8.3 del change `excluir-postpago-de-fidelizacion` y requiere su propia decisión de lealtad.