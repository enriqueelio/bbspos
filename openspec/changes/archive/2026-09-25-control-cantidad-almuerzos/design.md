# Design

## Context

Estado actual relevante (ver proposal.md para la motivación):

- El Menú del Día es una **bandera con vigencia por fecha** en `MenuItem` (`enMenuDelDia` + `menuDelDiaDate`), propiedad de `packages/db/src/menu-day.ts` (`zonedDateKey()`, `todayMenuItems()`, `cartaMenuItems()`). No hay ninguna noción de cantidad: el catálogo entero es booleano (`available`).
- El POS del cajero pinta los almuerzos del día en una grilla de 5 columnas con **solo nombre y precio** (`apps/cajero/components/pos/pos-terminal.tsx`), y la activa/desactiva el admin desde la tabla de Almuerzos (`apps/admin/app/(dashboard)/menu/menu-manager.tsx`) con un botón que ya **no pide monto ni cantidad**.
- El precio es **autoritativo desde la base**: `pricePosItems` (apps/cajero/actions/pos.ts) recalcula cada línea contra `MenuItem`/matrices, y el ticket no permite editar precios a mano. Por eso el precio del almuerzo no se toca en este cambio.
- `OrderItem` guarda una **instantánea de nombres** (`menuItemName`, `menuItemCategory`, `menuItemOptionName`, `menuItemDetail`), **no** el `menuItemId` (packages/db/prisma/schema.prisma:269-287). La reconstrucción de reservas ya resuelve ítems por nombre.
- Las terminales se sincronizan por **polling**: `router.refresh()` cada 15 s (apps/cajero/components/queue-view.tsx:333-344), sin push ni websockets. `getPosCatalog` corre en cada refresh.
- Convenciones del repo que condicionan el diseño: migraciones Prisma **escritas a mano** y aplicadas con `npx prisma migrate deploy`; `prisma generate` requiere matar los procesos node; zona horaria fija `America/La_Paz` (UTC−4); spec de almuerzos en `openspec/specs/lunch-menu/spec.md`.

## Propuestas de referencia (caG / caM) y decisiones tomadas

Las dos propuestas entregadas como insumo (`indicaciones/Prompts/caG.txt`, `indicaciones/Prompts/caM.txt`) coinciden en el objetivo y difieren en el modelo y en dos behaviors que la operationalización del restaurante ya resolvió. Se conserva lo útil y se documenta cada desvío.

| Tema | caG | caM | Decisión aquí | Motivo |
|---|---|---|---|---|
| Modelo | campo o tabla de stock diario | `DailyAvailability {date, productId, initialQty, currentQty, soldQty, lowThreshold}` + `Product.isLunch` | `LunchQuota` (planned) + `LunchAdjust` (log de ajustes) | `currentQty`/`soldQty` son contadores que se desincronizan; `isLunch` duplica `category = ALMUERZO` + `enMenuDelDia` |
| Umbral | ≤5 rojo intenso | ≤5 rojo parpadeante, `lowThreshold` por plato | `lowThreshold Int @default(5)` en la cuota, **rojo fijo** (sin parpadeo) | El dato de caM es bueno (umbral configurable sin migración futura); el parpadeo se descartó por no ser necesario |
| Badge | esquina superior derecha de la tarjeta | `[40]` sobre la tarjeta | **Esquina superior derecha**, estética del badge de atajos, neutro en estado normal | Coherencia visual con los atajos, que es lo que pidió el personal |
| Programación | admin o cajero desde el popover | pantalla admin `/almuerzos` con rol ADMIN/COCINA | **Cajero en el POS**; admin en solo lectura | La cocina informa por el POS en el momento de la jornada |
| Ajuste | sumar/restar en el popover | `[-5][-1][+1][+5][+10]` + motivo | `−10 −5 −1 \| +1 +5 +10` + nota opcional | Superconjunto de los pasos propuestos, con la nota como contexto del error de cálculo |
| Agotado | **bloquea** la tarjeta | gris **AGOTADO, no clickeable** | Gris, marcada como agotada y **sin agregar al ticket**; el número sigue siendo interactivo para reponer | La cifra depende de un cálculo humano: en vez de dejar al cajero sin poder corregir en el momento, se bloquea el alta y se repone desde el propio número |
| Choque entre cajas | no lo contempla | no lo contempla | **Apartado por caja en la base** (`LunchHold`), con TTL de 20 min | Sin apartado, dos cajas pueden vender las mismas unidades: el bloqueo de interfaz no alcanza cuando el clic y el cobro no ocurren juntos |
| Momento del descuento | al confirmar la venta | solo al cobrar (`acceptedAt`), con transacción | Derivado de los ítems del pedido (equivale a la creación) | La comanda de un pedido POS **se imprime al crearlo** (apps/cajero/actions/pos.ts:336-387): desde ese instante la cocina ya produce; esperar al cobro dejaría la cifra mintiendo |
| Sincronización | — | SSE `lunch-stock-update` | **Polling de 15 s ya existente** | Un canal SSE permanente no aporta a un local con una o dos cajas y complica el despliegue; tras cada ajuste local sí hay refresco inmediato |
| Reportes | — | inicial vs vendido vs sobra | Histórico por jornada en el admin (programado / vendido / restante) | El dato ya queda guardado por fecha; la vista histórica lo hace útil |

