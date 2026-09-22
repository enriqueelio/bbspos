# Proposal

## Why

El terminal POS crea automáticamente un cliente en la base de datos cada vez que se cobra un nombre que no existe (`upsertCustomerForOrder`). En hora punta (almuerzos) el cajero escribe un nombre rápido sin tiempo de registrar, lo que llena la base de clientes con duplicados de nombres sueltos, ensucia el ranking/lealtad y obliga a depurar después.

## What Changes

- **Venta "invitado" por defecto**: escribir un nombre/mesa y enviar el pedido crea la orden con `customerName` pero **sin** crear un `Customer` ni vincular `customerId` (sin lealtad ni ranking). El nombre es obligatorio igual que hoy.
- **Vincular, no crear**: el autocompletado y el vínculo por teléfono exacto siguen funcionando para clientes registrados, pero nunca crean un cliente. Un teléfono sin coincidencia ya no registra: queda como invitado.
- **Registro explícito desde el terminal**: botón "Registrar" junto al campo NOMBRE (solo cajero). Abre un formulario básico (nombre + teléfono opcional), crea el cliente en la BD y lo vincula al pedido actual acumulando lealtad.
- **Campo `nickname` (apodo) en `Customer`**: se auto-rellena con el **primer nombre** al crear el cliente (PDV o Admin) y es editable en Admin. El pedido usa como `customerName` el **apodo** (o el primer nombre de clientes existentes sin apodo), de modo que la tarjeta del pedido en curso, la cola y la comanda muestran el nombre corto ("Juan" y no "Juan Carlos Pérez"), mientras el nombre completo queda en la ficha del cliente.
- **Alcance**: solo el terminal del cajero. El mesero no cambia (sigue mandando nombre simple sin vincular).

## Capabilities

### New Capabilities
- `customer-profile`: perfil del cliente con apodo/nickname: se auto-rellena con el primer nombre al crear, editable en Admin, y es el nombre corto mostrado en pedidos/comandas de clientes vinculados.

### Modified Capabilities
- `pos-terminal`: la gestión del cliente en el terminal cambia de "crear si no existe" a "vincular si existe, vender como invitado si no, registrar solo a petición explícita", y el campo/orden usan el nombre corto (apodo/primer nombre).

## Impact

- **Esquema/BD**: `Customer.nickname String?` + migración SQL manual (Backfill de apodo: primer nombre de `name` en una sola UPDATE).
- **Server actions (cajero)**: reemplazar `upsertCustomerForOrder` por vínculo sin creación (`linkCustomerByPhone`/por nombre exacto) y nueva `registerCustomerAtPos({ name, phone? })` que crea con `nickname` prefijado.
- **Terminal cajero (`pos-terminal.tsx`)**: dropdown con opción "Registrar nuevo cliente", diálogo básico, y al seleccionar un cliente registrado completar el input con el apodo/primer nombre.
- **`CustomerSuggestion` / `getCustomerSuggestions`**: devolver `nickname` para completar el nombre corto.
- **Admin**: edición de `nickname` en el diálogo de cliente existente y columna/display del apodo.
- **Lealtad**: la acumulación actual no cambia; solo se dispara cuando hay `customerId` vinculado (invitados no acumulan).