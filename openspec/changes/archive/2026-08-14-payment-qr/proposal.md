## Why

El negocio cobra mediante un código QR de pago (p. ej. QR Simple) que el cliente debe escanear. Hoy el sistema no guarda ni muestra ese QR, por lo que el cliente termina su pedido sin saber dónde pagar. Se necesita que el administrador cargue una vez el QR desde su galería y que este se despliegue al cliente cuando completa su pedido.

## What Changes

- **Nuevo** Capacidad de pago: el admin sube una imagen de QR de pago desde la galería (un solo QR activo), puede previsualizarlo, reemplazarlo o eliminarlo desde una nueva página "Pagos" del panel.
- El QR se persiste en la base de datos compartida como imagen en base64 con su tipo MIME (sin archivos estáticos), de modo que el admin lo escribe y la tienda lo lee.
- La pantalla de confirmación del pedido (tras crear el pedido) muestra el QR de pago junto al número de orden, si hay un QR configurado; si no lo hay, la pantalla se comporta como hoy.
- Validaciones de carga: solo imágenes, tamaño límite (p. ej. ≤ 2 MB), contenido obligatorio.

## Capabilities

### New Capabilities

- `payment`: gestión del QR de pago en el admin (subir, previsualizar, reemplazar, eliminar) y despliegue del QR al cliente en la confirmación del pedido.

### Modified Capabilities

- `ordering`: al crear un pedido, la pantalla de confirmación muestra el QR de pago configurado junto al número de orden.

## Impact

- `packages/db`: `schema.prisma` con modelo de configuración de pago (QR en base64 + mime), nueva migración.
- `apps/admin`: acciones de servidor protegidas (subir/eliminar/obtener QR), nueva página `/payments`, enlace en la navegación.
- `apps/store`: pantalla de confirmación del pedido muestra el QR; acción de servidor para obtenerlo.
- `packages/types`: tipos compartidos para la configuración de pago.
