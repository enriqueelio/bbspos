# Proposal: add-aceptado-order-state

## Why

En mostrador el flujo real es: el cliente paga, su comanda se imprime, se acerca al cajero y le muestra la comanda; el cajero pregunta si paga con QR o efectivo y registra el pago en el sistema. Hoy el modelo de dos estados (`INGRESADO` → `ENTREGADO`) mezcla "recibido en caja" con "pagado": el cajero no puede registrar el método de pago como un paso propio y el salto directo a entregado permite entregar sin registrar ningún pago.

## What Changes

- Nueva secuencia de **tres estados**: `RECIBIDO` (comanda impresa esperando en caja) → `ACEPTADO` (pago registrado por el cajero) → `ENTREGADO` (bebidas entregadas); `ANULADO` se mantiene como estado terminal.
- Nuevo requisito de **registro de pago**: aceptar un pedido exige seleccionar **Efectivo** o **QR**; queda registrado quién y cuándo lo aceptó.
- Transición obligatoria: ningún pedido puede entregarse sin pasar por `ACEPTADO`; no hay retrocesos ni saltos.
- Renombrado `INGRESADO` → `RECIBIDO` en schema, tipos y UI; migración con remapeo de datos existentes.
- Actualización del panel admin (filtros, botones por estado) y de la app del cajero (cola separada en "por cobrar" y "por entregar").

## Capabilities

### Modified Capabilities

- `ordering`: El requisito "Estados de pedido" pasa de la secuencia antigua a `RECIBIDO → ACEPTADO → ENTREGADO` con pago obligatorio; se agrega el requisito "Registro de pago del pedido" con métodos Efectivo y QR.

## Impact

- **packages/db**: migración — valor de enum `ACEPTADO`, renombrado `INGRESADO`→`RECIBIDO` con UPDATE de datos, columna `paidAt`.
- **packages/types**: `OrderStatus`, secuencia, labels y opciones de pago para aceptación.
- **apps/admin**: acciones (`acceptOrder` reemplaza el pago directo, `deliverOrder` exige `ACEPTADO`), filtros/botones de pedidos, contador del dashboard.
- **apps/cajero**: cola dividida en "Por cobrar" (RECIBIDO, botones Efectivo/QR) y "Por entregar" (ACEPTADO, botón Entregar); reporte diario sin cambios.
- **apps/store**: sin cambios visibles (el estado inicial pasa a llamarse RECIBIDO).
