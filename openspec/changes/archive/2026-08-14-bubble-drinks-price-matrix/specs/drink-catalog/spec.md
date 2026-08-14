## MODIFIED Requirements

### Requirement: Gestión de tamaños de vaso

El sistema SHALL mantener un catálogo de tamaños de vaso —al menos Grande y Extragrande— cada uno con nombre, capacidad en onzas y disponibilidad para la venta, sin precio individual.

#### Scenario: La tienda muestra los tamaños disponibles

- **WHEN** el cliente abre el configurador de bebida
- **THEN** el sistema muestra únicamente los tamaños marcados como disponibles, con su capacidad

#### Scenario: El admin desactiva un tamaño

- **WHEN** el admin marca un tamaño como no disponible
- **THEN** el tamaño deja de aparecer en el configurador de la tienda pero se conserva en el catálogo

### Requirement: Gestión de sabores por categoría

El sistema SHALL mantener un catálogo de sabores, cada uno perteneciente a una o varias de las tres categorías —especiales, con agua o con leche—, con nombre y disponibilidad, sin precio individual.

#### Scenario: El configurador agrupa sabores por categoría

- **WHEN** el cliente llega al paso de selección de sabor
- **THEN** el sistema muestra los sabores disponibles agrupados en las categorías especiales, con agua y con leche

#### Scenario: Sabor en varias categorías

- **WHEN** un sabor pertenece a más de una categoría
- **THEN** el sabor aparece en el configurador en todas sus categorías

#### Scenario: El admin agrega un sabor nuevo

- **WHEN** el admin crea un sabor con nombre y una o varias categorías
- **THEN** el sabor queda disponible en el configurador de la tienda en las categorías indicadas

#### Scenario: El admin inhabilita un sabor

- **WHEN** el admin marca un sabor como no disponible
- **THEN** el sabor deja de ofrecerse en la tienda

### Requirement: Gestión de tipos de boba

El sistema SHALL mantener un catálogo de tipos de boba —al menos tapioca y explosivas—, cada uno con nombre y disponibilidad, sin precio individual.

#### Scenario: El configurador muestra los tipos de boba

- **WHEN** el cliente llega al paso de selección de boba
- **THEN** el sistema muestra los tipos de boba disponibles

#### Scenario: El admin cambia el precio de una boba

- **WHEN** el admin modifica el precio de la matriz para un tipo de boba
- **THEN** el nuevo precio se refleja en el cálculo de las bebidas futuras con ese tipo de boba

#### Scenario: El admin inhabilita un tipo de boba

- **WHEN** el admin marca un tipo de boba como no disponible
- **THEN** el tipo de boba deja de ofrecerse en la tienda

### Requirement: Acceso al catálogo

El catálogo SHALL ser legible por la tienda sin autenticación y editable únicamente por usuarios autenticados del admin, incluyendo tamaños, sabores, tipos de boba, matriz de precios y toppings.

#### Scenario: Lectura pública del catálogo

- **WHEN** cualquier visitante consulta el menú
- **THEN** el sistema responde con el catálogo vigente (tamaños, sabores, bobas, matriz de precios y toppings disponibles)

#### Scenario: Modificación restringida

- **WHEN** un usuario no autenticado intenta modificar el catálogo
- **THEN** el sistema rechaza la operación

### Requirement: Catálogo inicial sembrado

El sistema SHALL incluir una semilla inicial de catálogo con los tamaños Grande y Extragrande, los tipos de boba Tapioca y Explosivas, los sabores de las tres categorías definidos en el catálogo, la matriz de precios completa en bolivianos y los toppings de bobas extra, para que la tienda funcione desde el primer arranque.

#### Scenario: Primer arranque con datos

- **WHEN** la base de datos se inicializa por primera vez y se ejecuta la semilla
- **THEN** el catálogo contiene tamaños, sabores de las tres categorías, tipos de boba, la matriz de precios completa y los toppings listos para la venta

## ADDED Requirements

### Requirement: Gestión de matriz de precios

El sistema SHALL mantener una matriz de precios con un precio en bolivianos para cada combinación de categoría, tamaño y tipo de boba, y SHALL permitir al admin consultarla y modificarla.

#### Scenario: La tienda usa el precio de la matriz

- **WHEN** el cliente configura una bebida con una categoría, un tamaño y un tipo de boba
- **THEN** el precio base de la bebida es el de la matriz para esa combinación

#### Scenario: El admin actualiza un precio de la matriz

- **WHEN** el admin modifica el precio de una combinación
- **THEN** el nuevo precio se refleja en el cálculo de las bebidas futuras con esa combinación

#### Scenario: Combinación sin precio definido

- **WHEN** una combinación de la matriz no tiene precio definido
- **THEN** el sistema no permite confirmar una bebida con esa combinación

### Requirement: Gestión de toppings

El sistema SHALL mantener un catálogo de toppings opcionales con nombre, precio aditivo en bolivianos y disponibilidad, y SHALL permitir al admin gestionarlos.

#### Scenario: El admin crea un topping

- **WHEN** el admin crea un topping con nombre y precio
- **THEN** el topping queda disponible como opción múltiple en el configurador

#### Scenario: El admin inhabilita un topping

- **WHEN** el admin marca un topping como no disponible
- **THEN** el topping deja de ofrecerse en el configurador