## Goals / Non-Goals

**Goals:**

- Cantidad por jornada para los platos del Menú del Día, **derivada de los pedidos** para que nunca se desincronice.
- Programar y ajustar la cantidad **desde el POS del cajero**, con auditoría de cada ajuste.
- Contador visible en la tarjeta del almuerzo con umbrales de color, y **edición en el acto** con un popover.
- **Bloquear el alta de un plato agotado** y poder rehabilitarlo reponiendo unidades desde el propio número.
- **Apartar el cupo por caja mientras el plato está en el ticket**, para que el primero que agarre gane, con liberación al quitar la línea, al cobrar o al vencer, y con rechazo en el servidor.
- Cero cambios en el flujo de cobro/impresión y cero dependencias nuevas.

**Non-Goals:**

- Terminal del mesero: no muestra contador ni permite ajustar (queda para un cambio posterior).
- Tienda pública: no vende almuerzos, no se toca.
- Inventario, compras, mermas o control de insumos: es un conteo de la jornada, no un stock.
- Precio por día, precio por venta o edición de precios en el ticket.
- Ajuste de cantidades desde el admin: solo lectura (ver Open Questions).
- **Cupo de almuerzos en jornadas futuras**: el admin solo programa el Menú del Día vigente (`requireTodayMenuItem`), así que no hay cantidades para mañana. Una reserva pactada para otro día no aparta unidades y se valida contra esa fecha al guardar, donde hoy se rechaza por no tener cantidad asignada.

## Decisions

### 1. Tres modelos nuevos, sin tocar `MenuItem` ni `OrderItem`

```prisma
model LunchQuota {
  id           String   @id @default(cuid())
  menuItemId   String
  date         String   // "YYYY-MM-DD" en America/La_Paz (zonedDateKey)
  planned      Int?     // null = nadie lo programó todavía
  lowThreshold Int      @default(5)   // aviso de stock bajo, ajustable por plato/día
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  adjusts      LunchAdjust[]

  @@unique([menuItemId, date])
  @@index([date])
}

model LunchAdjust {
  id        String   @id @default(cuid())
  quotaId   String
  quota     LunchQuota @relation(fields: [quotaId], references: [id], onDelete: Cascade)
  delta     Int
  note      String?
  userId    String
  createdAt DateTime @default(now())

  @@index([quotaId])
}

model LunchHold {
  id         String   @id @default(cuid())
  menuItemId String
  date       String   // jornada del apartado
  cartId     String   // caja que tiene el plato en su ticket en curso
  quantity   Int      // unidades apartadas
  expiresAt  DateTime // vencido = unidad libre otra vez
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([menuItemId, date, cartId])
  @@index([date])
  @@index([cartId])
  @@index([expiresAt])
}
```

**Alternativas descartadas:**

- *Apartado solo en el navegador (localStorage)*: el carrito ya vive ahí, pero cada caja contaría la suya y las otras no la verían. Es exactamente el problema a resolver.
- *Reservar al cobrar y no al agregar*: la comanda se imprime al crear el pedido, así que la promesa al cliente ocurre mucho antes del cobro. Si el apartado se tomara al cobrar, dos cajas podrían tener el mismo plato en el ticket y una perdería la venta.
- *Sin vencimiento*: un cajero que cierra el POS con el plato en el ticket dejaría el almuerzo apartado para siempre, sin que nadie lo note. Con TTL de 20 min-renewable, el estado se resuelve solo.
- *Una fila por unidad*: `quantity` en la fila única por (plato, jornada, caja) hace las sumas y los saldos O(1) y evita filas huérfanas al bajar cantidades.

