# Índice de Indicaciones

Referencia rápida de todos los archivos `.txt` de la carpeta `indicaciones/`.

---

## POS - Terminal de Venta

| Archivo | Descripción |
|---|---|
| `pos-actions.txt` | Server Actions para catálogo (`getPosCatalog`) y creación de pedidos (`createPosOrder`) en Prisma |
| `pos-ui-layout.txt` | Interfaz UI del terminal POS: layout pantalla dividida, carrito con Zustand, botones de categoría |
| `pos-nav-integration.txt` | Integrar pestaña `?tab=venta` en la navegación del cajero (`page.tsx`) |
| `pos-buttons-size.txt` | Ajustar clases Tailwind de botones de sabores/tamaños para tactil (h-20, grid cols-3) |
| `pos-layout-base.txt` | Layout flex base: `h-[calc(100vh-4rem)]`, panel izquierdo `flex-1`, panel derecho `w-[400px]` |
| `pos-fix-overlap.txt` | Corregir superposición del panel ticket sobre el catálogo (overflow, z-index, paddings) |
| `pos-responsive-fix.txt` | Comportamiento responsive estricto: breakpoint `md:`, `h-[50vh]` en móvil para ticket |
| `pos-mobile-scroll-fk.txt` | UX scroll táctil en móviles (botones h-14) + fix error FK Prisma al crear pedido |
| `pos-cart-persist.txt` | Persistencia del carrito en `localStorage` con Zustand |

## Cola de Pedidos

| Archivo | Descripción |
|---|---|
| `queue-age-badge.txt` | Badge de tiempo en `AgeBadge`: rojo pulsante >=10min, ámbar >=7min |
| `queue-unpaid-alert.txt` | Alerta visual "¡Falta Pagar!" (badge rojo pulsante + total en rojo) para pedidos entregados sin cobro |

## UI/UX General

| Archivo | Descripción |
|---|---|
| `theme-colors.txt` | Paleta semántica: azul=venta, verde=despacho, ámbar=cuellos de botella. Variables CSS HSL |
| `typography-contrast.txt` | Jerarquía tipográfica para tablets a 60cm: eliminar grises, text-white, font-bold/black |
| `auto-print.txt` | Impresión automática de pedidos al aceptar/recibir (importar `printText` de `lib/printing.ts`) |
| `split-payment-numpad.txt` | Reemplazar input numérico por teclado virtual en diálogo de pago dividido |

## Auth / Roles

| Archivo | Descripción |
|---|---|
| `auth-username-login.txt` | Cambiar autenticación de email a username en Prisma, NextAuth y UI de login |
| `role-mesero-rbac.txt` | RBAC: rol MESERO solo toma pedidos, no cobra. Modificar middleware, UI y server actions |
| `split-cajero-mesero-ui.txt` | Separar interfaces: Cajero (cobro, PC 19") vs Mesero (pedidos, tablet 8") |
