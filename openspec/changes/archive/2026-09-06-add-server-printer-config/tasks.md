## 1. Infraestructura de impresión (server)

- [x] 1.1 Crear `apps/admin/lib/printing.ts` (compartible): `listPrinters()` (Get-Printer vía execFile), `printText(printerName, text)` con Out-Printer y timeout, `formatComanda(order)` en texto plano 32-42 columnas
- [x] 1.2 Configuración persistida: leer/guardar `apps/store/printing.json` con `{ printerName }` (helpers get/set)

## 2. API del panel admin

- [x] 2.1 `GET/PUT /api/printer`: listar impresoras + configuración actual; guardar selección (validar que exista en la lista)
- [x] 2.2 `POST /api/printer/test`: imprimir página de prueba a la impresora elegida y devolver resultado

## 3. UI del panel admin

- [x] 3.1 Pestaña `(dashboard)/printer`: listado con marca de predeterminada/configurada, selector, botones Guardar y Probar impresión con resultado visible
- [x] 3.2 Item "Impresora" en admin-nav.tsx
- [x] 3.3 Botón "Reimprimir" en cada pedido del listado admin (llama reimpresión y muestra resultado)

## 4. Impresión automática desde la tienda

- [x] 4.1 Checkout: tras crear el pedido, invocar server-side la impresión best-effort (sin bloquear el éxito del pedido) y eliminar el botón "Imprimir comanda" del cliente
- [x] 4.2 Acción `reprintOrder(orderId)` en admin usando formatComanda + printText
- [x] 4.3 Cajero: acción `reprintOrder(orderId)` equivalente y botón "Reimprimir" compacto en cada tarjeta de la cola (Por cobrar / Por entregar) con resultado inline

## 5. Verificación

- [x] 5.1 Listado real de impresoras del servidor visible en la pestaña; guardar selección y validar persistencia
- [x] 5.2 Página de prueba llega a papel (o error claro si está apagada)
- [x] 5.3 Pedido nuevo imprime comanda automáticamente con datos correctos; sin impresora configurada el pedido se crea igual
- [x] 5.4 Reimprimir desde pedidos funciona y respeta rechazo sin configuración
- [x] 5.5 Lint/typecheck/build del monorepo y `openspec validate add-server-printer-config --strict`
