## MODIFIED Requirements

### Requirement: Configurador paso a paso

El sistema SHALL ofrecer un configurador de bebida en pasos secuenciales: (1) selección de categoría (especiales, con agua o con leche), (2) selección de sabor dentro de la categoría, (3) selección de tamaño y tipo de boba (ambos obligatorios) y (4) selección de toppings opcionales. El cliente no puede avanzar al siguiente paso sin haber completado el actual.

#### Scenario: Flujo completo de configuración

- **WHEN** el cliente selecciona una categoría, un sabor, un tamaño, un tipo de boba y luego confirma la bebida
- **THEN** el sistema permite confirmar la bebida configurada con sus toppings opcionales

#### Scenario: Bloqueo del paso siguiente

- **WHEN** el cliente no ha seleccionado una opción válida en el paso actual
- **THEN** el sistema impide avanzar al paso siguiente

#### Scenario: Regreso al paso anterior

- **WHEN** el cliente vuelve a un paso anterior
- **THEN** el sistema conserva la selección realizada previamente en ese paso

### Requirement: Selección de sabor por categoría

El sistema SHALL presentar la selección de sabor organizada en las categorías especiales, con agua y con leche, mostrando en cada una únicamente sus sabores disponibles, y SHALL exigir elegir una categoría antes de seleccionar un sabor.

#### Scenario: Sabor dentro de su categoría

- **WHEN** el cliente navega la lista de sabores de una categoría
- **THEN** cada sabor seleccionable pertenece a la categoría mostrada y está disponible

#### Scenario: Sabor sin categoría elegida

- **WHEN** el cliente intenta seleccionar un sabor sin haber elegido una categoría
- **THEN** el sistema no ofrece sabores hasta que se seleccione una categoría

### Requirement: Cálculo de precio

El sistema SHALL calcular el precio de la bebida consultando la matriz de precios según la combinación de categoría, tamaño y tipo de boba seleccionados, y SHALL sumar el precio de cada topping opcional elegido. SHALL mostrarlo en tiempo real mientras el cliente configura, en bolivianos.

#### Scenario: Precio refleja la selección completa

- **WHEN** el cliente ha seleccionado categoría, sabor, tamaño y boba
- **THEN** el sistema muestra el precio base de la matriz para esa combinación más el precio de los toppings seleccionados

#### Scenario: Precio sin selección completa

- **WHEN** el cliente aún no ha completado tamaño y tipo de boba
- **THEN** el sistema no muestra un precio final y no permite confirmar la bebida

#### Scenario: Toppings modifican el precio

- **WHEN** el cliente agrega o quita un topping opcional
- **THEN** el precio mostrado se actualiza sumando o restando el precio de ese topping

### Requirement: Agregar bebida al carrito

El sistema SHALL permitir agregar la bebida configurada al carrito conservando su categoría, sabor, tamaño, tipo de boba y toppings, y SHALL redirigir al cliente al carrito al confirmar, donde puede revisar el resumen, ajustar cantidades o armar otra bebida.

#### Scenario: Agregar bebida configurada

- **WHEN** el cliente confirma una bebida completamente configurada
- **THEN** el sistema la agrega al carrito con sus toppings y redirige al cliente a la página del carrito

#### Scenario: Múltiples bebidas en el carrito

- **WHEN** el cliente agrega varias bebidas con distintas configuraciones y toppings
- **THEN** el carrito conserva cada configuración con sus toppings y acumula el subtotal

#### Scenario: Armar otra bebida desde el carrito

- **WHEN** el cliente está en el carrito con bebidas y desea agregar más
- **THEN** el carrito ofrece la opción de volver al configurador para armar otra bebida

### Requirement: Modificar una bebida del carrito

El sistema SHALL permitir al cliente quitar una bebida del carrito, cambiar su cantidad o armar otra bebida desde el carrito.

#### Scenario: Quitar bebida del carrito

- **WHEN** el cliente elimina una bebida del carrito
- **THEN** el subtotal del carrito se recalcula sin esa bebida

#### Scenario: Cambiar cantidad

- **WHEN** el cliente aumenta o disminuye la cantidad de una bebida
- **THEN** el subtotal se actualiza de acuerdo con la nueva cantidad

## ADDED Requirements

### Requirement: Selección de toppings opcionales

El sistema SHALL permitir al cliente seleccionar varios toppings opcionales de los disponibles, cada uno con su precio aditivo en bolivianos, y SHALL mostrarlos como parte de la configuración de la bebida.

#### Scenario: Multiselección de toppings

- **WHEN** el cliente marca más de un topping disponible
- **THEN** todos los toppings marcados se incluyen en la bebida y suman su precio al total

#### Scenario: Quitar un topping

- **WHEN** el cliente desmarca un topping ya seleccionado
- **THEN** el topping deja de incluirse y su precio se retira del total
