# Drink Builder Specification

## Purpose

Permite al cliente armar su bebida de burbujas paso a paso: elegir tamaño de vaso, sabor (leche, agua o especiales) y tipo de boba, ver el precio resultante y agregarla al carrito.

## Requirements

### Requirement: Configurador paso a paso

El sistema SHALL ofrecer un configurador de bebida en pasos secuenciales: (1) selección de tamaño, (2) selección de sabor, (3) selección de tipo de boba. El cliente no puede avanzar al siguiente paso sin haber completado el actual.

#### Scenario: Flujo completo de configuración

- **WHEN** el cliente selecciona un tamaño, luego un sabor y luego un tipo de boba
- **THEN** el sistema permite confirmar la bebida configurada

#### Scenario: Bloqueo del paso siguiente

- **WHEN** el cliente no ha seleccionado una opción válida en el paso actual
- **THEN** el sistema impide avanzar al paso siguiente

#### Scenario: Regreso al paso anterior

- **WHEN** el cliente vuelve a un paso anterior
- **THEN** el sistema conserva la selección realizada previamente en ese paso

### Requirement: Selección de sabor por categoría

El sistema SHALL presentar la selección de sabor organizada en las categorías leche, agua y especiales, usando únicamente sabores disponibles.

#### Scenario: Sabor dentro de su categoría

- **WHEN** el cliente navega la lista de sabores de una categoría
- **THEN** cada sabor seleccionable pertenece a la categoría mostrada y está disponible

### Requirement: Cálculo de precio

El sistema SHALL calcular el precio de la bebida sumando el precio del tamaño, el precio del sabor y el precio del tipo de boba seleccionados, y SHALL mostrarlo en tiempo real mientras el cliente configura.

#### Scenario: Precio refleja la selección completa

- **WHEN** el cliente ha seleccionado tamaño, sabor y boba
- **THEN** el sistema muestra el precio total calculado como la suma de los tres componentes

#### Scenario: Precio sin selección completa

- **WHEN** el cliente aún no ha completado todos los pasos
- **THEN** el sistema muestra el precio de los componentes ya seleccionados y no permite confirmar la bebida

### Requirement: Agregar bebida al carrito

El sistema SHALL permitir agregar la bebida configurada al carrito y SHALL mostrar el resumen del carrito con la cantidad de bebidas y el subtotal.

#### Scenario: Agregar bebida configurada

- **WHEN** el cliente confirma una bebida completamente configurada
- **THEN** el sistema la agrega al carrito y muestra el subtotal actualizado

#### Scenario: Múltiples bebidas en el carrito

- **WHEN** el cliente agrega varias bebidas con distintas configuraciones
- **THEN** el carrito conserva cada configuración y acumula el subtotal

### Requirement: Modificar una bebida del carrito

El sistema SHALL permitir al cliente quitar una bebida del carrito o cambiar su cantidad.

#### Scenario: Quitar bebida del carrito

- **WHEN** el cliente elimina una bebida del carrito
- **THEN** el subtotal del carrito se recalcula sin esa bebida

#### Scenario: Cambiar cantidad

- **WHEN** el cliente aumenta o disminuye la cantidad de una bebida
- **THEN** el subtotal se actualiza de acuerdo con la nueva cantidad
