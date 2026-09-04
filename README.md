# Bubba Drinks

Monorepo de la tienda de bubble drinks "Bubba": una app de clientes para armar y pedir bebidas y un panel admin para gestionar el catálogo y los pedidos.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Apps**: Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **Paquetes compartidos**: `@bbspos/config`, `@bbspos/types`, `@bbspos/db`, `@bbspos/ui`
- **Base de datos**: Prisma (SQLite en desarrollo, configurable a Postgres)

## Estructura

```
apps/
  store/    App de clientes (http://localhost:3000)
  admin/    Panel admin (http://localhost:3001)
  cajero/   Pantalla del cajero (http://localhost:3002)
  mesero/   Toma de pedidos del salón (http://localhost:3003)
packages/
  config/   tsconfigs y preset de Tailwind compartidos
  types/    Tipos de dominio y helpers de precio
  db/       Prisma: schema, migraciones y seed
  ui/       Componentes compartidos (configurador, carrito, UI base)
```

## Requisitos

- Node.js >= 20.9
- pnpm >= 9 (`npm.cmd install -g pnpm`)

## Puesta en marcha

```bash
pnpm install          # instala todos los workspaces
pnpm db:migrate       # aplica las migraciones
pnpm db:seed          # siembra catálogo + usuarios (admin, cajero y mesero)
pnpm dev              # arranca store (3000), admin (3001), cajero (3002) y mesero (3003)
```

- **Store**: http://localhost:3000
- **Admin**: http://localhost:3001 — login: `admin@bubba.mx` / `admin123` (rol ADMIN)
- **Cajero**: http://localhost:3002 — login: `cajero@bubba.mx` / `cajero123` (rol CAJERO)
- **Mesero**: http://localhost:3003 — login: `mesero` / `mesero123` (rol MESERO)

## Scripts raíz

| Comando            | Descripción                                |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Arranca las tres apps en desarrollo        |
| `pnpm build`       | Compila todos los workspaces               |
| `pnpm lint`        | ESLint en todos los workspaces             |
| `pnpm typecheck`   | Verificación de tipos en todos los workspaces |
| `pnpm db:migrate`  | Aplica migraciones de Prisma               |
| `pnpm db:seed`     | Siembra catálogo y usuarios                |
| `pnpm db:generate` | Regenera el cliente de Prisma              |
| `pnpm setup-env`   | Regenera los `NEXTAUTH_URL` de las apps según `server.config.json` |
| `pnpm proxy`       | Arranca el proxy HTTPS multicapa (tablets) según `server.config.json` |

## IP del servidor variable

Las apps (admin, cajero, mesero) usan `NEXTAUTH_URL` con la IP del servidor y las
tablets acceden a través de un proxy HTTPS. Si la IP del servidor cambia
frecuentemente, **NO edites cada `.env` a mano**: la configuración está centralizada
en un único archivo `server.config.json` en la raíz:

```json
{
  "host": "192.168.1.10",
  "https": { "store": 8443, "admin": 8444, "cajero": 8445, "mesero": 8446 },
  "http":  { "store": 3000,  "admin": 3001, "cajero": 3002, "mesero": 3003 }
}
```

### Cuando cambie la IP del servidor

1. Edita `server.config.json` y pon el nuevo valor en `host` (o usa la CLI).
2. Aplica el cambio a todos los `.env` de las apps:
   ```bash
   pnpm setup-env
   # o forzar una IP directamente:
   pnpm -- setup-env --host 192.168.1.25
   ```
3. Reinicia las apps de Next (el `.env` se lee al arrancar) y reinicia el proxy:
   ```bash
   pnpm proxy
   ```

### Certificados TLS

El proxy y las apps sirven HTTPS con certificados emitidos con mkcert. El
certificado guardado en `scripts/https-proxy/` tiene SAN (Subject Alternative Name)
que ya cubre **`bubba.local`**, `localhost`, `127.0.0.1` y `192.168.1.10`. Esto
significa que el mismo certificado sirve tanto para la IP actual de las tablets
como para el hostname `bubba.local`.

Si el host cambia a otro valor o a un hostname, coloca unos certificados
`<host>+2.pem` / `<host>+2-key.pem` en `scripts/https-proxy/` (y en la raíz para el
proxy manual). Si no existen, se usará el certificado `192.168.1.10` como fallback.

### Migrar a hostname fijo (`bubba.local`) — para que la IP pueda cambiar libremente

Hoy las tablets acceden por la IP `192.168.1.10`. Para que un cambio de IP no
obligue a tocar las tablets, migra al hostname `bubba.local` (ya cubierto por el
certificado SAN):

1. En el **router/DNS** (pfSense, OpenWrt, etc.) agrega la resolución
   `bubba.local → <IP del servidor>`. Si cambia la IP, solo hay que actualizar aquí.
2. En `server.config.json` cambia `host` a `"bubba.local"`:
   ```bash
   pnpm -- setup-env --host bubba.local
   ```
3. Reinicia las apps de Next y el proxy:
   ```bash
   pnpm dev
   pnpm proxy
   ```
4. En las tablets, migra los accesos directos/URLs a `https://bubba.local:8446`
   (mesero), `:8445` (cajero), `:8443` (store), `:8444` (admin).
   *Nota: al cambiar el dominio, los usuarios tendrán que re-loguearse (la cookie
   de sesión queda ligada al dominio anterior).*

> Con `bubba.local` resuelto por DNS, un cambio de IP solo implica actualizar el
> registro DNS del router: las tablets, el proxy y los certificados siguen igual.

## Funcionalidades

**Store**
- Landing con el catálogo vigente.
- Configurador en 3 pasos: tamaño → sabor (leche/agua/especiales) → boba, con precio en tiempo real.
- Carrito persistente (localStorage) con cantidades ajustables y checkout que crea el pedido.

**Admin**
- Login por credenciales (Auth.js) y rutas protegidas (solo rol ADMIN).
- Dashboard con métricas de pedidos del día y reportes.
- CRUD de tamaños, sabores y tipos de boba.
- Gestión de pedidos: filtro por estado, cobro, descuentos, anulación y entrega.

**Cajero**
- Login exclusivo para personal de mostrador (rol CAJERO o ADMIN).
- Cola de preparación con antigüedad y botón "Marcar entregado" (registra el tiempo de entrega).
- Reporte del día con KPIs, tiempo promedio de entrega y rendimiento propio.

## Base de datos

La configuración de Prisma vive en `packages/db/prisma/` (`schema.prisma`, `.env` con `DATABASE_URL`). En producción apunta `DATABASE_URL` a Postgres y ejecuta `pnpm db:migrate` como paso del deploy.

## Deploy

Docker:

```bash
docker compose up --build
```

Expone store en `:3000` y admin en `:3001` y persiste la base SQLite en un volumen.
