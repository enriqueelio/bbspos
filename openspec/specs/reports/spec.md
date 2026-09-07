# Reports Specification

## Purpose

Provee al personal autenticado del restaurante una suite de reportes de negocio (ventas por tiempo, desempeño por producto, categoría y personal, y auditoría de anulaciones/descuentos), con parámetros de fecha, respuestas consistentes, errores controlados y exportación CSV.

## Requirements

### Requirement: Acceso restringido al personal autenticado

El sistema SHALL restringir todos los endpoints de reportes al personal con sesión activa.

#### Scenario: Consulta sin sesión

- **WHEN** un cliente sin sesión solicita cualquier endpoint de reportes
- **THEN** el sistema responde con error de no autenticado sin exponer datos del negocio

### Requirement: Convenciones comunes de los reportes

El sistema SHALL responder todos los reportes con un envelope común (`data` y `meta` con rango consultado, momento de generación y moneda BOB en enteros), SHALL interpretar las fechas de consulta en la zona horaria local del local, y SHALL limitar todo rango de fechas a un máximo de 366 días.

#### Scenario: Rango mayor al permitido

- **WHEN** el personal consulta un reporte con un rango superior a 366 días
- **THEN** el sistema rechaza la consulta indicando que el rango excede el máximo permitido

#### Scenario: Fechas inválidas o inconsistentes

- **WHEN** el personal envía fechas malformadas o un inicio posterior al fin
- **THEN** el sistema rechaza la consulta identificando el parámetro problemático

### Requirement: Cómputo de ventas

El sistema SHALL computar los ingresos, órdenes y unidades vendidas a partir de las órdenes creadas en el rango consultado, excluyendo las órdenes anuladas, y conservando el precio capturado al momento de cada venta aunque el catálogo cambie después.

#### Scenario: Precios históricos inmutables

- **WHEN** se genera un reporte de un periodo anterior tras cambiar precios del catálogo
- **THEN** los ingresos reflejan los precios con los que se vendió cada orden

#### Scenario: Anulados fuera de las ventas

- **WHEN** existe una orden anulada dentro del rango consultado
- **THEN** ningún reporte de ventas la suma a ingresos, órdenes ni unidades

### Requirement: Reporte diario (cierre de caja)

El sistema SHALL generar para un día calendario el total de ingresos, la cantidad de órdenes, el ticket promedio, las bebidas vendidas, el ingreso por toppings y el desglose por categoría, y SHALL incluir además el desglose por método de pago, el total descontado y la cantidad de anulaciones del día cuando existan esos datos. El desglose por categoría SHALL agrupar las bebidas por su sabor (categoría de bebida) y los platillos por su sección/categoría del menú, presentando las etiquetas de las categorías de la carta en español (ej: "MILANESA" → "Milanesa").

#### Scenario: Cierre del día actual

- **WHEN** el personal consulta el reporte diario sin especificar fecha
- **THEN** el sistema devuelve el cierre del día actual con sus totales y desgloses

#### Scenario: Día sin movimiento

- **WHEN** el personal consulta el reporte diario de un día sin órdenes
- **THEN** el sistema devuelve el reporte con valores en cero en lugar de un error

#### Scenario: Desglose por categoría de la carta

- **WHEN** el cierre diario incluye ventas de platillos de la carta
- **THEN** el desglose por categoría lista cada sección de la carta vendida (ej: MILANESA, PIQUEO) con su etiqueta en español, sus unidades y su ingreso

#### Scenario: Desglose sin mezclar bebidas y platillos

- **WHEN** el cierre diario incluye tanto bebidas como platillos
- **THEN** el desglose por categoría usa para cada línea su categoría correspondiente (sabor para bebidas, sección de menú para platillos) sin agruparlos bajo un mismo nombre

### Requirement: Evolución de ventas por rango de fechas

El sistema SHALL generar una serie temporal de ventas entre dos fechas agrupada por día, semana o mes, con totales del periodo, identificación del mejor día y comparación contra el periodo anterior de igual duración.

#### Scenario: Tendencia diaria

- **WHEN** el personal consulta el rango de un mes con granularidad diaria
- **THEN** el sistema devuelve una serie con un punto por día y el resumen acumulado del periodo

#### Scenario: Mejor día de venta

