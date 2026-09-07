## MODIFIED Requirements

### Requirement: Gestión de platos con sección y precio fijo

El sistema SHALL mantener un catálogo de platos, cada uno con nombre, sección/categoría (por defecto `ALMUERZO`), precio fijo en bolivianos, una descripción opcional, un conjunto opcional de variantes de precio y disponibilidad, y SHALL permitir al admin crear, editar, activar/desactivar y eliminar platos desde la gestión del menú. Para un plato con variantes, cada variante SHALL tener su propio precio y el precio de exhibición del plato SHALL ser el menor de sus variantes.

#### Scenario: Admin crea un plato

- **WHEN** el admin crea un plato con nombre, categoría y precio fijo
- **THEN** el plato queda disponible en el catálogo con ese precio, listo para ofrecerse en las terminales

#### Scenario: Admin inhabilita un plato

- **WHEN** el admin marca un plato como no disponible
- **THEN** el plato deja de ofrecerse en las terminales, aunque conserve su Menú del Día

#### Scenario: Precio fijo del plato

- **WHEN** una terminal ofrece un plato
- **THEN** el precio del plato es el definido en su registro, sin depender de matriz de precios ni modificadores

#### Scenario: Admin agrega descripción

- **WHEN** el admin edita un plato e ingresa una descripción
- **THEN** la descripción se guarda y se muestra junto al plato en las terminales

#### Scenario: Admin agrega variantes de precio

- **WHEN** el admin edita un plato y agrega variantes como Pollo/Res con precio propio
- **THEN** el plato se ofrece con un selector de variante y exhibe como precio el menor de sus variantes

#### Scenario: Variante elegida con su precio

- **WHEN** una terminal ofrece un plato con variantes
- **THEN** cada variante se cobra a su precio propio y el precio de exhibición es el menor entre ellas

### Requirement: Menú del Día por jornada con auto-reset diario

El sistema SHALL mantener una bandera de Menú del Día por plato (`enMenuDelDia`) vigente únicamente para la jornada en que fue activada, de modo que al cambiar la fecha la bandera deje de aplicar automáticamente, sin limpieza manual ni procesos en segundo plano. La bandera SHALL estar disponible únicamente para platos de la categoría `ALMUERZO`.

#### Scenario: Admin agrega un plato al Menú del Día

- **WHEN** el admin activa la bandera de Menú del Día para un plato durante la jornada actual
- **THEN** el plato queda habilitado para ofrecerse como parte del Menú del Día en esa jornada

#### Scenario: El Menú del Día expira al cambiar la fecha

- **WHEN** transcurre la jornada y comienza una nueva fecha
- **THEN** los platos previamente habilitados dejan de figurar en el Menú del Día hasta que sean activados de nuevo por el admin

#### Scenario: Admin quita un plato del Menú del Día

- **WHEN** el admin desactiva la bandera de Menú del Día de un plato en la jornada actual
- **THEN** el plato deja de ofrecerse en el Menú del Día aunque siga disponible en el catálogo

#### Scenario: Solo almuerzos al Menú del Día

- **WHEN** el admin intenta activar la bandera de Menú del Día en un plato cuya categoría no es `ALMUERZO`
- **THEN** el sistema no permite la activación y el plato solo se ofrece como parte de la carta

## ADDED Requirements

### Requirement: Entrega de la carta fija a las terminales

El sistema SHALL entregar a las terminales de mesero y cajero —y al catálogo público de la tienda— únicamente los platos disponibles de la carta (categorías distintas de `ALMUERZO`), cada uno con su nombre, descripción, categoría, precio (el menor de sus variantes si las tiene) y sus variantes; los platos de la carta no dependen de la bandera de Menú del Día y SHALL permanecer disponibles todas las jornadas.

#### Scenario: La terminal muestra la carta

- **WHEN** el personal de mesero o cajero abre la sección de Carta en la terminal
- **THEN** la sección muestra los platos de la carta disponibles con su categoría, descripción, precio y variantes

#### Scenario: Plato de carta disponible pero no del día

- **WHEN** un plato de la carta está disponible y no tiene la bandera de Menú del Día vigente
- **THEN** el plato aparece igualmente en la sección de Carta (la bandera no aplica a la carta)

#### Scenario: Plato de la carta inhabilitado

- **WHEN** el admin marca como no disponible un plato de la carta
- **THEN** el plato deja de aparecer en la sección de Carta de las terminales