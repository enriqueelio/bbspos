## 1. Base de datos

- [x] 1.1 Agregar el modelo `PaymentConfig` (id fijo `"default"`, `qrImage` base64, `mimeType`, `updatedAt`) a `packages/db/prisma/schema.prisma`.
- [x] 1.2 Generar y aplicar la migración sobre la BD local (`migrate diff` + `migrate deploy` si `migrate dev` falla).

## 2. Admin (apps/admin)

- [x] 2.1 Crear server actions protegidas `savePaymentQr` (valida `image/*` y ≤ 2 MB, upsert en id fijo) y `removePaymentQr`.
- [x] 2.2 Crear la página `/payments` (cliente): input de archivo (`accept="image/*"`), vista previa del QR, botones Guardar y Eliminar, y manejo de errores.
- [x] 2.3 Agregar enlace "Pagos" en la navegación del admin.

## 3. Store (apps/store)

- [x] 3.1 Crear server action pública `getPaymentQr` que devuelve el QR activo o `null`.
- [x] 3.2 Mostrar el QR en la pantalla de confirmación del pedido (`/cart` tras crear el pedido), junto al número de orden; sin QR configurado, mantener la pantalla actual.

## 4. Verificación

- [x] 4.1 Ejecutar `pnpm typecheck`, `pnpm lint` y `pnpm build` desde la raíz y dejar todo en verde.
- [x] 4.2 Smoke test: subir un QR desde el admin (página Pagos), crear un pedido en la tienda y verificar que la confirmación muestra el QR; verificar también el caso sin QR configurado.
