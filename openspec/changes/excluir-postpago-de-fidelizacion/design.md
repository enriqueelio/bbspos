# Design

## Context

Estado actual verificado en el código (ver `proposal.md` para la motivación):

- `accumulateCustomerLoyalty` (`apps/cajero/app/actions/customers.ts:203`) hace un `update` incondicional. No consulta al cliente, no sabe si es pensionado, no sabe con qué método se cobró y no decide nada.
- Sus dos llamadores viven en `apps/cajero/app/actions/orders.ts`: `acceptOrder` (cualquier método de pago) y `acceptPensionOrder` (siempre `PaymentMethod.PENSION`). Ninguno filtra hoy; la versión de `ee4bb84` solo corrigió la lista de clientes elegibles al cobrar.
- `levelNameOf` (`customers.ts:20`) consulta reglas y agrega pedidos del mes sin mirar el tipo de cliente ni el método de pago.
- `getCustomerRanking` (`apps/admin/app/actions/loyalty.ts:51`) agrupa por `customerId` sobre `Order` con `paidAt` no nulo. Sin filtro de elegibilidad y sin `status: { not: "ANULADO" }`.
- `redeemCustomerPoints` (`loyalty.ts:137`) solo valida saldo de puntos.
- `addCustomerFunds` (`apps/admin/app/actions/customers.ts`) elige `RECARGA` vs `PAGO_DEUDA` mirando solo `pensionType`, que el esquema pone en `PREPAGO` por defecto para todos: un cliente de mostrador sin deuda termina con una "recarga" de saldo.
- `schema.prisma` declara `Customer.pensionType @default(PREPAGO)` y no nullable. Los clientes de mostrador guardan ese valor aunque no sean pensionados.

Restricciones del repo: Prisma + SQLite, zona horaria fija `America/La_Paz`, los acumulados en `Customer` son caché y `Order` es la fuente de verdad, `@bbspos/types` es client-safe (no puede importar Prisma).

## Goals / Non-Goals

**Goals:**
- Una sola decisión de elegibilidad **por movimiento**, definida en un módulo compartido y usada por acumulación, nivel y ranking.
- El guard de no-acumulación vive en el accumulate, no en el llamador.
- Los filtros van en la query de Prisma para no traer datos que después se descartan en memoria.
- Cero cambios de esquema y cero migración.
- El canje no depende del tipo de cuenta: solo del saldo de puntos.

**Non-Goals:**
- Pagos divididos entre `PENSION` y efectivo/QR (queda como pregunta abierta).
- No rediseñar el canje ni la semántica de puntos.
- No tocar la semántica del saldo de la cuenta corriente ni de `CustomerLedger`.
- Sin cambios de UI.
- No hacer nullable `pensionType` ni migrar el valor por defecto de los clientes de mostrador.

## Decisions

### 1. La elegibilidad se decide por movimiento, no por cliente

El predicado recibe el cliente **y el método de pago**. La razón es que la pregunta correcta no es "¿este cliente participa del programa?", sino "¿**este** movimiento es una compra por la que el local ganó plata?". Para un POSTPAGO la respuesta difiere entre sus dos tipos de cobro, así que un predicado de cliente no puede representarla.

```ts
export type FidelizableCliente = {
  isPension: boolean;
  pensionType?: PensionType | null;
};

export function isFidelizable(
  c: FidelizableCliente,
  metodo?: PaymentMethod | null,
): boolean {
  if (!c.isPension) return true; // cliente de mostrador, sea cual sea su pensionType
  if (c.pensionType !== PensionType.POSTPAGO) return true; // PREPAGO
  return metodo != null && metodo !== PaymentMethod.PENSION;
}
```

El `isPension` va primero a propósito: sin ese orden, un cliente de mostrador con `pensionType = "PREPAGO"` (el default del esquema) caería en la rama de pensionado prepago. Ese es el error que casi se cuela.

El `metodo` es opcional para no romper los llamadores que solo necesitan el criterio de cliente, pero la acumulación siempre lo pasa.

