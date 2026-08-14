## Context

Ver proposal.md - Why. Los dos apps (`apps/store` y `apps/admin`) comparten la misma base de datos SQLite vía Prisma en `packages/db`. Hoy no existe ningún mecanismo para que el cliente pague: el QR de pago debe configurarse una vez desde el admin y mostrarse en la confirmación del pedido en la tienda. Restricciones relevantes: sin hosting de archivos estáticos compartido entre apps, imagen única activa, escritura solo admin y lectura pública en la tienda.

## Goals / Non-Goals

**Goals:**
- El admin sube un QR de pago (imagen) desde su galería, lo previsualiza, lo reemplaza o lo elimina.
- La tienda muestra el QR de pago en la pantalla de confirmación del pedido cuando está configurado.
- Persistencia en la BD compartida para que ambos apps la consuman sin archivos estáticos.

**Non-Goals:**
- Múltiples QR simultáneos por método de pago o por monto.
- Validación de que el QR sea realmente un código QR (solo validación de tipo y tamaño de imagen).
- Procesamiento del pago (el pago se realiza fuera del sistema, escaneando el QR).

## Decisions

1. **Almacenamiento en BD como base64 en lugar de archivos estáticos** — Ambos apps son procesos Next.js separados; un `public/uploads` en el admin no sería servido por la tienda sin un volumen compartido o un endpoint. La BD SQLite ya es compartida, así que se guarda el QR como cadena base64 (data URL) en una tabla de una sola fila. Alternativas descartadas: carpeta compartida en el monorepo (frágil en dev y en contenedores), servicio externo (infraestructura innecesaria).

2. **Modelo `PaymentConfig` de fila única** — `id` fijo (`"default"`), campos `qrImage` (data URL base64), `mimeType` y `updatedAt`. Un `upsert` sobre el id fijo simplifica reemplazar/eliminar. Alternativa descartada: tabla clave-valor genérica (menos legible y sin tipado claro).

3. **Subida vía server action con `FormData`** — El cliente envía el archivo como `File` en un server action; el servidor valida que el MIME empiece por `image/` y que el tamaño no supere 2 MB, y lo codifica a base64. Se evita subir a disco y el servidor es la única autoridad de validación y de sesión (`getRequiredSession`).

4. **Lectura pública mediante server action dedicada** — `getPaymentQr()` devuelve el data URL activo o `null`, sin exponer otros datos. La página de carrito (cliente) la invoca al llegar a la pantalla de confirmación y renderiza la imagen.

5. **UI admin en página `/payments`** — Input de archivo (`accept="image/*"`), vista previa con el data URL y botones Guardar/Eliminar. Enlace en la navegación lateral del admin.

## Risks / Trade-offs

- [La BD SQLite crece con la imagen] → Límite de 2 MB por archivo y reemplazo de una sola fila; crecimiento acotado.
- [Base64 aumenta ~33 % el tamaño] → Aceptable para una imagen pequeña de QR (decenas de KB típicamente).
- [Un usuario malicioso podría cargar un HTML disfrazado de imagen] → Validación de MIME y renderizado de la imagen solo como `data:image/*` (los datos provienen de la BD, no de input directo en la tienda).

## Migration Plan

Migración Prisma que crea la tabla `PaymentConfig` y se aplica con `prisma migrate deploy`. Rollback: eliminar la tabla; no hay datos críticos asociados.
