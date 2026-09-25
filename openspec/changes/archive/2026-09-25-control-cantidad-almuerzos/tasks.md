# Tasks

## 1. Base de datos

- [x] 1.1 Escribir a mano la migración SQL en `packages/db/prisma/migrations/<timestamp>_add_lunch_quota/migration.sql` con las tablas `LunchQuota` (menuItemId, date, planned nullable, lowThreshold con default 5, timestamps, unique `[menuItemId, date]`, índice por date) y `LunchAdjust` (quotaId, delta, note nullable, userId, createdAt, cascade, índice por quotaId), y verificar el archivo con el patrón de las migraciones previas
- [x] 1.2 Aplicar la migración con `npx prisma migrate deploy` y verificar que ambas tablas y sus índices existen en `dev.db`
- [x] 1.3 Reflejar los dos modelos en `packages/db/prisma/schema.prisma` y verificar que `npx prisma generate` completa sin error (con los procesos node detenidos, por EPERM en `query_engine-windows.dll.node`)

## 2. Cálculo de cantidades

- [x] 2.1 Agregar a `packages/types` el estado de cantidad en la vista de platos del menú del día (`planned`, `sold`, `remaining` con `remaining` null cuando no hay cantidad programada, más el umbral de aviso) y verificar con `pnpm --filter @bbspos/types typecheck`
- [x] 2.2 Implementar en `packages/db/src/menu-day.ts` el cálculo del día: cuotas + ajustes agrupados por plato y vendidos agregados desde `OrderItem` de pedidos no anulados, con los límites del día calculados en `America/La_Paz` (reservas por `scheduledFor`, resto por `createdAt`), y verificar con un caso de prueba: un pedido de 3 unidades de un almuerzo del día descuenta 3
- [x] 2.3 Adjuntar ese estado a los almuerzos del día que expone el catálogo y verificar que `getPosCatalog` de la app cajero lo entrega con los platos sin programar en `null`

## 3. Server actions del cajero

- [x] 3.1 Implementar `setLunchPlanned(menuItemId, planned)`: exige sesión, valida que el plato sea del Menú del Día de hoy, valida el rango 0-999, hace upsert de la cuota, revalida la raíz y **devuelve el estado recalculado** (`planned`, `sold`, `remaining`)
- [x] 3.2 Implementar `adjustLunchStock(menuItemId, delta, note?)`: exige sesión, valida el plato del día, registra el ajuste con usuario y nota, inicializa `planned` cuando el delta es positivo y aún no hay cantidad, rechaza el delta negativo sin cantidad programada y **devuelve el estado recalculado**
- [x] 3.3 Implementar el cambio del umbral de aviso por plato y jornada (rango 1-50, por defecto 5) y verificar que el badge y la tabla del admin usan el umbral configurado y no el valor fijo
- [x] 3.4 Verificar los rechazos invocando las acciones: plato de la carta, plato de otro día, plato inexistente y delta negativo sin programar (deben fallar con mensaje y sin escribir nada)

## 4. Contador y popover en el POS

- [x] 4.1 Crear el componente del contador con los estados (guion sin cantidad, número neutro, rojo al llegar a las cinco unidades, número real en gris con la tarjeta agotada, y número neutro con la tarjeta "en tu ticket" cuando lo que queda ya es de esta caja) tomando la estética del badge de atajos de la barra de categorías, y verificar los estados en el navegador (verificado en el navegador: guion sin cantidad, número neutro, "pocas unidades" al llegar al umbral, agotado y "en tu ticket")
- [x] 4.2 Crear el popover con una sola operación, sumar y restar: los pasos rápidos `−10 −5 −1 | +1 +5 +10`, un input de unidades con botones de restar y sumar, el mensaje de agotado y el cierre con clic fuera o `Esc`; verificar que nunca queda tapado por el panel del ticket y que ajustar no agrega unidades al ticket (verificado en el navegador: el popover cae siempre dentro de la ventana, no se solapa con el panel del ticket ni queda nada pintado encima, y ajustar no suma líneas)
- [x] 4.3 Integrar el contador en la esquina superior derecha de las tarjetas de la grilla de almuerzos del día, con el número siempre clicable y el resto de la tarjeta bloqueada mientras no tenga cantidad asignada, ya no quede ninguna, o lo que quede ya esté en el ticket de esa caja (gris, marca de "sin cantidad", "agotado" o "en tu ticket" según el caso, `cursor-not-allowed`, sin agregar al carrito)
- [x] 4.4 Aplicar sobre la tarjeta el estado que devuelven las acciones mediante un mapa local de sobreescrituras, para que una reposición rehabilite la tarjeta en el mismo toque y el valor se limpie en el próximo refresco del catálogo
- [x] 4.5 Recorrer el flujo en el POS: un plato recién activado aparece bloqueado "sin cantidad", sumar 40 lo habilita, vender varias y ver el número bajar y ponerse rojo al llegar a cinco, llegar a cero (tarjeta bloqueada, el clic no agrega), sumar +5 desde el número (la tarjeta se rehabilita al instante) y volver a agotar (recorrido completo en el navegador con 20 asignadas en dos pasos de +10)
- [x] 4.6 Verificar con dos cajas abiertas: la caja A aparta al agregar y su número no baja; la caja B ve el número de A ya descontado; si las dos chocan por la última unidad, el clic de la que llegó tarde se rechaza con aviso y la línea no entra al ticket; y con todo lo que queda en el ticket de A su tarjeta queda "en tu ticket" y vuelve a habilitarse al liberar una línea (dos cajas reales en el navegador: A=20 sin bajar, B=17 por polling, choque por la última unidad rechazado con aviso sin agregar la línea, "en tu ticket" y vuelve a habilitarse al liberar una línea)