Alternativa descartada: predicado de cliente (sin método) que excluya al POSTPAGO entero. Es lo que se implementó primero y está mal por dos razones: esconde al POSTPAGO que sí compró pagando, y obliga a un segundo predicado distinto para el ranking.

### 2. `fidelizableOrderWhere()` para consultas, `fidelizableCustomerWhere()` solo para características

Son dos formas distintas de la misma regla, y no son intercambiables:

- `fidelizableCustomerWhere()` describe **cómo es el cliente**: no es pensionado, o es pensionado que no es POSTPAGO. Sirve para "qué clientes existen".
- `fidelizableOrderWhere()` describe **qué pedidos puntúan**: incluye el pedido si su cliente no es pensionado **o** si el pedido no se cobró a cuenta.

```ts
export function fidelizableOrderWhere() {
  return {
    OR: [
      { customer: { is: fidelizableCustomerWhere() } },
      { paymentMethod: { not: PaymentMethod.PENSION } },
    ],
  };
}
```

Se derivan ambos del mismo enum, así que no pueden divergir. El `where` se declara con tipo de retorno explícito porque si no TypeScript infiere el array como unión y el `OR` deja de ser asignable a `Prisma.OrderWhereInput`.

Alternativa descartada: un solo predicado para todo. No funciona: el buscador necesita el criterio de cliente, y el `groupBy` necesita el de pedido.

### 3. El buscador del ranking no filtra por tipo de cuenta

Antes el buscador aplicaba `fidelizableCustomerWhere()` antes del `groupBy`. Con la regla por movimiento eso esconde justo a quien debe aparecer: un POSTPAGO que compró en efectivo tiene puntos válidos, y si el buscador lo descarta nunca se lo encuentra. Ahora el buscador devuelve cualquier coincidencia y es el `groupBy` sobre pedidos fidelizables el que decide si ese cliente tiene filas. Un POSTPAGO que solo consumió a cuenta aparece en la búsqueda y no aparece en el resultado, que es el comportamiento correcto.

### 4. El guard va dentro de `accumulateCustomerLoyalty` y recibe el método

La función lee el cliente dentro de `tx` y sale temprano si ese movimiento no genera lealtad. Cierra la fuga sin depender de que el llamador se acuerde, y es lo único que garantiza que `acceptOrder` (que cobra con el método que chose el usuario) y `acceptPensionOrder` (que siempre es `PENSION`) apliquen la misma regla.

Costo: una lectura extra por cobro. Es un `findUnique` por índice primario sobre una fila, dentro de una transacción que ya escribe. Se acepta a cambio de que la invariante sea local a la función.

Alternativa descartada: filtrar en cada llamador. Es la decisión que produce este bug, y cualquier llamador futuro repite el error. Los dos call sites solo pasan el método y explican en un comentario por qué el `PENSION` no puntúa.

### 5. `accumulateCustomerLoyalty` no lanza si el cliente no existe

Hoy un `customerId` inválido revienta la transacción del cobro. Con el guard, un cliente ausente se trata igual que uno no elegible: no-op silencioso. Un `customerId` huérfano no debe impedir cobrar un pedido.

### 6. `levelNameOf` filtra el aggregate en vez de retornar temprano

Antes retornaba `null` para no fidelizables, lo que era correcto cuando la elegibilidad era del cliente. Ahora no hay respuesta por cliente: el nivel depende de qué pedidos puntúan. El `aggregate` del mes lleva `fidelizableOrderWhere()`, así que el consumo a cuenta de un POSTPAGO no le infla el nivel (lo que es coherente con que tampoco le sumó puntos), y sus compras en efectivo sí se lo pueden subir.

Esto cuesta una query más para un POSTPAGO que antes no consultaba nada. Se acepta: el `where` va en la base, no en memoria.

### 7. El canje se desbloquea y valida solo el saldo

El POSTPAGO ya puede tener puntos (por sus compras en efectivo/QR), así que bloquearle el canje le quitaría una recompensa que sí se ganó. `redeemCustomerPoints` queda con la validación de saldo y nada más. El orden de checks anterior ("no participa del programa" antes de "saldo insuficiente") desaparece con el mensaje que lo acompañaba.

