# Verificación Manual · Cajero (3002) y Admin (3001)

Checklist para recorrer las dos apps críticas de punta a punta. Sirve para dos cosas:

1. **Detectar lo que ya falla hoy**, para no atribuirlo a ningún refactor posterior.
2. **Servir de línea base funcional** contra la cual comparar el antes y el después de
   `openspec/changes/2026-09-30-descomponer-ui-gigantes`.

Anota el resultado de cada punto. Lo que importa no es solo si "funciona", sino **cómo se siente**: si hay que esperar, si el feedback es ambiguo, si un error no dice qué hacer, si algo pasa inadvertido.

---

## 0. Preparación

| Paso | Comando / acción |
|---|---|
| Levantar Admin | `scripts\dev-admin.bat` → http://localhost:3001 |
| Levantar Cajero | `scripts\dev-cajero.bat` → http://localhost:3002 |
| Log de cada uno | `%TEMP%\bbspos-admin.log` · `%TEMP%\bbspos-cajero.log` |

**Cuentras de prueba** (de `packages/db/prisma/seed.ts`):

| Usuario | Contraseña | Rol |
|---|---|---|
| `superadmin` | `admin123` | SUPER_ADMIN |
| `admin` | `admin123` | ADMIN |
| `cajero` | `cajero123` | CAJERO |
| `mesero` | `mesero123` | MESERO |

> **Ojo:** estás contra `packages/db/prisma/dev.db`, no una base descartable. La verificación manual **escribe pedidos, clientes, pagos y cierres reales** en esa base. Si necesitas una línea base limpia, copia el archivo antes de empezar.

El cajero tiene **3 pestañas** en la misma ruta (`?tab=`): **Venta** (por defecto), **Reporte** (`?tab=reporte`) y **Cierre** (`?tab=cierre`).

---