## 5. Apartado de cupo (el primero que agarró gana)

- [x] 5.1 Escribir a mano la migración SQL `<timestamp>_add_lunch_hold/migration.sql` con la tabla `LunchHold` (menuItemId, date, cartId, quantity, expiresAt, timestamps, unique `[menuItemId, date, cartId]`, índices por date, cartId y expiresAt), aplicarla con `npx prisma migrate deploy` y reflejarla en el schema con `prisma generate`
- [x] 5.2 Implementar en `packages/db/src/lunch-holds.ts` el ciclo de vida del apartado: `acquireLunchHold` (rechaza si no alcanza, contando solo el apartado **vigente** de la caja), `releaseLunchHold`, `releaseCartLunchHolds`, `touchCartLunchHolds` (renueva solo lo que está por vencer), `reconcileCartLunchHolds` (suelta lo que sobra, repide lo que falta y devuelve lo perdido) y `consumeCartLunchHolds`
- [x] 5.3 Exponer `held` y `heldByMe` en el cálculo de lectura: el `remaining` de una caja descuenta solo los apartados ajenos y el del admin los descuenta todos, con `heldByMe = 0` para el admin
- [x] 5.4 Propagar la caja al POS con un `cartId` persistente (`localStorage` + cookie espejo), y usarlo en `getPosCatalog` para excluir los apartados propios y renovar los vigentes en cada refresco
- [x] 5.5 Mover el cupo junto con la línea: al agregar desde la tarjeta y al subir la cantidad en el panel del ticket se aparta antes de confirmar la línea (y si falla, la línea no entra y se avisa); al bajar la cantidad, al quitar la línea y al limpiar el ticket se suelta
- [x] 5.6 Reconciliar al abrir el POS y al cargar una reserva para editar (esas líneas entran al carrito sin pasar por la tarjeta), y no apartar nada cuando el ticket es una reserva para otra fecha
- [x] 5.7 Cerrar la puerta de atrás: `assertLunchCapacity` dentro de la transacción de `createPosOrder`/`updatePosOrder` (excluyendo el pedido que se edita) y consumo de los apartados al confirmar, con `LunchCapacityError` para que la interfaz lo muestre como aviso de cantidad y no como error técnico
- [x] 5.8 Cubrir con una prueba automática los casos: primera caja aparta y la segunda ve el número bajado, choque por la última unidad, el total nunca supera lo programado, una caja con todo en su ticket no puede pedir más, quitar la línea libera, cobrar convierte el apartado en venta, un apartado vencido se libera y su dueño puede volver a apartar, y el rechazo del servidor sin apartado en la mano

## 6. Admin en solo lectura

- [x] 6.1 Agregar a la tabla de Almuerzos del admin las columnas de solo lectura Programado, Vendido, Apartado y Disponible del día, alimentadas por el cálculo del punto 2
- [x] 6.2 Agregar el bloque collapsible de histórico por jornada (fecha, plato, programado, vendido, apartado, disponible) y verificar con dos jornadas de datos que la comparación programado vs vendido cuadra con los pedidos del día
- [x] 6.3 Verificar en el admin que un plato no programado muestra guion, que las cifras coinciden con el POS (incluido el apartado de otra caja abierta) y que activar un almuerzo del día no pide monto ni cantidad (verificado en el navegador: guion en PROG./VEND./APART./DISPONIB. de los platos no programados, cifras de hoy idénticas a las del POS con los apartados de la otra caja, y "Activar" es una acción directa que no pide nada)

## 7. Verificación final

- [x] 7.1 Correr `corepack pnpm -r typecheck` y `corepack pnpm -r lint` y dejarlos en verde
- [x] 7.2 Verificar que una reserva descuenta en su fecha pactada y no en el día de creación, y que anular ese pedido restituye la cantidad de esa fecha
- [x] 7.3 Verificar que el POS del mesero y la tienda pública siguen funcionando sin cambios (el mesero no muestra contadores ni aparta, pero valida el cupo al guardar) y que el catálogo de la tienda no expone cantidades
- [x] 7.4 Verificar en el navegador el flujo completo de dos cajas: agregar en A, ver el número en B, quitar la línea en A y verlo volver a subir en B, y que el pedido con un apartado vencido se rechaza con el aviso de que otra caja lo tomó (recorrido automatizado con dos cajas reales en Chromium: 44/44 verificaciones)