- *Columna `stockToday Int?` en `MenuItem`*: menos tablas, pero no guarda histórico por jornada, no admite auditoría de quién ajustó y exige un reseteo diario (proceso extra) que el modelo por fecha evita por construcción.
- *Contador que se decrementa al vender* (la forma que describen caG y caM con `currentQty`/`soldQty`): exige un punto de escritura en cada venta, se desincroniza con anulaciones, descuentos, correcciones manuales del carrito y con dos cajeros a la vez, y obliga a lógica de compensación. Al derivar, todo eso desaparece. El pago tampoco es el mejor ancla: la comanda de un pedido POS se imprime al crearlo, así que la cocina ya produciendo cuando el cobro todavía no existe.
- *`Product.isLunch` (caM)*: redundante con `category = ALMUERZO` más `enMenuDelDia`/`menuDelDiaDate`, que ya definen qué es un almuerzo del día y con qué vigencia.
- *Campo único `dailyStock` en `MenuItem` (caG)*: sin histórico ni auditoría, y con reseteo diario obligatorio.

`OrderItem` **no** se modifica: la agregación se hace por `menuItemName` (misma estrategia que ya usa `reconstructOrderItems`).

### 2. `sold` derivado, `remaining` calculado en lectura

```
sold(D, P)     = Σ OrderItem.quantity
                  WHERE menuItemName = P.name
                    AND order.status != ANULADO
                    AND día(order) = D
                        día = date(scheduledFor) si es reserva, si no date(createdAt)
held(D, P)     = Σ LunchHold.quantity
                  WHERE menuItemId = P.id AND date = D AND expiresAt > ahora
remaining(D,P) = planned + Σ LunchAdjust.delta − sold − held        (null si planned es null)
```

Y el `remaining` de una caja resta **solo los apartados ajenos**, no los suyos:

```
remaining(D,P, C) = planned + Σ delta − sold − (held − held(C))
heldByMe(D,P,C)   = held(C) = Σ LunchHold.quantity WHERE cartId = C AND vigente
```

La misma fila viaja a las dos puntas: `held` (total) y `heldByMe` (lo suyo). El admin no es una caja, así que para él `heldByMe = 0` y `remaining` descuenta todo lo apartado. Con esto el número de la tarjeta de una caja **no baja cuando el propio cajero suma líneas** (sus unidades ya son suyas) pero **baja en el acto en que otra caja se las lleva**, que es justo la información que el cajero necesita para no prometer lo que no hay. Para el cajero cuya tarjeta tiene todo lo que queda, `remaining − heldByMe = 0` y la tarjeta se marca "En tu ticket" en vez de "Agotado", porque nada se agotó: simplemente ya lo tiene todo.

En la práctica son **tres consultas por refresh**, todas en `packages/db/src/menu-day.ts`:

1. quotas + ajustes del día (para los almuerzos de hoy), agrupados en un `Map<menuItemId, {planned, delta}>`;
2. `OrderItem.findMany` de los ítems de almuerzos cuyo pedido cae en la jornada (dos ramas: `scheduledFor` del día, o `scheduledFor is null AND createdAt` del día), con `status != ANULADO`, agrupados por nombre;
3. `LunchHold.findMany` de los apartados vigentes del día, separando el total del de la caja que consulta.

De ahí salen `planned`, `sold`, `held`, `heldByMe` y `remaining` por plato, que se adjuntan a la vista de almuerzos del catálogo.

Consecuencias intencionales:

- **Anular restituye solo**: el pedido sale del filtro y el restante sube.
- **La entrega no restituye**: lo vendido se consumió al crear el pedido.
- **La reserva descuenta en su fecha pactada**.
- **No hay doble descuento posible** entre terminales: no existe un contador que dos cajeros puedan pisar.

Los límites del día se calculan como instantes UTC a partir de la clave de fecha local (`zonedDateKey()`): en `America/La_Paz` (UTC−4 fijo) la medianoche local es `04:00Z`, de modo que el filtro no depende de la zona horaria del servidor.

### 3. Creación perezosa de la cuota

`LunchQuota` se hace `upsert` la primera vez que alguien programa o ajusta un plato del día. No hay tarea diaria ni proceso en segundo plano: cada jornada empieza sin cuotas y aparece como "sin programar".

Regla de escritura (`setLunchPlanned` / `adjustLunchStock` en la app del cajero):

