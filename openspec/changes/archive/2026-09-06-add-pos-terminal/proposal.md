## Why

La app del cajero actual solo ofrece una vista de cola de pedidos. Para operar en un restaurante real se necesita un terminal POS que permita a meseros tomar órdenes directamente desde una tableta o dispositivo táctil, con una interfaz optimizada para velocidad y facilidad de uso. El cajero necesita una experiencia de cobro optimizada con botones grandes y layout de dos columnas para ver la cola mientras cobra.

## What Changes

- **Nuevo componente `PosTerminal`**: Terminal POS de dos columnas con layout responsive — columna izquierda (selector de categorías, sabores, tamales, tipo de boba, toppings) y columna derecha (ticket en curso con cantidades, nombre del cliente, tipo de entrega MESA/LLEVAR, y botón de envío).
- **Rol MESERO**: Nuevo rol diferenciado de CAJERO — el mesero solo puede tomar órdenes (enviar a caja), no puede cobrar ni ver la cola/reportes. El cajero/admin mantiene acceso completo.
- **Login por username**: Cambio de email a username como identificador de autenticación en todo el monorepo (admin + cajero).
- **Persistencia del carrito**: Store externo con `useSyncExternalStore` que persiste en localStorage — el carrito sobrevive recargas de página pero se limpia al montar el componente para evitar estados heredados.
- **Modo oscuro permanente**: La app del cajero opera exclusivamente en modo oscuro con variables CSS semánticas para contraste óptimo en terminals POS.
- **Impresión al cobrar**: Integración de impresora térmica en el flujo de cobro — la comanda se imprime automáticamente al confirmar el pago.
- **Alto contraste en POS/cola**: Mejoras de accesibilidad visual con botones táctiles de 56px, animaciones de feedback y glow para pedidos nuevos.
- **Tipos de entrega MESA/LLEVAR**: Selector de tipo de entrega en el terminal POS — el mesero siempre envía como MESA, el cajero puede elegir.
- **Nombre del cliente**: Campo opcional de nombre del cliente en el terminal POS para identificar pedidos.
- **Alertas de Telegram**: Notificaciones automáticas para pedidos con más de 10 minutos de espera.
- **Refresh automático de cola**: Polling cada 15 segundos con pausa cuando la pestaña está oculta.

## Capabilities

### New Capabilities

- `pos-terminal`: Terminal POS táctil de dos columnas para toma de órdenes — selector de productos (categoría/sabor/tamaño/boba/toppings), ticket en curso, envío de pedido con tipo de entrega MESA/LLEVAR, persistencia del carrito, y diferenciación por rol (mesero vs cajero).
- `mesero-role`: Rol MESERO con permisos restringidos — solo puede tomar órdenes a través del terminal POS, no puede cobrar, ver reportes, ni navegar entre pestañas. Envía pedidos a caja con tipo forzado a MESA.
- `pos-auth`: Autenticación por username en lugar de email en apps admin y cajero — login simplificado con campo de usuario, validación de角色, y cookie de sesión de navegador.

### Modified Capabilities

- `cashier`: Modificaciones al comportamiento del cajero — nuevo rol MESERO con permisos restringidos, login por username, modo oscuro permanente, impresión integrada, y diferenciación de UI por角色.

## Impact

- **apps/cajero**: Nuevos componentes `PosTerminal`, `pos-cart-store`; modificación de `page.tsx` para routing por角色; cambios en `queue-view.tsx` para diferenciar UI por角色; login por username.
- **apps/admin**: Login por username en `api/auth/[...nextauth]/route.ts`.
- **packages/types**: Nuevo enum `Role` con valores `ADMIN | CAJERO | MESERO`.
- **packages/db**: Campo `role` en modelo `User` con valores `ADMIN | CAJERO | MESERO`.
- **CSS/Theme**: Variables CSS dark-only en `globals.css` del cajero, sin toggle de tema.
- **Printing**: Integración de impresora térmica en flujo de cobro del cajero.
- **Telegram**: Sistema de alertas para pedidos retardados (>10 min).
