## ADDED Requirements

### Requirement: Sección Carta en la terminal

El terminal SHALL mostrar una sección "Carta" además de la de Almuerzos, con una fila de pestañas por categoría de la carta (ej: SANDWICH, PIQUEO, MILANESA, POSTRE) y una cuadrícula de los platos disponibles de la categoría seleccionada. Cada plato SHALL mostrar su nombre, descripción y precio. Las categorías sin platos disponibles SHALL estar deshabilitadas.

#### Scenario: Tocar una categoría de la carta

- **WHEN** el usuario toca una pestaña de categoría de la carta
- **THEN** la categoría se resalta y la cuadrícula muestra los platos de la carta de esa categoría

#### Scenario: Categoría sin platos

- **WHEN** una categoría de la carta no tiene platos disponibles
- **THEN** la pestaña de categoría está deshabilitada con opacidad reducida

#### Scenario: Plato de carta con variantes

- **WHEN** el usuario toca un plato de la carta que tiene variantes (ej: Milanesa Pollo/Res)
- **THEN** aparece un selector de variante mostrando cada opción con su precio, y el botón de confirmación requiere elegir una variante antes de agregar al ticket

#### Scenario: Platos de almuerzo vs. carta

- **WHEN** el usuario revisa la sección de Almuerzos
- **THEN** la sección de Almuerzos solo muestra los platos del Menú del Día vigente y la sección de Carta solo muestra los platos de la carta, sin mezclarse