### 8. `addCustomerFunds` decide el tipo de movimiento por `isPension`

El default `PREPAGO` del esquema hace que hoy `addCustomerFunds` trate a cualquier cliente no pensionado como si tuviera saldo prepago. La decisión pasa a ser `isPension ? (PREPAGO ? RECARGA : PAGO_DEUDA) : RECARGA`, que conserva el comportamiento del cliente de mostrador (pagar por adelantado) sin llamarlo pensionado. No se toca `pensionType`: el campo sigue mal para los no pensionados, pero ningún camino de lealtad lo toma en serio.

### 9. El script de limpieza replica la regla, no la importa

`fix-postpago-loyalty.ts` pasa de "POSTPAGO a cero" a "recalcular cada cliente desde los pedidos que generaron lealtad". Reimplementa el criterio con un `findMany` + `filter` en TypeScript en vez de importar `@bbspos/types`, porque los scripts de `@bbspos/db` corren sin las dependencias de las apps. El costo es una copia de la regla que puede divergir; se acepta por no crear una dependencia cruzada entre paquetes. Es idempotente y dry-run por defecto.

Nota: recalcular puede **subir** el caché de un cliente, porque el programa de lealtad entró después que los primeros pedidos y nunca los retroactivó. Por eso el script es explícito y con `--apply`.

## Risks / Trade-offs

- **[El guard necesita un `findUnique` extra por cobro]** → con la PK indexada es despreciable frente al `update`. Si alguna vez molestara, se puede pasar el cliente ya cargado por el llamador como parámetro opcional sin cambiar el comportamiento, pero el default es que la función sea autosuficiente.
- **[Filtro sobre relación en Prisma]** → SQLite lo resuelve con `JOIN`, no con subconsulta: sin cambio de plan noticeable. Si el volumen lo hiciera lento, se puede invertir a filtrar los ids de clientes primero.
- **[`fidelizableCustomerWhere()` y `fidelizableOrderWhere()` pueden divergir si alguien edita uno]** → ambos se derivan del mismo enum y sus comentarios cruzan referencias explícitas. El riesgo real es que se agregue una tercera forma de filtrar en el futuro.
- **[Un POSTPAGO aparece o desaparece del ranking según el periodo]** → es el comportamiento pedido: hoy solo vuelve a aparecer cuando tiene una compra pagada dentro del periodo consultado.
- **[`pensionType` sigue con default `PREPAGO` para los no pensionados]** → mientras todo consumidor mire `isPension` primero es inocuo, pero es una trampa para el próximo que escriba una query. Hacerlo nullable es una migración futura.
- **[Un POSTPAGO que paga en efectivo genera `CustomerLedger` de consumo igual que antes]** → este cambio no lo toca; la semántica del saldo sigue siendo la vigente.
- **[Pago dividido `PENSION` + efectivo]** → `accumulateCustomerLoyalty` recibe un solo método y un solo monto. Hoy `acceptOrder` no ofrece métodos mixtos, así que no se puede llegar a ese caso, pero si se agrega hay que decidir si los puntos son por el total o solo por la parte pagada en el local.

## Migration Plan

Sin migración de esquema. Deploy: primero `@bbspos/types` con los predicados, luego los actions que lo consumen (el predicado es aditivo, así que el orden inverso también funciona mientras el build pase).

Rollback: revertir los actions, el script y el archivo de types. Los datos ya limpiados no se revierten solos, pero el script es idempotente y se puede volver a correr tras el revert.

## Open Questions

- **Pago dividido**: si un POSTPAGO paga parte a cuenta y parte en efectivo, ¿los puntos son por el total o solo por la parte pagada en el local? Hoy `Order` tiene un solo `paymentMethod`, así que no aplica, pero hay que decidirlo antes de agregar pagos mixtos.
- Las decisiones de negocio pendientes (semántica del canje, saldo positivo en POSTPAGO, mora/vencimiento, transición entre tipos) están deliberadamente fuera de este cambio y se resolverán en sus propias fases.
