## 1. Datos y tipos compartidos

- [x] 1.1 Actualizar `packages/types`: enum `Role` con valores `ADMIN | CAJERO | MESERO`, helpers `hasCashierAccess`/`hasBillingAccess`
- [x] 1.2 `packages/db`: campo `role` en modelo `User` con valores `ADMIN | CAJERO | MESERO` + migración
- [x] 1.3 Actualizar seed con usuario mesero de prueba

## 2. Autenticación por username

- [x] 2.1 `apps/cajero/lib/auth.ts`: CredentialsProvider con campo `username` (case-insensitive mediante toLowerCase) + validación de `active` + roles CAJERO/ADMIN/MESERO
- [x] 2.2 `apps/admin/lib/auth.ts`: mismo cambio a login por username
- [x] 2.3 `apps/cajero/app/api/auth/[...nextauth]/route.ts`: wrapper `makeSessionOnly()` que elimina `Expires`/`Max-Age` de la cookie de sesión
- [x] 2.4 `apps/admin/app/api/auth/[...nextauth]/route.ts`: mismo wrapper de cookie de sesión
- [x] 2.5 `apps/cajero/app/actions/auth.ts`: `ensureCashierRole()` valida rol CAJERO/ADMIN/MESERO post-login
- [x] 2.6 `apps/cajero/app/login/login-form.tsx`: campo username, manejo de cuenta desactivada ("Esta cuenta está desactivada") vs credenciales inválidas
- [x] 2.7 `apps/cajero/middleware.ts`: protección de rutas con roles CAJERO/ADMIN/MESERO

## 3. Terminal POS

- [x] 3.1 Crear `apps/cajero/components/pos/pos-cart-store.ts`: store externo con `useSyncExternalStore`, persistencia en localStorage (`bubba-pos-cart`), API (add/update/remove/setCustomerName/setDeliveryType/clear)
- [x] 3.2 Crear `apps/cajero/components/pos/pos-terminal.tsx`: layout responsive de dos columnas (`flex-col lg:flex-row`)
- [x] 3.3 Selector de categorías con botones táctiles (categorías sin sabores deshabilitadas al 30% opacidad)
- [x] 3.4 Cuadrícula de sabores `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` con feedback `active:scale-95`
- [x] 3.5 Selector de tamaño y tipo de boba en cuadrícula de 2 columnas
- [x] 3.6 Selector de toppings de selección múltiple con nombre y precio
- [x] 3.7 Pre-ticket del producto en progreso con "Confirmar producto" (habilitado solo con tamaño+boba) y reset de selectores
- [x] 3.8 Ticket en curso: items con cantidad x sabor, tamaño . boba, toppings, botones +/- (h-14 w-14) y Quitar
- [x] 3.9 Área de pago: nombre del cliente (opcional), selector MESA/LLEVAR, total
- [x] 3.10 Diferenciación por rol: mesero → "Enviar a Caja" + entrega forzada MESA + permanece en POS; cajero/admin → "Enviar y Cobrar" + navega a `/?tab=preparar`

## 4. Rol MESERO

- [x] 4.1 `apps/cajero/app/page.tsx`: routing por rol — mesero siempre aterriza en `?tab=venta`, sin nav tabs; cajero/admin default a `preparar` con nav completa
- [x] 4.2 `apps/cajero/lib/session.ts`: `hasCashierAccess(role)` (CAJERO/ADMIN/MESERO) y `hasBillingAccess(role)` (CAJERO/ADMIN)
- [x] 4.3 `apps/cajero/actions/orders.ts`: `acceptOrder` rechaza rol MESERO con "No autorizado"
- [x] 4.4 `apps/cajero/components/queue-view.tsx`: flag `billing` oculta botones de cobro para MESERO (EFECTIVO/QR/cobro dividido) — muestra "Esperando pago en caja..."
- [x] 4.5 Mesero puede marcar entregados y reimprimir comandas

## 5. Modo oscuro y estilos

- [x] 5.1 `apps/cajero/app/globals.css`: variables CSS dark-only en `:root` (`--background`, `--card`, `--primary`, `--success`, `--destructive`, `--warning`)
- [x] 5.2 `apps/cajero/app/layout.tsx`: body con `bg-slate-950 text-slate-50`
- [x] 5.3 Animaciones `card-enter` (slide-up fade-in) y `glow` (pulsing blue para pedidos nuevos)
- [x] 5.4 Media print para exportar reporte a PDF

## 6. Impresión y notificaciones

- [x] 6.1 Integración de impresión térmica en flujo de cobro (comanda automática)
- [x] 6.2 `apps/cajero/actions/notifications.ts`: alertas Telegram para pedidos >10 min con mutex de `updateMany`
- [x] 6.3 `apps/cajero/actions/printing.ts`: `printDailyReport` / `reprintOrder`
- [x] 6.4 Refresh automático de cola cada 15s con pausa en pestaña oculta (`visibilitychange`)

## 7. Verificación

- [x] 7.1 Probar login por username: caracteres de username válidos, cuenta desactivada, credenciales inválidas
- [x] 7.2 Probar flujo mesero: inicia en POS, envía pedido a caja (MESA), permanece en POS, no puede cobrar
- [x] 7.3 Probar flujo cajero: inicia en cola, navega a Nueva Venta, envía y cobra, vuelve a cola
- [x] 7.4 Probar persistencia: recargar página conserva carrito; nuevo login lo limpia
- [x] 7.5 Probar cookie: cerrar navegador elimina sesión
- [x] 7.6 Probar cola: polling 15s, pedidos nuevos con glow, diferenciación de cobro por rol
- [x] 7.7 Lint/typecheck/build del monorepo y `openspec validate add-pos-terminal --strict`
