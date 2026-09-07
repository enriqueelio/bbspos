## MODIFIED Requirements

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