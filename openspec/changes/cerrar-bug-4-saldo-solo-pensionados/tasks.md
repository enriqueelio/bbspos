# Tasks

## 1. Guard del abono (server)

- [x] 1.1 `addCustomerFunds` rechaza el abono cuando `customer.isPension` es falso, antes de la transacción y antes de calcular el tipo de movimiento, con un mensaje que diga que hay que marcarlo como pensionado primero. Verificar que el rechazo no modifica `balance` ni crea filas en `CustomerLedger`
- [x] 1.2 Confirmar que la rama `PAGO_DEUDA` sigue decidiéndose por `isPension` antes que por `pensionType` (no se toca, de `ee4bb84`): verificar con un pensionado POSTPAGO con deuda que el movimiento sale `PAGO_DEUDA` y con un PREPAGO que sale `RECARGA`

## 2. Guard del desmarcado (server)

- [x] 2.1 `updateCustomer` rechaza `isPension: false` cuando el cliente tiene `balance > 0`, con un mensaje que explique que el saldo a favor se gasta en el mostrador. Verificar que el resto de los campos del guardado (nombre, CI, teléfono) tampoco se escriben cuando se rechaza
- [x] 2.2 `updateCustomer` rechaza `isPension: false` cuando el cliente tiene `balance < 0`, con un mensaje propio que explique que la deuda se cobra en el mostrador. Verificar el rechazo con el POSTPAGO de -290 Bs de `dev.db`
- [x] 2.3 Confirmar que guardar un cliente de mostrador con `balance = 0` sigue funcionando sin cambios. Verificar editando nombre o teléfono de un cliente no pensionado

## 3. UI del admin

- [x] 3.1 El botón de recarga/abono de la tabla solo se renderiza para clientes pensionados. Verificar en `/customers` que un mostrador muestra Editar y Movimientos pero no el botón de abono
- [x] 3.2 La ayuda del toggle "Es pensionado" del formulario menciona que un saldo obliga a mantener la cuenta marcada. Verificar el texto en el diálogo de alta y de edición
- [x] 3.3 `FundDialog` deja de decidir el título por `pensionType` y lo hace por `isPension`, ya que solo se abre para pensionados. Verificar que un PREPAGO muestra "Recargar saldo" y un POSTPAGO "Pagar deuda"

## 4. Auditoría del invariante

- [x] 4.1 `packages/db/scripts/verify-cuenta-solo-pensionados.ts`: script de solo lectura que lista clientes no pensionados con `balance != 0`, no pensionados con movimientos en `CustomerLedger`, y pensionados PREPAGO con `creditLimit > 0`. Registrar el script en `packages/db/package.json` como `verify:cuenta`
- [x] 4.2 Correr el script sobre `dev.db` y confirmar que las tres consultas salen vacías (hoy: 3 mostradores con saldo 0, 1 POSTPAGO con -290, cero recargas en el libro). La salida debe distinguir "todo bien" de "encontré N casos" para que sirva sobre la base real

## 5. Verificación

- [x] 5.1 Prueba runtime contra `dev.db` con un pensionado PREPAGO temporal: bonificar 1.000 Bs, comprobar saldo 1.000, cobrar a cuenta un pedido de 120 Bs, comprobar saldo 880 y que el pedido suma visita, gasto y puntos; borrar el cliente y sus pedidos al terminar y confirmar que no quedan clientes de prueba
- [x] 5.2 Confirmar que el consumo a cuenta no aparece como ingreso de caja: el `RECONSUMO` del pensionado temporal no debe sumar a `rechargeCash`/`rechargeQr` del día, y la recarga inicial sí
- [x] 5.3 `corepack pnpm -r typecheck`
- [x] 5.4 `corepack pnpm -r lint`
- [x] 5.5 `openspec.cmd validate cerrar-bug-4-saldo-solo-pensionados --strict`

## 6. Documentos

- [x] 6.1 Actualizar la sección BUG-4 de `INFORME-CLIENTES-PENSIONADOS.txt`: de "parcialmente mitigado, decisión de negocio pendiente" a resuelto, con las dos puertas cerradas y el dato de que no había plata atrapada en `dev.db`
- [x] 6.2 Anotar en `PROPUESTA-CONSOLIDADA-PENSIONADOS.txt` que BUG-4 se cerró con la regla "el saldo a favor es exclusivo del pensionado", que difiere de la propuesta original de los documentos de entrada (que pedían bloquear el abono; aquí además se cierra el desmarcado)