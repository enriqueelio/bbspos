# Spec Delta

## Purpose

Gestiona las cuentas corrientes de los pensionados: creación vinculada a un cliente, recargas de saldo (Prepago), pagos de deuda (Postpago), límites de crédito, consulta de movimientos (ledger) y validación de saldos para el cobro a cuenta en el POS.

## ADDED Requirements

### Requirement: CustomerAccount creation linked to Customer
El sistema SHALL permitir crear una `CustomerAccount` vinculada a un `Customer` existente, definiendo `pensionType` (PREPAGO o POSTPAGO) y `creditLimit` (solo aplica a POSTPAGO, 0 = sin límite). La cuenta nace con `balance = 0`. Solo los clientes con `CustomerAccount` son pensionados y aparecen en el cobro a cuenta del cajero.

#### Scenario: Create account for existing customer
- **WHEN** admin ejecuta `createPensionado` o `convertToPensionado` con `customerId`, `pensionType` y `creditLimit` opcional
- **THEN** se crea `CustomerAccount` con `customerId` único, `balance = 0`, y los parámetros dados

#### Scenario: Reject duplicate account
- **WHEN** se intenta crear `CustomerAccount` para un `customerId` que ya tiene una
- **THEN** el sistema rechaza con error claro

### Requirement: Fund customer account (recarga o pago de deuda)
El sistema SHALL permitir abonar a la cuenta de un pensionado: "Recargar Saldo" si `pensionType = PREPAGO` (incrementa balance hacia positivo) o "Pagar Deuda" si `pensionType = POSTPAGO` (incrementa balance hacia cero desde negativo). El monto debe ser entero positivo en Bs. El medio de pago debe ser EFECTIVO o QR (dinero real de caja). Se registra en `CustomerLedger` con tipo `RECARGA` o `PAGO_DEUDA` respectivamente, y el balance se actualiza atómicamente en la misma transacción.

#### Scenario: Recarga Prepago
- **WHEN** admin registra abono de 100 Bs EFECTIVO a pensionado PREPAGO con balance 0
- **THEN** balance = 100, ledger entry `RECARGA` 100 EFECTIVO

#### Scenario: Pago Deuda Postpago
- **WHEN** admin registra pago de 50 Bs QR a pensionado POSTPAGO con balance -120
- **THEN** balance = -70, ledger entry `PAGO_DEUDA` 50 QR

#### Scenario: Reject fund non-pensionado
- **WHEN** se intenta abonar a cliente sin `CustomerAccount`
- **THEN** error: "Cliente no es pensionado y no tiene cuenta corriente"

#### Scenario: Reject invalid payment method
- **WHEN** se intenta abonar con TARJETA o PENSION
- **THEN** error: "El abono debe registrarse en Efectivo o QR"

### Requirement: Credit limit enforcement for Postpago
El sistema SHALL validar que el consumo a cuenta de un pensionado POSTPAGO no haga que `balance` (negativo = deuda) supere `creditLimit` en valor absoluto, salvo que `creditLimit = 0` (sin límite). Al cobrar a cuenta en el POS, si el nuevo balance excede el límite, la operación SHALL ser rechazada con mensaje claro indicando el límite y el saldo disponible.

#### Scenario: Consumo dentro del límite
- **WHEN** pensionado POSTPAGO con `creditLimit = 500`, `balance = -200` hace consumo de 100
- **THEN** nuevo balance = -300 (|-300| <= 500), operación permitida

#### Scenario: Consumo excede límite
- **WHEN** pensionado POSTPAGO con `creditLimit = 500`, `balance = -450` hace consumo de 100
- **THEN** error: "Límite de crédito excedido. Disponible: 50 Bs"

#### Scenario: Sin límite (creditLimit = 0)
- **WHEN** pensionado POSTPAGO con `creditLimit = 0` hace cualquier consumo
- **THEN** operación permitida sin validación de límite

### Requirement: Ledger query for account movements
El sistema SHALL permitir consultar el historial de movimientos de una `CustomerAccount` ordenado descendente por fecha, mostrando tipo (`RECARGA`, `PAGO_DEUDA`, `CONSUMO`), monto, medio de pago (si aplica), referencia a pedido (si `CONSUMO`), y fecha/hora local `America/La_Paz`.

#### Scenario: View ledger
- **WHEN** admin abre "Movimientos" de un pensionado
- **THEN** lista entradas con tipo, monto formateado, medio, pedido, fecha

### Requirement: Remove pensionado status (close account)
El sistema SHALL permitir desmarcar un cliente como pensionado (borrar su `CustomerAccount`) SOLO si `balance = 0`. Si `balance > 0` (saldo a favor) o `balance < 0` (deuda), SHALL rechazar con mensaje explicando que el saldo/deuda debe estar en cero. Al borrar, la cascada elimina su `CustomerLedger`.

#### Scenario: Remove with zero balance
- **WHEN** admin desmarca pensionado con `balance = 0`
- **THEN** `CustomerAccount` y `CustomerLedger` eliminados, cliente queda solo como identidad + fidelidad

#### Scenario: Reject remove with positive balance
- **WHEN** admin intenta desmarcar pensionado con `balance = 150`
- **THEN** error: "Tiene 150 Bs de saldo a favor que se gasta en mostrador. Llévelo a cero antes de desmarcar"

#### Scenario: Reject remove with negative balance
- **WHEN** admin intenta desmarcar pensionado con `balance = -80`
- **THEN** error: "Debe 80 Bs que se cobra en mostrador. Saldar deuda antes de desmarcar"

### Requirement: Admin UI for pensionados management
El admin SHALL tener una ruta dedicada `/pensionados` con tabla que muestre: Nombre, Teléfono, Modalidad (badge Prepago/Postpago), Saldo (verde a favor / rojo deuda), Límite (solo Postpago, "Sin límite" si 0), y acciones: Editar, Recargar Saldo / Pagar Deuda, Movimientos. La ruta `/customers` NO muestra columnas financieras ni pensionados.

#### Scenario: Navigate to pensionados
- **WHEN** admin hace click en "Pensionados" en sidebar
- **THEN** carga `/pensionados` con tabla de cuentas corrientes

#### Scenario: Customers table excludes financial columns
- **WHEN** admin está en `/customers`
- **THEN** columnas: Nombre, CI, Tel, Visitas, Gasto, Puntos, Última visita, Acciones (Editar, Lealtad, Convertir en pensionado)