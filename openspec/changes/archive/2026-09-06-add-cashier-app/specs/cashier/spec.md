## Purpose

Aplicación del cajero: le muestra al personal de mostrador qué pedidos debe preparar y entregar, le permite marcar cada entrega y consultar su reporte del día con su propio rendimiento.

## ADDED Requirements

### Requirement: Inicio de sesión en la app del cajero

La aplicación del cajero SHALL autenticar mediante correo y contraseña únicamente a usuarios con rol `CAJERO` o `ADMIN`, y SHALL rechazar el acceso a usuarios sin rol válido o con credenciales inválidas.

#### Scenario: Cajero inicia sesión

- **WHEN** un usuario con rol `CAJERO` inicia sesión con credenciales correctas
- **THEN** la aplicación establece su sesión y lo lleva a la pestaña de preparación con su nombre visible

#### Scenario: Usuario sin rol permitido

- **WHEN** un usuario sin rol `CAJERO` ni `ADMIN` intenta iniciar sesión
- **THEN** la aplicación rechaza el acceso e indica que la cuenta no tiene permisos de cajero

#### Scenario: Acceso sin sesión

- **WHEN** un visitante sin sesión abre cualquier ruta de la app del cajero
- **THEN** la aplicación lo redirige al inicio de sesión

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