| Acción | Resultado |
|---|---|
| Programar N (0 ≤ N ≤ 999) | `planned = N` (reemplaza el anterior, no suma) |
| Ajustar ±d con `planned` existente | Se registra `LunchAdjust { delta: d, note?, user }` |
| Ajustar +d sin `planned` | Se crea la cuota con `planned = d` **sin fila de ajuste** (la reposición inicial *es* la base) |
| Ajustar −d sin `planned` | Se rechaza: primero hay que programar |
| Cambiar el umbral de aviso | `lowThreshold` de la cuota (1-50, por defecto 5) |

> La fila de la primera reposición se resolvió al implementar: decir a la vez
> `planned = d` y "se registra el ajuste de +d" habría contado esa unidad dos
> veces (`remaining = 2d − sold`). Como la fórmula `remaining = planned +
> Σ delta − sold` es la norma, la reposición inicial se guarda solo en `planned`
> y queda reflejada en el `createdAt`/`updatedAt` de la cuota. Toda reposición
> posterior sí genera su fila de ajuste, así que la bitácora queda completa a
> partir de la segunda corrección.

Las validaciones de rango (0-999 para la cantidad, 1-50 para el aviso) y de
pertenencia al Menú del Día de hoy viven en `packages/db/src/menu-day.ts`
(`setLunchPlannedForDay`, `adjustLunchStockForDay`, `setLunchLowThresholdForDay`,
`requireTodayMenuItem`), igual que el cálculo de lectura; las server actions del
cajero son el envoltorio que exige sesión, revalida la raíz y, en el caso del
ajuste, resuelve el usuario de la bitácora. Así la regla no depende de que se
llame desde la action.

Ambas acciones exigen sesión (`getRequiredSession`) y **verifican que el plato sea del Menú del Día de hoy** (`enMenuDelDia && menuDelDiaDate === zonedDateKey()`), rechazando cualquier otro plato o jornada. Ninguna de las dos exige rol de administrador: el requisito es que la persona tenga sesión en el cajero.

### 4. La UI: badge con el lenguaje de los atajos + popover

Nuevo componente en la app del cajero, `components/pos/lunch-stock-badge.tsx`, que reutiliza la estética del `ShortcutBadge` de la barra de categorías (`pos-category-bar.tsx:93-113`) para que el número se lea como parte del mismo sistema visual. Va en la **esquina superior derecha de la tarjeta** (caG), por encima del nombre, y el resto de la tarjeta conserva su área de clic actual.

| Estado | Badge | Tarjeta |
|---|---|---|
| Sin cantidad (`planned = null`) | `—` neutro | **Bloqueada**: gris, "SIN CANTIDAD", no agrega al carrito; el número sigue clicable |
| `remaining > lowThreshold` | Número neutro (estilo atajo) | Normal |
| `1 ≤ remaining ≤ lowThreshold` | Número **rojo fijo** (sin parpadeo) | Normal |
| `0 < remaining ≤ heldByMe` | Número neutro (lo que queda ya es suyo) | **Gris + "EN TU TICKET"**, no admite más unidades de las suyas |
| `remaining ≤ 0` | Número real (0 o negativo) en **gris** | **Gris + "AGOTADO", no agrega al carrito**; el número sigue clicable |

Una regla que se decidió mirando el mostrador: un almuerzo del día **no se vende hasta que alguien le asigna una cantidad**. Un plato recién activado por el admin aparece con guion y bloqueado, porque "no tener cantidad" y "tener 0" son el mismo problema para quien está en la caja: no se sabe si se puede vender. La diferencia es solo qué hacer para desbloquearlo (asignar la primera cantidad, o reponer). Por eso la primera suma es la que asigna la cantidad y la tarjeta se habilita en el acto.

El clic sobre el badge abre un popover (cerrable con clic fuera o `Esc`) con **una sola operación: sumar o restar unidades**. Se descartó el panel de "programación" con disponible/vendido/programado, las pestañas de modo, la nota y el campo de umbral: para el cajero era ruido y lo único que hace falta en el mostrador es corregir un número hacia arriba o hacia abajo.

| Contenido del popover | Detalle |
|---|---|
| Botones rápidos | `−10 −5 −1 \| +1 +5 +10`, con los `+` en verde y los `−` en neutro |
| Input + `−` / `+` | Se escriben las unidades y se elige restar o sumar; no hay que escribir el signo |
| Mensaje de estado | Con la tarjeta agotada, una línea que dice que sumar unidades la vuelve a habilitar |

No hay un modo "programar": la **primera suma sobre un plato sin cantidad es la que la programa** (`planned = delta`), que es exactamente la regla de la tabla de arriba. Por eso restar sin cantidad previa se rechaza con "Primero suma unidades para poder restar".

