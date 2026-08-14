## Purpose

Permite al restaurante configurar un código QR de pago único (subido desde la galería del admin) y desplegarlo al cliente en la confirmación de su pedido para que pueda escanearlo y pagar.

## ADDED Requirements

### Requirement: Cargar QR de pago

El sistema SHALL permitir al personal del restaurante subir una imagen de QR de pago desde su galería y guardarla como el QR de pago activo del negocio.

#### Scenario: Subida desde la galería

- **WHEN** el admin autenticado selecciona una imagen de su galería y la confirma
- **THEN** el sistema guarda la imagen como el QR de pago activo y muestra una vista previa

#### Scenario: Archivo inválido

- **WHEN** el admin intenta subir un archivo que no es imagen o supera el tamaño límite permitido
- **THEN** el sistema rechaza la carga e informa el motivo sin modificar el QR existente

### Requirement: Reemplazar y eliminar el QR

El sistema SHALL permitir reemplazar el QR de pago activo por una imagen nueva o eliminarlo por completo.

#### Scenario: Reemplazo del QR

- **WHEN** el admin sube una imagen nueva teniendo ya un QR configurado
- **THEN** el sistema reemplaza el QR anterior por la imagen nueva

#### Scenario: Eliminación del QR

- **WHEN** el admin elimina el QR de pago activo
- **THEN** el sistema lo retira y la tienda deja de mostrarlo

### Requirement: Protección del QR

El sistema SHALL restringir la carga, el reemplazo y la eliminación del QR de pago al personal autenticado del restaurante.

#### Scenario: Acceso no autenticado

- **WHEN** un usuario no autenticado intenta modificar el QR de pago
- **THEN** el sistema rechaza la operación

#### Scenario: Consulta pública de lectura

- **WHEN** la tienda consulta el QR de pago activo para mostrarlo al cliente
- **THEN** el sistema devuelve únicamente la imagen del QR activo, sin información sensible
