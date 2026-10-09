# Spec Delta

## MODIFIED Requirements

### Requirement: Gestión de platos con sección y precio fijo

El sistema SHALL mantener un catálogo de platos, cada uno con nombre, sección/categoría (por defecto `ALMUERZO`), precio fijo en bolivianos, una descripción opcional, un conjunto opcional de variantes de precio y disponibilidad, y SHALL permitir al admin crear, editar, activar/desactivar y eliminar platos desde la gestión del menú. La gestión del menú del admin SHALL presentar los platos separados en dos bloques: **Almuerzos** (sección `ALMUERZO`, donde opera la bandera del Menú del Día) y **Platos a la carta** (las categorías activas de la carta, tomadas del catálogo de categorías administrable). El alta desde el bloque de almuerzos SHALL crear platos en la sección `ALMUERZO`; el alta desde el bloque de carta SHALL permitir elegir únicamente entre las categorías de la carta activas; la edición SHALL permitir mover un plato entre el bloque de almuerzos y cualquier categoría activa de la carta. Para un plato con variantes, cada variante SHALL tener su propio precio y el precio de exhibición del plato SHALL ser el menor de sus variantes. El sistema SHALL impedir asignar a un plato una categoría de la carta que esté desactivada o que no exista en el catálogo.

#### Scenario: Admin crea un plato

- **WHEN** el admin crea un plato desde el bloque de almuerzos o desde el bloque de platos a la carta, con nombre y precio fijo
- **THEN** el plato queda disponible en el bloque correspondiente de la gestión del menú y listo para ofrecerse en las terminales en su sección

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

#### Scenario: Admin mueve un plato de sección

- **WHEN** el admin edita un plato y cambia su sección entre `ALMUERZO` y una categoría activa de la carta
- **THEN** el plato pasa a gestionarse en el bloque correspondiente y se ofrece según las reglas de su nueva sección

#### Scenario: Categoría de carta desactivada no asignable

- **WHEN** el admin intenta asignar un plato a una categoría de la carta desactivada o inexistente en el catálogo
- **THEN** el sistema rechaza la asignación y el plato conserva su sección/`ALMUERZO` anterior

### Requirement: Entrega de la carta fija a las terminales

El sistema SHALL entregar a las terminales de mesero y cajero —y al catálogo público de la tienda— únicamente los platos disponibles de la carta (aquellos cuya categoría está activa en el catálogo de categorías y es distinta de `ALMUERZO`), cada uno con su nombre, descripción, categoría, precio (el menor de sus variantes si las tiene) y sus variantes; los platos de la carta no dependen de la bandera de Menú del Día y SHALL permanecer disponibles todas las jornadas mientras su categoría permanezca activa. Al desactivar una categoría de la carta, sus platos SHALL dejar de entregarse a las terminales y dejar de consultarse, sin eliminarse del catálogo.

#### Scenario: La terminal muestra la carta

- **WHEN** el personal de mesero o cajero abre la sección de Carta en la terminal
- **THEN** la sección muestra los platos de la carta disponibles con su categoría, descripción, precio y variantes

#### Scenario: Plato de carta disponible pero no del día

- **WHEN** un plato de la carta está disponible y no tiene la bandera de Menú del Día vigente
- **THEN** el plato aparece igualmente en la sección de Carta (la bandera no aplica a la carta)

#### Scenario: Plato de la carta inhabilitado

- **WHEN** el admin marca como no disponible un plato de la carta
- **THEN** el plato deja de aparecer en la sección de Carta de las terminales

#### Scenario: Categoría de carta desactivada

- **WHEN** el admin desactiva una categoría de la carta con platos
- **THEN** esos platos dejan de entregarse a las terminales y al catálogo público hasta que la categoría vuelva a activarse