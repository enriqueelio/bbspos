# Cashier Specification

## Purpose

Aplicación del cajero: le muestra al personal de mostrador qué pedidos debe preparar y entregar, le permite marcar cada entrega y consultar su reporte del día con su propio rendimiento.

## Requirements

### Requirement: Inicio de sesión en la app del cajero

La aplicación del cajero SHALL autenticar mediante **username** (campo de texto) y contraseña, únicamente a usuarios con rol `CAJERO`, `ADMIN` o `MESERO`, y SHALL rechazar el acceso a usuarios sin rol válido o con credenciales inválidas. El sistema SHALL diferenciar entre credenciales inválidas y cuenta desactivada.

#### Scenario: Cajero inicia sesión

- **WHEN** un usuario con rol `CAJERO` inicia sesión con username y contraseña correctos
- **THEN** la aplicación establece su sesión y lo lleva a la pestaña de preparación con su nombre visible

#### Scenario: Mesero inicia sesión

- **WHEN** un usuario con rol `MESERO` inicia sesión con username y contraseña correctos
- **THEN** la aplicación establece su sesión y lo redirige al terminal POS (pestaña "Nueva Venta")

#### Scenario: Usuario sin rol permitido

- **WHEN** un usuario sin rol `CAJERO`, `ADMIN` ni `MESERO` intenta iniciar sesión
- **THEN** la aplicación rechaza el acceso e indica que la cuenta no tiene permisos de cajero

#### Scenario: Cuenta desactivada

- **WHEN** un usuario con cuenta desactivada ingresa credenciales correctas
- **THEN** la aplicación muestra "Esta cuenta está desactivada" en lugar de "Credenciales inválidas"

#### Scenario: Acceso sin sesión

- **WHEN** un visitante sin sesión abre cualquier ruta de la app del cajero
- **THEN** la aplicación lo redirige al inicio de sesión

#### Scenario: Cookie de sesión de navegador

- **WHEN** el usuario cierra el navegador
- **THEN** la cookie de sesión se elimina automáticamente (sin `Expires` ni `Max-Age`)

### Requirement: Cola de preparación

La app del cajero SHALL mostrar en su pestaña principal todos los pedidos en estado `INGRESADO` del día, ordenados del más antiguo al más reciente, con el número de pedido, nombre del cliente si existe, hora de ingreso, antigüedad transcurrida, bebidas con su configuración completa, toppings, cantidades y total.

#### Scenario: Cola con pedidos pendientes

- **WHEN** el cajero abre la pestaña de preparación y existen pedidos en estado `INGRESADO`
- **THEN** ve la lista ordenada del más antiguo al más reciente con el detalle completo de cada pedido

#### Scenario: Cola vacía

- **WHEN** no existen pedidos en estado `INGRESADO`
- **THEN** la app muestra un estado vacío indicando que no hay pedidos por preparar

### Requirement: Marcar pedido como entregado

La app del cajero SHALL permitir marcar un pedido en estado `INGRESADO` como entregado mediante una acción explícita de confirmación; al confirmar, el sistema registra el momento exacto de la entrega en `deliveredAt`, atribuye el pedido al usuario cajero conectado y avanza el estado a `ENTREGADO`.

#### Scenario: Entrega confirmada

- **WHEN** el cajero confirma la entrega de un pedido en estado `INGRESADO`
- **THEN** el sistema registra `deliveredAt`, asigna su usuario como responsable, cambia el estado a `ENTREGADO` y el pedido sale de la cola

#### Scenario: La entrega no es reversible desde la app del cajero

- **WHEN** un pedido ya está en estado `ENTREGADO`
- **THEN** la app del cajero no ofrece ninguna acción para modificarlo

### Requirement: Actualización de la cola

La app del cajero SHALL reflejar los cambios recientes de la cola (nuevos pedidos ingresados y entregas propias) sin requerir una recarga manual completa de la aplicación.

#### Scenario: Entra un pedido nuevo mientras se trabaja

- **WHEN** un cliente confirma un pedido estando la cola abierta
- **THEN** el pedido nuevo aparece en la cola con su hora de ingreso sin que el cajero recargue la página

### Requirement: Reporte del día del cajero

La app del cajero SHALL mostrar en una segunda pestaña el resumen del día en curso en zona horaria local: ingresos totales, número de pedidos entregados, ticket promedio, tiempo promedio de entrega y desglose por método de pago, calculados solo sobre pedidos entregados del día.

#### Scenario: Resumen con actividad

- **WHEN** el cajero abre la pestaña de reporte habiendo pedidos entregados hoy
- **THEN** ve sus KPIs del día incluyendo el tiempo promedio de entrega calculado desde el ingreso hasta `deliveredAt`

#### Scenario: Día sin actividad

- **WHEN** no hay pedidos entregados en el día en curso
- **THEN** la pestaña muestra el resumen en ceros y el tiempo promedio como sin datos

### Requirement: Rendimiento exclusivo del propio usuario

El reporte de la app del cajero SHALL limitar las métricas de rendimiento (pedidos entregados y tiempo promedio de entrega) a los pedidos atribuidos al usuario autenticado, sin exponer datos de otros cajeros.

#### Scenario: Solo pedidos propios

- **WHEN** el cajero consulta su pestaña de reporte
- **THEN** las métricas de rendimiento corresponden únicamente a los pedidos que él mismo entregó

### Requirement: Pantalla objetivo del módulo de cajero

El módulo de cajero SHALL estar optimizado para el monitor de escritorio del local: panel de **19"**, relación de aspecto **16:10**, resolución **1440×900 px** (densidad ≈ 89 PPI), área útil de aproximadamente **409 × 256 mm**. El layout SHALL ser fluido (sin anchos fijos al límite), con el ticket de cobro en la columna izquierda (~30–35 % ≈ 430–505 px) y la cola de pedidos/gestión en la derecha (~65–70 % ≈ 935–1005 px); la interfaz SHALL conservar compatibilidad con resoluciones menores, como mínimo 1280×1024 (5:4).

#### Scenario: Sala del cajero a 1440×900

- **WHEN** el cajero usa la terminal en el monitor 16:10 de 1440×900
- **THEN** la interfaz aprovecha todo el ancho sin scroll horizontal, con el ticket fijo a la izquierda y la cola a la derecha

#### Scenario: Reducción a 1280×1024

- **WHEN** la terminal se usa en un monitor 5:4 de 1280×1024
- **THEN** la interfaz se redimensiona fluidamente conservando la misma estructura de dos columnas sin desbordes