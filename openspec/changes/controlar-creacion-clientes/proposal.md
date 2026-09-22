# Proposal

## Why

El terminal POS crea automáticamente un cliente en la base de datos cada vez que se cobra un nombre que no existe (`upsertCustomerForOrder`). En hora punta (almuerzos) el cajero escribe un nombre rápido sin tiempo de registrar, lo que llena la base de clientes con duplicados de nombres sueltos, ensucia el ranking/lealtad y obliga a depurar después.

## What Changes

- **Venta "invitado" por defecto**: escribir un nombre/mesa y enviar el pedido crea la orden con `customerName` pero **sin** crear un `Customer` ni vincular `customerId` (sin lealtad ni ranking). El nombre es obligatorio igual que hoy.
- **Vincular, no crear**: el autocompletado y el vínculo por teléfono exacto siguen funcionando para clientes registrados, pero nunca crean un cliente. Un teléfono sin coincidencia ya no registra: queda como invitado.
- **Registro explícito desde el terminal**: botón "Registrar" junto al campo NOMBRE (solo cajero). Abre un formulario básico (nombre + teléfono opcional), crea el cliente en la BD y lo vincula al pedido actual acumulando lealtad.
- **Nombre corto derivado (sin campo nuevo)**: los pedidos vinculados llegan a cola, cobro y comanda con el nombre corto calculado en el envío — **primer nombre + apellido paterno** (p. ej. "MARIA FERNANDEZ" para "Maria Fernández López") — sin tocar `queue-view.tsx` ni `printing.ts`, que ya imprimen `Order.customerName`. El nombre completo queda en la ficha del cliente. No se agrega ningún campo a la BD.
- **Alcance**: solo el terminal del cajero. El mesero no cambia (sigue mandando nombre simple sin vincular).

## Capabilities

### New Capabilities
- (ninguna; no hay nuevo perfil de cliente)

### Modified Capabilities
- `pos-terminal`: la gestión del cliente en el terminal cambia de "crear si no existe" a "vincular si existe, vender como invitado si no, registrar solo a petición explícita", y el campo/orden usan el nombre corto derivado (primer nombre + apellido paterno).

## Impact

- **Esquema/BD**: sin cambios finales. Se conservan en el historial las migraciones transitorias (add + backfill y posterior drop de una columna provisional); el estado final de `schema.prisma` y de la BD es idéntico al previo.
- **Server actions (cajero)**: reemplazar `upsertCustomerForOrder` por vínculo sin creación (`linkCustomerByText`: teléfono exacto o nombre exacto) y nueva `registerCustomerAtPos({ name, phone? })` que crea sin campos adicionales.
- **Terminal cajero (`pos-terminal.tsx`)**: dropdown con opción "Registrar nuevo cliente", diálogo básico, y al seleccionar un cliente registrado completar el input con el nombre corto calculado.
- **Tipos (`@bbspos/types`)**: `CustomerSuggestion`/`CustomerLoyaltyView` se quedan como estaban; nuevo helper `shortCustomerName` (client-safe) para el nombre corto.
- **Admin**: sin cambios (el nombre completo ya era el dato de identificación y se mantiene).
- **Lealtad**: la acumulación actual no cambia; solo se dispara cuando hay `customerId` vinculado (invitados no acumulan).