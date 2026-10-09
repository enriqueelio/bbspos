# Spec Delta

## MODIFIED Requirements

### Requirement: Reporte diario (cierre de caja)

El sistema SHALL generar para un día calendario el total de ingresos, la cantidad de órdenes, el ticket promedio, las bebidas vendidas, el ingreso por toppings y el desglose por categoría, y SHALL incluir además el desglose por método de pago, el total descontado y la cantidad de anulaciones del día cuando existan esos datos. El desglose por categoría SHALL agrupar las bebidas por su sabor (categoría de bebida) y los platillos por su sección/categoría del menú, presentando las etiquetas de las categorías de la carta desde el catálogo de categorías administrable (el nombre de la categoría en español que el admin haya configurado, con la posta de los valores históricos del enum anterior para las ventas previas a la consolidación).

#### Scenario: Cierre del día actual

- **WHEN** el personal consulta el reporte diario sin especificar fecha
- **THEN** el sistema devuelve el cierre del día actual con sus totales y desgloses

#### Scenario: Día sin movimiento

- **WHEN** el personal consulta el reporte diario de un día sin órdenes
- **THEN** el sistema devuelve el reporte con valores en cero en lugar de un error

#### Scenario: Desglose por categoría de la carta

- **WHEN** el cierre diario incluye ventas de platillos de la carta
- **THEN** el desglose por categoría lista cada sección de la carta vendida (ej: MILANESA, PIQUEO) con la etiqueta gestionable de la categoría, sus unidades y su ingreso

#### Scenario: Desglose sin mezclar bebidas y platillos

- **WHEN** el cierre diario incluye tanto bebidas como platillos
- **THEN** el desglose por categoría usa para cada línea su categoría correspondiente (sabor para bebidas, sección de menú para platillos) sin agruparlos bajo un mismo nombre

#### Scenario: Desglose histórico tras consolidación

- **WHEN** el reporte incluye ventas de un periodo previo a la consolidación de `SANDWICH`/`PANINI` en `SANDWICHES`
- **THEN** el desglose etiqueta esas ventas con el nombre de `SANDWICHES` configurado en el catálogo y las muestra bajo la misma línea de la categoría

### Requirement: Ventas por categoría

El sistema SHALL comparar el desempeño de las categorías del menú dentro del periodo con unidades, ingresos, participación porcentual y ticket promedio por ítem, señalando la categoría líder, considerando únicamente las categorías del catálogo de categorías administrable (incluidas las inactivas cuando registran ventas en el periodo) y agrupando bajo una misma categoría las ventas históricas de los valores consolidados (`SANDWICH`/`PANINI` → `SANDWICHES`).

#### Scenario: Comparativa de categorías

- **WHEN** el personal consulta ventas por categoría para un rango
- **THEN** el sistema devuelve las categorías del catálogo con su participación en el ingreso total, usando la etiqueta gestionable de cada categoría

#### Scenario: Categoría desactivada con ventas en el periodo

- **WHEN** el rango consultado incluye ventas de una categoría que el admin desactivó después de venderse
- **THEN** el sistema incluye la categoría en la comparativa con su etiqueta del catálogo y señala el desempeño, sin omitir sus ventas