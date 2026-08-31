## Context

La app del cajero (`apps/cajero`) es una aplicación Next.js + TypeScript + Tailwind que usa NextAuth (JWT) para autenticación por rol. Comparte tipos y esquema Prisma con el monorepo (`@bubba/db`, `@bubba/types`, `@bubba/ui`). El estado actual incluye cola de pedidos (`queue-view.tsx`), reporte diario, impresión térmica (`lib/printing.ts`), y persistencia de impresora en `apps/store/printing.json`. Los roles actuales `ADMIN | CAJERO` se extienden para incluir `MESERO`.

## Goals / Non-Goals

**Goals:**
- Terminals POS táctil de dos columnas optimizado para velocidad en dispositivos touch.
- Rol MESERO restringido a la toma de órdenes sin acceso a cobro/reportes.
- Login por username en lugar de email en todo el monorepo.
- Cookie de sesión de navegador que expira al cerrar el navegador.
- Persistencia del carrito en localStorage.
- Tema oscuro permanente sin toggle.

**Non-Goals:**
- Toggle de modo claro/oscuro (la app es dark-only por diseño).
- Multi-sucursal/multi-caja simultánea.
- Pagos con tarjeta (solo EFECTIVO/QR, pago dividido incluido).
- App móvil nativa.

## Decisions

### Estado del carrito con `useSyncExternalStore` (sin librería de estado)

Se usa el patrón de "external store" nativo de React con `useSyncExternalStore` en lugar de Zustand/Redux. Estado mutable a nivel de módulo (`items`, `customerName`, `deliveryType`), snapshots congelados, y `Set` de listeners. Persistencia en localStorage bajo la clave `"bubba-pos-cart"`.

- **Alternativa descartada**: Zustand — agrega dependencia para un caso simple; el patrón nativo es suficiente.
- **Razón**: Evita deps extra, funciona con SSR/waterfall del layout, y simplifica el tree-shaking.

### Limpieza del carrito al montar

Un `useEffect([])` en `pos-terminal.tsx` llama `cart.clear()` al montar. Esto evita que un mesero herede el carrito de una sesión anterior persistida en localStorage.

### Rol MESERO con bloqueo a nivel de UI y servidor

La diferenciación MESERO vs CAJERO se implementa en tres capas: helpers `hasCashierAccess`/`hasBillingAccess` en `lib/session.ts`, bloques condicionales en `pos-terminal.tsx` y `queue-view.tsx` (`isBilling`/`billing` flags), y validación estricta en la server action `acceptOrder` que lanza "No autorizado" para MESERO. La validación de servidor es la capa de seguridad real; la UI solo oculta controles.

### Login por username case-insensitive

`prisma.user.findUnique({ where: { username: creds.username.toLowerCase() } })` normaliza el username a minúsculas tanto al crear como al buscar. Se elimina `email` del flujo de autenticación.

### Cookie de sesión tipo navegador

Wrapper `makeSessionOnly()` en `api/auth/[...nextauth]/route.ts` intercepta los `Set-Cookie` de NextAuth y elimina `Expires`/`Max-Age`, convirtiéndola en cookie de sesión que expira al cerrar el navegador. Esto evita que sesiones queden activas en equipos compartidos.

### Impresión térmica al cobrar

`lib/printing.ts` usa PowerShell + `System.Drawing.Printing` via ejecución (execFile) para enviar texto a impresora de 80mm. `formatComanda()` genera ticket estructurado sin acentos (ASCII-safe). Se integra en el flujo cuando el cajero confirma el pago.

### Modo oscuro con variables CSS semánticas

Un único bloque `:root` en `globals.css` define la paleta oscura (`--background`, `--foreground`, `--card`, `--primary`, `--success`, `--destructive`, `--warning`) con valores HSL. Los componentes usan clases Tailwind dark explícitas (`bg-slate-950`, `text-white`) sin variantes `dark:` — no hay toggle de tema.

### Alertas Telegram para pedidos retardados

`actions/notifications.ts` detecta pedidos con >10 min de espera y envía alerta vía bot de Telegram. Usa `updateMany` atómico con flag `delayNotified: false` como mutex para evitar alertas duplicadas en múltiples tabs.

### Routing por role en `page.tsx`

`isMesero` define el tab default (`"venta"` para mesero, `"preparar"` para cajero/admin) y oculta la navegación para meseros. El mesero es redirigido forzosamente a `/?tab=venta`.

## Risks / Trade-offs

- [Tema oscuro permanente] → Si en el futuro se requiere modo claro, la refactorización a variables `.dark` será costosa porque los componentes usan clases Tailwind hardcodeadas. Mitigación: las variables CSS ya son semánticas, solo falta refactorizar clases.
- [Limpieza del carrito al montar] → Un mesero que quiere continuar un carrito anterior no puede. Mitigación: es el comportamiento deseado (un carrito pertenece a la sesión de un cliente, no a largo plazo).
- [Cookie de navegador] → Si el cajero cierra el navegador accidentalmente pierde la sesión. Mitigación: el usuario solo re-ingresa credenciales; el costo es bajo.
- [Email ya no se autentica] → Usuarios existentes acostumbrados a email podrían fallar. Mitigación: el username es un campo distinto del email; se debe migrar/proveer username a todos los usuarios.
- [Impresión best-effort] → Si la impresora está desconectada el pedido no se bloquea. Decisión deliberada para no perder ventas.
