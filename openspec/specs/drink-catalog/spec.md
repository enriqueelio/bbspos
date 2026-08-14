# Drink Catalog Specification

## Purpose

Define el catálogo de bebidas del restaurante: tamaños de vaso, sabores agrupados por categoría y tipos de boba, con precios y disponibilidad gestionables por el admin y consultables por la tienda.

## Requirements

### Requirement: Gestión de tamaños de vaso

El sistema SHALL mantener un catálogo de tamaños de vaso (por ejemplo, Chico, Mediano, Grande), cada uno con nombre, capacidad en mililitros, precio y disponibilidad para la venta.

#### Scenario: La tienda muestra los tamaños disponibles

- **WHEN** el cliente abre el configurador de bebida
- **THEN** el sistema muestra únicamente los tamaños marcados como disponibles, con su capacidad y precio

#### Scenario: El admin desactiva un tamaño

- **WHEN** el admin marca un tamaño como no disponible
- **THEN** el tamaño deja de aparecer en el configurador de la tienda pero se conserva en el catálogo

### Requirement: Gestión de sabores por categoría

El sistema SHALL mantener un catálogo de sabores, cada uno perteneciente a exactamente una de tres categorías: leche (MILK), agua (WATER) o especiales (SPECIAL), con nombre, precio y disponibilidad.

#### Scenario: El configurador agrupa sabores por categoría

- **WHEN** el cliente llega al paso de selección de sabor
- **THEN** el sistema muestra los sabores disponibles agrupados en las categorías leche, agua y especiales

#### Scenario: El admin agrega un sabor nuevo

- **WHEN** el admin crea un sabor con nombre, categoría y precio
- **THEN** el sabor queda disponible en el configurador de la tienda en su categoría correspondiente

#### Scenario: El admin inhabilita un sabor

- **WHEN** el admin marca un sabor como no disponible
- **THEN** el sabor deja de ofrecerse en la tienda

### Requirement: Gestión de tipos de boba

El sistema SHALL mantener un catálogo de tipos de boba —al menos tapioca (TAPIOCA) y explosivas (POPPING)— cada uno con nombre, precio y disponibilidad.

#### Scenario: El configurador muestra los tipos de boba

- **WHEN** el cliente llega al paso de selección de boba
- **THEN** el sistema muestra los tipos de boba disponibles con su precio y recargo si aplica

#### Scenario: El admin cambia el precio de una boba

- **WHEN** el admin actualiza el precio de un tipo de boba
- **THEN** el nuevo precio se refleja en el cálculo de precio de las bebidas futuras

### Requirement: Acceso al catálogo

El catálogo SHALL ser legible por la tienda sin autenticación y editable únicamente por usuarios autenticados del admin.

#### Scenario: Lectura pública del catálogo

- **WHEN** cualquier visitante consulta el menú
- **THEN** el sistema responde con el catálogo vigente (tamaños, sabores y bobas disponibles)

#### Scenario: Modificación restringida

- **WHEN** un usuario no autenticado intenta modificar el catálogo
- **THEN** el sistema rechaza la operación

### Requirement: Catálogo inicial sembrado

El sistema SHALL incluir una semilla inicial de catálogo con al menos 3 tamaños, sabores representativos de las 3 categorías y los 2 tipos de boba, para que la tienda funcione desde el primer arranque.

#### Scenario: Primer arranque con datos

- **WHEN** la base de datos se inicializa por primera vez y se ejecuta la semilla
- **THEN** el catálogo contiene tamaños, sabores de las tres categorías y tipos de boba listos para la venta