El umbral de aviso queda en el modelo (`lowThreshold`, por defecto 5) y lo usan el badge y la tabla del admin para el color, pero **el POS ya no lo edita**: la action `setLunchLowThreshold` sigue disponible como API por si más adelante se quiere exponer el ajuste (por ejemplo en el admin, que hoy es solo lectura).

El popover se posiciona midiendo el borde de la columna del catálogo —que es la que lo recorta con `overflow-hidden`—, y no el de la ventana: si no cabe abriéndose a la izquierda (primera columna) abre a la derecha, y si no cabe abajo abre hacia arriba. Sin esto el panel se metía detrás de la columna del ticket.

Al confirmar, la server action devuelve el estado recalculado (`planned`, `sold`, `remaining`) y el terminal lo aplica sobre la tarjeta de inmediato, sin esperar el próximo poll.

Tres detalles que hacen que el bloqueo sea utilizable:

1. **El bloqueo tiene respaldo en el servidor.** El `onClick` de la tarjeta se ignora cuando no hay cantidad, `remaining ≤ 0` o lo que queda ya es de esta caja, y el cursor pasa a `not-allowed`. Pero como el número en pantalla puede tener hasta 15 s de atraso, el clic **igual consulta al servidor** (`holdLunchUnits`) antes de agregar la línea: es el servidor quien decide. Si otra caja se llevó lo último entre el número que se veía y el clic, el clic se rechaza, la línea no entra al ticket y se avisa. Ese es el momento exacto en que "el primero que agarró gana", y no depende de que las dos cajas refresquen a la vez.
2. **Al guardar, el servidor vuelve a comprobar.** `createPosOrder` y `updatePosOrder` llaman `assertLunchCapacity` dentro de la misma transacción que escribe el pedido, y consumen los apartados de la caja al confirmar. Con esto se cierran los dos huecos que el clic no cubre: un apartado vencido mientras el cajero tenía la línea (otra caja tomó las unidades) y un cambio de cantidad hecho por otro camino.
3. **Rehabilitación inmediata.** Como la acción devuelve el `remaining` recalculado, el terminal mantiene un mapa local de sobreescrituras (`menuItemId → estado`) que se aplica encima del catálogo y se limpia cuando llega el próximo `router.refresh()`. Así la tarjeta se habilita en el mismo toque, sin esperar el polling de 15 s.
4. **El número bloqueado nunca es un callejón sin salida.** El badge es siempre clicable incluso con la tarjeta bloqueada, y `+1` basta para rehabilitarla: reponer si estaba agotada, asignar la cantidad si no tenía ninguna.

El identificador de caja viaja en cookie (`bbspos_pos_cart_id`, con espejo en `localStorage` como `bbspos-pos-cart-id`) porque el POS se renderiza en el servidor y el catálogo se calcula allí: el `remaining` que se pinta depende de qué caja pregunta, así que la cookie es lo que permite que `getPosCatalog` excluya los apartados propios y renueve los vigentes en el mismo refresh.

El apartado se libera por tres caminos independientes, a propósito: al quitar la línea o limpiar el ticket (acción explícita), al confirmar el pedido (los apartados se consumen) y al vencer el TTL de 20 min (si la caja desaparece). El poll de 15 s renueva solo los apartados que están a menos de 6 min de expirar, así que un ticket abierto mucho rato no pierde su cupo por tiempo abierto.

### 5. Admin en solo lectura + histórico

La tabla de Almuerzos suma cuatro columnas (**Programado**, **Vendido**, **Apartado**, **Disponible**) alimentadas por el mismo helper, para que la jefa vea el día sin entrar al POS. El apartado se muestra aparte del disponible porque "falta" y "lo tiene otra caja en el ticket" son dos cosas distintas: la primera se repone desde el número, la segunda se libera sola cuando esa caja confirme o venza. Debajo, un bloque collapsible con el **histórico por jornada** (fecha, plato, programado, vendido, apartado, disponible) para comparar qué se cocinó contra qué se vendió. La activación del Menú del Día no cambia: ni monto ni cantidad.

### 6. La venta sigue igual, con una comprobación al final