## 1. Cajero · Venta (POS terminal)

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 1.1 | Login con `cajero` / `cajero123`; la app carga en la pestaña Venta | | |
| 1.2 | Agregar bebida: tamaño → sabor → boba → toppings. El total se actualiza en cada paso | | |
| 1.3 | **El precio nunca se edita a mano.** Cambiar toppings recalcula el total sin desajustar nada | | |
| 1.4 | Variantes obligatorias: elegir un plato con variantes y **no** elegir ninguna → debe bloquear el envío con mensaje claro | | |
| 1.5 | Cambiar de categoría en la barra (`pos-category-bar`) mantiene el carrito intacto | | |
| 1.6 | **Menú del Día:** el badge de stock (`lunch-stock-badge`) muestra lo que esta caja puede **agregar**, ya descontando su propio apartado | | |
| 1.7 | **Almuerzo agotado:** intentar superar el cupo debe bloquear con un mensaje que explique el límite, no un error genérico | | |
| 1.8 | Carrito vacío + enviar → no permite enviar (debe pedir nombre/mesa primero o bloquear) | | |
| 1.9 | Enviar **sin nombre o mesa** → bloquea y resalta el campo | | |
| 1.10 | Enviar con nombre: se convierte a MAYÚSCULCAS y el nombre queda en el ticket | | |
| 1.11 | Elegir tipo de entrega: **MESA / LLEVAR / DELIVERY**. Enviar sin elegir → bloquea | | |
| 1.12 | Notas del pedido: escribir y verificar que llegan a la comanda y a la cola | | |
| 1.13 | Cliente: escribir un nombre que **no** existe y enviar → pedido como invitado, **sin** crear cliente en BD | | |
| 1.14 | Cliente: escribir parte de un nombre existente y elegirlo del autocompletado → el campo se completa con el **nombre corto** (primer nombre + apellido paterno) | | |
| 1.15 | Cliente: "Registrar" nuevo (nombre + teléfono) → crea, vincula y muestra nombre corto | | |
| 1.16 | Cliente: registrar con un teléfono que ya existe → error claro, no crea | | |
| 1.17 | Cliente: escribir un **teléfono exacto** de cliente existente → vincula automático | | |
| 1.18 | Verificar que el **número de ticket** es el `daySeq` (#001, #002...), no el `seq` global | | |
| 1.19 | **Reserva:** elegir hora futura y confirmar que la comanda **NO** se imprime todavía (se imprime al confirmar en la cola) | | |
| 1.20 | Medir: ¿cuánto tarda desde que se abre la app hasta que el POS está usable? ¿Se siente lento en una máquina de caja? | | |

---

## 2. Cajero · Cola

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 2.1 | El pedido enviado aparece en la cola con el número correcto | | |
| 2.2 | **Insignia de tiempo:** los minutos transcurridos se actualizan **solos** sin recargar la página | | |
| 2.3 | La insignia cambia de color al superar el umbral de retraso (verificar el umbral en `apps/cajero/lib/time.ts`) | | |
| 2.4 | Los grupos desplegables (mesa/para llevar/delivery) abren y cierran bien; el estado persiste al volver de otra pestaña | | |
| 2.5 | **Cambiar tipo de entrega** desde la tarjeta del pedido → se actualiza sin recargar | | |
| 2.6 | **Aceptar** un pedido RECIBIDO → pasa a la columna correcta | | |
| 2.7 | **Cobrar** un pedido ACEPTADO → abre el diálogo de cobro | | |
| 2.8 | **Entregar** un pedido cobrado → pasa a entregado | | |
| 2.9 | **Anular reserva** → pide confirmación y el pedido desaparece de la cola | | |
| 2.10 | **Confirmar reserva** → cobra e **imprime la comanda en ese momento** | | |
| 2.11 | Con muchos pedidos (10+), la cola se sigue usando bien: ¿hay scroll confuso, tarjetas cortadas, texto ilegible? | | |
| 2.12 | Dos cajas abiertas a la vez sobre la misma BD: los cambios de una se ven en la otra sin recargar manual | | |

---

## 3. Cajero · Cobro

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 3.1 | Cobro **efectivo** simple: total correcto, pedido cobrado, ticket impreso | | |
| 3.2 | Cobro **QR** | | |
| 3.3 | **Pago dividido** (`split-payment-dialog`): dos o más partes que suman el total exacto | | |
| 3.4 | Pago dividido con una parte de más o de menos → debe rechazar | | |
| 3.5 | Pago de **pensionado** (`pension-payment-dialog`): buscar cliente pensionado, cobrar | | |
| 3.6 | Cliente pensionado prepago vs postpago: verificar que cada uno cobra según su regla y que el saldo/mora se actualiza | | |
| 3.7 | Aplicar **descuento**: el total final y el impreso coinciden | | |
| 3.8 | Cliente vinculado acumula **lealtad** al cobrar (visitas, gasto, puntos) | | |
| 3.9 | Cliente invitado **no** acumula lealtad ni aparece en el ranking | | |
| 3.10 | **Anular** un pedido cobrado: el stock de almuerzos se devuelve y la lealtad se revierte (o quedadocumentado si no) | | |
| 3.11 | Impresión: la comanda sale con el nombre corto correcto (no el nombre completo) | | |
| 3.12 | ¿El cobro es rápido y sin dobles clics? (doble clic en "cobrar" no debe cobrar dos veces) | | |

---

## 4. Cajero · Reporte (`?tab=reporte`)

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 4.1 | Ver los pedidos del día con sus totales y estados | | |
| 4.2 | **Reimprimir** una comanda ya cobrada (`reprintOrder`) | | |
| 4.3 | **Imprimir** el reporte del día (`printDailyReport`) | | |
| 4.4 | Enviar el reporte al bot de Telegram (`sendDailyReportToBot`) → llega o avisa que no hay bot configurado | | |
| 4.5 | ¿El reporte cuadra con lo que cobraste realmente en el punto 3? Comparar suma por suma | | |

---

## 5. Cajero · Cierre de caja (`?tab=cierre`)

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 5.1 | Abrir el arqueo y ver el total esperado del turno | | |
| 5.2 | Ingresar el efectivo contado y ver la **diferencia** calculada | | |
| 5.3 | Confirmar el cierre con diferencia != 0 → pide observación/motivo | | |
| 5.4 | Confirmar el cierre y **no** poder reabrirlo ni editarlo después | | |
| 5.5 | Imprimir el cierre (`printCashClose`) | | |
| 5.6 | Abrir el cierre cuando **ya existe** un cierre abierto del día → avisa, no duplica | | |

---

## 6. Admin · Acceso y navegación

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 6.1 | Login con `admin` y con `superadmin`: ambos entran | | |
| 6.2 | **`cajero` / `mesero` NO deben poder entrar a Admin.** Si entran, es un fallo de seguridad crítico | | |
| 6.3 | Con la sesión de `cajero`, probar a entrar **directamente por URL** a `/reports` y a las APIs `/api/reports/*`. Si responden, es un fallo de seguridad (ver `apps/admin/middleware.ts:19` y `apps/admin/lib/reports/guard.ts`) | | |
| 6.4 | Sin sesión, todas las páginas de Admin redirigen a `/login` | | |
| 6.5 | Navegar las 9 secciones del menú lateral y volver a cargar cada una (F5) sin errores | | |
| 6.6 | Ninguna sección se queda en blanco ni con spinner infinito | | |

---

## 7. Admin · Menú (las 6 pestañas)

> Es el archivo con más riesgo del repo: 29 estados en un solo componente. Busca aquí confusiones de estado.

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 7.1 | Pestaña **Almuerzos**: listar, ver disponibilidad, activar/desactivar un plato | | |
| 7.2 | Alta de almuerzo (nombre, precio, descripción, imagen) → guardar y verificar que aparece | | |
| 7.3 | Editar un almuerzo → los cambios se reflejan | | |
| 7.4 | **Matriz de cantidades de almuerzo:** asignar cantidad programada y verificar que el cajero ve el stock actualizado | | |
| 7.5 | **Regresión clave:** llenar el formulario de alta a medias, cambiar a otra pestaña y volver → el estado se conserva y **no se mezcló** con el de la otra pestaña | | |
| 7.6 | Pestaña **Platos a la carta**: alta con **variantes de precio** obligatorias; verificar que el cajero no puede venderlo sin elegir variante | | |
| 7.7 | Categorías de carta: sandwich, panini, ensalada, piqueo, compartir, Alita, hamburguesa, milanesa, lomo, pollo, kids — comprobar que cada plato aparece bajo la suya | | |
| 7.8 | Pestaña **Bebidas**: alta de bebida y su relación con tamaño/sabor/boba | | |
| 7.9 | Pestaña **Cafetería**: panake, postre, waffle, extras | | |
| 7.10 | Pestaña **Bubas**: alta de tamaño, sabor (con sus categorías), tipo de boba, topping | | |
| 7.11 | **Matriz de precios:** editar el precio de una combinación categoría × tamaño × boba y verificar que el cajero cobra lo nuevo | | |
| 7.12 | Editar un sabor/topping ya usado en pedidos anteriores → no debe romper los pedidos viejos | | |
| 7.13 | **Imagen de producto**: subir una imagen y verla en el POS. Una imagen rota o enormouso que rompa el layout | | |
| 7.14 | Pestaña **Salsas Alitas**: alta/edición de salsa y la cantidad de salsas requeridas por plato | | |
| 7.15 | Verificar que las acciones de SUPER_ADMIN (borrar) están ocultas para `admin` | | |
| 7.16 | Buscadores: en Carta/Bebidas/Cafetería, escribir texto y filtrar | | |
| 7.17 | Guardar cada formulario dos veces rápido → no debe crear duplicados | | |

---

## 8. Admin · Pedidos

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 8.1 | Listado con los pedidos del día, número de ticket correcto | | |
| 8.2 | Filtros por estado y por rango de fechas | | |
| 8.3 | **Anular** un pedido → pide confirmación y refleja el cambio en el cajero | | |
| 8.4 | El borde rojo de "anulado" se distingue bien del resto de estados | | |
| 8.5 | Ver el detalle de un pedido: ítems, toppings, notas, cliente, método de pago | | |

---

## 9. Admin · Clientes y ranking

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 9.1 | Alta de cliente con nombre y **teléfono opcional** | | |
| 9.2 | Teléfono duplicado → error claro, no crea | | |
| 9.3 | Editar el teléfono de un cliente a uno ya usado → error claro | | |
| 9.4 | Buscar y filtrar clientes | | |
| 9.5 | **Ranking** por mes / 30 días / histórico | | |
| 9.6 | Los totales del ranking cuadran con los pedidos cobrados del período | | |
| 9.7 | Reglas de beneficio y canje de puntos | | |

---

## 10. Admin · Pagos, reportes, impresora, slideshow, usuarios

| # | Verificación | Resultado | Notas |
|---|---|:---:|---|
| 10.1 | **Pagos**: listado y cortes por método de pago | | |
| 10.2 | **Reportes** — abrir los 11: Dashboard, Diario, Rango de ventas, Horas pico, Ventas por categoría, Top productos, productos lentos, Rendimiento del personal, Ajustes, Pagos, Total del día | | |
| 10.3 | En cada reporte, cambiar el rango (hoy / 7d / 30d / mes / personalizado) y verificar que los datos cambian | | |
| 10.4 | **Impresora**: ver config, probar impresión, conectar | | |
| 10.5 | **Slideshow**: cargar, subir imagen, eliminar | | |
| 10.6 | **Usuarios**: alta, edición, cambio de rol y desactivación | | |
| 10.7 | No dejar un usuario sin rol ni activo que pueda entrar a Admin | | |

---

## 11. Sumario de hallazgos

Llena esta tabla **mientras recorres**, no al final. Es el resultado real de este ejercicio.

| # | Dónde | Qué pasa | Gravidad (alta/media/baja) | ¿Bloquea el refactor? |
|---|---|---|:---:|:---:|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |
| 10 | | | | |

### Tres distinciones que importan

- **Bug vs. autocorreccion.** Si algo falla y el error te dice exactamente que hacer y no perdiste trabajo, es una friccion tolerable. Si falla en silencio o borra lo que escribiste, es bug.
- **Bug vs. deuda de estructura.** Un formulario lento al cambiar de pestaña es fricción real, pero su raíz es `MenuManager`; se resuelve en el change de descomposición, no aquí.
- **Hallazgo de seguridad va aparte.** Los puntos 6.2 y 6.3 no son "algo que mejorar": son accesos indebidos y no deberían esperar a un refactor.
