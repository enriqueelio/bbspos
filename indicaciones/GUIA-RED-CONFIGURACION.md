# Guía de Red: Cómo configurar la IP del servidor y las tablets

Esta guía explica, paso a paso y en lenguaje simple, cómo funciona la conexión
entre el servidor (la PC donde corre Bubba), las tablets del local y la red.
No necesitas ser experto en redes: sigue los pasos en orden.

---

## Índice

1. [Conceptos básicos (en palabras simples)](#1-conceptos-básicos-en-palabras-simples)
2. [¿Cómo está configurado el sistema hoy?](#2-cómo-está-configurado-el-sistema-hoy)
3. [Lo que tienes que saber antes de tocar nada](#3-lo-que-tienes-que-saber-antes-de-tocar-nada)
4. [Opción A - La IP del servidor cambia seguido (recomendado)](#4-opción-a---la-ip-del-servidor-cambia-seguido-recomendado)
5. [Opción B - Usar un nombre fijo (bubba.local) para no tocar más la IP](#5-opción-b---usar-un-nombre-fijo-bubbalocal-para-no-tocar-más-la-ip)
6. [Configurar las tablets](#6-configurar-las-tablets)
7. [Problemas comunes y cómo resolverlos](#7-problemas-comunes-y-cómo-resolverlos)
8. [Referencia rápida de URLs](#8-referencia-rápida-de-urls)

---

## 1. Conceptos básicos (en palabras simples)

Imagina que tu sistema Bubba es un **restaurante** y las tablets son los **meseros**.
Para que un mesero encuentre la cocina, necesita saber en qué dirección está.
Lo mismo pasa en la red.

| Término | Qué significa en la práctica |
|---|---|
| **IP del servidor** | Es la dirección de la PC donde corre Bubba dentro de tu red local. Ejemplo: `192.168.1.10`. Es un **número** que puede cambiar de un día a otro. |
| **Hostname** | Es un **nombre** que le pones a esa misma PC para no tener que acordarte del número. Ejemplo: `bubba.local`. Un nombre no cambia aunque la IP cambie. |
| **DNS del router** | Es como la **agenda telefónica** de tu red: traduce el nombre (`bubba.local`) al número (`192.168.1.10`). |
| **Certificado HTTPS** | Es el **candado** que ve tu navegador para que la tablet se conecte de forma segura. Si no confía en él, te aparece una advertencia. |
| **Proxy** | Es un **portero** que recibe las visitas en la puerta del servidor y las dirige al lugar correcto. |

**La idea clave:** si las tablets usan un **nombre** (`bubba.local`) en vez de un
**número** (IP), cuando cambie la IP solo tienes que actualizar la "agenda del
router" y **no tienes que tocar las tablets**.

---

## 2. ¿Cómo está configurado el sistema hoy?

Hay una PC servidor con 4 programas (apps) que se usan en el local:

| App | Qué es | URL actual (dentro de la red) |
|---|---|---|
| **Mesero** | Tablet del salón para tomar pedidos | `https://192.168.1.10:8446` |
| **Cajero** | PC de mostrador para cobrar | `https://192.168.1.10:8445` |
| **Store** | Pantalla del cliente que arma su bebida | `https://192.168.1.10:8443` |
| **Admin** | Panel de administración | `https://192.168.1.10:8444` |

El número `192.168.1.10` es la IP actual del servidor. **Las tablets apuntan a
este número.**

Toda la configuración de red está centralizada en **un solo archivo** que está en
la raíz del proyecto:

```
server.config.json
```

Este archivo es lo **único** que necesitas tocar cuando cambie la IP.

---

## 3. Lo que tienes que saber antes de tocar nada

### 3.1 En qué PC están los archivos
Todos los pasos de esta guía se hacen en la **PC servidor** (la que tiene el
proyecto Bubba), no en las tablets. Excepción: el paso de instalar el certificado
y agregar la app a pantalla de inicio, que sí se hace en cada tablet.

### 3.2 Cómo se llama la carpeta del proyecto
Abre el Explorador de Windows y ve a:

```
C:\Users\PC-ENRIQUE\Documents\bubba
```

Todos los comandos que aparecen abajo se deben ejecutar **dentro de esta carpeta**.

### 3.3 Cómo abrir la ventana de comandos (PowerShell/CMD)
1. Abre el Explorador de Windows.
2. Ve a `C:\Users\PC-ENRIQUE\Documents\bubba`.
3. En la barra de direcciones (arriba, donde dice la ruta), escribe `cmd` y
   presiona **Enter**. Se abre una ventana negra que ya está en la carpeta correcta.

> Si ves líneas empezadas con `#` o `<!-- -->` aquí abajo, son solo **explicaciones**;
> no las copies.

---

## 4. Opción A - La IP del servidor cambia seguido (recomendado)

Esta es la situación actual y la más común si el router asigna IPs automáticas y
cambian con frecuencia. Con esta opción, **cuando cambie la IP haces 1 comando y listo.**

### 4.1 Descubrir la IP nueva del servidor

Si el servidor tiene IP nueva, primero averíguala:

1. En la PC servidor abre la ventana de comandos (paso 3.3).
2. Escribe este comando y presiona Enter:
   ```
   ipconfig
   ```
3. Busca la línea que dice:
   ```
   Dirección IPv4 . . . . . . . . . . . : 192.168.X.X
   ```
   Ese número es la IP del servidor. Anótalo.

### 4.2 Aplicar la nueva IP a todo el sistema (1 comando)

En la ventana de comandos (dentro de la carpeta `bubba`), escribe:

```
pnpm -- setup-env --host 192.168.X.X
```

**Reemplaza** `192.168.X.X` por la IP real que anotaste en el paso anterior.
Por ejemplo:

```
pnpm -- setup-env --host 192.168.1.25
```

Este comando actualiza solito todos los archivos `.env` de las apps para que
apunten a la nueva IP. **No tienes que editar nada a mano.**

Verás un mensaje como este (es normal):

```
[setup-env] server.config.json -> host="192.168.1.25"
[setup-env] apps/admin/.env -> NEXTAUTH_URL="https://192.168.1.25:8444"
[setup-env] apps/cajero/.env -> NEXTAUTH_URL="https://192.168.1.25:8445"
[setup-env] apps/mesero/.env -> NEXTAUTH_URL="https://192.168.1.25:8446"
[setup-env] Listo. Reinicia las apps de Next (pnpm dev) para aplicar el cambio.
```

### 4.3 Reiniciar las apps y el proxy

Después de aplicar la IP, hay que reiniciar para que los programas la tomen en cuenta.

**Para reiniciar las apps:** cierra la ventana donde corren los programas y vuelve
a iniciarlas con:
```
pnpm dev
```

**Para iniciar el proxy** (el portero HTTPS que usan las tablets), en otra ventana
de comandos (dentro de la carpeta `bubba`):
```
pnpm proxy
```

Verás:
```
[proxy] store: https://192.168.1.25:8443 -> http://127.0.0.1:3000
[proxy] admin: https://192.168.1.25:8444 -> http://127.0.0.1:3001
...
```

> Deja estas dos ventanas **abiertas** mientras el local esté abierto.

### 4.4 Re-loguear en las tablets

Al cambiar la IP, los que ya estaban conectados tendrán que **volver a iniciar
sesión** en la tablet (la conexión quedó guardada con la IP anterior). Es normal.

### 4.5 Importante sobre el certificado (solo si la IP NO es la de fábrica)

El certificado actual ya cubre la IP `192.168.1.10`, `bubba.local`, `localhost` y
`127.0.0.1`. Si la nueva IP es **cualquier otra** (p. ej. `192.168.1.25`), la tablet
verá la advertencia de seguridad al entrar la primera vez. Hay dos formas de evitarla:

- **Opcional (recomendado ahora):** simplemente en la tablet toca
  **Avanzado → Continuar** la primera vez. La app funcionará igual.
- **Mejor a largo plazo:** cambia a un nombre fijo (Opción B), que elimina este
  problema para siempre.

---

## 5. Opción B - Usar un nombre fijo (`bubba.local`) para no tocar más la IP

Esta es la **solución definitiva**: le pones un **nombre** al servidor
(`bubba.local`) y las tablets usan ese nombre. Cuando cambie la IP, solo
actualizas el router y **nada más**. No tienes que tocar las tablets ni los comandos.

Requiere un paso único en el router (donde está la "agenda telefónica" de tu red).

### 5.1 ¿Qué necesitas?

- Entrar al **panel del router** (el aparato que da internet/wifi).
  Normalmente se entra desde una PC escribiendo en el navegador una dirección como
  `192.168.0.1` o `192.168.1.1`. **Consulta el manual o la etiqueta del router**.
- El usuario y contraseña del router (suele venir en la etiqueta).

### 5.2 Agregar el nombre en el router (DNS local)

Dentro del panel del router, busca una sección llamada algo como:

- `DNS estático` / `Static DNS`
- `Resolución de nombres local` / `Local DNS`
- `Asignaciones de DNS` / `DNS Hosts`
- En pfSense/OpenWrt: `Services → DNS Resolver` o `DHCP & DNS → Static Leases`

Agrega una entrada:

| Campo | Valor |
|---|---|
| **Nombre / Host** | `bubba` |
| **Dominio / Sufijo** | `local` |
| **Dirección IP** | la IP actual del servidor (p. ej. `192.168.1.10`) |

> Si tu router no tiene opción de DNS local, hay un plan B en el paso 5.6.

### 5.3 Cambiar el sistema para usar el nombre

En la PC servidor, en la ventana de comandos (dentro de `bubba`), escribe:

```
pnpm -- setup-env --host bubba.local
```

### 5.4 Reiniciar apps y proxy

Igual que en la opción A (paso 4.3):

- Reinicia las apps con `pnpm dev`.
- Inicia el proxy en otra ventana con `pnpm proxy`.

### 5.5 Cambiar las tablets al nombre

En **cada tablet**, reemplaza la URL por el nombre. Abre el navegador y escribe:

| App | Nueva URL (con nombre) |
|---|---|
| Mesero | `https://bubba.local:8446` |
| Cajero | `https://bubba.local:8445` |
| Store | `https://bubba.local:8443` |
| Admin | `https://bubba.local:8444` |

Luego vuelve a **agregar la app a pantalla de inicio** (ver sección 6). La primera
vez toca **Avanzado → Continuar** por la advertencia (una sola vez).

### 5.6 Plan B si el router no tiene DNS local

Si tu router no permite agregar nombres, la alternativa es usar **el archivo hosts**
de cada dispositivo. Es un poco más de trabajo, pero funciona:

**En cada tablet (Android):**
- Descarga e instala una app como *"Hosts Go"* o edita el archivo `hosts` (requiere
  permisos de administrador/root).
- Agrega la línea:
  ```
  192.168.1.10 bubba.local
  ```
  (usa la IP del servidor).

> Si las tablets son Amazon Fire y no se pueden editar fácilmente, prioriza la
> Opción A hasta que puedas configurar el DNS del router.

---

## 6. Configurar las tablets

Estos pasos se hacen **en cada tablet una sola vez**.

### 6.1 Hacer que la tablet confíe en el certificado (quitar advertencias)

1. En la tablet abre el navegador y escribe la URL de la app (ej. la del mesero).
2. Si aparece una advertencia de seguridad, toca:
   - **Avanzado → Continuar** (Chrome/Silk), o
   - **Sí continuar** según el navegador.
3. La app cargará normalmente.
4. (Opcional, para eliminar la advertencia por completo) Instala el certificado:
   - Pídele a la persona de sistemas que te pase el archivo `rootCA.pem`, o
   - Servir el certificado desde la PC (ver abajo).
   - En Android: **Ajustes → Seguridad → Cifrado y credenciales → Instalar un
     certificado → CA**. Elige el archivo.

**Cómo servir el certificado desde la PC (opcional):**
En la PC servidor, en una ventana de comandos:
```
python -m http.server 9999 --directory "%LOCALAPPDATA%\mkcert"
```
Luego en la tablet abre en el navegador:
```
http://192.168.1.10:9999/rootCA.pem
```
(descárgalo e instálalo como se indica arriba).

> **Nota importante:** algunas versiones nuevas de Android no dejan instalar CA
> manualmente. En ese caso no pasa nada: la app funciona igual tocando
> **Continuar** la primera vez.

### 6.2 Agregar la app a la pantalla de inicio (como una app normal)

1. Con la app abierta en el navegador, toca el menú `⋮` (tres puntos verticales).
2. Toca **"Agregar a pantalla de inicio"** / **"Add to Home Screen"**.
3. Dale un nombre (ej. "Mesero") y acepta.
4. Aparecerá un acceso directo en la pantalla. Al abrirlo, se abre en pantalla
   completa (sin la barra del navegador), como una app.

### 6.3 ¿La pantalla se ve en blanco? (borrar datos viejos)

Si la app quedó en blanco (suele pasar tras un cambio de IP o de versión):

1. Ve a **Ajustes → Apps**.
2. Busca la app (ej. "Bubble Drink" o "Mesero").
3. Toca **Almacenamiento → Borrar datos** / **Borrar caché**.
4. Abre de nuevo la URL.

---

## 7. Problemas comunes y cómo resolverlos

| Problema | Causa probable | Solución |
|---|---|---|
| "No se puede acceder al sitio" / página no carga | Las apps o el proxy no están corriendo | Inicia `pnpm dev` y `pnpm proxy` (paso 4.3) y deja las ventanas abiertas |
| Advertencia de certificado | La IP cambió y el cert no la cubre (o es la primera vez) | Toca **Avanzado → Continuar**; o migra a `bubba.local` (Opción B) |
| "Nombre o mesa" no se puede escribir | La tablet quedó con datos viejos | Borra datos/caché de la app (paso 6.3) |
| El mesero no puede iniciar sesión | La IP cambió y hay que re-loguear | Vuelve a escribir usuario y contraseña (paso 4.4) |
| La tablet no encuentra `bubba.local` | Faltó el DNS en el router, o el DNS no se propagó | Verifica el paso 5.2; reinicia el router o espera unos minutos |
| Solo una tablet no conecta | Esa tablet apunta a la IP vieja | Actualiza la URL/atajo en esa tablet (paso 5.5) |
| El proxy no arranca y dice "puerto en uso" | Ya hay otro proxy corriendo | Cierra el otro proxy y vuelve a ejecutar `pnpm proxy` |
| No sé cuál es la IP del servidor | — | Ejecuta `ipconfig` y mira "Dirección IPv4" (paso 4.1) |

---

## 8. Referencia rápida de URLs

### Con IP (opción actual)
| App | URL |
|---|---|
| Mesero | `https://192.168.1.10:8446` |
| Cajero | `https://192.168.1.10:8445` |
| Store | `https://192.168.1.10:8443` |
| Admin | `https://192.168.1.10:8444` |

### Con nombre fijo (opción B, recomendada a futuro)
| App | URL |
|---|---|
| Mesero | `https://bubba.local:8446` |
| Cajero | `https://bubba.local:8445` |
| Store | `https://bubba.local:8443` |
| Admin | `https://bubba.local:8444` |

### Puertos (para no confundirse)
| Puerto | Qué es |
|---|---|
| `3000`–`3003` | Puertos internos de las apps (no los uses en las tablets) |
| `8443`–`8446` | Puertos HTTPS que usan las tablets (a través del proxy) |

---

## Resumen en 3 pasos (cuando cambie la IP)

1. Averigua la IP nueva con `ipconfig`.
2. Ejecuta `pnpm -- setup-env --host <IP_NUEVA>`.
3. Reinicia `pnpm dev` y `pnpm proxy`.

**Y si quieres dejar de preocuparte para siempre:** usa `bubba.local` (sección 5).