El camino de cobro, impresión y anulación **no cambia**: al derivar el consumo de los ítems, toda terminal (cajero, mesero, o las que vengan) descuenta sin código adicional. Lo único que se agrega es una comprobación al final: `assertLunchCapacity` en la misma transacción que crea o actualiza el pedido, y el consumo de los apartados de esa caja. El POS del mesero también valida al guardar, aunque no muestre contadores ni aparte nada (sin `cartId`, su `remaining` descuenta todos los apartados: solo puede vender lo que nadie tiene tomado). Así ninguna terminal puede sobrevender, pero la reserva de unidades sigue siendo responsabilidad del cajero. El POS ya refresca el catálogo cada 15 s, así que el número llega solo a los otros terminales.

## Risks / Trade-offs

- **Renombre de un plato**: la agregación es por `menuItemName`, así que las ventas históricas dejan de contar contra el nombre nuevo → el restante aparece inflado. Mitigación: los cambios habituales son de **precio** (no de nombre) y el precio no participa de esta agregación. Si los renombres se vuelven frecuentes, la evolución natural es agregar `menuItemId String?` a `OrderItem` y agrupar por id con respaldo por nombre para los pedidos históricos.
- **Lag de 15 s entre terminales**: dos cajas pueden ver el mismo número, y una untapped algo que la otra ya tenía en su ticket. Con el apartado, el daño ya no es una venta libre: el clic va al servidor y el que llegó tarde recibe el rechazo, sin que la línea entre a su ticket. El número en pantalla converge al refresco. Es el mismo compromiso de no tener canal de eventos, pero ya no deja sobrevender.
- **Apartados huérfanos**: si el navegador se borra o la caja cambia de máquina, el `cartId` se pierde y sus apartados quedan hasta que venzan (20 min). No hay limpieza a mano ni hace falta: al vencer vuelven a estar libres. Como la reserva es de a lo sumo 20 minutos, el costo real es acotado.
- **Crecimiento de `LunchQuota`/`LunchAdjust`/`LunchHold`**: una fila por plato por jornada, una por ajuste y **una por caja y plato mientras el apartado esté vivo** (se borra al cobrar, al soltar o al vencer). Con una decena de almuerzos y un par de cajas, el volumen es bajo y las filas que no se limpian están acotadas por el TTL. El histórico permite comparar programado vs. vendido.
- **Salto de jornada a medianoche**: el nuevo día arranca sin cuotas ("—") hasta que el cajero programa; el POS además oculta los almuerzos después de las 16:00 (regla de cliente ya existente), por lo que el cambio de fecha no interrumpe la venta. Los apartados llevan su propia `date`, así que los de ayer no contaminan el día nuevo.
- **Reservas para otro día**: una reserva pactada para mañana no aparta unidades de hoy (apartarlas le robaría el almuerzo de hoy a las demás cajas) y hoy se rechaza al guardar porque mañana no tiene cantidades programadas. Es una limitación consciente: el modelo por jornada con `requireTodayMenuItem` no tiene menú futuro. Levantar eso es un cambio aparte (menú y cuotas por fecha).
- **Cantidad agregada de una sola vez**: agregar 3 unidades desde el carrito aparta 3, porque el apartado sigue la cantidad de la línea. Es el comportamiento esperado y no requiere código adicional.
- **Rollout**: la UI lee campos tolerantes a `null` y la base sin cuotas se comporta como hoy, así que un despliegue parcial no rompe el POS.

## Migration Plan

1. Escribir a mano la migración SQL (`packages/db/prisma/migrations/<timestamp>_add_lunch_quota/migration.sql`) con las dos tablas de cantidad, el `@@unique([menuItemId, date])` y sus índices; aplicar con `npx prisma migrate deploy` (sin `migrate dev`).
2. Segunda migración (`<timestamp>_add_lunch_hold/migration.sql`) con la tabla de apartados, su `@@unique([menuItemId, date, cartId])` y los índices por fecha, caja y vencimiento.
3. Matar los procesos node y correr `prisma generate`.
4. Desplegar primero `@bbspos/db` + `@bbspos/types`, luego la app cajero y por último el admin. No hay backfill: la primera jornada empieza sin cuotas y sin apartados.

**Rollback**: revertir las migraciones (drop de las tres tablas) y volver al commit anterior del POS. Como el badge lee valores opcionales, el POS sigue funcionando sin cuotas.

## Open Questions

- Si la jefa necesita **programar cantidades desde el admin** (y no solo verlas), es un control adicional en la tabla de Almuerzos sobre las mismas server actions, sin tocar los specs de este cambio.
- Si el **POS del mesero** debe mostrar el contador (solo lectura o también ajuste), requiere un cambio propio de la capability `pos-terminal` para esa terminal.
