# Spec Delta

## Purpose

Catálogo de categorías del menú administrable desde el panel del admin y persistido en base de datos, que funciona como única fuente de verdad para la barra de secciones del cajero, las pestañas del mesero, el editor de platos y los reportes.

## ADDED Requirements

### Requirement: Catálogo de categorías en la base de datos

El sistema SHALL mantener un catálogo de categorías del menú en la base de datos, reemplazando al enum fijo, donde cada categoría SHALL tener una clave `key` (el valor que se guarda en `MenuItem.category`), un nombre de exhibición `name` (etiqueta en español), un `slug`, un icono `iconName`, un color en hexadecimal `color`, una imagen `imageUrl`, un orden `order`, un estado `isActive` y una bandera `visibleInBar`. La clave `key` de cada categoría SHALL ser única.

#### Scenario: Una categoría nueva no toca el código

- **WHEN** el sistema almacena una categoría creada desde el panel del admin
- **THEN** la categoría existe únicamente en la base de datos y puede consumirse sin cambios de código en las aplicaciones

#### Scenario: Categorías consolidadas de sándwiches

- **WHEN** el catálogo se siembra y los platos migran
- **THEN** las categorías `SANDWICH` y `PANINI` dejan de existir como claves de categoría y todos sus platos pasan a la clave consolidada `SANDWICHES`, conservando los tickets históricos su valor capturado al momento de la venta

### Requirement: Gestión de categorías desde el panel del admin

El sistema SHALL permitir a los usuarios con rol `ADMIN` o `SUPER_ADMIN` crear, editar, desactivar y reordenar categorías desde la pestaña "Categorías" de la gestión del menú. La desactivación SHALL ser un borrado lógico (`isActive = false`) que oculta la categoría de los consumidores sin perder sus platos ni su historial. La clave `key` de una categoría que tiene platos asociados SHALL NOT ser editable cuando el plato y los reportes dependen de ella; la imagen SHALL cargarse desde el mismo flujo de imágenes del menú.

#### Scenario: El admin crea una categoría

- **WHEN** el admin crea una categoría con nombre, ícono, color y orden
- **THEN** la categoría queda disponible para las terminales con sus datos de exhibición

#### Scenario: El admin edita una categoría

- **WHEN** el admin cambia el nombre, ícono, color u orden de una categoría existente
- **THEN** los cambios se persisten y se reflejan en la barra del cajero, las pestañas del mesero, el editor de platos y los reportes

#### Scenario: El admin desactiva una categoría

- **WHEN** el admin marca una categoría como inactiva
- **THEN** la categoría deja de ofrecerse en las terminales y deja de listarse en el editor de platos, aunque su historial de ventas se conserva

#### Scenario: Clave de una categoría con platos

- **WHEN** el admin intenta cambiar la clave `key` de una categoría que tiene platos asociados
- **THEN** el sistema rechaza la edición de la clave y conserva la original

### Requirement: Orden de las categorías con arrastrar y soltar

El sistema SHALL permitir reordenar las categorías desde el panel del admin mediante arrastrar y soltar, persistiendo el nuevo orden en la base de datos de forma atómica y validando el conjunto recibido antes de aplicar el cambio. Todos los consumidores SHALL respetar ese orden.

#### Scenario: El admin reordena las categorías

- **WHEN** el admin arrastra una categoría a una nueva posición y suelta
- **THEN** el nuevo orden se persiste y los consumidores lo reflejan en la siguiente lectura

#### Scenario: Reordenamiento con datos inválidos

- **WHEN** el admin envía un reordenamiento que no incluye todas las categorías o contiene claves repetidas
- **THEN** el sistema rechaza la operación con un error de confiito y ningún cambio se persiste

### Requirement: Categorías especiales ALMUERZO y BUBAS

El sistema SHALL mantener la categoría `ALMUERZO` reservada para el Menú del Día con la bandera `visibleInBar = false` (no aparece en la barra de secciones del cajero ni en las pestañas de la carta), de modo que la operación de almuerzos del día SHALL ofrecerse únicamente con platos de esa categoría. La categoría `BUBAS` SHALL aparecer en la barra como apertura del catálogo de bebidas, sin platos asociados.

#### Scenario: ALMUERZO no aparece en la barra

- **WHEN** el catálogo entrega las categorías para la barra del cajero
- **THEN** la categoría `ALMUERZO` no se ofrece como sección de la barra ni como pestaña de carta, y el Menú del Día sigue operando con platos de esa categoría

#### Scenario: BUBAS abre el catálogo de bebidas

- **WHEN** la barra del cajero recibe la categoría `BUBAS`
- **THEN** al seleccionarla se abre el configurador de bebidas (sabores, tamaños, bobas y toppings) sin platos de carta

### Requirement: Catálogo inicial sembrado

El sistema SHALL incluir una semilla inicial de categorías que reproduzca el orden vigente de la barra actual (MILANESA, SANDWICHES, HAMBURGUESA, LOMO, POLLO, ALITA, ENSALADA, PIQUEO, COMPARTIR, KIDS, POSTRE, WAFFLE, PANCAKE, EXTRAS, BEBIDA y BUBAS), más `ALMUERZO` con `visibleInBar = false`, con sus íconos y colores actuales, y SHALL copiar las imágenes ya cargadas desde el modelo anterior de configuración. La semilla SHALL ser idempotente: re-ejecutarla SHALL NOT duplicar ni alterar las categorías existentes.

#### Scenario: Primer arranque con datos

- **WHEN** el sistema se ejecuta por primera vez con el nuevo modelo
- **THEN** el catálogo contiene las categorías de la barra con el orden y los datos de exhibición vigentes, incluida `ALMUERZO` sin aparecer en la barra

#### Scenario: Re-ejecución de la semilla

- **WHEN** la semilla se vuelve a ejecutar sobre categorías ya existentes
- **THEN** no se crean duplicados y se conservan las ediciones aplicadas por el admin (nombre, ícono, color, orden)

### Requirement: Entrega del catálogo de categorías a las terminales

El sistema SHALL entregar a las terminales de cajero y mesero, dentro del catálogo de productos, la lista de categorías activas y visibles en la barra, ordenadas por `order`, cada una con su clave, nombre, ícono, color e imagen, junto con los platos disponibles de cada una. Las categorías inactivas o con `visibleInBar = false` SHALL NOT aparecer como sección de carta en las terminales.

#### Scenario: La barra refleja las categorías activas en orden

- **WHEN** un mesero o cajero abre el terminal y el catálogo tiene categorías activas visibles en barra
- **THEN** la barra muestra esas categorías con sus íconos, colores e imágenes en el orden definido en el panel del admin

#### Scenario: Categoría desactivada fuera de la barra

- **WHEN** una categoría se desactiva desde el panel del admin
- **THEN** la barra de secciones deja de mostrarla y sus platos dejan de ofrecerse en la siguiente lectura del catálogo