# Proposal: add-server-printer-config

## Why

Hoy la comanda solo puede imprimirse desde el navegador del cliente (botón "Imprimir comanda"), lo que depende del dispositivo y la buena voluntad del cliente. El restaurante necesita que la comanda salga automáticamente por una impresora instalada en el servidor al confirmarse cada pedido, para que el personal tenga el ticket físico sin depender del cliente.

## What Changes

- Nueva pestaña **Impresora** en el panel admin: lista las impresoras instaladas en Windows del servidor (USB o red), permite elegir una, guardarla como destino de comandas e imprimir una página de prueba.
- **Impresión automática**: al confirmar un pedido en la tienda, el servidor envía la comanda en texto plano a la impresora configurada.
- **Tolerancia a fallos**: si no hay impresora configurada o la impresión falla, el pedido se crea igual; el sistema marca el pedido con un aviso para reimprimir desde admin.
- Botón **Reimprimir** en el listado de pedidos del admin y en las tarjetas de la cola del cajero.
- El botón del cliente en la pantalla de confirmación se elimina (ya no depende del navegador).

## Capabilities

### New Capabilities

- `printer-management`: Selección de la impresora de comandas instalada en el servidor, prueba de impresión y envío automático de comandas al confirmar pedidos, con reimpresión manual.

### Modified Capabilities

(ninguna — los requisitos existentes de creación de pedidos no cambian; la impresión es un efecto adicional best-effort)

## Impact

- **apps/admin**: nueva ruta `(dashboard)/printer` + API para listar impresoras (`Get-Printer` vía PowerShell), guardar selección y endpoint de impresión; botón Reimprimir en pedidos; item de navegación.
- **apps/cajero**: botón Reimprimir en las tarjetas de ambas secciones de la cola (Por cobrar / Por entregar), usando la misma infraestructura de impresión server-side.
- **apps/store**: checkout invoca impresión server-side tras crear el pedido; se retira el botón local del cliente.
- **Sin dependencias nuevas**: impresión por texto plano usando PowerShell/Out-Printer del propio Windows.