- **WHEN** la serie contiene días con distinto volumen de ingreso
- **THEN** el resumen identifica el día de mayor ingreso

### Requirement: Horas pico

El sistema SHALL generar la distribución de transacciones e ingresos por hora del día (0–23) dentro de un rango consultado, identificando la hora pico y la hora más tranquila, y SHALL permitir filtrar por día de la semana.

#### Scenario: Distribución horaria

- **WHEN** el personal consulta horas pico para un rango
- **THEN** el sistema devuelve las 24 horas con su volumen, señalando la hora de mayor flujo

### Requirement: Rendimiento por cajero/mesero

El sistema SHALL reportar por usuario del personal la cantidad de órdenes procesadas, el total recaudado, el ticket promedio y su participación en el ingreso del periodo.

#### Scenario: Ranking del periodo

- **WHEN** el personal consulta el rendimiento por usuario para un rango
- **THEN** el sistema devuelve un listado ordenado por recaudación descendente

#### Scenario: Usuario desconocido

- **WHEN** el personal filtra por un usuario inexistente
- **THEN** el sistema responde que el recurso no fue encontrado

### Requirement: Auditoría de anulaciones y descuentos

El sistema SHALL registrar y reportar cada anulación de orden y cada descuento aplicado con su monto, motivo, usuario responsable y momento, permitiendo filtrar por tipo y por usuario, paginado.

#### Scenario: Listado de auditoría

- **WHEN** el personal consulta las anulaciones y descuentos de un rango
- **THEN** el sistema lista cada evento con su detalle y un resumen de montos perdidos y descontados

#### Scenario: Anulación exige motivo y responsable

- **WHEN** el personal anula una orden
- **THEN** el registro queda asociado a un motivo y al usuario de la sesión que la realizó

### Requirement: Top productos

El sistema SHALL rankear lo más vendido del periodo por cantidad y por ingresos, permitiendo agrupar por combinación completa de bebida, por sabor, tamaño, tipo de boba o topping, con un límite configurable de resultados.

#### Scenario: Ranking por sabor

- **WHEN** el personal consulta el top de productos agrupado por sabor
- **THEN** el sistema devuelve el ranking con unidades vendidas, ingreso y precio unitario promedio

### Requirement: Productos de baja rotación

El sistema SHALL identificar los productos del catálogo activo con menor o nulo movimiento en el periodo, incluyendo los combos sin ninguna venta, ordenados de menor a mayor rotación.

#### Scenario: Combos sin ventas

- **WHEN** un producto del catálogo activo no registra ventas en el periodo
- **THEN** aparece encabezando el listado de baja rotación con ventas en cero

### Requirement: Ventas por categoría

El sistema SHALL comparar el desempeño de las categorías del menú dentro del periodo con unidades, ingresos, participación porcentual y ticket promedio por ítem, señalando la categoría líder.

#### Scenario: Comparativa de categorías

- **WHEN** el personal consulta ventas por categoría para un rango
- **THEN** el sistema devuelve todas las categorías con su participación en el ingreso total

### Requirement: Resumen para el dashboard

El sistema SHALL exponer un resumen único con los indicadores del día, la comparación contra el día anterior y el acumulado de los últimos 7 días, junto con la cantidad de órdenes pendientes.

#### Scenario: Apertura del admin

- **WHEN** el personal abre el panel principal del admin
- **THEN** ve en un solo lugar los KPIs del día, la variación contra ayer y los pendientes actuales

### Requirement: Exportación CSV

El sistema SHALL exportar cualquier reporte tabular en formato CSV con encabezados en español cuando se solicite, manteniendo los errores en formato JSON.

#### Scenario: Descarga de reporte

- **WHEN** el personal solicita un reporte tabular en formato CSV
- **THEN** el sistema descarga un archivo con encabezados en español listo para hoja de cálculo

### Requirement: Endpoints dependientes de migración

El sistema SHALL responder con un error de no implementado los reportes que requieren datos aún inexistentes en el esquema mientras la migración correspondiente no haya sido aplicada.

#### Scenario: Consulta antes de la migración

- **WHEN** el personal consulta un reporte de staff o auditoría sin la migración aplicada
- **THEN** el sistema responde que la funcionalidad aún no está disponible sin fallar el resto de la suite