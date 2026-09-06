## Purpose

Define el catálogo de platos del restaurante con una sección dedicada a "Almuerzos" y precios fijos, la bandera de Menú del Día con vigencia por jornada (auto-reset diario) y su visibilidad destacada en las terminales de mesero y cajero.

## ADDED Requirements

### Requirement: Gestión de platos con sección y precio fijo

El sistema SHALL mantener un catálogo de platos, cada uno con nombre, sección/categoría (por defecto `ALMUERZO`), precio fijo en bolivianos y disponibilidad, y SHALL permitir al admin crear, editar, activar/desactivar y eliminar platos desde la gestión del menú.

#### Scenario: Admin crea un plato

- **WHEN** el admin crea un plato con nombre, categoría y precio fijo
- **THEN** el plato queda disponible en el catálogo con ese precio, listo para ofrecerse en las terminales

#### Scenario: Admin inhabilita un plato

- **WHEN** el admin marca un plato como no disponible
- **THEN** el plato deja de ofrecerse en las terminales, aunque conserve su Menú del Día

#### Scenario: Precio fijo del plato

- **WHEN** una terminal ofrece un plato
- **THEN** el precio del plato es el definido en su registro, sin depender de matriz de precios ni modificadores

### Requirement: Menú del Día por jornada con auto-reset diario

El sistema SHALL mantener una bandera de Menú del Día por plato (`enMenuDelDia`) vigente únicamente para la jornada en que fue activada, de modo que al cambiar la fecha la bandera deje de aplicar automáticamente, sin limpieza manual ni procesos en segundo plano.

#### Scenario: Admin agrega un plato al Menú del Día

- **WHEN** el admin activa la bandera de Menú del Día para un plato durante la jornada actual
- **THEN** el plato queda habilitado para ofrecerse como parte del Menú del Día en esa jornada

#### Scenario: El Menú del Día expira al cambiar la fecha

- **WHEN** transcurre la jornada y comienza una nueva fecha
- **THEN** los platos previamente habilitados dejan de figurar en el Menú del Día hasta que sean activados de nuevo por el admin

#### Scenario: Admin quita un plato del Menú del Día

- **WHEN** el admin desactiva la bandera de Menú del Día de un plato en la jornada actual
- **THEN** el plato deja de ofrecerse en el Menú del Día aunque siga disponible en el catálogo

### Requirement: Entrega del Menú del Día a las terminales

El sistema SHALL entregar a las terminales de mesero y cajero —y al catálogo público de la tienda— únicamente los platos disponibles con la bandera de Menú del Día vigente para la jornada actual, cada uno con su precio fijo.

#### Scenario: La terminal muestra los platos del día

- **WHEN** el personal de mesero o cajero abre la sección de Almuerzos en la terminal
- **THEN** la sección muestra los platos disponibles con Menú del Día vigente para la jornada y su precio fijo

#### Scenario: Plato disponible pero no del día

- **WHEN** un plato está disponible pero no tiene la bandera de Menú del Día vigente
- **THEN** el plato no aparece en la sección de Almuerzos de las terminales

#### Scenario: Sin platos del día

- **WHEN** no hay platos con Menú del Día vigente
- **THEN** la sección de Almuerzos no muestra platos en las terminales (se muestra vacía o se oculta)

### Requirement: Adición de platos del día al pedido desde la terminal

El sistema SHALL permitir a mesero y cajero agregar los platos del Menú del Día a la orden en curso como ítems de precio fijo, sin pasos intermedios de tamaño, sabor o topping.

#### Scenario: Mesero agrega un plato del día

- **WHEN** el mesero toca un plato del Menú del Día en la terminal
- **THEN** el plato se agrega al ticket en curso con su precio fijo y cantidad

#### Scenario: Cajero agrega un plato del día

- **WHEN** el cajero selecciona un plato del Menú del Día en la grilla
- **THEN** el plato se agrega al ticket en curso con su precio fijo y cantidad