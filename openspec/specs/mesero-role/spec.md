# Mesero Role Specification

## Purpose

Rol MESERO con permisos restringidos en la app del cajero — solo puede tomar órdenes a través del terminal POS, no puede cobrar, ver reportes, ni navegar entre pestañas. Los pedidos que tome se envían a caja con tipo de entrega forzado a MESA.

## Requirements

### Requirement: Acceso restringido a terminal POS

El rol MESERO SHALL tener acceso exclusivo al terminal POS (pestaña "Nueva Venta") y no SHALL poder navegar a otras pestañas de la aplicación.

#### Scenario: Mesero accede a la app

- **WHEN** un usuario con rol MESERO inicia sesión en la app del cajero
- **THEN** es redirigido directamente al terminal POS y no ve navegación para otras pestañas

#### Scenario: Mesero intenta navegar a otra pestaña

- **WHEN** un usuario con rol MESERO intenta acceder a `/cajero/?tab=preparar` o `/cajero/?tab=reporte`
- **THEN** el sistema lo redirige al terminal POS (`/?tab=venta`)

### Requirement: No puede registrar pagos

El rol MESERO SHALL estar bloqueado para realizar operaciones de cobro — no SHALL poder aceptar pagos (EFECTIVO/QR), realizar cobros divididos, ni marcar pedidos como pagados.

#### Scenario: Mesero intenta aceptar pago

- **WHEN** un usuario con rol MESERO intenta ejecutar la acción `acceptOrder`
- **THEN** el sistema rechaza la operación con un mensaje de error "No autorizado"

#### Scenario: UI de cobro no visible para mesero

- **WHEN** el mesero ve la cola de pedidos
- **THEN** los botones de cobro (EFECTIVO/QR/Cobro dividido) no están visibles — solo ve "Esperando pago en caja..."

### Requirement: Tipo de entrega forzado a MESA

El rol MESERO SHALL enviar todos los pedidos con tipo de entrega "MESA" — el selector de tipo de entrega SHALL estar deshabilitado en su interfaz.

#### Scenario: Mesero envía pedido

- **WHEN** el mesero confirma un pedido en el terminal POS
- **THEN** el tipo de entrega se establece automáticamente como "MESA" sin importar la selección del usuario

### Requirement: Post-envío permanece en POS

Después de enviar un pedido, el rol MESERO SHALL permanecer en el terminal POS para tomar otro pedido, sin ser redirigido a la cola de preparación.

#### Scenario: Mesero envía pedido y continúa

- **WHEN** el mesero envía un pedido exitosamente
- **THEN** el terminal POS se resetea para un nuevo pedido y el mesero permanece en la misma pantalla

### Requirement: Puede marcar entregados

El rol MESERO SHALL poder marcar pedidos en estado ACEPTADO como entregados, igual que el cajero.

#### Scenario: Mesero entrega pedido

- **WHEN** un pedido está en estado ACEPTADO y el mesero toca "Marcar entregado"
- **THEN** el sistema registra `deliveredAt`, atribuye el pedido al mesero, cambia el estado a ENTREGADO y el pedido sale de la cola

### Requirement: Puede reimprimir comanda

El rol MESERO SHALL poder reimprimir comandas de pedidos existentes desde la cola.

#### Scenario: Mesero reimprime comanda

- **WHEN** el mesero toca "Reimprimir" en un pedido de la cola
- **THEN** el sistema envía la comanda a la impresora térmica configurada