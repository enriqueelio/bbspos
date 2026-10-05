# Spec Delta

## MODIFIED Requirements

### Requirement: Creación de pedido desde el carrito

El sistema SHALL permitir crear un pedido con los ítems del carrito, pudiendo ser cada ítem una bebida (con su configuración: categoría, sabor, tamaño y tipo de boba, y sus toppings con precio capturado) o un platillo del menú (con su nombre, sección/categoría, su precio fijo capturado y, cuando aplique, su variante con el precio de la variante capturado), persistiendo en cada caso la cantidad, el precio unitario capturado y el total del pedido en bolivianos. El pedido SHALL aceptar además indicaciones especiales opcionales del cliente. **Si el método de pago es PENSION, el pedido SHALL persistir `accountId` referenciando la `CustomerAccount` del pensionado, y el sistema SHALL validar que la cuenta exista y, si es POSTPAGO, que el consumo no exceda el `creditLimit`.**

#### Scenario: Pedido creado con pago PENSION (nuevo)
- **WHEN** el cajero crea un pedido seleccionando "Cuenta Pensionado" y eligiendo un pensionado
- **THEN** el pedido se crea con `paymentMethod = PENSION`, `accountId` = `CustomerAccount.id` del pensionado, y el `balance` de la cuenta se actualiza atómicamente (incrementa deuda en Postpago, reduce saldo en Prepago)

#### Scenario: Pedido PENSION rechazado por límite de crédito Postpago
- **WHEN** el cajero intenta crear un pedido PENSION para un pensionado POSTpago cuyo consumo excedería su `creditLimit`
- **THEN** el sistema rechaza la creación con error "Límite de crédito excedido. Disponible: X Bs" y no crea el pedido

#### Scenario: Pedido creado correctamente (existente)
- **WHEN** el cliente confirma el checkout con al menos un ítem en el carrito
- **THEN** el sistema crea el pedido con sus ítems (bebidas y/o platillos), el total calculado y un estado inicial, y vacía el carrito

#### Scenario: Checkout con carrito vacío (existente)
- **WHEN** el cliente intenta confirmar el checkout sin ítems en el carrito
- **THEN** el sistema rechaza la creación del pedido e informa que el carrito está vacío

#### Scenario: El pedido es inmutable en sus precios (existente)
- **WHEN** el catálogo cambia de precios después de creado un pedido
- **THEN** el pedido conserva los precios unitarios que tenía al momento de su creación, tanto para bebidas como para platillos

#### Scenario: Línea de platillo persistida en el pedido (existente)
- **WHEN** el carrito incluye un platillo del Menú del Día o de la carta
- **THEN** el ítem del pedido persiste el nombre del platillo, su sección/categoría, el precio fijo capturado y la cantidad, y se muestra correctamente en la comanda y en el listado de pedidos

#### Scenario: Línea de platillo con variante persistida (existente)
- **WHEN** el carrito incluye un platillo de la carta con variante elegida (ej: Milanesa de Res)
- **THEN** el ítem del pedido persiste además el nombre de la variante y el precio de la variante capturado al momento de la venta

#### Scenario: Pedido con indicaciones especiales (existente)
- **WHEN** el cliente envía el pedido con indicaciones especiales escritas
- **THEN** el pedido persiste las indicaciones y estas se muestran en la comanda y en la tarjeta expandida de la cola

### Requirement: Registro de pago del pedido

El sistema SHALL permitir al cajero aceptar un pedido en estado `RECIBIDO` registrando el método de pago elegido por el cliente, únicamente **Efectivo** o **QR**, junto con la fecha de pago y el usuario responsable; el pedido pasa a `ACEPTADO`. El cajero puede registrar un pago simple (un método) o un pago dividido (dos métodos con montos explícitos que sumen el total). **Los pedidos con `paymentMethod = PENSION` se crean directamente en `ACEPTADO` (ya "pagados" a cuenta) y llevan `accountId`; no pasan por esta acción de aceptación posterior.**

#### Scenario: Aceptación con Efectivo (existente)
- **WHEN** el cajero registra el pago de un pedido recibido seleccionando Efectivo
- **THEN** el pedido pasa a `ACEPTADO` con método Efectivo, fecha de pago y responsable registrados

#### Scenario: Aceptación con QR (existente)
- **WHEN** el cajero registra el pago de un pedido recibido seleccionando QR
- **THEN** el pedido pasa a `ACEPTADO` con método QR, fecha de pago y responsable registrados

#### Scenario: Pago dividido (existente)
- **WHEN** el cajero acepta un pedido usando la opción de cobro dividido, indicando dos métodos distintos y montos que sumen el total
- **THEN** el sistema registra ambos métodos de pago con sus montos y marca el pedido como ACEPTADO

#### Scenario: Aceptación exige método (existente)
- **WHEN** el cajero intenta aceptar un pedido sin seleccionar un método de pago válido
- **THEN** el sistema rechaza la operación

#### Scenario: Pago dividido con montos inválidos (existente)
- **WHEN** el cajero intenta registrar un pago dividido pero los montos no suman el total, los métodos son iguales, o alguno es cero
- **THEN** el sistema rechaza la operación y muestra un mensaje de error descriptivo

#### Scenario: Pedido PENSION ya nace ACEPTADO (nuevo)
- **WHEN** se crea un pedido con `paymentMethod = PENSION` y `accountId` válido
- **THEN** el pedido se crea directamente con `status = ACEPTADO`, `paidAt = now()`, y `accountId` referenciando la `CustomerAccount`